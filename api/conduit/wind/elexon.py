"""Elexon BMRS client. The only module that talks to the outside world."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from conduit.exceptions import UpstreamError

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
TIMEOUT = 20                    # seconds per request
CHUNK = timedelta(days=2)       # WINDFOR publish window per request
PUBLISH_LOOKBACK = timedelta(days=2)  # fetch forecasts published this long before the range
MAX_WORKERS = 6

# --- Parameter names: VERIFY against the Elexon doc pages ---
ACTUALS_URL = f"{BASE_URL}/FUELHH/stream"
ACTUALS_FROM, ACTUALS_TO = "settlementDateFrom", "settlementDateTo"
ACTUALS_FUEL = "fuelType"
FORECAST_URL = f"{BASE_URL}/WINDFOR/stream"
FORECAST_FROM, FORECAST_TO = "publishDateTimeFrom", "publishDateTimeTo"

UK = ZoneInfo("Europe/London")
UTC = ZoneInfo("UTC")

_session = requests.Session()
_session.mount(
    "https://",
    HTTPAdapter(
        pool_maxsize=MAX_WORKERS,
        max_retries=Retry(
            total=2,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET",),
        ),
    ),
)


# ---------- helpers ----------

def _ts(dt):
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_ts(s):
    dt = datetime.fromisoformat(s)  # Python 3.11+ accepts a trailing "Z"
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def _get_json(url, params):
    try:
        resp = _session.get(url, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout as e:
        raise UpstreamError("Elexon timed out") from e
    except requests.HTTPError as e:
        raise UpstreamError(f"Elexon returned HTTP {e.response.status_code}") from e
    except requests.RequestException as e:
        raise UpstreamError("Elexon request failed") from e
    except ValueError as e:
        raise UpstreamError("Elexon returned invalid JSON") from e

    # Stream endpoints return a bare list; tolerate a {"data": [...]} wrapper.
    if isinstance(data, dict):
        data = data.get("data", [])
    if not isinstance(data, list):
        raise UpstreamError("Unexpected response shape from Elexon")
    return data


# ---------- actuals (FUELHH) ----------

def fetch_wind_actuals(start_dt, end_dt):
    """FUELHH rows with fuelType == WIND, target time in [start_dt, end_dt).
    -> [{"start_time": datetime, "generation": float}]"""
    params = {
        ACTUALS_FROM: start_dt.astimezone(UK).date().isoformat(),
        ACTUALS_TO: (end_dt - timedelta(seconds=1)).astimezone(UK).date().isoformat(),
        ACTUALS_FUEL: "WIND",
        "format": "json",
    }
    rows = _get_json(ACTUALS_URL, params)

    out = {}
    for r in rows:
        if r.get("fuelType") != "WIND":      # defensive: filter again in code
            continue
        try:
            start = _parse_ts(r["startTime"])
            gen = float(r["generation"])
        except (KeyError, TypeError, ValueError):
            continue                         # skip malformed rows
        if start_dt <= start < end_dt:
            out[start] = gen                 # de-duplicates by slot
    return [{"start_time": s, "generation": g} for s, g in sorted(out.items())]


# ---------- forecasts (WINDFOR) ----------

def _fetch_forecast_chunk(pub_from, pub_to):
    params = {FORECAST_FROM: _ts(pub_from), FORECAST_TO: _ts(pub_to), "format": "json"}
    return _get_json(FORECAST_URL, params)


def fetch_wind_forecasts(start_dt, end_dt, publish_to=None):
    """WINDFOR rows with target time in [start_dt, end_dt), publish_time <= publish_to.
    -> [{"start_time": datetime, "publish_time": datetime, "generation": float}]"""
    publish_to = publish_to or end_dt
    pub_from = start_dt - PUBLISH_LOOKBACK

    # Split the publish window into chunks and fetch them in parallel.
    chunks, cur = [], pub_from
    while cur < publish_to:
        nxt = min(cur + CHUNK, publish_to)
        chunks.append((cur, nxt))
        cur = nxt
    if not chunks:
        return []

    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(chunks))) as pool:
        results = list(pool.map(lambda c: _fetch_forecast_chunk(*c), chunks))

    out = {}
    for rows in results:
        for r in rows:
            try:
                start = _parse_ts(r["startTime"])
                publish = _parse_ts(r["publishTime"])
                gen = float(r["generation"])
            except (KeyError, TypeError, ValueError):
                continue
            if start_dt <= start < end_dt and publish <= publish_to:
                out[(start, publish)] = gen  # chunk edges may overlap, so de-duplicate
    return [
        {"start_time": s, "publish_time": p, "generation": g}
        for (s, p), g in sorted(out.items())
    ]