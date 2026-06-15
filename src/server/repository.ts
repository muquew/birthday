import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type {
  AdminOperationLog,
  BirthdayInput,
  BirthdayRecord
} from "../shared/types.js";
import { birthdayIdentity } from "../shared/birthday.js";
import { birthdayInputSchema, birthdayUpdateSchema } from "../shared/validation.js";
import { getDb } from "./db.js";
import type { AdminUser } from "./auth.js";

type BirthdayRow = {
  id: string;
  name: string;
  calendar_type: "gregorian" | "lunar";
  year: number | null;
  month: number;
  day: number;
  is_leap_month: 0 | 1;
  leap_month_policy: "onlyLeapMonth" | "normalMonthIfNoLeap" | null;
  display_age: 0 | 1;
  person_group: string | null;
  tags_json: string;
  note: string | null;
  visible: 0 | 1;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

type OperationLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  actor_id: string | null;
  actor_name: string | null;
  detail: string | null;
  created_at: string;
};

type OperationLogInput = {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  actor?: AdminUser;
  detail?: unknown;
};

type WriteOptions = {
  log?: boolean;
  allowDuplicate?: boolean;
  skipDuplicates?: boolean;
};

export class DuplicateBirthdayError extends Error {
  duplicate: BirthdayRecord;

  constructor(duplicate: BirthdayRecord, message = "已存在同名同日期生日记录") {
    super(message);
    this.name = "DuplicateBirthdayError";
    this.duplicate = duplicate;
  }
}

export function listBirthdays(includeHidden = true): BirthdayRecord[] {
  const sql = includeHidden
    ? "SELECT * FROM birthday_people ORDER BY name COLLATE NOCASE"
    : "SELECT * FROM birthday_people WHERE visible = 1 ORDER BY name COLLATE NOCASE";
  return (getDb().prepare(sql).all() as BirthdayRow[]).map(rowToRecord);
}

export function getBirthday(id: string): BirthdayRecord | undefined {
  const row = getDb()
    .prepare("SELECT * FROM birthday_people WHERE id = ?")
    .get(id) as BirthdayRow | undefined;
  return row ? rowToRecord(row) : undefined;
}

export function createBirthday(
  input: BirthdayInput,
  actor?: AdminUser,
  options: WriteOptions = {}
): BirthdayRecord {
  const parsed = birthdayInputSchema.parse(input);
  assertDuplicatePolicy(parsed, options);
  const id = randomUUID();
  insertParsed(getDb(), parsed, actor?.username, id);

  const record = getBirthday(id)!;
  if (options.log !== false) {
    recordOperationLog({
      action: "create_birthday",
      entityType: "birthday",
      entityId: record.id,
      entityName: record.name,
      actor,
      detail: { calendarType: record.calendarType, month: record.month, day: record.day }
    });
  }
  return record;
}

export function updateBirthday(
  id: string,
  input: Partial<BirthdayInput>,
  actor?: AdminUser,
  options: WriteOptions = {}
): BirthdayRecord | undefined {
  const existing = getBirthday(id);
  if (!existing) {
    return undefined;
  }

  const merged = birthdayUpdateSchema.parse({ ...existing, ...input });
  assertDuplicatePolicy(merged, options, id);
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `UPDATE birthday_people SET
        name = ?,
        calendar_type = ?,
        year = ?,
        month = ?,
        day = ?,
        is_leap_month = ?,
        leap_month_policy = ?,
        display_age = ?,
        person_group = ?,
        tags_json = ?,
        note = ?,
        visible = ?,
        updated_at = ?,
        updated_by = ?
       WHERE id = ?`
    )
    .run(
      merged.name ?? existing.name,
      merged.calendarType ?? existing.calendarType,
      merged.year ?? null,
      merged.month ?? existing.month,
      merged.day ?? existing.day,
      merged.isLeapMonth ? 1 : 0,
      merged.isLeapMonth ? merged.leapMonthPolicy ?? null : null,
      merged.displayAge ? 1 : 0,
      merged.group ?? null,
      JSON.stringify(merged.tags ?? []),
      merged.note ?? null,
      merged.visible ? 1 : 0,
      now,
      actor?.username ?? null,
      id
    );

  const record = getBirthday(id);
  if (record) {
    recordOperationLog({
      action: "update_birthday",
      entityType: "birthday",
      entityId: record.id,
      entityName: record.name,
      actor,
      detail: { previousName: existing.name }
    });
  }
  return record;
}

export function deleteBirthday(id: string, actor?: AdminUser): boolean {
  const existing = getBirthday(id);
  if (!existing) {
    return false;
  }
  const result = getDb()
    .prepare("DELETE FROM birthday_people WHERE id = ?")
    .run(id);
  if (result.changes > 0) {
    recordOperationLog({
      action: "delete_birthday",
      entityType: "birthday",
      entityId: existing.id,
      entityName: existing.name,
      actor,
      detail: { calendarType: existing.calendarType, month: existing.month, day: existing.day }
    });
  }
  return result.changes > 0;
}

