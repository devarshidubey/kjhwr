from datetime import date, time

from conduit.exceptions import BadRequest, OutOfScopeDate

SCOPE_START = date(2026, 1, 2)   # first delivery day (decision on Jan 1)
SCOPE_END = date(2026, 2, 1)     # last delivery day (decision on Jan 31)
MAX_RANGE_DAYS = 31
DEFAULT_CUTOFF = time(9, 0)      # documented assumption, UK local time
DEFAULT_WINDOW_DAYS = 14
MAX_WINDOW_DAYS = 60


def parse_date(args, name, required=True):
    raw = args.get(name)
    if not raw:
        if required:
            raise BadRequest(f"{name} is required")
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise BadRequest(f"{name} must be YYYY-MM-DD")


def in_scope(d, name):
    if not (SCOPE_START <= d <= SCOPE_END):
        raise OutOfScopeDate(
            f"{name} must be between {SCOPE_START} and {SCOPE_END}"
        )
    return d


def parse_cutoff(args):
    raw = args.get("cutoff_time")
    if not raw:
        return DEFAULT_CUTOFF
    try:
        return time.fromisoformat(raw)  # "09:00"
    except ValueError:
        raise BadRequest("cutoff_time must be HH:MM")


def parse_range(args):
    start = in_scope(parse_date(args, "start"), "start")
    end = in_scope(parse_date(args, "end"), "end")
    if start > end:
        raise BadRequest("start must be on or before end")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise BadRequest(f"range must be at most {MAX_RANGE_DAYS} days")
    return start, end


def parse_window_days(args):
    raw = args.get("window_days")
    if not raw:
        return DEFAULT_WINDOW_DAYS
    try:
        n = int(raw)
    except ValueError:
        raise BadRequest("window_days must be an integer")
    if not (1 <= n <= MAX_WINDOW_DAYS):
        raise BadRequest(f"window_days must be between 1 and {MAX_WINDOW_DAYS}")
    return n