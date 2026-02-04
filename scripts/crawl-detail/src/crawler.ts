import { parseDetailPage } from "./parser.js";
import type { CrawlResult, WelfareDetail } from "./types.js";

const BASE_URL = "https://www.gov.kr/portal/rcvfvrSvc/dtlEx";
const DELAY_MS = 500;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function crawlDetailPage(
  serviceId: string
): Promise<CrawlResult> {
  const url = `${BASE_URL}/${serviceId}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        serviceId,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const data = parseDetailPage(html);

    if (!data) {
      return {
        success: false,
        serviceId,
        error: "Parse failed",
      };
    }

    return {
      success: true,
      serviceId,
      data,
    };
  } catch (error) {
    return {
      success: false,
      serviceId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function crawlMultiple(
  serviceIds: string[],
  onProgress?: (current: number, total: number, id: string) => void
): Promise<Map<string, WelfareDetail>> {
  const results = new Map<string, WelfareDetail>();

  for (let i = 0; i < serviceIds.length; i++) {
    const id = serviceIds[i];
    onProgress?.(i + 1, serviceIds.length, id);

    const result = await crawlDetailPage(id);

    if (result.success && result.data) {
      results.set(id, result.data);
    } else {
      console.error(`Failed: ${id} - ${result.error}`);
    }

    if (i < serviceIds.length - 1) {
      await delay(DELAY_MS);
    }
  }

  return results;
}
