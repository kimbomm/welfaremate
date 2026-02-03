"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Heart,
  Share2,
  ExternalLink,
  Check,
  AlertCircle,
  Calendar,
  FileText,
  Info,
} from "lucide-react";
import { getWelfareById, getCategoryLabel, formatDeadline } from "@welfaremate/data";
import type { WelfareItem } from "@welfaremate/types";
import { isBookmarked, addBookmark, removeBookmark, getProfile } from "@/lib/db";

export default function WelfareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [welfare, setWelfare] = useState<WelfareItem | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);

  useEffect(() => {
    const data = getWelfareById(id);
    if (data) {
      setWelfare(data);
    }

    const checkBookmark = async () => {
      const result = await isBookmarked(id);
      setBookmarked(result);
    };
    checkBookmark();

    const loadProfile = async () => {
      const profile = await getProfile();
      if (profile) {
        setUserAge(new Date().getFullYear() - profile.birthYear);
      }
    };
    loadProfile();
  }, [id]);

  const handleBookmark = async () => {
    if (bookmarked) {
      await removeBookmark(id);
    } else {
      await addBookmark(id);
    }
    setBookmarked(!bookmarked);
  };

  const handleShare = async () => {
    if (navigator.share && welfare) {
      await navigator.share({
        title: welfare.title,
        text: welfare.summary.oneLiner,
        url: window.location.href,
      });
    }
  };

  if (!welfare) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">복지 정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  const deadline = formatDeadline(welfare.schedule.end);
  const isAgeEligible =
    userAge !== null &&
    (!welfare.eligibility.age?.min || userAge >= welfare.eligibility.age.min) &&
    (!welfare.eligibility.age?.max || userAge <= welfare.eligibility.age.max);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={handleBookmark} className="p-2">
              <Heart
                className={`h-5 w-5 ${
                  bookmarked ? "fill-red-500 text-red-500" : "text-gray-600"
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white px-5 py-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-lg bg-primary-50 px-2 py-1 text-sm font-medium text-primary-600">
              {getCategoryLabel(welfare.category)}
            </span>
            {deadline && (
              <span
                className={`text-sm font-medium ${
                  deadline.includes("D-") && parseInt(deadline.replace("D-", "")) <= 7
                    ? "text-warning"
                    : "text-gray-400"
                }`}
              >
                {deadline}
              </span>
            )}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{welfare.title}</h1>
          <p className="text-gray-500">{welfare.source.name}</p>

          {/* Benefit Highlight */}
          <div className="mt-6 rounded-2xl bg-primary-50 p-5">
            <p className="text-sm text-primary-600">혜택</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">
              {welfare.benefit.amount || welfare.benefit.description}
            </p>
            {welfare.benefit.duration && (
              <p className="mt-1 text-primary-500">{welfare.benefit.duration}</p>
            )}
          </div>
        </motion.section>

        {/* Eligibility Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 bg-white px-5 py-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Check className="h-5 w-5 text-success" />
            자격 요건
          </h2>

          <div className="space-y-3">
            {/* 나이 */}
            {welfare.eligibility.age && (
              <div
                className={`flex items-center justify-between rounded-xl border p-4 ${
                  isAgeEligible
                    ? "border-success bg-success-light"
                    : "border-gray-200"
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">나이</p>
                  <p className="text-sm text-gray-500">
                    만 {welfare.eligibility.age.min || 0}~
                    {welfare.eligibility.age.max || 100}세
                  </p>
                </div>
                {userAge !== null && (
                  <span
                    className={`text-sm font-medium ${
                      isAgeEligible ? "text-success" : "text-gray-400"
                    }`}
                  >
                    {isAgeEligible ? "충족 ✓" : "미충족"}
                  </span>
                )}
              </div>
            )}

            {/* 소득 */}
            {welfare.eligibility.income && (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="font-medium text-gray-900">소득</p>
                  <p className="text-sm text-gray-500">
                    {welfare.eligibility.income.type === "median"
                      ? `중위소득 ${welfare.eligibility.income.percent}% 이하`
                      : welfare.eligibility.income.note}
                  </p>
                </div>
              </div>
            )}

            {/* 지역 */}
            {welfare.eligibility.region && welfare.eligibility.region.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="font-medium text-gray-900">지역</p>
                  <p className="text-sm text-gray-500">
                    {welfare.eligibility.region.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* 기타 조건 */}
            {welfare.eligibility.conditions.length > 0 && (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-2 font-medium text-gray-900">기타 조건</p>
                <ul className="space-y-1">
                  {welfare.eligibility.conditions.map((condition, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.section>

        {/* Documents Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 bg-white px-5 py-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <FileText className="h-5 w-5 text-primary-500" />
            필요 서류
          </h2>

          <div className="space-y-2">
            {welfare.documents.map((doc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-gray-300">
                  <Check className="h-4 w-4 text-transparent" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  {doc.note && <p className="text-sm text-gray-500">{doc.note}</p>}
                </div>
                {doc.required && (
                  <span className="ml-auto text-xs text-red-500">필수</span>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Schedule Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 bg-white px-5 py-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Calendar className="h-5 w-5 text-primary-500" />
            신청 일정
          </h2>

          <div className="rounded-xl border border-gray-200 p-4">
            {welfare.schedule.type === "always" ? (
              <p className="font-medium text-gray-900">상시 모집</p>
            ) : (
              <>
                <p className="font-medium text-gray-900">
                  {welfare.schedule.start} ~ {welfare.schedule.end}
                </p>
                {deadline && (
                  <p className="mt-1 text-sm text-warning">마감까지 {deadline}</p>
                )}
              </>
            )}
            {welfare.schedule.note && (
              <p className="mt-2 text-sm text-gray-500">{welfare.schedule.note}</p>
            )}
          </div>
        </motion.section>

        {/* Warnings Section */}
        {welfare.warnings.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-3 bg-white px-5 py-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <AlertCircle className="h-5 w-5 text-warning" />
              주의사항
            </h2>

            <div className="rounded-xl bg-warning-light p-4">
              <ul className="space-y-2">
                {welfare.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-warning" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}

        {/* Disclaimer */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-3 bg-white px-5 py-6"
        >
          <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
            <Info className="h-5 w-5 flex-shrink-0 text-gray-400" />
            <div className="text-sm text-gray-500">
              <p>본 정보는 이해를 돕기 위해 요약한 것입니다.</p>
              <p className="mt-1">정확한 내용은 원본 페이지에서 반드시 확인하세요.</p>
              <p className="mt-2 text-xs text-gray-400">
                마지막 업데이트: {new Date(welfare.source.lastSync).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Floating Button */}
      <div className="sticky bottom-0 border-t bg-white p-5">
        <a
          href={welfare.application.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 font-medium text-white transition-all active:scale-[0.98]"
        >
          신청하러 가기
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}
