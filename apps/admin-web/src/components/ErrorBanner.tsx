import type { DisplayError } from '../api/error-message';
import { Icon } from './Icon';

/** Failures render here, beside the form or list that caused them, never as toasts. */
export function ErrorBanner({ error }: { error: DisplayError }) {
  return (
    <div className="error-banner" role="alert">
      <Icon name="alertTriangle" size={18} />
      <div>
        <strong>{error.title}</strong>
        <p>{error.message}</p>
        {error.details.length > 0 ? (
          <ul>
            {error.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
