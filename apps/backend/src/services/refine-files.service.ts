import {
  GeneratedFile,
  GeneratedFilesSchema,
  GeneratedProject,
  PromptInterpretation,
  RefinePlan,
} from "@zeno/shared";
import { z } from "zod";
import { anthropic, ANTHROPIC_MODEL_CODE, USE_ANTHROPIC_CODE } from "../lib/openai";

interface RefineProjectFromPlanParams {
  prompt: string;
  currentProject: GeneratedProject;
  interpretation: PromptInterpretation;
  refinePlan: RefinePlan;
  signal?: AbortSignal;
}

const SECTION_TO_FILE: Record<string, string> = {
  "hero": "HeroSection",
  "feature-grid": "FeatureGridSection",
  "pricing": "PricingSection",
  "testimonial": "TestimonialSection",
  "faq": "FaqSection",
  "cta": "CtaSection",
  "stats": "StatsSection",
  "comparison": "ComparisonSection",
  "showcase": "ShowcaseSection",
  "process": "ProcessSection",
  "contact-form": "ContactFormSection",
  "logo-strip": "LogoStripSection",
};

const resolveTargetFiles = (
  currentProject: GeneratedProject,
  refinePlan: RefinePlan,
): GeneratedFile[] => {
  const sectionFiles = currentProject.files.filter((f) =>
    f.path.startsWith("/src/generated/sections/"),
  );

  if (refinePlan.targetSectionIds.length === 0) {
    return sectionFiles.slice(0, 1);
  }

  const targetNames = refinePlan.targetSectionIds
    .map((id) => SECTION_TO_FILE[id])
    .filter(Boolean);

  const matched = sectionFiles.filter((f) =>
    targetNames.some((name) => f.path.includes(name)),
  );

  return matched.length > 0 ? matched : sectionFiles.slice(0, 1);
};

const mergeFiles = (
  originalFiles: GeneratedFile[],
  updatedFiles: GeneratedFile[],
): GeneratedFile[] => {
  const updatedMap = new Map(updatedFiles.map((file) => [file.path, file]));
  return originalFiles.map((file) => updatedMap.get(file.path) ?? file);
};

export const refineProjectFromPlan = async ({
  prompt,
  currentProject,
  interpretation,
  refinePlan,
  signal,
}: RefineProjectFromPlanParams): Promise<{
  project: GeneratedProject;
  changedFiles: string[];
}> => {
  const targetFiles = resolveTargetFiles(currentProject, refinePlan);

  if (targetFiles.length === 0) {
    return {
      project: currentProject,
      changedFiles: [],
    };
  }

  if (!USE_ANTHROPIC_CODE) {
    return {
      project: currentProject,
      changedFiles: [],
    };
  }

  const refineSystemContent = `
You update existing React + TypeScript files for a Vite + Tailwind + shadcn/ui project.

Rules:
- Only update the files provided in targetFiles.
- Keep every file path exactly the same.
- Return only the updated files.
- Do not create extra files.
- Preserve compilability.
- Apply the requested revision directly.
  `.trim();

  const refineUserContent = JSON.stringify(
    { prompt, interpretation, refinePlan, currentProject, targetFiles },
    null,
    2,
  );

  const refineInput = [
    { role: "system" as const, content: refineSystemContent },
    { role: "user" as const, content: refineUserContent },
  ];

  console.log("\n" + "─".repeat(60));
  console.log(`[REFINE] model=${ANTHROPIC_MODEL_CODE}`);
  console.log(`[REFINE] targets: ${refinePlan.targetSectionIds.join(", ")}`);
  for (const msg of refineInput) {
    console.log(`\n[${msg.role.toUpperCase()}]\n${msg.content}`);
  }
  console.log("─".repeat(60) + "\n");

  const response = await anthropic.messages.create(
    {
      model: ANTHROPIC_MODEL_CODE,
      max_tokens: 16000,
      system: refineSystemContent,
      messages: [{ role: "user", content: refineUserContent }],
      tools: [
        {
          name: "generated_files",
          description: "Return the refined source files",
          input_schema: z.toJSONSchema(GeneratedFilesSchema) as never,
        },
      ],
      tool_choice: { type: "tool", name: "generated_files" },
    },
    { signal },
  );

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Anthropic did not return refined files");
  }

  const rawInput = toolUse.input as Record<string, unknown>;

  if (typeof rawInput.files === "string") {
    try {
      rawInput.files = JSON.parse(rawInput.files);
    } catch {
      rawInput.files = [];
    }
  }

  const parsed = GeneratedFilesSchema.parse(rawInput);

  if (!parsed) {
    throw new Error("Anthropic did not return parsed refined files");
  }

  const mergedFiles = mergeFiles(currentProject.files, parsed.files);

  return {
    project: {
      ...currentProject,
      files: mergedFiles,
    },
    changedFiles: parsed.files.map((file) => file.path),
  };
};
