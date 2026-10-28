"""Business logic: decision-time forecast selection, joins and error metrics."""
import math
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

from . import elexon

UK = ZoneInfo("Europe/London")
UTC = ZoneInfo("UTC")
SLOT = timedelta(minutes=30)
HOUR = timedelta(hours=1)


# ---------- time helpers ----------

def _iso(dt):
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None


def _day_bounds(d):
    """[start, end) of a UK delivery day, in UTC."""
    start = datetime.combine(d, time.min, tzinfo=UK).astimezone(UTC)
    end = datetime.combine(d + timedelta(days=1), time.min, tzinfo=UK).astimezone(UTC)
    return start, end


def _slot_starts(start_date, end_date, step=HOUR):
    """Every forecast slot start (UTC) from start_date to end_date inclusive."""
    cur, _ = _day_bounds(start_date)
    _, stop = _day_bounds(end_date)
    while cur < stop:
        yield cur
        cur += step

def cutoff_for_slot(slot_start, cutoff_time):
    """Decision cutoff for a slot: D-1 at cutoff_time UK local, as UTC."""
    delivery_date = slot_start.astimezone(UK).date()
    decision_day = delivery_date - timedelta(days=1)
    return datetime.combine(decision_day, cutoff_time, tzinfo=UK).astimezone(UTC)


# ---------- selection and joining ----------

def _select_latest(forecast_rows, cutoff_time):
    """
    For each target slot keep the forecast with the latest publish_time that is
    still <= that slot's decision cutoff. Later publishes are hindsight.
    """
    best = {}
    for r in forecast_rows:
        if r["publish_time"] > cutoff_for_slot(r["start_time"], cutoff_time):
            continue
        cur = best.get(r["start_time"])
        if cur is None or r["publish_time"] > cur["publish_time"]:
            best[r["start_time"]] = r
    return best


def _fetch_both(start_date, end_date, cutoff_time, need_actuals=True):
    """Fetch actuals and forecasts concurrently for a delivery-date range."""
    range_start, _ = _day_bounds(start_date)
    _, range_end = _day_bounds(end_date)
    last_cutoff = cutoff_for_slot(range_end - SLOT, cutoff_time)

    with ThreadPoolExecutor(max_workers=2) as pool:
        f_fc = pool.submit(
            elexon.fetch_wind_forecasts, range_start, range_end, publish_to=last_cutoff
        )
        f_ac = (
            pool.submit(elexon.fetch_wind_actuals, range_start, range_end)
            if need_actuals else None
        )
        forecasts = f_fc.result()          # UpstreamError propagates to the handler
        actuals = f_ac.result() if f_ac else []
    return forecasts, actuals


def _comparison_rows(start_date, end_date, cutoff_time):
    """Shared core: one row per slot with forecast, actual, error."""
    forecasts, actuals = _fetch_both(start_date, end_date, cutoff_time)
    chosen = _select_latest(forecasts, cutoff_time)
    actual_by_slot = {a["start_time"]: a["generation"] for a in actuals}

    rows = []
    for slot in _slot_starts(start_date, end_date):
        fc = chosen.get(slot)
        f_mw = fc["generation"] if fc else None
        a_mw = actual_by_slot.get(slot)
        err = (f_mw - a_mw) if (f_mw is not None and a_mw is not None) else None
        rows.append({
            "start": slot,
            "actual_mw": a_mw,
            "forecast_mw": f_mw,
            "error_mw": err,
            "publish_time_used": fc["publish_time"] if fc else None,
        })
    return rows


# ---------- metrics ----------

def _percentile(sorted_vals, p):
    """Linear-interpolated percentile (matches numpy's default)."""
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * p / 100
    lo, hi = math.floor(k), math.ceil(k)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)


def _r(x, nd=1):
    return None if x is None else round(x, nd)


def summarize(errors):
    """MAE, RMSE, bias, P90 of absolute error. `errors` = forecast - actual."""
    errors = [e for e in errors if e is not None]
    n = len(errors)
    if n == 0:
        return {"mae": None, "rmse": None, "bias": None, "p90_abs": None, "n_slots": 0}
    abs_err = sorted(abs(e) for e in errors)
    return {
        "mae": _r(sum(abs_err) / n),
        "rmse": _r(math.sqrt(sum(e * e for e in errors) / n)),
        "bias": _r(sum(errors) / n),
        "p90_abs": _r(_percentile(abs_err, 90)),
        "n_slots": n,
    }


