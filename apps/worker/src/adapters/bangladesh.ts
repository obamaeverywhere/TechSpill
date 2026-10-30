import { rssAdapter } from "./rss.js";
// Separate registrations allow publisher-specific changes without replacing the parser.
export const bangladeshAdapters = {
  "future-startup": { ...rssAdapter },
  "daily-star-tech": { ...rssAdapter },
  "tbs-tech": { ...rssAdapter },
  "dhaka-tribune-tech": { ...rssAdapter },
  "prothom-alo-tech": { ...rssAdapter },
  techshohor: { ...rssAdapter },
};
