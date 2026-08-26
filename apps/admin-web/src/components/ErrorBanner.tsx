import { Icon } from './Icon';

/**
 * A failed operation, reported next to the form that caused it.
 *
 * The design system is a mono steel palette with no danger role, so the banner
 * reads as an alert by weight and icon — an ink-bordered panel — rather than by
 * turning red. `title` names the operation that failed; `message` carries the
 * API's explanation.
 */
export function ErrorBanner({
  title = 'Something went wrong',
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div role="alert" className="error-banner">
      <Icon name="alertTriangle" size={18} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
