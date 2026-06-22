import type { SiteSettings } from "../shared/types.js";
import { siteSettingsSchema } from "../shared/validation.js";
import { DEFAULT_SITE_SETTINGS } from "../shared/settings.js";
import { getDb } from "./db.js";

export function getSiteSettings(): SiteSettings {
  const rows = getDb()
    .prepare("SELECT key, value FROM site_settings")
    .all() as Array<{ key: string; value: string }>;
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return siteSettingsSchema.parse({
    siteName: values.get("siteName") ?? DEFAULT_SITE_SETTINGS.siteName,
    correctionContact:
      values.get("correctionContact") ?? DEFAULT_SITE_SETTINGS.correctionContact,
    defaultUpcomingDays: Number(
      values.get("defaultUpcomingDays") ?? DEFAULT_SITE_SETTINGS.defaultUpcomingDays
    ),
    birthdayGreetingTemplates: parseTemplateSetting(
      values.get("birthdayGreetingTemplates"),
      DEFAULT_SITE_SETTINGS.birthdayGreetingTemplates
    )
  });
}

export function updateSiteSettings(input: SiteSettings): SiteSettings {
  const parsed = siteSettingsSchema.parse(input);
  const now = new Date().toISOString();
  const db = getDb();
  const statement = db.prepare(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`
  );
  for (const [key, value] of Object.entries(parsed)) {
    statement.run(key, serializeSettingValue(value), now);
  }
  return parsed;
}

function parseTemplateSetting(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : fallback;
  } catch {
    return fallback;
  }
}

function serializeSettingValue(value: unknown): string {
  return Array.isArray(value) ? JSON.stringify(value) : String(value);
}
