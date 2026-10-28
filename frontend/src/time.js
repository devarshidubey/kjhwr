const TZ = 'Europe/London';

function partsOf(date, options) {
  const dtf = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, ...options });
  const map = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return map;
}

export function londonTimeHm(date = new Date()) {
  const p = partsOf(date, { hour: '2-digit', minute: '2-digit' });
  return `${p.hour}:${p.minute}`;
}

export function londonHmFromIso(iso) {
  if (!iso) return null;
  return londonTimeHm(new Date(iso));
}

export function londonDateTime(iso) {
  if (!iso) return null;
  const p = partsOf(new Date(iso), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

export function londonPublishLabel(iso) {
  if (!iso) return null;
  const p = partsOf(new Date(iso), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${p.day} ${p.month}, ${p.hour}:${p.minute}`;
}

export function hourRange(iso) {
  if (!iso) return '';
  const start = new Date(iso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return `${londonTimeHm(start)} to ${londonTimeHm(end)}`;
}

export function formatDeliveryHeading(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatWindowDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
