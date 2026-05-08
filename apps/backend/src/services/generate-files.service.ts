import type {
  GeneratedFile,
  PromptInterpretation,
  VariantBrief,
} from "@zeno/shared";
import { GeneratedFilesSchema } from "@zeno/shared";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import { anthropic, ANTHROPIC_MODEL_CODE, USE_ANTHROPIC_CODE } from "../lib/openai";

function buildExpectedGeneratedPaths(brief: VariantBrief): string[] {
  const paths = new Set<string>([
    "/src/App.tsx",
    "/src/generated/pages/LandingPage.tsx",
  ]);

  for (const section of brief.sections) {
    switch (section.type) {
      case "hero":
        paths.add("/src/generated/sections/HeroSection.tsx");
        break;
      case "feature-grid":
        paths.add("/src/generated/sections/FeatureGridSection.tsx");
        break;
      case "pricing":
        paths.add("/src/generated/sections/PricingSection.tsx");
        break;
      case "testimonial":
        paths.add("/src/generated/sections/TestimonialSection.tsx");
        break;
      case "faq":
        paths.add("/src/generated/sections/FaqSection.tsx");
        break;
      case "cta":
        paths.add("/src/generated/sections/CtaSection.tsx");
        break;
      case "stats":
        paths.add("/src/generated/sections/StatsSection.tsx");
        break;
      case "comparison":
        paths.add("/src/generated/sections/ComparisonSection.tsx");
        break;
      case "showcase":
        paths.add("/src/generated/sections/ShowcaseSection.tsx");
        break;
      case "process":
        paths.add("/src/generated/sections/ProcessSection.tsx");
        break;
      case "contact-form":
        paths.add("/src/generated/sections/ContactFormSection.tsx");
        break;
      case "logo-strip":
        paths.add("/src/generated/sections/LogoStripSection.tsx");
        break;
    }
  }

  return Array.from(paths);
}

function validateGeneratedFiles(
  files: GeneratedFile[],
  expectedPaths: string[],
) {
  const paths = new Set(files.map((file) => file.path));

  if (!paths.has("/src/App.tsx")) {
    throw new Error("Generated files must include /src/App.tsx");
  }

  if (!paths.has("/src/generated/pages/LandingPage.tsx")) {
    throw new Error(
      "Generated files must include /src/generated/pages/LandingPage.tsx",
    );
  }

  for (const expectedPath of expectedPaths) {
    if (!paths.has(expectedPath)) {
      throw new Error(`Missing expected generated file: ${expectedPath}`);
    }
  }

  for (const file of files) {
    const allowed =
      file.path === "/src/App.tsx" ||
      file.path.startsWith("/src/generated/pages/") ||
      file.path.startsWith("/src/generated/sections/");

    if (!allowed) {
      throw new Error(`Unexpected generated file path: ${file.path}`);
    }
  }
}

function fallbackGeneratedFiles(
  prompt: string,
  brief: VariantBrief,
  interpretation: PromptInterpretation,
): GeneratedFile[] {
  const landingPage = `
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-muted-foreground">${brief.summary}</p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight">${prompt}</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          ${interpretation.summary}
        </p>
        <div className="mt-8">
          <Button>Get Started</Button>
        </div>
      </section>
    </main>
  );
}
`.trim();

  const appFile = `
import LandingPage from "./generated/pages/LandingPage";

export default function App() {
  return <LandingPage />;
}
`.trim();

  return [
    {
      path: "/src/generated/pages/LandingPage.tsx",
      content: landingPage,
    },
    {
      path: "/src/App.tsx",
      content: appFile,
    },
  ];
}
// TODO: Set to false when ready for production (generates all 4)
const TEST_MODE = true;

