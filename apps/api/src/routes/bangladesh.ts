import { Router } from "express";
import { bangladeshNewsQuerySchema } from "@techpulse/shared";
import { listNews } from "../services/news.js";
import { listCategories, listSources } from "../services/catalog.js";
export function bangladeshRouter() {
  const router = Router();
  const cache = new Map<string, { expires: number; value: unknown }>();
  router.get(["/", "/latest", "/trending"], async (req, res) => {
    const query = bangladeshNewsQuerySchema.parse({
      ...req.query,
      ...(req.path === "/trending"
        ? { sort: "trending" }
        : req.path === "/latest"
          ? { sort: "newest" }
          : {}),
    });
    const key = JSON.stringify(query),
      hit = cache.get(key);
    res.set("Cache-Control", "public, max-age=10");
    if (hit && hit.expires > Date.now()) {
      res.json(hit.value);
      return;
    }
    const value = await listNews(query, "bangladesh");
    if (cache.size >= 150) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 10000, value });
    res.json(value);
  });
  router.get("/categories", async (_req, res) =>
    res.json(await listCategories("bangladesh")),
  );
  router.get("/sources", async (_req, res) =>
    res.json(await listSources("bangladesh")),
  );
  return router;
}
