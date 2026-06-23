import type { BirthdayView } from "../shared/types.js";
import type { AdminBirthdaySummary } from "./model.js";

export function summarizeAdminBirthdays(records: BirthdayView[]): AdminBirthdaySummary {
  const duplicateKeys = duplicateKeySet(records);
  return {
    total: records.length,
    hidden: records.filter((item) => !item.visible).length,
    lunarAttention: records.filter((item) => item.calendarType === "lunar" && item.isLeapMonth)
      .length,
    duplicateKeyCount: duplicateKeys.size,
    duplicateRecordCount: records.filter((item) => duplicateKeys.has(birthdayDuplicateKey(item)))
      .length
  };
}

export function duplicateKeySet(records: BirthdayView[]): Set<string> {
  const counts = new Map<string, number>();
  for (const item of records) {
    const key = birthdayDuplicateKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );
}

export function birthdayDuplicateKey(
  item: Pick<BirthdayView, "name" | "calendarType" | "isLeapMonth" | "month" | "day">
): string {
  return [
    normalizedPersonName(item.name),
    item.calendarType,
    item.isLeapMonth ? "leap" : "normal",
    item.month,
    item.day
  ].join("|");
}

export function normalizedPersonName(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}
