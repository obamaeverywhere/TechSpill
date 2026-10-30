import type { ClassificationStatus } from "@techpulse/shared";

export const CLASSIFIER_VERSION = "bd-rules-v1";
// Rule scores describe evidence strength; they are not calibrated probabilities or fact checks.
export const BD_RULES: Record<string, RegExp> = {
  startups:
    /\b(startup|start-ups?|entrepreneur|incubator|accelerator)\b|স্টার্টআপ|উদ্যোক্তা|ইনকিউবেটর|অ্যাকসেলারেটর/iu,
  ai: /\b(ai|artificial intelligence|machine learning|llm|neural|chatgpt)\b|কৃত্রিম বুদ্ধিমত্তা|মেশিন লার্নিং|(?<![\p{L}\p{M}])এআই(?:য়ের|য়ের|এর)?(?![\p{L}\p{M}])|চ্যাটজিপিটি/iu,
  software:
    /\b(software|saas|outsourcing|it exports?|programming|developers?|cloud|data cent(?:er|re))\b|সফটওয়্যার|সফটওয়্যার|আউটসোর্সিং|সাস|প্রোগ্রামিং|আইটি রপ্তানি|তথ্যপ্রযুক্তি|ডেটা সেন্টার/iu,
  telecom:
    /\b(telecom|broadband|internet|5g|4g|spectrum|mobile network|connectivity|fiber|fibre)\b|টেলিযোগাযোগ|ব্রডব্যান্ড|ইন্টারনেট|ফাইভজি|মোবাইল নেটওয়ার্ক|স্পেকট্রাম/iu,
  fintech:
    /\b(fintech|digital payments?|mobile financial|payment gateway|mobile banking|banking technology|bkash|nagad)\b|ফিনটেক|ডিজিটাল পেমেন্ট|মোবাইল ব্যাংকিং|মোবাইল আর্থিক|পেমেন্ট গেটওয়ে/iu,
  cybersecurity:
    /\b(cybersecurity|cyberattack|data breach|ransomware|malware|hack(?:ed|ing|ers?)?|data protection)\b|সাইবার|তথ্য ফাঁস|ডেটা ফাঁস|হ্যাক|র‍্যানসমওয়্যার|ম্যালওয়্যার|ডিজিটাল নিরাপত্তা/iu,
  "government-ict":
    /\b(ict policy|ict division|btrc|digital government|e-governance|technology regulation|digital transformation)\b|আইসিটি|তথ্য ও যোগাযোগ প্রযুক্তি|বিটিআরসি|ডিজিটাল সরকার|ই-গভর্ন্যান্স|ডিজিটাল রূপান্তর/iu,
  investments:
    /\b(funding|investment|invests?|raises?|venture capital|seed round|series [a-f]|acquisition)\b|বিনিয়োগ|বিনিয়োগ|তহবিল|অর্থায়ন|অর্থায়ন|অধিগ্রহণ|ভেঞ্চার ক্যাপিটাল/iu,
  innovation:
    /\b(research|innovation|robotics|robots?|quantum|satellite|solar|electric (?:bike|vehicle)|evs?)\b|গবেষণা|উদ্ভাবন|রোবট|কোয়ান্টাম|স্যাটেলাইট|সৌর|সোলার|ইলেকট্রিক বাইক|বৈদ্যুতিক যান/iu,
  gadgets:
    /\b(smartphones?|iphone|laptops?|computers?|semiconductors?|chips?|gadgets?|smartwatch|consumer electronics)\b|স্মার্টফোন|আইফোন|ল্যাপটপ|কম্পিউটার|সেমিকন্ডাক্টর|চিপ|গ্যাজেট|স্মার্টওয়াচ/iu,
  events:
    /\b(hackathon|(?:tech|ai|technology|startup|software)(?: [\w-]+){0,2} (?:conference|summit|expo|exhibition|seminar)|robotics competition)\b|হ্যাকাথন|প্রযুক্তি মেলা|প্রযুক্তি সম্মেলন|এআই সম্মেলন|রোবট প্রতিযোগিতা/iu,
};
const GEO =
  /\b(bangladesh(?:i)?|dhaka|chattogram|chittagong|sylhet|rajshahi|khulna|barishal|rangpur|cumilla|comilla|mymensingh)\b|বাংলাদেশ|ঢাকা|চট্টগ্রাম|সিলেট|রাজশাহী|খুলনা|বরিশাল|রংপুর|কুমিল্লা|ময়মনসিংহ/iu;
