import type { WelfareItem, WelfareCategory, DocumentItem } from "@welfaremate/types";
import type { RawServiceItem } from "./api.js";

/**
 * 서비스분야 → 카테고리 매핑
 */
function mapCategory(field: string | null | undefined): WelfareCategory {
  if (!field) return "other";
  
  const mapping: Record<string, WelfareCategory> = {
    주거: "housing",
    취업: "job",
    창업: "job",
    고용: "job",
    교육: "education",
    보육: "childcare",
    임신: "childcare",
    출산: "childcare",
    육아: "childcare",
    건강: "health",
    의료: "health",
    문화: "culture",
    여가: "culture",
    금융: "finance",
    대출: "finance",
  };

  for (const [keyword, category] of Object.entries(mapping)) {
    if (field.includes(keyword)) {
      return category;
    }
  }
  return "other";
}

/**
 * 나이 조건 파싱
 */
function parseAgeCondition(text: string | null | undefined): { min?: number; max?: number } | undefined {
  if (!text) return undefined;
  
  // "만 19~34세" 패턴
  const rangeMatch = text.match(/만?\s*(\d+)\s*[~\-]\s*(\d+)\s*세/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  // "만 19세 이상" 패턴
  const minMatch = text.match(/만?\s*(\d+)\s*세\s*이상/);
  if (minMatch) {
    return { min: parseInt(minMatch[1]) };
  }

  // "만 34세 이하" 패턴
  const maxMatch = text.match(/만?\s*(\d+)\s*세\s*이하/);
  if (maxMatch) {
    return { max: parseInt(maxMatch[1]) };
  }

  return undefined;
}

/**
 * 소득 조건 파싱
 */
function parseIncomeCondition(text: string | null | undefined): { type: "median"; percent: number } | undefined {
  if (!text) return undefined;
  
  // "중위소득 60% 이하" 패턴
  const match = text.match(/중위소득\s*(\d+)\s*%/);
  if (match) {
    return { type: "median", percent: parseInt(match[1]) };
  }
  return undefined;
}

const SIDO_SHORT = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

const SIDO_FULL_TO_SHORT: Record<string, string> = {
  "충청북도": "충북",
  "충청남도": "충남",
  "경상북도": "경북",
  "경상남도": "경남",
  "전라북도": "전북",
  "전라남도": "전남",
};

function extractSigungu(text: string): string[] {
  const matches = text.match(/[가-힣]{2,}(?:시|군|구)\b/g) ?? [];
  return [...new Set(matches.filter((s) => s !== "서비스"))];
}

/**
 * 지역 파싱: 소관기관명 + 복지명(서비스명)에서 시도·시군구 추출
 */
function parseRegions(
  agencyName: string | null | undefined,
  title: string | null | undefined
): string[] | undefined {
  const combined = [agencyName, title].filter(Boolean).join(" ");
  if (!combined.trim()) return undefined;

  const normalized = Object.entries(SIDO_FULL_TO_SHORT).reduce(
    (acc, [full, short]) => acc.replace(new RegExp(full, "g"), short),
    combined
  );

  const sidoFound = SIDO_SHORT.filter((r) => normalized.includes(r));
  const sigunguFound = extractSigungu(combined);
  const result = [...new Set([...sidoFound, ...sigunguFound])];
  return result.length > 0 ? result : undefined;
}

/**
 * 구비서류 파싱
 */
function parseDocuments(text: string): DocumentItem[] {
  if (!text) return [];

  const docs = text.split(/[,\n·•]/).map((doc) => doc.trim()).filter(Boolean);
  return docs.map((name) => ({
    name,
    required: true,
  }));
}

/**
 * 신청방법 파싱
 */
function parseMethods(text: string | null | undefined): string[] {
  if (!text) return ["기타"];
  const methods: string[] = [];
  if (text.includes("온라인")) methods.push("온라인");
  if (text.includes("방문")) methods.push("방문");
  if (text.includes("우편")) methods.push("우편");
  if (text.includes("팩스")) methods.push("팩스");
  if (methods.length === 0) methods.push("기타");
  return methods;
}

/**
 * 신청기한 파싱
 */
function parseSchedule(deadline: string | null | undefined): WelfareItem["schedule"] {
  if (!deadline || deadline === "상시" || deadline.includes("상시")) {
    return { type: "always" };
  }

  // YYYY-MM-DD 형식
  const dateMatch = deadline.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return {
      type: "period",
      end: dateMatch[0],
    };
  }

  // YYYY.MM.DD 형식
  const dotMatch = deadline.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (dotMatch) {
    return {
      type: "period",
      end: `${dotMatch[1]}-${dotMatch[2]}-${dotMatch[3]}`,
    };
  }

  return { type: "always", note: deadline };
}

