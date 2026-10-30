import "dotenv/config";
import type { Express } from "express";
import { createApp } from "./src/app.js";
import { validateEnvironment } from "@techpulse/shared/environment";

// Vercel owns the HTTP listener and function lifecycle. The web service owns static files.
validateEnvironment("api");
const app: Express = createApp({ serveWeb: false });
// Vercel owns the immediate ingress proxy and overwrites X-Forwarded-For.
app.set("trust proxy", 1);
export default app;
