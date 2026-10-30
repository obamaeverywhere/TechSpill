import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
const envDir = resolve(import.meta.dirname, "../..");
export default defineConfig(({ mode }) => ({
  envDir,
  plugins: [react(), tailwind()],
  server: {
    port: 5173,
    proxy: {
      "/api":
        loadEnv(mode, envDir, "API_").API_PROXY_TARGET ||
        "http://localhost:4000",
    },
  },
  build: { sourcemap: false },
}));