// These identifiers refer to institutions, not the nationality of a publisher.
const ORGANIZATIONS =
  /\b(bkash|grameenphone|banglalink|btrc|buet|bangladesh ict division|bangladesh association of software|bangladesh bank)\b|বিকাশ(?:ের)?\s+(?:[^\s]+\s+){0,2}(?:অ্যাপ|ডিজিটাল|পেমেন্ট|সেবা)|গ্রামীণফোন|বাংলালিংক|বিটিআরসি|বুয়েট|বাংলাদেশ ব্যাংক/iu;
const MATERIAL =
  /\b(launch(?:es|ed|ing)?|partner(?:s|ed|ship)?|expand(?:s|ed|ing)?|raise[sd]?|funding|invest(?:ment|s|ed)?|acquir\w*|approv\w*|adopt\w*|introduc\w*|deploy\w*|roll\s?out|opens?|build\w*|develop\w*|train\w*|research|study|manufactur\w*|polic\w*|regulat\w*|hack\w*|breach|outage|shut\w*|bans?|blocks?|hosts?|summit|hackathon|market|ecosystem|industry|solar|electric bike)\b|চালু|উদ্বোধন|অংশীদার|সম্প্রসারণ|বিনিয়োগ|বিনিয়োগ|তহবিল|অর্থায়ন|অর্থায়ন|অধিগ্রহণ|চুক্তি|অনুমোদন|ঘোষণা|গবেষণা|প্রশিক্ষণ|উদ্ভাবন|তৈরি|উৎপাদন|নীতিমালা|হামলা|ফাঁস|হ্যাক|ব্যাহত|আয়োজন|আয়োজন|অনুষ্ঠিত|বাজার|রপ্তানি/iu;
const LOCATIONS =
  "Bangladesh|Dhaka|Chattogram|Chittagong|Sylhet|Rajshahi|Khulna|Barishal|Rangpur|Cumilla|Comilla|Mymensingh";
const DIRECT_EN = new RegExp(
  `\\b(?:in|across|throughout|for|to|from|within|of)\\s+(?:the\\s+)?(?:${LOCATIONS})\\b|\\bBangladeshi\\s+(?:[\\w-]+\\s+){0,4}(?:startup|company|companies|universit|research|software|tech|telecom|fintech|developer|entrepreneur)|\\b(?:${LOCATIONS})(?:['’]s)?\\s+(?:[\\w-]+\\s+){0,4}(?:startup|software|tech|ai|telecom|fintech|internet|electric|solar|market|universit|research|hosts|launch|develop|innov|ict)`,
  "iu",
);
const DIRECT_BN =
  /বাংলাদেশে|বাংলাদেশি|বাংলাদেশী|ঢাকায়|ঢাকায়|ঢাকার|চট্টগ্রামে|সিলেটে|রাজশাহীতে|খুলনায়|খুলনায়|বাংলাদেশের/iu;
const GENERIC_TECH =
  /\b(technology|tech|digital|innovation)\b|প্রযুক্তি|ডিজিটাল|উদ্ভাবন/iu;
const NONTECH_BUSINESS =
  /\b(bakery|restaurant|garment|textile|real estate|architectur|fashion brand|watch brand|rural development)\b|পোশাক কারখানা|বস্ত্র|রেস্তোরাঁ|বেকারি|আবাসন/iu;
