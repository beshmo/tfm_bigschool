import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Corners } from './Blueprint';
import { Icon } from './Icon';

export const TOAST_DURATION_MS = 6000;

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<((message: string) => void) | undefined>(undefined);

/** Corner confirmations for successful writes; each disappears after 6 seconds unless dismissed. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast blueprint" role="status">
            <Corners />
            <Icon name="checkCircle" size={18} />
            <strong>{toast.message}</strong>
            <button
              type="button"
              className="toast-close"
              aria-label={`Dismiss notification: ${toast.message}`}
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

export function useToast(): (message: string) => void {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return notify;
}
