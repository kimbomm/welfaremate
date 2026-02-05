/**
 * 스냅샷 raw 지원대상/선정기준 → 협소 대상 플래그(welfare-targets.json) 생성
 *
 * 실행 예:
 *   pnpm targets     (전체)
 *
 * 입력: data/welfare-snapshot.json
 * 출력: data/welfare-targets.json
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const SNAPSHOT_PATH = join(DATA_DIR, "welfare-snapshot.json");
const OUTPUT_PATH = join(DATA_DIR, "welfare-targets.json");

interface SnapshotItem {
  id: string;
  raw?: Record<string, unknown>;
}

interface SnapshotFile {
  version: string;
  totalCount: number;
  items: SnapshotItem[];
}

export interface WelfareTargetFlags {
  isCareLeaverOnly?: boolean;
  isSingleParentOnly?: boolean;
  requiresBasicLivelihoodOrNearPoor?: boolean;
  requiresStudent?: boolean;
  requiresDisabled?: boolean;
}

interface WelfareTargetsFile {
  version: string;
  generatedAt: string;
  items: Record<string, WelfareTargetFlags>;
}

function buildFlags(text: string): WelfareTargetFlags {
  const t = text.replace(/\s+/g, " ");
  const flags: WelfareTargetFlags = {};

  // 자립준비청년/보호종료아동 전용
  if (
    /보호종료아동|자립준비청년|시설\s*퇴소청소년|가정위탁\s*보호종료/.test(t)
  ) {
    flags.isCareLeaverOnly = true;
  }

  // 한부모가구 전용
  if (/한부모가정|한부모가족/.test(t)) {
    flags.isSingleParentOnly = true;
  }

  // 기초수급/차상위 전용 (저소득)
  if (/기초생활수급자|기초생활 수급자|차상위계층|차상위 계층/.test(t)) {
    flags.requiresBasicLivelihoodOrNearPoor = true;
  }

  // 대학생/재학생 전용
  if (/대학교\s*재학생|대학생|재학 중인 자|재학중인 자/.test(t)) {
    flags.requiresStudent = true;
  }

  // 장애인 전용
  if (/등록장애인|장애인|중증장애/.test(t)) {
    flags.requiresDisabled = true;
  }

  return flags;
}

function main() {
  console.log("Reading snapshot...");
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as SnapshotFile;

  const items: Record<string, WelfareTargetFlags> = {};
  let withText = 0;

  for (const item of snapshot.items) {
    const raw = item.raw as Record<string, unknown> | undefined;
    const supportTarget = (raw?.지원대상 as string | undefined) ?? "";
    const selectionCriteria = (raw?.선정기준 as string | undefined) ?? "";
    const text = [selectionCriteria, supportTarget].filter(Boolean).join("\n").trim();

    if (!text) continue;
    withText++;

    const flags = buildFlags(text);
    if (Object.keys(flags).length > 0) {
      items[item.id] = flags;
    }
  }

  const result: WelfareTargetsFile = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    items,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf-8");
  console.log(
    `Wrote ${OUTPUT_PATH}, withText=${withText}, flagged=${Object.keys(items).length}`
  );
}

main();

