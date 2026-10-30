import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  noExternal: ["@techpulse/shared", "@techpulse/db"],
  external: ["@prisma/client", "dotenv", "dotenv/config", "zod"],
  outDir: "dist",
  clean: true,
  sourcemap: true,
});
