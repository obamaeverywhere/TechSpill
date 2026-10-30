# Verification record

## Bangladesh extension — current verification

Verified on 30 October 2026 (Asia/Dhaka). The extension reuses the same API, worker, database and reader components.

| Check                                   | Result                                                                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript and production builds | API, worker and frontend pass                                                                                                                                                    |
| Unit/API-boundary/UI tests              | 69 passed, including English/Bengali relevance, ambiguous and non-technology cases, nested RSS headlines, Dhaka date bounds, disclosures and Unicode search metadata             |
| PostgreSQL integration tests            | 25 passed across the original global and new regional suites                                                                                                                     |
| Bangladesh browser flow                 | Real English/Bengali stories, source/topic/date/language/search filters, bookmarks across reload, sorting, pagination, disclosures, dark/light themes and mobile navigation pass |
| Global browser regression               | Existing search, filters, saved stories, pagination, source page, dialog, theme and keyboard flow pass                                                                           |
| Data preservation                       | All 164 pre-extension article IDs remain, with zero missing or changed source attributions                                                                                       |
| Database readiness                      | Eight committed migrations applied; original and new trigram indexes and regional partial indexes verified in PostgreSQL                                                         |
| Source collection                       | Six regional RSS feeds succeeded. First pass: 224 valid candidates, 11 automatically accepted (seven English, four Bengali)                                                      |
| Public visibility                       | Regional APIs return accepted `BD` technology records; uncertain/rejected regional candidates do not leak through detail, global-list or bookmark reads                          |
| Administration                          | Manual acceptance, exclusion and corrected categories survive repeat ingestion                                                                                                   |
| Production configuration                | Existing Compose and Render files validate against their JSON schemas; administration scripts are included in the container source                                               |

The enabled feeds are Future Startup, The Daily Star Technology, The Business Standard Tech, Dhaka Tribune, Prothom Alo and TechShohor. The initial Prothom Alo and Dhaka Tribune responses had no sufficiently evidenced local technology matches; no substitute headlines were inserted. ICT Division and BTRC remain disabled because no usable verified collection endpoint was established. GNews Bangladesh remains disabled without a licensed key. See [BANGLADESH.md](BANGLADESH.md) for exact endpoints, source limitations and policy settings.

The production API serves `/bangladesh` with the same security headers as the global reader, and the compiled worker runs independently on the existing UTC cron schedule. Article publication dates remain source-provided; regional display and date-only filtering use Asia/Dhaka. New-source excerpts and images remain disabled. Rule scores are evidence signals, not calibrated probabilities or independent fact verification.

Original global articles were classified from retained metadata without changing publication dates, article IDs, source identities or global category relations. Search uses indexed literal matching with Unicode normalization; Bengali semantic search, stemming and translation are not claimed. Test sources are temporary fixtures and are removed after verification, rather than seeded into the reader.

Docker execution and cloud deployment were not performed in this environment. Provider billing, publisher redistribution permissions, live licensed GNews access, load/failover testing and a formal security/accessibility audit remain target-environment checks.

## Original application baseline before the Bangladesh extension

Verified locally on **30 October 2026 (Asia/Dhaka)** with Node.js 22.22.1, Prisma 6.19.3, actual PostgreSQL 17, and system Google Chrome via Playwright Core.

### Completed checks

| Check                      | Result                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`        | Pass, strict TypeScript across apps and shared packages                                                                                            |
| `npm test`                 | 31 passed: 19 processing/upstream, 8 API boundary, 4 UI tests                                                                                      |
| `npm run test:integration` | 9 passed against PostgreSQL with mocked providers and temporary fixture sources                                                                    |
| Production builds          | API, worker and Vite builds succeed                                                                                                                |
| Built API runtime          | Starts from `apps/api/dist/index.js`; database health returns 200                                                                                  |
| Built worker runtime       | Starts from `apps/worker/dist/index.js`, obtains/releases its database lease and registers its schedule                                            |
| Production SPA routing     | `/` and direct `/saved` requests return 200                                                                                                        |
| Browser flow, development  | Search, combined topic/source/date filters, sorting, pagination, bookmark persistence/removal, themes, sources, dialog and keyboard shortcuts pass |
| Browser flow, production   | Same complete flow passes against the built app served through Express with Helmet headers                                                         |
| Mobile                     | 390px viewport has no horizontal overflow; closed navigation is inert; menu, Escape and route selection work                                       |
| Desktop                    | 1440px viewport renders real news, source statuses and calculated rankings without JavaScript page errors                                          |
| Deployment configuration   | Render and Compose YAML validate against their published JSON schemas                                                                              |

Integration coverage includes repeated ingestion without duplicates, tracking-URL deduplication, invalid data rejection, separate publisher attribution, combined search and filters, stable newest ordering, pagination, saved-ID filtering, failed-source logging, lease exclusion, and respecting a source's polling time near a cron boundary.

Production smoke testing found a dependency-bundling issue that development mode did not expose. The corrected tsup configs keep runtime dependencies external and bundle the workspace source. Both final Node entry points were run successfully. The frontend build explicitly selects production mode even when the shared local `.env` uses `NODE_ENV=development` for backend development.

### Live collection

The first complete live pass collected **154 real articles** from all six default sources, with no rejected records. Subsequent eligible passes updated existing records, honored HTTP conditional responses, and added new articles without duplicating the older records. At the production status snapshot, PostgreSQL contained **158 articles**:

| Source       | Articles | Result                               |
| ------------ | -------: | ------------------------------------ |
| TechCrunch   |       20 | Successful                           |
| The Verge    |       12 | Successful                           |
| Ars Technica |       20 | Successful                           |
| WIRED        |       51 | Successful                           |
| Engadget     |       20 | Successful                           |
| Hacker News  |       35 | Successful                           |
| GNews        |        0 | Disabled; no licensed key configured |

These are development snapshot counts, not fixed UI content. Headline, URL and date metadata came from live upstream responses. Test fixture articles are never seeded into the reader. Missing images use neutral artwork. Excerpts remain disabled in this setup. Unknown language and unmatched category values remain unknown/unclassified, and region filters are unavailable when feeds report no geographic coverage.

### Reproduce

After following the README and migrating PostgreSQL:

```bash
npm test
npm run test:integration
npm run build
```

Keep PostgreSQL running and start the built reader and worker in separate terminals:

```bash
SERVE_WEB=true WEB_ORIGIN=http://localhost:4000 npm run start:api
npm run start:worker
```

Run the optional browser checks in another terminal:

```bash
npm run test:browser -- http://localhost:4000
```

This requires Chrome at `/usr/bin/google-chrome`, or a `CHROME_PATH` override. Omit the final URL to test the Vite server on port 5173 instead. Screenshots are written to ignored `test-results/desktop.png`, `mobile.png`, `dark.png` and `sources.png`.

## Limits

Docker is not installed here, so image builds and Compose startup were not executed. Schema validation does not substitute for running a container deployment. No Render, Railway or Vercel resources were provisioned. GNews was not called without a licensed key. Load testing, database failover, publisher redistribution permissions, and a formal security/accessibility audit require review in the target environment.

Deployment fields were checked against the [Render Blueprint specification](https://render.com/docs/blueprint-spec) and [Vercel monorepo documentation](https://vercel.com/docs/monorepos). The application also runs independently of those providers.
