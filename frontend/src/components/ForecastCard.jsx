import {
  formatGwh,
  formatMw,
  modePublishTime,
  sumMwToGwh,
  typicalErrorGwh,
} from '../format.js';
import { formatDeliveryHeading, formatWindowDate, londonDateTime, londonHmFromIso } from '../time.js';
import Notice from './Notice.jsx';
import SlotTable from './SlotTable.jsx';

function toggleKeys(event, onToggle) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onToggle();
  }
}

export default function ForecastCard({ forecast, accuracy, expanded, onToggle }) {
  const total = sumMwToGwh(forecast.slots, 'forecast_mw');
  const margin = typicalErrorGwh(accuracy);
  const publish = modePublishTime(forecast.slots);
  const windowDays = accuracy?.window_days ?? 14;
  const s = forecast.summary || {};
  const hoursKnown = 24 - (s.n_missing ?? 0);

  return (
    <section
      className="card expandable"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => toggleKeys(e, onToggle)}
    >
      <p className="section-label">Forecast for {formatDeliveryHeading(forecast.delivery_date)}</p>
      <p className="meta">
        Forecast as of {londonDateTime(forecast.cutoff_utc)} UK
        {publish
          ? `, based on the Elexon forecast published at ${londonDateTime(publish)}`
          : ''}
        .
      </p>

      <div className="headline-row">
        <div>
          <p className="headline">
            <span className="num">{total.gwh == null ? '—' : formatGwh(total.gwh)}</span>
            <span className="unit"> GWh</span>
          </p>
          {s.n_missing > 0 ? (
            <p className="hint">based on {hoursKnown} of 24 hours</p>
          ) : null}
        </div>
        <div>
          <p className="headline secondary-head">
            <span className="num">±{margin == null ? '—' : formatGwh(margin)}</span>
            <span className="unit"> GWh</span>
          </p>
          <p className="hint">typical daily error, last {windowDays} days</p>
          <p className="hint">
            Window: {formatWindowDate(accuracy?.window_start)} to {formatWindowDate(accuracy?.window_end)}.
          </p>
        </div>
      </div>

      <div className="stat-row">
        <div>
          <p className="section-label">Average output</p>
          <p className="stat">
            <span className="num">{formatMw(s.avg_mw) ?? '—'}</span> MW
          </p>
        </div>
        <div>
          <p className="section-label">Lowest hour</p>
          <p className="stat">
            <span className="num">{formatMw(s.min_mw) ?? '—'}</span> MW
            {s.min_slot ? (
              <span className="hint-inline"> at {londonHmFromIso(s.min_slot)}</span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="section-label">Highest hour</p>
          <p className="stat">
            <span className="num">{formatMw(s.max_mw) ?? '—'}</span> MW
            {s.max_slot ? (
              <span className="hint-inline"> at {londonHmFromIso(s.max_slot)}</span>
            ) : null}
          </p>
        </div>
      </div>

      <p className="plain-note">
        Hourly forecasts are typically off by ±{formatMw(accuracy?.mae) ?? '—'} MW; plan a buffer of
        about {formatMw(accuracy?.p90_abs) ?? '—'} MW to cover 9 in 10 hours.
      </p>

      {accuracy?.insufficient_history ? (
        <Notice>
          Only {accuracy.days_with_data} of {windowDays} days of history were available, so the error
          margin is less reliable.
        </Notice>
      ) : null}

      <div className={`collapse ${expanded ? 'open' : ''}`}>
        <div>
          <SlotTable mode="forecast" slots={forecast.slots} mae={accuracy?.mae} />
        </div>
      </div>

      <p className="expand-hint">
        {expanded ? 'Click to collapse' : 'Click to expand and see the hourly forecast'}
        <span className={`chevron ${expanded ? 'up' : ''}`} aria-hidden="true" />
      </p>
    </section>
  );
}
