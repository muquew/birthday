import { Lunar, LunarYear } from "lunar-javascript";
import {
  daysInGregorianMonth,
  diffDays,
  formatDate,
  isLeapYear
} from "./date.js";
import type {
  BirthdayOccurrence,
  BirthdayRecord,
  BirthdayView,
  LocalDate
} from "./types.js";

const LUNAR_MONTHS = [
  "正月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "冬月",
  "腊月"
];

const LUNAR_DAY_PREFIX = ["初", "十", "廿", "三"];
const LUNAR_DAY_NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export function makeBirthdayView(
  record: BirthdayRecord,
  today: LocalDate
): BirthdayView {
  const occurrence = findNextOccurrence(record, today);
  const age =
    record.displayAge && record.year && occurrence
      ? Math.max(0, occurrence.sourceYear - record.year)
      : undefined;

  const originalDateText = formatOriginalBirthday(record);
  const occurrenceDateText = occurrence
    ? formatDate(occurrence.date)
    : "暂无下次日期";

  return {
    ...record,
    calendarLabel: record.calendarType === "lunar" ? "农历" : "公历",
    originalDateText,
    occurrenceDateText,
    occurrence,
    age
  };
}

export function findNextOccurrence(
  record: BirthdayRecord,
  today: LocalDate,
  searchYears = 20
): BirthdayOccurrence | undefined {
  const startOffset = record.calendarType === "lunar" ? -1 : 0;
  for (let offset = startOffset; offset <= searchYears; offset += 1) {
    const sourceYear = today.year + offset;
    const date = occurrenceForYear(record, sourceYear);
    if (!date) {
      continue;
    }

    const daysUntil = diffDays(today, date);
    if (daysUntil >= 0) {
      return {
        date,
        sourceYear,
        daysUntil,
        skippedYears: Math.max(0, offset),
        observed: isObservedDate(record, date, sourceYear),
        note: occurrenceNote(record, date, sourceYear)
      };
    }
  }
  return undefined;
}

export function occurrenceForYear(
  record: BirthdayRecord,
  sourceYear: number
): LocalDate | undefined {
  if (record.calendarType === "gregorian") {
    return gregorianOccurrenceForYear(record, sourceYear);
  }
  return lunarOccurrenceForYear(record, sourceYear);
}

export function formatOriginalBirthday(record: BirthdayRecord): string {
  const year = record.year ? `${record.year}年` : "";
  if (record.calendarType === "gregorian") {
    return `${year}${record.month}月${record.day}日`;
  }

  const leap = record.isLeapMonth ? "闰" : "";
  return `${year}${leap}${lunarMonthName(record.month)}${lunarDayName(
    record.day
  )}`;
}

export function formatLunarDate(date: LocalDate): string {
  const lunar = Lunar.fromDate(new Date(date.year, date.month - 1, date.day));
  return `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
}

export function sortBirthdayViews(views: BirthdayView[]): BirthdayView[] {
  return [...views].sort((a, b) => {
    const da = a.occurrence?.daysUntil ?? Number.MAX_SAFE_INTEGER;
    const db = b.occurrence?.daysUntil ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) {
      return da - db;
    }
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

function gregorianOccurrenceForYear(
  record: BirthdayRecord,
  sourceYear: number
): LocalDate | undefined {
  if (record.month === 2 && record.day === 29 && !isLeapYear(sourceYear)) {
    return { year: sourceYear, month: 2, day: 28 };
  }

  const daysInMonth = daysInGregorianMonth(sourceYear, record.month);
  if (record.day < 1 || record.day > daysInMonth) {
    return undefined;
  }

  return { year: sourceYear, month: record.month, day: record.day };
}

function lunarOccurrenceForYear(
  record: BirthdayRecord,
  sourceYear: number
): LocalDate | undefined {
  const targetMonth =
    record.isLeapMonth && lunarLeapMonth(sourceYear) === record.month
      ? -record.month
      : record.month;

  if (
    record.isLeapMonth &&
    targetMonth > 0 &&
    record.leapMonthPolicy === "onlyLeapMonth"
  ) {
    return undefined;
  }

  try {
    const solar = Lunar.fromYmd(sourceYear, targetMonth, record.day).getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay()
    };
  } catch {
    return undefined;
  }
}

function isObservedDate(
  record: BirthdayRecord,
  date: LocalDate,
  sourceYear: number
): boolean {
  return (
    record.calendarType === "gregorian" &&
    record.month === 2 &&
    record.day === 29 &&
    !isLeapYear(sourceYear) &&
    date.month === 2 &&
    date.day === 28
  );
}

function occurrenceNote(
  record: BirthdayRecord,
  date: LocalDate,
  sourceYear: number
): string | undefined {
  if (isObservedDate(record, date, sourceYear)) {
    return "非闰年按 2 月 28 日展示";
  }
  if (
    record.calendarType === "lunar" &&
    record.isLeapMonth &&
    lunarLeapMonth(sourceYear) !== record.month &&
    record.leapMonthPolicy === "normalMonthIfNoLeap"
  ) {
    return "该年无对应闰月，按普通农历月展示";
  }
  return undefined;
}

function lunarLeapMonth(year: number): number {
  try {
    return LunarYear.fromYear(year).getLeapMonth();
  } catch {
    return 0;
  }
}

function lunarMonthName(month: number): string {
  return LUNAR_MONTHS[month - 1] ?? `${month}月`;
}

function lunarDayName(day: number): string {
  if (day === 10) {
    return "初十";
  }
  if (day === 20) {
    return "二十";
  }
  if (day === 30) {
    return "三十";
  }
  const prefix = LUNAR_DAY_PREFIX[Math.floor(day / 10)] ?? "";
  const number = LUNAR_DAY_NUM[day % 10] ?? String(day);
  return `${prefix}${number}`;
}

export function birthdayIdentity(record: Pick<BirthdayRecord, "name" | "calendarType" | "month" | "day" | "isLeapMonth">): string {
  return [
    record.name.trim().replace(/\s+/g, "").toLowerCase(),
    record.calendarType,
    record.isLeapMonth ? "leap" : "normal",
    record.month,
    record.day
  ].join("|");
}
