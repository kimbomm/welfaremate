import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { crawlMultiple } from "./crawler.js";
import type { WelfareDetailResult, WelfareDetail } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../data");

const SAMPLE_IDS = [
  "000000465790", // 유아학비 (누리과정) 지원
  "105100000001", // 근로·자녀장려금
  "116010000001", // 주택금융공사 월세자금보증
  "119200000001", // 친환경 에너지절감장비 보급
  "119200000007", // 해양사고 국선 심판변론인 선정 지원
];

interface SnapshotItem {
  raw?: {
    서비스ID?: string;
    수정일시?: string;
  };
}

interface SnapshotFile {
  items: SnapshotItem[];
}

function parseLimit(): number | undefined {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1 || !process.argv[idx + 1]) return undefined;
  const n = parseInt(process.argv[idx + 1], 10);
  return Number.isNaN(n) || n < 1 ? undefined : n;
}

function loadSnapshot(): { serviceIds: string[]; modifiedMap: Record<string, string | undefined> } {
  const snapshotPath = path.join(DATA_DIR, "welfare-snapshot.json");
  const content = fs.readFileSync(snapshotPath, "utf-8");
  const snapshot = JSON.parse(content) as SnapshotFile;

  const serviceIds: string[] = [];
  const modifiedMap: Record<string, string | undefined> = {};

  for (const item of snapshot.items) {
    const raw = item.raw;
    const serviceId = raw?.서비스ID;
    if (!serviceId) continue;
    serviceIds.push(serviceId);
    modifiedMap[serviceId] = raw?.수정일시 as string | undefined;
  }

  return { serviceIds, modifiedMap };
}

function loadPreviousDetail(isSample: boolean): WelfareDetailResult | null {
  const filename = isSample ? "welfare-detail-sample.json" : "welfare-detail.json";
  const detailPath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(detailPath)) return null;
  try {
    const content = fs.readFileSync(detailPath, "utf-8");
    return JSON.parse(content) as WelfareDetailResult;
  } catch {
    return null;
  }
}

async function main() {
  const isSample = process.argv.includes("--sample");
  const limit = parseLimit();

  console.log("정부24 상세페이지 크롤링 시작...\n");

  // 샘플 모드는 항상 풀 크롤 (기존 동작 유지)
  if (isSample) {
    console.log("샘플 모드: 5개 항목만 크롤링\n");
    const serviceIds = SAMPLE_IDS;

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

    const outputPath = path.join(DATA_DIR, "welfare-detail-sample.json");
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
    console.log(`📁 저장 완료: ${outputPath}`);

    console.log("\n--- 샘플 결과 미리보기 ---\n");
    for (const [id, data] of results) {
      console.log(`[${id}]`);
      console.log(`  구비서류: ${data.documents.required.length}개`);
      console.log(`  중복불가: ${data.duplicateWarning || "없음"}`);
      console.log(`  법령근거: ${data.legalBasis.length}개`);
      console.log(`  연락처: ${data.contact.phone.join(", ") || "없음"}`);
      console.log("");
    }
    return;
  }

  // 전체 모드: 스냅샷 + 기존 상세를 기반으로 증분 크롤링
  console.log("전체 모드: welfare-snapshot.json에서 ID 및 수정일시 추출\n");
  const { serviceIds, modifiedMap } = loadSnapshot();
  let targetIds = serviceIds;

  if (limit !== undefined) {
    targetIds = serviceIds.slice(0, limit);
    console.log(`--limit ${limit} 적용: ${targetIds.length}개만 고려\n`);
  } else {
    console.log(`총 ${serviceIds.length}개 ID 발견\n`);
  }

  const prevDetail = loadPreviousDetail(false);
  const mergedItems: Record<string, WelfareDetail> = prevDetail?.items
    ? { ...prevDetail.items }
    : {};

  const toCrawl: string[] = [];

  for (const id of targetIds) {
    const prev = mergedItems[id];
    const modified = modifiedMap[id];

    if (!prev) {
      // 신규: 상세 없으면 크롤 대상
      toCrawl.push(id);
      continue;
    }

    if (!prev.sourceModified) {
      // 이전 상세에는 수정일시 메타가 없던 경우:
      // 크롤은 다시 하지 않고, 이번 스냅샷의 수정일시를 baseline으로만 기록
      if (modified) {
        prev.sourceModified = modified;
      }
      continue;
    }

    if (modified && prev.sourceModified && modified !== prev.sourceModified) {
      // 스냅샷 수정일시가 바뀐 경우에만 재크롤
      toCrawl.push(id);
    }
    // 수정일시 동일하면 그대로 재사용
  }

  console.log(
    `증분 크롤링 대상: ${toCrawl.length}개 (전체 고려 ID: ${targetIds.length}개)\n`,
  );

  const results = await crawlMultiple(toCrawl, (current, total, id) => {
    console.log(`[${current}/${total}] ${id}`);
  });

  console.log(`\n✅ 크롤링 완료: ${results.size}/${toCrawl.length} 성공\n`);

  // 크롤된 결과 반영 + sourceModified 갱신
  for (const [id, data] of results) {
    const modified = modifiedMap[id];
    mergedItems[id] = {
      ...data,
      sourceModified: modified ?? mergedItems[id]?.sourceModified,
    };
  }

  // 최종 items는 이번 스냅샷에 존재하는 ID만 유지
  const finalItems: Record<string, WelfareDetail> = {};
  for (const id of targetIds) {
    if (mergedItems[id]) {
      finalItems[id] = mergedItems[id];
    }
  }

  const successCount = Object.keys(finalItems).length;
  const failedIds = targetIds.filter((id) => !finalItems[id]);

  const output: WelfareDetailResult = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    totalCount: targetIds.length,
    successCount,
    failedIds,
    items: finalItems,
  };

  const outputPath = path.join(DATA_DIR, "welfare-detail.json");

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`📁 저장 완료: ${outputPath}`);
}

main().catch(console.error);
