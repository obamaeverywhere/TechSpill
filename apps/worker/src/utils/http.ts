import { setTimeout as delay } from "node:timers/promises";

const HOSTS = new Set([
  "techcrunch.com",
  "www.techcrunch.com",
  "www.theverge.com",
  "theverge.com",
  "feeds.arstechnica.com",
  "arstechnica.com",
  "www.wired.com",
  "wired.com",
  "www.engadget.com",
  "engadget.com",
  "hacker-news.firebaseio.com",
  "gnews.io",
  "futurestartup.com",
  "www.futurestartup.com",
  "www.thedailystar.net",
  "thedailystar.net",
  "www.tbsnews.net",
  "tbsnews.net",
  "www.dhakatribune.com",
  "dhakatribune.com",
  "www.prothomalo.com",
  "prothomalo.com",
  "techshohor.com",
  "www.techshohor.com",
]);
export class HttpError extends Error {
  constructor(
    public status: number,
    public retryAfter: number | null = null,
  ) {
    super(`Upstream HTTP ${status}`);
  }
}
export function assertAllowed(url: string) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !HOSTS.has(u.hostname)
  )
    throw new Error("Blocked upstream URL");
}
export interface FetchResult {
  status: number;
  text: string;
  etag: string | null;
  lastModified: string | null;
  cacheSeconds: number | null;
}
function cacheSeconds(headers: Headers) {
  const maxAge = headers
    .get("cache-control")
    ?.match(/(?:s-maxage|max-age)=(\d+)/i)?.[1];
  const ttl = maxAge
    ? Number(maxAge) - Number(headers.get("age") || 0)
    : headers.has("expires")
      ? (Date.parse(headers.get("expires")!) - Date.now()) / 1000
      : null;
  return ttl !== null && Number.isFinite(ttl)
    ? Math.min(604800, Math.max(0, ttl))
    : null;
}
export async function fetchSource(
  url: string,
  headers: Record<string, string> = {},
  fetcher: typeof fetch = fetch,
  options: { maxRetries?: number } = {},
): Promise<FetchResult> {
  const retries = Math.min(
    3,
    Math.max(0, Number(options.maxRetries ?? process.env.FETCH_RETRIES ?? 2)),
  );
  for (let attempt = 0; ; attempt++) {
    try {
      let current = url;
      for (let redirects = 0; redirects <= 3; redirects++) {
        assertAllowed(current);
        const response = await fetcher(current, {
          headers: {
            "User-Agent": "TechSpill/1.0 (+metadata-only news reader)",
            Accept:
              "application/rss+xml, application/atom+xml, application/xml, application/json, text/xml",
            ...headers,
          },
          redirect: "manual",
          signal: AbortSignal.timeout(
            Number(process.env.FETCH_TIMEOUT_MS || 15000),
          ),
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const target = response.headers.get("location");
          await response.body?.cancel();
          if (!target || redirects === 3)
            throw new Error("Invalid upstream redirect");
          current = new URL(target, current).href;
          continue;
        }
        if (response.status === 304)
          return {
            status: 304,
            text: "",
            etag: response.headers.get("etag"),
            lastModified: response.headers.get("last-modified"),
            cacheSeconds: cacheSeconds(response.headers),
          };
        if (!response.ok) {
          const retry = response.headers.get("retry-after");
          await response.body?.cancel();
          const seconds = retry
            ? /^\d+$/.test(retry)
              ? Number(retry)
              : Math.max(0, (Date.parse(retry) - Date.now()) / 1000)
            : null;
          throw new HttpError(
            response.status,
            seconds !== null && Number.isFinite(seconds)
              ? Math.min(604800, seconds)
              : null,
          );
        }
        const reader = response.body?.getReader();
        let size = 0;
        const chunks: Uint8Array[] = [];
        if (reader)
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 3 * 1024 * 1024) {
              await reader.cancel();
              throw new Error("Feed exceeds 3 MB limit");
            }
            chunks.push(value);
          }
        return {
          status: response.status,
          text: Buffer.concat(chunks).toString("utf8"),
          etag: response.headers.get("etag"),
          lastModified: response.headers.get("last-modified"),
          cacheSeconds: cacheSeconds(response.headers),
        };
      }
      throw new Error("Too many redirects");
    } catch (error) {
      if (
        attempt >= retries ||
        (error instanceof HttpError &&
          ((error.status < 500 && error.status !== 429) ||
            error.retryAfter !== null)) ||
        (error instanceof Error &&
          /Blocked|exceeds|redirect/.test(error.message))
      )
        throw error;
      const retryBase = new URL(url).hostname.endsWith("tbsnews.net")
        ? 10000
        : 500;
      await delay(retryBase * 2 ** attempt + Math.random() * 100);
    }
  }
}
export async function mapBounded<T, R>(
  values: T[],
  concurrency: number,
  fn: (value: T) => Promise<R>,
): Promise<R[]> {
  let next = 0;
  const result: R[] = new Array(values.length);
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(concurrency, values.length)) },
      async () => {
        for (;;) {
          const index = next++;
          if (index >= values.length) break;
          result[index] = await fn(values[index]);
        }
      },
    ),
  );
  return result;
}
