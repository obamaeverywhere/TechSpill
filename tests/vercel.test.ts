import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../apps/api/src/app";
import config from "../vercel.json";
import vercelApp from "../apps/api/app";

afterEach(() => vi.unstubAllEnvs());
describe("Vercel service boundaries", () => {
  it("keeps API requests in the API service, including bare /api, before the web catch-all", () => {
    const serviceFor = (path: string) =>
      config.rewrites.find((rule) => new RegExp(`^${rule.source}$`).test(path))
        ?.destination.service;
    expect(serviceFor("/api")).toBe("api");
    expect(serviceFor("/api/news/bangladesh?language=bn")).toBe("api");
    expect(serviceFor("/bangladesh")).toBe("web");
    expect(serviceFor("/saved")).toBe("web");
    expect(Object.keys(config.services)).toEqual(["web", "api"]);
    expect(config.daemons.worker.entrypoint).toBe("Dockerfile.worker");
  });
  it("keeps development modules and static assets out of the SPA fallback", () => {
    const fallback = new RegExp(`^${config.services.web.rewrites[0].source}$`);
    for (const path of ["/", "/bangladesh", "/saved", "/trending", "/sources"])
      expect(fallback.test(path)).toBe(true);
    for (const path of [
      "/src/main.tsx",
      "/@vite/client",
      "/@react-refresh",
      "/node_modules/.vite/deps/react.js",
      "/assets/app.js",
      "/favicon.svg",
      "/theme-init.js",
    ])
      expect(fallback.test(path)).toBe(false);
  });
  it("exports the Vercel app without a listener and trusts only its immediate ingress proxy", async () => {
    expect(typeof vercelApp).toBe("function");
    expect(vercelApp.get("trust proxy")).toBe(1);
    expect(
      (
        await request(vercelApp)
          .get("/api/unknown")
          .set("X-Forwarded-For", "203.0.113.10")
      ).status,
    ).toBe(404);
  });
  it("preserves /api in the function's routes and returns JSON for unknown API paths", async () => {
    const app = createApp({ serveWeb: false });
    expect((await request(app).get("/api/news?page=0")).body.error.code).toBe(
      "VALIDATION_ERROR",
    );
    expect((await request(app).get("/api/not-found")).body.error.code).toBe(
      "NOT_FOUND",
    );
    expect((await request(app).get("/api")).body.error.code).toBe("NOT_FOUND");
    expect((await request(app).get("/news?page=0")).status).toBe(404);
  });
  it("lets the web service own SPA routes even if standalone static serving is enabled", async () => {
    vi.stubEnv("SERVE_WEB", "true");
    const response = await request(createApp({ serveWeb: false })).get(
      "/bangladesh",
    );
    expect(response.status).toBe(404);
    expect(response.text).not.toContain('<div id="root">');
  });
  it("accepts deployment-specific Vercel origins without opening CORS to other previews", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("WEB_ORIGIN", "https://techspill.example");
    vi.stubEnv("VERCEL_URL", "techspill-deployment.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "techspill-git-main.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "techspill.vercel.app");
    const app = createApp({ serveWeb: false });
    for (const origin of [
      "https://techspill.example",
      "https://techspill-deployment.vercel.app",
      "https://techspill-git-main.vercel.app",
      "https://techspill.vercel.app",
    ]) {
      const response = await request(app)
        .get("/api/unknown")
        .set("Origin", origin);
      expect(response.status).toBe(404);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
    }
    expect(
      (
        await request(app)
          .get("/api/unknown")
          .set("Origin", "https://unrelated.vercel.app")
      ).status,
    ).toBe(403);
  });
  it("ignores Vercel hostname variables outside the Vercel environment", async () => {
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("VERCEL_URL", "other.vercel.app");
    expect(
      (
        await request(createApp())
          .get("/api/unknown")
          .set("Origin", "https://other.vercel.app")
      ).status,
    ).toBe(403);
  });
});
