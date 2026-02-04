/**
 * 크롤링 상세 데이터 + 스냅샷 raw → 규칙 기반 "AI형" 보강 데이터 생성 (API 호출 없음)
 *
 * 실행: pnpm enrich (전체) / pnpm enrich:sample (샘플 detail만)
 * 입력: data/welfare-snapshot.json, data/welfare-detail.json (또는 welfare-detail-sample.json)
 * 출력: data/welfare-enriched.json (WelfareAIData 형식)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data");
const SNAPSHOT_PATH = join(DATA_DIR, "welfare-snapshot.json");
const DETAIL_PATH = join(DATA_DIR, "welfare-detail.json");
const DETAIL_SAMPLE_PATH = join(DATA_DIR, "welfare-detail-sample.json");
const OUTPUT_PATH = join(DATA_DIR, "welfare-enriched.json");

interface SnapshotItem {
  id: string;
  title: string;
  benefit: { amount?: string; description?: string };
  eligibility?: { conditions?: string[] };
  raw?: Record<string, unknown>;
}

interface SnapshotFile {
  version: string;
  totalCount: number;
  items: SnapshotItem[];
}

interface WelfareDetail {
  documents: { required: string[]; optional: string[] };
  duplicateWarning?: string;
  legalBasis?: { name: string; article: string }[];
  contact?: { agency: string; phone: string[] };
}

interface DetailResult {
  items: Record<string, WelfareDetail>;
}

interface EnrichedItem {
  summary: string;
  benefits: { label: string; value: string }[];
  eligibility: { simple: string; details: string[] };
  documents: { name: string; how?: string }[];
  tips: string[];
  warning: string | null;
}

function getDocHow(name: string): string | undefined {
  if (name.includes("주민등록")) return "정부24에서 발급";
  if (name.includes("소득") || name.includes("납세")) return "홈택스에서 발급";
  if (name.includes("등기")) return "인터넷등기소에서 발급";
  if (name.includes("건강보험")) return "건강보험공단에서 발급";
  if (name.includes("가족관계") || name.includes("혼인")) return "대법원 전자가족관계등록시스템에서 발급";
  return "신청기관 비치 및 작성";
}

/** 지원내용에서 "라벨 + 금액" 여러 개 추출 (한 줄에 "국공립 100,000원, 사립 280,000원" 형태 포함) */
function parseBenefitLines(content: string | null | undefined): { label: string; value: string }[] {
  if (!content || typeof content !== "string") return [];
  const lines = content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const result: { label: string; value: string }[] = [];
  const pairRe = /([가-힣a-zA-Z·\s]+?)\s+(\d[,]?\d*)\s*(만\s*)?원/g;

  for (const line of lines) {
    if (!/^[○\-]/.test(line)) continue;
    const rest = line.replace(/^[○\-]\s*/, "");
    const parts = rest.split(/,\s+|、\s*/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^(.+?)\s+(\d[\d,]*)\s*(만\s*)?원\s*$/);
      if (m) {
        const label = m[1].trim();
        const value = `${m[2]}${(m[3] || "").replace(/\s/g, "")}원`;
        if (label.length > 0) result.push({ label, value });
      }
    }
  }
  return result;
}

/** 선정기준/지원대상 → 한 줄씩 details 배열 */
function parseConditionLines(
  selectionCriteria: string | null | undefined,
  supportTarget: string | null | undefined
): string[] {
  const text = [selectionCriteria, supportTarget].filter(Boolean).join("\n");
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .flatMap((s) => s.split(/[○]/).map((t) => t.trim()).filter((t) => t.length > 2));
  const unique = [...new Set(lines)].slice(0, 15);
  return unique;
}

/** 키워드 기반 간단 팁 */
function keywordTips(raw: Record<string, unknown> | undefined): string[] {
  if (!raw) return [];
  const text = [raw.지원내용, raw.선정기준, raw.지원대상].filter(Boolean).join(" ") as string;
  const tips: string[] = [];
  if (text.includes("홈택스") || text.includes("국세청")) {
    tips.push("자세한 산정 및 신청요건은 국세청 홈택스에서 확인하세요.");
  }
  if (text.includes("복지로") && !tips.some((t) => t.includes("복지로"))) {
    tips.push("온라인 신청은 복지로(www.bokjiro.go.kr)에서 할 수 있습니다.");
  }
  return tips;
}

function buildEnriched(item: SnapshotItem, detail: WelfareDetail | undefined): EnrichedItem {
  const raw = item.raw as Record<string, unknown> | undefined;
  const supportContent = (raw?.지원내용 as string) || "";
  const selectionCriteria = (raw?.선정기준 as string) || "";
  const supportTarget = (raw?.지원대상 as string) || "";
  const benefits = parseBenefitLines(supportContent);
  const details = parseConditionLines(selectionCriteria, supportTarget);
  const simple =
    details[0]?.slice(0, 80) ||
    `${item.title}. ${item.benefit?.amount || item.benefit?.description || ""} 지원.`.slice(0, 80);

  let summary = `${item.title}. `;
  if (item.benefit?.amount) summary += `${item.benefit.amount} 지원. `;
  else if (item.benefit?.description) summary += `${item.benefit.description.slice(0, 50)}... `;
  summary = summary.trim().slice(0, 120) + (summary.length > 120 ? "..." : "");

  const documents = (detail?.documents?.required || []).map((name) => ({
    name,
    how: getDocHow(name),
  }));

  return {
    summary,
    benefits: benefits.length > 0 ? benefits : [{ label: "지원 내용", value: item.benefit?.amount || item.benefit?.description || supportContent.slice(0, 50) || "-" }],
    eligibility: { simple, details },
    documents,
    tips: keywordTips(raw),
    warning: detail?.duplicateWarning?.trim() || null,
  };
}

function main() {
  const useSample = process.argv.includes("--sample");
  const detailPath = useSample ? DETAIL_SAMPLE_PATH : DETAIL_PATH;

  console.log("Reading snapshot...");
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as SnapshotFile;
  let detailData: DetailResult = { items: {} };
  try {
    detailData = JSON.parse(readFileSync(detailPath, "utf-8")) as DetailResult;
    console.log(`Detail file: ${detailPath}, items: ${Object.keys(detailData.items).length}`);
  } catch {
    console.warn(`Detail file not found: ${detailPath}, enriching only from raw.`);
  }

  const enriched: Record<string, EnrichedItem> = {};
  let withDetail = 0;
  for (const item of snapshot.items) {
    const serviceId = item.raw?.서비스ID as string | undefined;
    const detail = serviceId ? detailData.items[serviceId] : undefined;
    if (detail) withDetail++;
    enriched[item.id] = buildEnriched(item, detail);
  }

  const result = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    items: enriched,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Wrote ${OUTPUT_PATH}, total=${Object.keys(enriched).length}, withDetail=${withDetail}`);
}

main();
