import { defineConfig } from "vitest/config";
const shared = { setupFiles: ["./tests/setup.ts"], testTimeout: 20000 };
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          ...shared,
          name: "server",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          ...shared,
          name: "web",
          include: ["tests/**/*.test.tsx"],
          environment: "jsdom",
        },
      },
    ],
  },
});
