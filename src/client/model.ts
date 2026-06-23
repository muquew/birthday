import type { CalendarType, BirthdayView } from "../shared/types.js";
import type { PublicBirthday } from "./api.js";

export type RangeFilter = "all" | "today" | "7" | "30" | "90";
export type AdminListView = "records" | "groups" | "tags";
export type PublicBirthdayViewMode = "list" | "calendar";
export type AdminBatchRequest =
  | {
      action: "show" | "hide" | "delete" | "clearGroup" | "clearTags";
    }
  | {
      action: "setGroup";
      group: string;
    }
  | {
      action: "addTags" | "removeTags";
      tags: string[];
    };
export type BatchTagMode = "add" | "remove";
export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export type AdminBirthdaySummary = {
  total: number;
  hidden: number;
  lunarAttention: number;
  duplicateKeyCount: number;
  duplicateRecordCount: number;
};

export type BirthdayCalendarCell = {
  key: string;
  day?: number;
  isToday?: boolean;
  birthdays: PublicBirthday[];
};

export type BirthdayCalendarMonth = {
  year: number;
  month: number;
  count: number;
  cells: BirthdayCalendarCell[];
};

export type FacetRow = {
  name: string;
  count: number;
  visible: number;
  hidden: number;
  upcoming30: number;
  examples: string[];
};

export type DuplicateFormInfo = {
  sameName: BirthdayView[];
  exact: BirthdayView[];
};

export type BirthdayFormState = {
  name: string;
  calendarType: CalendarType;
  year: string;
  month: string;
  day: string;
  isLeapMonth: boolean;
  leapMonthPolicy: "onlyLeapMonth" | "normalMonthIfNoLeap";
  displayAge: boolean;
  group: string;
  tags: string;
  note: string;
  visible: boolean;
};

export const DIPPER_POINTS = [
  { x: 128, y: 20 },
  { x: 132, y: 52 },
  { x: 100, y: 68 },
  { x: 88, y: 42 },
  { x: 64, y: 48 },
  { x: 40, y: 54 },
  { x: 20, y: 76 }
] as const;
export const DIPPER_LINES = [
  [6, 5],
  [5, 4],
  [4, 3],
  [3, 2],
  [2, 1],
  [1, 0]
] as const;

export const emptyForm: BirthdayFormState = {
  name: "",
  calendarType: "gregorian",
  year: "",
  month: "1",
  day: "1",
  isLeapMonth: false,
  leapMonthPolicy: "normalMonthIfNoLeap",
  displayAge: false,
  group: "",
  tags: "",
  note: "",
  visible: true
};
