import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

/** How long a toast stays up before dismissing itself. */
const TOAST_DURATION_MS = 6000;

interface Toast {
  id: number;
  title: string;
  body: string;
}

const ToastContext = createContext<((title: string, body: string) => void) | null>(null);

/**
 * Success notifications, as the mockups specify them: a corner toast confirming
 * a write landed. Failures are not routed here — they stay in the page's error
 * banner, where they sit next to the form that produced them and persist until
 * the admin acts on them.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, title, body }]);
      timers.current.push(setTimeout(() => dismiss(id), TOAST_DURATION_MS));
    },
    [dismiss],
  );

  // Unmounting with toasts still up would leave their dismiss timers to fire
  // against a gone component.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <Icon name="checkCircle" size={18} />
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.body}</p>
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label={`Dismiss ${toast.title}`}
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Reports a completed write as a toast. Must be called under a ToastProvider. */
export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return notify;
}
