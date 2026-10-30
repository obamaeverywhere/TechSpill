import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const databaseDir = resolve(".local/postgres");
mkdirSync(resolve(".local"), { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "techpulse",
  password: "techpulse",
  port: 5432,
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1", "-k", resolve(".local")],
  onLog: () => {},
  onError: (message) => {
    if (String(message).includes("FATAL")) console.error(String(message));
  },
});
if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient("postgres");
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname='techpulse'",
);
if (!result.rowCount) await pg.createDatabase("techpulse");
await client.end();
console.log(
  "Local PostgreSQL ready at localhost:5432. Data persists in .local/postgres.",
);
console.log("Next: npm run db:migrate && npm run db:seed");
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
