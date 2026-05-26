import "dotenv/config";
import path from "node:path";
import { BASE_PATH } from "../shared/types.js";

const root = process.cwd();

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  basePath: normalizeBasePath(process.env.BASE_PATH ?? BASE_PATH),
  databasePath: path.resolve(root, process.env.DATABASE_PATH ?? "data/birthday.sqlite"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123456",
  seedSampleData: process.env.SEED_SAMPLE_DATA !== "false",
  isProduction: process.env.NODE_ENV === "production"
};

if (config.isProduction) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 24) {
    throw new Error("SESSION_SECRET must be set to a strong value in production");
  }
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD must be set in production");
  }
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed.replace(/\/$/, "") : `/${trimmed}`;
}
