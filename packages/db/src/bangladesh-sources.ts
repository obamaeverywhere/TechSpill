// Verified against live publisher feeds on 2026-10-30. No website scraping adapters.
// Only feed-supplied headline/link metadata is enabled; excerpts and image reuse are off.
const verifiedAt = new Date("2026-10-30T00:00:00Z");
const base = {
  scope: "BANGLADESH" as const,
  sourceKind: "EDITORIAL" as const,
  allowImages: false,
  allowExcerpts: false,
  minPollMinutes: 10,
  verifiedAt,
};
export const BANGLADESH_SOURCES = [
  {
    ...base,
    slug: "future-startup",
    name: "Future Startup",
    websiteUrl: "https://futurestartup.com",
    feedUrl: "https://futurestartup.com/feed/",
    color: "#17684e",
    enabled: true,
    verificationStatus: "VERIFIED_RSS",
    collectionNotes:
      "Current official RSS. Headline/link reader only; no republication license established for excerpts or images.",
  },
  {
    ...base,
    slug: "daily-star-tech",
    name: "The Daily Star",
    websiteUrl: "https://www.thedailystar.net/news/technology",
    feedUrl: "https://www.thedailystar.net/news/technology/rss.xml",
    color: "#dc343b",
    enabled: true,
    verificationStatus: "VERIFIED_RSS",
    collectionNotes:
      "Current technology RSS, including nested headline markup. Main rss.xml is stale and is not used. Excerpts/images disabled.",
  },
  {
    ...base,
    slug: "tbs-tech",
    name: "The Business Standard",
    websiteUrl: "https://www.tbsnews.net/tech",
    feedUrl: "https://www.tbsnews.net/tech/rss.xml",
    color: "#da363b",
    enabled: true,
    verificationStatus: "VERIFIED_RSS",
    collectionNotes:
      "Tech feed advertised by the publisher RSS directory. Main and Bangla feeds are stale; neither is collected. Robots crawl-delay 10s; one feed request per source interval.",
  },
  {
    ...base,
    slug: "dhaka-tribune-tech",
    name: "Dhaka Tribune",
    websiteUrl: "https://www.dhakatribune.com/feature/tech",
    feedUrl: "https://www.dhakatribune.com/feed/",
    color: "#b42631",
    enabled: true,
    verificationStatus: "VERIFIED_RSS",
    collectionNotes:
      "Current RSS explicitly advertised on the technology page; trailing slash required. General feed is strictly classified. No /api/ scraping.",
  },
  {
    ...base,
    slug: "prothom-alo-tech",
    name: "প্রথম আলো",
    websiteUrl: "https://www.prothomalo.com/topic/প্রযুক্তি",
    feedUrl: "https://www.prothomalo.com/stories.rss",
    color: "#d82631",
    enabled: true,
    verificationStatus: "VERIFIED_RSS",
    collectionNotes:
      "Official /feed redirects to current Bengali stories.rss. General feed: only accepted technology developments appear. Full feed body and images are not republished.",
  },
  {
    ...base,
    slug: "techshohor",
    name: "টেকশহর",
    websiteUrl: "https://techshohor.com",
    feedUrl: "https://techshohor.com/feed/",
    color: "#279144",
    enabled: true,
    verificationStatus: "VERIFIED_RSS",
    collectionNotes:
      "Current Bengali technology RSS verified, including explicit Bangladesh telecom developments. Headline/link metadata only; excerpts and images disabled.",
  },
  {
    ...base,
    sourceKind: "OFFICIAL" as const,
    slug: "ict-division",
    name: "Bangladesh ICT Division",
    websiteUrl: "https://ictd.gov.bd",
    feedUrl: null,
    color: "#296d4a",
    enabled: false,
    verificationStatus: "NO_VERIFIED_ENDPOINT",
    collectionNotes:
      "Public website inspected; no documented public RSS/Atom or collection API verified. Website scraping is disabled.",
  },
  {
    ...base,
    sourceKind: "OFFICIAL" as const,
    slug: "btrc",
    name: "BTRC",
    websiteUrl: "https://btrc.gov.bd",
    feedUrl: null,
    color: "#246757",
    enabled: false,
    verificationStatus: "UNAVAILABLE",
    collectionNotes:
      "Source check failed TLS certificate validation. No verified public feed/API. TLS checks are never bypassed.",
  },
  {
    ...base,
    sourceKind: "AGGREGATOR" as const,
    slug: "gnews-bangladesh",
    name: "GNews · Bangladesh",
    websiteUrl: "https://gnews.io",
    feedUrl: "https://gnews.io/api/v4/search",
    adapter: "gnews-bd",
    color: "#4a78bb",
    enabled: false,
    minPollMinutes: 60,
    verificationStatus: "LICENSE_REQUIRED",
    collectionNotes:
      "Optional documented licensed search API. Requires GNEWS_API_KEY, permission review and explicit enablement. English/Bengali requests share daily quota.",
  },
];
