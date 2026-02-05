"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveProfile } from "@/lib/db";
import {
  REGIONS,
  SIDO_LIST,
  EMPLOYMENT_OPTIONS,
  INCOME_OPTIONS,
  HOUSEHOLD_OPTIONS,
  HOUSING_OPTIONS,
} from "@/lib/constants";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  birthYear: number;
  sido: string;
  sigungu: string;
  employment: string;
  incomeLevel: string;
  householdSize: number;
  householdType: string;
  hasChildren: boolean;
  housingType: string;
  isHouseless: boolean;
  isDisabled: boolean;
  isMulticultural: boolean;
  isSingleParent: boolean;
  isCareLeaver: boolean;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    birthYear: 1995,
    sido: "",
    sigungu: "",
    employment: "",
    incomeLevel: "",
    householdSize: 1,
    householdType: "",
    hasChildren: false,
    housingType: "",
    isHouseless: false,
    isDisabled: false,
    isMulticultural: false,
    isSingleParent: false,
    isCareLeaver: false,
  });

  const updateForm = (key: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.birthYear && formData.sido;
      case 2:
        return formData.employment && formData.incomeLevel;
      case 3:
        return formData.householdType;
      case 4:
        return formData.housingType;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    type Employment = "employed" | "self-employed" | "unemployed" | "student" | "other";
    type IncomeLevel = "low" | "medium" | "high";
    type HouseholdType = "single" | "married" | "with-parents" | "other";
    type HousingType = "rent" | "jeonse" | "own" | "with-parents" | "other";

    await saveProfile({
      birthYear: formData.birthYear,
      region: {
        sido: formData.sido,
        sigungu: formData.sigungu || undefined,
      },
      employment: formData.employment as Employment,
      incomeLevel: formData.incomeLevel as IncomeLevel,
      householdSize: formData.householdSize,
      householdType: formData.householdType as HouseholdType,
      hasChildren: formData.hasChildren,
      housingType: formData.housingType as HousingType,
      isHouseless: formData.isHouseless,
      isDisabled: formData.isDisabled,
      isVeteran: false,
      isMulticultural: formData.isMulticultural,
      isSingleParent: formData.isSingleParent,
      isCareLeaver: formData.isCareLeaver,
    });
    router.push("/");
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`p-1 ${step === 1 ? "invisible" : ""}`}
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  s <= step ? "bg-primary-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="w-8" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-5 py-8">
        <AnimatePresence mode="wait" custom={step}>
          <motion.div
            key={step}
            custom={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {step === 1 && (
              <StepOne formData={formData} updateForm={updateForm} />
            )}
            {step === 2 && (
              <StepTwo formData={formData} updateForm={updateForm} />
            )}
            {step === 3 && (
              <StepThree formData={formData} updateForm={updateForm} />
            )}
            {step === 4 && (
              <StepFour formData={formData} updateForm={updateForm} />
            )}
            {step === 5 && (
              <StepFive formData={formData} updateForm={updateForm} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t bg-white p-5">
        <button
          onClick={step === 5 ? handleSubmit : handleNext}
          disabled={!canProceed()}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-primary-500 font-medium text-white transition-all active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
        >
          {step === 5 ? "시작하기" : "다음"}
          {step < 5 && <ChevronRight className="ml-1 h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

// Step 1: 기본 정보
function StepOne({
  formData,
  updateForm,
}: {
  formData: FormData;
  updateForm: (key: keyof FormData, value: unknown) => void;
}) {
  const sigunguList = formData.sido
    ? REGIONS[formData.sido as keyof typeof REGIONS]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          기본 정보를 알려주세요
        </h1>
        <p className="mt-2 text-gray-500">
          맞춤 복지 혜택을 찾기 위해 필요해요
        </p>
      </div>

      {/* 출생연도 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          출생연도
        </label>
        <select
          value={formData.birthYear}
          onChange={(e) => updateForm("birthYear", Number(e.target.value))}
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      </div>

      {/* 지역 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          거주 지역
        </label>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={formData.sido}
            onChange={(e) => {
              updateForm("sido", e.target.value);
              updateForm("sigungu", "");
            }}
            className="h-12 rounded-xl border border-gray-200 px-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">시/도 선택</option>
            {SIDO_LIST.map((sido) => (
              <option key={sido} value={sido}>
                {sido}
              </option>
            ))}
          </select>
          <select
            value={formData.sigungu}
            onChange={(e) => updateForm("sigungu", e.target.value)}
            disabled={!formData.sido}
            className="h-12 rounded-xl border border-gray-200 px-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">시/군/구 선택</option>
            {sigunguList.map((sigungu) => (
              <option key={sigungu} value={sigungu}>
                {sigungu}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Step 2: 직업/소득
function StepTwo({
  formData,
  updateForm,
}: {
  formData: FormData;
  updateForm: (key: keyof FormData, value: unknown) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          직업과 소득 수준을 알려주세요
        </h1>
        <p className="mt-2 text-gray-500">
          소득 기준 복지 혜택을 찾는 데 활용돼요
        </p>
      </div>

      {/* 직업 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          현재 상태
        </label>
        <div className="space-y-2">
          {EMPLOYMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateForm("employment", option.value)}
              className={`flex h-14 w-full items-center rounded-xl border px-4 text-left transition-all ${
                formData.employment === option.value
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 소득 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          월 소득 수준
        </label>
        <div className="space-y-2">
          {INCOME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateForm("incomeLevel", option.value)}
              className={`flex w-full flex-col items-start rounded-xl border px-4 py-3 text-left transition-all ${
                formData.incomeLevel === option.value
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className={
                  formData.incomeLevel === option.value
                    ? "text-primary-600"
                    : "text-gray-900"
                }
              >
                {option.label}
              </span>
              <span className="mt-0.5 text-sm text-gray-500">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: 가구 정보
function StepThree({
  formData,
  updateForm,
}: {
  formData: FormData;
  updateForm: (key: keyof FormData, value: unknown) => void;
}) {
  const handleHouseholdSizeChange = (size: number) => {
    updateForm("householdSize", size);
    if (size === 1) {
      updateForm("householdType", "single");
    } else if (formData.householdType === "single") {
      updateForm("householdType", "");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          가구 정보를 알려주세요
        </h1>
        <p className="mt-2 text-gray-500">
          가구 형태에 따른 혜택을 찾아드려요
        </p>
      </div>

      {/* 가구원 수 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          함께 사는 가구원 수 (본인 포함)
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4].map((size) => (
            <button
              key={size}
              onClick={() => handleHouseholdSizeChange(size)}
              className={`flex h-12 items-center justify-center rounded-xl border text-sm transition-all ${
                formData.householdSize === size
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
            >
              {size}명
            </button>
          ))}
          <button
            onClick={() => handleHouseholdSizeChange(5)}
            className={`flex h-12 items-center justify-center rounded-xl border text-sm transition-all ${
              formData.householdSize >= 5
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            5명+
          </button>
        </div>
      </div>

      {/* 가구 형태 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          가구 형태
        </label>
        <div className="space-y-2">
          {HOUSEHOLD_OPTIONS.map((option) => (
            <button
              key={option.value}
              disabled={
                option.value === "single" &&
                (formData.householdSize > 1 || formData.hasChildren)
              }
              onClick={() => updateForm("householdType", option.value)}
              className={`flex h-14 w-full items-center rounded-xl border px-4 text-left transition-all ${
                formData.householdType === option.value
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 자녀 여부 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          자녀가 있으신가요?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateForm("hasChildren", false)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              !formData.hasChildren
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            없음
          </button>
          <button
            onClick={() => updateForm("hasChildren", true)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              formData.hasChildren
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            있음
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 4: 주거 정보
function StepFour({
  formData,
  updateForm,
}: {
  formData: FormData;
  updateForm: (key: keyof FormData, value: unknown) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          주거 정보를 알려주세요
        </h1>
        <p className="mt-2 text-gray-500">
          주거 관련 복지 혜택을 찾아드려요
        </p>
      </div>

      {/* 주거 형태 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          현재 주거 형태
        </label>
        <div className="space-y-2">
          {HOUSING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateForm("housingType", option.value)}
              className={`flex h-14 w-full items-center rounded-xl border px-4 text-left transition-all ${
                formData.housingType === option.value
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 무주택 여부 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          무주택자이신가요?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateForm("isHouseless", true)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              formData.isHouseless
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            예
          </button>
          <button
            onClick={() => updateForm("isHouseless", false)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              !formData.isHouseless
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          💡 입력하신 정보는 기기에만 저장되며, 서버로 전송되지 않습니다.
        </p>
      </div>
    </div>
  );
}

// Step 5: 추가 정보 (취약·특수 대상)
function StepFive({
  formData,
  updateForm,
}: {
  formData: FormData;
  updateForm: (key: keyof FormData, value: unknown) => void;
}) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - formData.birthYear;
  const showCareLeaver = age >= 18 && age <= 34;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">추가 정보를 알려주세요</h1>
        <p className="mt-2 text-gray-500">
          취약·특수 대상 복지 혜택을 더 정확하게 찾는 데 활용돼요
        </p>
      </div>

      {/* 한부모가구 여부 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          한부모가구이신가요?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateForm("isSingleParent", true)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              formData.isSingleParent
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            예
          </button>
          <button
            onClick={() => updateForm("isSingleParent", false)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              !formData.isSingleParent
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 장애 여부 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          등록 장애가 있으신가요?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateForm("isDisabled", true)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              formData.isDisabled
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            예
          </button>
          <button
            onClick={() => updateForm("isDisabled", false)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              !formData.isDisabled
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 다문화가정 여부 */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700">
          다문화가정이신가요?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateForm("isMulticultural", true)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              formData.isMulticultural
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            예
          </button>
          <button
            onClick={() => updateForm("isMulticultural", false)}
            className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
              !formData.isMulticultural
                ? "border-primary-500 bg-primary-50 text-primary-600"
                : "border-gray-200 text-gray-900 hover:border-gray-300"
            }`}
          >
            아니오
          </button>
        </div>
      </div>

      {/* 자립준비청년/보호종료 여부 */}
      {showCareLeaver && (
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            아동복지시설·가정위탁 보호 종료 후 자립을 준비 중인 자립준비청년(보호종료아동)에
            해당하시나요?
          </label>
          <p className="mb-3 text-xs text-gray-500">
            아동양육시설·공동생활가정·가정위탁 등에서 보호를 받다가 퇴소한 뒤 자립을 준비 중인
            청년을 말해요.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateForm("isCareLeaver", true)}
              className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
                formData.isCareLeaver
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
            >
              예
            </button>
            <button
              onClick={() => updateForm("isCareLeaver", false)}
              className={`flex h-14 items-center justify-center rounded-xl border transition-all ${
                !formData.isCareLeaver
                  ? "border-primary-500 bg-primary-50 text-primary-600"
                  : "border-gray-200 text-gray-900 hover:border-gray-300"
              }`}
            >
              아니오
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
