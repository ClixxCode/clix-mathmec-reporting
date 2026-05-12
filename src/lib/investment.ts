// Mathews Mechanical management fee schedule.
// October 2025: $1,355.04 (pro-rated onboarding month)
// November 2025 onward: $1,750/month

const MONTHLY_FEE = 1750;
const OCT_2025_FEE = 1355.04;
const FEE_START = new Date(Date.UTC(2025, 9, 1)); // Oct 1, 2025

function daysInMonth(year: number, monthZeroIdx: number) {
  return new Date(Date.UTC(year, monthZeroIdx + 1, 0)).getUTCDate();
}

function feeForMonth(year: number, monthZeroIdx: number): number {
  if (year < 2025) return 0;
  if (year === 2025 && monthZeroIdx < 9) return 0;
  if (year === 2025 && monthZeroIdx === 9) return OCT_2025_FEE;
  return MONTHLY_FEE;
}

/**
 * Sum of management fees overlapping [start, end) date range.
 * Pro-rates by days within each calendar month.
 */
export function managementFeeBetween(start: Date, end: Date): number {
  if (end <= FEE_START) return 0;
  const s = start < FEE_START ? FEE_START : start;
  if (s >= end) return 0;

  let total = 0;
  let cursor = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
  while (cursor < end) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();
    const monthStart = new Date(Date.UTC(y, m, 1));
    const monthEnd = new Date(Date.UTC(y, m + 1, 1));
    const overlapStart = s > monthStart ? s : monthStart;
    const overlapEnd = end < monthEnd ? end : monthEnd;
    if (overlapEnd > overlapStart) {
      const daysOverlap =
        (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
      const monthDays = daysInMonth(y, m);
      total += feeForMonth(y, m) * (daysOverlap / monthDays);
    }
    cursor = monthEnd;
  }
  return total;
}

export function fmtUSD(n: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}