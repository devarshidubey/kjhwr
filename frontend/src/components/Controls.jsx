import { isInRange, MAX_DATE, MIN_DATE } from '../dates.js';

export default function Controls({
  deliveryDate,
  onDateChange,
  clockHm,
  onSubmit,
  loading,
  disabledReason,
}) {
  const valid = isInRange(deliveryDate);
  const outOfRange = Boolean(deliveryDate) && !valid;
  const disabled = loading || !valid;

  return (
    <section className="card controls" aria-labelledby="delivery-date-label">
      <div className="controls-row">
        <div className="field">
          <label id="delivery-date-label" htmlFor="delivery-date" className="section-label">
            Delivery date
          </label>
          <input
            id="delivery-date"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            value={deliveryDate}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={loading}
          />
          <p className="hint">
            Available range: 2 January to 1 February 2026 (purchase decisions made in January 2026).
          </p>
        </div>
        <div className="controls-actions">
          <p className="decision-line">
            Decision time: previous day at <span className="num">{clockHm || '—'}</span> UK (your
            current time)
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={onSubmit}
            disabled={disabled}
            title={disabled && !loading ? disabledReason : undefined}
          >
            Get forecast
          </button>
          {disabled && !loading && !outOfRange ? <p className="hint">{disabledReason}</p> : null}
          {outOfRange ? (
            <p className="inline-error">
              Choose a date between 2 January and 1 February 2026. The request was not sent.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
