import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { hashSync } from "bcryptjs";
import { addDays, todayInTimeZone } from "../shared/date.js";
import { config } from "./config.js";

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (!db) {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
    db = new DatabaseSync(config.databasePath);
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA journal_mode = WAL");
    migrate(db);
    seed(db);
  }
  return db;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS birthday_people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      calendar_type TEXT NOT NULL CHECK (calendar_type IN ('gregorian', 'lunar')),
      year INTEGER,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      is_leap_month INTEGER NOT NULL DEFAULT 0,
      leap_month_policy TEXT,
      display_age INTEGER NOT NULL DEFAULT 0,
      person_group TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      note TEXT,
      visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_birthday_visible
      ON birthday_people (visible);
    CREATE INDEX IF NOT EXISTS idx_birthday_calendar
      ON birthday_people (calendar_type);
    CREATE INDEX IF NOT EXISTS idx_birthday_month_day
      ON birthday_people (month, day);
    CREATE INDEX IF NOT EXISTS idx_birthday_updated_at
      ON birthday_people (updated_at);

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_operation_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      entity_name TEXT,
      actor_id TEXT,
      actor_name TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at
      ON admin_operation_logs (created_at);
  `);

  addColumnIfMissing(database, "birthday_people", "updated_by", "TEXT");
}

function addColumnIfMissing(
  database: DatabaseSync,
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function seed(database: DatabaseSync) {
  const adminCount = database
    .prepare("SELECT COUNT(*) AS count FROM admin_users")
    .get() as { count: number };

  if (adminCount.count === 0) {
    const now = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        config.adminUsername,
        hashSync(config.adminPassword, 12),
        now,
        now
      );
  }

  removeLegacyThemeAnchor(database);

  if (!config.seedSampleData) {
    return;
  }

  const now = new Date().toISOString();
  const today = todayInTimeZone();
  const soon = addDays(today, 12);
  const insert = database.prepare(`
    INSERT INTO birthday_people (
      id, name, calendar_type, year, month, day, is_leap_month,
      leap_month_policy, display_age, person_group, tags_json, note,
      visible, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const birthdayCount = database
    .prepare("SELECT COUNT(*) AS count FROM birthday_people")
    .get() as { count: number };

  if (birthdayCount.count > 0) {
    return;
  }

  insert.run(
    randomUUID(),
    "小星",
    "gregorian",
    null,
    today.month,
    today.day,
    0,
    null,
    0,
    "朋友",
    JSON.stringify(["示例"]),
    "今天生日示例，可在后台修改或删除",
    1,
    now,
    now
  );
  insert.run(
    randomUUID(),
    "小满",
    "gregorian",
    null,
    soon.month,
    soon.day,
    0,
    null,
    0,
    "朋友",
    JSON.stringify(["近期"]),
    "近期生日示例",
    1,
    now,
    now
  );
  insert.run(
    randomUUID(),
    "阿月",
    "lunar",
    null,
    4,
    8,
    0,
    null,
    0,
    "家人",
    JSON.stringify(["农历"]),
    "农历生日示例",
    1,
    now,
    now
  );
  insert.run(
    randomUUID(),
    "闰月示例",
    "lunar",
    null,
    6,
    1,
    1,
    "normalMonthIfNoLeap",
    0,
    "示例",
    JSON.stringify(["闰月"]),
    "没有对应闰六月时按普通六月展示",
    1,
    now,
    now
  );
}

function removeLegacyThemeAnchor(database: DatabaseSync) {
  // Remove only the exact old auto-seeded anchor row; user-created rows are left intact.
  database
    .prepare(
      `DELETE FROM birthday_people
       WHERE name = ?
         AND calendar_type = 'gregorian'
         AND year = 1982
         AND month = 12
         AND day = 20
         AND person_group = ?
         AND note = ?`
    )
    .run("张杰", "星星", "星星生日墙主题锚点，可按实际公开策略编辑");
}
