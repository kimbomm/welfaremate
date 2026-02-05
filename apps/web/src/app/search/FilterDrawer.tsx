"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  categoryLabels,
  benefitTypeLabels,
  scheduleTypeLabels,
  targetTraitOptions,
  incomeFilterOptions,
  householdSizeOptions,
  getIncomeAmountLabel,
} from "@welfaremate/data";
import type { UserProfile } from "@welfaremate/types";

export interface SearchFilterState {
  regionMode: "my" | "all";
  selectedCategories: string[];
  benefitTypes: string[];
  scheduleTypes: string[];
  targetTraits: string[];
  incomeMaxPercent: number | null;
  householdSize: number;
}

const DEFAULT_FILTER: SearchFilterState = {
  regionMode: "all",
  selectedCategories: [],
  benefitTypes: [],
  scheduleTypes: [],
  targetTraits: [],
  incomeMaxPercent: null,
  householdSize: 1,
};

function toggleInList(list: string[], key: string): string[] {
  if (list.includes(key)) return list.filter((k) => k !== key);
  return [...list, key];
}

type FilterDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  initialFilter: SearchFilterState;
  onApply: (filter: SearchFilterState) => void;
  getDefaultFilter?: () => SearchFilterState;
};

export function FilterDrawer({
  isOpen,
  onClose,
  profile,
  initialFilter,
  onApply,
  getDefaultFilter,
}: FilterDrawerProps) {
  const [local, setLocal] = useState<SearchFilterState>(initialFilter);

  useEffect(() => {
    if (isOpen) setLocal(initialFilter);
  }, [isOpen, initialFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleReset = () => {
    setLocal(
      getDefaultFilter?.() ?? {
        ...DEFAULT_FILTER,
        regionMode: profile?.region?.sido ? "my" : "all",
      }
    );
  };

  const categories = Object.entries(categoryLabels);
  const benefitTypes = Object.entries(benefitTypeLabels);
  const scheduleTypes = Object.entries(scheduleTypeLabels);
  const hasRegion = Boolean(profile?.region?.sido);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="filter-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            className="fixed inset-0 z-40 bg-black/40 touch-none"
            aria-hidden
          />
          <motion.aside
            key="filter-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl"
            role="dialog"
            aria-label="검색 필터"
          >
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">필터</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {hasRegion && (
                <section className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">지역</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLocal((s) => ({ ...s, regionMode: "my" }))}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.regionMode === "my"
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      내 지역 ({profile?.region?.sido ?? ""})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocal((s) => ({ ...s, regionMode: "all" }))}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.regionMode === "all"
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      전국
                    </button>
                  </div>
                </section>
              )}

              <section className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">카테고리</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setLocal((s) => ({
                          ...s,
                          selectedCategories: toggleInList(s.selectedCategories, key),
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.selectedCategories.includes(key)
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">혜택 유형</h3>
                <div className="flex flex-wrap gap-2">
                  {benefitTypes.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setLocal((s) => ({
                          ...s,
                          benefitTypes: toggleInList(s.benefitTypes, key),
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.benefitTypes.includes(key)
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">신청 기한</h3>
                <div className="flex flex-wrap gap-2">
                  {scheduleTypes.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setLocal((s) => ({
                          ...s,
                          scheduleTypes: toggleInList(s.scheduleTypes, key),
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.scheduleTypes.includes(key)
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">가구수</h3>
                <div className="flex flex-wrap gap-2">
                  {householdSizeOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setLocal((s) => ({ ...s, householdSize: value }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.householdSize === value
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">소득 기준 (중위소득)</h3>
                <p className="mb-2 text-xs text-gray-500">
                  선택한 가구수 기준 월 소득액 참고 (2025년 기준중위소득)
                </p>
                <div className="flex flex-wrap gap-2">
                  {incomeFilterOptions.map(({ value, label }) => (
                    <button
                      key={value ?? "all"}
                      type="button"
                      onClick={() =>
                        setLocal((s) => ({ ...s, incomeMaxPercent: value }))
                      }
                      className={`flex flex-col items-start rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        local.incomeMaxPercent === value
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span>{label}</span>
                      {value != null && (
                        <span
                          className={
                            local.incomeMaxPercent === value
                              ? "text-xs opacity-90"
                              : "text-xs text-gray-500"
                          }
                        >
                          {getIncomeAmountLabel(value, local.householdSize)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-medium text-gray-700">대상 특성</h3>
                <div className="flex flex-wrap gap-2">
                  {targetTraitOptions.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setLocal((s) => ({
                          ...s,
                          targetTraits: toggleInList(s.targetTraits, value),
                        }))
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        local.targetTraits.includes(value)
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <footer className="flex shrink-0 gap-2 border-t bg-white px-4 py-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 rounded-xl bg-primary-500 py-3 text-sm font-medium text-white"
              >
                적용
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
