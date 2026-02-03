"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X, ChevronRight, Home, MessageCircle, Heart } from "lucide-react";
import {
  getWelfareList,
  searchWelfare,
  filterByCategory,
  getCategoryLabel,
  formatDeadline,
  categoryLabels,
} from "@welfaremate/data";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allWelfare = getWelfareList();

  const filteredResults = useMemo(() => {
    let results = allWelfare;

    if (selectedCategory) {
      results = filterByCategory(selectedCategory);
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
  }, [query, selectedCategory, allWelfare]);

  const categories = Object.entries(categoryLabels);

  return (
    <main className="flex min-h-screen flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <div className="relative">
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
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </header>

      {/* Categories */}
      <div className="border-b bg-white px-5 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-primary-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            전체
          </button>
          {categories.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-5 py-4">
        <p className="mb-4 text-sm text-gray-500">
          검색 결과 {filteredResults.length}건
        </p>

        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-400">검색 결과가 없습니다</p>
            <p className="mt-1 text-sm text-gray-400">
              다른 키워드로 검색해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((welfare, index) => {
              const deadline = formatDeadline(welfare.schedule.end);

              return (
                <motion.div
                  key={welfare.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
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
                          <span className="text-xs text-warning">{deadline}</span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">{welfare.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {welfare.summary.oneLiner}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[720px] border-t bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: Home, label: "홈", active: false, href: "/" },
            { icon: Search, label: "검색", active: true, href: "/search" },
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
