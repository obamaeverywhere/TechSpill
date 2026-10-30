import { XMLParser, XMLValidator } from "fast-xml-parser";
import he from "he";
import { fetchSource } from "../utils/http.js";
import type { SourceAdapter } from "./types.js";
import type { RawArticle } from "../processors/article.js";
const array = (v: any): any[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];
const text = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(text).join(" ");
  if (typeof v === "object")
    return Object.entries(v)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, value]) => text(value))
      .join(" ")
      .trim();
  return String(v);
};
export function parseFeed(xml: string): RawArticle[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error("Malformed or unsafe XML feed");
  const data = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    parseTagValue: false,
  }).parse(xml);
  const channel = data.rss?.channel ?? data.feed ?? data["rdf:RDF"];
  if (!channel) throw new Error("Unsupported RSS/Atom document");
  const language = text(channel.language || channel["@_xml:lang"]) || undefined;
  return array(channel.item ?? channel.entry ?? data["rdf:RDF"]?.item).map(
    (item: any) => {
      const links = array(item.link);
      const link = links.find(
        (l: any) =>
          typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate"),
      );
      const url =
        link?.["@_href"] || text(links.find((l: any) => typeof l === "string"));
      const description = text(
        item.description ||
          item.summary ||
          item.content ||
          item["content:encoded"],
      );
      const media = array(item["media:content"]).find(
        (m: any) => !m["@_type"] || String(m["@_type"]).startsWith("image/"),
      );
      const enclosure = array(item.enclosure).find((m: any) =>
        String(m["@_type"]).startsWith("image/"),
      );
      const imageUrl =
        item["media:thumbnail"]?.["@_url"] ||
        media?.["@_url"] ||
        enclosure?.["@_url"] ||
        he.decode(description).match(/<img[^>]+src=["']([^"']+)/i)?.[1];
      return {
        externalId: text(item.guid || item.id) || undefined,
        title: text(item.title),
        url,
        description,
        imageUrl,
        author: text(item["dc:creator"] || item.author?.name || item.author),
        publishedAt: text(
          item.pubDate || item.published || item.updated || item["dc:date"],
        ),
        language,
        tags: array(item.category).map((c) => c?.["@_term"] || text(c)),
      };
    },
  );
}
export const rssAdapter: SourceAdapter = {
  async collect(source) {
    const headers: Record<string, string> = {};
    if (source.etag) headers["If-None-Match"] = source.etag;
    if (source.lastModified) headers["If-Modified-Since"] = source.lastModified;
    if (!source.feedUrl) throw new Error("No verified feed configured");
    const result = await fetchSource(source.feedUrl, headers);
    return {
      articles: result.status === 304 ? [] : parseFeed(result.text),
      notModified: result.status === 304,
      etag: result.etag,
      lastModified: result.lastModified,
      cacheSeconds: result.cacheSeconds,
    };
  },
};
