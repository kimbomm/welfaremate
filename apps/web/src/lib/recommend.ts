import type { WelfareItem } from "@welfaremate/types";
import type { UserProfile } from "@welfaremate/types";

/** 추천 태그 부여 기준. 이론상 상한 약 400~500대, 200 = 자녀/청년+결혼 등 2~3개 강한 매칭 */
const RECOMMEND_THRESHOLD = 200;

export function calculateRecommendScore(
  welfare: WelfareItem,
  profile: UserProfile
): number {
  let score = 0;
  const userAge = new Date().getFullYear() - profile.birthYear;
  const userSido = profile.region.sido;
  const userSigungu = profile.region.sigungu;

  const hasChildTag = welfare.tags.some(
    (tag) =>
      tag.includes("출산") ||
      tag.includes("육아") ||
      tag.includes("임신") ||
      tag.includes("영유아") ||
      tag.includes("보육")
  );
  const hasYouthTag = welfare.tags.some((tag) => tag.includes("청년"));
  const isMarried = profile.householdType === "married";

  if (profile.hasChildren && hasChildTag) score += 120;
  if (!profile.hasChildren && hasYouthTag) score += 120;

  if (isMarried && hasChildTag) score += 100;
  if (!isMarried && hasYouthTag) score += 100;

  if (welfare.eligibility.income) {
    const incomePercent = welfare.eligibility.income.percent || 100;
    if (profile.incomeLevel === "low" && incomePercent >= 50) score += 80;
    else if (profile.incomeLevel === "medium" && incomePercent >= 100) score += 80;
    else if (profile.incomeLevel === "high" && incomePercent > 100) score += 50;
  } else {
    score += 50;
  }

  const { min, max } = welfare.eligibility.age || {};
  if (min !== undefined || max !== undefined) {
    const minAge = min || 0;
    const maxAge = max || 100;
    if (userAge >= minAge && userAge <= maxAge) score += 70;
    else score -= 60;
  } else {
    score += 30;
  }

  const isHousingWelfare =
    welfare.category === "housing" ||
    welfare.tags.some(
      (tag) =>
        tag.includes("주거") ||
        tag.includes("임대") ||
        tag.includes("전세") ||
        tag.includes("월세") ||
        tag.includes("자가") ||
        tag.includes("무주택")
    );
  if (isHousingWelfare) {
    const userHousing = profile.housingType;
    if (userHousing === "rent" && (welfare.tags.some((t) => t.includes("월세") || t.includes("임대")) || welfare.category === "housing"))
      score += 50;
    if (userHousing === "jeonse" && (welfare.tags.some((t) => t.includes("전세")) || welfare.category === "housing"))
      score += 50;
    if (userHousing === "own" || userHousing === "with-parents") score += 30;
    if (profile.isHouseless && isHousingWelfare) score += 40;
  }

  if (welfare.eligibility.region && welfare.eligibility.region.length > 0) {
    const matchSido = welfare.eligibility.region.some(
      (r) => userSido.includes(r) || r.includes(userSido) || r.includes(userSido.slice(0, 2))
    );
    const matchSigungu =
      userSigungu &&
      welfare.eligibility.region.some(
        (r) => r.includes(userSigungu) || userSigungu.includes(r)
      );
    if (matchSigungu) score += 40;
    else if (matchSido) score += 25;
  }

  if (welfare.schedule.end) {
    const daysUntil = Math.ceil(
      (new Date(welfare.schedule.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 0 && daysUntil <= 30) score += 10;
  }

  return score;
}

export function isRecommended(
  welfare: WelfareItem,
  profile: UserProfile | null,
  threshold = RECOMMEND_THRESHOLD
): boolean {
  if (!profile) return false;
  return calculateRecommendScore(welfare, profile) >= threshold;
}
