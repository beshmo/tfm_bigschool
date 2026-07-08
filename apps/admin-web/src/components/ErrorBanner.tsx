export function ErrorBanner({ message }: { message: string }) {
  return (
    <p role="alert" className="error-banner">
      {message}
    </p>
  );
}
