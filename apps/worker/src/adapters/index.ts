import { techcrunchAdapter } from "./techcrunch.js";
import { theVergeAdapter } from "./the-verge.js";
import { arsTechnicaAdapter } from "./ars-technica.js";
import { wiredAdapter } from "./wired.js";
import { engadgetAdapter } from "./engadget.js";
import { hackerNewsAdapter } from "./hacker-news.js";
import { gnewsAdapter } from "./gnews.js";
import type { SourceAdapter } from "./types.js";
import { bangladeshAdapters } from "./bangladesh.js";
import { gnewsBangladeshAdapter } from "./gnews-bangladesh.js";
export const adapters: Record<string, SourceAdapter> = {
  ...bangladeshAdapters,
  "gnews-bangladesh": gnewsBangladeshAdapter,
  techcrunch: techcrunchAdapter,
  "the-verge": theVergeAdapter,
  "ars-technica": arsTechnicaAdapter,
  wired: wiredAdapter,
  engadget: engadgetAdapter,
  "hacker-news": hackerNewsAdapter,
  gnews: gnewsAdapter,
};
