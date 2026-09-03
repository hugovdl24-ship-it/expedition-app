export function Flash({ message, error }: { message?: string; error?: string }) {
  return <>{message && <div className="flash ok">{message}</div>}{error && <div className="flash err">{error}</div>}</>
}
