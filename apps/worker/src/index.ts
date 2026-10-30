import "dotenv/config";
import cron from "node-cron";
import pino from "pino";
import { db } from "@techpulse/db";
import { collectAll } from "./jobs/collect.js";
import { validateEnvironment } from "@techpulse/shared/environment";
validateEnvironment("worker");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const schedule = process.env.COLLECTION_CRON || "*/10 * * * *";
if (!cron.validate(schedule)) throw new Error("Invalid COLLECTION_CRON");
let active: Promise<unknown> | null = null;
const run = () =>
  (active ??= collectAll()
    .catch(() => {
      logger.error("Collection failed; next scheduled run will retry");
      process.exitCode = process.argv.includes("--once") ? 1 : undefined;
    })
    .finally(() => {
      active = null;
    }));
await run();
if (process.argv.includes("--once")) await db.$disconnect();
else {
  const task = cron.schedule(
    schedule,
    () => {
      void run();
    },
    { timezone: "UTC", noOverlap: true },
  );
  logger.info({ schedule }, "TechSpill worker running");
  const stop = async () => {
    await task.stop();
    await active;
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
