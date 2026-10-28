export const MIN_DATE = '2026-01-02';
export const MAX_DATE = '2026-02-01';

export function isInRange(value) {
  return Boolean(value) && value >= MIN_DATE && value <= MAX_DATE;
}
