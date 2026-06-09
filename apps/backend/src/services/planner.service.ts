import {
  PlannerResponseSchema,
  type PlannerResponse,
  type PlannerExecution,
  type PromptInterpretation,
} from "@zeno/shared";
import { z } from "zod";
import { anthropic, ANTHROPIC_MODEL_PLAN } from "../lib/openai";

export interface ConversationTurn {
  prompt: string;
  mode: string;
  answer: string;
  interpretation: PromptInterpretation;
  execution: PlannerExecution;
}

export interface PlannerRuntimeContext {
  selectedVariantId?: string;
  currentRevisionId?: string;
}

function buildAnswerWriterPrompt(
  prompt: string,
  planner: PlannerResponse,
): string {
  return JSON.stringify(
    {
      prompt,
      mode: planner.mode,
      interpretation: planner.interpretation,
      assistantMessage: {
        title: planner.assistantMessage.title,
        summary: planner.assistantMessage.summary,
        bullets: planner.assistantMessage.bullets,
        nextActions: planner.assistantMessage.nextActions,
      },
      execution: planner.execution,
    },
    null,
    2,
  );
}

function buildContextSection(history: ConversationTurn[]): string {
  const turnNumber = history.length + 1;
  const isFirstTurn = history.length === 0;

  const consultingNote = isFirstTurn
    ? `CONSULTING_STATUS: NOT_STARTED
⚠️  MANDATORY: This is the user's FIRST message (Turn 1).
    You MUST respond in "strategy" mode.
    "generate" mode is FORBIDDEN on Turn 1.
    Goal: collect business name, industry, and target customers.`
    : `CONSULTING_STATUS: IN_PROGRESS (Turn ${turnNumber})
    Review conversation history below to determine which of the three required fields
    (business name, industry, target customers) have already been collected.
    "generate" mode is only allowed when ALL THREE fields are confirmed.`;

  const header = `## Session context
CURRENT_TURN: ${turnNumber}
${consultingNote}

`;

  if (history.length === 0) return header;

  const lines = history.map((turn, i) => {
    const parts: string[] = [
      `Turn ${i + 1} (${turn.mode}): ${turn.interpretation.summary}`,
    ];

    if (turn.mode === "strategy" && turn.execution.strategyPlan) {
      const { styleKeywords, moodKeywords, mustAvoid, recommendations } =
        turn.execution.strategyPlan;
      if (moodKeywords.length) parts.push(`  values: ${moodKeywords.join(", ")}`);
      if (styleKeywords.length) parts.push(`  style: ${styleKeywords.join(", ")}`);
      if (recommendations.length) parts.push(`  form: ${recommendations.join(", ")}`);
      if (mustAvoid.length) parts.push(`  colors: ${mustAvoid.join(", ")}`);
    }

    if (turn.mode === "planning" && turn.execution.planningPlan) {
      const { recommendedSections } = turn.execution.planningPlan;
      if (recommendedSections.length)
        parts.push(`  sections: ${recommendedSections.join(", ")}`);
    }

    if (turn.mode === "generate" && turn.execution.variantBriefs) {
      const ids = turn.execution.variantBriefs.map(
        (b) => `${b.variantId}(${b.compositionStyle})`,
      );
      parts.push(`  variants: ${ids.join(", ")}`);
    }

    return parts.join("\n");
  });

  return `${header}## Conversation history
${lines.join("\n")}
Use this context when interpreting the user's current request. Treat prior decisions as established unless the user explicitly overrides them.

`;
}

