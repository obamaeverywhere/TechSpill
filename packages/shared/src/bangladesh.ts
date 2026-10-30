export const BD_CATEGORIES = [
  ["startups", "Startups & Entrepreneurship", "Startups"],
  ["ai", "Artificial Intelligence", "AI"],
  ["software", "Software & IT Industry", "Software"],
  ["telecom", "Telecommunications & Internet", "Telecom"],
  ["fintech", "Fintech & Digital Payments", "Fintech"],
  ["cybersecurity", "Cybersecurity", "Cybersecurity"],
  ["government-ict", "Government Technology & ICT Policy", "Government ICT"],
  ["investments", "Tech Investments & Funding", "Investments"],
  ["innovation", "Innovation & Research", "Innovation"],
  ["gadgets", "Gadgets & Consumer Technology", "Gadgets"],
  ["events", "Tech Events", "Events"],
] as const;
export type ClassificationStatus = "ACCEPTED" | "REJECTED" | "NEEDS_REVIEW";
export type ContentKind =
  | "REPORTING"
  | "OFFICIAL_ANNOUNCEMENT"
  | "PRESS_RELEASE"
  | "SPONSORED"
  | "BRANDED_CONTENT";
export const CONTENT_LABELS: Record<ContentKind, string> = {
  REPORTING: "Reporting",
  OFFICIAL_ANNOUNCEMENT: "Official announcement",
  PRESS_RELEASE: "Press release",
  SPONSORED: "Sponsored",
  BRANDED_CONTENT: "Brand story",
};
