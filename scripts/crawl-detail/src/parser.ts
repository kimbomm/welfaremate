import * as cheerio from "cheerio";
import type { WelfareDetail } from "./types.js";

export function parseDetailPage(html: string): WelfareDetail | null {
  try {
    const $ = cheerio.load(html);

    const documents = parseDocuments($);
    const duplicateWarning = parseDuplicateWarning($);
    const legalBasis = parseLegalBasis($);
    const contact = parseContact($);

    return {
      documents,
      duplicateWarning,
      legalBasis,
      contact,
      lastCrawled: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Parse error:", error);
    return null;
  }
}

function parseDocuments($: cheerio.CheerioAPI): {
  required: string[];
  optional: string[];
} {
  const required: string[] = [];
  const optional: string[] = [];

  $("h3, h4, strong").each((_, el) => {
    const text = $(el).text().trim();

    if (text.includes("민원인이 제출해야하는 서류") || text.includes("구비서류")) {
      const nextPre = $(el).nextAll("pre").first();
      if (nextPre.length) {
        const content = nextPre.text().trim();
        if (content && content !== "해당없음") {
          content.split(/[-\n]/).forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && trimmed.length > 2) {
              required.push(trimmed);
            }
          });
        }
      }
    }

    if (text.includes("민원인이 제출하지 않아도")) {
      const nextPre = $(el).nextAll("pre").first();
      if (nextPre.length) {
        const content = nextPre.text().trim();
        if (content && content !== "해당없음") {
          content.split(/[-\n]/).forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && trimmed.length > 2) {
              optional.push(trimmed);
            }
          });
        }
      }
    }
  });

  return { required, optional };
}

function parseDuplicateWarning($: cheerio.CheerioAPI): string | undefined {
  let warning: string | undefined;

  $("h3, h4, strong, p").each((_, el) => {
    const text = $(el).text().trim();

    if (
      text.includes("중복혜택 안돼요") ||
      text.includes("중복수혜 불가")
    ) {
      const parent = $(el).parent();
      const nextP = parent.find("p").first();
      if (nextP.length) {
        warning = nextP.text().trim();
      } else {
        const match = text.match(
          /(?:보육료|양육수당|다른\s*복지)[^.]*중복[^.]*/
        );
        if (match) {
          warning = match[0].trim();
        }
      }
      return false;
    }
  });

  if (!warning) {
    const fullText = $("body").text();
    const simpleMatch = fullText.match(
      /([가-힣\s,]+(?:와|과|,\s*)\s*중복(?:수혜|지원|혜택)\s*불가)/
    );
    if (simpleMatch) {
      warning = simpleMatch[1].trim();
    }
  }

  return warning;
}

function parseLegalBasis(
  $: cheerio.CheerioAPI
): { name: string; article: string }[] {
  const basis: { name: string; article: string }[] = [];

  $("li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes("[법령]")) {
      const match = text.match(/\[법령\]\s*([^(]+)\(([^)]+)\)/);
      if (match) {
        basis.push({
          name: match[1].trim(),
          article: match[2].trim(),
        });
      }
    }
  });

  return basis;
}

function parseContact($: cheerio.CheerioAPI): {
  agency: string;
  phone: string[];
} {
  let agency = "";
  const phone: string[] = [];

  $("*").each((_, el) => {
    const text = $(el).text();

    if (text.includes("접수기관")) {
      const next = $(el).next();
      if (next.length) {
        agency = next.text().trim();
      }
    }

    const phoneMatches = text.match(/\d{2,4}-\d{3,4}-\d{4}/g);
    if (phoneMatches) {
      phoneMatches.forEach((p) => {
        if (!phone.includes(p)) {
          phone.push(p);
        }
      });
    }
  });

  return { agency, phone: phone.slice(0, 5) };
}
