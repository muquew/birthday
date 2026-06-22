export const BASE_PATH = "/xingxing";
export const API_BASE = `${BASE_PATH}/api`;

export type CalendarType = "gregorian" | "lunar";
export type LeapMonthPolicy = "onlyLeapMonth" | "normalMonthIfNoLeap";

export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export type BirthdayRecord = {
  id: string;
  name: string;
  calendarType: CalendarType;
  year?: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  leapMonthPolicy?: LeapMonthPolicy;
  displayAge: boolean;
  group?: string;
  tags: string[];
  note?: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
};

export type BirthdayInput = {
  name: string;
  calendarType: CalendarType;
  year?: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  leapMonthPolicy?: LeapMonthPolicy;
  displayAge?: boolean;
  group?: string;
  tags?: string[];
  note?: string;
  visible?: boolean;
};

export type BirthdayWriteOptions = {
  allowDuplicate?: boolean;
};

export type BirthdayOccurrence = {
  date: LocalDate;
  sourceYear: number;
  daysUntil: number;
  skippedYears: number;
  observed: boolean;
  note?: string;
};

export type BirthdayView = BirthdayRecord & {
  calendarLabel: string;
  originalDateText: string;
  occurrenceDateText: string;
  occurrence?: BirthdayOccurrence;
  age?: number;
};

export type DataAuditIssue = {
  id: string;
  kind:
    | "exactDuplicate"
    | "sameName"
    | "sameDate"
    | "leapMonth"
    | "gregorianLeapDay"
    | "displayAgeMissingYear"
    | "longName"
    | "manyTags"
    | "longNote"
    | "hidden"
    | "ungrouped";
  severity: "bad" | "warn" | "info";
  title: string;
  description: string;
  count: number;
  birthdays: BirthdayView[];
};

export type DataAuditReport = {
  generatedAt: string;
  totalRecords: number;
  issueCount: number;
  attentionCount: number;
  issues: DataAuditIssue[];
};

export type ImportPreviewRow = {
  rowNumber: number;
  input: Partial<BirthdayInput> & Record<string, unknown>;
  errors: string[];
  duplicateCandidate?: BirthdayRecord;
  duplicateInImportRow?: number;
  skipped?: boolean;
};

export type ImportPreview = {
  validCount: number;
  invalidCount: number;
  importableCount: number;
  skippedCount: number;
  duplicateExistingCount: number;
  duplicateInImportCount: number;
  rows: ImportPreviewRow[];
};

export type ImportOptions = {
  skipDuplicates?: boolean;
};

export type SiteSettings = {
  siteName: string;
  correctionContact: string;
  defaultUpcomingDays: number;
  birthdayGreetingTemplates: string[];
};

export type JsonImportMode = "append" | "replace";

export type AdminOperationLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  actorId?: string;
  actorName?: string;
  detail?: string;
  createdAt: string;
};
