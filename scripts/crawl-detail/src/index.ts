import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { crawlMultiple } from "./crawler.js";
import type { WelfareDetailResult } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../data");

const SAMPLE_IDS = [
  "000000465790", // 유아학비 (누리과정) 지원
  "105100000001", // 근로·자녀장려금
  "116010000001", // 주택금융공사 월세자금보증
  "119200000001", // 친환경 에너지절감장비 보급
  "119200000007", // 해양사고 국선 심판변론인 선정 지원
];

function parseLimit(): number | undefined {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1 || !process.argv[idx + 1]) return undefined;
  const n = parseInt(process.argv[idx + 1], 10);
  return Number.isNaN(n) || n < 1 ? undefined : n;
}

async function main() {
  const isSample = process.argv.includes("--sample");
  const limit = parseLimit();

  console.log("정부24 상세페이지 크롤링 시작...\n");

  let serviceIds: string[];

  if (isSample) {
    console.log("샘플 모드: 5개 항목만 크롤링\n");
    serviceIds = SAMPLE_IDS;
  } else {
    console.log("전체 모드: welfare-snapshot.json에서 ID 추출\n");
    serviceIds = extractServiceIds();
    if (limit !== undefined) {
      serviceIds = serviceIds.slice(0, limit);
      console.log(`--limit ${limit} 적용: ${serviceIds.length}개만 크롤링\n`);
    } else {
      console.log(`총 ${serviceIds.length}개 ID 발견\n`);
    }
  }

  const results = await crawlMultiple(serviceIds, (current, total, id) => {
    console.log(`[${current}/${total}] ${id}`);
  });

  console.log(`\n✅ 크롤링 완료: ${results.size}/${serviceIds.length} 성공\n`);

  const output: WelfareDetailResult = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    totalCount: serviceIds.length,
    successCount: results.size,
    failedIds: serviceIds.filter((id) => !results.has(id)),
    items: Object.fromEntries(results),
  };

  const outputPath = isSample
    ? path.join(DATA_DIR, "welfare-detail-sample.json")
    : path.join(DATA_DIR, limit !== undefined ? "welfare-detail.json" : "welfare-detail.json");

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`📁 저장 완료: ${outputPath}`);

  if (isSample) {
    console.log("\n--- 샘플 결과 미리보기 ---\n");
    for (const [id, data] of results) {
      console.log(`[${id}]`);
      console.log(`  구비서류: ${data.documents.required.length}개`);
      console.log(`  중복불가: ${data.duplicateWarning || "없음"}`);
      console.log(`  법령근거: ${data.legalBasis.length}개`);
      console.log(`  연락처: ${data.contact.phone.join(", ") || "없음"}`);
      console.log("");
    }
  }
}

function extractServiceIds(): string[] {
  const snapshotPath = path.join(DATA_DIR, "welfare-snapshot.json");
  const content = fs.readFileSync(snapshotPath, "utf-8");
  const snapshot = JSON.parse(content);

  return snapshot.items.map((item: { raw?: { 서비스ID?: string } }) => {
    return item.raw?.서비스ID || "";
  }).filter(Boolean);
}

main().catch(console.error);
