import { useState, type FormEvent } from 'react';
import type { EntryDto, EntryUpdateDto } from '@okvns/shared';
import { toDisplayError, type DisplayError } from '../api/error-message';
import { Corners } from './Blueprint';
import { Dialog } from './Dialog';
import { ErrorBanner } from './ErrorBanner';

const FORM_ID = 'entry-edit-form';

interface EntryEditDialogProps {
  entry: EntryDto;
  onSave: (input: EntryUpdateDto) => Promise<void>;
  onClose: () => void;
}

/** Edits an entry's name, value, description and environment-dependence in a modal. */
export function EntryEditDialog({ entry, onSave, onClose }: EntryEditDialogProps) {
  const [name, setName] = useState(entry.name);
  const [value, setValue] = useState(entry.value);
  const [description, setDescription] = useState(entry.description ?? '');
  const [envDependent, setEnvDependent] = useState(entry.env_dependent);
  const [error, setError] = useState<DisplayError>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await onSave({
        ...(name !== entry.name ? { name } : {}),
        value,
        description,
        env_dependent: envDependent,
      });
    } catch (failure) {
      setError(toDisplayError(failure));
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={`Edit entry ${entry.name}`}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="btn btn-primary blueprint"
            disabled={saving}
          >
            <Corners />
            Save
          </button>
        </>
      }
    >
      {error ? <ErrorBanner error={error} /> : null}
      <form id={FORM_ID} onSubmit={submit}>
        <div className="field">
          <label htmlFor="edit-entry-name">{`Name for ${entry.name}`}</label>
          <input
            id="edit-entry-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="edit-entry-value">{`Value for ${entry.name}`}</label>
          <textarea
            id="edit-entry-value"
            className="input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="edit-entry-description">{`Description for ${entry.name}`}</label>
          <input
            id="edit-entry-description"
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <label className="toolbar-check" htmlFor="edit-entry-env">
          <input
            id="edit-entry-env"
            type="checkbox"
            checked={envDependent}
            onChange={(event) => setEnvDependent(event.target.checked)}
          />
          {`Environment-dependent for ${entry.name}`}
        </label>
      </form>
    </Dialog>
  );
}
