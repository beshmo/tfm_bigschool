import { Corners } from './Blueprint';
import { Icon } from './Icon';

/**
 * The blueprint-framed panel shown in place of a list that has no rows. `hint`
 * carries the reason — an empty list because nothing exists yet reads very
 * differently from one emptied by a filter.
 */
export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="empty-state blueprint">
      <Corners />
      <Icon name="brackets" size={28} />
      <p>{message}</p>
      {hint && <p className="text-muted empty-hint">{hint}</p>}
    </div>
  );
}
