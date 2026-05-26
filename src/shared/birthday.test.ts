import { describe, expect, it } from "vitest";
import { findNextOccurrence, occurrenceForYear } from "./birthday.js";
import type { BirthdayRecord, LocalDate } from "./types.js";

const baseRecord = {
  id: "test",
  name: "测试",
  year: undefined,
  displayAge: false,
  group: undefined,
  tags: [],
  note: undefined,
  visible: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("birthday occurrence calculation", () => {
  it("calculates the next Gregorian birthday in the same year", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "gregorian",
      month: 8,
      day: 12,
      isLeapMonth: false
    };
    const occurrence = findNextOccurrence(record, date(2026, 5, 24));
    expect(occurrence?.date).toEqual(date(2026, 8, 12));
    expect(occurrence?.daysUntil).toBe(80);
  });

  it("rolls Gregorian birthdays to the next year after they pass", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "gregorian",
      month: 1,
      day: 2,
      isLeapMonth: false
    };
    const occurrence = findNextOccurrence(record, date(2026, 5, 24));
    expect(occurrence?.date).toEqual(date(2027, 1, 2));
  });

  it("observes February 29 on February 28 in non-leap years", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "gregorian",
      month: 2,
      day: 29,
      isLeapMonth: false
    };
    const occurrence = occurrenceForYear(record, 2026);
    expect(occurrence).toEqual(date(2026, 2, 28));
  });

  it("converts a normal lunar date to this-year Gregorian date", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "lunar",
      month: 4,
      day: 8,
      isLeapMonth: false
    };
    expect(occurrenceForYear(record, 2026)).toEqual(date(2026, 5, 24));
  });

  it("finds lunar birthdays that fall early in the Gregorian year", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "lunar",
      month: 12,
      day: 1,
      isLeapMonth: false
    };
    const occurrence = findNextOccurrence(record, date(2026, 1, 1));
    expect(occurrence?.sourceYear).toBe(2025);
    expect(occurrence?.date).toEqual(date(2026, 1, 19));
    expect(occurrence?.daysUntil).toBe(18);
    expect(occurrence?.skippedYears).toBe(0);
  });

  it("uses normal lunar month when leap month is absent and policy allows it", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "lunar",
      month: 6,
      day: 1,
      isLeapMonth: true,
      leapMonthPolicy: "normalMonthIfNoLeap"
    };
    const occurrence = occurrenceForYear(record, 2026);
    expect(occurrence).toEqual(date(2026, 7, 14));
  });

  it("skips years without the target leap month when policy requires leap month", () => {
    const record: BirthdayRecord = {
      ...baseRecord,
      calendarType: "lunar",
      month: 6,
      day: 1,
      isLeapMonth: true,
      leapMonthPolicy: "onlyLeapMonth"
    };
    const occurrence = findNextOccurrence(record, date(2026, 1, 1));
    expect(occurrence?.sourceYear).toBe(2036);
    expect(occurrence?.date).toEqual(date(2036, 7, 23));
  });
});

function date(year: number, month: number, day: number): LocalDate {
  return { year, month, day };
}
