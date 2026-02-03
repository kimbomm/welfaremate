import "dotenv/config";
import { fetchPublicServices } from "./api.js";
import { transformToWelfareItems } from "./transform.js";
import { generateAISummaries } from "./ai.js";
import { loadPreviousSnapshot, saveSnapshot, diffSnapshots } from "./snapshot.js";

async function main() {
  console.log("🚀 복지 데이터 스냅샷 생성 시작...\n");

  // 1. 이전 스냅샷 로드
  console.log("📂 이전 스냅샷 로드 중...");
  const previousSnapshot = await loadPreviousSnapshot();
  console.log(`   이전 데이터: ${previousSnapshot.length}건\n`);

  // 2. 공공 API에서 데이터 수집
  console.log("🌐 공공 API 데이터 수집 중...");
  const rawData = await fetchPublicServices();
  console.log(`   수집된 데이터: ${rawData.length}건\n`);

  // 3. 데이터 변환
  console.log("🔄 데이터 변환 중...");
  const transformed = transformToWelfareItems(rawData);
  console.log(`   변환된 데이터: ${transformed.length}건\n`);

  // 4. 변경분 감지
  console.log("🔍 변경분 감지 중...");
  const { added, modified, unchanged } = diffSnapshots(previousSnapshot, transformed);
  console.log(`   신규: ${added.length}건`);
  console.log(`   수정: ${modified.length}건`);
  console.log(`   유지: ${unchanged.length}건\n`);

  // 5. AI 요약 생성 (신규 + 수정분만)
  const needsSummary = [...added, ...modified];
  if (needsSummary.length > 0) {
    console.log(`🤖 AI 요약 생성 중... (${needsSummary.length}건)`);
    const withSummaries = await generateAISummaries(needsSummary);
    
    // 기존 데이터와 병합
    const unchangedWithPrevSummary = unchanged.map((item) => {
      const prev = previousSnapshot.find((p) => p.id === item.id);
      return prev ? { ...item, summary: prev.summary } : item;
    });
    
    const finalData = [...unchangedWithPrevSummary, ...withSummaries];
    
    // 6. 스냅샷 저장
    console.log("\n💾 스냅샷 저장 중...");
    await saveSnapshot(finalData);
    console.log(`   저장 완료: ${finalData.length}건\n`);
  } else {
    console.log("ℹ️  변경사항 없음. 스냅샷 유지.\n");
  }

  console.log("✅ 스냅샷 생성 완료!");
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exit(1);
});
