export default function Notice({ children, tone = 'muted', actionLabel, onAction }) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      <p>{children}</p>
      {onAction && actionLabel ? (
        <button type="button" className="btn-text" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
