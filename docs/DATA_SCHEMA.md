# 복지메이트 데이터 스키마

## 1. 복지 데이터 (welfare-snapshot.json)

### WelfareItem

```typescript
interface WelfareItem {
  // 식별
  id: string;                    // "welfare_001"
  
  // 기본 정보
  title: string;                 // "청년 월세 지원"
  category: WelfareCategory;     // "housing"
  tags: string[];                // ["청년", "월세", "서울"]
  
  // AI 생성 요약
  summary: {
    oneLiner: string;            // "월 최대 20만원, 최대 12개월 지원"
    description: string;         // 상세 설명 (2-3문장)
    aiGenerated: boolean;        // true
    generatedAt: string;         // ISO 날짜
  };
  
  // 자격 요건
  eligibility: {
    age?: AgeRange;
    income?: IncomeCondition;
    region?: string[];           // ["서울", "경기"]
    conditions: string[];        // ["무주택", "부모와 별도 거주"]
    conditionsExplained: string; // AI가 해석한 조건 설명
  };
  
  // 혜택 내용
  benefit: {
    type: "money" | "service" | "discount" | "other";
    amount?: string;             // "월 최대 20만원"
    duration?: string;           // "최대 12개월"
    description: string;
  };
  
  // 서류
  documents: DocumentItem[];
  
  // 일정
  schedule: {
    type: "always" | "period";   // 상시 / 기간
    start?: string;              // "2026-02-01"
    end?: string;                // "2026-03-31"
    note?: string;               // "예산 소진 시 조기 마감"
  };
  
  // 신청
  application: {
    method: string[];            // ["온라인", "방문"]
    url: string;                 // 신청 페이지 URL
    contact?: string;            // 문의처
  };
  
  // 주의사항
  warnings: string[];            // ["청년 주거급여와 중복 수혜 불가"]
  
  // 메타
  source: {
    name: string;                // "서울시"
    url: string;                 // 원본 페이지 URL
    apiSource: string;           // "행안부_공공서비스API"
    lastSync: string;            // ISO 날짜
  };
  
  // 원본 데이터 (백업용)
  raw?: Record<string, unknown>;
}
```

### 서브 타입

```typescript
type WelfareCategory = 
  | "housing"      // 주거
  | "job"          // 취업/창업
  | "education"    // 교육
  | "childcare"    // 육아/보육
  | "health"       // 건강/의료
  | "culture"      // 문화/여가
  | "finance"      // 금융/대출
  | "other";       // 기타

interface AgeRange {
  min?: number;    // 만 나이
  max?: number;
  note?: string;   // "만 나이 기준"
}

interface IncomeCondition {
  type: "median" | "amount" | "quartile";
  percent?: number;              // 중위소득 60%
  max?: number;                  // 연 5000만원
  note?: string;
}

interface DocumentItem {
  name: string;                  // "주민등록등본"
  required: boolean;             // 필수 여부
  note?: string;                 // "3개월 이내 발급"
  howToGet?: string;             // "정부24에서 발급"
}
```

---

## 2. 사용자 프로필 (IndexedDB)

```typescript
interface UserProfile {
  id: string;                    // UUID
  createdAt: string;
  updatedAt: string;
  
  // 기본 정보
  birthYear: number;             // 1995
  region: {
    sido: string;                // "서울특별시"
    sigungu?: string;            // "강남구"
  };
  
  // 직업/소득
  employment: "employed" | "self-employed" | "unemployed" | "student" | "other";
  incomeLevel: "low" | "medium" | "high";  // 간략화
  annualIncome?: number;         // 상세 입력 시
  
  // 가구 정보
  householdType: "single" | "married" | "with-parents" | "other";
  hasChildren: boolean;
  childrenAges?: number[];
  
  // 주거 정보
  housingType: "rent" | "jeonse" | "own" | "with-parents" | "other";
  isHouseless: boolean;          // 무주택 여부
  
  // 기타 조건
  isDisabled: boolean;
  isVeteran: boolean;
  isMulticultural: boolean;
  isSingleParent: boolean;
}
```

---

## 3. 설정 파일

### curation.json

```typescript
interface CurationConfig {
  // 상단 고정
  pinnedItems: string[];         // ["welfare_001", "welfare_023"]
  
  // 비노출
  hiddenItems: string[];
  
  // 에디터 픽
  editorPicks: {
    title: string;               // "2월 놓치면 안 되는 혜택"
    description?: string;
    items: string[];
    expiresAt?: string;          // 노출 종료일
  };
  
  // 홈 배너
  banner: {
    enabled: boolean;
    type: "info" | "warning" | "event";
    text: string;
    link?: string;
    expiresAt?: string;
  };
  
  // 카테고리 순서
  categoryOrder: WelfareCategory[];
}
```

### ai-settings.json

```typescript
interface AISettings {
  // 시스템 프롬프트
  systemPrompt: string;
  
  // 모델 설정
  model: "gpt-4o" | "gpt-4o-mini" | "claude-3-sonnet";
  temperature: number;           // 0.3
  maxTokens: number;             // 500
  
  // FAQ
  faq: Array<{
    question: string;
    answer: string;
    keywords: string[];          // 매칭용
  }>;
  
  // 금지어
  blockedWords: string[];        // ["대출 추천", "투자"]
  
  // 응답 템플릿
  responseTemplates: {
    noResult: string;            // 결과 없을 때
    disclaimer: string;          // 면책 문구
  };
}
```

### monetization.json

```typescript
interface MonetizationConfig {
  // 광고 설정
  adsense: {
    enabled: boolean;
    slots: {
      home_banner: boolean;
      list_native: boolean;
      detail_bottom: boolean;
    };
  };
  
  // 제휴 링크
  affiliates: Record<WelfareCategory, AffiliateItem[]>;
}

interface AffiliateItem {
  partner: string;               // "카카오뱅크"
  title: string;                 // "청년 전세대출"
  description: string;
  url: string;
  commission?: string;           // "CPA 5,000원"
  enabled: boolean;
}
```

---

## 4. 북마크 (IndexedDB)

```typescript
interface Bookmark {
  id: string;
  welfareId: string;
  createdAt: string;
  memo?: string;
  checklist?: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  text: string;                  // "주민등록등본 발급"
  checked: boolean;
  checkedAt?: string;
}
```

---

## 5. API 응답 매핑

### 행안부 공공서비스 API → WelfareItem

```typescript
function mapApiToWelfare(apiItem: APIResponse): Partial<WelfareItem> {
  return {
    id: `welfare_${apiItem.서비스ID}`,
    title: apiItem.서비스명,
    source: {
      name: apiItem.소관기관명,
      url: apiItem.신청URL,
      apiSource: "행안부_공공서비스API",
      lastSync: new Date().toISOString(),
    },
    eligibility: {
      conditions: parseConditions(apiItem.선정기준),
    },
    schedule: {
      type: apiItem.신청기한 === "상시" ? "always" : "period",
      end: parseDate(apiItem.신청기한),
    },
    application: {
      method: parseMethod(apiItem.신청방법),
      url: apiItem.신청URL,
    },
    raw: apiItem,
  };
}
```
