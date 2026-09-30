export default function Loading() {
  return (
    <main id="main" className="container profile-shell">
      <div className="screen-loading" role="status">
        <span className="loading-ring" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    </main>
  );
}
