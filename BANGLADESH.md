# Bangladesh Tech extension

TechSpill now has a dedicated `/bangladesh` reader backed by the existing PostgreSQL database, Express API and singleton background worker. The global routes, bookmarks and themes continue to use their existing components. No second scheduler or separate backend is introduced.

## Run or upgrade

For an existing deployment, stop old API/worker processes before applying migrations and enabling the new source catalog. Restart both from the same updated release so an old worker does not encounter newly registered adapters it does not know about.

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run bd:review -- backfill
npm run dev
```

Keep your PostgreSQL service running. For the included local development database, use `npm run db:local` in another terminal if it is not already running. Open **http://localhost:5173/bangladesh**. `npm run collect` performs an eligible collection pass; browser refreshes only read persisted data.

For production, run `npm run build`, then start the existing API and worker services. With `SERVE_WEB=true` and the correct `WEB_ORIGIN`, the API serves the built reader at `/bangladesh`. The existing Compose/Render setup supports the extension; the image now also includes the shell administration scripts. Cloud resources and container deployment still require the target environment.

## Source verification, 30 October 2026

The checks used actual publisher responses, feed metadata, advertised RSS links, robots policies and available reuse notices. A reachable homepage was not treated as proof of a working feed. No private or undocumented website API is used.

| Source                    | Selected delivery method                                                                                             | Result and scope                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Future Startup            | [Official RSS](https://futurestartup.com/feed/)                                                                      | Enabled. Ten valid items in the initial response; newest publication 29 October. English business/technology mix is classified, not accepted wholesale.                                                                         |
| The Daily Star            | [Technology RSS](https://www.thedailystar.net/news/technology/rss.xml)                                               | Enabled. Current topic feed, newest checked item 28 October. Its headlines contain nested links, now supported by the shared RSS parser. The stale/malformed main feed is not used.                                             |
| The Business Standard     | [Tech RSS](https://www.tbsnews.net/tech/rss.xml), advertised in its [RSS directory](https://www.tbsnews.net/tbs-rss) | Enabled. Current topic feed, newest checked item 30 October. Main RSS and Bangla RSS snapshots were stale; neither is collected. Requests respect its 10-second crawl delay, including retries.                                 |
| Dhaka Tribune             | [Advertised RSS](https://www.dhakatribune.com/feed/)                                                                 | Enabled. RSS is advertised on its technology page; the trailing slash is required. The current general feed is classified strictly. Its disallowed `/api/` path is never accessed.                                              |
| Prothom Alo               | [Publisher RSS](https://www.prothomalo.com/stories.rss)                                                              | Enabled. `/feed` redirects to this current Bengali feed. The general feed contains substantial non-technology coverage; only accepted candidates appear publicly. No working dedicated technology RSS route was confirmed.      |
| TechShohor / টেকশহর       | [Technology RSS](https://techshohor.com/feed/)                                                                       | Enabled. Additional Bengali technology source; newest checked publication 27 October. The initial pass produced four accepted Bengali stories.                                                                                  |
| ICT Division              | [Official website](https://ictd.gov.bd)                                                                              | Disabled. No documented, usable RSS/Atom feed or public collection API was verified. No website scraper is substituted.                                                                                                         |
| BTRC                      | [Official website](https://btrc.gov.bd)                                                                              | Disabled. Source check failed certificate validation; no verified collection endpoint. TLS validation is not bypassed.                                                                                                          |
| Optional GNews Bangladesh | [Documented search API](https://docs.gnews.io/endpoints/search-endpoint)                                             | Disabled until a licensed key and explicit enablement. Uses a Bangladesh-topic query and the same relevance checks. Provider country filters describe publication location, so they are not used as proof of article relevance. |

Public RSS delivery is used for a metadata reader, not as evidence of a blanket republication license. No commercial redistribution license for excerpts or images was established by these checks. All new sources therefore default to **no stored excerpts and no image reuse**. Full RSS article bodies are not retained. Review publisher terms and your intended distribution before changing those policies or launching a public service.

Sources and notes are configured in `packages/db/src/bangladesh-sources.ts`. Unavailable sources have a null feed URL rather than a guessed endpoint. The HTTP allowlist contains only verified publisher hosts. Source identities do not supply a country or relevance score to the classifier.

## Classification and public visibility

`apps/worker/src/processors/bangladesh.ts` exports the versioned rules classifier and its typed result. Its two checks are independent:

1. Technology-industry evidence: concrete domain terms, or startup funding with non-technology business exclusions.
2. Direct Bangladesh evidence: a material development connected within a headline or metadata sentence to an explicit geographic reference or a narrowly defined local institution.

The rules inspect the headline plus a bounded leading portion of available feed text, rather than a publisher's nationality or its footer. English and Bengali patterns cover local place names, technology terms, material actions and selected institutions. Ambiguous phrases such as “দেশে” do not establish which country is meant. Generic Bengali words such as “বিকাশ” (development) and “নগদ” (cash) are not sufficient fintech evidence.

Automatic acceptance requires a technology score of at least 70 and a Bangladesh score of at least 85. Uncertain cases receive `NEEDS_REVIEW`; irrelevant cases receive `REJECTED`. These numbers represent rule evidence strength, not calibrated probabilities or independent fact verification. The reason records which domain, local reference and development signal supported a decision.

The existing `Article` table now includes country-code arrays, two relevance scores, classification status/reason/version/date, manual review state, a content-kind disclosure, regional trending score and normalized search metadata. Categories reuse the existing category/join tables with a separate `BANGLADESH` scope and `bd-` database slug prefix. Publication and collection timestamps remain timezone-aware UTC values. The original title and stored permitted description are preserved; no article translation is implemented.

Only `ACCEPTED` articles with `BD` in `countryCodes` are returned by Bangladesh endpoints. Valid rejected/review candidates from regional feeds are stored privately for review, and are excluded from global lists, bookmark lookups and article-detail routes. Original global-source articles retain their existing global visibility regardless of their Bangladesh assessment. Accepted regional articles may also appear in the global reader, so relevance is not modeled as an exclusive global-versus-local choice.

Official announcements, company press releases, disclosed sponsored material and publisher-labelled brand stories have separate content labels. Source editorial status does not mean the reporting has been independently verified. Unknown disclosures cannot be inferred. Brand stories and official/company announcements do not add to independent reporting coverage in the regional ranking.

The classifier is heuristic: it can miss implicit local context and can misunderstand complex language. The public feed is deliberately conservative. Human review can accept, exclude or correct categories, with an explicit reason. A future classifier can replace or supplement this isolated processing module while preserving the result schema and review boundary.

## API

All routes use the existing error envelope, input validation, source attribution and pagination format:

```text
GET /api/news/bangladesh
GET /api/news/bangladesh/latest
GET /api/news/bangladesh/trending
GET /api/news/bangladesh/categories
GET /api/news/bangladesh/sources
```

They are registered before `/api/news/:id`. The source endpoint includes configured regional sources, their availability notes, and any global source that has accepted Bangladesh coverage. Its article counts and language facets use public regional articles, not private candidates.

| Parameter            | Values                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`             | English or Bengali keyword text, up to 200 characters                                                                                                                      |
| `category`           | `startups`, `ai`, `software`, `telecom`, `fintech`, `cybersecurity`, `government-ict`, `investments`, `innovation`, `gadgets`, `events`; comma-separated categories use OR |
| `source`             | One or more comma-separated source slugs                                                                                                                                   |
| `language`           | `en` or `bn`; omit for all languages                                                                                                                                       |
| `dateFrom`, `dateTo` | Date-only `YYYY-MM-DD` values use Asia/Dhaka day boundaries; ISO timestamps with explicit timezone are also supported                                                      |
| `sort`               | `newest` (default) or `trending`                                                                                                                                           |
| `page`, `limit`      | Default 1 and 12; limit up to 50                                                                                                                                           |

