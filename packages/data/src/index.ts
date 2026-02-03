import type { WelfareItem, CurationConfig } from "@welfaremate/types";

// 임시 데이터 (추후 JSON 파일에서 로드)
const mockWelfareData: WelfareItem[] = [
  {
    id: "welfare_001",
    title: "청년 월세 지원",
    category: "housing",
    tags: ["청년", "월세", "서울"],
    summary: {
      oneLiner: "월 최대 20만원, 최대 12개월 지원",
      description:
        "서울시에 거주하는 청년을 대상으로 월세 부담을 줄여주는 지원 사업입니다.",
      aiGenerated: true,
      generatedAt: "2026-02-03T03:00:00Z",
    },
    eligibility: {
      age: { min: 19, max: 34 },
      income: { type: "median", percent: 60 },
      region: ["서울"],
      conditions: ["무주택", "부모와 별도 거주"],
      conditionsExplained:
        "만 19~34세, 중위소득 60% 이하, 서울시 거주 무주택자",
    },
    benefit: {
      type: "money",
      amount: "월 최대 20만원",
      duration: "최대 12개월",
      description: "월세 지원금 지급",
    },
    documents: [
      { name: "주민등록등본", required: true },
      { name: "소득증명서", required: true },
      { name: "임대차계약서", required: true },
      { name: "통장사본", required: true },
    ],
    schedule: {
      type: "period",
      start: "2026-02-01",
      end: "2026-03-31",
    },
    application: {
      method: ["온라인"],
      url: "https://www.bokjiro.go.kr",
    },
    warnings: ["청년 주거급여와 중복 수혜 불가"],
    source: {
      name: "서울시",
      url: "https://www.bokjiro.go.kr",
      apiSource: "행안부_공공서비스API",
      lastSync: "2026-02-03T03:00:00Z",
    },
  },
  {
    id: "welfare_002",
    title: "청년 내일채움공제",
    category: "job",
    tags: ["청년", "취업", "목돈"],
    summary: {
      oneLiner: "2년 후 1,600만원 목돈 마련",
      description:
        "중소기업에 취업한 청년이 2년간 근무하면 목돈을 마련할 수 있는 제도입니다.",
      aiGenerated: true,
      generatedAt: "2026-02-03T03:00:00Z",
    },
    eligibility: {
      age: { min: 15, max: 34 },
      conditions: ["중소기업 정규직 취업자"],
      conditionsExplained: "만 15~34세, 중소기업 정규직 취업자",
    },
    benefit: {
      type: "money",
      amount: "2년 후 1,600만원",
      description: "본인 납입 + 기업 + 정부 지원금",
    },
    documents: [
      { name: "근로계약서", required: true },
      { name: "주민등록등본", required: true },
    ],
    schedule: {
      type: "always",
    },
    application: {
      method: ["온라인"],
      url: "https://www.work.go.kr",
    },
    warnings: [],
    source: {
      name: "고용노동부",
      url: "https://www.work.go.kr",
      apiSource: "행안부_공공서비스API",
      lastSync: "2026-02-03T03:00:00Z",
    },
  },
  {
    id: "welfare_003",
    title: "첫만남이용권",
    category: "childcare",
    tags: ["출산", "육아", "바우처"],
    summary: {
      oneLiner: "출생아 1인당 200만원 바우처",
      description: "출생아에게 첫만남이용권 200만원을 지급하는 사업입니다.",
      aiGenerated: true,
      generatedAt: "2026-02-03T03:00:00Z",
    },
    eligibility: {
      conditions: ["출생신고된 아동"],
      conditionsExplained: "출생신고 완료된 모든 아동",
    },
    benefit: {
      type: "money",
      amount: "200만원",
      description: "국민행복카드 바우처 지급",
    },
    documents: [
      { name: "출생증명서", required: true },
      { name: "신분증", required: true },
    ],
    schedule: {
      type: "always",
    },
    application: {
      method: ["온라인", "방문"],
      url: "https://www.bokjiro.go.kr",
    },
    warnings: ["출생일로부터 1년 이내 신청"],
    source: {
      name: "보건복지부",
      url: "https://www.bokjiro.go.kr",
      apiSource: "행안부_공공서비스API",
      lastSync: "2026-02-03T03:00:00Z",
    },
  },
];

const mockCurationConfig: CurationConfig = {
  pinnedItems: ["welfare_001"],
  hiddenItems: [],
  editorPicks: {
    title: "2월 놓치면 안 되는 혜택",
    items: ["welfare_001", "welfare_002"],
  },
  banner: {
    enabled: true,
    type: "warning",
    text: "청년 월세 지원 마감 D-7",
    link: "/welfare/welfare_001",
  },
  categoryOrder: [
    "housing",
    "job",
    "childcare",
    "education",
    "health",
    "finance",
    "culture",
    "other",
  ],
};

// Data Access Functions
export function getWelfareList(): WelfareItem[] {
  return mockWelfareData.filter(
    (item) => !mockCurationConfig.hiddenItems.includes(item.id)
  );
}

export function getWelfareById(id: string): WelfareItem | undefined {
  return mockWelfareData.find((item) => item.id === id);
}

export function getPinnedItems(): WelfareItem[] {
  return mockCurationConfig.pinnedItems
    .map((id) => getWelfareById(id))
    .filter((item): item is WelfareItem => item !== undefined);
}

export function getEditorPicks(): { title: string; items: WelfareItem[] } {
  const { title, items } = mockCurationConfig.editorPicks;
  return {
    title,
    items: items
      .map((id) => getWelfareById(id))
      .filter((item): item is WelfareItem => item !== undefined),
  };
}

export function getBanner() {
  return mockCurationConfig.banner;
}

export function getCurationConfig(): CurationConfig {
  return mockCurationConfig;
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
