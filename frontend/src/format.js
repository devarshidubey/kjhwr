export function formatMw(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatGwh(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSigned(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const abs = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function sumMwToGwh(slots, key) {
  let sum = 0;
  let n = 0;
  for (const slot of slots || []) {
    if (slot[key] == null) continue;
    sum += Number(slot[key]);
    n += 1;
  }
  return { gwh: n ? sum / 1000 : null, n };
}

export function typicalErrorGwh(accuracy) {
  const rows = accuracy?.daily_errors || [];
  const absBias = rows.map((row) => row.bias).filter((b) => b != null).map(Math.abs);
  if (!absBias.length) return null;
  const mean = absBias.reduce((a, b) => a + b, 0) / absBias.length;
  return (mean * 24) / 1000;
}

export function modePublishTime(slots) {
  const counts = new Map();
  for (const slot of slots || []) {
    const t = slot.publish_time_used;
    if (!t) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = null;
  let n = 0;
  for (const [key, count] of counts) {
    if (count > n) {
      best = key;
      n = count;
    }
  }
  return best;
}

export function errorKind(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  if (value > 0) return 'over';
  if (value < 0) return 'under';
  return 'even';
}

export function expectedRange(forecastMw, mae) {
  if (forecastMw == null || mae == null) return null;
  const lo = Math.max(0, forecastMw - mae);
  const hi = forecastMw + mae;
  return `${formatMw(lo)}–${formatMw(hi)}`;
}
