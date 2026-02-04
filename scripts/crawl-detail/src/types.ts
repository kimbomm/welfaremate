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
