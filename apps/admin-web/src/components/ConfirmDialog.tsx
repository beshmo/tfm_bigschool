import type { ReactNode } from 'react';
import { Corners } from './Blueprint';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A destructive confirmation (`role="alertdialog"`) with Cancel and a confirm button. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      role="alertdialog"
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary blueprint"
            onClick={onConfirm}
            disabled={busy}
          >
            <Corners />
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
