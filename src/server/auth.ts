import type { NextFunction, Request, Response } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { compareSync } from "bcryptjs";
import { parse, serialize } from "cookie";
import { getDb } from "./db.js";
import { config } from "./config.js";

const COOKIE_NAME = "xingxing_admin_session";
const SESSION_DAYS = 7;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export type AdminUser = {
  id: string;
  username: string;
};

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = getCurrentAdmin(req);
  if (!user) {
    res.status(401).json({ error: "未登录或登录已过期" });
    return;
  }
  req.adminUser = user;
  next();
}

export function login(username: string, password: string, ip: string) {
  assertRateLimit(ip);
  deleteExpiredSessions();

  const row = getDb()
    .prepare("SELECT id, username, password_hash FROM admin_users WHERE username = ?")
    .get(username) as
    | { id: string; username: string; password_hash: string }
    | undefined;

  if (!row || !compareSync(password, row.password_hash)) {
    recordFailedLogin(ip);
    return undefined;
  }

  loginAttempts.delete(ip);
  const sessionId = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  getDb()
    .prepare(
      `INSERT INTO admin_sessions (id, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(sessionId, row.id, expires.toISOString(), now.toISOString());

  return {
    user: { id: row.id, username: row.username },
    cookie: serialize(COOKIE_NAME, sessionCookieValue(sessionId), {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      path: config.basePath || "/",
      maxAge: SESSION_DAYS * 86400
    })
  };
}

export function logout(req: Request): string {
  const sessionId = sessionFromRequest(req);
  if (sessionId) {
    getDb().prepare("DELETE FROM admin_sessions WHERE id = ?").run(sessionId);
  }

  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: config.basePath || "/",
    maxAge: 0
  });
}

export function getCurrentAdmin(req: Request): AdminUser | undefined {
  deleteExpiredSessions();
  const sessionId = sessionFromRequest(req);
  if (!sessionId) {
    return undefined;
  }

  const row = getDb()
    .prepare(
      `SELECT admin_users.id, admin_users.username, admin_sessions.expires_at
       FROM admin_sessions
       JOIN admin_users ON admin_users.id = admin_sessions.user_id
       WHERE admin_sessions.id = ?`
    )
    .get(sessionId) as
    | { id: string; username: string; expires_at: string }
    | undefined;

  if (!row) {
    return undefined;
  }

  if (Date.parse(row.expires_at) <= Date.now()) {
    getDb().prepare("DELETE FROM admin_sessions WHERE id = ?").run(sessionId);
    return undefined;
  }

  return { id: row.id, username: row.username };
}

function sessionFromRequest(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }
  const value = parse(cookieHeader)[COOKIE_NAME];
  if (!value) {
    return undefined;
  }
  return verifySessionCookie(value);
}

function sessionCookieValue(sessionId: string): string {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

function verifySessionCookie(value: string): string | undefined {
  const parts = value.split(".");
  if (parts.length !== 2) {
    return undefined;
  }
  const [sessionId, signature] = parts;
  if (!sessionId || !signature) {
    return undefined;
  }
  const expected = signSessionId(sessionId);
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) {
    return undefined;
  }
  return timingSafeEqual(providedBytes, expectedBytes) ? sessionId : undefined;
}

function signSessionId(sessionId: string): string {
  return createHmac("sha256", config.sessionSecret)
    .update(sessionId)
    .digest("base64url");
}

function assertRateLimit(ip: string) {
  const attempt = loginAttempts.get(ip);
  if (!attempt) {
    return;
  }
  if (attempt.resetAt < Date.now()) {
    loginAttempts.delete(ip);
    return;
  }
  if (attempt.count >= 10) {
    throw new Error("登录尝试过多，请稍后再试");
  }
}

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  current.count += 1;
}

function deleteExpiredSessions() {
  getDb()
    .prepare("DELETE FROM admin_sessions WHERE expires_at <= ?")
    .run(new Date().toISOString());
}
