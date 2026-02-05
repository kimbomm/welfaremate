## welfare-enriched / 타깃 플래그 스키마 설계

복지메이트는 `welfare-snapshot.json`, `welfare-detail.json` 원본은 그대로 유지하고,  
별도의 재가공 파일(예: `welfare-targets.json`)에서 **추천·필터링용 타깃 플래그**를 읽어 사용한다.

이 문서는 그 재가공 파일의 스키마와 활용 방식을 정의한다.

---

## 1. 파일 구조

```jsonc
{
  "version": "2026-02-05",
  "generatedAt": "2026-02-05T12:00:00Z",
  "items": {
    "welfare_310000000101": {
      "targets": {
        "isCareLeaverOnly": true,
        "isSingleParentOnly": false,
        "requiresBasicLivelihoodOrNearPoor": false,
        "requiresStudent": false,
        "requiresDisabled": false
      }
    }
  }
}
```

### 필드 설명

- **루트**
  - `version`: 스키마/룰 버전 (문자열)
  - `generatedAt`: 재가공 시점 ISO 문자열
  - `items`: `welfare-snapshot`의 `id` → 타깃 플래그 매핑

- **items[<welfareId>]**
  - `targets`: 해당 복지 혜택의 **대상 조건 플래그 집합**

- **targets**
  - `isCareLeaverOnly: boolean`
    - 자립준비청년/보호종료아동 전용일 때 `true`
  - `isSingleParentOnly: boolean`
    - 법정 한부모가구에만 해당할 때 `true`
  - `requiresBasicLivelihoodOrNearPoor: boolean`
    - 기초생활수급자·차상위계층(저소득) 전용일 때 `true`
  - `requiresStudent: boolean`
    - 대학생/재학 중 등 **학생 신분 필수**일 때 `true`
  - `requiresDisabled: boolean`
    - 등록 장애인 본인에게만 해당하는 혜택일 때 `true`

> 원칙: **모호하면 전부 false** 로 두어 과도한 제외를 피한다.

---

## 2. 원본 데이터 → 플래그 매핑 개념

입력 소스:

- `welfare-snapshot.raw.지원대상`
- `welfare-snapshot.raw.선정기준`
- (필요시) `welfare-detail` 내 지원대상/선정기준 텍스트

### 매핑 규칙 예시 (휴먼/LLM 룰)

- `isCareLeaverOnly`
  - 텍스트에 다음 키워드 포함:
    - `"보호종료아동"`, `"자립준비청년"`, `"시설 퇴소청소년"`, `"가정위탁 보호종료"`
  - 그리고 대상이 일반 청년/가구 전체가 아니라 **“보호 종료”에 한정**되어 있으면 `true`

- `isSingleParentOnly`
  - `"한부모가정"`, `"한부모가족"`이 지원대상으로 명시되고
  - “모든 가구”와 같은 일반 대상이 아닌 경우 `true`

- `requiresBasicLivelihoodOrNearPoor`
  - `"기초생활수급자"`, `"차상위계층"`이 **주요 대상**으로 명시되고
  - 일반 중산층 이상에게 개방된 혜택이 아닐 때 `true`

- `requiresStudent`
  - `"대학교 재학생"`, `"대학생"`, `"재학 중인 자"` 등 표현이 있고
  - “졸업생/취준생 포함”이 아닌 경우 `true`

- `requiresDisabled`
  - `"등록장애인"`, `"장애인"`, `"중증장애"` 등이 대상 본인 조건으로 사용될 때 `true`

실제 구현은 LLM + 정규식/룰 기반으로 작성하며, 실패/애매한 경우에는  
**해당 플래그를 설정하지 않고 기본값(false)을 유지**하는 전략을 사용한다.

---

## 3. UserProfile ↔ 타깃 플래그 매칭 규칙

온보딩에서 수집한 프로필(`UserProfile`)과 타깃 플래그를 **AND 조건**으로 매칭한다.

### 매칭 테이블 (요약)

- `targets.isCareLeaverOnly === true`
  - 포함 조건: `profile.isCareLeaver === true`
  - 그렇지 않으면: **추천 후보에서 제외**

- `targets.isSingleParentOnly === true`
  - 포함 조건: `profile.isSingleParent === true`

- `targets.requiresBasicLivelihoodOrNearPoor === true`
  - 포함 조건(향후):
    - 온보딩에서 `benefitStatus`가 `"basic"` 또는 `"near-poor"` 인 경우

- `targets.requiresStudent === true`
  - 포함 조건(1차):
    - `profile.employment === "student"`
  - 이후 학력/재학 필드 도입 시:
    - `profile.educationStatus`가 재학/휴학인 경우로 확장

- `targets.requiresDisabled === true`
  - 포함 조건: `profile.isDisabled === true`

### 추천 로직에의 적용 위치 (개념)

- 홈/검색 추천 후보 집합을 만들 때:

```ts
// (개념 예시)
const targets = getWelfareTargets(item.id); // welfare-enriched.json에서 읽은 플래그

if (targets?.isCareLeaverOnly && !profile.isCareLeaver) return false;
if (targets?.isSingleParentOnly && !profile.isSingleParent) return false;
if (targets?.requiresDisabled && !profile.isDisabled) return false;
// … 기타 플래그도 동일한 패턴으로 체크
```

- 점수 계산(`calculateRecommendScore`)은 **후순위**이며,  
  위 AND 필터를 통과한 항목만 점수 경쟁을 하도록 한다.

---

## 4. 구현 단계 요약

1. 이 스키마대로 `welfare-enriched.json`을 생성하는 스크립트/파이프라인 작성
2. `packages/data/src/index.ts`에서 `welfare-enriched.json`을 import 후
   - `getWelfareTargets(id: string)` 헬퍼 제공
3. 추천 로직(`recommend.ts`, 검색 정렬 등)에서
   - `UserProfile`과 `targets`를 이용해 **후보 제외 AND 필터**를 먼저 적용

이 문서는 **스키마·규칙 정의용**이며, 실제 생성 스크립트와 코드 적용은 별도 단계에서 진행한다.

