import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getWelfareList, searchWelfare, filterByAge } from "@welfaremate/data";

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

async function generateGeminiResponse(
  messages: ChatMessage[],
  userQuery: string,
  userAge?: number,
  userRegion?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // 관련 복지 데이터 검색
  const keywords = extractKeywords(userQuery);
  let relevantWelfare = getWelfareList();

  if (userAge) {
    relevantWelfare = filterByAge(userAge);
  }

  if (keywords.length > 0) {
    relevantWelfare = relevantWelfare.filter((item) =>
      keywords.some(
        (keyword) =>
          item.title.includes(keyword) ||
          item.tags.some((tag) => tag.includes(keyword)) ||
          item.summary.oneLiner.includes(keyword)
      )
    );
  }

  const topWelfare = relevantWelfare.slice(0, 5);

  // 프롬프트 구성
  let prompt = SYSTEM_PROMPT + "\n\n";

  if (userAge) {
    prompt += `사용자 정보: 만 ${userAge}세\n`;
  }
  if (userRegion) {
    prompt += `거주 지역: ${userRegion}\n`;
  }

  if (topWelfare.length > 0) {
    prompt += "\n관련 복지 혜택 데이터:\n";
    topWelfare.forEach((item, i) => {
      prompt += `${i + 1}. ${item.title}\n`;
      prompt += `   - 요약: ${item.summary.oneLiner}\n`;
      if (item.eligibility.age) {
        prompt += `   - 나이: 만 ${item.eligibility.age.min || 0}~${item.eligibility.age.max || 100}세\n`;
      }
      if (item.eligibility.income) {
        prompt += `   - 소득: 중위소득 ${item.eligibility.income.percent}% 이하\n`;
      }
      prompt += "\n";
    });
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

  const keywords = extractKeywords(query);
  let results = getWelfareList();

  if (userAge) {
    results = filterByAge(userAge);
  }

  if (keywords.length > 0) {
    results = results.filter((item) =>
      keywords.some(
        (keyword) =>
          item.title.includes(keyword) ||
          item.tags.some((tag) => tag.includes(keyword)) ||
          item.summary.oneLiner.includes(keyword) ||
          item.eligibility.conditionsExplained.includes(keyword)
      )
    );
  }

  if (results.length === 0) {
    return `죄송합니다. "${query}"에 해당하는 복지 혜택을 찾지 못했어요.\n\n다른 키워드로 검색해보시거나, 홈 화면에서 전체 혜택을 확인해보세요.`;
  }

  const topResults = results.slice(0, 3);
  let response = `"${keywords.join(", ")}" 관련 혜택을 찾았어요!\n\n`;

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

function extractKeywords(query: string): string[] {
  const keywords: string[] = [];

  const categoryKeywords: Record<string, string[]> = {
    주거: ["월세", "전세", "집", "주거", "임대", "주택"],
    취업: ["취업", "일자리", "구직", "채용", "고용", "직장"],
    창업: ["창업", "사업", "자영업"],
    육아: ["육아", "임신", "출산", "아기", "아이", "영유아", "보육"],
    교육: ["교육", "학교", "학자금", "장학금", "학비"],
    건강: ["건강", "의료", "병원", "치료"],
    금융: ["대출", "금융", "저축", "적금", "도약계좌"],
  };

  for (const [, words] of Object.entries(categoryKeywords)) {
    for (const word of words) {
      if (query.includes(word)) {
        keywords.push(word);
      }
    }
  }

  const targetKeywords = [
    "청년",
    "노인",
    "어르신",
    "장애",
    "한부모",
    "다문화",
    "저소득",
  ];
  for (const keyword of targetKeywords) {
    if (query.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return Array.from(new Set(keywords));
}
