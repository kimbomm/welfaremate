# 복지메이트 기술 스택

## 프로젝트 구조

```
/welfaremate
├── apps/
│   ├── web/                 # 사용자 서비스 (Next.js)
│   └── admin/               # 관리자 페이지 (Next.js)
│
├── packages/
│   ├── ui/                  # 공통 UI 컴포넌트
│   ├── config/              # 공통 설정 (tailwind, eslint 등)
│   ├── types/               # 공유 타입 정의
│   └── data/                # 복지 데이터 & 유틸
│
├── scripts/
│   └── generate-snapshot/   # 데이터 수집 스크립트
│
├── data/
│   ├── welfare-snapshot.json
│   └── config/
│       ├── curation.json
│       ├── ai-settings.json
│       └── monetization.json
│
├── docs/                    # 문서
│   ├── PLANNING.md
│   └── TECH_STACK.md
│
├── turbo.json
└── package.json
```

---

## 기술 스택

### Core

| 영역 | 기술 | 버전 | 비고 |
|------|------|------|------|
| **Monorepo** | Turborepo | latest | 빌드 캐싱, 병렬 실행 |
| **Framework** | Next.js | 14+ | App Router, SSG |
| **Language** | TypeScript | 5+ | 전역 사용 |
| **Runtime** | Node.js | 20+ | LTS |
| **Package Manager** | pnpm | 8+ | 모노레포 최적화 |

### Frontend

| 영역 | 기술 | 비고 |
|------|------|------|
| **Styling** | Tailwind CSS | 유틸리티 퍼스트 |
| **Components** | shadcn/ui | Radix 기반, 커스터마이징 용이 |
| **Animation** | Framer Motion | 마이크로 인터랙션 |
| **Bottom Sheet** | Vaul | 모바일 최적화 |
| **Toast** | Sonner | 알림 UI |
| **Icons** | Lucide | 일관된 아이콘셋 |
| **Font** | Pretendard | 가독성 좋은 한글 폰트 |

### Data & State

| 영역 | 기술 | 비고 |
|------|------|------|
| **Client Storage** | IndexedDB (Dexie.js) | 프로필, 북마크 저장 |
| **Server State** | TanStack Query | 데이터 페칭, 캐싱 |
| **Form** | React Hook Form + Zod | 유효성 검증 |

### AI

| 영역 | 기술 | 비고 |
|------|------|------|
| **SDK** | Vercel AI SDK | 스트리밍 지원 |
| **Model** | OpenAI / Claude | 상담 기능 |

### Infrastructure

| 영역 | 기술 | 비고 |
|------|------|------|
| **Hosting** | Vercel | 자동 배포, Edge |
| **CI/CD** | GitHub Actions | 데이터 수집, 빌드 |
| **Analytics** | Google Analytics 4 | 사용자 분석 |
| **Monitoring** | Sentry | 에러 추적 |

### Data Pipeline

| 영역 | 기술 | 비고 |
|------|------|------|
| **Scheduler** | GitHub Actions (cron) | 매일 새벽 3시 |
| **API Client** | Node.js fetch | 공공 API 호출 |
| **Storage** | JSON 파일 (Git) | welfare-snapshot.json |

---

## 개발 환경

### 필수 도구

```bash
# Node.js 20+
node -v

# pnpm
npm install -g pnpm

# Turborepo
pnpm add -g turbo
```

### 로컬 실행

```bash
# 의존성 설치
pnpm install

# 전체 개발 서버
pnpm dev

# 개별 앱 실행
pnpm dev:web    # 사용자 서비스
pnpm dev:admin  # 관리자 페이지

# 빌드
pnpm build

# 데이터 스냅샷 생성
pnpm generate
```

### 환경 변수

```bash
# apps/web/.env.local
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# apps/admin/.env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

---

## 배포 전략

### Vercel 프로젝트 구성

| 프로젝트 | 앱 | 도메인 |
|----------|-----|--------|
| welfaremate-web | apps/web | welfaremate.kr |
| welfaremate-admin | apps/admin | admin.welfaremate.kr |

### 배포 흐름

```
[Push to main]
      │
      ├─→ Vercel 자동 감지
      │
      ├─→ Turborepo 빌드 (캐싱 활용)
      │
      └─→ 각 앱 독립 배포
```

### 데이터 업데이트 흐름

```
[매일 03:00 - GitHub Actions]
      │
      ├─→ 공공 API 호출
      │
      ├─→ 변경분 AI 처리
      │
      ├─→ welfare-snapshot.json 커밋
      │
      └─→ Vercel 자동 재배포
```

---

## 코드 컨벤션

### 파일 네이밍

```
components/  → PascalCase (WelfareCard.tsx)
hooks/       → camelCase (useWelfare.ts)
utils/       → camelCase (formatDate.ts)
types/       → PascalCase (Welfare.ts)
```

### 커밋 메시지

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
chore: 빌드, 설정 변경
```

### 브랜치 전략

```
main        → 프로덕션
develop     → 개발 통합
feature/*   → 기능 개발
hotfix/*    → 긴급 수정
```

---

## 성능 목표

| 지표 | 목표 |
|------|------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Lighthouse | > 90 |

### 최적화 전략

- SSG로 정적 페이지 생성
- 이미지 최적화 (next/image)
- 번들 사이즈 최소화
- Edge 캐싱 활용
