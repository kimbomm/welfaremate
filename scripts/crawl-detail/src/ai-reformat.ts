/**
 * 상세 재가공 테스트: 샘플 3개 항목을 WelfareAIData 형식으로 변환 후 welfare-ai-sample.json에 저장.
 * API 없이 규칙 기반 변환 (reformat-rules.ts = 프롬프트 형식과 동일한 출력 스키마).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { reformatByRules, type WelfareAIOutput, type ReformatInput } from "./reformat-rules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../data");

function main() {
  const snapshotPath = path.join(DATA_DIR, "welfare-snapshot.json");
  const detailPath = path.join(DATA_DIR, "welfare-detail-sample.json");

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  const detail = JSON.parse(fs.readFileSync(detailPath, "utf-8"));

  const testIds = [
    "welfare_000000465790",
    "welfare_105100000001",
    "welfare_116010000001",
  ];

  const results: Record<string, WelfareAIOutput> = {};

  for (const id of testIds) {
    const item = snapshot.items.find((i: { id: string }) => i.id === id);
    if (!item) continue;

    const serviceId = item.raw?.서비스ID;
    const itemDetail = serviceId ? detail.items[serviceId] : undefined;

    const testItem: ReformatInput = {
      id,
      title: item.title,
      benefit: item.benefit,
      eligibility: item.eligibility,
      raw: item.raw,
      detail: itemDetail,
    };

    results[id] = reformatByRules(testItem);
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

  console.log(`Saved: ${outputPath}`);
}

main();
