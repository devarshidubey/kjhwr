export default function Skeleton({ message, slow }) {
  return (
    <section className="card skeleton-card" aria-busy="true" aria-live="polite">
      <div className="progress-bar" aria-hidden="true">
        <span />
      </div>
      <p className="section-label skeleton-shimmer">Loading</p>
      <div className="skeleton-title skeleton-shimmer" />
      <div className="skeleton-number skeleton-shimmer" />
      <p className="skeleton-copy">
        Retrieving forecast from Elexon. This can take up to 30 seconds.
        {slow ? ' Still working. The first request for a date is the slowest.' : null}
      </p>
      {message ? <p className="visually-hidden">{message}</p> : null}
    </section>
  );
}
