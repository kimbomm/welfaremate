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

export interface AgeRange {
  min?: number;
  max?: number;
}

export interface WelfareTargetFlags {
  isCareLeaverOnly?: boolean;
  isSingleParentOnly?: boolean;
  requiresBasicLivelihoodOrNearPoor?: boolean;
  requiresStudent?: boolean;
  requiresDisabled?: boolean;
  age?: AgeRange;
}

interface WelfareTargetsFile {
  version: string;
  generatedAt: string;
  items: Record<string, WelfareTargetFlags>;
}

function extractAgeFromText(text: string): AgeRange | undefined {
  const t = text.replace(/\s+/g, " ");
  const currentYear = new Date().getFullYear();
  let min: number | undefined;
  let max: number | undefined;

  const rangeMatch = t.match(/(?:만\s*)?(\d+)\s*세?\s*[~\-]\s*(\d+)\s*세?/);
  if (rangeMatch) {
    min = parseInt(rangeMatch[1], 10);
    max = parseInt(rangeMatch[2], 10);
    if (min > max) [min, max] = [max, min];
  }

  const aboveMatch = t.match(/(?:만\s*)?(\d+)\s*세?\s*이상/);
  if (aboveMatch) {
    const n = parseInt(aboveMatch[1], 10);
    if (min === undefined || n > min) min = n;
  }

  const belowMatch = t.match(/(?:만\s*)?(\d+)\s*세?\s*이하/);
  if (belowMatch) {
    const n = parseInt(belowMatch[1], 10);
    if (max === undefined || n < max) max = n;
  }

  const birthRangeMatch = t.match(/(\d{4})\s*[~\-]\s*(\d{4})\s*년\s*출생/);
  if (birthRangeMatch) {
    const y1 = parseInt(birthRangeMatch[1], 10);
    const y2 = parseInt(birthRangeMatch[2], 10);
    const minYear = 1920;
    const maxYear = currentYear - 1;
    if (y1 >= minYear && y1 <= maxYear && y2 >= minYear && y2 <= maxYear) {
      const m1 = currentYear - Math.max(y1, y2);
      const m2 = currentYear - Math.min(y1, y2);
      if (min === undefined || m1 < min) min = m1;
      if (max === undefined || m2 > max) max = m2;
    }
  }

  if (/청년\s*\(.*만\s*(\d+)\s*[~\-]\s*(\d+)/.test(t)) {
    const youthMatch = t.match(/청년\s*\(.*만\s*(\d+)\s*[~\-]\s*(\d+)/);
    if (youthMatch) {
      min = parseInt(youthMatch[1], 10);
      max = parseInt(youthMatch[2], 10);
    }
  } else if (/청년\b/.test(t) && min === undefined && max === undefined) {
    min = 19;
    max = 34;
  }

  const clamp = (n: number) => Math.max(0, Math.min(99, n));
  if (min !== undefined) min = clamp(min);
  if (max !== undefined) max = clamp(max);
  if (min !== undefined && max !== undefined && min > max) return undefined;
  if (min === undefined && max === undefined) return undefined;
  const age: AgeRange = {};
  if (min !== undefined) age.min = min;
  if (max !== undefined) age.max = max;
  return age;
}

function buildFlags(text: string): WelfareTargetFlags {
  const t = text.replace(/\s+/g, " ");
  const flags: WelfareTargetFlags = {};

  const ageRange = extractAgeFromText(t);
  if (ageRange) flags.age = ageRange;

  if (
    /보호종료아동|보호종료청소년|자립준비청년|시설\s*퇴소청소년|만기\s*퇴소|가정위탁\s*보호종료/.test(t)
  ) {
    flags.isCareLeaverOnly = true;
  }

  if (/한부모가정|한부모가족/.test(t)) {
    flags.isSingleParentOnly = true;
  }

  if (/기초생활수급자|기초생활 수급자|차상위계층|차상위 계층/.test(t)) {
    flags.requiresBasicLivelihoodOrNearPoor = true;
  }

  if (/대학교\s*재학생|대학생|재학 중인 자|재학중인 자/.test(t)) {
    flags.requiresStudent = true;
  }

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

