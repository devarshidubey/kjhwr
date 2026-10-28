import { useEffect, useMemo, useState } from 'react';
import { fetchAccuracy, fetchComparison, fetchForecast } from './api.js';
import Controls from './components/Controls.jsx';
import { isInRange } from './dates.js';
import ForecastCard from './components/ForecastCard.jsx';
import Notice from './components/Notice.jsx';
import ReplayCard from './components/ReplayCard.jsx';
import Skeleton from './components/Skeleton.jsx';
import { londonTimeHm } from './time.js';

export default function App() {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [liveClock, setLiveClock] = useState(() => londonTimeHm());
  const [cutoffTime, setCutoffTime] = useState(null);

  const [forecast, setForecast] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [comparison, setComparison] = useState(null);

  const [forecastExpanded, setForecastExpanded] = useState(false);
  const [replayExpanded, setReplayExpanded] = useState(false);

  const [forecastLoading, setForecastLoading] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [forecastSlow, setForecastSlow] = useState(false);
  const [replaySlow, setReplaySlow] = useState(false);

  const [forecastError, setForecastError] = useState(null);
  const [replayError, setReplayError] = useState(null);

  const loading = forecastLoading || replayLoading;
  const clockHm = cutoffTime || liveClock;

  useEffect(() => {
    if (cutoffTime) return undefined;
    const tick = () => setLiveClock(londonTimeHm());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [cutoffTime]);

  useEffect(() => {
    if (!forecastLoading) return undefined;
    const id = setTimeout(() => setForecastSlow(true), 10_000);
    return () => clearTimeout(id);
  }, [forecastLoading]);

  useEffect(() => {
    if (!replayLoading) return undefined;
    const id = setTimeout(() => setReplaySlow(true), 10_000);
    return () => clearTimeout(id);
  }, [replayLoading]);

  const disabledReason = useMemo(() => {
    if (!deliveryDate) return 'Choose a delivery date first';
    if (!isInRange(deliveryDate)) return 'Choose a date in the available range';
    return '';
  }, [deliveryDate]);

  function clearResults() {
    setForecast(null);
    setAccuracy(null);
    setComparison(null);
    setForecastError(null);
    setReplayError(null);
    setForecastExpanded(false);
    setReplayExpanded(false);
    setCutoffTime(null);
  }

  function handleDateChange(value) {
    setDeliveryDate(value);
    clearResults();
  }

  async function loadForecast() {
    if (!isInRange(deliveryDate) || loading) return;
    const cutoff = cutoffTime || londonTimeHm();
    setCutoffTime(cutoff);
    setForecastLoading(true);
    setForecastSlow(false);
    setForecastError(null);
    setReplayError(null);
    setComparison(null);
    try {
      const [fc, acc] = await Promise.all([
        fetchForecast(deliveryDate, cutoff),
        fetchAccuracy(deliveryDate, cutoff),
      ]);
      setForecast(fc);
      setAccuracy(acc);
      setForecastExpanded(false);
    } catch (err) {
      setForecast(null);
      setAccuracy(null);
      setForecastError(err);
    } finally {
      setForecastLoading(false);
      setForecastSlow(false);
    }
  }

  async function loadReplay() {
    if (!forecast || !cutoffTime || loading) return;
    setReplayLoading(true);
    setReplaySlow(false);
    setReplayError(null);
    try {
      const data = await fetchComparison(deliveryDate, cutoffTime);
      setComparison(data);
      setReplayExpanded(false);
    } catch (err) {
      setComparison(null);
      setReplayError(err);
    } finally {
      setReplayLoading(false);
      setReplaySlow(false);
    }
  }

  function hideReplay() {
    setComparison(null);
    setReplayError(null);
    setReplayExpanded(false);
  }

  const showEmpty = !forecastLoading && !forecast && !forecastError;

  return (
    <div className="page">
      <main>
        <header className="page-header">
          <h1>Wind Forecast Desk</h1>
          <p className="subtitle">
            Day-ahead wind generation forecast and accuracy for Great Britain, based on Elexon data.
          </p>
        </header>

        <section className="how-it-works" aria-label="How it works">
          <ol>
            <li>
              <span className="step-num">1</span>
              Choose the delivery date you are buying power for.
            </li>
            <li>
              <span className="step-num">2</span>
              Press “Get forecast” to see the forecast available at your decision time.
            </li>
            <li>
              <span className="step-num">3</span>
              After reviewing, press “Replay with actual generation” to see how the forecast
              performed.
            </li>
          </ol>
        </section>

        <Controls
          deliveryDate={deliveryDate}
          onDateChange={handleDateChange}
          clockHm={clockHm}
          onSubmit={loadForecast}
          loading={loading}
          disabledReason={disabledReason}
        />

        <div aria-live="polite">
          {forecastLoading ? (
            <Skeleton slow={forecastSlow} message="Retrieving forecast from Elexon." />
          ) : null}
          {forecastError ? (
            <Notice
              tone="alert"
              actionLabel={forecastError.retryable || forecastError.status === 502 ? 'Try again' : null}
              onAction={
                forecastError.retryable || forecastError.status === 502 ? loadForecast : undefined
              }
            >
              {forecastError.message}
            </Notice>
          ) : null}
        </div>

        {showEmpty ? (
          <p className="empty-state">
            Choose a delivery date above and press Get forecast to begin.
          </p>
        ) : null}

        {forecast && !forecastLoading ? (
          <ForecastCard
            forecast={forecast}
            accuracy={accuracy}
            expanded={forecastExpanded}
            onToggle={() => setForecastExpanded((v) => !v)}
          />
        ) : null}

        {forecast && !forecastLoading && !comparison && !replayLoading ? (
          <section className="replay-prompt">
            <button
              type="button"
              className="btn-secondary"
              onClick={loadReplay}
              disabled={loading}
            >
              Replay with actual generation
            </button>
            <p className="hint">
              Reveals the generation that was actually metered and compares it with the forecast
              above. This information would not have been available at decision time.
            </p>
          </section>
        ) : null}

        <div aria-live="polite">
          {replayLoading ? (
            <Skeleton slow={replaySlow} message="Retrieving actual generation from Elexon." />
          ) : null}
          {replayError ? (
            <Notice
              tone="alert"
              actionLabel={replayError.retryable || replayError.status === 502 ? 'Try again' : null}
              onAction={replayError.retryable || replayError.status === 502 ? loadReplay : undefined}
            >
              {replayError.message}
            </Notice>
          ) : null}
        </div>

        {comparison && !replayLoading ? (
          <ReplayCard
            comparison={comparison}
            accuracy={accuracy}
            expanded={replayExpanded}
            onToggle={() => setReplayExpanded((v) => !v)}
            onHide={hideReplay}
          />
        ) : null}

        <footer className="page-footer">
          Data: Elexon BMRS (FUELHH actuals, WINDFOR forecasts). The decision time is simulated
          using your current clock time on the day before delivery. Forecasts are hourly; error
          figures are mean absolute error (MAE) over the preceding 14 days.
        </footer>
      </main>
    </div>
  );
}