export async function generateFilesFromBrief(
  prompt: string,
  brief: VariantBrief,
  interpretation: PromptInterpretation,
  signal?: AbortSignal,
): Promise<GeneratedFile[]> {
  if (TEST_MODE && brief.variantId !== "A") {
    return [
      {
        path: "/src/App.tsx",
        content: `export default function App() {
  return (
    <div style={{padding:'2rem',fontFamily:'sans-serif',textAlign:'center'}}>
      <h2>Variant ${brief.variantId} — 테스트 모드</h2>
      <p>TEST_MODE=false로 변경하면 실제 생성됩니다.</p>
    </div>
  )
}`,
      },
    ];
  }

  const expectedPaths = buildExpectedGeneratedPaths(brief);

  if (!USE_ANTHROPIC_CODE) {
    const fallback = fallbackGeneratedFiles(prompt, brief, interpretation);

    validateGeneratedFiles(fallback, [
      "/src/App.tsx",
      "/src/generated/pages/LandingPage.tsx",
    ]);

    return fallback;
  }

  console.log(`[CODEGEN] variant=${brief.variantId} productType=${brief.productType} navPattern=${brief.navPattern}`);
  const productTypeRules = brief.productType === "app"
    ? `APP LAYOUT RULES (CRITICAL — this is a mobile app, not a website):
- Outer wrapper: max-width: 390px, margin: 0 auto, min-height: 100vh, overflow: hidden
- Status bar area at top: height 44px, background matches app theme
- Scrollable content area between status bar and bottom tab bar
- Fixed bottom tab bar: position fixed, bottom 0, width 100%, 4-5 tabs with icons and labels
- Safe area: padding-bottom: env(safe-area-inset-bottom, 16px) on the tab bar
- NO header navigation bar
- NO full-screen hero sections
- Card-based UI throughout: rounded-2xl, shadow-sm
- All interactive elements: minimum height 44px (touch targets)
- Top of content: greeting card (e.g. 안녕하세요, 사용자님), quick action buttons, activity feed`
    : `WEB LAYOUT RULES:
- Full width (100%), desktop-first layout
- Fixed header with logo on the left and nav links on the right
- Mobile: hamburger menu that toggles a nav drawer (NO bottom tab bar)
- Full-screen hero section (min-height: 100vh or large padding)
- Marketing sections below hero: features, testimonials, CTA, footer
- NO bottom tab bar`;

  console.log(`[CODEGEN] productTypeRules injected: ${productTypeRules.slice(0, 100)}`);

  const codeSystemContent = `
CRITICAL: You MUST always return a "files" array. Never omit the files field. If generation fails, return files: [] rather than omitting the field.

You generate React + TypeScript source files for a Vite + Tailwind + shadcn/ui project.

Requirements:
- Return a complete set of generated files needed for the page to run.
- Every imported generated file must also be included in the response.
- Allowed generated paths are:
  - /src/App.tsx
  - /src/generated/pages/*.tsx
  - /src/generated/sections/*.tsx
- Use default exports consistently unless a named export is explicitly necessary.
- Do not generate package.json, vite.config.ts, tsconfig.json, main.tsx, styles.css, or template infrastructure files.
- Assume template files already exist.
- Keep code concise and compilable.

Image rules:
- Do NOT use any external image URLs (Unsplash, Pexels, etc.) — they will fail to load in the WebContainer environment.
- Do NOT use <img> tags with remote src values.
- Instead, use CSS gradients (linear-gradient, radial-gradient) as visual placeholders that match the variant's color mood.
- Use div elements styled with background CSS gradient properties to represent image areas.
- Example: <div style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))", width: "100%", height: "400px" }} />

String handling — CRITICAL for Korean text:
- NEVER use single quotes or double quotes for strings that may contain Korean text with line breaks.
- ALWAYS use template literals (backticks) for:
  - Any string containing Korean characters
  - Any multi-line string
  - Any JSX text content stored in variables
- Keep all Korean strings on a single line inside backticks — never break them across lines in source code.
- WRONG:  title: '오늘 몸 상태를\n먼저 묻습니다'
- CORRECT: title: \`오늘 몸 상태를 먼저 묻습니다\`

${productTypeRules}

Tool output format — CRITICAL:
- The "files" field in your tool call MUST be a JSON array of objects.
- Do NOT return "files" as a JSON-encoded string.
- Correct:   { "files": [ { "path": "...", "content": "..." } ] }
- Incorrect: { "files": "[{\"path\": \"...\", \"content\": \"...\"}]" }
- When file content contains double quotes, escape them with a backslash: \"
  `.trim();

  const codeUserContent = JSON.stringify(
    { prompt, interpretation, brief, expectedPaths },
    null,
    2,
  );

  const codeInput = [
    { role: "system" as const, content: codeSystemContent },
    { role: "user" as const, content: codeUserContent },
  ];

  const minimalFallback: GeneratedFile[] = [
    {
      path: "/src/App.tsx",
      content: `export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>생성 중 오류가 발생했습니다</h1>
      <p>다시 시도해 주세요.</p>
    </div>
  );
}`,
    },
  ];

  const attemptCodegen = async (): Promise<GeneratedFile[]> => {
    console.log("\n" + "─".repeat(60));
    console.log(`[CODEGEN] model=${ANTHROPIC_MODEL_CODE} variant=${brief.variantId}`);
    for (const msg of codeInput) {
      console.log(`\n[${msg.role.toUpperCase()}]\n${msg.content}`);
    }
    console.log("─".repeat(60) + "\n");

    const response = await anthropic.messages.create(
      {
        model: ANTHROPIC_MODEL_CODE,
        max_tokens: 16000,
        system: codeSystemContent,
        messages: [{ role: "user", content: codeUserContent }],
        tools: [
          {
            name: "generated_files",
            description: "Return the generated source files",
            input_schema: z.toJSONSchema(GeneratedFilesSchema) as never,
          },
        ],
        tool_choice: { type: "tool", name: "generated_files" },
      },
      { signal },
    );

    console.log('RAW RESPONSE:', (JSON.stringify((response.content[0] as { text?: string }).text) ?? '').slice(0, 500));
    console.log("\n[CODEGEN] response.content blocks:", response.content.map((b) => b.type));
    console.log("[CODEGEN] raw response.content[0]:", JSON.stringify(response.content[0]).slice(0, 500));

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      console.error("[CODEGEN] no tool_use block. text block:", (textBlock as { text?: string } | undefined)?.text?.slice(0, 300));
      return [];
    }

    try {
      const rawInput = toolUse.input as Record<string, unknown>;
      console.log("[CODEGEN] toolUse.input type of files:", typeof rawInput.files);
      console.log("[CODEGEN] toolUse.input.files preview:", JSON.stringify(rawInput.files)?.slice(0, 300));

      // normalize generatedFiles → files if model used wrong field name
      if (!rawInput.files && rawInput.generatedFiles) {
        rawInput.files = rawInput.generatedFiles;
      }

      if (typeof rawInput.files === "string") {
        const filesStr = rawInput.files as string;
        try {
          rawInput.files = JSON.parse(filesStr);
        } catch {
          try {
            rawInput.files = JSON.parse(jsonrepair(filesStr));
            console.log("[CODEGEN] jsonrepair rescued files, count:", Array.isArray(rawInput.files) ? (rawInput.files as unknown[]).length : "not array");
          } catch (repairErr) {
            console.error("[CODEGEN] jsonrepair also failed:", repairErr instanceof Error ? repairErr.message : repairErr);
            rawInput.files = [];
          }
        }
      }

      const parsed = GeneratedFilesSchema.parse(rawInput);

      const files = parsed.files ?? [];
      if (!Array.isArray(files) || files.length === 0) {
        console.error("[CODEGEN] files field missing or empty:", JSON.stringify(parsed).slice(0, 300));
        return [];
      }

      validateGeneratedFiles(files, expectedPaths);
      return files;
    } catch (e) {
      console.error("[CODEGEN] Parse failed:", e);
      return [];
    }
  };

  let files = await attemptCodegen();
  if (!Array.isArray(files) || files.length === 0) {
    console.warn(`[CODEGEN] Variant ${brief.variantId} returned empty files, retrying...`);
    files = await attemptCodegen();
  }
  if (!Array.isArray(files) || files.length === 0) {
    console.error(`[CODEGEN] Variant ${brief.variantId} retry also returned empty files, using fallback`);
    return minimalFallback;
  }
  return files;
}
