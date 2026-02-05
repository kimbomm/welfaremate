// Welfare Types
export type WelfareCategory =
  | "housing"
  | "job"
  | "education"
  | "childcare"
  | "health"
  | "culture"
  | "finance"
  | "other";

export interface AgeRange {
  min?: number;
  max?: number;
  note?: string;
}

export interface IncomeCondition {
  type: "median" | "amount" | "quartile";
  percent?: number;
  max?: number;
  note?: string;
}

export interface DocumentItem {
  name: string;
  required: boolean;
  note?: string;
  howToGet?: string;
}

export interface WelfareItem {
  id: string;
  title: string;
  category: WelfareCategory;
  tags: string[];

  summary: {
    oneLiner: string;
    description: string;
    aiGenerated: boolean;
    generatedAt: string;
  };

  eligibility: {
    age?: AgeRange;
    income?: IncomeCondition;
    region?: string[];
    conditions: string[];
    conditionsExplained: string;
  };

  benefit: {
    type: "money" | "service" | "discount" | "other";
    amount?: string;
    duration?: string;
    description: string;
  };

  documents: DocumentItem[];

  schedule: {
    type: "always" | "period";
    start?: string;
    end?: string;
    note?: string;
  };

  application: {
    method: string[];
    url: string;
    contact?: string;
    receivingAgency?: string;
  };

  warnings: string[];

  source: {
    name: string;
    url: string;
    apiSource: string;
    lastSync: string;
  };

  raw?: Record<string, unknown>;
}

// User Profile Types
export type EmploymentType =
  | "employed"
  | "self-employed"
  | "unemployed"
  | "student"
  | "other";

export type HouseholdType = "single" | "married" | "with-parents" | "other";

export type HousingType = "rent" | "jeonse" | "own" | "with-parents" | "other";

export type IncomeLevel = "low" | "medium" | "high";

export interface UserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;

  birthYear: number;
  region: {
    sido: string;
    sigungu?: string;
  };

  employment: EmploymentType;
  incomeLevel: IncomeLevel;
  annualIncome?: number;

  householdSize?: number;
  householdType: HouseholdType;
  hasChildren: boolean;
  childrenAges?: number[];

  housingType: HousingType;
  isHouseless: boolean;

  isDisabled: boolean;
  isVeteran: boolean;
  isMulticultural: boolean;
  isSingleParent: boolean;
}

// Config Types
export interface CurationConfig {
  pinnedItems: string[];
  hiddenItems: string[];
  editorPicks: {
    title: string;
    description?: string;
    items: string[];
    expiresAt?: string;
  };
  banner: {
    enabled: boolean;
    type: "info" | "warning" | "event";
    text: string;
    link?: string;
    expiresAt?: string;
  };
  categoryOrder: WelfareCategory[];
}

export interface AISettings {
  systemPrompt: string;
  model: "gpt-4o" | "gpt-4o-mini" | "claude-3-sonnet";
  temperature: number;
  maxTokens: number;
  faq: Array<{
    question: string;
    answer: string;
    keywords: string[];
  }>;
  blockedWords: string[];
  responseTemplates: {
    noResult: string;
    disclaimer: string;
  };
}

// Bookmark Types
export interface Bookmark {
  id: string;
  welfareId: string;
  createdAt: string;
  memo?: string;
  checklist?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checkedAt?: string;
}
