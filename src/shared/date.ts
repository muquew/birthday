import type { LocalDate } from "./types.js";

const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export function getSiteTimeZone(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return env?.SITE_TIME_ZONE || env?.TZ || DEFAULT_TIME_ZONE;
}

export function todayInTimeZone(timeZone = getSiteTimeZone()): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const get = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Unable to resolve ${type} from current date`);
    }
    return Number(value);
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day")
  };
}

export function dateKey(date: LocalDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

export function formatDate(date: LocalDate): string {
  return `${date.year}年${date.month}月${date.day}日`;
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return dateToUtcDay(a) - dateToUtcDay(b);
}

export function diffDays(from: LocalDate, to: LocalDate): number {
  return dateToUtcDay(to) - dateToUtcDay(from);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  };
}

export function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

export function daysInGregorianMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    return 0;
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidGregorianDate(
  year: number,
  month: number,
  day: number
): boolean {
  return day >= 1 && day <= daysInGregorianMonth(year, month);
}

function dateToUtcDay(date: LocalDate): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86400000);
}
