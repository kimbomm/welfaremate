/**
 * 공공데이터포털 API 호출 모듈
 * 
 * 사용 API: 행정안전부_대한민국 공공서비스(혜택) 정보
 * https://www.data.go.kr/data/15113968/openapi.do
 */

const API_KEY = process.env.PUBLIC_DATA_API_KEY;
const BASE_URL = "https://api.odcloud.kr/api/gov24/v3/serviceList";

interface APIResponse {
  currentCount: number;
  matchCount: number;
  page: number;
  perPage: number;
  totalCount: number;
  data: RawServiceItem[];
}

export interface RawServiceItem {
  서비스ID: string;
  서비스명: string;
  서비스목적?: string;
  서비스목적요약?: string;
  신청기한: string;
  지원내용: string;
  선정기준: string;
  신청방법: string;
  구비서류: string;
  /** API에서 제공 시 사용, 없으면 상세조회URL 또는 복지로 */
  온라인신청사이트URL?: string;
  /** 정부24 상세페이지 (API 응답에 있으면 신청 URL 없을 때 fallback) */
  상세조회URL?: string;
  소관기관명: string;
  부서명?: string;
  문의처?: string;
  전화문의?: string;
  지원대상: string;
  지원유형: string;
  서비스분야: string;
  수정일시: string;
  [key: string]: unknown;
}

export async function fetchPublicServices(): Promise<RawServiceItem[]> {
  if (!API_KEY) {
    console.warn("⚠️  API 키가 없습니다. 목 데이터를 반환합니다.");
    return getMockData();
  }

  const allData: RawServiceItem[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = new URL(BASE_URL);
      url.searchParams.set("serviceKey", API_KEY);
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const json = (await response.json()) as APIResponse;
      allData.push(...json.data);

      console.log(`   페이지 ${page}: ${json.data.length}건 (총 ${allData.length}/${json.totalCount})`);

      hasMore = allData.length < json.totalCount;
      page++;

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`   페이지 ${page} 수집 실패:`, error);
      hasMore = false;
    }
  }

  return allData;
}

// API 키 없을 때 테스트용 목 데이터
function getMockData(): RawServiceItem[] {
  return [
    {
      서비스ID: "WF0001",
      서비스명: "청년 월세 지원",
      서비스목적: "청년의 주거비 부담 완화",
      신청기한: "2026-03-31",
      지원내용: "월 최대 20만원, 최대 12개월 지원",
      선정기준: "만 19~34세, 중위소득 60% 이하, 무주택자",
      신청방법: "온라인 신청",
      구비서류: "주민등록등본, 소득증명서, 임대차계약서, 통장사본",
      온라인신청사이트URL: "https://www.bokjiro.go.kr",
      소관기관명: "서울시",
      부서명: "주거복지과",
      문의처: "02-120",
      지원대상: "청년",
      지원유형: "현금",
      서비스분야: "주거",
      수정일시: new Date().toISOString(),
    },
    {
      서비스ID: "WF0002",
      서비스명: "청년 내일채움공제",
      서비스목적: "청년 자산 형성 지원",
      신청기한: "상시",
      지원내용: "2년 후 1,600만원 목돈 마련",
      선정기준: "만 15~34세, 중소기업 정규직 취업자",
      신청방법: "온라인 신청",
      구비서류: "근로계약서, 주민등록등본",
      온라인신청사이트URL: "https://www.work.go.kr",
      소관기관명: "고용노동부",
      부서명: "청년고용정책과",
      문의처: "1350",
      지원대상: "청년",
      지원유형: "현금",
      서비스분야: "취업",
      수정일시: new Date().toISOString(),
    },
    {
      서비스ID: "WF0003",
      서비스명: "첫만남이용권",
      서비스목적: "출산 가정 경제적 지원",
      신청기한: "상시",
      지원내용: "출생아 1인당 200만원 바우처 지급",
      선정기준: "출생신고된 아동",
      신청방법: "온라인, 방문 신청",
      구비서류: "출생증명서, 신분증",
      온라인신청사이트URL: "https://www.bokjiro.go.kr",
      소관기관명: "보건복지부",
      부서명: "인구아동정책과",
      문의처: "129",
      지원대상: "영유아",
      지원유형: "바우처",
      서비스분야: "보육",
      수정일시: new Date().toISOString(),
    },
    {
      서비스ID: "WF0004",
      서비스명: "국민취업지원제도",
      서비스목적: "구직자 취업 지원",
      신청기한: "상시",
      지원내용: "월 50만원 구직촉진수당 + 취업지원서비스",
      선정기준: "15~69세, 구직자, 소득·재산 기준 충족",
      신청방법: "온라인 신청",
      구비서류: "신분증, 소득증빙서류",
      온라인신청사이트URL: "https://www.kua.go.kr",
      소관기관명: "고용노동부",
      부서명: "취업지원정책과",
      문의처: "1350",
      지원대상: "구직자",
      지원유형: "현금",
      서비스분야: "취업",
      수정일시: new Date().toISOString(),
    },
    {
      서비스ID: "WF0005",
      서비스명: "청년도약계좌",
      서비스목적: "청년 자산 형성 지원",
      신청기한: "상시",
      지원내용: "5년 만기 시 약 5,000만원 (정부기여금 포함)",
      선정기준: "만 19~34세, 개인소득 7,500만원 이하",
      신청방법: "은행 앱 신청",
      구비서류: "소득증빙서류",
      온라인신청사이트URL: "https://www.kinfa.or.kr",
      소관기관명: "금융위원회",
      부서명: "서민금융과",
      문의처: "1397",
      지원대상: "청년",
      지원유형: "현금",
      서비스분야: "금융",
      수정일시: new Date().toISOString(),
    },
  ];
}
