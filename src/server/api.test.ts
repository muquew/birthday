import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type JsonResponse<T> = {
  status: number;
  headers: Headers;
  body: T;
};

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xingxing-api-test-"));
let server: Server;
let baseUrl = "";
let adminCookie = "";

describe.sequential("admin API integration", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.DATABASE_PATH = path.join(tempRoot, "birthday.sqlite");
    process.env.SEED_SAMPLE_DATA = "false";
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "admin123456";
    process.env.SESSION_SECRET = "test-session-secret-with-enough-length";

    const { createServerApp } = await import("./app.js");
    server = await listen(createServerApp());
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/xingxing/api`;

    const login = await requestJson<{ user: { username: string } }>("/auth/login", {
      method: "POST",
      body: {
        username: "admin",
        password: "admin123456"
      },
      auth: false
    });
    expect(login.status).toBe(200);
    expect(login.body.user.username).toBe("admin");
    adminCookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect(adminCookie).toContain("xingxing_admin_session=");
  });

  afterAll(async () => {
    await closeServer();
  });

  it("rejects header-only CSV and empty JSON imports with explicit preview errors", async () => {
    const csvPreview = await requestJson<{ preview: { invalidCount: number; rows: Array<{ errors: string[] }> } }>(
      "/admin/import/csv",
      {
        method: "POST",
        body: {
          dryRun: true,
          csv: "name,calendarType,month,day\n"
        }
      }
    );
    expect(csvPreview.status).toBe(200);
    expect(csvPreview.body.preview.invalidCount).toBe(1);
    expect(csvPreview.body.preview.rows[0].errors).toContain("CSV 没有可导入的记录");

    const csvImport = await requestJson<{ error: string }>("/admin/import/csv", {
      method: "POST",
      body: {
        dryRun: false,
        csv: "name,calendarType,month,day\n"
      }
    });
    expect(csvImport.status).toBe(400);
    expect(csvImport.body.error).toBe("CSV 存在错误，未导入");

    const jsonPreview = await requestJson<{ preview: { invalidCount: number; rows: Array<{ errors: string[] }> } }>(
      "/admin/import/json",
      {
        method: "POST",
        body: {
          dryRun: true,
          json: "[]",
          mode: "append"
        }
      }
    );
    expect(jsonPreview.status).toBe(200);
    expect(jsonPreview.body.preview.invalidCount).toBe(1);
    expect(jsonPreview.body.preview.rows[0].errors).toContain("JSON 没有可导入的记录");
  });

  it("keeps public birthday responses free of admin-only fields", async () => {
    const created = await requestJson<{ birthday: { id: string } }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "公开接口校验",
        calendarType: "gregorian",
        month: 5,
        day: 25,
        displayAge: false,
        visible: true
      }
    });
    expect(created.status).toBe(201);

    const publicBirthdays = await requestJson<{ birthdays: Array<Record<string, unknown>> }>(
      "/public/birthdays",
      {
        auth: false
      }
    );
    expect(publicBirthdays.status).toBe(200);
    const exposed = publicBirthdays.body.birthdays.find((item) => item.name === "公开接口校验");
    expect(exposed).toBeTruthy();
    expect(exposed).not.toHaveProperty("createdAt");
    expect(exposed).not.toHaveProperty("updatedAt");
    expect(exposed).not.toHaveProperty("updatedBy");
  });

  it("rejects exact duplicate birthdays unless they are explicitly distinguished", async () => {
    const first = await requestJson<{ birthday: { id: string; name: string } }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "重复校验",
        calendarType: "gregorian",
        month: 3,
        day: 14
      }
    });
    expect(first.status).toBe(201);

    const duplicate = await requestJson<{ error: string; duplicate: { name: string } }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "重复 校验",
        calendarType: "gregorian",
        month: 3,
        day: 14
      }
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("已存在同名同日期生日记录");
    expect(duplicate.body.duplicate.name).toBe("重复校验");

    const allowedWithoutDetail = await requestJson<{ error: string }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "重复校验",
        calendarType: "gregorian",
        month: 3,
        day: 14,
        allowDuplicate: true
      }
    });
    expect(allowedWithoutDetail.status).toBe(409);
    expect(allowedWithoutDetail.body.error).toBe("同名同日期记录需要填写分组、标签或备注后才能保留");

    const distinguished = await requestJson<{ birthday: { group: string } }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "重复校验",
        calendarType: "gregorian",
        month: 3,
        day: 14,
        group: "二组",
        allowDuplicate: true
      }
    });
    expect(distinguished.status).toBe(201);
    expect(distinguished.body.birthday.group).toBe("二组");
  });

  it("blocks duplicate imports by default and can skip duplicate rows", async () => {
    const csv = [
      "name,calendarType,month,day",
      "重复校验,gregorian,3,14",
      "导入新记录,gregorian,4,2"
    ].join("\n");

    const blocked = await requestJson<{ error: string; preview: { duplicateExistingCount: number } }>(
      "/admin/import/csv",
      {
        method: "POST",
        body: {
          dryRun: false,
          csv
        }
      }
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe("CSV 存在重复记录，请先处理重复或选择跳过重复");
    expect(blocked.body.preview.duplicateExistingCount).toBe(1);

    const imported = await requestJson<{
      created: Array<{ name: string }>;
      preview: { validCount: number; importableCount: number; skippedCount: number };
    }>("/admin/import/csv", {
      method: "POST",
      body: {
        dryRun: false,
        skipDuplicates: true,
        csv
      }
    });
    expect(imported.status).toBe(201);
    expect(imported.body.created.map((item) => item.name)).toEqual(["导入新记录"]);
    expect(imported.body.preview.validCount).toBe(2);
    expect(imported.body.preview.importableCount).toBe(1);
    expect(imported.body.preview.skippedCount).toBe(1);
  });

  it("reports data audit issue groups for administrators", async () => {
    const audit = await requestJson<{
      audit: {
        totalRecords: number;
        issueCount: number;
        attentionCount: number;
        issues: Array<{ kind: string; count: number; birthdays: Array<{ name: string }> }>;
      };
    }>("/admin/data-audit");

    expect(audit.status).toBe(200);
    expect(audit.body.audit.totalRecords).toBeGreaterThan(0);
    expect(audit.body.audit.issueCount).toBeGreaterThan(0);
    expect(audit.body.audit.attentionCount).toBeGreaterThan(0);
    const exactDuplicate = audit.body.audit.issues.find((issue) => issue.kind === "exactDuplicate");
    expect(exactDuplicate?.count).toBe(2);
    expect(exactDuplicate?.birthdays.map((birthday) => birthday.name)).toEqual([
      "重复校验",
      "重复校验"
    ]);
  });

  it("batch manages groups and tags with precise change counts", async () => {
    const first = await requestJson<{ birthday: { id: string } }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "批量整理一",
        calendarType: "gregorian",
        month: 10,
        day: 1,
        group: "旧组",
        tags: ["旧标签"]
      }
    });
    const second = await requestJson<{ birthday: { id: string } }>("/admin/birthdays", {
      method: "POST",
      body: {
        name: "批量整理二",
        calendarType: "lunar",
        month: 10,
        day: 2,
        tags: ["旧标签", "会移除"]
      }
    });
    const ids = [first.body.birthday.id, second.body.birthday.id];

    const setGroup = await requestJson<{
      count: number;
      birthdays: Array<{ group?: string; updatedBy?: string }>;
    }>("/admin/birthdays/batch", {
      method: "POST",
      body: {
        ids,
        action: "setGroup",
        group: "星星组"
      }
    });
    expect(setGroup.status).toBe(200);
    expect(setGroup.body.count).toBe(2);
    expect(setGroup.body.birthdays.map((birthday) => birthday.group)).toEqual(["星星组", "星星组"]);
    expect(setGroup.body.birthdays.every((birthday) => birthday.updatedBy === "admin")).toBe(true);

    const addTags = await requestJson<{
      count: number;
      birthdays: Array<{ name: string; tags: string[] }>;
    }>("/admin/birthdays/batch", {
      method: "POST",
      body: {
        ids,
        action: "addTags",
        tags: ["星星", "旧标签", "星星"]
      }
    });
    expect(addTags.status).toBe(200);
    expect(addTags.body.count).toBe(2);
    expect(addTags.body.birthdays.find((birthday) => birthday.name === "批量整理一")?.tags).toEqual([
      "旧标签",
      "星星"
    ]);
    expect(addTags.body.birthdays.find((birthday) => birthday.name === "批量整理二")?.tags).toEqual([
      "旧标签",
      "会移除",
      "星星"
    ]);

    const removeTags = await requestJson<{
      count: number;
      birthdays: Array<{ name: string; tags: string[] }>;
    }>("/admin/birthdays/batch", {
      method: "POST",
      body: {
        ids,
        action: "removeTags",
        tags: ["会移除"]
      }
    });
    expect(removeTags.status).toBe(200);
    expect(removeTags.body.count).toBe(1);
    expect(removeTags.body.birthdays[0].name).toBe("批量整理二");
    expect(removeTags.body.birthdays[0].tags).toEqual(["旧标签", "星星"]);

    const clearGroup = await requestJson<{
      count: number;
      birthdays: Array<{ group?: string }>;
    }>("/admin/birthdays/batch", {
      method: "POST",
      body: {
        ids,
        action: "clearGroup"
      }
    });
    expect(clearGroup.status).toBe(200);
    expect(clearGroup.body.count).toBe(2);
    expect(clearGroup.body.birthdays.every((birthday) => birthday.group === undefined)).toBe(true);

    const clearTags = await requestJson<{
      count: number;
      birthdays: Array<{ tags: string[] }>;
    }>("/admin/birthdays/batch", {
      method: "POST",
      body: {
        ids,
        action: "clearTags"
      }
    });
    expect(clearTags.status).toBe(200);
    expect(clearTags.body.count).toBe(2);
    expect(clearTags.body.birthdays.every((birthday) => birthday.tags.length === 0)).toBe(true);

    const logs = await requestJson<{ logs: Array<{ action: string; detail?: string }> }>(
      "/admin/operation-logs?limit=20"
    );
    expect(logs.status).toBe(200);
    expect(logs.body.logs.map((log) => log.action)).toEqual(
      expect.arrayContaining([
        "batch_set_group",
        "batch_add_tags",
        "batch_remove_tags",
        "batch_clear_group",
        "batch_clear_tags"
      ])
    );
    expect(logs.body.logs.find((log) => log.action === "batch_add_tags")?.detail).toContain("星星");
  });

  it("normalizes legacy import calendar labels and birthday text", async () => {
    const csvPreview = await requestJson<{
      preview: {
        importableCount: number;
        rows: Array<{ input: { calendarType: string; month: number; day: number } }>;
      };
    }>("/admin/import/csv", {
      method: "POST",
      body: {
        dryRun: true,
        csv: ["name,calendarType,birthday", "旧CSV,新历,1月28日"].join("\n")
      }
    });
    expect(csvPreview.status).toBe(200);
    expect(csvPreview.body.preview.importableCount).toBe(1);
    expect(csvPreview.body.preview.rows[0].input).toMatchObject({
      calendarType: "gregorian",
      month: 1,
      day: 28
    });

    const jsonPreview = await requestJson<{
      preview: {
        importableCount: number;
        rows: Array<{ input: { calendarType: string; month: number; day: number; isLeapMonth: boolean } }>;
      };
    }>("/admin/import/json", {
      method: "POST",
      body: {
        dryRun: true,
        mode: "append",
        json: JSON.stringify({
          birthdays: [
            {
              name: "旧JSON",
              calendarType: "农历",
              birthday: "闰6月1日",
              leapMonthPolicy: "normalMonthIfNoLeap"
            }
          ]
        })
      }
    });
    expect(jsonPreview.status).toBe(200);
    expect(jsonPreview.body.preview.importableCount).toBe(1);
    expect(jsonPreview.body.preview.rows[0].input).toMatchObject({
      calendarType: "lunar",
      month: 6,
      day: 1,
      isLeapMonth: true
    });
  });

  it("records only the changed settings field and keeps millisecond log timestamps", async () => {
    const current = await requestJson<{
      settings: {
        siteName: string;
        correctionContact: string;
        defaultUpcomingDays: number;
        birthdayGreetingTemplates: string[];
      };
    }>("/admin/settings");
    expect(current.status).toBe(200);

    const updated = await requestJson<{ settings: { correctionContact: string } }>("/admin/settings", {
      method: "PUT",
      body: {
        ...current.body.settings,
        correctionContact: `${current.body.settings.correctionContact} 请联系管理员复核。`
      }
    });
    expect(updated.status).toBe(200);

    const logs = await requestJson<{ logs: Array<{ action: string; detail?: string; createdAt: string }> }>(
      "/admin/operation-logs?limit=20"
    );
    expect(logs.status).toBe(200);
    const settingsLog = logs.body.logs.find((log) => log.action === "update_settings");
    expect(settingsLog).toBeTruthy();
    expect(settingsLog?.createdAt).toMatch(/\.\d{3}Z$/);
    expect(JSON.parse(settingsLog?.detail ?? "{}")).toEqual({
      changedFields: ["公开纠错说明"]
    });
  });

  it("records one JSON replace import log without a lower-level replace log", async () => {
    const imported = await requestJson<{ created: unknown[]; mode: string }>("/admin/import/json", {
      method: "POST",
      body: {
        dryRun: false,
        mode: "replace",
        json: JSON.stringify([
          {
            name: "JSON 替换一",
            calendarType: "gregorian",
            month: 6,
            day: 1
          },
          {
            name: "JSON 替换二",
            calendarType: "lunar",
            month: 8,
            day: 15
          }
        ])
      }
    });
    expect(imported.status).toBe(201);
    expect(imported.body.mode).toBe("replace");
    expect(imported.body.created).toHaveLength(2);

    const logs = await requestJson<{ logs: Array<{ action: string }> }>("/admin/operation-logs?limit=50");
    expect(logs.status).toBe(200);
    expect(logs.body.logs.filter((log) => log.action === "import_json_replace")).toHaveLength(1);
    expect(logs.body.logs.filter((log) => log.action === "replace_birthdays")).toHaveLength(0);
  });
});

function listen(app: Express): Promise<Server> {
  return new Promise((resolve) => {
    const nextServer = app.listen(0, "127.0.0.1", () => resolve(nextServer));
  });
}

function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function requestJson<T>(
  route: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
  } = {}
): Promise<JsonResponse<T>> {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.auth !== false && adminCookie) {
    headers.set("cookie", adminCookie);
  }
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  return {
    status: response.status,
    headers: response.headers,
    body: (await response.json()) as T
  };
}