def summarize_forecast(slots):
    """Daily headline numbers for the collapsed card."""
    vals = [s for s in slots if s["forecast_mw"] is not None]
    if not vals:
        return {"avg_mw": None, "n_slots": len(slots), "n_missing": len(slots)}
    lo = min(vals, key=lambda s: s["forecast_mw"])
    hi = max(vals, key=lambda s: s["forecast_mw"])
    return {
        "avg_mw": _r(sum(s["forecast_mw"] for s in vals) / len(vals)),
        "min_mw": lo["forecast_mw"], "min_slot": lo["start_time"],
        "max_mw": hi["forecast_mw"], "max_slot": hi["start_time"],
        "n_slots": len(slots),
        "n_missing": len(slots) - len(vals),
    }


# ---------- public service functions (called by views) ----------

def get_decision_forecast(delivery_date, cutoff_time):
    """Requirement 1: the forecast the buyer had at the cutoff. No actuals."""
    forecasts, _ = _fetch_both(delivery_date, delivery_date, cutoff_time, need_actuals=False)
    chosen = _select_latest(forecasts, cutoff_time)

    slots = []
    for slot in _slot_starts(delivery_date, delivery_date):
        fc = chosen.get(slot)
        slots.append({
            "start_time": _iso(slot),
            "forecast_mw": fc["generation"] if fc else None,
            "publish_time_used": _iso(fc["publish_time"]) if fc else None,
        })

    first_slot = next(_slot_starts(delivery_date, delivery_date))
    return {
        "delivery_date": delivery_date.isoformat(),
        "cutoff_utc": _iso(cutoff_for_slot(first_slot, cutoff_time)),
        "summary": summarize_forecast(slots),
        "slots": slots,
    }


def build_comparison(delivery_date, cutoff_time):
    """Replay: per-slot actual vs decision-time forecast for one delivery day."""
    rows = _comparison_rows(delivery_date, delivery_date, cutoff_time)
    slots = [{
        "start_time": _iso(r["start"]),
        "actual_mw": r["actual_mw"],
        "forecast_mw": r["forecast_mw"],
        "error_mw": r["error_mw"],
        "publish_time_used": _iso(r["publish_time_used"]),
    } for r in rows]
    return {
        "delivery_date": delivery_date.isoformat(),
        "cutoff_utc": _iso(cutoff_for_slot(rows[0]["start"], cutoff_time)),
        "summary": summarize([r["error_mw"] for r in rows]),
        "slots": slots,
    }


def get_backtest_accuracy(start_date, end_date, cutoff_time):
    """Hindsight accuracy over a range of delivery days."""
    rows = _comparison_rows(start_date, end_date, cutoff_time)
    result = summarize([r["error_mw"] for r in rows])
    result.update({
        "start": start_date.isoformat(),
        "end": end_date.isoformat(),
        "n_missing": sum(1 for r in rows if r["error_mw"] is None),
    })
    return result


def get_decision_time_accuracy(delivery_date, window_days, cutoff_time):
    """
    Accuracy using only history the buyer had at the cutoff for `delivery_date`.
    Window = delivery days D-1-window_days .. D-2 (D-1 is still in progress).
    Each past day uses its own point-in-time forecast, not the latest one.
    """
    window_end = delivery_date - timedelta(days=2)
    window_start = delivery_date - timedelta(days=1 + window_days)
    rows = _comparison_rows(window_start, window_end, cutoff_time)

    by_day = defaultdict(list)
    for r in rows:
        by_day[r["start"].astimezone(UK).date()].append(r["error_mw"])

    daily_errors = []
    for d in sorted(by_day):
        s = summarize(by_day[d])
        daily_errors.append({"date": d.isoformat(), "mae": s["mae"], "bias": s["bias"], "n_slots": s["n_slots"]})

    result = summarize([r["error_mw"] for r in rows])
    days_with_data = sum(1 for d in daily_errors if d["n_slots"] > 0)
    result.update({
        "delivery_date": delivery_date.isoformat(),
        "window_days": window_days,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "days_with_data": days_with_data,
        "insufficient_history": days_with_data < window_days,
        "daily_errors": daily_errors,
    })
    return result


def get_accuracy_by_hour(start_date, end_date, cutoff_time):
    """Optional: error metrics grouped by UK hour of day."""
    rows = _comparison_rows(start_date, end_date, cutoff_time)
    buckets = defaultdict(list)
    for r in rows:
        buckets[r["start"].astimezone(UK).hour].append(r["error_mw"])
    return {
        "start": start_date.isoformat(),
        "end": end_date.isoformat(),
        "hours": [{"hour": h, **summarize(buckets[h])} for h in sorted(buckets)],
    }