const clean = (value: string) =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();
export interface BangladeshClassification {
  technologyRelevanceScore: number;
  bangladeshRelevanceScore: number;
  classificationStatus: ClassificationStatus;
  classificationReason: string;
  countryCodes: string[];
  categories: string[];
  classifierVersion: string;
  classifiedAt: Date;
}
export function classifyBangladesh(input: {
  title: string;
  description?: string;
  tags?: string[];
}): BangladeshClassification {
  const title = clean(input.title),
    description = clean(input.description || "").slice(0, 1800);
  const text = `${title}. ${description}`;
  const domains = Object.entries(BD_RULES)
    .filter(([, pattern]) => pattern.test(text))
    .map(([slug]) => slug);
  const concrete = domains.filter(
    (v) => !["startups", "investments", "innovation"].includes(v),
  );
  const specificInnovation =
    BD_RULES.innovation.test(text) &&
    /\b(robot|robotics|quantum|satellite|solar|electric|ai|technology|software)\b|রোবট|কোয়ান্টাম|স্যাটেলাইট|সৌর|সোলার|ইলেকট্রিক|বৈদ্যুতিক|প্রযুক্তি/iu.test(
      text,
    );
  const startupFinance =
    domains.includes("startups") && domains.includes("investments");
  const nonTechBusiness =
    NONTECH_BUSINESS.test(text) && concrete.length === 0 && !specificInnovation;
  const technologyRelevanceScore = nonTechBusiness
    ? 15
    : concrete.length || specificInnovation
      ? Math.min(100, 78 + Math.max(0, concrete.length - 1) * 7)
      : startupFinance
        ? 75
        : GENERIC_TECH.test(text)
          ? 40
          : 0;
  const sentences = [title, ...description.split(/(?<=[.!?।;])\s+/u)].filter(
    Boolean,
  );
  const evidence = sentences.find((sentence) => {
    const tech =
      Object.entries(BD_RULES).some(
        ([slug, pattern]) =>
          !["investments", "innovation"].includes(slug) &&
          pattern.test(sentence),
      ) ||
      (specificInnovation && BD_RULES.innovation.test(sentence));
    return (
      tech &&
      MATERIAL.test(sentence) &&
      (ORGANIZATIONS.test(sentence) ||
        (GEO.test(sentence) &&
          (DIRECT_EN.test(sentence) || DIRECT_BN.test(sentence))))
    );
  });
  const geo = GEO.exec(text)?.[0],
    organization = ORGANIZATIONS.exec(text)?.[0];
  const ambiguousDomestic =
    /\b(domestic market|local market)\b|দেশে|দেশের|দেশীয়|দেশীয়/iu.test(text);
  const bangladeshRelevanceScore = evidence
    ? evidence === title
      ? 95
      : 85
    : geo || organization
      ? 40
      : ambiguousDomestic
        ? 25
        : 0;
  let classificationStatus: ClassificationStatus;
  let classificationReason: string;
  if (technologyRelevanceScore >= 70 && bangladeshRelevanceScore >= 85) {
    classificationStatus = "ACCEPTED";
    classificationReason = `Technology evidence: ${domains.join(", ")}. Direct Bangladesh development in ${evidence === title ? "headline" : "feed metadata"}; local reference: ${ORGANIZATIONS.exec(evidence!)?.[0] || GEO.exec(evidence!)?.[0]}. Development signal: ${MATERIAL.exec(evidence!)?.[0]}.`;
  } else if (technologyRelevanceScore < 30 || bangladeshRelevanceScore === 0) {
    classificationStatus = "REJECTED";
    classificationReason =
      technologyRelevanceScore < 30
        ? "No sufficient technology-industry evidence; general business, politics, health or other coverage is outside this section."
        : "Technology coverage has no evidenced Bangladesh-specific connection. Publisher location is not used as evidence.";
  } else {
    classificationStatus = "NEEDS_REVIEW";
    classificationReason =
      "Some technology or Bangladesh references are present, but a material local technology development is not sufficiently established in the headline/available feed metadata.";
  }
  return {
    technologyRelevanceScore,
    bangladeshRelevanceScore,
    classificationStatus,
    classificationReason,
    countryCodes: classificationStatus === "ACCEPTED" ? ["BD"] : [],
    categories:
      classificationStatus === "ACCEPTED" ? domains.map((v) => `bd-${v}`) : [],
    classifierVersion: CLASSIFIER_VERSION,
    classifiedAt: new Date(),
  };
}