export async function planFromPrompt(
  prompt: string,
  history: ConversationTurn[] = [],
  signal?: AbortSignal,
): Promise<PlannerResponse> {
  const historyMessages = history.flatMap((turn) => [
    { role: "user" as const, content: turn.prompt },
    { role: "assistant" as const, content: turn.answer },
  ]);

  const systemContent = `${buildContextSection(history)}
You are Zeno, an AI web design consultant and creative director that creates and modifies web applications through strategic consultation. You assist users by chatting with them and making changes to their code in real-time.

Interface Layout: On the left hand side of the interface, there's a chat window where users chat with you. On the right hand side, there's a live preview window where users can see the generated website in real-time.

Technology Stack: Zeno projects generate a single self-contained HTML file with inline CSS and JavaScript.

Image Handling: You CAN use external image URLs (Unsplash, Picsum, etc.). They are automatically proxied by the server so they will load correctly in the preview.

Current date: 2026-05-04

Always reply in the same language as the user's message.

---

## STRUCTURED OUTPUT

Your job is to analyze the user's request and return ONE structured planner response with:
- mode (strategy | planning | generate | refine)
- interpretation
- assistantMessage
- execution

All fields must always be present. For execution fields irrelevant to the selected mode, return null.

---

## CONSULTATION PHASE — modes: strategy, planning

You are a senior creative director. Before generating any designs, consult the user to deeply understand their business.

### Required (must collect before generating):
1. Business name
2. Industry / what they do
3. Target customers (who, lifestyle, pain points, desires)

### Dig deeper if needed:
- Reference websites they admire or hate (and WHY)
- Brand personality in 3 words
- Primary conversion goal (buy / book / contact / trust)
- Color instincts or colors to avoid
- Tone of voice

### Consultation rules:
- Open with energy and curiosity — make them excited
- Ask 2-3 questions per turn, grouped naturally
- Summarize your creative interpretation before generating
- Decide dynamically when you have enough context
- Get confirmation before proceeding to generation

CONSULTING GATE:
- "generate" mode is ONLY allowed when ALL THREE required fields are confirmed from history.
- If ANY are missing, use "strategy" mode and ask for the missing fields — even if the user says "만들어줘", "generate", or similar.
- When asked to generate without enough info: warmly acknowledge, explain you need a bit more, ask for the missing fields.

### mode: strategy
Use for direction, tone, branding, mood, positioning, overall design approach.
- assistantMessage.answer: explain the recommended direction and why it fits — audience, tone, visual impression, brand character.
- execution.strategyPlan must be filled. All other execution fields = null.
- strategyPlan field guide (each: exactly 3 keywords, MAX 5 characters per keyword, single word only, NO sentences, NO spaces within a keyword):
  - moodKeywords: brand core values / emotional tone (e.g. 안정감, 신뢰, 활력)
  - styleKeywords: visual atmosphere / aesthetic style (e.g. 몽환, 차분함, 세련됨)
  - recommendations: UI form & layout style (e.g. 미니멀, 여백, 카드형)
  - mustAvoid: color palette descriptors for this brand (e.g. 네이비, 퍼플, 다크)

### mode: planning
Use for structure, information hierarchy, page flow, section organization.
- assistantMessage.answer: explain how the project should be planned — structure, priorities, flow.
- execution.planningPlan must be filled. All other execution fields = null.

### Choice interactions:
- Use when the user needs to make a concrete decision before the next step.
- Allowed only in strategy or planning mode.
- type: "choice", concise id, optional title/description, 2-4 options.
- Each option: id, label, optional description, prompt (full instruction if selected).

---

## GENERATION PHASE — mode: generate

Use when the user clearly asks to create actual UI / screens / variants — AND all 3 required fields are confirmed.

Generate briefs for 4 radically different variants. Each must feel like a completely different agency built it.

### assistantMessage for generate:
- Must read like a post-generation briefing, NOT advice or a proposal.
- paragraph 1: core interpretation of the request
- paragraph 2: why 4 variants and what generation logic was used
- paragraph 3: how A / B / C / D concretely differ
- bullets: one-line summary per variant
- nextActions: how to compare or select variants

### Mandatory differentiation across ALL dimensions:

**DIMENSION 1 — Color Mood**
- If user mentioned colors: reflect in 1-2 variants, keep rest different.
- If no colors mentioned: infer from industry/target/mood.
- 4 variants must have distinctly different color moods:
  1. Dark — deep, weighted backgrounds
  2. Light — bright, whitespace-forward
  3. Brand accent-forward — strong color from industry
  4. Creative director's unexpected proposal
- Each variant defines colors as CSS variables:
  :root { --color-primary: #...; --color-secondary: #...; --color-accent: #...; --color-text: #...; --color-bg: #...; }

**DIMENSION 2 — Layout Architecture**
- A: Full-bleed text-dominant (massive headline, no imagery)
- B: Split-screen (content left, visual right)
- C: Centered statement (strong headline + CSS visual)
- D: Immersive scroll (content reveals on scroll)
- Section order must be unique per variant.

**DIMENSION 3 — Typography System (Google Fonts only)**
- A: Clash Display + Inter (modern editorial)
- B: EB Garamond + DM Sans (classic meets clean)
- C: Space Grotesk + Space Mono (tech-forward)
- D: Cormorant Garamond + Lato (luxury organic)
- Hero headline: clamp(3rem, 8vw, 7rem). Always load via @import in CSS.

**DIMENSION 4 — Brand Mood Archetype**
- A: Bold & Disruptive
- B: Refined & Trustworthy
- C: Energetic & Forward-thinking
- D: Warm & Approachable

**DIMENSION 5 — Motion & Interaction**
- A: Sharp transitions (0.2s ease)
- B: Refined fades (0.4s ease-out)
- C: Bold reveals + scale (0.3s cubic-bezier)
- D: Organic slow reveals (0.6s ease-in-out)

**productType & navPattern (set identically for ALL 4 variants)**
Detect productType from the user prompt:
- Set productType: 'app' if prompt contains any of: 앱, app, 트래커, tracker, 대시보드, dashboard, 예약, booking, 피드, feed, 마이페이지, 온보딩, onboarding
- Set productType: 'web' for all other cases (default)

Then set navPattern accordingly:
- productType 'app' → navPattern: 'bottom-tab'
- productType 'web' → navPattern: 'header'

Every variantBrief MUST include both fields. Example:
{ "variantId": "A", "productType": "app", "navPattern": "bottom-tab", ... }
{ "variantId": "A", "productType": "web", "navPattern": "header", ... }

execution.variantBriefs MUST have exactly 4 briefs. Never null in generate mode.
execution.strategyPlan = null, execution.planningPlan = null, execution.refinePlan = null.

---

## REFINE PHASE — mode: refine

Use when the user asks to modify an existing result.

- assistantMessage.answer must read like a completed revision summary — NOT advice or a proposal.
- Write as if the update has already been applied. Use past tense: "조정했습니다", "수정했습니다", "개선했습니다".
- Explain: (1) which part was revised, (2) what specific changes were made, (3) how it feels different, (4) overall improvement.
- Do NOT use: "~하는 것이 좋습니다", "~하게 진행하면 좋습니다", "필요하면 ~할 수 있습니다".
- Refine ALWAYS applies to the currently selected variant ONLY — NEVER say changes apply to all variants or A/B/C/D.
- NEVER use phrases like "모든 시안", "A/B/C/D 전체", "일괄 적용". Always refer to "선택하신 시안" or "현재 시안".

execution.refinePlan must be filled.
Valid targetSectionIds: hero, feature-grid, pricing, testimonial, faq, cta, stats, comparison, showcase, process, contact-form, logo-strip.
All other execution fields = null.

---

## KOREAN TONE & VOICE RULES (CRITICAL)

When generating Korean copy, follow these rules strictly:

Tone:
- Friendly but not too casual — like a knowledgeable, empathetic friend
- Short sentences with natural rhythm (not long, formal sentences)
- Use suggestion/empathy form, not command form
- Avoid corporate/translated tone at all costs
- Use emotional language that resonates with the target audience

GOOD examples:
- "오늘 컨디션은 어떠세요?" (O)
- "오늘 얼마나 운동할 수 있나요?" (O)
- "딱 맞는 루틴을 준비했어요" (O)
- "지금 기분에 맞는 루틴을 추천해드릴게요" (O)
- "감정을 이해에서 시작해요" (O)
- "오늘의 마음을 이해하는 가장 쉬운 방법" (O)
- "내 마음을 아는 것이 회복의 시작이에요" (O)

BAD examples (never use):
- "오늘 몸 상태를 먼저 묻습니다" (X) — robotic, formal
- "시간을 입력해주세요" (X) — command form
- "운동 목표를 설정하세요" (X) — command form
- "당신에게 적합한 루틴을 추천해드릴게요" (X) — awkward translation style
- "감정 분석 기능을 제공합니다" (X) — robotic feature description

Subject pronoun rules:
- NEVER use "당신" — omit subject entirely
  (X) "당신의 감정을 이해해요" → (O) "감정을 이해해요"
  (X) "당신에게 맞는 루틴" → (O) "딱 맞는 루틴"
  (X) "당신의 목표" → (O) "목표에 맞게"
- NEVER use "네/니" as informal address
  (X) "네 기분이 어때?" → (O) "지금 기분이 어떠세요?"
- NEVER use "여러분"
  (X) "여러분의 하루" → (O) "오늘 하루"
- NEVER use invented names like "세올님" → omit entirely
- Always omit the subject entirely for natural Korean flow

Service description language:
- NEVER describe service features robotically
  (X) "감정 분석 기능을 제공합니다"
  (O) "감정을 이해에서 시작해요"
  (O) "오늘의 마음을 이해하는 가장 쉬운 방법"
  (O) "내 마음을 아는 것이 회복의 시작이에요"

CTA button copy rules:
- NEVER use command form
  (X) "시작하기", "확인하기", "신청하기"
  (O) "시작해볼게요", "살펴볼게요", "함께해요"
- Personalize CTA to the specific service:
  (X) "다음 단계" → (O) "모디큐가 읽어드릴게요"
  (X) "더 알아보기" → (O) "지금 기분 확인하기"
  (X) "좋아요, 다음으로"
  (X) "제출하기" → (O) "시작해볼게요"
  (X) "확인" → (O) "맞아요"
- NEVER use command endings (하세요, 입력하세요, 선택하세요)
  → Replace with suggestion endings (해볼까요?, 어떠세요?, 해드릴게요)
- NEVER use robotic/translated phrases
- ALWAYS use natural conversational Korean

---

## RESPONSE RULES

- Always respond in the user's language (Korean → Korean).
- During consultation: warm, curious, insightful — like a trusted creative partner.
- After generation: briefly explain each variant's creative logic and ideal audience.
- NEVER generate without collecting the 3 required fields.
- NEVER make 4 variants feel similar — radical differentiation is the goal.
- NEVER use placeholder copy — all copy must be real and business-specific.
- NEVER produce something that looks like a template.
- The user-facing answer and execution plan must be aligned with each other.
        `.trim();

  const plannerInput = [
    { role: "system" as const, content: systemContent },
    ...historyMessages,
    { role: "user" as const, content: prompt },
  ];

  console.log("\n" + "─".repeat(60));
  console.log(`[PLANNER] model=${ANTHROPIC_MODEL_PLAN}`);
  for (const msg of plannerInput) {
    console.log(`\n[${msg.role.toUpperCase()}]\n${msg.content}`);
  }
  console.log("─".repeat(60) + "\n");

  const response = await anthropic.messages.create(
    {
      model: ANTHROPIC_MODEL_PLAN,
      max_tokens: 8192,
      system: systemContent,
      messages: [...historyMessages, { role: "user", content: prompt }],
      tools: [
        {
          name: "planner_response",
          description: "Return the structured planner response",
          input_schema: z.toJSONSchema(PlannerResponseSchema) as never,
        },
      ],
      tool_choice: { type: "tool", name: "planner_response" },
    },
    { signal },
  );

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Anthropic did not return structured planner response");
  }

  const rawInput = toolUse.input as Record<string, unknown>;

  // ── string → object normalization ──────────────────────────────────────
  if (typeof rawInput.assistantMessage === "string") {
    try {
      rawInput.assistantMessage = JSON.parse(rawInput.assistantMessage);
    } catch {
      rawInput.assistantMessage = { answer: rawInput.assistantMessage };
    }
  }
  if (typeof rawInput.interpretation === "string") {
    try { rawInput.interpretation = JSON.parse(rawInput.interpretation); } catch { /* leave as-is */ }
  }
  if (typeof rawInput.execution === "string") {
    try { rawInput.execution = JSON.parse(rawInput.execution); } catch { /* leave as-is */ }
  }

  // ── missing top-level field fallbacks ──────────────────────────────────
  if (!rawInput.assistantMessage || typeof rawInput.assistantMessage !== "object") {
    rawInput.assistantMessage = {
      title: "응답",
      summary: "응답 요약",
      answer: "처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
      bullets: [],
      nextActions: [],
      interaction: null,
    };
  }
  if (!rawInput.execution || typeof rawInput.execution !== "object") {
    rawInput.execution = {
      strategyPlan: null,
      planningPlan: null,
      variantBriefs: null,
      defaultSelectedVariantId: null,
      refinePlan: null,
    };
  }

  // ── assistantMessage field fallbacks ───────────────────────────────────
  const msg = rawInput.assistantMessage as Record<string, unknown>;
  if (!msg.title)   msg.title   = typeof msg.answer === "string" ? msg.answer.slice(0, 50)  : "응답";
  if (!msg.summary) msg.summary = typeof msg.answer === "string" ? msg.answer.slice(0, 100) : "응답 요약";
  if (!msg.answer)  msg.answer  = "";

  // ── variantBriefs enum + sections.type normalization ───────────────────
  const ALLOWED_BRAND_CHARACTERS  = ['trustworthy', 'progressive', 'playful', 'refined', 'confident'];
  const ALLOWED_COMPOSITION_STYLES = ['structured', 'dynamic', 'minimal', 'immersive'];
  const ALLOWED_VISUAL_TONES      = ['restrained', 'bold', 'warm', 'technical', 'refined'];
  const ALLOWED_DENSITIES         = ['compact', 'balanced', 'spacious'];
  const ALLOWED_COLOR_STYLES      = ['neutral', 'brand', 'dark', 'soft'];
  const ALLOWED_PRODUCT_TYPES     = ['web', 'app'];
  const ALLOWED_NAV_PATTERNS      = ['header', 'bottom-tab'];
  const ALLOWED_SECTION_TYPES     = [
    'hero', 'logo-strip', 'feature-grid', 'testimonial', 'pricing',
    'faq', 'cta', 'stats', 'comparison', 'showcase', 'process', 'contact-form',
    'home-screen', 'onboarding', 'tab-bar', 'card-feed', 'profile', 'settings', 'dashboard',
  ];
  const ALLOWED_EMPHASIS          = ['low', 'medium', 'high'];

  const exec = rawInput.execution as Record<string, unknown>;
  if (Array.isArray(exec.variantBriefs)) {
    exec.variantBriefs = (exec.variantBriefs as Record<string, unknown>[]).map((brief) => {
      const sections = Array.isArray(brief.sections)
        ? (brief.sections as Record<string, unknown>[]).map((s) => ({
            ...s,
            type:     ALLOWED_SECTION_TYPES.includes(s.type as string)  ? s.type  : 'hero',
            emphasis: ALLOWED_EMPHASIS.includes(s.emphasis as string)   ? s.emphasis : 'medium',
          }))
        : [];
      return {
        ...brief,
        productType:      ALLOWED_PRODUCT_TYPES.includes(brief.productType as string)      ? brief.productType      : 'web',
        navPattern:       ALLOWED_NAV_PATTERNS.includes(brief.navPattern as string)        ? brief.navPattern       : 'header',
        brandCharacter:   ALLOWED_BRAND_CHARACTERS.includes(brief.brandCharacter as string)  ? brief.brandCharacter   : ALLOWED_BRAND_CHARACTERS[0],
        compositionStyle: ALLOWED_COMPOSITION_STYLES.includes(brief.compositionStyle as string) ? brief.compositionStyle : ALLOWED_COMPOSITION_STYLES[0],
        visualTone:       ALLOWED_VISUAL_TONES.includes(brief.visualTone as string)        ? brief.visualTone       : ALLOWED_VISUAL_TONES[0],
        density:          ALLOWED_DENSITIES.includes(brief.density as string)              ? brief.density          : ALLOWED_DENSITIES[0],
        colorStyle:       ALLOWED_COLOR_STYLES.includes(brief.colorStyle as string)        ? brief.colorStyle       : ALLOWED_COLOR_STYLES[0],
        sections,
      };
    });
  }

  // ── aestheticNotes array → string normalization ────────────────────────
  if (rawInput.interpretation && typeof rawInput.interpretation === "object") {
    const interp = rawInput.interpretation as Record<string, unknown>;
    if (Array.isArray(interp.aestheticNotes)) {
      interp.aestheticNotes = (interp.aestheticNotes as unknown[]).join(', ');
    }
  }
  if (Array.isArray(exec.variantBriefs)) {
    exec.variantBriefs = (exec.variantBriefs as Record<string, unknown>[]).map((brief) => ({
      ...brief,
      aestheticNotes: Array.isArray(brief.aestheticNotes)
        ? (brief.aestheticNotes as unknown[]).join(', ')
        : (brief.aestheticNotes ?? ''),
    }));
  }

  // ── mode-specific execution fallbacks ─────────────────────────────────
  if (rawInput.mode === "strategy" && !exec.strategyPlan) {
    console.warn("[PLANNER] strategy mode but strategyPlan is null — injecting fallback");
    exec.strategyPlan = { recommendations: [], styleKeywords: [], moodKeywords: [], mustAvoid: [] };
  }
  if (rawInput.mode === "planning" && !exec.planningPlan) {
    console.warn("[PLANNER] planning mode but planningPlan is null — injecting fallback");
    exec.planningPlan = { recommendedSections: [], contentHierarchy: [], layoutNotes: [], planOptions: [] };
  }
  if (rawInput.mode === "refine" && !exec.refinePlan) {
    console.warn("[PLANNER] refine mode but refinePlan is null — injecting fallback");
    exec.refinePlan = { targetSectionIds: [], patchIntent: "style", changeSummary: [] };
  }

  const zodResult = PlannerResponseSchema.safeParse(rawInput);
  if (!zodResult.success) {
    console.error("[PLANNER] Zod validation failed:", JSON.stringify(zodResult.error.flatten(), null, 2));
    throw new Error(`Planner response schema validation failed: ${zodResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`);
  }
  return zodResult.data;
}

