# Deployment

For the Bangladesh extension, deploy the API and worker from the same updated release. Stop old workers before migrating/seeding new source registrations, then restart after `npm run db:migrate`, `npm run db:seed` and the optional `npm run bd:review -- backfill`. The existing service topology is unchanged; see [BANGLADESH.md](BANGLADESH.md) for verified sources and review commands.

TechSpill requires PostgreSQL, an API process and a persistent background worker. The frontend is static and can be served by the API or by a separate CDN. Provision only after reviewing the included configuration and source policies.

## Docker Compose

Install Docker with Compose v2. Choose a strong URL-safe database password (or percent-encode special characters when constructing `DATABASE_URL`). Set the public frontend origin if using a domain.

```bash
export POSTGRES_PASSWORD='replace-with-a-strong-unique-url-safe-password'
export WEB_ORIGIN='http://localhost:4000'
docker compose up --build -d
docker compose ps
docker compose logs -f worker
```

Open http://localhost:4000. PostgreSQL uses a named volume and is not published on a host port. The migration service runs `prisma migrate deploy`; the API and worker wait for it to finish. The worker initializes the source/category catalog, collects on startup, then checks its schedule. All long-running services restart unless explicitly stopped.

Use a TLS reverse proxy and set `WEB_ORIGIN` to the exact HTTPS origin for internet-facing deployments. Set `TRUST_PROXY_HOPS` to the actual proxy count rather than trusting arbitrary forwarded client headers. Keep secrets in the platform secret store. The image retains development tooling so the migration CLI is available; it runs as the non-root `node` user. A future size optimization can separate migration tooling from runtime images without changing the architecture.

```bash
docker compose exec worker node scripts/check-worker.mjs
docker compose exec api node -e "fetch('http://localhost:4000/api/health').then(r=>r.json()).then(console.log)"
docker compose stop worker  # reader keeps serving persisted articles
docker compose start worker
```

Never run `docker compose down -v` against a database you need to preserve. Use the database provider’s backup/restore tools before applying schema changes.

## Render blueprint

`render.yaml` defines a managed database, Docker web service, and Docker background worker. The selected plans create paid resources; review current provider options and prices before applying the blueprint. Plan names and provider capabilities can change.

1. Push this repository to your own Git provider and create a Render Blueprint from it.
2. Set `WEB_ORIGIN` to the API service’s final HTTPS URL when serving the frontend there. For a separate frontend, include that exact frontend origin instead. The blueprint wires `DATABASE_URL` into both processes. Configure provider secrets through Render’s environment settings.
3. Deploy the API first so its `preDeployCommand: npm run db:migrate` finishes, then deploy/restart the worker. Both services use the same image and different startup commands. If a first worker run starts before migrations, it logs failure and retries on the next schedule; restart it after migrations for an immediate eligible pass.
4. Check `/api/health`, worker logs, and `/sources`. Allow the initial collection to complete. Do not configure an upstream-collection endpoint or use browser requests as a scheduler.

The API health endpoint returns 200 when PostgreSQL is reachable and 503 when it is unavailable. Collection freshness is separately exposed as `data.collection.stale`; monitor this field and `lastStatus`, since API readiness alone does not prove successful news collection.

## Railway or another persistent process host

Deploy the Dockerfile as two services. Start the API with `node apps/api/dist/index.js`; start the worker with `node apps/worker/dist/index.js`. Both receive the same PostgreSQL URL. Apply `npm run db:migrate` as a release job before starting the new worker. Set `SERVE_WEB=true` on the API if it also serves the Vite bundle. Set restart policies for both services.

If a provider assigns `PORT`, Express respects it. Use a pooled, TLS-protected database connection string as required by the database provider. Keep worker concurrency conservative to avoid exceeding small database connection limits. Multiple worker instances are supported for failover through the database lease, not for parallel collection of the same schedule.

## Optional Vercel frontend

Vercel hosts only `apps/web`; the Express API and scheduled worker still need persistent services elsewhere.

1. Select `apps/web` as the project root and enable access to repository files outside that root for npm workspaces.
2. The included `vercel.json` builds the web workspace from the repository root, publishes `dist`, and rewrites client routes to `index.html`.
3. Set `VITE_API_URL=https://your-api-origin.example` before building. It must not include `/api`.
4. Add the exact deployed frontend origin to the API’s `WEB_ORIGIN`. Preview deployments require their own explicit origin entries if they need API access.
5. Do not deploy the node-cron worker as a Vercel function. It must keep running while all browser windows are closed.

## Migrations and operations

- Use `npm run db:migrate` (`prisma migrate deploy`) for committed migrations. Do not use `db push` or `migrate dev` on production.
- The database user needs permission to enable `pg_trgm`. On a restricted managed service, have its administrator enable the extension before the index migration.
- Seed only creates/updates catalog metadata; the worker also initializes missing catalog rows. Collection permissions and source enable/disable choices are preserved on later starts.
- Database timestamps use `TIMESTAMPTZ`; schedule calculations use UTC. Localized display dates are formatted by the browser. Keep host clocks synchronized for lease renewal.
- Excerpt and image policy changes take effect on later changed responses. If content rights are revoked, use a reviewed database maintenance transaction to remove historical material as well as changing the source policy.
- On worker crash, another instance can acquire the lease after 120 seconds. Do not delete an active lease to force an overlapping run. The next healthy worker reconciles stale running job records.
- Back up PostgreSQL, exercise restores, and use point-in-time recovery when available. The ignored local development cluster is not a production backup strategy.

## Monitoring

1. Alert if `/api/health` is non-200, `collection.stale` is true, or repeated job status is `failed`/`partial`.
2. Run `node scripts/check-worker.mjs` as a worker health check. Adjust `WORKER_STALE_MINUTES` when increasing the cron interval. This checks liveness; separately monitor successful source requests for data freshness.
3. Forward JSON logs to the platform log collector. Track source failure rates, received/rejected counts, duration, source `nextPollAt`, database connection saturation, and API latency.
4. Choose a retention period for collection logs and articles, and run controlled maintenance jobs appropriate to your use. Ranking currently scans stored articles and conservative clustering checks a bounded set of recent clusters, so add retention or incremental ranking before operating at very large volumes.
5. Keep source terms, image references, API quotas, Node dependencies and the container base image under regular review. Production load testing, provider-specific deployments and paid GNews integration require the target infrastructure and credentials and are not claimed by local verification.
