import type { WelfareItem, CurationConfig } from "@welfaremate/types";

// JSON 파일에서 데이터 로드 (빌드 타임)
// Note: Next.js에서는 JSON import가 자동으로 처리됨
import snapshotData from "../../../data/welfare-snapshot.json";
import curationData from "../../../data/config/curation.json";

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
