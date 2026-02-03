import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { WelfareItem } from "@welfaremate/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "../../../data/welfare-snapshot.json");

interface SnapshotFile {
  version: string;
  generatedAt: string;
  totalCount: number;
  items: WelfareItem[];
}

/**
 * 이전 스냅샷 로드
 */
export async function loadPreviousSnapshot(): Promise<WelfareItem[]> {
  if (!existsSync(SNAPSHOT_PATH)) {
    return [];
  }

  try {
    const content = await readFile(SNAPSHOT_PATH, "utf-8");
    const snapshot = JSON.parse(content) as SnapshotFile;
    return snapshot.items || [];
  } catch (error) {
    console.warn("   ⚠️ 이전 스냅샷 로드 실패:", error);
    return [];
  }
}

/**
 * 스냅샷 저장
 */
export async function saveSnapshot(items: WelfareItem[]): Promise<void> {
  const snapshot: SnapshotFile = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    totalCount: items.length,
    items,
  };

  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

/**
 * 변경분 감지
 */
export function diffSnapshots(
  previous: WelfareItem[],
  current: WelfareItem[]
): {
  added: WelfareItem[];
  modified: WelfareItem[];
  unchanged: WelfareItem[];
} {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const added: WelfareItem[] = [];
  const modified: WelfareItem[] = [];
  const unchanged: WelfareItem[] = [];

  for (const item of current) {
    const prev = previousMap.get(item.id);

    if (!prev) {
      // 신규 항목
      added.push(item);
    } else if (hasChanged(prev, item)) {
      // 수정된 항목
      modified.push(item);
    } else {
      // 변경 없음
      unchanged.push(item);
    }
  }

  return { added, modified, unchanged };
}

/**
 * 항목 변경 여부 확인
 */
function hasChanged(prev: WelfareItem, curr: WelfareItem): boolean {
  // 주요 필드 비교
  return (
    prev.title !== curr.title ||
    prev.benefit.description !== curr.benefit.description ||
    prev.eligibility.conditionsExplained !== curr.eligibility.conditionsExplained ||
    prev.schedule.end !== curr.schedule.end
  );
}
