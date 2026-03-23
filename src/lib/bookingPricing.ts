import { differenceInCalendarDays, format } from 'date-fns';

export type PackageCode = 'A' | 'B' | 'C';

export interface SeasonRates {
  weekday: number;
  weekend: number;
}

export interface BookingSeason {
  id: string;
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  minStay: number;
  rates: Record<PackageCode, SeasonRates>;
}

export interface BookingPricingConfig {
  longStayDiscountPercent: number;
  longStayMinNights: number;
  /**
   * JS getDay(): 0=Sun … 5=Fri … 6=Sat. Include 5, 6, 0 so “weekend” rates match typical
   * rental sheets (Fri–Sun), not only Sat–Sun.
   */
  weekendDays: number[];
  seasons: BookingSeason[];
  /** Used when a date is outside all seasons */
  fallbackRates: Record<PackageCode, SeasonRates>;
}

export function parseLocalYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isWeekendDay(d: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(d.getDay());
}

export function findSeasonForDate(d: Date, seasons: BookingSeason[]): BookingSeason | null {
  const t = startOfLocalDay(d).getTime();
  for (const s of seasons) {
    const a = startOfLocalDay(parseLocalYMD(s.start)).getTime();
    const b = startOfLocalDay(parseLocalYMD(s.end)).getTime();
    if (t >= a && t <= b) return s;
  }
  return null;
}

const MS_PER_DAY = 86400000;
/**
 * Days before a season starts or after it ends where we still apply that season’s rules
 * (min-stay max, and nearest season for pricing — fixes gaps e.g. Mar 26–28 before Mar 29 season).
 */
export const SEASON_SHOULDER_DAYS = 14;

/**
 * Season used for **pricing** this calendar night: inside a defined range, or the **nearest**
 * season within {@link SEASON_SHOULDER_DAYS} days (so “stitch” gaps don’t fall back to flat €850).
 */
export function resolveSeasonForPricing(d: Date, seasons: BookingSeason[]): BookingSeason | null {
  const inside = findSeasonForDate(d, seasons);
  if (inside) return inside;

  const t0 = startOfLocalDay(d).getTime();
  const windowMs = SEASON_SHOULDER_DAYS * MS_PER_DAY;
  let best: BookingSeason | null = null;
  let bestDist = Infinity;

  for (const se of seasons) {
    const a = startOfLocalDay(parseLocalYMD(se.start)).getTime();
    const b = startOfLocalDay(parseLocalYMD(se.end)).getTime();
    let dist: number;
    if (t0 < a) dist = a - t0;
    else if (t0 > b) dist = t0 - b;
    else continue;

    if (dist > windowMs) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = se;
    } else if (dist === bestDist && best !== null) {
      // Tie (rare): prefer the later season on the calendar — usually the upcoming block.
      if (se.start > best.start) best = se;
    }
  }
  return best;
}

export function nightlyRateForDate(
  d: Date,
  pkg: PackageCode,
  config: BookingPricingConfig
): number {
  const season = resolveSeasonForPricing(d, config.seasons);
  const rates = season?.rates?.[pkg] ?? config.fallbackRates[pkg];
  if (!rates) return 0;
  return isWeekendDay(d, config.weekendDays) ? rates.weekend : rates.weekday;
}

/** Reference night used to show “from” prices for the visible calendar month (mid-month). */
export function referenceDateForCalendarMonth(month: Date): Date {
  return new Date(month.getFullYear(), month.getMonth(), 15);
}

export function formatNightPriceHint(
  pkg: PackageCode,
  refDate: Date,
  config: BookingPricingConfig
): string {
  const season = resolveSeasonForPricing(refDate, config.seasons);
  const rates = season?.rates?.[pkg] ?? config.fallbackRates[pkg];
  if (!rates) return '—';
  const wd = rates.weekday;
  const we = rates.weekend;
  if (wd === we) return `€${wd.toLocaleString()} / night`;
  return `€${wd.toLocaleString()}–€${we.toLocaleString()} / night`;
}

/**
 * Minimum nights if a stay includes this calendar night: season rule, or max of any season
 * within {@link SEASON_SHOULDER_DAYS} days (conservative across “stitch” gaps).
 */
