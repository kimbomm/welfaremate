"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type SortOption = "recommend" | "deadline" | "general";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommend", label: "추천" },
  { value: "deadline", label: "마감" },
  { value: "general", label: "일반" },
];

type SortBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSelect: (sort: SortOption) => void;
};

export function SortBottomSheet({
  isOpen,
  onClose,
  currentSort,
  onSelect,
}: SortBottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleSelect = (value: SortOption) => {
    onSelect(value);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="sort-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            onTouchMove={(e) => e.preventDefault()}
            className="fixed inset-0 z-40 bg-black/40 touch-none"
            aria-hidden
          />
          <motion.div
            key="sort-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white pb-safe"
            role="dialog"
            aria-label="정렬"
          >
            <div className="flex justify-center py-3">
              <div className="h-1 w-12 rounded-full bg-gray-200" />
            </div>
            <p className="px-5 pb-3 text-sm font-medium text-gray-500">
              정렬 기준
            </p>
            <ul className="list-none px-5 pb-8">
              {SORT_OPTIONS.map(({ value, label }) => (
                <li key={value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(value)}
                    className={`flex w-full items-center justify-between rounded-xl py-3 text-left text-base font-medium ${
                      currentSort === value
                        ? "bg-primary-50 text-primary-600"
                        : "text-gray-900"
                    }`}
                  >
                    {label}
                    {currentSort === value && (
                      <span className="text-primary-500">선택됨</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
