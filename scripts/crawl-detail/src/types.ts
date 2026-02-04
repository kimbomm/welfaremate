export interface WelfareDetail {
  documents: {
    required: string[];
    optional: string[];
  };
  duplicateWarning?: string;
  legalBasis: {
    name: string;
    article: string;
  }[];
  contact: {
    agency: string;
    phone: string[];
  };
  lastCrawled: string;
  /**
   * 이 상세가 마지막으로 생성/갱신될 때 기준이 되었던
   * 스냅샷 raw.수정일시 값 (증분 크롤링용)
   */
  sourceModified?: string;
}

export interface WelfareDetailResult {
  version: string;
  generatedAt: string;
  totalCount: number;
  successCount: number;
  failedIds: string[];
  items: Record<string, WelfareDetail>;
}

export interface CrawlResult {
  success: boolean;
  serviceId: string;
  data?: WelfareDetail;
  error?: string;
}
