/**
 * WelfareAIData 형식 규칙 기반 변환 (API 프롬프트와 동일한 출력 스키마).
 * summary 50자, benefits 5개, details 5개, tips 3개, warning 없으면 null.
 */

const MAX_SUMMARY_LEN = 50;
const MAX_BENEFITS = 5;
const MAX_DETAILS = 5;

export interface WelfareAIOutput {
  summary: string;
  benefits: { label: string; value: string }[];
  eligibility: { simple: string; details: string[] };
  documents: { name: string; how?: string }[];
  tips: string[];
  warning: string | null;
}

export interface ReformatInput {
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

function splitLines(text: string): string[] {
  return text
    .split(/\r\n|\n|\r/)
    .map((s) => s.replace(/^[\s○\-*·]+/, "").trim())
    .filter(Boolean);
}

export function reformatByRules(item: ReformatInput): WelfareAIOutput {
  const desc = item.benefit.description?.trim() || "";
  const summarySource = [item.title, desc].filter(Boolean).join(" ");
  const summary = summarySource.slice(0, MAX_SUMMARY_LEN) || "정보 없음";

  const lines = splitLines(desc);
  const benefits: { label: string; value: string }[] = [];
  for (const line of lines) {
    if (benefits.length >= MAX_BENEFITS) break;
    const match = line.match(/^(.+?)[:\s]\s*(.+원.*)$/) || line.match(/^[-·]\s*(.+)$/);
    if (match) {
      benefits.push({
        label: (match[1] || line).trim(),
        value: (match[2] || line).trim(),
      });
    } else if (line.includes("원") || line.length < 80) {
      const idx = line.indexOf(":");
      const label = idx > 0 ? line.slice(0, idx).trim() : line.slice(0, 20);
      const value = idx > 0 ? line.slice(idx + 1).trim() : line;
      benefits.push({ label, value });
    }
  }
  if (benefits.length === 0 && desc) benefits.push({ label: "지원내용", value: desc.slice(0, 100) });

  const eligibilityText =
    item.eligibility.conditionsExplained?.trim() ||
    [item.raw?.지원대상, item.raw?.선정기준].filter(Boolean).join("\n\n") ||
    "";
  const detailLines = splitLines(eligibilityText).slice(0, MAX_DETAILS);
  const simple = detailLines[0]?.slice(0, 80) || "자격조건은 상세 내용을 확인하세요.";

  const required = item.detail?.documents?.required ?? [];
  const documents = required.map((name) => ({ name, how: "신청기관 비치 및 작성" as string }));

  const warningSource = item.detail?.duplicateWarning?.trim();
  const warning = warningSource || null;

  return {
    summary,
    benefits,
    eligibility: { simple, details: detailLines },
    documents,
    tips: [],
    warning,
  };
}
