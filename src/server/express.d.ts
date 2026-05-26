import type { AdminUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

export {};
