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
  // 스냅샷 raw.수정일시 기준 (증분 크롤링용 메타, UI에서는 사용하지 않음)
  sourceModified?: string;
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

// AI 재가공 데이터 - 정적 import (welfare-ai.json 우선, 없으면 welfare-ai-sample.json)
let aiData: WelfareAIResult | null = null;
let enrichedData: WelfareAIResult | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  aiData = require("../../../data/welfare-ai.json") as WelfareAIResult;
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    aiData = require("../../../data/welfare-ai-sample.json") as WelfareAIResult;
  } catch {
    // AI 데이터 없음 - 무시
  }
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  enrichedData = require("../../../data/welfare-enriched.json") as WelfareAIResult;
} catch {
  // 규칙 기반 보강 데이터 없음 - 무시
}

// 협소 대상 플래그 (welfare-targets.json)
export interface WelfareTargetFlags {
  isCareLeaverOnly?: boolean;
  isSingleParentOnly?: boolean;
  requiresBasicLivelihoodOrNearPoor?: boolean;
  requiresStudent?: boolean;
  requiresDisabled?: boolean;
}

interface WelfareTargetsFile {
  version: string;
  generatedAt: string;
  items: Record<string, WelfareTargetFlags>;
}

let targetsData: WelfareTargetsFile | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  targetsData = require("../../../data/welfare-targets.json") as WelfareTargetsFile;
} catch {
  // 타깃 플래그 데이터 없음 - 무시
}

interface SnapshotFile {
  version: string;
  generatedAt: string;
  totalCount: number;
  items: WelfareItem[];
}

const snapshot = snapshotData as SnapshotFile;
const curationConfig = curationData as CurationConfig;

const SIDO_SHORT = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const SIDO_FULL_TO_SHORT: Record<string, string> = {
  "충청북도": "충북",
  "충청남도": "충남",
  "경상북도": "경북",
  "경상남도": "경남",
  "전라북도": "전북",
  "전라남도": "전남",
};

function extractRegionFromText(text: string): string[] {
  if (!text.trim()) return [];
  const normalized = Object.entries(SIDO_FULL_TO_SHORT).reduce(
    (acc, [full, short]) => acc.replace(new RegExp(full, "g"), short),
    text
  );
  const sidoFound = SIDO_SHORT.filter((r) => normalized.includes(r));
  const sigunguMatches = text.match(/[가-힣]{2,}(?:시|군|구)\b/g) ?? [];
  const sigunguFound = Array.from(
    new Set(sigunguMatches.filter((s) => s !== "서비스"))
  );
  return Array.from(new Set([...sidoFound, ...sigunguFound]));
}

// Data Access Functions
export function getWelfareList(): WelfareItem[] {
  return snapshot.items
    .filter((item) => !curationConfig.hiddenItems.includes(item.id))
    .map((item) => {
      const hasRegion =
        item.eligibility.region && item.eligibility.region.length > 0;
      if (hasRegion) return item;
      const combined = [item.title, item.source?.name].filter(Boolean).join(" ");
      const region = extractRegionFromText(combined);
      if (region.length === 0) return item;
      return {
        ...item,
        eligibility: {
          ...item.eligibility,
          region,
        },
      };
    });
}

export function getWelfareById(id: string): WelfareItem | undefined {
  const item = snapshot.items.find((item) => item.id === id);
  if (!item) return undefined;
  const hasRegion =
    item.eligibility.region && item.eligibility.region.length > 0;
  if (hasRegion) return item;
  const combined = [item.title, item.source?.name].filter(Boolean).join(" ");
  const region = extractRegionFromText(combined);
  if (region.length === 0) return item;
  return {
    ...item,
    eligibility: { ...item.eligibility, region },
  };
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

export function getWelfareTargets(id: string): WelfareTargetFlags | undefined {
  return targetsData?.items[id];
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

export const benefitTypeLabels: Record<string, string> = {
  money: "현금",
  service: "서비스",
  discount: "할인",
  other: "기타",
};

export const scheduleTypeLabels: Record<string, string> = {
  always: "상시",
  period: "기간 한정",
};

export const targetTraitOptions: { value: string; label: string; keywords: string[] }[] = [
  { value: "youth", label: "청년", keywords: ["청년"] },
  { value: "singleParent", label: "한부모", keywords: ["한부모"] },
  { value: "disabled", label: "장애인", keywords: ["장애인", "장애"] },
  { value: "veteran", label: "국가유공자", keywords: ["국가유공자", "참전", "보훈"] },
  { value: "multicultural", label: "다문화", keywords: ["다문화"] },
];

const MEDIAN_INCOME_MONTHLY_2025: Record<number, number> = {
  1: 2_392_013,
  2: 3_931_722,
  3: 5_026_427,
  4: 6_098_833,
  5: 7_114_239,
  6: 8_081_645,
  7: 9_041_051,
};

export const householdSizeOptions: { value: number; label: string }[] = [
  { value: 0, label: "전체" },
  { value: 1, label: "1인 가구" },
  { value: 2, label: "2인 가구" },
  { value: 3, label: "3인 가구" },
  { value: 4, label: "4인 가구" },
  { value: 5, label: "5인 가구" },
  { value: 6, label: "6인 가구" },
  { value: 7, label: "7인 이상" },
];

export function getIncomeAmountLabel(
  percent: number,
  householdSize: number
): string {
  const sizeForAmount = householdSize >= 1 && householdSize <= 7 ? householdSize : 1;
  const base = MEDIAN_INCOME_MONTHLY_2025[sizeForAmount] ?? MEDIAN_INCOME_MONTHLY_2025[1];
  const amount = Math.round((base * (percent / 100)) / 10_000);
  const sizeLabel =
    householdSize >= 1 && householdSize <= 7
      ? (householdSizeOptions.find((o) => o.value === householdSize)?.label ?? "1인 가구")
      : "1인 가구";
  return `${sizeLabel} 기준 약 월 ${amount}만원 이하`;
}

export const incomeFilterOptions: {
  value: number | null;
  label: string;
}[] = [
  { value: null, label: "전체" },
  { value: 60, label: "중위소득 60% 이하" },
  { value: 100, label: "중위소득 100% 이하" },
  { value: 150, label: "중위소득 150% 이하" },
];

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
