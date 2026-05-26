import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createApiRouter } from "./routes.js";
import { config } from "./config.js";
import { getDb } from "./db.js";

export function createServerApp() {
  const app = express();
  const apiBase = `${config.basePath}/api`;
  const distPath = path.resolve(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  getDb();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "3mb" }));

  app.get("/", (_req, res) => {
    res.redirect(config.basePath || "/");
  });

  app.use(apiBase, createApiRouter());

  if (fs.existsSync(distPath)) {
    app.use(config.basePath || "/", express.static(distPath, { index: false }));
    app.get(new RegExp(`^${escapeRegex(config.basePath || "")}(?!/api)(?:/.*)?$`), (_req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    app.get(config.basePath || "/", (_req, res) => {
      res
        .status(200)
        .send("Xingxing birthday API is running. Start Vite for the frontend in development.");
    });
  }

  return app;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
