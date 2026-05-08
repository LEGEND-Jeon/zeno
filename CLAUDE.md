# CLAUDE.md

## Project Overview

Zeno는 **프롬프트 기반 UI 시안 생성 서비스**다.  
단순히 텍스트를 받아 정해진 컴포넌트를 조합하는 툴이 아니라, **LLM을 통해 실제 프론트엔드 코드 프로젝트를 생성하고**, 그 결과를 Code 탭과 Preview 탭에서 같은 원본 기준으로 다루는 생성형 UI 워크스페이스를 목표로 한다.

핵심 경험은 다음과 같다.

1. 사용자가 자연어로 원하는 디자인/브랜드/웹사이트 방향을 입력한다.
2. 시스템은 사용자의 요청을 해석한다.
3. 필요 시 4개의 서로 다른 시안 방향을 만든다.
4. 각 시안은 실제 코드 프로젝트 형태로 생성된다.
5. 사용자는 결과를 미리보기/코드/비교 방식으로 확인한다.
6. 이후 채팅 기반으로 refine(수정)를 이어간다.
7. 최종적으로는 저장, 복원, 재수정, export까지 가능하게 한다.

---

## Product Vision

Zeno는 다음 두 가지를 동시에 만족해야 한다.

### 1. User-facing assistant

사용자는 채팅창에서 **진짜 답변**을 받아야 한다.  
예를 들어:

- strategy: 방향성 제안
- planning: 구조와 기획 제안
- generate: 4가지 시안을 어떤 논리로 생성했는지 설명
- refine: 어떤 부분을 어떻게 수정했고 결과가 어떻게 달라졌는지 설명

즉 단순 metadata가 아니라 **실제 사용자 질문에 대한 자연스러운 답변**이 있어야 한다.

### 2. Machine-facing execution

동시에 시스템은 후속 처리용 구조화 데이터가 필요하다.

예:

- interpretation
- strategyPlan
- planningPlan
- variantBriefs
- refinePlan
- generatedFiles
- final project snapshot

즉 **사용자에게 보여줄 답변**과 **다음 단계 실행용 데이터**가 함께 필요하다.

---

## Current Product Direction

현재 합의된 방향은 이렇다.

- **strategy / planning**  
  planner 단계의 응답이 사실상 최종 응답이 되어도 된다.
- **generate / refine**  
  `/generations` 요청이 들어왔을 때 planner와 code generation이 모두 끝난 뒤 최종 응답을 보내므로, 최종 응답의 `assistantMessage.answer`는 **결과 브리핑**처럼 나오는 것이 맞다.

즉 generate / refine는 "이렇게 할 예정입니다"보다

- generate: “이런 기준으로 4가지 시안을 생성했습니다”
- refine: “이런 부분을 이렇게 수정했고 결과가 이렇게 개선되었습니다”
  처럼 나오는 것이 맞다.

---

## Core UX Principles

### 1. Mode-based interaction

사용자 요청은 네 가지 mode 중 하나로 해석된다.

- `strategy`
- `planning`
- `generate`
- `refine`

### 2. Mode semantics

#### strategy

브랜드 방향, 무드, 톤앤매너, 포지셔닝, 인상, 철학에 대한 답변  
예:

- 어떤 무드가 맞는지
- 어떤 인상을 만들어야 하는지
- 무엇을 피해야 하는지

#### planning

기획/구조/정보 위계/페이지 흐름에 대한 답변  
예:

- 어떤 섹션으로 구성할지
- 어떤 순서로 보여줄지
- 어떤 흐름이 적절한지

#### generate

실제 시안 생성 요청  
예:

- “랜딩페이지 시안 4개 만들어줘”
- “이런 브랜드 웹을 만들어줘”

이 경우:

- planner가 interpretation + variantBriefs 4개 생성
- code generation이 각 brief를 바탕으로 generatedFiles 생성
- template와 merge해서 최종 project snapshot 생성

#### refine

기존 결과 수정 요청
예:

- “컬러를 더 밝게 바꿔줘”
- “타이틀을 더 감각적으로 수정해줘”
- “CTA 버튼 더 크게 해줘”

이 경우:

- 현재는 refinePlan까지 설계 중
- 실제 patch/code generation 연결은 다음 단계에서 붙일 예정

---

## Monorepo Structure

