import { createHash } from "node:crypto";
import he from "he";
import { franc } from "franc-min";
import { incomingArticleSchema, type IncomingArticle } from "@techpulse/shared";
import { classifyBangladesh } from "./bangladesh.js";

export function plainText(value: unknown): string {
  return he
    .decode(String(value ?? ""))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function canonicalize(raw: string) {
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    throw new Error("Unsafe article URL");
  if (
    u.hostname === "localhost" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      u.hostname,
    ) ||
    u.hostname.includes(":") ||
    u.hostname.endsWith(".local")
  )
    throw new Error("Private article URL");
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$)/i.test(key))
      u.searchParams.delete(key);
  u.searchParams.sort();
  if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/+$/, "");
  return u.href;
}
export const RULES: Record<string, RegExp> = {
  "artificial-intelligence":
    /\b(ai|artificial intelligence|machine learning|llm|openai|anthropic|chatgpt|claude|neural|deep learning)\b/i,
  cybersecurity:
    /\b(cyber|cybersecurity|ransomware|malware|hacked|hacker|breach|vulnerability|phishing|encryption|privacy)\b/i,
  "software-development":
    /\b(developer|software|programming|github|javascript|python|rust|linux|open.source|coding|compiler|api)\b/i,
  "cloud-computing":
    /\b(cloud|aws|azure|kubernetes|data center|datacenter|serverless)\b/i,
  smartphones: /\b(smartphone|iphone|android|pixel|galaxy|mobile phone)\b/i,
  "consumer-electronics":
    /\b(earbuds|headphone|smartwatch|wearable|gadget|television|smart home|speaker|camera|tablet)\b/i,
  hardware:
    /\b(chip|chips|semiconductor|nvidia|amd|intel|gpu|cpu|processor|laptop|macbook|hardware|memory)\b/i,
  startups:
    /\b(startup|startups|funding|venture capital|seed round|series [a-f]|raises|accelerator)\b/i,
  "big-tech":
    /\b(apple|google|microsoft|amazon|meta|facebook|alphabet|antitrust|tiktok)\b/i,
  robotics: /\b(robot|robots|robotics|humanoid|automation|autonomous)\b/i,
  blockchain: /\b(blockchain|crypto|bitcoin|ethereum|web3|cryptocurrency)\b/i,
  gaming: /\b(gaming|game|games|playstation|xbox|nintendo|steam|esports)\b/i,
  "space-technology":
    /\b(spacex|nasa|satellite|rocket|spacecraft|orbital|space station)\b/i,
  "emerging-technologies":
    /\b(quantum|fusion|biotech|augmented reality|virtual reality|breakthrough|nanotechnology)\b/i,
};
export function categorize(title: string, metadata: string, rules = RULES) {
  const text = `${title} ${metadata}`;
  const matches = Object.entries(rules)
    .filter(([, r]) => r.test(text))
    .map(([slug]) => slug);
  return matches;
}
const TAGS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Apple",
  "Microsoft",
  "NVIDIA",
  "Amazon",
  "Meta",
  "SpaceX",
  "Samsung",
  "Linux",
  "AI",
  "Open source",
  "Cybersecurity",
  "Robotics",
  "Quantum",
];
export const fingerprint = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const titleTokens = (title: string) =>
  new Set(
    plainText(title)
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          ![
            "the",
            "and",
            "for",
            "with",
            "from",
            "that",
            "this",
            "into",
            "its",
            "has",
            "new",
          ].includes(w),
      ),
  );
export function titleSimilarity(a: string, b: string) {
  const left = titleTokens(a),
    right = titleTokens(b);
  const common = [...left].filter((w) => right.has(w)).length;
  return common / (left.size + right.size - common || 1);
}
export interface RawArticle {
  externalId?: string;
  title: unknown;
  url: string;
  description?: unknown;
  imageUrl?: string;
  author?: unknown;
  publisherName?: unknown;
  publishedAt: unknown;
  language?: string;
  region?: string;
  hnScore?: number;
  tags?: string[];
  contentKind?:
    | "REPORTING"
    | "OFFICIAL_ANNOUNCEMENT"
    | "PRESS_RELEASE"
    | "SPONSORED"
    | "BRANDED_CONTENT";
}
export function normalizeArticle(
  raw: RawArticle,
  policy: { allowExcerpts: boolean; allowImages: boolean; sourceKind?: string },
): IncomingArticle {
  const title = plainText(raw.title);
  const metadata = plainText(raw.description);
  const canonicalUrl = canonicalize(raw.url);
  const date =
    raw.publishedAt instanceof Date
      ? raw.publishedAt
      : new Date(String(raw.publishedAt ?? ""));
  let imageUrl: string | null = null;
  if (policy.allowImages && raw.imageUrl)
    try {
      canonicalize(raw.imageUrl);
      imageUrl = new URL(raw.imageUrl).href;
    } catch {}
  const codes: Record<string, string> = {
    eng: "en",
    spa: "es",
    fra: "fr",
    deu: "de",
    jpn: "ja",
    kor: "ko",
    zho: "zh",
    por: "pt",
    rus: "ru",
    ben: "bn",
    hin: "hi",
  };
  const detected = franc(`${title} ${metadata}`, { minLength: 200 });
  const language =
    /[\u0980-\u09ff]/u.test(title) &&
    (title.match(/[\u0980-\u09ff]/gu) || []).length > title.length * 0.25
      ? "bn"
      : raw.language?.toLowerCase().split(/[-_]/)[0] || codes[detected] || null;
  const text = `${title} ${metadata} ${(raw.tags ?? []).join(" ")}`;
  const tags = TAGS.filter((t) =>
    new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      text,
    ),
  ).slice(0, 6);
  const { categories: regionalCategories, ...classification } =
    classifyBangladesh({ title, description: metadata, tags: raw.tags });
  const disclosures = `${title} ${(raw.tags || []).join(" ")} ${plainText(raw.author)}`;
  const contentKind =
    raw.contentKind ||
    (/\bsponsored|advertorial\b|স্পনসর|বিজ্ঞাপনমূলক/iu.test(disclosures)
      ? "SPONSORED"
      : /\bbrand stor(?:y|ies)\b/iu.test(disclosures)
        ? "BRANDED_CONTENT"
        : /\bpress release\b|সংবাদ বিজ্ঞপ্তি|প্রেস রিলিজ/iu.test(disclosures) ||
            policy.sourceKind === "COMPANY"
          ? "PRESS_RELEASE"
          : policy.sourceKind === "OFFICIAL"
            ? "OFFICIAL_ANNOUNCEMENT"
            : "REPORTING");
  return incomingArticleSchema.parse({
    ...classification,
    contentKind,
    externalId: raw.externalId || fingerprint(canonicalUrl),
    title,
    searchText:
      `${title} ${policy.allowExcerpts ? metadata.slice(0, 280) : ""} ${tags.join(" ")}`
        .normalize("NFC")
        .toLowerCase()
        .slice(0, 2400),
    originalUrl: new URL(raw.url).href,
    canonicalUrl,
    description:
      policy.allowExcerpts && metadata ? metadata.slice(0, 280) : null,
    imageUrl,
    author: plainText(raw.author).slice(0, 200) || null,
    publisherName: plainText(raw.publisherName).slice(0, 200) || null,
    publishedAt: date,
    language,
    region: raw.region || null,
    hnScore: raw.hnScore ?? null,
    categories: [...categorize(title, text), ...regionalCategories],
    tags,
  });
}
