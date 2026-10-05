// Money-safe arithmetic helpers. All monetary values in the app are stored as
// decimal(14,2) strings; these avoid the classic float drift (0.1 + 0.2) when
// accumulating running balances, payroll lines, or POS totals.
//
// Every helper rounds to 2dp with the half-up strategy accountants expect.

const SCALE = 2;

function round(value: number): number {
  const factor = 10 ** SCALE;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function addDecimal(...values: (string | number | null | undefined)[]): string {
  const total = values.reduce<number>((sum, v) => sum + toNumber(v), 0);
  return round(total).toFixed(SCALE);
}

export function subDecimal(a: string | number | null | undefined, b: string | number | null | undefined): string {
  return round(toNumber(a) - toNumber(b)).toFixed(SCALE);
}

export function mulDecimal(a: string | number | null | undefined, b: string | number | null | undefined): string {
  return round(toNumber(a) * toNumber(b)).toFixed(SCALE);
}

export function divDecimal(a: string | number | null | undefined, b: string | number | null | undefined): string {
  const divisor = toNumber(b);
  if (divisor === 0) return (0).toFixed(SCALE);
  return round(toNumber(a) / divisor).toFixed(SCALE);
}

export function sumDecimals(values: (string | number | null | undefined)[]): string {
  return addDecimal(...values);
}

export function roundDecimal(value: string | number | null | undefined): number {
  return round(toNumber(value));
}

export function absDecimal(a: string | number | null | undefined): string {
  return Math.abs(toNumber(a)).toFixed(SCALE);
}

export function negateDecimal(a: string | number | null | undefined): string {
  return (-toNumber(a)).toFixed(SCALE);
}

export function cmpDecimal(a: string | number | null | undefined, b: string | number | null | undefined): -1 | 0 | 1 {
  const diff = round(toNumber(a) - toNumber(b));
  if (diff === 0) return 0;
  return diff < 0 ? -1 : 1;
}

export function eqDecimal(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
  return cmpDecimal(a, b) === 0;
}

export function isZeroDecimal(a: string | number | null | undefined): boolean {
  return cmpDecimal(a, 0) === 0;
}

export function gteDecimal(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
  return cmpDecimal(a, b) >= 0;
}

export function lteDecimal(a: string | number | null | undefined, b: string | number | null | undefined): boolean {
  return cmpDecimal(a, b) <= 0;
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
