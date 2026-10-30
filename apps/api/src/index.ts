import "dotenv/config";
import { createApp } from "./app.js";
import { db } from "@techpulse/db";
import { validateEnvironment } from "@techpulse/shared/environment";
validateEnvironment("api");
const port = Number(process.env.PORT || 4000);
const server = createApp().listen(port, "0.0.0.0", () =>
  console.log(`TechSpill API listening on http://localhost:${port}`),
);
const shutdown = () => {
  server.close(() => {
    void db.$disconnect().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
