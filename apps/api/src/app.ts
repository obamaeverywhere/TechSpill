import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import { db } from "@techpulse/db";
import { newsQuerySchema } from "@techpulse/shared";
import { listNews, articleInclude, serializeArticle } from "./services/news.js";
import { errorHandler } from "./middleware/errors.js";
import { resolve } from "node:path";
import { bangladeshRouter } from "./routes/bangladesh.js";
import { listCategories, listSources } from "./services/catalog.js";
import { publicArticleWhere } from "./services/news.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY_HOPS)
    app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "https:", "data:"],
          "style-src": [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
        },
      },
    }),
  );
  app.use(
    pinoHttp({
      level: process.env.LOG_LEVEL || "info",
      redact: ["req.headers.authorization", "req.headers.cookie"],
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: process.env.NODE_ENV !== "test",
    }),
  );
  const origins = (process.env.WEB_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());
  app.use(
    cors({
      origin: (origin, cb) =>
        !origin || origins.includes(origin)
          ? cb(null, true)
          : cb(Object.assign(new Error("Origin denied"), { status: 403 })),
    }),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again shortly.",
        },
      },
    }),
  );
  const cache = new Map<string, { expires: number; value: unknown }>();
  app.get(
    ["/api/news", "/api/news/latest", "/api/news/trending", "/api/search"],
    async (req, res) => {
      const query = newsQuerySchema.parse({
        ...req.query,
        ...(req.path.endsWith("/trending")
          ? { sort: "trending" }
          : req.path.endsWith("/latest")
            ? { sort: "newest" }
            : {}),
      });
      const key = JSON.stringify(query);
      const cached = cache.get(key);
      res.set("Cache-Control", "public, max-age=10");
      if (cached && cached.expires > Date.now()) {
        res.json(cached.value);
        return;
      }
      const value = await listNews(query);
      if (cache.size >= 250) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 10000, value });
      res.json(value);
    },
  );
  app.use("/api/news/bangladesh", bangladeshRouter());
  app.get("/api/news/:id", async (req, res) => {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(req.params.id)) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid article ID" },
      });
      return;
    }
    const article = await db.article.findFirst({
      where: { AND: [{ id: req.params.id }, publicArticleWhere] },
      include: articleInclude,
    });
    if (!article) {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Article not found" } });
      return;
    }
    res.json({ data: serializeArticle(article) });
  });
  app.get("/api/categories", async (_req, res) =>
    res.json(await listCategories()),
  );
  app.get("/api/sources", async (_req, res) => res.json(await listSources()));
  app.get("/api/health", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      await db.$queryRaw`SELECT 1`;
      const [latest, success] = await Promise.all([
        db.collectionJob.findFirst({ orderBy: { startedAt: "desc" } }),
        db.newsSource.aggregate({ _max: { lastSuccessAt: true } }),
      ]);
      const last = latest?.heartbeatAt;
      const stale =
        !last ||
        Date.now() - last.getTime() >
          Number(process.env.WORKER_STALE_MINUTES || 30) * 60000;
      res.json({
        data: {
          status: "ok",
          database: "connected",
          collection: {
            lastFinishedAt: latest?.finishedAt ?? null,
            lastSuccessAt: success._max.lastSuccessAt,
            lastStatus: latest?.status ?? null,
            lastHeartbeatAt: last ?? null,
            stale,
          },
        },
      });
    } catch {
      res.status(503).json({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      });
    }
  });
  app.use("/api", (_req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }),
  );
  if (process.env.SERVE_WEB === "true") {
    app.use(express.static(resolve("apps/web/dist"), { maxAge: "1h" }));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve("apps/web/dist/index.html")),
    );
  }
  app.use(errorHandler);
  return app;
}
