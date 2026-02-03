import type { WelfareItem } from "@welfaremate/types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * AI로 복지 정보 요약 생성
 */
async function generateSummary(item: WelfareItem): Promise<{
  oneLiner: string;
  description: string;
}> {
  if (!OPENAI_API_KEY) {
    // API 키 없으면 기본 요약 사용
    return {
      oneLiner: item.benefit.amount || item.benefit.description.slice(0, 30),
      description: item.summary.description,
    };
  }

  const prompt = `다음 복지 서비스 정보를 읽고, 일반인이 쉽게 이해할 수 있도록 요약해주세요.

서비스명: ${item.title}
지원내용: ${item.benefit.description}
선정기준: ${item.eligibility.conditionsExplained}
신청방법: ${item.application.method.join(", ")}

다음 형식의 JSON으로 답변해주세요:
{
  "oneLiner": "핵심 혜택을 한 줄로 (예: '월 최대 20만원, 12개월 지원')",
  "description": "2-3문장으로 서비스 설명"
}

JSON만 출력하세요.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "당신은 복지 정보를 쉽게 설명하는 전문가입니다. JSON 형식으로만 답변합니다.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const content = data.choices[0]?.message?.content || "";
    
    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        oneLiner: parsed.oneLiner || item.benefit.amount || item.benefit.description.slice(0, 30),
        description: parsed.description || item.summary.description,
      };
    }
  } catch (error) {
    console.warn(`   ⚠️ AI 요약 실패 (${item.title}):`, error);
  }

  // 실패 시 기본값 반환
  return {
    oneLiner: item.benefit.amount || item.benefit.description.slice(0, 30),
    description: item.summary.description,
  };
}

/**
 * 여러 복지 항목에 대해 AI 요약 생성
 */
export async function generateAISummaries(items: WelfareItem[]): Promise<WelfareItem[]> {
  const results: WelfareItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`   [${i + 1}/${items.length}] ${item.title}`);

    const summary = await generateSummary(item);
    
    results.push({
      ...item,
      summary: {
        oneLiner: summary.oneLiner,
        description: summary.description,
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
      },
    });

    // Rate limiting (OpenAI: 60 RPM for gpt-4o-mini)
    if (OPENAI_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return results;
}
