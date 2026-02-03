import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getWelfareList, filterByAge } from "@welfaremate/data";
import type { WelfareItem } from "@welfaremate/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  userAge?: number;
  userRegion?: string;
}

const SYSTEM_PROMPT = `당신은 "복지메이트"의 AI 상담사입니다. 친근하고 전문적으로 복지 정보를 안내합니다.

역할:
- 사용자의 질문을 이해하고 적절한 복지 혜택을 안내
- 어려운 용어는 쉽게 풀어서 설명
- 자격 요건, 신청 방법 등을 명확하게 안내

규칙:
- 답변은 간결하게 (3-5문장)
- 확실하지 않은 정보는 "정확한 내용은 해당 기관에 문의하세요"라고 안내
- 혜택이 없으면 솔직하게 안내
- 혜택을 언급할 때 반드시 [[혜택명|ID]] 형식으로 작성 (예: [[청년 월세 지원|welfare_WF0001]])
- 마지막에 면책 문구 포함: "※ 정확한 자격 요건은 원본 페이지에서 확인해주세요."`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, userAge, userRegion } = body;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const userQuery = lastMessage.content;

    // Gemini API 사용 가능 시
    if (GEMINI_API_KEY) {
      try {
        const response = await generateGeminiResponse(
          messages,
          userQuery,
          userAge,
          userRegion
        );
        return NextResponse.json({
          role: "assistant",
          content: response,
        });
      } catch (aiError) {
        console.error("Gemini API error:", aiError);
        // AI 실패 시 Fallback
        const response = generateFallbackResponse(userQuery, userAge, userRegion);
        return NextResponse.json({
          role: "assistant",
          content: response,
        });
      }
    }

    // Fallback: 규칙 기반 응답
    const response = generateFallbackResponse(userQuery, userAge, userRegion);
    return NextResponse.json({
      role: "assistant",
      content: response,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", detail: errorMessage },
      { status: 500 }
    );
  }
}

// 단순 텍스트 검색
function searchWelfareByText(query: string, allWelfare: WelfareItem[]): WelfareItem[] {
  const lowerQuery = query.toLowerCase();
  return allWelfare.filter((item) =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
    item.summary.oneLiner.toLowerCase().includes(lowerQuery) ||
    item.eligibility.conditionsExplained.toLowerCase().includes(lowerQuery)
  );
}

// Gemini로 키워드 추출
async function extractKeywordsWithGemini(query: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `다음 질문에서 복지/혜택 검색에 사용할 핵심 키워드를 추출해주세요.
키워드만 쉼표로 구분해서 응답하세요. 다른 설명 없이 키워드만.

질문: "${query}"

예시:
- "임산부가 받을 수 있는 혜택" → 임산부,임신,출산,산모
- "청년 월세 지원" → 청년,월세,주거,임대
- "취업 준비생 지원금" → 취업,구직,청년,지원금`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  return text.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
}

// 키워드로 복지 검색
function searchWelfareByKeywords(keywords: string[], allWelfare: WelfareItem[]): WelfareItem[] {
  return allWelfare.filter((item) =>
    keywords.some((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      return (
        item.title.toLowerCase().includes(lowerKeyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword)) ||
        item.summary.oneLiner.toLowerCase().includes(lowerKeyword) ||
        item.eligibility.conditionsExplained.toLowerCase().includes(lowerKeyword)
      );
    })
  );
}

