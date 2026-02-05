## 온보딩 프로필 설계

복지메이트의 추천 로직은 **사용자가 직접 입력하는 프로필**을 기반으로 한다.  
이 문서는 온보딩 단계에서 어떤 정보를 어떤 순서로, 어떤 제약과 함께 수집할지에 대한 기준을 정의한다.

---

## 전체 플로우

- **STEP0**: 인트로
- **STEP1**: 기본 정보 (나이, 지역)
- **STEP2**: 직업·소득
- **STEP3**: 가구 구성
- **STEP4**: 주거 정보
- **STEP5+**: (향후) 취약·특수 대상, 학력·재학 상태 등

현재 구현은 STEP1~4를 우선 반영하고, 이후 확장한다.

---

## STEP1. 기본 정보

- **목표**: 연령·지역 기반의 1차 필터링

- **필드**
  - `birthYear: number`
  - `region.sido: string`
  - `region.sigungu?: string`

- **UI 요약**
  - 출생연도 드롭다운 (만 18세 기준으로 최근 80년)
  - 시/도 선택 → 시/군/구 선택

---

## STEP2. 직업·소득

- **목표**: 기본 소득 수준과 현재 상태(직장인/구직 등) 파악

- **필드**
  - `employment: "employed" | "self-employed" | "unemployed" | "student" | "other"`
  - `incomeLevel: "low" | "medium" | "high"`

- **UI 요약**
  - 직업/상태: 버튼 리스트 (`EMPLOYMENT_OPTIONS`)
  - 월 소득 수준: 중위소득 구간 기반 버튼 리스트 (`INCOME_OPTIONS`)

- **추천에서의 사용**
  - `incomeLevel`과 `welfare.eligibility.income`의 percent를 비교해 가산/제외 판단
  - `employment`는 향후 구직·창업·재취업 관련 혜택에 가중치로 활용

---

## STEP3. 가구 구성

- **목표**: 1인 가구, 부부 가구, 부모와 동거, 자녀 유무 등 기본 가구 형태 파악

- **필드**
  - `householdSize?: number` (신규)
  - `householdType: "single" | "married" | "with-parents" | "other"`
  - `hasChildren: boolean`

- **UI 요약**
  - 가구원 수: 숫자 선택 (예: 1, 2, 3, 4, 5명 이상)
  - 가구 형태: 버튼 리스트 (`HOUSEHOLD_OPTIONS`)
  - 자녀 여부: 있음/없음 토글

- **제약 로직**
  - `householdSize === 1` 이면:
    - `householdType`은 사실상 `"single"`만 유효
    - UI에서 1인 가구 자동 선택 또는 다른 옵션 비활성화
  - `householdSize > 1` 이거나 `hasChildren === true` 이면:
    - `"single"` 옵션 비활성화

- **추천에서의 사용 (향후)**
  - `householdSize`를 가구원 수 기반 소득 기준, 다자녀/1인가구 혜택 등에 사용
  - `hasChildren` + 태그(출산/육아/영유아 등)를 AND 조건으로 활용

---

## STEP4. 주거 정보

- **목표**: 전월세/자가/부모 집, 무주택 여부 등 주거 지원 혜택을 위한 기초 정보

- **필드**
  - `housingType: "rent" | "jeonse" | "own" | "with-parents" | "other"`
  - `isHouseless: boolean`

- **UI 요약**
  - 주거 형태: 버튼 리스트 (`HOUSING_OPTIONS`)
  - 무주택 여부: 예/아니오 토글

- **추천에서의 사용**
  - `housingType`와 혜택 카테고리/태그(주거/월세/전세 등)를 매칭해 가산
  - `isHouseless`는 홈리스·주거취약 관련 혜택 가중치에 사용

---

## STEP5 이후 확장 (개념만 정의)

아직 구현하지는 않지만, 향후 다음 정보를 추가로 수집할 수 있다.

- **소득/경제**
  - 기초생활수급/차상위 여부 (수급 유형)
  - 보다 세밀한 월소득 구간

- **일/학업**
  - 재학/휴학 여부 (고등학생/대학생 등)
  - 최종 학력

- **취약·특수 대상**
  - 보호종료/자립준비청년 여부 (`isCareLeaver`)
  - 한부모가구 여부 (`isSingleParent`)
  - 장애 정도 (`disabilityLevel` 등)
  - 다문화/북한이탈주민 여부

이 정보들은 재가공된 복지 데이터(`welfare-enriched.json` 등)의 타깃 플래그와 AND 조건으로 사용된다.

