# CLAUDE.md — Nexus Backend

> 이 파일은 Claude Code가 **Nexus Backend** 작업 시 따라야 하는 전체 지침입니다.

---

# Part 1. 공통 규칙

이 섹션은 FE/BE 양쪽 모두에 적용되는 프로젝트 공통 규칙입니다.

---

## 1. 언어 및 커뮤니케이션

- **모든 응답은 한국어로 작성.**
- 코드 주석, 커밋 메시지, PR 제목/본문, 이슈 설명도 한국어.
- 단, 다음은 **영어 원문 유지**:
  - 코드 식별자 (변수명, 함수명, 클래스명, 파일명)
  - 라이브러리/API/프레임워크 명칭 (예: `useEffect`, `PostgreSQL`, `WebSocket`)
  - 에러 메시지 원문 및 스택 트레이스
  - Task ID (`NX-142`), PR 번호 (`PR #2415`) 등 식별자

---

## 2. 프로젝트 개요

**Nexus**는 팀의 대화·작업·문서를 연결하는 실시간 협업 대시보드입니다.

- **조직**: Aether Labs
- **타겟**: 10~200명 규모의 프로덕트/엔지니어링/디자인 팀
- **핵심 가치**: Context preservation · Single home · Real-time · AI-native
- **현재 단계**: 스캐폴드 단계 (도메인 구현 전)
- **레포 구조**: FE([Nexus-FE](https://github.com/wooju01/Nexus-FE))와 BE([Nexus-BE](https://github.com/wooju01/Nexus-BE))는 **독립 Git 레포**. 패키지 매니저는 양쪽 모두 **npm**.
- FE는 BE 코드를 직접 import 할 수 없으며, 반드시 **HTTP/WebSocket 경계**를 통해 통신합니다.

주요 도메인 엔티티: `User`, `Workspace`, `Project`, `Channel`, `Message`, `Thread`, `Task`, `Comment`, `InboxItem`, `Notification`

---

## 3. 도메인 규칙

- **Task ID**: `NX-<숫자>` 형식. 클라이언트 수동 지정 금지, 서버 시퀀스에서 할당.
- **Priority**: `P1`(red) / `P2`(orange) / `P3`(yellow) 세 단계만.
- **Status**: `Backlog` → `To do` → `In progress` → `In review` → `Done`.
- **Channel 자동 연결**: Project 생성 시 동명의 Channel이 자동 생성·링크 (`auto-linked`).
- **Linked Channel** Task에 코멘트 → 연결된 채널 스레드에 자동 브리지 (순환 방지 필수).
- **Presence**: 30초 미활동 시 offline 처리 (Redis 도입 시 TTL 기반 전환).
- **실시간 이벤트**: Workspace 단위로 namespace 분리.
- **Label 컬러 매핑**은 디자인 토큰에서 단일 진실원(SSOT) 유지.

---

## 4. 공통 코드 컨벤션

### TypeScript
- `any` 지양. 부득이할 경우 `unknown` + 타입 가드, PR 설명에 이유 명시.
- 타입은 `type` 우선, 확장이 필요한 경우에만 `interface`.
- Enum 대신 `as const` 객체 + union 타입 선호 (NestJS 데코레이터 등 예외).
- 타입 전용 import는 `import type { ... }` 사용.

### 네이밍
- 파일: `kebab-case.ts` (NestJS 컨벤션 `*.module.ts`, `*.service.ts`, `*.spec.ts` 유지)
- 컴포넌트 / 클래스 / 타입: `PascalCase`
- 함수 / 변수: `camelCase`
- 상수: `SCREAMING_SNAKE_CASE`
- Boolean: `is`, `has`, `can`, `should` 접두사

### 주석
- "왜(why)" 위주로 작성. "무엇(what)"은 코드와 타입으로 표현.
- TODO에는 작성자/이슈 ID 포함: `// TODO(jiwoo, NX-201): ...`

---

## 5. Git / 브랜치 / 커밋 / PR

### 브랜치
- `main`: 보호 브랜치, 항상 배포 가능 상태
- Feature: `feat/<area>-<short-desc>` (예: `feat/be-auth-module`)
- Fix: `fix/<area>-<short-desc>`
- Chore: `chore/<desc>`

### 커밋 (Conventional Commits)
- 형식: `<type>(<scope>): <subject>`
- type: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `style`
- scope 예시: `fe`, `be`, `chat`, `board`, `auth`, `db`, `ws`, `ai`, `prisma`
- 제목은 한국어 허용, 50자 이내
- 관련 Task ID를 제목 또는 본문에 포함
  ```
  feat(be/auth): JWT 인증 모듈 구현 (NX-150)
  fix(be/chat): 스레드 답글 카운트 동시성 문제 수정 (NX-205)
  ```

### PR
- 제목에 Task ID 포함
- 본문: **변경 요약 / 변경 이유 / 테스트 방법**
- 리뷰어 최소 1명 승인 + CI 초록 후 머지 (Squash merge 기본)
- FE/BE를 동시에 수정해야 한다면, 가능하면 PR을 분리하고 **BE를 먼저 머지**

**Claude는 사용자가 명시적으로 요청하지 않는 한 자동으로 커밋·푸시·PR 생성을 하지 않습니다.**

---

## 6. 보안

- 환경 변수는 `.env`에만. 저장소에 커밋 금지 (`.env.example`에 키 목록만 유지).
- Secret/토큰을 로그·에러 메시지·커밋 메시지에 포함 금지.
- 사용자 입력은 항상 신뢰 경계에서 검증.
- 민감 파일 (`.env*`, `*.pem`, `secrets/*`, `*.key`) 읽기·수정 금지.
- 의존성 추가 전 라이선스 확인 (MIT/Apache-2.0/BSD 외에는 사용자 확인).

---

# Part 2. Backend 전용 규칙

---

## 7. 기술 스택

### 현재 설치
- **Node.js** (LTS) + **TypeScript 5.7**
- **NestJS 11** (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **Prisma 7** (`@prisma/client`, `prisma`)
- **Jest 30** + **supertest 7** + **ts-jest 29**
- **ESLint 9** + **Prettier 3** + **typescript-eslint 8**
- 패키지 매니저: **npm**

### tsconfig 현재 설정
- `strictNullChecks: true` ✓
- `noImplicitAny: false` ⚠️ (신규 코드는 명시적 타입 작성)
- `strictBindCallApply: false` ⚠️
- `noFallthroughCasesInSwitch: false` ⚠️

### 미도입 (도입 시 사용자 확인 필수)
- 캐시/pub-sub/presence: Redis (`ioredis`)
- 큐: BullMQ
- 검색: ElasticSearch / Meilisearch
- WebSocket: `@nestjs/websockets` + `@nestjs/platform-socket.io`
- 입력 검증: `class-validator` + `class-transformer` 또는 Zod
- 인증: NestJS Passport, JWT 모듈
- 관측성: Sentry, OpenTelemetry, PostHog
- 파일 스토리지: S3 SDK, AI/LLM 클라이언트

---

## 8. 폴더 구조

### 현재
```
be/
├── package.json              # name: "nexus-be"
├── tsconfig.json / tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
├── prisma.config.ts
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   └── app.service.ts
└── test/                     # E2E 테스트
```

### 도메인 코드 추가 시 권장 구조
```
be/src/
├── main.ts
├── app.module.ts
├── modules/                  # 도메인 단위
│   ├── auth/     (module, controller, service, guard, dto/, spec)
│   ├── workspace/
│   ├── channel/
│   ├── message/
│   ├── task/
│   └── ...
├── prisma/                   # PrismaService, PrismaModule
├── common/                   # 공용 데코레이터, 가드, 인터셉터, 파이프
└── config/                   # 환경 변수 로더
```

---

## 9. 주요 명령어

```bash
# 개발
npm run start:dev             # nest start --watch
npm run start:debug           # 디버거 + watch

# 빌드
npm run build                 # nest build → dist/

# 검증
npm run lint                  # eslint --fix
npm run format                # prettier --write

# 테스트
npm test                      # 단위 (*.spec.ts)
npm run test:cov              # 커버리지
npm run test:e2e              # E2E

# Prisma
npx prisma generate           # 클라이언트 타입 생성
npx prisma migrate dev        # 개발 마이그레이션
npx prisma migrate deploy     # 프로덕션 (사용자 확인 필수)
```

**Claude는 변경 후 다음을 실행해 검증합니다:**
1. `npm run lint`
2. `npx tsc --noEmit -p tsconfig.build.json`
3. 변경 영역의 `npm test`
4. Prisma 스키마 수정 시 `npx prisma generate`

---

## 10. NestJS 작성 규칙

- 의존성 주입은 **생성자 주입** (`constructor(private readonly svc: FooService) {}`)
- 컨트롤러는 라우팅과 DTO 변환만, **비즈니스 로직은 Service**로
- 모듈 간 의존: `imports`로 명시, 순환 참조 금지 (`forwardRef` 남용 금지)
- 글로벌 파이프/필터/인터셉터는 `main.ts`에서 등록
- 예외는 `HttpException` 또는 도메인 전용 `class extends HttpException`
- 비동기는 `async/await`, Promise 체이닝 지양
- DTO는 `dto/` 디렉토리에 분리, request/response 별도

---

## 11. API 설계 원칙

### REST
- URL: kebab-case, 복수형 리소스 (`/workspaces/:workspaceId/channels`)
- HTTP 동사 의미대로: GET/POST/PATCH/DELETE
- 상태 코드: `200` 성공, `201` 생성, `204` 본문 없음, `400` 스키마 실패, `401` 미인증, `403` 권한 부족, `404` 없음, `409` 충돌, `429` 레이트 리밋
- 페이지네이션: **커서 기반** (`?cursor=...&limit=50`)
- 에러 응답: `{ "error": { "code": "TASK_NOT_FOUND", "message": "...", "details": {} } }`
- 경로 prefix: `/v1/...`

### WebSocket (도입 후)
- 단일 게이트웨이 + Workspace 단위 namespace
- 이벤트 네이밍: `<domain>.<action>` (`message.created`, `task.updated`, `presence.changed`)

---

## 12. Prisma / DB 규칙

- 모든 모델은 `prisma/schema.prisma`에 정의 (단일 파일, 거대해지면 multi-file 분리)
- 모든 모델에 `id`, `createdAt`, `updatedAt`, 필요 시 `deletedAt` (soft delete)
- `id`는 `uuid` 또는 `cuid` (일관 선택)
- **외래 키와 인덱스 명시** (`@@index([...])`)
- **N+1 금지**: `include` / `select`로 필요한 관계를 한 번에 조회
- Raw SQL은 반드시 `Prisma.sql\`...\`` 태그드 템플릿 (자동 파라미터화)
- 마이그레이션은 `prisma migrate dev`로 생성 — 수동 SQL 편집/파일명 변경 금지
- 트랜잭션: `prisma.$transaction([...])` 또는 interactive 트랜잭션
- 시간은 UTC `DateTime`(`@db.Timestamptz`) 저장, ISO 8601 포맷

### PrismaService 패턴
- `prisma/prisma.service.ts`에서 `extends PrismaClient implements OnModuleInit, OnModuleDestroy`
- `PrismaModule`을 글로벌 모듈로 등록

---

## 13. 인증 & 권한 (도입 후)

- 모든 라우트 기본 인증 필요. 공개 엔드포인트는 `@Public()` 데코레이터로 화이트리스트.
- JWT: 짧은 수명(15분), Refresh Token은 Redis에 저장 (rotation + reuse 감지)
- 역할 기반 권한(RBAC): `owner` > `admin` > `member` > `guest`
- 권한 검사는 라우트 가드 + 서비스 레이어 이중화

---

## 14. 실시간 & Presence (도입 후)

- WebSocket gateway는 인증 후 연결 업그레이드 (`CanActivate` 가드)
- Presence: 클라이언트 heartbeat 15초, 서버 TTL 30초. Redis 도입 후 `SET user:<id>:presence <status> EX 30`.
- 브리지(채널 ↔ Task): 순환 방지 플래그로 재진입 차단

---

## 15. 테스트

- **단위**: Jest + ts-jest, 파일 컨벤션 **`*.spec.ts`** (`*.test.ts` 아님 주의)
- 테스트는 대상 파일과 같은 디렉토리에 위치
- **E2E**: `test/` 디렉토리 + supertest
- 모킹은 외부 I/O에만. 비즈니스 로직은 실제 구현 테스트.

---

# Part 3. 작업 원칙

---

## 16. Claude Code 작업 원칙

### 항상 하기
- 변경 전 관련 파일 먼저 읽어 맥락 파악
- 기존 코드 스타일·패턴 따르기
- 작업 후 `npm run lint` + `npx tsc --noEmit -p tsconfig.build.json` + `npm test` 실행
- 의미 있는 변경이면 테스트(`*.spec.ts`)도 함께 추가/수정
- 모호한 요구사항은 추측 대신 질문
- 단계별 계획을 먼저 공유한 뒤 구현
- 새 의존성 추가 전 사용자에게 확인
- Prisma 스키마 수정 시 마이그레이션 영향 보고
- **BE 계약(API 스키마)이 바뀌면 FE에 영향 범위를 먼저 보고**

### 절대 하지 않기
- 요청 범위 밖의 리팩토링
- `any`, `@ts-ignore`, `eslint-disable`을 설명 없이 추가
- 의존성을 독단적으로 추가
- 민감 파일 읽기·수정
- `git push --force`, `git reset --hard` 등 파괴적 명령 자동 실행
- 사용자가 요청하지 않은 커밋·푸시·PR 생성
- 테스트를 삭제·스킵하여 통과시키기
- `npx prisma migrate reset` / `migrate deploy` 사용자 확인 없이 실행

### BE 전용 금기 사항
- ❌ Raw SQL을 파라미터화 없이 문자열 합성
- ❌ 사용자 입력을 검증 없이 DB/파일 시스템/외부 API에 전달
- ❌ 권한 검사를 컨트롤러에서만 하고 서비스 레이어에서 생략
- ❌ Prisma 마이그레이션 파일을 수동 편집/이름 변경
- ❌ Production DB에 대한 ad-hoc 스크립트 실행 (사용자 확인 필수)
- ❌ Secret을 환경 변수 외 경로로 주입
- ❌ PII를 마스킹 없이 LLM/외부 서비스로 전송
- ❌ `fe/` 빌드 산출물을 `be/` 번들에 포함
- ❌ 테스트를 `*.test.ts`로 작성 (Jest config가 `*.spec.ts`만 인식)
- ❌ `pnpm` / `yarn` 사용 — `npm` 통일

### 불확실할 때
- 사용자에게 구체적 선택지를 제시하고 확인을 받습니다.
- "이렇게 진행하려고 합니다: A, B, C. 이 방향 맞을까요?" 형식으로 질문.

---

*이 문서는 프로젝트 상태와 컨벤션 변경에 따라 업데이트합니다. 새 라이브러리 도입 시 "7. 기술 스택" 섹션도 함께 수정하세요.*
