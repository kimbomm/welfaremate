"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  X,
  ChevronRight,
  Home,
  Heart,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  getWelfareList,
  getCategoryLabel,
  formatDeadline,
  targetTraitOptions,
} from "@welfaremate/data";
import type { UserProfile } from "@welfaremate/types";
import { getProfile } from "@/lib/db";
import {
  FilterDrawer,
  type SearchFilterState,
} from "@/app/search/FilterDrawer";

const ITEMS_PER_PAGE = 20;

function matchesTargetTraits(
  item: { tags: string[]; eligibility: { conditions: string[] } },
  selectedTraits: string[]
): boolean {
  if (selectedTraits.length === 0) return true;
  const text = [
    ...item.tags,
    ...item.eligibility.conditions,
  ]
    .join(" ")
    .toLowerCase();
  return selectedTraits.some((value) => {
    const option = targetTraitOptions.find((o) => o.value === value);
    if (!option) return false;
    return option.keywords.some((kw) => text.includes(kw.toLowerCase()));
  });
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterState, setFilterState] = useState<SearchFilterState>({
    regionMode: "all",
    selectedCategories: [],
    benefitTypes: [],
    scheduleTypes: [],
    targetTraits: [],
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p ?? null);
      if (p?.region?.sido) {
        setFilterState((prev) => ({ ...prev, regionMode: "my" }));
      }
    });
  }, []);

  const allWelfare = getWelfareList();

  const filteredResults = useMemo(() => {
    let results = allWelfare;

    if (filterState.regionMode === "my" && profile?.region?.sido) {
      const userRegion = profile.region.sido;
      results = results.filter((item) => {
        if (!item.eligibility.region || item.eligibility.region.length === 0) {
          return true;
        }
        return item.eligibility.region.some((r) => r.includes(userRegion));
      });
    }

    if (filterState.selectedCategories.length > 0) {
      const set = new Set(filterState.selectedCategories);
      results = results.filter((item) => set.has(item.category));
    }

    if (filterState.benefitTypes.length > 0) {
      const set = new Set(filterState.benefitTypes);
      results = results.filter((item) => set.has(item.benefit.type));
    }

    if (filterState.scheduleTypes.length > 0) {
      const set = new Set(filterState.scheduleTypes);
      results = results.filter((item) => set.has(item.schedule.type));
    }

    if (filterState.targetTraits.length > 0) {
      results = results.filter((item) =>
        matchesTargetTraits(item, filterState.targetTraits)
      );
    }

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          item.summary.oneLiner.toLowerCase().includes(lowerQuery)
      );
    }

    return results;
  }, [query, filterState, allWelfare, profile]);

  const displayedResults = filteredResults.slice(0, displayCount);
  const hasMore = displayCount < filteredResults.length;

  const handleApplyFilter = (next: SearchFilterState) => {
    setFilterState(next);
    setDisplayCount(ITEMS_PER_PAGE);
  };

  const filterCount =
    (filterState.selectedCategories.length > 0 ? 1 : 0) +
    (filterState.benefitTypes.length > 0 ? 1 : 0) +
    (filterState.scheduleTypes.length > 0 ? 1 : 0) +
    (filterState.targetTraits.length > 0 ? 1 : 0) +
    (filterState.regionMode === "my" && profile?.region?.sido ? 1 : 0);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [query]);

  // 무한 스크롤
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => {
            const next = prev + ITEMS_PER_PAGE;
            return next > filteredResults.length ? filteredResults.length : next;
          });
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loader);

    return () => observer.disconnect();
  }, [filteredResults.length]);

  const isSearching =
    query.trim().length > 0 || filterCount > 0;

  return (
    <main className="flex min-h-screen flex-col pb-20">
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="복지 혜택 검색"
              className="h-12 w-full rounded-xl border border-gray-200 pl-12 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                aria-label="검색어 지우기"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              filterCount > 0
                ? "border-primary-500 bg-primary-50 text-primary-500"
                : "border-gray-200 bg-white text-gray-600"
            }`}
            aria-label="필터"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {filterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-medium text-white">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <FilterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={profile}
        initialFilter={filterState}
        onApply={handleApplyFilter}
      />

      {/* Content */}
      <div className="flex-1 px-5 py-4">
        {!isSearching ? (
          /* 검색 전 안내 화면 */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
              <Sparkles className="h-10 w-10 text-primary-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              어떤 혜택을 찾고 계세요?
            </h3>
            <p className="mb-6 text-center text-gray-500">
              키워드로 검색하거나
              <br />
              필터에서 조건을 선택해보세요
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["청년 월세", "출산 지원", "취업 지원", "교육비"].map(
                (keyword) => (
                  <button
                    key={keyword}
                    onClick={() => setQuery(keyword)}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-primary-500 hover:text-primary-500"
                  >
                    {keyword}
                  </button>
                )
              )}
            </div>
          </motion.div>
        ) : (
          /* 검색 결과 */
          <>
            <p className="mb-4 text-sm text-gray-500">
              검색 결과 {filteredResults.length.toLocaleString()}건
            </p>

            {filteredResults.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Search className="mb-4 h-12 w-12 text-gray-200" />
                <p className="text-gray-400">검색 결과가 없습니다</p>
                <p className="mt-1 text-sm text-gray-400">
                  다른 키워드로 검색해보세요
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {displayedResults.map((welfare, index) => {
                  const deadline = formatDeadline(welfare.schedule.end);

                  return (
                    <motion.div
                      key={welfare.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      onClick={() => router.push(`/welfare/${welfare.id}`)}
                      className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                              {getCategoryLabel(welfare.category)}
                            </span>
                            {deadline && (
                              <span className="text-xs text-warning">
                                {deadline}
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900">
                            {welfare.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {welfare.summary.oneLiner}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
                      </div>
                    </motion.div>
                  );
                })}

                {/* 무한 스크롤 로더 */}
                {hasMore && (
                  <div
                    ref={loaderRef}
                    className="flex justify-center py-4"
                  >
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[720px] border-t bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: Home, label: "홈", active: false, href: "/" },
            { icon: Search, label: "검색", active: true, href: "/search" },
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