```bash
curl 'http://localhost:4000/api/news/bangladesh?category=fintech&sort=newest'
curl --get 'http://localhost:4000/api/news/bangladesh' --data-urlencode 'search=প্রযুক্তি' --data 'language=bn'
```

An empty category returns an empty list, not generated substitute headlines. Dates displayed in the regional page use **Asia/Dhaka (UTC+6)** regardless of the viewer's device timezone. Existing global filters retain their current names and behavior.

Search uses indexed PostgreSQL substring matching, including NFC-normalized metadata, alongside the existing title, permitted-description and tag matching. This supports tested literal English/Bengali queries and canonical Unicode forms. It does not provide Bengali semantic search, stemming, transliteration or translation. GIN trigram indexes and regional status/country/date/ranking indexes support the queries; custom partial indexes are maintained in SQL migrations and must be preserved in later schema work.

## Collection and ranking

The same worker and PostgreSQL lease collect all sources with bounded concurrency, timeouts, retries, conditional requests, source intervals and failure logs. Regional sources default to a ten-minute minimum polling interval, within the requested 10–15 minute starting range. Change individual intervals with the existing source CLI. If choosing 15-minute intervals, use an appropriate shared cron tick (for example every five minutes) so due checks do not wait for a later ten-minute boundary; publisher minimums remain enforced.

