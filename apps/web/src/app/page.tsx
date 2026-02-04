"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, MessageCircle, Heart, Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getProfile, hasProfile, type UserProfile } from "@/lib/db";
import {
  getWelfareList,
  getBanner,
  getCategoryLabel,
  formatDeadline,
} from "@welfaremate/data";
import type { WelfareItem } from "@welfaremate/types";

// 추천 점수 (우선순위: 자녀 > 결혼유무 > 소득 > 나이 > 주거형태 > 지역 > 마감)
function calculateRecommendScore(
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

  // 1. 자녀
  if (profile.hasChildren && hasChildTag) score += 120;
  if (!profile.hasChildren && hasYouthTag) score += 120;

  // 2. 결혼유무
  if (isMarried && hasChildTag) score += 100;
  if (!isMarried && hasYouthTag) score += 100;

  // 3. 소득
  if (welfare.eligibility.income) {
    const incomePercent = welfare.eligibility.income.percent || 100;
    if (profile.incomeLevel === "low" && incomePercent >= 50) score += 80;
    else if (profile.incomeLevel === "medium" && incomePercent >= 100) score += 80;
    else if (profile.incomeLevel === "high" && incomePercent > 100) score += 50;
  } else {
    score += 50;
  }

  // 4. 나이
  const { min, max } = welfare.eligibility.age || {};
  if (min !== undefined || max !== undefined) {
    const minAge = min || 0;
    const maxAge = max || 100;
    if (userAge >= minAge && userAge <= maxAge) score += 70;
    else score -= 60;
  } else {
    score += 30;
  }

  // 5. 주거형태 (주거 카테고리 또는 주거 관련 태그 + 유저 주거형태)
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

  // 6. 지역 (이미 지역 필터 통과한 항목만 옴)
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

  // 7. 마감 임박
  if (welfare.schedule.end) {
    const daysUntil = Math.ceil(
      (new Date(welfare.schedule.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 0 && daysUntil <= 30) score += 10;
  }

  return score;
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      const exists = await hasProfile();
      if (!exists) {
        router.push("/onboarding");
        return;
      }
      const userProfile = await getProfile();
      setProfile(userProfile || null);
      setLoading(false);
    };
    checkProfile();
  }, [router]);

  const [recommendedWelfare, setRecommendedWelfare] = useState<WelfareItem[]>([]);

  useEffect(() => {
    if (!profile) {
      setRecommendedWelfare([]);
      return;
    }
    const allWelfare = getWelfareList();
    const userSido = profile.region.sido;
    const userSigungu = profile.region.sigungu;
    const regionFiltered = allWelfare.filter((w) => {
      const regions = w.eligibility.region;
      if (!regions || regions.length === 0) return false;
      return regions.some((r) => {
        const matchSido =
          userSido.includes(r) || r.includes(userSido) || r.includes(userSido.slice(0, 2));
        const matchSigungu =
          userSigungu && (r.includes(userSigungu) || userSigungu.includes(r));
        return matchSido || matchSigungu;
      });
    });
    const scored = regionFiltered.map((welfare) => ({
      welfare,
      score: calculateRecommendScore(welfare, profile),
    }));
    scored.sort((a, b) => b.score - a.score);
    const top20 = scored.slice(0, 20);
    const shuffled = [...top20].sort(() => Math.random() - 0.5);
    setRecommendedWelfare(shuffled.slice(0, 3).map((item) => item.welfare));
  }, [profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const banner = getBanner();
  const age = profile ? new Date().getFullYear() - profile.birthYear : 0;

  return (
    <main className="flex min-h-screen flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <h1 className="text-xl font-bold text-gray-900">복지메이트</h1>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 py-6">
        {/* Welcome */}
        <section className="mb-6">
          <p className="text-gray-500">
            {profile?.region.sido} · 만 {age}세
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            맞춤 혜택을 확인하세요
          </h2>
        </section>

        {/* Banner */}
        {banner.enabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-xl p-4 ${
              banner.type === "warning"
                ? "bg-warning-light"
                : banner.type === "event"
                  ? "bg-primary-50"
                  : "bg-gray-100"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                banner.type === "warning"
                  ? "text-warning"
                  : banner.type === "event"
                    ? "text-primary-600"
                    : "text-gray-700"
              }`}
            >
              {banner.text}
            </p>
          </motion.div>
        )}

        {/* Welfare Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">추천 혜택</h3>
            <button 
              onClick={() => router.push("/search")}
              className="text-sm text-gray-500"
            >
              전체보기
            </button>
          </div>

          {recommendedWelfare.map((welfare, index) => {
            const deadline = formatDeadline(welfare.schedule.end);

            return (
              <motion.div
                key={welfare.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => router.push(`/welfare/${welfare.id}`)}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-lg bg-primary-50 px-2 py-1 text-sm font-medium text-primary-600">
                    {getCategoryLabel(welfare.category)}
                  </span>
                  {deadline && (
                    <span
                      className={`text-sm font-medium ${
                        deadline.includes("D-") &&
                        parseInt(deadline.replace("D-", "")) <= 7
                          ? "text-warning"
                          : "text-gray-400"
                      }`}
                    >
                      {deadline}
                    </span>
                  )}
                </div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  {welfare.title}
                </h3>
                <p className="text-gray-500">{welfare.summary.oneLiner}</p>
                <div className="mt-3 flex items-center text-sm text-primary-500">
                  <span>자세히 보기</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </motion.div>
            );
          })}
        </section>
      </div>

      {/* Floating Chat Button */}
      <Link
        href="/chat"
        className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform active:scale-95"
      >
        <MessageCircle className="h-6 w-6" />
      </Link>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[720px] border-t bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: Home, label: "홈", active: true, href: "/" },
            { icon: Search, label: "검색", active: false, href: "/search" },
            { icon: Heart, label: "저장", active: false, href: "/bookmarks" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 ${
                item.active ? "text-primary-500" : "text-gray-400"
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
