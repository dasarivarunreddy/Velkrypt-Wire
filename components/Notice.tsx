export default function Notice({ error, message }: { error?: string; message?: string }) {
  if (error) return <p className="notice err" role="alert">{error.slice(0, 300)}</p>;
  if (message) return <p className="notice ok" role="status">{message.slice(0, 300)}</p>;
  return null;
}
