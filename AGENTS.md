# 복지메이트 개발 규칙

> AI 에이전트 및 개발자를 위한 프로젝트 규칙 가이드

## 1. 커밋 규칙

### 커밋 메시지 형식

```
<type>: <subject>

<body> (선택)
```

### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | feat: 검색 무한 스크롤 구현 |
| `fix` | 버그 수정 | fix: 빌드 타입 에러 수정 |
| `refactor` | 리팩토링 (기능 변경 X) | refactor: 추천 로직 분리 |
| `style` | 코드 포맷팅, 세미콜론 등 | style: prettier 적용 |
| `docs` | 문서 수정 | docs: 기획서 업데이트 |
| `chore` | 빌드, 설정 변경 | chore: 프로젝트 초기 세팅 |
| `test` | 테스트 코드 | test: 추천 로직 단위 테스트 |

### 커밋 규칙

- 커밋은 **사용자가 요청할 때만** 수행
- 커밋 전 반드시 **빌드 테스트** 실행
- 한글 커밋 메시지 사용
- 관련 없는 변경사항은 분리해서 커밋

### 예시

```bash
# 좋은 예
feat: 홈 추천 혜택 로직 개선

- 추천 혜택 3개로 제한
- 점수 기반 정렬 로직 추가
- 결혼 여부 > 소득 > 나이 우선순위

# 나쁜 예
update code
```

---

## 2. 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 (자동 배포) |
| `develop` | 개발 통합 (선택) |
| `feature/*` | 기능 개발 |
| `fix/*` | 버그 수정 |

**현재**: main 브랜치 단일 운영

---

## 3. 코드 스타일

### TypeScript

- strict 모드 사용
- any 타입 사용 금지 (불가피한 경우 주석 필수)
- 인터페이스는 `I` 접두사 없이 작성

### React/Next.js

- 함수형 컴포넌트 사용
- 클라이언트 컴포넌트는 `"use client"` 명시
- Props 타입은 컴포넌트 파일 내 정의

### 네이밍

```
components/  → PascalCase (WelfareCard.tsx)
hooks/       → camelCase, use 접두사 (useWelfare.ts)
utils/       → camelCase (formatDate.ts)
types/       → PascalCase (Welfare.ts)
```

---

## 4. 프로젝트 구조

```
/welfaremate
├── apps/
│   ├── web/           # 사용자 서비스
│   └── admin/         # 관리자 페이지
├── packages/
│   ├── ui/            # 공통 컴포넌트
│   ├── types/         # 타입 정의
│   ├── data/          # 데이터 접근
│   └── config/        # 공유 설정
├── scripts/           # 데이터 수집 스크립트
├── data/              # JSON 데이터 및 설정
└── docs/              # 문서
```

---

## 5. 빌드 및 배포

### 로컬 개발

```bash
pnpm dev:web     # 사용자 서비스
pnpm dev:admin   # 관리자 페이지
```

### 빌드 테스트

```bash
pnpm build --filter=@welfaremate/web
```

### 배포

- main 브랜치 푸시 → Vercel 자동 배포
- 데이터 스냅샷 → GitHub Actions (매일 03:00)

---

## 6. 데이터 관련

### 스냅샷 생성

```bash
pnpm generate
```

### 환경 변수 (GitHub Secrets)

| 변수 | 용도 |
|------|------|
| `PUBLIC_DATA_API_KEY` | 공공데이터포털 API 키 |
| `OPENAI_API_KEY` | AI 요약 생성 (선택) |

---

## 7. 주의사항

### 하지 말 것

**Git 관련**
- 사용자 요청 없이 커밋하지 않기
- git config 수정하지 않기
- force push 하지 않기
- .env 파일 커밋하지 않기

**코드 관련**
- 이모지 사용 금지 (코드, 주석, 커밋 메시지 모두)
- console.log 남기지 않기 (디버깅 후 제거)
- 주석으로 코드 설명하지 않기 (코드 자체가 명확해야 함)
- TODO 주석 남기지 않기 (바로 처리하거나 이슈로 등록)
- 사용하지 않는 import/변수 남기지 않기
- any 타입 사용 금지

**파일 관련**
- 불필요한 새 파일 생성 금지 (기존 파일 수정 우선)
- README, 문서 파일 임의 생성 금지
- 테스트 파일 임의 생성 금지 (요청 시에만)

**응답 관련**
- 이론 설명 최소화 (코드 먼저, 설명은 간결히)
- 의사 코드(pseudo-code) 제공 금지 (실제 동작 코드만)
- 같은 내용 반복 설명 금지
- 확실하지 않으면 추측하지 말고 확인

### 반드시 할 것

- 코드 수정 후 빌드 테스트
- null 체크 철저히 (API 데이터)
- 에러 발생 시 로그 확인 후 수정
- 수정한 파일은 린트 에러 확인

---

## 8. 자주 사용하는 명령어

```bash
# 개발
pnpm dev:web
pnpm dev:admin

# 빌드
pnpm build

# 데이터 수집
pnpm generate

# 린트
pnpm lint

# 포맷팅
pnpm format
```

---

## 9. 참고 문서

- [기획서](./docs/PLANNING.md)
- [기술 스택](./docs/TECH_STACK.md)
- [데이터 스키마](./docs/DATA_SCHEMA.md)
