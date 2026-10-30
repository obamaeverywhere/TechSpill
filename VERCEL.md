# Vercel Services deployment

The repository root `vercel.json` deploys one Vite frontend, one Express API, and the private news collector as a Vercel daemon. It replaces the earlier frontend-only deployment instructions for a unified project.

## Proposed topology for confirmation

| Name     | Kind                     | Source                   | Public traffic            | Calls                                           |
| -------- | ------------------------ | ------------------------ | ------------------------- | ----------------------------------------------- |
| `web`    | Vite static service      | `apps/web`               | `/` and all non-API paths | The browser fetches same-origin `/api/*`        |
| `api`    | Express function service | `apps/api`               | `/api` and `/api/*`       | PostgreSQL via `DATABASE_URL`                   |
| `worker` | Private container daemon | Root `Dockerfile.worker` | None                      | PostgreSQL and original publisher/provider APIs |

There is no root frontend named `app`; the repository root is an npm workspace, not a second Vite application. The proposed daemon has one instance in `iad1`, 1 GiB memory, and a 120-second shutdown grace period. Confirm the service names, public routes, and region before deploying; place the API/worker near your database.

## Bindings and request paths

No bindings are declared because no server-side service calls another service over HTTP. The Vite frontend is static: its API requests originate in the reader's browser and go through the public `/api` rewrite. The API and worker access PostgreSQL directly; a database connection string is not a Vercel service binding. The worker does not call the API.

A runtime binding cannot be substituted for `VITE_API_URL`: Vite embeds `VITE_*` values into public JavaScript at build time, whereas Vercel bindings resolve only inside runtime functions/daemons. Leave `VITE_API_URL` empty for this topology. If a future function calls another service, declare a binding on that calling service with all four fields (`type: "service"`, `service`, `format: "url"`, and `env`), then read the injected URL server-side; never assign that URL yourself.

Service rewrites preserve the original path. `/api/news/bangladesh` reaches Express as `/api/news/bangladesh`; no prefix stripping or second `/api` prefix is needed. The bare `/api` rewrite also reaches Express and returns its JSON 404. Unknown API routes do not fall through to the SPA. The web service's extensionless SPA fallback excludes Vite development modules as well as static files and supports `/bangladesh`, `/trending`, `/saved`, and `/sources` while preserving JS/CSS, favicon, and the pre-paint theme script.

`apps/api/app.ts` is the Vercel Express entrypoint and exports the shared application without opening a listener or installing process shutdown handlers. It explicitly disables static frontend serving. `src/index.ts` remains the standalone/container entrypoint; both are built under stable names in `apps/api/dist/`.

## Environment and database setup

1. Import this Git repository into **one Vercel project**, with the project root set to the repository root (`.`). Clear inherited project-level framework/build/output overrides; build settings belong to the individual services. npm workspaces and the root lockfile supply dependencies to each service.
2. Provision a managed PostgreSQL database outside the runtime filesystem. Set the project's `DATABASE_URL` to its TLS/pooler URL, with conservative provider-appropriate connection limits. The API and worker share this value. Do not copy the local development database URL into cloud settings.
3. Before promoting the first release, run `npm ci`, `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` against that target database from a controlled release environment. The migrations require `pg_trgm`. If the pooler cannot perform migrations, use the provider's direct database URL for the migration command. Builds and request handlers deliberately do not run migrations against shared production data.
4. Leave `SERVE_WEB=false` and `VITE_API_URL` unset/empty. Set `WEB_ORIGIN` to your exact custom HTTPS origin, or comma-separated custom origins. The API also accepts Vercel's injected deployment, branch, and production hostnames when running on Vercel; it does not accept arbitrary `*.vercel.app` origins. The dedicated Vercel entrypoint trusts its immediate platform ingress proxy (one hop); Vercel overwrites `X-Forwarded-For`. `TRUST_PROXY_HOPS` continues to configure the standalone/container entrypoint.
5. Configure the existing collector variables as needed: `COLLECTION_CRON`, timeouts, concurrency, quotas, and optional licensed `GNEWS_API_KEY`. Keep secrets outside `VITE_*`. Environment settings are shared by the deployment; `VITE_*` values are public by design.
6. Promote only after reviewing the topology. The daemon runs in production, collects on startup, then follows the existing UTC cron schedule. Its Dockerfile builds only the worker, generates Prisma, prunes development dependencies, and runs as a non-root user. It has no HTTP ingress and does not require an API binding. Stop an older external collector during cutover; the database lease also prevents overlapping collection.

Vercel daemons currently run only in production, not previews. Give previews a separate database and, if news is needed, populate it with a controlled one-off collector run. Do not point untrusted previews at production data. The daemon has ongoing provisioned-memory usage even when waiting; review your plan's quotas before promoting.

## Local verification

Use a CLI version that supports `services` and `daemons` (this setup was checked with Vercel CLI 65.8.0):

```bash
npm ci
npm run db:generate
# Start PostgreSQL and apply migrations if this is a fresh local database.
npx vercel@65.8.0 dev --local --listen 127.0.0.1:3100
```

`--local` (`-L`) avoids linking or creating a cloud project. Without it, `vercel dev` uses your linked project's settings. Vercel starts the web and API together and owns the public router; it does **not** run daemons locally. Keep the existing local worker running, or test the container separately:

```bash
docker build -f Dockerfile.worker -t techspill-worker .
# DATABASE_URL in this file must be reachable from inside the container.
docker run --rm --env-file /path/to/worker-runtime.env techspill-worker
```

The ordinary `npm run dev`/Compose workflows retain their existing localhost proxy and health checks. Those are local/standalone paths, not service-to-service traffic in a Vercel deployment.

```bash
npm test
npm run build
node scripts/verify-browser.mjs http://127.0.0.1:3100
node scripts/verify-bangladesh-browser.mjs http://127.0.0.1:3100
node scripts/verify-techspill-browser.mjs http://127.0.0.1:3100
```

Check `/api/health` for database connectivity and collection freshness, then `/sources` and `/bangladesh`. The existing in-process cache and rate limiter apply per function instance; enforce any deployment-wide limits at Vercel's edge or with a shared store if needed.

The nested `apps/web/vercel.json` remains an alternative for an intentionally frontend-only Vercel project pointing at an externally hosted API; it is not the routing owner in the root services deployment.

Official references: [Services](https://vercel.com/docs/services), [routing](https://vercel.com/docs/services/routing), [bindings](https://vercel.com/docs/services/bindings), [Express](https://vercel.com/docs/frameworks/backend/express), and [daemons](https://vercel.com/docs/daemons).

## Local verification on 30 October 2026

- Root and frontend-only configurations passed the published Vercel JSON schema.
- Production build, TypeScript, formatting, and 84 unit/API/UI tests passed. Database integration tests were not rerun for this configuration change.
- Vercel CLI 65.8.0 `vercel dev --local` detected both services and served the real API/database and Vite frontend together on port 3100.
- All three browser suites passed through that router, including 11 real accepted Bangladesh stories, search, combined filters, pagination, saved preferences, Bengali rendering, 20 responsive route/viewport combinations, and 50 contrast combinations.
- The worker bundle built successfully, and Prisma generation succeeded in an isolated directory without a database URL or connection.
- Docker is not installed in the verification environment, so the daemon image was not built or run. No cloud project was provisioned or deployed. Service topology and the proposed daemon region/resources await confirmation before publication.