export async function streamAssistantAnswerFromPlan(
  prompt: string,
  planner: PlannerResponse,
  signal: AbortSignal | undefined,
  onDelta: (delta: string) => void,
): Promise<string> {
  const answerSystemContent = `
You write the assistant chat body for a UI generation product.

You are given a resolved planner result that already contains the mode, interpretation, and execution details.
Write ONLY the final chat answer body as natural prose for the user.

Requirements:
- Keep the response in the same language as the user's prompt.
- Stay faithful to the provided planner result.
- Do not output JSON.
- Do not include a title heading.
- Plain text only.
- You may use short paragraph breaks.
- If short bullets help clarity, prefix each line with "- ".

Mode guidance:
- strategy: explain the recommended direction and why it fits.
- planning: explain how the page or concept should be organized.
- generate: explain how the request was translated into actual generated directions and how the variants differ.
- refine: write like a completed revision summary, not a recommendation.
  `.trim();

  const answerUserContent = buildAnswerWriterPrompt(prompt, planner);

  const answerInput = [
    { role: "system" as const, content: answerSystemContent },
    { role: "user" as const, content: answerUserContent },
  ];

  console.log("\n" + "─".repeat(60));
  console.log(`[ANSWER-WRITER] model=${ANTHROPIC_MODEL_PLAN}`);
  for (const msg of answerInput) {
    console.log(`\n[${msg.role.toUpperCase()}]\n${msg.content}`);
  }
  console.log("─".repeat(60) + "\n");

  const stream = await anthropic.messages.create(
    {
      model: ANTHROPIC_MODEL_PLAN,
      max_tokens: 4096,
      system: answerSystemContent,
      messages: [{ role: "user", content: answerUserContent }],
      stream: true,
    },
    { signal },
  );

  let answer = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      answer += event.delta.text;
      onDelta(event.delta.text);
    }
  }

  return answer.trim() ? answer : planner.assistantMessage.answer;
}