/**
 * 지원내용에서 금액 추출
 */
function parseBenefit(content: string | null | undefined): WelfareItem["benefit"] {
  if (!content) {
    return { type: "other", description: "" };
  }
  
  // 금액 패턴 추출 (월 XX만원, XX만원, XX원 등)
  const amountMatch = content.match(/(월\s*)?(최대\s*)?(\d+[,\d]*)\s*(만\s*)?원/);
  
  return {
    type: "money",
    amount: amountMatch ? amountMatch[0] : undefined,
    description: content,
  };
}

/**
 * 태그 생성
 */
function generateTags(item: RawServiceItem): string[] {
  const tags: string[] = [];
  const target = item.지원대상 || "";
  
  // 지원대상에서 태그 추출
  if (target.includes("청년")) tags.push("청년");
  if (target.includes("노인") || target.includes("어르신")) tags.push("어르신");
  if (target.includes("장애")) tags.push("장애인");
  if (target.includes("임산부") || target.includes("임신")) tags.push("임산부");
  if (target.includes("영유아") || target.includes("아동")) tags.push("영유아");
  if (target.includes("저소득")) tags.push("저소득");
  if (target.includes("다문화")) tags.push("다문화");
  if (target.includes("한부모")) tags.push("한부모");
  
  // 서비스분야 추가
  if (item.서비스분야) tags.push(item.서비스분야);
  
  return Array.from(new Set(tags));
}

/**
 * Raw API 데이터 → WelfareItem 변환
 */
export function transformToWelfareItems(rawData: RawServiceItem[]): WelfareItem[] {
  return rawData.map((item) => {
    const selectionCriteria = item.선정기준 || "";
    const conditions = selectionCriteria
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const supportContent = item.지원내용 || "";
    const servicePurpose = item.서비스목적 || "";

    return {
      id: `welfare_${item.서비스ID || crypto.randomUUID()}`,
      title: item.서비스명 || "제목 없음",
      category: mapCategory(item.서비스분야),
      tags: generateTags(item),

      summary: {
        oneLiner: supportContent.slice(0, 50) + (supportContent.length > 50 ? "..." : ""),
        description: servicePurpose,
        aiGenerated: false,
        generatedAt: "",
      },

      eligibility: {
        age: parseAgeCondition(selectionCriteria),
        income: parseIncomeCondition(selectionCriteria),
        region: parseRegions(item.소관기관명, item.서비스명),
        conditions,
        conditionsExplained: selectionCriteria,
      },

      benefit: parseBenefit(item.지원내용),

      documents: parseDocuments(item.구비서류),

      schedule: parseSchedule(item.신청기한),

      application: {
        method: parseMethods(item.신청방법),
        url:
          (item.온라인신청사이트URL && item.온라인신청사이트URL.trim()) ||
          (item.상세조회URL && item.상세조회URL.trim()) ||
          "https://www.bokjiro.go.kr",
        contact: item.문의처 || item.전화문의 || "",
        receivingAgency: item.접수기관?.trim() || "",
      },

      warnings: [],

      source: {
        name: item.소관기관명 || "",
        url: item.온라인신청사이트URL || item.상세조회URL || "",
        apiSource: "행안부_공공서비스API",
        lastSync: new Date().toISOString(),
      },

      raw: item,
    };
  });
}