async function generateGeminiResponse(
  messages: ChatMessage[],
  userQuery: string,
  userAge?: number,
  userRegion?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // 1. 기본 복지 데이터 가져오기
  let allWelfare = getWelfareList();

  // 나이 필터
  if (userAge) {
    allWelfare = filterByAge(userAge);
  }

  // 지역 필터
  if (userRegion) {
    allWelfare = allWelfare.filter((item) => {
      if (!item.eligibility.region || item.eligibility.region.length === 0) {
        return true;
      }
      return item.eligibility.region.some((r) => r.includes(userRegion));
    });
  }

  // 2. 단순 텍스트 검색 시도
  let relevantWelfare = searchWelfareByText(userQuery, allWelfare);

  // 3. 결과 없으면 Gemini로 키워드 추출 후 재검색
  if (relevantWelfare.length === 0) {
    const keywords = await extractKeywordsWithGemini(userQuery);
    if (keywords.length > 0) {
      relevantWelfare = searchWelfareByKeywords(keywords, allWelfare);
    }
  }

  const topWelfare = relevantWelfare.slice(0, 5);

  // 4. 프롬프트 구성
  let prompt = SYSTEM_PROMPT + "\n\n";

  if (userAge) {
    prompt += `사용자 정보: 만 ${userAge}세\n`;
  }
  if (userRegion) {
    prompt += `거주 지역: ${userRegion}\n`;
  }

  if (topWelfare.length > 0) {
    prompt += "\n관련 복지 혜택 데이터 (혜택 언급 시 반드시 [[제목|ID]] 형식 사용):\n";
    topWelfare.forEach((item, i) => {
      prompt += `${i + 1}. ${item.title} (ID: ${item.id})\n`;
      prompt += `   - 요약: ${item.summary.oneLiner}\n`;
      if (item.eligibility.age) {
        prompt += `   - 나이: 만 ${item.eligibility.age.min || 0}~${item.eligibility.age.max || 100}세\n`;
      }
      if (item.eligibility.income) {
        prompt += `   - 소득: 중위소득 ${item.eligibility.income.percent}% 이하\n`;
      }
      prompt += `   → 언급 시: [[${item.title}|${item.id}]]\n`;
      prompt += "\n";
    });
  } else {
    prompt += "\n관련 복지 혜택을 찾지 못했습니다. 일반적인 안내를 해주세요.\n";
  }

  // 이전 대화 요약 추가
  const prevMessages = messages.slice(0, -1);
  if (prevMessages.length > 0) {
    prompt += "\n이전 대화:\n";
    prevMessages.slice(-4).forEach((msg) => {
      const role = msg.role === "user" ? "사용자" : "상담사";
      prompt += `${role}: ${msg.content.slice(0, 100)}...\n`;
    });
  }

  prompt += `\n사용자 질문: ${userQuery}`;

  // 5. Gemini 답변 생성
  const result = await model.generateContent(prompt);
  const response = result.response.text();

  return response;
}

function generateFallbackResponse(
  query: string,
  userAge?: number,
  userRegion?: string
): string {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("안녕") ||
    lowerQuery.includes("하이") ||
    lowerQuery.includes("hello")
  ) {
    return "안녕하세요! 복지메이트 AI 상담사입니다.\n\n궁금한 복지 혜택이 있으시면 편하게 물어봐 주세요.\n\n예시:\n- 청년 월세 지원 받을 수 있어?\n- 취업 관련 지원금 있어?\n- 임신하면 받을 수 있는 혜택 알려줘";
  }

  // 단순 텍스트 검색
  let results = getWelfareList();

  if (userAge) {
    results = filterByAge(userAge);
  }

  results = searchWelfareByText(query, results);

  if (results.length === 0) {
    return `죄송합니다. "${query}"에 해당하는 복지 혜택을 찾지 못했어요.\n\n다른 키워드로 검색해보시거나, 홈 화면에서 전체 혜택을 확인해보세요.`;
  }

  const topResults = results.slice(0, 3);
  let response = `"${query}" 관련 혜택을 찾았어요!\n\n`;

  topResults.forEach((item, index) => {
    response += `**${index + 1}. ${item.title}**\n`;
    response += `${item.summary.oneLiner}\n`;

    if (item.eligibility.age) {
      response += `- 나이: 만 ${item.eligibility.age.min || 0}~${item.eligibility.age.max || 100}세\n`;
    }
    if (item.eligibility.income) {
      response += `- 소득: 중위소득 ${item.eligibility.income.percent}% 이하\n`;
    }
    response += `\n`;
  });

  response += `\n자세한 내용은 각 혜택을 클릭해서 확인해보세요!`;
  response += `\n\n---\n※ 정확한 자격 요건은 원본 페이지에서 확인해주세요.`;

  return response;
}
