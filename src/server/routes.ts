import express from "express";
import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";
import { Solar } from "lunar-javascript";
import { z, ZodError } from "zod";
import { login, logout, getCurrentAdmin, requireAdmin } from "./auth.js";
import {
  batchDeleteBirthdays,
  batchSetBirthdayVisibility,
  appendBirthdays,
  createBirthday,
  deleteBirthday,
  getBirthday,
  listOperationLogs,
  listBirthdays,
  recordOperationLog,
  replaceAllBirthdays,
  setBirthdayVisibility,
  updateBirthday
} from "./repository.js";
import { getSiteSettings, updateSiteSettings } from "./settings.js";
import {
  birthdayIdentity,
  formatOriginalBirthday,
  makeBirthdayView,
  sortBirthdayViews
} from "../shared/birthday.js";
import { todayInTimeZone } from "../shared/date.js";
import type {
  BirthdayInput,
  BirthdayRecord,
  BirthdayView,
  ImportPreview,
  ImportPreviewRow,
  JsonImportMode,
  SiteSettings
} from "../shared/types.js";
import { birthdayInputSchema, loginSchema, siteSettingsSchema } from "../shared/validation.js";

export function createApiRouter() {
  const router = express.Router();

  router.use("/auth", createAuthRouter());
  router.use("/public", createPublicRouter());
  router.use("/admin", requireAdmin, createAdminRouter());

  router.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "数据校验失败",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }
    if (error instanceof Error && error.message.includes("登录尝试过多")) {
      res.status(429).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "服务器内部错误" });
  });

  return router;
}

