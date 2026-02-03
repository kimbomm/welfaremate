import type { WelfareItem, WelfareCategory, DocumentItem } from "@welfaremate/types";
import type { RawServiceItem } from "./api.js";

/**
 * 서비스분야 → 카테고리 매핑
 */
function mapCategory(field: string): WelfareCategory {
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
function parseAgeCondition(text: string): { min?: number; max?: number } | undefined {
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
function parseIncomeCondition(text: string): { type: "median"; percent: number } | undefined {
  // "중위소득 60% 이하" 패턴
  const match = text.match(/중위소득\s*(\d+)\s*%/);
  if (match) {
    return { type: "median", percent: parseInt(match[1]) };
  }
  return undefined;
}

/**
 * 지역 파싱
 */
function parseRegions(text: string): string[] | undefined {
  const regions = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
  ];

  const found = regions.filter((region) => text.includes(region));
  return found.length > 0 ? found : undefined;
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
function parseMethods(text: string): string[] {
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
function parseSchedule(deadline: string): WelfareItem["schedule"] {
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
function parseBenefit(content: string): WelfareItem["benefit"] {
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
  
  // 지원대상에서 태그 추출
  if (item.지원대상.includes("청년")) tags.push("청년");
  if (item.지원대상.includes("노인") || item.지원대상.includes("어르신")) tags.push("어르신");
  if (item.지원대상.includes("장애")) tags.push("장애인");
  if (item.지원대상.includes("임산부") || item.지원대상.includes("임신")) tags.push("임산부");
  if (item.지원대상.includes("영유아") || item.지원대상.includes("아동")) tags.push("영유아");
  if (item.지원대상.includes("저소득")) tags.push("저소득");
  if (item.지원대상.includes("다문화")) tags.push("다문화");
  if (item.지원대상.includes("한부모")) tags.push("한부모");
  
  // 서비스분야 추가
  if (item.서비스분야) tags.push(item.서비스분야);
  
  return [...new Set(tags)];
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

    return {
      id: `welfare_${item.서비스ID}`,
      title: item.서비스명,
      category: mapCategory(item.서비스분야),
      tags: generateTags(item),

      summary: {
        oneLiner: item.지원내용.slice(0, 50) + (item.지원내용.length > 50 ? "..." : ""),
        description: item.서비스목적,
        aiGenerated: false,
        generatedAt: "",
      },

      eligibility: {
        age: parseAgeCondition(selectionCriteria),
        income: parseIncomeCondition(selectionCriteria),
        region: parseRegions(item.소관기관명),
        conditions,
        conditionsExplained: selectionCriteria,
      },

      benefit: parseBenefit(item.지원내용),

      documents: parseDocuments(item.구비서류),

      schedule: parseSchedule(item.신청기한),

      application: {
        method: parseMethods(item.신청방법),
        url: item.온라인신청사이트URL || "https://www.bokjiro.go.kr",
        contact: item.문의처,
      },

      warnings: [],

      source: {
        name: item.소관기관명,
        url: item.온라인신청사이트URL || "",
        apiSource: "행안부_공공서비스API",
        lastSync: new Date().toISOString(),
      },

      raw: item,
    };
  });
}
