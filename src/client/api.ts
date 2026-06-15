import { API_BASE } from "../shared/types.js";
import type {
  AdminOperationLog,
  BirthdayInput,
  BirthdayWriteOptions,
  BirthdayView,
  ImportOptions,
  ImportPreview,
  JsonImportMode,
  SiteSettings
} from "../shared/types.js";

export type PublicBirthday = Omit<
  BirthdayView,
  "visible" | "createdAt" | "updatedAt" | "updatedBy" | "searchableText"
>;

export type AdminUser = {
  id: string;
  username: string;
};

export type TodayDateInfo = {
  solarText: string;
  weekday: string;
  lunarText: string;
};

export type PublicSettings = SiteSettings & {
  basePath: string;
};

type RequestOptions = RequestInit & {
  json?: unknown;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const init: RequestInit = {
    ...options,
    credentials: "same-origin",
    headers
  };

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.json);
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  const contentType = response.headers.get("Content-Type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? responseErrorMessage(body)
        : `请求失败：${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

function responseErrorMessage(body: object): string {
  const base = "error" in body ? String(body.error) : "请求失败";
  const details = "details" in body && Array.isArray(body.details) ? body.details : [];
  const messages = details
    .map((detail) =>
      typeof detail === "object" && detail && "message" in detail
        ? String(detail.message)
        : ""
    )
    .filter(Boolean);
  return messages.length > 0 ? `${base}：${messages.join("；")}` : base;
}

export const api = {
  publicToday: () =>
    request<{ today: TodayDateInfo }>("/public/today"),
  publicSettings: () =>
    request<PublicSettings>("/public/settings"),
  publicBirthdays: () =>
    request<{ birthdays: PublicBirthday[] }>("/public/birthdays"),
  adminBirthdays: () =>
    request<{ birthdays: BirthdayView[] }>("/admin/birthdays"),
  previewBirthday: (input: BirthdayInput) =>
    request<{ birthday: BirthdayView }>("/admin/birthdays/preview", {
      method: "POST",
      json: input
    }),
  login: (username: string, password: string) =>
    request<{ user: AdminUser }>("/auth/login", {
      method: "POST",
      json: { username, password }
    }),
  logout: () =>
    request<{ ok: true }>("/auth/logout", {
      method: "POST"
    }),
  me: () => request<{ user: AdminUser | null }>("/auth/me"),
  createBirthday: (input: BirthdayInput, options: BirthdayWriteOptions = {}) =>
    request<{ birthday: BirthdayView }>("/admin/birthdays", {
      method: "POST",
      json: { ...input, ...options }
    }),
  updateBirthday: (id: string, input: BirthdayInput, options: BirthdayWriteOptions = {}) =>
    request<{ birthday: BirthdayView }>(`/admin/birthdays/${id}`, {
      method: "PUT",
      json: { ...input, ...options }
    }),
  deleteBirthday: (id: string) =>
    request<{ ok: true }>(`/admin/birthdays/${id}`, {
      method: "DELETE"
    }),
  setVisibility: (id: string, visible: boolean) =>
    request<{ birthday: BirthdayView }>(`/admin/birthdays/${id}/visibility`, {
      method: "POST",
      json: { visible }
    }),
  batchBirthdays: (ids: string[], action: "show" | "hide" | "delete") =>
    request<{ birthdays: BirthdayView[]; count: number }>("/admin/birthdays/batch", {
      method: "POST",
      json: { ids, action }
    }),
  adminOperationLogs: (limit = 80) =>
    request<{ logs: AdminOperationLog[] }>(`/admin/operation-logs?limit=${limit}`),
  previewCsv: (csv: string, options: ImportOptions = {}) =>
    request<{ preview: ImportPreview }>("/admin/import/csv", {
      method: "POST",
      json: { csv, dryRun: true, ...options }
    }),
  importCsv: (csv: string, options: ImportOptions = {}) =>
    request<{ preview: ImportPreview; created: BirthdayView[] }>("/admin/import/csv", {
      method: "POST",
      json: { csv, dryRun: false, ...options }
    }),
  previewJson: (json: string, mode: JsonImportMode, options: ImportOptions = {}) =>
    request<{ preview: ImportPreview; mode: JsonImportMode }>("/admin/import/json", {
      method: "POST",
      json: { json, mode, dryRun: true, ...options }
    }),
  importJson: (json: string, mode: JsonImportMode, options: ImportOptions = {}) =>
    request<{ preview: ImportPreview; created: BirthdayView[]; mode: JsonImportMode }>(
      "/admin/import/json",
      {
        method: "POST",
        json: { json, mode, dryRun: false, ...options }
      }
    ),
  adminSettings: () =>
    request<{ settings: SiteSettings }>("/admin/settings"),
  updateSettings: (settings: SiteSettings) =>
    request<{ settings: SiteSettings }>("/admin/settings", {
      method: "PUT",
      json: settings
    })
};

export function adminExportUrl(kind: "csv" | "json"): string {
  return `${API_BASE}/admin/export.${kind}`;
}