```
zeno/                          # Turborepo root (pnpm)
├── apps/
│   ├── backend/               # Express.js 5 + TypeScript  →  :4000
│   └── frontend/              # Next.js 16.2 + React 19    →  :3000
├── packages/
│   └── shared/                # Zod 스키마 + 공유 TypeScript 타입
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | Express 5, OpenAI SDK (Structured Outputs), Zod, Prisma (설치만, 미사용) |
| Frontend | Next.js App Router, React 19, Zustand, TanStack Query, Tailwind CSS 4 |
| Preview | WebContainer API (in-browser project runner), Monaco Editor |
| Shared | Zod 스키마 기반 API 타입 계약 (`packages/shared`) |
| Package manager | pnpm 10 + Turborepo |

---

## Implementation Status

### ✅ 완료

- `POST /generations` — 4-mode 처리 (strategy / planning / generate / refine)
- `plan-generation.service` — OpenAI Structured Output → PlannerResponse (mode, interpretation, assistantMessage, variantBriefs)
- `code-generation.service` — VariantBrief → React TSX 파일 생성
- `project-generator.service` — 생성 파일 + `react-vite-shadcn` 템플릿 병합 → GeneratedProject
- `template-loader.service` — 템플릿 파일 로드
- Home hero UI (`home-hero.tsx`)
- `WebContainerPreview` — 브라우저 안에서 생성된 프로젝트를 직접 실행 (npm install → dev server → iframe)
- `CodeWorkspace` — Monaco Editor + FileExplorer (read-only 코드 뷰어)
- `ProjectTabs` — Preview / Code 탭 전환
- `GenerationPlayground` — API 연결 + variant 선택 UI (**현재 main page에 미연결**)

### 🟡 미완성

- refine 실제 patch generation 미구현 (intent 감지 후 refinePlan 반환까지만)
- Prisma DB 연결 없음 (스키마 파일 없음, generation 결과 비영속)
- `GenerationPlayground` → 메인 페이지 미연결 (`home-hero.tsx`의 textarea가 동작 안 함)
- 히스토리 / 저장 / 버전관리
- 인증 / 사용자 계정

---

## API Contract

**Base URL:** `http://localhost:4000`

```
GET  /health          → { ok: true, service: “backend” }
POST /generations     → mode에 따라 다른 response shape
```

**Request:**
```ts
{ prompt: string, projectId?: string }
```

**Response by mode:**

- `strategy`  → `{ ok, mode, prompt, interpretation, assistantMessage, strategy }`
- `planning`  → `{ ok, mode, prompt, interpretation, assistantMessage, planning }`
- `generate`  → `{ ok, mode, generationId, prompt, interpretation, assistantMessage, variants[4], defaultSelectedVariantId }`
- `refine`    → `{ ok, mode, prompt, interpretation, assistantMessage, refine }`

타입 정의: `packages/shared/src/`

---

## Key Files

```
apps/backend/src/
  routes/generations.ts                  # 메인 라우터
  services/plan-generation.service.ts    # OpenAI 플래너 (intent + variantBriefs)
  services/code-generation.service.ts    # brief → React TSX 생성
  services/project-generator.service.ts  # 생성 파일 + 템플릿 병합
  services/template-loader.service.ts    # 템플릿 파일 로드
  template/react-vite-shadcn/            # 기본 프로젝트 템플릿
  lib/openai.ts                          # OpenAI 클라이언트 + 모델 설정

apps/frontend/src/
  app/page.tsx                                     # 홈 페이지
  components/home/home-hero.tsx                    # 홈 히어로 UI
  components/generation/generation-playground.tsx  # 생성 UI (미연결)
  components/preview/webcontainer-preview.tsx      # WebContainer 실행
  components/code/code-workspace.tsx               # 코드 뷰어
  components/project/project-tabs.tsx              # Preview/Code 탭

packages/shared/src/
  intent.ts               # RequestIntent 타입
  planner-response.ts     # PlannerResponse, AssistantMessage
  variant-brief.ts        # VariantBrief, SectionType
  generated-project.ts    # GeneratedProject
  generation.ts           # PromptRequest, GenerationResponse
```

---

## Environment Variables

**`apps/backend/.env`**
```
OPENAI_API_KEY=
OPENAI_MODEL_PLAN=gpt-4o-mini
OPENAI_MODEL_CODE=gpt-4o-mini
USE_OPENAI_PLAN=true
USE_OPENAI_CODE=true
```

**`apps/frontend/.env.local`**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

---

## Running the Project

```bash
pnpm install   # root에서 의존성 설치
pnpm dev       # backend(:4000) + frontend(:3000) 동시 실행
```
