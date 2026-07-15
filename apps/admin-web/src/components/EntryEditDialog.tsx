import type { EntryDto } from '@okvns/shared';
import { Corners } from './Blueprint';
import { Dialog } from './Dialog';

/** Ties the submit button in the dialog's action row to the form in its body. */
const FORM_ID = 'entry-edit-form';

export interface EntryEdit {
  value: string;
  description: string;
  env_dependent: boolean;
}

/**
 * Edits one entry's value, description and environment-dependence.
 *
 * The design's entries table is a read-only line drawing, so editing moves off
 * the row and into this dialog rather than packing three inputs and a save
 * button into every row.
 */
export function EntryEditDialog({
  entry,
  onSave,
  onCancel,
}: {
  entry: EntryDto;
  onSave: (edit: EntryEdit) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      title={`Edit ${entry.name}`}
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary blueprint">
            <Corners />
            Save
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            value: String(form.get('value') ?? ''),
            description: String(form.get('description') ?? ''),
            // An unchecked checkbox is absent from the form data, and the form
            // always renders the entry's current state, so absence means the
            // admin cleared it.
            env_dependent: form.get('env_dependent') !== null,
          });
        }}
      >
        <div className="field">
          <label htmlFor="edit-entry-value">Value for {entry.name}</label>
          <input
            className="input entry-value"
            id="edit-entry-value"
            name="value"
            defaultValue={entry.value}
          />
        </div>
        <div className="field" style={{ marginTop: 'var(--space-3)' }}>
          <label htmlFor="edit-entry-description">Description for {entry.name}</label>
          <textarea
            className="input"
            id="edit-entry-description"
            name="description"
            rows={3}
            defaultValue={entry.description ?? ''}
          />
        </div>
        <label className="toolbar-check" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
          <input
            type="checkbox"
            name="env_dependent"
            defaultChecked={entry.env_dependent}
            aria-label={`Environment-dependent for ${entry.name}`}
          />
          Environment-dependent
        </label>
      </form>
    </Dialog>
  );
}
