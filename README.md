# Nexus Backend

> 팀의 대화·작업·문서를 연결하는 실시간 협업 대시보드 **Nexus**의 Backend 레포.
> 프론트엔드 레포: [Nexus-FE](https://github.com/wooju01/Nexus-FE)

---

## 제품 개요 (요약)

Nexus는 Slack의 대화, Linear/Jira의 이슈 트래킹, Notion의 문서를 단일 제품 경험으로 통합하는 실시간 협업 플랫폼입니다. 타겟은 10~200명 규모의 프로덕트/엔지니어링/디자인 팀입니다.

**핵심 가치**
- Context preservation — 채널 대화 ↔ Task/Project 양방향 연결
- Single home — Inbox / Mentions / My tasks / Approvals 통합
- Real-time — WebSocket 기반 스레드·Presence·보드 즉시 반영
- AI-native — Daily digest, Summarize thread

📖 **제품 전체 문서 (기능 상세, 데이터 모델, 디자인 가이드라인, 로드맵, 키스크린 매핑)는 FE 레포의 [`docs/product.md`](https://github.com/wooju01/Nexus-FE/blob/main/docs/product.md)에 있습니다.** 이 문서가 Nexus 제품의 단일 진실원(SSOT)입니다. BE 스키마 설계·API 계약 설계 시 이 문서를 기준으로 하세요.

---

## 기술 스택

| 분류 | 현재 설치 |
|---|---|
| 런타임 | **Node.js** (LTS) |
| 언어 | **TypeScript 5.7** |
| 프레임워크 | **NestJS 11** (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) |
| ORM | **Prisma 7** (`@prisma/client`, `prisma`) |
| 테스트 | **Jest 30** + **supertest 7** + **ts-jest 29** |
| Lint/Format | **ESLint 9** + **Prettier 3** + `typescript-eslint 8` |
| 패키지 매니저 | **npm** (`package-lock.json`) |

### tsconfig 현재 설정
- `strictNullChecks: true` ✓
- `noImplicitAny: false` ⚠️ (신규 코드는 명시적 타입 작성)
- `strictBindCallApply: false` ⚠️
- `noFallthroughCasesInSwitch: false` ⚠️

### 미도입 (도입 시 [CLAUDE.md](./CLAUDE.md) 업데이트 필요)
Redis (`ioredis`), BullMQ, ElasticSearch/Meilisearch, `@nestjs/websockets`, `class-validator`/`class-transformer` 또는 Zod, NestJS Passport + JWT, Sentry/OpenTelemetry/PostHog, S3 SDK, AI/LLM 클라이언트.

---

## 시작하기

```bash
# 1. 클론
git clone git@github.com:wooju01/Nexus-BE.git
cd Nexus-BE

# 2. 의존성 설치
npm install

# 3. PostgreSQL 준비 (아래 "데이터베이스 준비" 참조)

# 4. 환경 변수 설정
cp .env.example .env
# .env 편집 → DATABASE_URL 등 입력

# 5. Prisma 클라이언트 생성 + 마이그레이션
npx prisma generate
npx prisma migrate dev

# 6. 개발 서버
npm run start:dev        # http://localhost:3000 (NestJS 기본 포트)
```

### 요구 사항
- Node.js LTS (18.x 이상)
- PostgreSQL 14 이상 (로컬 또는 Docker)

---

## 데이터베이스 준비

### 옵션 A. 로컬 PostgreSQL
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16
createdb nexus_dev
```

### 옵션 B. Docker
```bash
docker run --name nexus-postgres \
  -e POSTGRES_USER=nexus \
  -e POSTGRES_PASSWORD=nexus \
  -e POSTGRES_DB=nexus_dev \
  -p 5432:5432 \
  -d postgres:16
```

이후 `.env`의 `DATABASE_URL`을 맞게 설정합니다:

```
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus_dev?schema=public
```

---

## 주요 명령어

```bash
# 개발
npm run start:dev        # nest start --watch (Hot Reload)
npm run start:debug      # 디버거 + watch
npm run start            # 단일 실행
npm run start:prod       # 빌드 결과 실행 (dist/main)

# 빌드
npm run build            # nest build → dist/

# 검증
npm run lint             # eslint --fix
npm run format           # prettier --write

# 테스트 (Jest, *.spec.ts)
npm test                 # 단위 테스트
npm run test:watch
npm run test:cov         # 커버리지
npm run test:e2e         # E2E (test/jest-e2e.json)
npm run test:debug

# 타입 체크 (스크립트 미정의 → 수동)
npx tsc --noEmit -p tsconfig.build.json

# Prisma
npx prisma generate      # 클라이언트 타입 생성
npx prisma migrate dev   # 개발 마이그레이션 (+ 자동 적용)
npx prisma migrate deploy # 프로덕션 적용 (주의!)
npx prisma studio        # GUI
npx prisma db seed       # 시드 (package.json의 prisma.seed 정의 필요)
```

⚠️ `npx prisma migrate reset`은 **DB를 초기화**합니다. 로컬 외 환경에서 절대 자동 실행 금지.

---

## 폴더 구조

```
Nexus-BE/
├── CLAUDE.md            # Claude Code 작업 지침
├── README.md            # 이 파일
├── package.json         # name: "nexus-be"
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
├── prisma.config.ts
├── prisma/
│   └── schema.prisma    # 단일 스키마 파일
├── src/
│   ├── main.ts          # 엔트리포인트
│   ├── app.module.ts    # 루트 모듈
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   └── app.service.ts
├── test/                # E2E (jest-e2e.json)
└── dist/                # 빌드 산출물 (커밋 X)
```

### 도메인 코드 추가 시 권장 구조 (NestJS 컨벤션)
```
src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── auth/            # auth.module.ts / controller.ts / service.ts / guard.ts / dto/
│   ├── workspace/
│   ├── channel/
│   ├── message/
│   ├── thread/
│   ├── project/
│   ├── task/
│   ├── inbox/
│   └── notification/
├── prisma/              # PrismaService, PrismaModule (전역)
├── realtime/            # WebSocket Gateway (도입 후)
├── ai/                  # LLM 프록시 (도입 후)
├── common/              # 공용 데코레이터, 가드, 인터셉터, 파이프
└── config/              # 환경 변수 로더
```

---

## 환경 변수

`.env` (커밋 금지, `.env.example`에 키 목록만 유지)

```bash
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus_dev?schema=public

# (도입 후) Redis
# REDIS_URL=redis://localhost:6379

# (도입 후) Auth
# JWT_ACCESS_SECRET=
# JWT_REFRESH_SECRET=

# (도입 후) 관측성
# SENTRY_DSN=
# OTEL_EXPORTER_OTLP_ENDPOINT=

# (도입 후) AI / LLM
# LLM_API_KEY=
# LLM_BASE_URL=

# CORS (FE 오리진)
CORS_ORIGIN=http://localhost:3000
```

---

## API 컨벤션 요약

- 경로 prefix: `/v1/...`
- URL: kebab-case, 복수형 리소스 (`/workspaces/:workspaceId/channels`)
- 페이지네이션: **커서 기반** (`?cursor=...&limit=50`)
- 에러 응답 포맷: `{ "error": { "code": "...", "message": "...", "details": {} } }`
- 상태 코드: `200/201/204/400/401/403/404/409/429`
- WebSocket 이벤트 네이밍: `<domain>.<action>` (예: `message.created`, `task.updated`)

상세는 [CLAUDE.md](./CLAUDE.md)의 "API 설계 원칙" 섹션을 참고하세요.

---

## 컨벤션 요약

- 언어: 모든 응답·주석·커밋·PR은 **한국어** ([CLAUDE.md](./CLAUDE.md) §1 참고)
- 커밋: Conventional Commits (예: `feat(be/auth): JWT 모듈 구현 (NX-150)`)
- 브랜치: `feat/<area>-<short-desc>`, `fix/…`, `chore/…`
- 테스트 파일 컨벤션: **`*.spec.ts`** (Jest) — `*.test.ts`로 작성 금지
- 파일명: `kebab-case.ts` (NestJS 컨벤션 `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.spec.ts` 유지)
- FE/BE를 동시에 수정해야 한다면, 가능하면 PR을 분리하고 **BE를 먼저 머지**

---

## 트러블슈팅

**`Error: Can't reach database server at localhost:5432`**
→ Postgres 서비스 실행 확인 (`brew services list` 또는 `docker ps`)
→ `.env`의 `DATABASE_URL` 포트/비밀번호 재확인

**`PrismaClientInitializationError: Environment variable not found: DATABASE_URL`**
→ `.env` 파일 존재 + `DATABASE_URL` 키 설정 확인
→ NestJS는 `@nestjs/config` 또는 `dotenv`로 로드해야 함 (도입 후)

**마이그레이션 충돌**
→ 로컬에서 `npx prisma migrate dev`로 재생성. **수동 SQL 편집 금지.**

**Jest가 `*.test.ts` 파일을 인식 못 함**
→ `package.json`의 Jest config는 `.*\\.spec\\.ts$`만 매칭합니다. 파일명을 `*.spec.ts`로 변경하세요.

---

## 관련 문서

- [Nexus 제품 문서 (SSOT)](https://github.com/wooju01/Nexus-FE/blob/main/docs/product.md) — 제품 전체 기능, 데이터 모델, 디자인 가이드라인, 로드맵 (FE 레포에 위치)
- [CLAUDE.md](./CLAUDE.md) — Claude Code 작업 지침 (공통 + BE 전용)
- [Nexus-FE](https://github.com/wooju01/Nexus-FE) — 프론트엔드 레포

---

## 팀 & 라이선스

- **조직**: Aether Labs
- **라이선스**: TBD (내부 전용 / 추후 결정)