export function setBirthdayVisibility(
  id: string,
  visible: boolean,
  actor?: AdminUser
): BirthdayRecord | undefined {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare(
      "UPDATE birthday_people SET visible = ?, updated_at = ?, updated_by = ? WHERE id = ?"
    )
    .run(visible ? 1 : 0, now, actor?.username ?? null, id);

  if (result.changes === 0) {
    return undefined;
  }
  const record = getBirthday(id);
  if (record) {
    recordOperationLog({
      action: visible ? "show_birthday" : "hide_birthday",
      entityType: "birthday",
      entityId: record.id,
      entityName: record.name,
      actor
    });
  }
  return record;
}

export function batchSetBirthdayVisibility(
  ids: string[],
  visible: boolean,
  actor?: AdminUser
): BirthdayRecord[] {
  const records = existingBirthdaysForIds(ids);
  if (records.length === 0) {
    return [];
  }

  const db = getDb();
  const now = new Date().toISOString();
  const statement = db.prepare(
    "UPDATE birthday_people SET visible = ?, updated_at = ?, updated_by = ? WHERE id = ?"
  );
  db.exec("BEGIN");
  try {
    for (const record of records) {
      statement.run(visible ? 1 : 0, now, actor?.username ?? null, record.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  recordOperationLog({
    action: visible ? "batch_show_birthday" : "batch_hide_birthday",
    entityType: "birthday_batch",
    actor,
    detail: {
      count: records.length,
      names: records.slice(0, 8).map((record) => record.name)
    }
  });

  return records
    .map((record) => getBirthday(record.id))
    .filter((record): record is BirthdayRecord => Boolean(record));
}

export function batchDeleteBirthdays(
  ids: string[],
  actor?: AdminUser
): BirthdayRecord[] {
  const records = existingBirthdaysForIds(ids);
  if (records.length === 0) {
    return [];
  }

  const db = getDb();
  const statement = db.prepare("DELETE FROM birthday_people WHERE id = ?");
  db.exec("BEGIN");
  try {
    for (const record of records) {
      statement.run(record.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  recordOperationLog({
    action: "batch_delete_birthday",
    entityType: "birthday_batch",
    actor,
    detail: {
      count: records.length,
      names: records.slice(0, 8).map((record) => record.name)
    }
  });

  return records;
}

export function appendBirthdays(
  inputs: BirthdayInput[],
  actor?: AdminUser,
  options: WriteOptions = {}
): BirthdayRecord[] {
  const parsed = inputs.map((input) => birthdayInputSchema.parse(input));
  const importable = filterImportableBirthdays(parsed, options);
  const ids = importable.map(() => randomUUID());
  const db = getDb();
  db.exec("BEGIN");
  try {
    importable.forEach((input, index) => {
      insertParsed(db, input, actor?.username, ids[index]);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return ids
    .map((id) => getBirthday(id))
    .filter((record): record is BirthdayRecord => Boolean(record));
}

export function replaceAllBirthdays(
  inputs: BirthdayInput[],
  actor?: AdminUser,
  options: WriteOptions = {}
): BirthdayRecord[] {
  const parsed = inputs.map((input) => birthdayInputSchema.parse(input));
  const importable = filterImportableBirthdays(parsed, { ...options, replaceAll: true });
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM birthday_people");
    for (const input of importable) {
      insertParsed(db, input, actor?.username);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (options.log !== false) {
    recordOperationLog({
      action: "replace_birthdays",
      entityType: "birthday_batch",
      actor,
      detail: { count: importable.length }
    });
  }
  return listBirthdays(true);
}

export function listOperationLogs(limit = 80): AdminOperationLog[] {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(200, Math.max(1, Math.trunc(limit)))
    : 80;
  const rows = getDb()
    .prepare("SELECT * FROM admin_operation_logs ORDER BY created_at DESC LIMIT ?")
    .all(safeLimit) as OperationLogRow[];
  return rows.map(rowToOperationLog);
}

export function recordOperationLog(input: OperationLogInput): AdminOperationLog {
  const id = randomUUID();
  const now = new Date().toISOString();
  const detail = serializeLogDetail(input.detail);
  getDb()
    .prepare(
      `INSERT INTO admin_operation_logs (
        id, action, entity_type, entity_id, entity_name,
        actor_id, actor_name, detail, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.entityName ?? null,
      input.actor?.id ?? null,
      input.actor?.username ?? null,
      detail ?? null,
      now
    );
  return {
    id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    actorId: input.actor?.id,
    actorName: input.actor?.username,
    detail,
    createdAt: now
  };
}

function insertParsed(
  db: DatabaseSync,
  parsed: BirthdayInput,
  updatedBy?: string,
  id = randomUUID()
) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO birthday_people (
      id, name, calendar_type, year, month, day, is_leap_month,
      leap_month_policy, display_age, person_group, tags_json, note,
      visible, created_at, updated_at, updated_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parsed.name,
    parsed.calendarType,
    parsed.year ?? null,
    parsed.month,
    parsed.day,
    parsed.isLeapMonth ? 1 : 0,
    parsed.isLeapMonth ? parsed.leapMonthPolicy ?? null : null,
    parsed.displayAge ? 1 : 0,
    parsed.group ?? null,
    JSON.stringify(parsed.tags ?? []),
    parsed.note ?? null,
    parsed.visible === false ? 0 : 1,
    now,
    now,
    updatedBy ?? null
  );
}

function assertDuplicatePolicy(
  parsed: BirthdayInput,
  options: WriteOptions,
  ignoreId?: string
) {
  const duplicate = findDuplicateBirthday(parsed, ignoreId);
  if (!duplicate) {
    return;
  }
  if (options.allowDuplicate && hasDistinguishingInfo(parsed)) {
    return;
  }
  if (options.allowDuplicate) {
    throw new DuplicateBirthdayError(
      duplicate,
      "同名同日期记录需要填写分组、标签或备注后才能保留"
    );
  }
  throw new DuplicateBirthdayError(duplicate);
}

function filterImportableBirthdays(
  parsed: BirthdayInput[],
  options: WriteOptions & { replaceAll?: boolean }
): BirthdayInput[] {
  const existing = options.replaceAll ? [] : listBirthdays(true);
  const seen = new Map<string, BirthdayRecord | true>();
  for (const record of existing) {
    seen.set(birthdayIdentity(record), record);
  }

  const importable: BirthdayInput[] = [];
  for (const input of parsed) {
    const identity = birthdayIdentityForInput(input);
    const duplicate = seen.get(identity);
    if (duplicate) {
      if (options.skipDuplicates) {
        continue;
      }
      throw new DuplicateBirthdayError(
        duplicate === true ? materializeInputDuplicate(input) : duplicate
      );
    }
    seen.set(identity, true);
    importable.push(input);
  }
  return importable;
}

function findDuplicateBirthday(input: BirthdayInput, ignoreId?: string): BirthdayRecord | undefined {
  const identity = birthdayIdentityForInput(input);
  return listBirthdays(true).find((record) => record.id !== ignoreId && birthdayIdentity(record) === identity);
}

function birthdayIdentityForInput(input: BirthdayInput): string {
  return birthdayIdentity({
    ...input,
    isLeapMonth: input.isLeapMonth ?? false
  });
}

function hasDistinguishingInfo(input: BirthdayInput): boolean {
  return Boolean(
    input.group?.trim() ||
      input.note?.trim() ||
      (input.tags ?? []).some((tag) => tag.trim())
  );
}

function materializeInputDuplicate(input: BirthdayInput): BirthdayRecord {
  const now = new Date().toISOString();
  return {
    id: "import-duplicate",
    name: input.name,
    calendarType: input.calendarType,
    year: input.year,
    month: input.month,
    day: input.day,
    isLeapMonth: input.isLeapMonth ?? false,
    leapMonthPolicy: input.leapMonthPolicy,
    displayAge: input.displayAge ?? false,
    group: input.group,
    tags: input.tags ?? [],
    note: input.note,
    visible: input.visible ?? true,
    createdAt: now,
    updatedAt: now
  };
}

function existingBirthdaysForIds(ids: string[]): BirthdayRecord[] {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  return uniqueIds
    .map((id) => getBirthday(id))
    .filter((record): record is BirthdayRecord => Boolean(record));
}

function rowToRecord(row: BirthdayRow): BirthdayRecord {
  return {
    id: row.id,
    name: row.name,
    calendarType: row.calendar_type,
    year: row.year ?? undefined,
    month: row.month,
    day: row.day,
    isLeapMonth: row.is_leap_month === 1,
    leapMonthPolicy: row.leap_month_policy ?? undefined,
    displayAge: row.display_age === 1,
    group: row.person_group ?? undefined,
    tags: parseTags(row.tags_json),
    note: row.note ?? undefined,
    visible: row.visible === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined
  };
}

function rowToOperationLog(row: OperationLogRow): AdminOperationLog {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    entityName: row.entity_name ?? undefined,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    detail: row.detail ?? undefined,
    createdAt: row.created_at
  };
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function serializeLogDetail(detail: unknown): string | undefined {
  if (detail === undefined) {
    return undefined;
  }
  if (typeof detail === "string") {
    return detail;
  }
  return JSON.stringify(detail);
}