function createAuthRouter() {
  const router = express.Router();

  router.post("/login", (req, res, next) => {
    try {
      const parsed = loginSchema.parse(req.body);
      const result = login(parsed.username, parsed.password, req.ip ?? "unknown");
      if (!result) {
        res.status(401).json({ error: "用户名或密码错误" });
        return;
      }
      res.setHeader("Set-Cookie", result.cookie);
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res) => {
    res.setHeader("Set-Cookie", logout(req));
    res.json({ ok: true });
  });

  router.get("/me", (req, res) => {
    const user = getCurrentAdmin(req);
    if (!user) {
      res.json({ user: null });
      return;
    }
    res.json({ user });
  });

  return router;
}

function createPublicRouter() {
  const router = express.Router();

  router.get("/today", (_req, res) => {
    res.json({ today: makeTodayInfo() });
  });

  router.get("/birthdays", (_req, res) => {
    res.json({ birthdays: publicViews() });
  });

  router.get("/birthdays/today", (_req, res) => {
    const birthdays = publicViews().filter((view) => view.occurrence?.daysUntil === 0);
    res.json({ birthdays });
  });

  router.get("/birthdays/upcoming", (req, res) => {
    const settings = getSiteSettings();
    const days = clampNumber(Number(req.query.days ?? settings.defaultUpcomingDays), 1, 366);
    const birthdays = publicViews().filter((view) => {
      const daysUntil = view.occurrence?.daysUntil;
      return typeof daysUntil === "number" && daysUntil >= 0 && daysUntil <= days;
    });
    res.json({ birthdays, days });
  });

  router.get("/settings", (_req, res) => {
    res.json({
      basePath: "/xingxing",
      ...getSiteSettings()
    });
  });

  return router;
}

function createAdminRouter() {
  const router = express.Router();

  router.get("/birthdays", (_req, res) => {
    res.json({ birthdays: adminViews() });
  });

  router.post("/birthdays/preview", (req, res, next) => {
    try {
      const parsed = birthdayInputSchema.parse(req.body);
      const previewRecord: BirthdayRecord = {
        id: "preview",
        ...parsed,
        isLeapMonth: parsed.isLeapMonth ?? false,
        displayAge: parsed.displayAge ?? false,
        tags: parsed.tags ?? [],
        visible: parsed.visible ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.adminUser?.username
      };
      res.json({ birthday: adminView(previewRecord) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/birthdays", (req, res, next) => {
    try {
      const birthday = createBirthday(req.body, req.adminUser);
      res.status(201).json({ birthday: adminView(birthday) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/birthdays/:id", (req, res) => {
    const birthday = getBirthday(req.params.id);
    if (!birthday) {
      res.status(404).json({ error: "记录不存在" });
      return;
    }
    res.json({ birthday: adminView(birthday) });
  });

  router.put("/birthdays/:id", (req, res, next) => {
    try {
      const birthday = updateBirthday(req.params.id, req.body, req.adminUser);
      if (!birthday) {
        res.status(404).json({ error: "记录不存在" });
        return;
      }
      res.json({ birthday: adminView(birthday) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/birthdays/:id", (req, res) => {
    const deleted = deleteBirthday(req.params.id, req.adminUser);
    if (!deleted) {
      res.status(404).json({ error: "记录不存在" });
      return;
    }
    res.json({ ok: true });
  });

  router.post("/birthdays/:id/visibility", (req, res, next) => {
    try {
      const parsed = z.object({ visible: z.boolean() }).parse(req.body);
      const birthday = setBirthdayVisibility(req.params.id, parsed.visible, req.adminUser);
      if (!birthday) {
        res.status(404).json({ error: "记录不存在" });
        return;
      }
      res.json({ birthday: adminView(birthday) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/birthdays/batch", (req, res, next) => {
    try {
      const parsed = z
        .object({
          ids: z.array(z.string().min(1)).min(1).max(500),
          action: z.enum(["show", "hide", "delete"])
        })
        .parse(req.body);
      if (parsed.action === "delete") {
        const deleted = batchDeleteBirthdays(parsed.ids, req.adminUser);
        res.json({ birthdays: deleted.map(adminView), count: deleted.length });
        return;
      }
      const birthdays = batchSetBirthdayVisibility(
        parsed.ids,
        parsed.action === "show",
        req.adminUser
      );
      res.json({ birthdays: birthdays.map(adminView), count: birthdays.length });
    } catch (error) {
      next(error);
    }
  });

  router.post("/import/csv", (req, res, next) => {
    try {
      const csv = String(req.body.csv ?? "");
      const dryRun = req.body.dryRun !== false;
      const preview = previewCsvImport(csv);
      if (dryRun) {
        res.json({ preview });
        return;
      }
      if (preview.invalidCount > 0) {
        res.status(400).json({ error: "CSV 存在错误，未导入", preview });
        return;
      }
      const inputs = preview.rows.map((row) => birthdayInputSchema.parse(row.input));
      const created = appendBirthdays(inputs, req.adminUser);
      recordOperationLog({
        action: "import_csv_birthdays",
        entityType: "birthday_batch",
        actor: req.adminUser,
        detail: { count: created.length }
      });
      res.status(201).json({ created: created.map(adminView), preview });
    } catch (error) {
      next(error);
    }
  });

  router.post("/import/json", (req, res, next) => {
    try {
      const json = String(req.body.json ?? "");
      const dryRun = req.body.dryRun !== false;
      const mode = parseJsonImportMode(req.body.mode);
      const preview = previewJsonImport(json, mode);
      if (dryRun) {
        res.json({ preview, mode });
        return;
      }
      if (preview.invalidCount > 0) {
        res.status(400).json({ error: "JSON 存在错误，未导入", preview, mode });
        return;
      }
      const inputs = preview.rows.map((row) => birthdayInputSchema.parse(row.input));
      const records =
        mode === "replace"
          ? replaceAllBirthdays(inputs, req.adminUser, { log: false })
          : appendBirthdays(inputs, req.adminUser);
      recordOperationLog({
        action: mode === "replace" ? "import_json_replace" : "import_json_append",
        entityType: "birthday_batch",
        actor: req.adminUser,
        detail: { count: records.length }
      });
      res.status(201).json({ created: records.map(adminView), preview, mode });
    } catch (error) {
      next(error);
    }
  });

  router.get("/export.csv", (_req, res) => {
    const records = listBirthdays(true);
    const csv = stringifyCsv(records.map(recordToCsvRow), { header: true });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"birthdays.csv\"");
    res.send(csv);
  });

  router.get("/export.json", (_req, res) => {
    res.setHeader("Content-Disposition", "attachment; filename=\"birthdays.json\"");
    res.json({ birthdays: listBirthdays(true) });
  });

  router.get("/settings", (_req, res) => {
    res.json({ settings: getSiteSettings() });
  });

  router.put("/settings", (req, res, next) => {
    try {
      const parsed = siteSettingsSchema.parse(req.body);
      const previous = getSiteSettings();
      const settings = updateSiteSettings(parsed);
      recordOperationLog({
        action: "update_settings",
        entityType: "site_settings",
        actor: req.adminUser,
        detail: siteSettingsChangeDetail(previous, settings)
      });
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  router.get("/operation-logs", (req, res) => {
    const limit = clampNumber(Number(req.query.limit ?? 80), 1, 200);
    res.json({ logs: listOperationLogs(limit) });
  });

  return router;
}

function publicViews() {
  const today = todayInTimeZone();
  return sortBirthdayViews(
    listBirthdays(false).map((record) => makeBirthdayView(record, today))
  ).map(toPublicView);
}

function makeTodayInfo() {
  const today = todayInTimeZone();
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const lunar = Solar.fromYmd(today.year, today.month, today.day).getLunar();
  return {
    solarText: `${today.year}年${today.month}月${today.day}日`,
    weekday: new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC",
      weekday: "long"
    }).format(date),
    lunarText: `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  };
}

function adminViews() {
  const today = todayInTimeZone();
  return sortBirthdayViews(
    listBirthdays(true).map((record) => makeBirthdayView(record, today))
  );
}

function adminView(record: BirthdayRecord) {
  return makeBirthdayView(record, todayInTimeZone());
}

function toPublicView(view: BirthdayView) {
  const {
    visible: _visible,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    searchableText: _searchableText,
    year,
    ...publicView
  } = view;
  const originalDateText = formatOriginalBirthday({ ...view, year: undefined });
  if (view.displayAge && year) {
    return { ...publicView, year, originalDateText };
  }
  return {
    ...publicView,
    originalDateText
  };
}

function previewCsvImport(csv: string): ImportPreview {
  const existing = listBirthdays(true);
  const duplicateMap = new Map(existing.map((record) => [birthdayIdentity(record), record]));

  if (!csv.trim()) {
    return {
      validCount: 0,
      invalidCount: 1,
      duplicateExistingCount: 0,
      duplicateInImportCount: 0,
      rows: [
        {
          rowNumber: 1,
          input: {},
          errors: ["CSV 内容为空"]
        }
      ]
    };
  }

  let rows: Record<string, string>[];
  try {
    rows = parseCsv(csv, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];
  } catch {
    return invalidImportPreview("CSV 解析失败，请检查表头、逗号和引号是否完整");
  }

  if (rows.length === 0) {
    return invalidImportPreview("CSV 没有可导入的记录", 2);
  }

  const seenInImport = new Map<string, number>();
  const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
    const rowNumber = index + 2;
    const { input, errors: csvErrors } = csvRowToInput(row);
    const parsed = birthdayInputSchema.safeParse(input);
    const validationErrors = parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    const errors = [...csvErrors, ...validationErrors];
    const normalized = parsed.success ? parsed.data : input;
    const duplicateCandidate =
      parsed.success && errors.length === 0
        ? duplicateMap.get(birthdayIdentity(parsed.data))
        : undefined;
    let duplicateInImportRow: number | undefined;
    if (parsed.success && errors.length === 0) {
      const identity = birthdayIdentity(parsed.data);
      duplicateInImportRow = seenInImport.get(identity);
      if (!duplicateInImportRow) {
        seenInImport.set(identity, rowNumber);
      }
    }

    return {
      rowNumber,
      input: parsed.success ? parsed.data : normalized,
      errors,
      duplicateCandidate,
      duplicateInImportRow
    };
  });

  return buildImportPreview(previewRows);
}

function previewJsonImport(json: string, mode: JsonImportMode): ImportPreview {
  if (!json.trim()) {
    return {
      validCount: 0,
      invalidCount: 1,
      duplicateExistingCount: 0,
      duplicateInImportCount: 0,
      rows: [
        {
          rowNumber: 1,
          input: {},
          errors: ["JSON 内容为空"]
        }
      ]
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      validCount: 0,
      invalidCount: 1,
      duplicateExistingCount: 0,
      duplicateInImportCount: 0,
      rows: [
        {
          rowNumber: 1,
          input: {},
          errors: ["JSON 解析失败，请检查格式是否完整"]
        }
      ]
    };
  }

  const source = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed && "birthdays" in parsed
      ? (parsed as { birthdays?: unknown }).birthdays
      : undefined;

  if (!Array.isArray(source)) {
    return {
      validCount: 0,
      invalidCount: 1,
      duplicateExistingCount: 0,
      duplicateInImportCount: 0,
      rows: [
        {
          rowNumber: 1,
          input: {},
          errors: ["JSON 需要是数组，或包含 birthdays 数组"]
        }
      ]
    };
  }

  if (source.length === 0) {
    return invalidImportPreview("JSON 没有可导入的记录");
  }

  const duplicateMap =
    mode === "append"
      ? new Map(listBirthdays(true).map((record) => [birthdayIdentity(record), record]))
      : new Map<string, BirthdayRecord>();
  const seenInImport = new Map<string, number>();
  const previewRows = source.map((row, index): ImportPreviewRow => {
    const rowNumber = index + 1;
    const input =
      typeof row === "object" && row
        ? (row as Partial<BirthdayInput> & Record<string, unknown>)
        : {};
    const parsedRow = birthdayInputSchema.safeParse(input);
    const errors = parsedRow.success
      ? []
      : parsedRow.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    const duplicateCandidate =
      parsedRow.success && errors.length === 0
        ? duplicateMap.get(birthdayIdentity(parsedRow.data))
        : undefined;
    let duplicateInImportRow: number | undefined;
    if (parsedRow.success && errors.length === 0) {
      const identity = birthdayIdentity(parsedRow.data);
      duplicateInImportRow = seenInImport.get(identity);
      if (!duplicateInImportRow) {
        seenInImport.set(identity, rowNumber);
      }
    }
    return {
      rowNumber,
      input: parsedRow.success ? parsedRow.data : input,
      errors,
      duplicateCandidate,
      duplicateInImportRow
    };
  });

  return buildImportPreview(previewRows);
}

function buildImportPreview(rows: ImportPreviewRow[]): ImportPreview {
  return {
    validCount: rows.filter((row) => row.errors.length === 0).length,
    invalidCount: rows.filter((row) => row.errors.length > 0).length,
    duplicateExistingCount: rows.filter((row) => row.duplicateCandidate).length,
    duplicateInImportCount: rows.filter((row) => row.duplicateInImportRow).length,
    rows
  };
}

function invalidImportPreview(message: string, rowNumber = 1): ImportPreview {
  return {
    validCount: 0,
    invalidCount: 1,
    duplicateExistingCount: 0,
    duplicateInImportCount: 0,
    rows: [
      {
        rowNumber,
        input: {},
        errors: [message]
      }
    ]
  };
}

function parseJsonImportMode(value: unknown): JsonImportMode {
  return value === "replace" ? "replace" : "append";
}

function siteSettingsChangeDetail(previous: SiteSettings, next: SiteSettings) {
  const changedFields: string[] = [];
  if (previous.siteName !== next.siteName) {
    changedFields.push("站点名称");
  }
  if (previous.correctionContact !== next.correctionContact) {
    changedFields.push("公开纠错说明");
  }
  if (previous.defaultUpcomingDays !== next.defaultUpcomingDays) {
    changedFields.push(`默认近期天数 ${next.defaultUpcomingDays} 天`);
  }
  if (!sameStringList(previous.birthdayGreetingTemplates, next.birthdayGreetingTemplates)) {
    changedFields.push(`祝福模板 ${next.birthdayGreetingTemplates.length} 条`);
  }
  return {
    changedFields: changedFields.length > 0 ? changedFields : ["无字段变化"]
  };
}

function sameStringList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function csvRowToInput(row: Record<string, string>): {
  input: Partial<BirthdayInput> & Record<string, unknown>;
  errors: string[];
} {
  const errors: string[] = [];
  const isLeapMonth = parseCsvBoolean(row.isLeapMonth, "isLeapMonth", false, errors);
  const displayAge = parseCsvBoolean(row.displayAge, "displayAge", false, errors);
  const visible = parseCsvBoolean(row.visible, "visible", true, errors);
  const input: Partial<BirthdayInput> & Record<string, unknown> = {
    name: row.name,
    calendarType: row.calendarType as BirthdayInput["calendarType"],
    year: row.year ? Number(row.year) : undefined,
    month: Number(row.month),
    day: Number(row.day),
    isLeapMonth,
    leapMonthPolicy: row.leapMonthPolicy
      ? (row.leapMonthPolicy as BirthdayInput["leapMonthPolicy"])
      : undefined,
    displayAge,
    group: row.group,
    tags: row.tags ? row.tags.split(/[;|]/).map((tag) => tag.trim()).filter(Boolean) : [],
    note: row.note,
    visible
  };

  return { input, errors };
}

function recordToCsvRow(record: BirthdayRecord) {
  return {
    name: record.name,
    calendarType: record.calendarType,
    year: record.year ?? "",
    month: record.month,
    day: record.day,
    isLeapMonth: record.isLeapMonth,
    leapMonthPolicy: record.leapMonthPolicy ?? "",
    displayAge: record.displayAge,
    group: record.group ?? "",
    tags: record.tags.join("|"),
    note: record.note ?? "",
    visible: record.visible
  };
}

function parseCsvBoolean(
  value: unknown,
  field: string,
  defaultValue: boolean,
  errors: string[]
): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  if (["1", "true", "yes", "y", "是", "显示", "公开"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "否", "隐藏", "不公开"].includes(normalized)) {
    return false;
  }
  errors.push(`${field}: 布尔值只能填写 true/false、yes/no、是/否、显示/隐藏、公开/不公开 或 1/0`);
  return defaultValue;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
