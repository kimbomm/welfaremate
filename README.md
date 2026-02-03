# 복지메이트 (WelfareMate)

> 복잡한 복지 정보를 한눈에, 개인정보 걱정 없는 AI 맞춤형 비서

## 소개

복지메이트는 공공 복지 정보를 쉽게 이해할 수 있도록 AI가 해석해주는 모바일 웹 서비스입니다.

### 핵심 가치

- **Privacy First** - 서버 DB 없이 브라우저에서만 데이터 관리
- **Simplicity** - 복잡한 공문서를 사람의 언어로 번역
- **Speed** - 정적 데이터 기반 초고속 응답

## 프로젝트 구조

```
/welfaremate
├── apps/
│   ├── web/           # 사용자 서비스
│   └── admin/         # 관리자 페이지
├── packages/
│   ├── ui/            # 공통 컴포넌트
│   ├── config/        # 공통 설정
│   ├── types/         # 타입 정의
│   └── data/          # 데이터 유틸
├── scripts/           # 데이터 수집 스크립트
├── data/              # JSON 데이터
└── docs/              # 문서
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| Monorepo | Turborepo |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| Storage | IndexedDB (Dexie.js) |
| AI | Vercel AI SDK |
| Hosting | Vercel |

## 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build
```

## 문서

- [기획서](./docs/PLANNING.md)
- [기술 스택](./docs/TECH_STACK.md)
- [데이터 스키마](./docs/DATA_SCHEMA.md)

## 라이선스

MIT
