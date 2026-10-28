import { expectedRange, errorKind, formatMw, formatSigned } from '../format.js';
import { hourRange, londonPublishLabel } from '../time.js';

function ErrorCell({ value }) {
  const kind = errorKind(value);
  if (value == null) return <td className="empty-cell">No data</td>;
  const cls = kind === 'over' ? 'cell-over' : kind === 'under' ? 'cell-under' : '';
  const label = kind === 'over' ? 'over' : kind === 'under' ? 'under' : 'on forecast';
  return (
    <td className={`num ${cls}`}>
      <span className="num">{formatSigned(value, 1)}</span>
      <span className="cell-kind"> {label}</span>
    </td>
  );
}

export default function SlotTable({ mode, slots, mae }) {
  const isReplay = mode === 'replay';

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Forecast (MW)</th>
            {isReplay ? (
              <>
                <th scope="col">Actual (MW)</th>
                <th scope="col">Actual error (MW)</th>
                <th scope="col">Expected margin (±MW)</th>
                <th scope="col">Within margin</th>
              </>
            ) : (
              <>
                <th scope="col">Expected range (MW)</th>
                <th scope="col">Forecast published (UK)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {(slots || []).map((slot) => {
            const within =
              slot.error_mw != null && mae != null
                ? Math.abs(slot.error_mw) <= mae
                : null;
            return (
              <tr key={slot.start_time}>
                <td className="num">{hourRange(slot.start_time)}</td>
                <td className={slot.forecast_mw == null ? 'empty-cell' : 'num'}>
                  {slot.forecast_mw == null ? 'No forecast available' : formatMw(slot.forecast_mw)}
                </td>
                {isReplay ? (
                  <>
                    <td className={slot.actual_mw == null ? 'empty-cell' : 'num'}>
                      {slot.actual_mw == null ? 'No actual available' : formatMw(slot.actual_mw)}
                    </td>
                    <ErrorCell value={slot.error_mw} />
                    <td className="num">{mae == null ? '—' : `±${formatMw(mae)}`}</td>
                    <td>{within == null ? '—' : within ? 'Yes' : 'No'}</td>
                  </>
                ) : (
                  <>
                    <td className="num">
                      {expectedRange(slot.forecast_mw, mae) ?? '—'}
                    </td>
                    <td className="num">
                      {londonPublishLabel(slot.publish_time_used) ?? '—'}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