export function minStayNightsForDate(d: Date, seasons: BookingSeason[]): number {
  const direct = findSeasonForDate(d, seasons);
  if (direct) return direct.minStay;

  let max = 1;
  const t0 = startOfLocalDay(d).getTime();
  for (const se of seasons) {
    const a = startOfLocalDay(parseLocalYMD(se.start)).getTime();
    const b = startOfLocalDay(parseLocalYMD(se.end)).getTime();
    if (t0 < a) {
      const daysBefore = (a - t0) / MS_PER_DAY;
      if (daysBefore <= SEASON_SHOULDER_DAYS) max = Math.max(max, se.minStay);
    } else if (t0 > b) {
      const daysAfter = (t0 - b) / MS_PER_DAY;
      if (daysAfter <= SEASON_SHOULDER_DAYS) max = Math.max(max, se.minStay);
    }
  }
  return max;
}

/** All distinct seasons touched by any night in [from, toExclusive). */
export function seasonsTouchingStay(
  from: Date,
  toExclusive: Date,
  seasons: BookingSeason[]
): BookingSeason[] {
  const seen = new Set<string>();
  const out: BookingSeason[] = [];
  const cur = startOfLocalDay(from);
  const end = startOfLocalDay(toExclusive);
  while (cur < end) {
    const s = resolveSeasonForPricing(cur, seasons);
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      out.push(s);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Label for modal / copy when a stay spans one or more seasons. */
export function formatSeasonsTouchingStayLabel(
  from: Date,
  toExclusive: Date,
  seasons: BookingSeason[]
): string | null {
  const touched = seasonsTouchingStay(from, toExclusive, seasons);
  if (touched.length === 0) return null;
  return touched.map(formatSeasonDateRange).join(' · ');
}

/**
 * Conservative min nights to show after check-in only: max of {@link minStayNightsForDate}
 * for each of the first `lookaheadNights` calendar days from check-in (covers upcoming season switches).
 */
export function maxMinStayProspectFromCheckIn(
  from: Date,
  seasons: BookingSeason[],
  lookaheadNights = 21
): { minN: number; touchedSeasonLabels: string[] } {
  let max = 1;
  const labelSeen = new Set<string>();
  const touchedSeasonLabels: string[] = [];
  for (let i = 0; i < lookaheadNights; i++) {
    const x = new Date(startOfLocalDay(from));
    x.setDate(x.getDate() + i);
    max = Math.max(max, minStayNightsForDate(x, seasons));
    const s = resolveSeasonForPricing(x, seasons);
    if (s) {
      const lab = formatSeasonDateRange(s);
      if (!labelSeen.has(lab)) {
        labelSeen.add(lab);
        touchedSeasonLabels.push(lab);
      }
    }
  }
  return { minN: max, touchedSeasonLabels };
}

/** e.g. "29 Mar 2026 – 14 May 2026" for tooltips / guest messaging */
export function formatSeasonDateRange(season: BookingSeason): string {
  const a = parseLocalYMD(season.start);
  const b = parseLocalYMD(season.end);
  return `${format(a, 'd MMM yyyy')} – ${format(b, 'd MMM yyyy')}`;
}

export function maxMinStayNightsInRange(
  from: Date,
  toExclusive: Date,
  seasons: BookingSeason[]
): number {
  let max = 1;
  const cur = startOfLocalDay(from);
  const end = startOfLocalDay(toExclusive);
  while (cur < end) {
    max = Math.max(max, minStayNightsForDate(cur, seasons));
    cur.setDate(cur.getDate() + 1);
  }
  return max;
}

/**
 * How many consecutive **unbooked** nights exist starting at `firstNight` (inclusive).
 * Stops at the first booked night or after `maxNights` iterations.
 */
export function countConsecutiveFreeNights(
  firstNight: Date,
  isNightBooked: (d: Date) => boolean,
  maxNights = 400
): number {
  let n = 0;
  const cur = startOfLocalDay(firstNight);
  for (let i = 0; i < maxNights; i++) {
    if (isNightBooked(cur)) break;
    n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

/** Max {@link minStayNightsForDate} over the first `nightCount` nights starting at `startNight`. */
export function maxMinStayAmongNightsStarting(
  startNight: Date,
  nightCount: number,
  seasons: BookingSeason[]
): number {
  if (nightCount <= 0) return 1;
  let max = 1;
  const cur = startOfLocalDay(startNight);
  for (let i = 0; i < nightCount; i++) {
    max = Math.max(max, minStayNightsForDate(cur, seasons));
    cur.setDate(cur.getDate() + 1);
  }
  return max;
}

/**
 * True if this calendar night is free but the longest uninterrupted free run **from** it
 * is shorter than the strictest min-stay among those nights (e.g. one night between two bookings).
 * Does not apply to booked nights (caller should treat those separately).
 */
export function isMinStayGapBlockedCheckIn(
  checkInFirstNight: Date,
  seasons: BookingSeason[],
  isNightBooked: (d: Date) => boolean
): boolean {
  const day = startOfLocalDay(checkInFirstNight);
  if (isNightBooked(day)) return false;
  const L = countConsecutiveFreeNights(day, isNightBooked);
  if (L === 0) return false;
  const required = maxMinStayAmongNightsStarting(day, L, seasons);
  return L < required;
}

/** One bucket: all nights in the stay that share the same weekday/weekend kind and the same nightly rate. */
export interface StayRateBucket {
  kind: 'weekday' | 'weekend';
  rate: number;
  nights: number;
}

/** Groups each night of the stay by (weekday|weekend + exact nightly rate). */
export function getStayPerNightBreakdown(
  from: Date,
  toExclusive: Date,
  pkg: PackageCode,
  config: BookingPricingConfig
): StayRateBucket[] {
  const nights = differenceInCalendarDays(startOfLocalDay(toExclusive), startOfLocalDay(from));
  if (nights <= 0) return [];

  const map = new Map<string, StayRateBucket>();
  const cur = new Date(startOfLocalDay(from));
  const end = startOfLocalDay(toExclusive);
  while (cur < end) {
    const wknd = isWeekendDay(cur, config.weekendDays);
    const rate = nightlyRateForDate(cur, pkg, config);
    const kind: 'weekday' | 'weekend' = wknd ? 'weekend' : 'weekday';
    const key = `${kind}|${rate}`;
    const prev = map.get(key);
    if (prev) prev.nights += 1;
    else map.set(key, { kind, rate, nights: 1 });
    cur.setDate(cur.getDate() + 1);
  }

  return [...map.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'weekday' ? -1 : 1;
    return a.rate - b.rate;
  });
}

/**
 * Human-readable per-night lines for the stay (no "€A–€B" ranges).
 * - Single rate for whole stay → `€X / night`
 * - Only weekdays or only weekends, multiple rates → `Weekday €… / night [× n]`
 * - Mix of weekday + weekend nights → `Weekday €…` and `Weekend €…` lines
 */
export function formatStayRateDisplay(
  from: Date,
  toExclusive: Date,
  pkg: PackageCode,
  config: BookingPricingConfig
): string[] {
  const breakdown = getStayPerNightBreakdown(from, toExclusive, pkg, config);
  if (breakdown.length === 0) return [];

  const hasW = breakdown.some((b) => b.kind === 'weekday');
  const hasWe = breakdown.some((b) => b.kind === 'weekend');
  const mixed = hasW && hasWe;

  const fmt = (n: number) =>
    `€${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  if (breakdown.length === 1) {
    return [`${fmt(breakdown[0].rate)} / night`];
  }

  if (!mixed) {
    const label = hasWe ? 'Weekend' : 'Weekday';
    return breakdown.map((b) =>
      b.nights > 1 ? `${label} ${fmt(b.rate)} / night × ${b.nights}` : `${label} ${fmt(b.rate)} / night`
    );
  }

  return breakdown.map((b) => {
    const label = b.kind === 'weekday' ? 'Weekday' : 'Weekend';
    return b.nights > 1 ? `${label} ${fmt(b.rate)} / night × ${b.nights}` : `${label} ${fmt(b.rate)} / night`;
  });
}

export function computeStayPricing(
  from: Date,
  toExclusive: Date,
  pkg: PackageCode,
  config: BookingPricingConfig
): { subtotal: number; discount: number; total: number; nights: number } {
  const nights = differenceInCalendarDays(startOfLocalDay(toExclusive), startOfLocalDay(from));
  if (nights <= 0) return { subtotal: 0, discount: 0, total: 0, nights: 0 };

  let subtotal = 0;
  const cur = new Date(startOfLocalDay(from));
  const end = startOfLocalDay(toExclusive);
  while (cur < end) {
    subtotal += nightlyRateForDate(cur, pkg, config);
    cur.setDate(cur.getDate() + 1);
  }

  let discount = 0;
  if (nights >= config.longStayMinNights && config.longStayDiscountPercent > 0) {
    discount = Math.round(subtotal * (config.longStayDiscountPercent / 100) * 100) / 100;
  }

  return {
    subtotal,
    discount,
    total: Math.round((subtotal - discount) * 100) / 100,
    nights,
  };
}

export const DEFAULT_BOOKING_PRICING: BookingPricingConfig = {
  longStayDiscountPercent: 7,
  longStayMinNights: 8,
  weekendDays: [5, 6, 0],
  fallbackRates: {
    A: { weekday: 850, weekend: 850 },
    B: { weekday: 450, weekend: 450 },
    C: { weekday: 1200, weekend: 1200 },
  },
  seasons: [],
};
