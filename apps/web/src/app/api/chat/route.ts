import { NextRequest, NextResponse } from "next/server";
import { getWelfareList, searchWelfare, filterByAge } from "@welfaremate/data";

// AI API 없이도 동작하는 규칙 기반 응답 시스템

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  userAge?: number;
  userRegion?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, userAge, userRegion } = body;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const userQuery = lastMessage.content;
    const response = generateResponse(userQuery, userAge, userRegion);

    return NextResponse.json({
      role: "assistant",
      content: response,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateResponse(
  query: string,
  userAge?: number,
  userRegion?: string
): string {
  const lowerQuery = query.toLowerCase();

  // 인사말
  if (
    lowerQuery.includes("안녕") ||
    lowerQuery.includes("하이") ||
    lowerQuery.includes("hello")
  ) {
    return "안녕하세요! 복지메이트 AI 상담사입니다. 😊\n\n궁금한 복지 혜택이 있으시면 편하게 물어봐 주세요.\n\n예시:\n• 청년 월세 지원 받을 수 있어?\n• 취업 관련 지원금 있어?\n• 임신하면 받을 수 있는 혜택 알려줘";
  }

  // 키워드 기반 검색
  const keywords = extractKeywords(query);
  let results = getWelfareList();

  // 나이 필터
  if (userAge) {
    results = filterByAge(userAge);
  }

  // 키워드 검색
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

  // 결과 없음
  if (results.length === 0) {
    return `죄송합니다. "${query}"에 해당하는 복지 혜택을 찾지 못했어요.\n\n다른 키워드로 검색해보시거나, 홈 화면에서 전체 혜택을 확인해보세요.`;
  }

  // 결과 포맷팅
  const topResults = results.slice(0, 3);
  let response = `"${keywords.join(", ")}" 관련 혜택을 찾았어요!\n\n`;

  topResults.forEach((item, index) => {
    response += `**${index + 1}. ${item.title}**\n`;
    response += `${item.summary.oneLiner}\n`;

    if (item.eligibility.age) {
      response += `• 나이: 만 ${item.eligibility.age.min || 0}~${item.eligibility.age.max || 100}세\n`;
    }
    if (item.eligibility.income) {
      response += `• 소득: 중위소득 ${item.eligibility.income.percent}% 이하\n`;
    }
    response += `\n`;
  });

  response += `\n자세한 내용은 각 혜택을 클릭해서 확인해보세요!`;

  // 면책 문구
  response += `\n\n---\n※ 정확한 자격 요건은 원본 페이지에서 확인해주세요.`;

  return response;
}

function extractKeywords(query: string): string[] {
  const keywords: string[] = [];

  // 카테고리 키워드
  const categoryKeywords: Record<string, string[]> = {
    주거: ["월세", "전세", "집", "주거", "임대", "주택"],
    취업: ["취업", "일자리", "구직", "채용", "고용", "직장"],
    창업: ["창업", "사업", "자영업"],
    육아: ["육아", "임신", "출산", "아기", "아이", "영유아", "보육"],
    교육: ["교육", "학교", "학자금", "장학금", "학비"],
    건강: ["건강", "의료", "병원", "치료"],
    금융: ["대출", "금융", "저축", "적금", "도약계좌"],
  };

  for (const [category, words] of Object.entries(categoryKeywords)) {
    for (const word of words) {
      if (query.includes(word)) {
        keywords.push(word);
      }
    }
  }

  // 대상 키워드
  const targetKeywords = ["청년", "노인", "어르신", "장애", "한부모", "다문화", "저소득"];
  for (const keyword of targetKeywords) {
    if (query.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return [...new Set(keywords)];
}
