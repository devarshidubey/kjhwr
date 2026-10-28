import { errorKind, formatGwh, formatMw, formatSigned, sumMwToGwh, typicalErrorGwh } from '../format.js';
import { formatDeliveryHeading } from '../time.js';
import SlotTable from './SlotTable.jsx';

function toggleKeys(event, onToggle) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onToggle();
  }
}

function marginResult(replayMae, expectedMae) {
  if (replayMae == null || expectedMae == null) {
    return 'not enough paired hours to judge the margin';
  }
  return replayMae <= expectedMae ? 'within the expected margin' : 'outside the expected margin';
}

export default function ReplayCard({
  comparison,
  accuracy,
  expanded,
  onToggle,
  onHide,
}) {
  const forecastTotal = sumMwToGwh(comparison.slots, 'forecast_mw');
  const actualTotal = sumMwToGwh(comparison.slots, 'actual_mw');
  const errorGwh =
    forecastTotal.gwh != null && actualTotal.gwh != null
      ? forecastTotal.gwh - actualTotal.gwh
      : null;
  const kind = errorKind(errorGwh);
  const expected = typicalErrorGwh(accuracy);
  const replayMae = comparison.summary?.mae;
  const expectedMae = accuracy?.mae;

  return (
    <div>
      <section
        className="card expandable"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => toggleKeys(e, onToggle)}
      >
        <p className="section-label">
          Replay: forecast vs actual generation for {formatDeliveryHeading(comparison.delivery_date)}
        </p>

        <div className="headline-row three">
          <div>
            <p className="section-label">Forecast total</p>
            <p className="headline">
              <span className="num">{formatGwh(forecastTotal.gwh) ?? '—'}</span>
              <span className="unit"> GWh</span>
            </p>
          </div>
          <div>
            <p className="section-label">Actual total</p>
            <p className="headline">
              <span className="num">{formatGwh(actualTotal.gwh) ?? '—'}</span>
              <span className="unit"> GWh</span>
            </p>
          </div>
          <div>
            <p className="section-label">Actual error</p>
            <p className={`headline ${kind === 'over' ? 'text-over' : kind === 'under' ? 'text-under' : ''}`}>
              <span className="num">{formatSigned(errorGwh, 1) ?? '—'}</span>
              <span className="unit"> GWh</span>
            </p>
            {kind && kind !== 'even' ? (
              <p className={`hint ${kind === 'over' ? 'text-over' : 'text-under'}`}>
                {kind === 'over' ? 'over-forecast' : 'under-forecast'}
              </p>
            ) : (
              <p className="hint">on forecast</p>
            )}
            <p className="hint">
              Expected margin ±{expected == null ? '—' : formatGwh(expected)} GWh
            </p>
          </div>
        </div>

        <p className="plain-note">
          Actual hourly error: MAE {formatMw(replayMae) ?? '—'} MW (expected ±
          {formatMw(expectedMae) ?? '—'} MW). Result: {marginResult(replayMae, expectedMae)}.
        </p>

        <div className={`collapse ${expanded ? 'open' : ''}`}>
          <div>
            <SlotTable mode="replay" slots={comparison.slots} mae={expectedMae} />
          </div>
        </div>

        <p className="expand-hint">
          {expanded ? 'Click to collapse' : 'Click to expand and see the hourly comparison'}
          <span className={`chevron ${expanded ? 'up' : ''}`} aria-hidden="true" />
        </p>
      </section>
      <div className="hide-row">
        <button type="button" className="btn-text" onClick={onHide}>
          Hide replay
        </button>
      </div>
    </div>
  );
}
