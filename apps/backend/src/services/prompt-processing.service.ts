import { randomUUID } from "node:crypto";
import type { GenerationsResponse } from "@zeno/shared";
import {
  planFromPrompt,
  streamAssistantAnswerFromPlan,
} from "./planner.service";
import { generateFilesFromBrief } from "./generate-files.service";
import { generateProjectFromFiles } from "./merge-template.service";
import {
  getProjectHistory,
  updateProjectMetadata,
  type TurnData,
} from "./conversation.service";
import { refineProjectFromPlan } from "./refine-files.service";
import {
  loadLatestProject,
  saveGeneration,
  saveRevision,
} from "./project-store.service";
import { buildUiMap } from "../utils/ui-map";

const createRevisionId = () => `rev_${randomUUID()}`;

export class PromptProcessingError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "PromptProcessingError";
  }
}

export interface ProcessProjectPromptInput {
  prompt: string;
  projectId: string;
  selectedVariantId?: string;
  currentRevisionId?: string;
  assistantMessageId?: string;
  sectionName?: string;
  sectionHtml?: string;
  signal?: AbortSignal;
  onAssistantTextStart?: () => Promise<void> | void;
  onAssistantTextDelta?: (delta: string) => Promise<void> | void;
  onAssistantTextFinalizing?: (content: string) => Promise<void> | void;
}

export interface ProcessProjectPromptResult {
  projectName: string;
  response: GenerationsResponse;
  turnData: TurnData;
}

export function buildDraftProjectName(prompt: string): string {
  const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();

  if (!normalizedPrompt) {
    return "New Project";
  }

  return normalizedPrompt.slice(0, 48);
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) {
    return;
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  throw error;
}

