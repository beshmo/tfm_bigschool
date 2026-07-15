import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Corners } from './Blueprint';

/**
 * A modal dialog over the design system's backdrop.
 *
 * The mockups drive their dialogs with a CSS checkbox hack because they are
 * static pages; here the open state is ordinary React state, which lets the
 * dialog do what the hack cannot: close on Escape, move focus in on open, and
 * return focus to whatever opened it on close.
 */
export function Dialog({
  title,
  role = 'dialog',
  onClose,
  children,
  actions,
}: {
  title: string;
  /** `alertdialog` for destructive confirmations, per the mockups. */
  role?: 'dialog' | 'alertdialog';
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus moves into the dialog on open and back to the trigger on close, so
    // keyboard users are not dropped at the top of the document.
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="dialog-backdrop"
      // A click that both starts and ends on the backdrop is a click outside
      // the dialog; checking the target keeps a drag that ends here (say, from
      // selecting text in the dialog) from dismissing it.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="dialog blueprint"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Corners />
        <div className="dialog-title" id={titleId}>
          {title}
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}
