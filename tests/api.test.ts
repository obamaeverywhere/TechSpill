import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../apps/api/src/app";
import { db } from "@techpulse/db";
process.env.NODE_ENV = "test";
const app = createApp();
afterAll(() => db.$disconnect());
describe("API boundary validation", () => {
  it.each([
    "/api/news?page=0",
    "/api/news?limit=1000",
    "/api/news?sort=views",
    "/api/search?from=oops",
    "/api/news?source[x]=oops",
  ])("rejects invalid query %s before accessing storage", async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("returns consistent 404 errors", async () => {
    const response = await request(app).get("/api/unknown");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
  it("does not expose an administrative collection endpoint", async () => {
    expect((await request(app).post("/api/collect")).status).toBe(404);
  });
  it("restricts CORS to configured frontend origins", async () => {
    expect(
      (
        await request(app)
          .get("/api/health")
          .set("Origin", "https://untrusted.example")
      ).status,
    ).toBe(403);
  });
});
