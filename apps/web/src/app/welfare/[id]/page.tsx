"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronDown,
  Heart,
  Share2,
  ExternalLink,
  Check,
  AlertCircle,
  Calendar,
  FileText,
  Info,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import {
  getWelfareWithDetail,
  getCategoryLabel,
  formatDeadline,
  findDocumentLink,
  type WelfareItemWithDetail,
} from "@welfaremate/data";
import { isBookmarked, addBookmark, removeBookmark, getProfile } from "@/lib/db";

export default function WelfareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [welfare, setWelfare] = useState<WelfareItemWithDetail | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(true);

  useEffect(() => {
    const data = getWelfareWithDetail(id);
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

          {/* AI Summary - AI 데이터가 있으면 표시 */}
          {welfare.ai?.summary && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-4">
              <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-500" />
              <p className="text-sm text-blue-700">{welfare.ai.summary}</p>
            </div>
          )}

          {/* Benefit Highlight - 라벨 좌상, 금액 우하(필수서류와 동일 패턴) */}
          <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50/50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-500">혜택</p>
            {welfare.ai?.benefits && welfare.ai.benefits.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {welfare.ai.benefits.map((benefit, i) => (
                  <li
                    key={i}
                    className="border-b border-primary-100/80 pb-3 last:border-0 last:pb-0 last:mb-0"
                  >
                    <p className="text-sm text-gray-600">{benefit.label}</p>
                    <div className="mt-1 text-right">
                      <span className="font-semibold text-primary-700">
                        {benefit.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3">
                {(welfare.benefit.duration || (welfare.benefit.amount && welfare.benefit.description)) && (
                  <p className="text-sm text-gray-600">
                    {welfare.benefit.duration || welfare.benefit.description}
                  </p>
                )}
                <div className="mt-1 text-right">
                  <p className="font-semibold text-primary-700">
                    {welfare.benefit.amount || welfare.benefit.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Eligibility Section - AI 데이터 우선 */}
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

          {/* AI 요약 자격요건 */}
          {welfare.ai?.eligibility && (
            <div className="mb-4 rounded-xl bg-green-50 p-4">
              <p className="font-medium text-green-700">{welfare.ai.eligibility.simple}</p>
            </div>
          )}

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

            {/* AI 상세 조건 우선, 없으면 conditions, 없으면 raw.지원대상/선정기준 */}
            {welfare.ai?.eligibility?.details && welfare.ai.eligibility.details.length > 0 ? (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-2 font-medium text-gray-900">상세 조건</p>
                <ul className="space-y-1">
                  {welfare.ai.eligibility.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ) : welfare.eligibility.conditions.length > 0 ? (
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
            ) : (() => {
              const rawSupport = welfare.raw?.지원대상 as string | undefined;
              const rawCriteria = welfare.raw?.선정기준 as string | undefined;
              const rawText = rawSupport || rawCriteria;
              if (!rawText || !rawText.trim()) return null;
              return (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-2 font-medium text-gray-900">지원대상 / 선정기준</p>
                  <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
                    {rawText.trim()}
                  </pre>
                </div>
              );
            })()}
          </div>
        </motion.section>

        {/* Documents Section - 건수 표시, 아코디언, 체크박스 제거 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-3 bg-white px-5 py-6"
        >
          {(() => {
            const docList =
              welfare.ai?.documents && welfare.ai.documents.length > 0
                ? welfare.ai.documents.map((d) => ({ name: d.name, how: d.how }))
                : welfare.detail?.documents.required.length
                  ? welfare.detail.documents.required.map((name) => ({ name, how: undefined }))
                  : welfare.documents.length > 0
                    ? welfare.documents.map((d) => ({ name: d.name, how: d.note }))
                    : [];
            const docCount = docList.length;

            return (
              <>
                <button
                  type="button"
                  onClick={() => setDocumentsOpen((o) => !o)}
                  className="flex w-full items-center justify-between py-1 text-left"
                >
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <FileText className="h-5 w-5 text-primary-500" />
                    필수 서류
                    {docCount > 0 && (
                      <span className="text-sm font-normal text-gray-500">
                        {docCount}건
                      </span>
                    )}
                  </h2>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform ${documentsOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {docCount > 0 && documentsOpen && (
                  <div className="mt-4 space-y-2">
                    {docList.map((doc, i) => {
                      const linkInfo = findDocumentLink(doc.name);
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-gray-200 p-4"
                        >
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          {(linkInfo || doc.how) && (
                            <div className="mt-1 text-right">
                              {linkInfo ? (
                                <a
                                  href={linkInfo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary-500 hover:underline"
                                >
                                  {linkInfo.source}에서 발급
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <p className="text-sm text-gray-500">{doc.how}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {docCount === 0 && (
                  <p className="mt-2 text-sm text-gray-500">서류 정보가 없습니다</p>
                )}
              </>
            );
          })()}
        </motion.section>

        {/* Legal Basis Section - 크롤링 데이터 */}
        {welfare.detail?.legalBasis && welfare.detail.legalBasis.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-3 bg-white px-5 py-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <FileText className="h-5 w-5 text-primary-500" />
              법적 근거
            </h2>

            <div className="space-y-2">
              {welfare.detail.legalBasis.map((basis, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <p className="font-medium text-gray-900">{basis.name}</p>
                  <p className="text-sm text-gray-500">{basis.article}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* AI Tips Section */}
        {welfare.ai?.tips && welfare.ai.tips.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="mt-3 bg-white px-5 py-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              신청 팁
            </h2>

            <div className="space-y-2">
              {welfare.ai.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-yellow-50 p-4"
                >
                  <span className="mt-0.5 text-yellow-500">💡</span>
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Duplicate Warning - AI 데이터 우선, 없으면 크롤링 데이터 */}
        {(welfare.ai?.warning || welfare.detail?.duplicateWarning) && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
            className="mt-3 bg-white px-5 py-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <AlertCircle className="h-5 w-5 text-warning" />
              중복 수혜 불가
            </h2>

            <div className="rounded-xl bg-warning-light p-4">
              <p className="text-sm text-gray-700">
                {welfare.ai?.warning || welfare.detail?.duplicateWarning}
              </p>
            </div>
          </motion.section>
        )}

        {/* 접수기관·문의처 - 전화문의는 || 구분, 항목은 기관명/전화번호 */}
        {(() => {
          const agency =
            welfare.application.receivingAgency ||
            (welfare.raw?.접수기관 as string | undefined)?.trim() ||
            welfare.detail?.contact?.agency;
          const contactRaw =
            welfare.application.contact ||
            (welfare.raw?.전화문의 as string | undefined)?.trim() ||
            (welfare.detail?.contact?.phone?.length
              ? welfare.detail.contact.phone.join("||")
              : "");
          const contactItems = contactRaw
            ? contactRaw.split("||").map((s) => s.trim()).filter(Boolean)
            : [];
          if (!agency && contactItems.length === 0) return null;
          return (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-3 bg-white px-5 py-6"
            >
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <Info className="h-5 w-5 text-gray-500" />
                접수기관 · 문의처
              </h2>
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                {agency && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">접수기관</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{agency}</p>
                  </div>
                )}
                {contactItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">문의처</p>
                    <ul className="mt-1 space-y-2">
                      {contactItems.map((item, i) => {
                        const slash = item.indexOf("/");
                        const name = slash >= 0 ? item.slice(0, slash).trim() : "";
                        const phone = slash >= 0 ? item.slice(slash + 1).trim() : item;
                        return (
                          <li key={i} className="text-sm font-medium text-gray-900">
                            {name && phone ? (
                              <>
                                <span>{name}</span>
                                <span className="text-gray-500"> · </span>
                                <span className="break-all">{phone}</span>
                              </>
                            ) : (
                              <span className="break-all">{item}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </motion.section>
          );
        })()}

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

      {/* Floating Button - 복지로만 "복지로에서 신청하기", 나머지 "신청하러 가기" */}
      {(() => {
        const applicationUrl =
          welfare.application.url &&
          !welfare.application.url.includes("bokjiro.go.kr")
            ? welfare.application.url
            : (welfare.raw?.상세조회URL as string | undefined)?.trim() ||
                welfare.application.url ||
                "https://www.bokjiro.go.kr";
        const buttonLabel = applicationUrl.includes("bokjiro.go.kr")
          ? "복지로에서 신청하기"
          : "신청하러 가기";
        return (
          <div className="sticky bottom-0 border-t bg-white p-5">
            <a
              href={applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 font-medium text-white transition-all active:scale-[0.98]"
            >
              {buttonLabel}
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        );
      })()}
    </div>
  );
}
