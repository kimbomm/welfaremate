/**
 * 전체 상세 재가공: welfare-detail.json 전체를 WelfareAIData 형식으로 변환 후 welfare-ai.json에 저장.
 * API 없이 규칙 기반 변환 (reformat-rules.ts = 프롬프트 형식과 동일한 출력 스키마).
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { reformatByRules, type WelfareAIOutput, type ReformatInput } from "./reformat-rules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../data");

const CHECKPOINT_EVERY = 100;

interface Checkpoint {
  lastProcessedIndex: number;
  items: Record<string, WelfareAIOutput>;
}

function loadCheckpoint(): Checkpoint | null {
  const p = path.join(DATA_DIR, "welfare-ai-rework-checkpoint.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Checkpoint;
  } catch {
    return null;
  }
}

function saveCheckpoint(cp: Checkpoint): void {
  const p = path.join(DATA_DIR, "welfare-ai-rework-checkpoint.json");
  fs.writeFileSync(p, JSON.stringify(cp, null, 2), "utf-8");
}

function loadExistingAI(): { items: Record<string, WelfareAIOutput>; generatedAt: string } | null {
  const p = path.join(DATA_DIR, "welfare-ai.json");
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    return { items: data.items || {}, generatedAt: data.generatedAt || "" };
  } catch {
    return null;
  }
}

function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
  const changedOnly = process.argv.includes("--changed-only");

  const snapshotPath = path.join(DATA_DIR, "welfare-snapshot.json");
  const detailPath = path.join(DATA_DIR, "welfare-detail.json");
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  const detail = JSON.parse(fs.readFileSync(detailPath, "utf-8"));

  const snapshotByServiceId = new Map<string, (typeof snapshot.items)[0]>();
  for (const item of snapshot.items) {
    const sid = item.raw?.서비스ID;
    if (sid) snapshotByServiceId.set(sid, item);
  }

  let serviceIds = Object.keys(detail.items);
  let items: Record<string, WelfareAIOutput> = {};
  let startIndex = 0;

  if (changedOnly) {
    const existing = loadExistingAI();
    const aiGeneratedAt = existing?.generatedAt || "";
    serviceIds = serviceIds.filter((sid) => {
      const wid = "welfare_" + sid;
      const det = detail.items[sid] as { lastCrawled?: string } | undefined;
      const inAi = existing?.items[wid];
      if (!inAi) return true;
      return det?.lastCrawled && aiGeneratedAt && det.lastCrawled > aiGeneratedAt;
    });
    items = { ...(existing?.items || {}) };
    console.log(`Changed-only: ${serviceIds.length} items to rework (existing: ${Object.keys(items).length})`);
  } else if (limit !== undefined && limit > 0) {
    serviceIds = serviceIds.slice(0, limit);
    console.log(`Limit: ${limit} items`);
  } else if (!limit) {
    const cp = loadCheckpoint();
    if (cp && cp.lastProcessedIndex >= 0 && cp.items) {
      startIndex = cp.lastProcessedIndex + 1;
      items = { ...cp.items };
      console.log(`Resume from index ${startIndex} (${Object.keys(items).length} already done)`);
      const allIds = Object.keys(detail.items);
      serviceIds = allIds.slice(startIndex);
      startIndex = 0;
    }
  }

  if (changedOnly && serviceIds.length === 0) {
    console.log("No changed items. Done.");
    return;
  }

  const total = serviceIds.length;

  for (let i = startIndex; i < total; i++) {
    const serviceId = serviceIds[i];
    const snap = snapshotByServiceId.get(serviceId);
    const det = detail.items[serviceId];
    if (!snap || !det) continue;

    const welfareId = "welfare_" + serviceId;
    const testItem: ReformatInput = {
      id: welfareId,
      title: snap.title,
      benefit: snap.benefit,
      eligibility: snap.eligibility,
      raw: snap.raw,
      detail: {
        documents: det.documents,
        duplicateWarning: det.duplicateWarning,
        legalBasis: det.legalBasis || [],
      },
    };

    const result = reformatByRules(testItem);
    items[welfareId] = result;

    if ((i + 1) % 500 === 0 || i === total - 1) {
      console.log(`[${i + 1}/${total}] ${snap.title?.slice(0, 30)}...`);
    }

    if (!limit && !changedOnly && (i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint({ lastProcessedIndex: i, items });
      console.log(`Checkpoint saved at ${i + 1}`);
    }
  }

  const outputPath = path.join(DATA_DIR, "welfare-ai.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        items,
      },
      null,
      2
    ),
    "utf-8"
  );

  if (!limit && !changedOnly) {
    const checkpointPath = path.join(DATA_DIR, "welfare-ai-rework-checkpoint.json");
    if (fs.existsSync(checkpointPath)) fs.unlinkSync(checkpointPath);
  }

  console.log(`Done. ${Object.keys(items).length} items written to ${outputPath}.`);
}

main();
