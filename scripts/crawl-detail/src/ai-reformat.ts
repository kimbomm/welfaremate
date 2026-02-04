import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../data");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `JSON only. No markdown. No emoji. Korean.
Format:{"summary":"50자요약","benefits":[{"label":"항목","value":"금액"}],"eligibility":{"simple":"한문장","details":["조건"]},"documents":[{"name":"서류","how":"발급처"}],"tips":["팁"],"warning":"중복불가시만"}
Max: summary 50자, benefits 5개, details 5개, tips 3개. warning 없으면 null.`;

interface WelfareAIOutput {
  summary: string;
  benefits: { label: string; value: string }[];
  eligibility: { simple: string; details: string[] };
  documents: { name: string; how?: string }[];
  tips: string[];
  warning: string | null;
}

interface TestItem {
  id: string;
  title: string;
  benefit: { description: string };
  eligibility: { conditionsExplained: string };
  raw?: { 지원대상?: string; 선정기준?: string };
  detail?: {
    documents: { required: string[] };
    duplicateWarning?: string;
    legalBasis: { name: string; article: string }[];
  };
}

async function reformatWithAI(item: TestItem): Promise<WelfareAIOutput | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set");
    return null;
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const eligibilityText =
    item.eligibility.conditionsExplained?.trim() ||
    [item.raw?.지원대상, item.raw?.선정기준].filter(Boolean).join("\n\n") ||
    "정보 없음";

  const inputData = `
## 제목
${item.title}

## 지원내용
${item.benefit.description}

## 자격조건 (지원대상/선정기준)
${eligibilityText}

## 구비서류
${item.detail?.documents.required.join("\n") || "정보 없음"}

## 법적근거
${item.detail?.legalBasis.map((l) => `${l.name} ${l.article}`).join(", ") || "정보 없음"}

## 중복수혜 제한
${item.detail?.duplicateWarning || "없음"}
`;

  try {
    const result = await model.generateContent(SYSTEM_PROMPT + "\n\n" + inputData);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response");
      return null;
    }

    return JSON.parse(jsonMatch[0]) as WelfareAIOutput;
  } catch (error) {
    console.error("AI error:", error);
    return null;
  }
}

async function main() {
  const snapshotPath = path.join(DATA_DIR, "welfare-snapshot.json");
  const detailPath = path.join(DATA_DIR, "welfare-detail-sample.json");

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  const detail = JSON.parse(fs.readFileSync(detailPath, "utf-8"));

  const testIds = [
    "welfare_000000465790", // 유아학비
    "welfare_105100000001", // 근로장려금
    "welfare_116010000001", // 월세자금보증
  ];

  console.log("🤖 AI 재가공 테스트 시작 (3개 항목)\n");

  const results: Record<string, WelfareAIOutput> = {};

  for (const id of testIds) {
    const item = snapshot.items.find((i: { id: string }) => i.id === id);
    if (!item) {
      console.log(`❌ ${id} not found`);
      continue;
    }

    const serviceId = item.raw?.서비스ID;
    const itemDetail = serviceId ? detail.items[serviceId] : undefined;

    console.log(`\n📝 처리 중: ${item.title}`);
    console.log(`   ID: ${id}`);

    const testItem: TestItem = {
      id,
      title: item.title,
      benefit: item.benefit,
      eligibility: item.eligibility,
      raw: item.raw,
      detail: itemDetail,
    };

    const result = await reformatWithAI(testItem);

    if (result) {
      results[id] = result;
      console.log(`   ✅ 성공`);
      console.log(`   요약: ${result.summary}`);
      console.log(`   혜택: ${result.benefits.length}개`);
      console.log(`   서류: ${result.documents.length}개`);
      console.log(`   팁: ${result.tips.length}개`);
    } else {
      console.log(`   ❌ 실패`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  const outputPath = path.join(DATA_DIR, "welfare-ai-sample.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        items: results,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`\n📁 저장 완료: ${outputPath}`);
  console.log("\n--- 상세 결과 ---\n");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
