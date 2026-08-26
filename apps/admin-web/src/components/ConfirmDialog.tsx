import type { ReactNode } from 'react';
import { Corners } from './Blueprint';
import { Dialog } from './Dialog';

/**
 * The destructive-confirmation dialog the mockups show before any delete.
 *
 * Confirm is the solid accent button — the one filled object the design system
 * allows — because it is the dialog's primary action, not because it is safe.
 */
export function ConfirmDialog({
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      title={title}
      role="alertdialog"
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary blueprint" onClick={onConfirm}>
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
