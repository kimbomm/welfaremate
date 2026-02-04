import type { WelfareItem, CurationConfig } from "@welfaremate/types";

// JSON 파일에서 데이터 로드 (빌드 타임)
// Note: Next.js에서는 JSON import가 자동으로 처리됨
import snapshotData from "../../../data/welfare-snapshot.json";
import curationData from "../../../data/config/curation.json";

export interface WelfareDetailData {
  documents: {
    required: string[];
    optional: string[];
  };
  duplicateWarning?: string;
  legalBasis: {
    name: string;
    article: string;
  }[];
  contact: {
    agency: string;
    phone: string[];
  };
  lastCrawled: string;
}

interface WelfareDetailResult {
  version: string;
  generatedAt: string;
  totalCount: number;
  successCount: number;
  failedIds: string[];
  items: Record<string, WelfareDetailData>;
}

// 크롤링 상세 데이터 (샘플 또는 전체) - 정적 import
let detailData: WelfareDetailResult | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  detailData = require("../../../data/welfare-detail-sample.json") as WelfareDetailResult;
} catch {
  // 크롤링 데이터 없음 - 무시
}

// AI 재가공 데이터 타입
export interface WelfareAIData {
  summary: string;
  benefits: { label: string; value: string }[];
  eligibility: { simple: string; details: string[] };
  documents: { name: string; how?: string }[];
  tips: string[];
  warning: string | null;
}

interface WelfareAIResult {
  version: string;
  generatedAt: string;
  items: Record<string, WelfareAIData>;
}

// AI 재가공 데이터 - 정적 import (ai-sample 우선, 없으면 enriched)
let aiData: WelfareAIResult | null = null;
let enrichedData: WelfareAIResult | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  aiData = require("../../../data/welfare-ai-sample.json") as WelfareAIResult;
} catch {
  // AI 샘플 없음 - 무시
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  enrichedData = require("../../../data/welfare-enriched.json") as WelfareAIResult;
} catch {
  // 규칙 기반 보강 데이터 없음 - 무시
}

interface SnapshotFile {
  version: string;
  generatedAt: string;
  totalCount: number;
  items: WelfareItem[];
}

const snapshot = snapshotData as SnapshotFile;
const curationConfig = curationData as CurationConfig;

// Data Access Functions
export function getWelfareList(): WelfareItem[] {
  return snapshot.items.filter(
    (item) => !curationConfig.hiddenItems.includes(item.id)
  );
}

export function getWelfareById(id: string): WelfareItem | undefined {
  return snapshot.items.find((item) => item.id === id);
}

export function getWelfareDetail(id: string): WelfareDetailData | undefined {
  if (!detailData) return undefined;
  const welfare = getWelfareById(id);
  if (!welfare) return undefined;
  const serviceId = welfare.raw?.서비스ID as string | undefined;
  if (!serviceId) return undefined;
  return detailData.items[serviceId];
}

export interface WelfareItemWithDetail extends WelfareItem {
  detail?: WelfareDetailData;
  ai?: WelfareAIData;
}

export function getWelfareAI(id: string): WelfareAIData | undefined {
  return aiData?.items[id] ?? enrichedData?.items[id];
}

export function getWelfareWithDetail(id: string): WelfareItemWithDetail | undefined {
  const welfare = getWelfareById(id);
  if (!welfare) return undefined;
  const detail = getWelfareDetail(id);
  const ai = getWelfareAI(id);
  return { ...welfare, detail, ai };
}

export function getPinnedItems(): WelfareItem[] {
  return curationConfig.pinnedItems
    .map((id) => getWelfareById(id))
    .filter((item): item is WelfareItem => item !== undefined);
}

export function getEditorPicks(): { title: string; items: WelfareItem[] } {
  const { title, items } = curationConfig.editorPicks;
  return {
    title,
    items: items
      .map((id) => getWelfareById(id))
      .filter((item): item is WelfareItem => item !== undefined),
  };
}

export function getBanner() {
  return curationConfig.banner;
}

export function getCurationConfig(): CurationConfig {
  return curationConfig;
}

export function getSnapshotInfo() {
  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    totalCount: snapshot.totalCount,
  };
}

// Category Helpers
export const categoryLabels: Record<string, string> = {
  housing: "주거",
  job: "취업/창업",
  education: "교육",
  childcare: "육아/보육",
  health: "건강/의료",
  culture: "문화/여가",
  finance: "금융/대출",
  other: "기타",
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}

// Document Links - 주요 서류 발급처 매핑
export const documentLinks: Record<string, { url: string; source: string }> = {
  주민등록등본: {
    url: "https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A01010&CappBizCD=13100000015",
    source: "정부24",
  },
  주민등록초본: {
    url: "https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A01010&CappBizCD=13100000016",
    source: "정부24",
  },
  가족관계증명서: {
    url: "https://efamily.scourt.go.kr",
    source: "대법원",
  },
  혼인관계증명서: {
    url: "https://efamily.scourt.go.kr",
    source: "대법원",
  },
  소득금액증명원: {
    url: "https://www.hometax.go.kr",
    source: "홈택스",
  },
  등기사항전부증명서: {
    url: "https://www.iros.go.kr",
    source: "인터넷등기소",
  },
  건강보험자격득실확인서: {
    url: "https://www.nhis.or.kr",
    source: "건강보험공단",
  },
};

export function findDocumentLink(
  docName: string
): { url: string; source: string } | null {
  if (documentLinks[docName]) return documentLinks[docName];

  for (const [key, value] of Object.entries(documentLinks)) {
    if (docName.includes(key) || key.includes(docName)) return value;
  }

  if (docName.includes("주민등록")) return documentLinks["주민등록등본"];
  if (docName.includes("가족관계") || docName.includes("혼인"))
    return documentLinks["가족관계증명서"];
  if (docName.includes("등기")) return documentLinks["등기사항전부증명서"];
  if (docName.includes("소득") || docName.includes("납세"))
    return documentLinks["소득금액증명원"];
  if (docName.includes("건강보험"))
    return documentLinks["건강보험자격득실확인서"];

  return null;
}

// Date Helpers
export function getDaysUntil(dateString?: string): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  const today = new Date();
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDeadline(dateString?: string): string | null {
  const days = getDaysUntil(dateString);
  if (days === null) return null;
  if (days < 0) return "마감";
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
}

// Search & Filter
export function searchWelfare(query: string): WelfareItem[] {
  const lowerQuery = query.toLowerCase();
  return getWelfareList().filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      item.summary.oneLiner.toLowerCase().includes(lowerQuery)
  );
}

export function filterByCategory(category: string): WelfareItem[] {
  return getWelfareList().filter((item) => item.category === category);
}

export function filterByRegion(region: string): WelfareItem[] {
  return getWelfareList().filter(
    (item) =>
      !item.eligibility.region ||
      item.eligibility.region.length === 0 ||
      item.eligibility.region.some((r) => r.includes(region))
  );
}

export function filterByAge(age: number): WelfareItem[] {
  return getWelfareList().filter((item) => {
    const { min, max } = item.eligibility.age || {};
    if (min !== undefined && age < min) return false;
    if (max !== undefined && age > max) return false;
    return true;
  });
}