export async function processProjectPrompt({
  prompt,
  projectId,
  selectedVariantId: incomingSelectedVariantId,
  currentRevisionId: incomingCurrentRevisionId,
  assistantMessageId,
  sectionName,
  sectionHtml,
  signal,
  onAssistantTextStart,
  onAssistantTextDelta,
  onAssistantTextFinalizing,
}: ProcessProjectPromptInput): Promise<ProcessProjectPromptResult> {
  const history = await getProjectHistory(projectId);
  let planner = await planFromPrompt(prompt, history, signal);
  throwIfAborted(signal);

  // Hard gate: first message must always be consulting.
  // If the model still returns generate on turn 1, call again with explicit override.
  if (history.length === 0 && planner.mode === "generate") {
    console.warn("[GATE] First-turn generate blocked — re-running planner as strategy");
    planner = await planFromPrompt(
      `[SYSTEM OVERRIDE: You must respond in strategy mode. Collect business name, industry, and target customers before any generation.]\n\n${prompt}`,
      history,
      signal,
    );
    throwIfAborted(signal);
  }

  let streamedAnswer = planner.assistantMessage.answer;

  if (onAssistantTextDelta) {
    let didStart = false;

    streamedAnswer = await streamAssistantAnswerFromPlan(
      prompt,
      planner,
      signal,
      async (delta) => {
        if (!didStart) {
          didStart = true;
          await onAssistantTextStart?.();
        }

        await onAssistantTextDelta(delta);
      },
    );
  }

  throwIfAborted(signal);

  const assistantMessage = {
    ...planner.assistantMessage,
    answer: streamedAnswer,
    interaction:
      planner.mode === "strategy" || planner.mode === "planning"
        ? planner.assistantMessage.interaction
        : null,
  };
  const projectName = planner.assistantMessage.title;

  const turnBase: TurnData = {
    prompt,
    mode: planner.mode,
    interpretation: planner.interpretation,
    assistantMessage,
    execution: planner.execution,
  };

  if (planner.mode === "strategy") {
    const strategyPlan = planner.execution.strategyPlan;

    if (!strategyPlan) {
      throw new PromptProcessingError("Strategy plan is missing");
    }

    return {
      projectName,
      turnData: turnBase,
      response: {
        ok: true,
        mode: "strategy",
        projectId,
        prompt,
        interpretation: planner.interpretation,
        assistantMessage,
        strategy: strategyPlan,
      },
    };
  }

  if (planner.mode === "planning") {
    const planningPlan = planner.execution.planningPlan;

    if (!planningPlan) {
      throw new PromptProcessingError("Planning plan is missing");
    }

    return {
      projectName,
      turnData: turnBase,
      response: {
        ok: true,
        mode: "planning",
        projectId,
        prompt,
        interpretation: planner.interpretation,
        assistantMessage,
        planning: planningPlan,
      },
    };
  }

  if (planner.mode === "generate") {
    const briefs = planner.execution.variantBriefs;

    if (!briefs || briefs.length !== 4) {
      throw new PromptProcessingError(
        "Planner returned generate mode without 4 variant briefs",
      );
    }

    await onAssistantTextFinalizing?.(assistantMessage.answer);
    throwIfAborted(signal);

    const generationId = randomUUID();
    const variants: Array<{
      id: string;
      name: string;
      summary: string;
      revisionId: string;
      brief: (typeof briefs)[number];
      project: ReturnType<typeof generateProjectFromFiles>;
      uiMap: ReturnType<typeof buildUiMap>;
    }> = [];

    for (let i = 0; i < briefs.length; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      throwIfAborted(signal);

      const brief = briefs[i];
      console.log(`[BRIEF] variant=${brief.variantId} productType=${brief.productType} navPattern=${brief.navPattern}`);
      const generatedFiles = await generateFilesFromBrief(
        prompt,
        brief,
        planner.interpretation,
        signal,
      );

      const project = generateProjectFromFiles(generatedFiles);

      const finalHtml = project.files.find((f) => f.path === "/index.html")?.content;
      console.log('[HTML SAMPLE]', finalHtml?.slice(0, 500));
      const imgs = finalHtml?.match(/src="([^"]+)"/g);
      console.log('[IMG SRCS]', imgs?.slice(0, 5));

      variants.push({
        id: `${generationId}-variant-${brief.variantId.toLowerCase()}`,
        name: `Variant ${brief.variantId}`,
        summary: brief.summary,
        revisionId: createRevisionId(),
        brief,
        project,
        uiMap: buildUiMap(project.files),
      });
    }

    await saveGeneration(projectId, generationId, variants);

    const selectedVariantId =
      planner.execution.defaultSelectedVariantId ?? variants[0]?.id;
    const selectedVariant = variants.find(
      (variant) => variant.id === selectedVariantId,
    );

    await updateProjectMetadata(projectId, {
      selectedVariantId: selectedVariantId ?? null,
      currentRevisionId: selectedVariant?.revisionId ?? null,
    });
    throwIfAborted(signal);

    return {
      projectName,
      turnData: {
        ...turnBase,
        generationId,
      },
      response: {
        ok: true,
        mode: "generate",
        projectId,
        generationId,
        prompt,
        interpretation: planner.interpretation,
        assistantMessage,
        variants,
        selectedVariantId,
        currentRevisionId: selectedVariant?.revisionId,
      },
    };
  }

  if (!planner.execution.refinePlan) {
    planner.execution.refinePlan = {
      targetSectionIds: [],
      patchIntent: "style",
      changeSummary: [],
    };
  }

  const refinePlan = planner.execution.refinePlan;

  if (!incomingSelectedVariantId) {
    throw new PromptProcessingError("Refine requires selectedVariantId", 400);
  }

  const sourceVariantId = incomingSelectedVariantId;
  const projectToRefine = await loadLatestProject(sourceVariantId);
  const sourceRevisionId = incomingCurrentRevisionId;
  const resultRevisionId = createRevisionId();
  await onAssistantTextFinalizing?.(assistantMessage.answer);
  throwIfAborted(signal);

  const refinePrompt = sectionName
    ? `[섹션 편집 모드]\n수정 대상: "${sectionName}" 섹션만 변경할 것.\n다른 섹션은 절대 건드리지 말 것.\n전체 HTML을 반환할 것.\n${sectionHtml ? `\n현재 섹션 HTML:\n${sectionHtml}\n` : ""}\n사용자 요청: ${prompt}`
    : prompt;

  const { project, changedFiles } = await refineProjectFromPlan({
    prompt: refinePrompt,
    currentProject: projectToRefine,
    interpretation: planner.interpretation,
    refinePlan,
    signal,
  });

  await saveRevision(
    sourceVariantId,
    resultRevisionId,
    project,
    changedFiles,
    assistantMessageId,
  );

  await updateProjectMetadata(projectId, {
    selectedVariantId: sourceVariantId,
    currentRevisionId: resultRevisionId,
  });
  throwIfAborted(signal);

  return {
    projectName,
    turnData: turnBase,
    response: {
      ok: true,
      mode: "refine",
      projectId,
      prompt,
      interpretation: planner.interpretation,
      assistantMessage,
      sourceVariantId,
      sourceRevisionId,
      changedFiles,
      patchSummary: refinePlan.changeSummary,
      project,
      uiMap: buildUiMap(project.files),
      selectedVariantId: sourceVariantId,
      currentRevisionId: resultRevisionId,
    },
  };
}