`CollectionLog` now distinguishes regional accepted, rejected and review counts from malformed-data rejections. Expected relevance rejection does not mark an otherwise healthy feed as failed. The visible last check comes from an actual successful source request, including a valid 304 response. Frontend polling never starts collection.

The regional ranking is:

```text
70 × exp(-ageHours / 48)
+ 30 × min(1, log2(max(1, distinct reporting publisher hosts)) / 3)
```

Coverage includes accepted regional reporting, deduplicated by original URL host. HN/aggregator links to the same publisher do not count twice. Hostnames are a coverage proxy, not proof of separate corporate ownership. No views, likes or shares are inferred. Original global ranking remains unchanged. Identical or highly similar headline clusters reuse the existing grouping infrastructure; Bengali combining marks are now retained in tokenization.

For the optional licensed API:

```bash
# Set backend GNEWS_API_KEY in your secret store, then:
npm run source:configure -- gnews-bangladesh --enabled=true
```

`GNEWS_BD_LANGUAGE=en` is the default; the documented provider also supports `bn`. Set it before starting/restarting the worker. Global and regional GNews collection share `GNEWS_DAILY_REQUEST_LIMIT` (24 by default). Provider calls disable hidden HTTP retries so one logged request attempt cannot multiply into extra quota usage. RSS requests retain bounded exponential retries. No key is exposed to the browser, and no live GNews call was made without a licensed key.

## Administrative tools

These commands run from an authenticated deployment shell with database access. There is no public administrative HTTP endpoint.

```bash
npm run bd:review -- list
npm run bd:review -- failures
npm run bd:review -- backfill
npm run bd:review -- accept ARTICLE_ID --reason='Review confirms a specific local technology launch.' --categories=ai,software
npm run bd:review -- reject ARTICLE_ID --reason='Review finds no material Bangladesh technology development.'
npm run bd:review -- review ARTICLE_ID --reason='Local connection needs further source confirmation.'
npm run bd:review -- unlock ARTICLE_ID
npm run source:configure -- tbs-tech --enabled=false
npm run source:configure -- future-startup --min-poll-minutes=15
```

Review reasons are public for accepted articles; do not put private notes in them. Accept/reject/review decisions are locked against automatic ingestion updates until explicitly unlocked. `--categories` corrects the regional category assignments. Backfill only handles unassessed/outdated, unlocked records and uses retained metadata; it does not refetch article bodies or downgrade current classifications merely because permitted excerpts are absent. It preserves publication times, IDs, original attribution, other country codes and global categories. Allow up to ten seconds for API caches to expire after administrative changes.

Source policy updates clear HTTP validators but preserve the next permitted polling time. After changing classification rules/version, refresh validators through source configuration to reprocess the next eligible feed response with its richer metadata. Unverified sources cannot be enabled until a verified endpoint and allowlisted adapter are supplied. When rights are revoked, remove historical excerpts/images through controlled database maintenance as well as changing future collection flags.

## Verification

```bash
npm test
npm run test:integration
npm run build
npm run test:browser:bd -- http://localhost:5173
npm run test:browser -- http://localhost:5173
```

Use an isolated migrated test database and stop workers for integration tests. The integration command runs the global and regional suites sequentially because both exercise the singleton lease. Browser checks use system Chrome and real collected records; no fixture news is seeded into the reader. Screenshots are saved under ignored `test-results/bangladesh-*.png`.

The first live regional pass received 224 valid candidates from six verified feeds and automatically accepted 11 (seven English, four Bengali). This is a snapshot, not a hardcoded result. The reader displayed no automatic articles from the two unavailable official sources. All 164 article IDs present before the extension were recorded for a preservation check. Current results and remaining infrastructure limits are recorded in `VERIFICATION.md`.
