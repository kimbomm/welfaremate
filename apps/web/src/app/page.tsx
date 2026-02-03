"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, MessageCircle, Heart, Home, ChevronRight } from "lucide-react";
import { getProfile, hasProfile, type UserProfile } from "@/lib/db";
import {
  getWelfareList,
  getBanner,
  getCategoryLabel,
  formatDeadline,
} from "@welfaremate/data";
import type { WelfareItem } from "@welfaremate/types";

// 추천 점수 계산 함수
function calculateRecommendScore(
  welfare: WelfareItem,
  profile: UserProfile
): number {
  let score = 0;
  const userAge = new Date().getFullYear() - profile.birthYear;

  // 1. 결혼 여부 (가장 높은 우선순위)
  const isMarried = profile.householdType === "married";
  const hasChildTag = welfare.tags.some(
    (tag) =>
      tag.includes("출산") ||
      tag.includes("육아") ||
      tag.includes("임신") ||
      tag.includes("영유아") ||
      tag.includes("보육")
  );
  const hasYouthTag = welfare.tags.some((tag) => tag.includes("청년"));

  if (isMarried && hasChildTag) {
    score += 100; // 기혼자에게 출산/육아 관련 높은 점수
  }
  if (!isMarried && hasYouthTag) {
    score += 100; // 미혼자에게 청년 관련 높은 점수
  }

  // 2. 소득 수준 (두 번째 우선순위)
  if (welfare.eligibility.income) {
    const incomePercent = welfare.eligibility.income.percent || 100;
    if (profile.incomeLevel === "low" && incomePercent >= 50) {
      score += 50;
    } else if (profile.incomeLevel === "medium" && incomePercent >= 100) {
      score += 50;
    } else if (profile.incomeLevel === "high" && incomePercent > 100) {
      score += 30;
    }
  } else {
    // 소득 조건 없으면 누구나 가능
    score += 40;
  }

  // 3. 나이 (세 번째 우선순위)
  const { min, max } = welfare.eligibility.age || {};
  if (min !== undefined || max !== undefined) {
    const minAge = min || 0;
    const maxAge = max || 100;
    if (userAge >= minAge && userAge <= maxAge) {
      score += 30; // 나이 조건 충족
    } else {
      score -= 50; // 나이 조건 미충족 시 감점
    }
  } else {
    score += 20; // 나이 조건 없으면 약간의 점수
  }

  // 보너스: 지역 매칭
  if (welfare.eligibility.region && welfare.eligibility.region.length > 0) {
    const userRegion = profile.region.sido;
    if (
      welfare.eligibility.region.some((r) => userRegion.includes(r) || r.includes(userRegion.slice(0, 2)))
    ) {
      score += 20;
    }
  }

  // 보너스: 마감 임박
  if (welfare.schedule.end) {
    const daysUntil = Math.ceil(
      (new Date(welfare.schedule.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 0 && daysUntil <= 30) {
      score += 10; // 마감 임박 시 약간의 가산점
    }
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

  // 추천 혜택 계산
  const recommendedWelfare = useMemo(() => {
    if (!profile) return [];

    const allWelfare = getWelfareList();

    // 점수 계산 후 정렬
    const scored = allWelfare.map((welfare) => ({
      welfare,
      score: calculateRecommendScore(welfare, profile),
    }));

    // 점수 높은 순으로 정렬 후 상위 3개
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map((item) => item.welfare);
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[720px] border-t bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: Home, label: "홈", active: true, href: "/" },
            { icon: Search, label: "검색", active: false, href: "/search" },
            { icon: MessageCircle, label: "상담", active: false, href: "/chat" },
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
