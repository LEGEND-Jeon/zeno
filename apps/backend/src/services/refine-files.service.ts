import {
  type GeneratedFile,
  type GeneratedProject,
  type PromptInterpretation,
  type RefinePlan,
} from "@zeno/shared";
import { anthropic, ANTHROPIC_MODEL_CODE_WEB, USE_ANTHROPIC_CODE } from "../lib/openai";
import { searchPexelsImage } from "./generate-files.service";

async function resolvePexelsPlaceholders(html: string): Promise<string> {
  const placeholderRegex = /__PEXELS__:((?:[^_]|_(?!_))+)__/g;
  const matches = [...html.matchAll(placeholderRegex)];
  if (matches.length === 0) return html;

  console.log(`[REFINE PEXELS] found ${matches.length} unresolved placeholder(s) — resolving`);
  const keywords = matches.map((m) => m[1].trim());

  for (const kw of keywords) {
    let url = await searchPexelsImage(kw);
    if (!url) {
      const seed = kw.split(" ")[0];
      url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`;
    }
    html = html.split(`__PEXELS__:${kw}__`).join(url);
  }
  return html;
}

interface RefineProjectFromPlanParams {
  prompt: string;
  currentProject: GeneratedProject;
  interpretation: PromptInterpretation;
  refinePlan: RefinePlan;
  signal?: AbortSignal;
}

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
  const indexHtml = currentProject.files.find((f) => f.path === "/index.html");

  if (!indexHtml) {
    console.warn("[REFINE] /index.html not found in project, skipping");
    return { project: currentProject, changedFiles: [] };
  }

  if (!USE_ANTHROPIC_CODE) {
    return { project: currentProject, changedFiles: [] };
  }

  const refineSystemContent = `
You modify an existing single self-contained HTML page based on the user's refinement request.

OUTPUT FORMAT — MANDATORY:
Wrap your entire HTML output in <html_output> tags like this:
<html_output>
<!DOCTYPE html>
<html lang="ko">
...
</html>
</html_output>

RULES:
- Return the COMPLETE modified HTML file — not just the changed parts.
- Keep all existing <style> @import font declarations exactly as-is.
- Keep all existing image src URLs exactly as-is — do NOT change them.
- Keep all existing CSS :root variable names — only change their values if the refinement requires it.
- Only change what the refinement instructions specify. Leave everything else intact.
- Preserve all JavaScript functionality.
- The output must be a valid, complete, self-contained HTML file.
- Do NOT add any @import for fonts — they are already present in the file.
  `.trim();

  const refineUserContent = JSON.stringify(
    {
      prompt,
      interpretation,
      refinePlan,
      currentHtml: indexHtml.content,
    },
    null,
    2,
  );

  console.log("\n" + "─".repeat(60));
  console.log(`[REFINE] model=${ANTHROPIC_MODEL_CODE_WEB}`);
  console.log(`[REFINE] targets: ${refinePlan.targetSectionIds.join(", ")}`);
  console.log(`[REFINE] patchIntent: ${refinePlan.patchIntent}`);
  console.log(`[REFINE] changeSummary: ${refinePlan.changeSummary.join(", ")}`);
  console.log("─".repeat(60) + "\n");

  const stream = anthropic.messages.stream(
    {
      model: ANTHROPIC_MODEL_CODE_WEB,
      max_tokens: 32000,
      system: refineSystemContent,
      messages: [{ role: "user", content: refineUserContent }],
    },
    { signal },
  );
  const response = await stream.finalMessage();

  console.log(`[REFINE] stop_reason=${response.stop_reason} blocks=${response.content.map((b) => b.type).join(",")}`);

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  console.log(`[REFINE] rawText length=${rawText.length}`);

  let refinedHtml: string | null = null;

  const tagMatch = rawText.match(/<html_output>([\s\S]*?)<\/html_output>/i);
  if (tagMatch) {
    refinedHtml = tagMatch[1].trim();
    console.log(`[REFINE] extracted via <html_output> tag, length=${refinedHtml.length}`);
  }

  if (!refinedHtml) {
    const codeBlockMatch = rawText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      refinedHtml = codeBlockMatch[1].trim();
      console.log(`[REFINE] extracted via code block, length=${refinedHtml.length}`);
    }
  }

  if (!refinedHtml) {
    const doctypeMatch = rawText.match(/(<!DOCTYPE\s+html[\s\S]*<\/html>)/i);
    if (doctypeMatch) {
      refinedHtml = doctypeMatch[1].trim();
      console.log(`[REFINE] extracted via DOCTYPE match, length=${refinedHtml.length}`);
    }
  }

  if (!refinedHtml && response.stop_reason === "max_tokens") {
    const truncatedTag = rawText.match(/<html_output>([\s\S]*)/i);
    if (truncatedTag) {
      refinedHtml = truncatedTag[1].trim();
      if (!refinedHtml.endsWith("</html>")) refinedHtml += "\n</body>\n</html>";
      console.log(`[REFINE] salvaged truncated <html_output> (max_tokens), length=${refinedHtml.length}`);
    } else {
      const truncatedDoctype = rawText.match(/(<!DOCTYPE\s+html[\s\S]*)/i);
      if (truncatedDoctype) {
        refinedHtml = truncatedDoctype[1].trim();
        if (!refinedHtml.endsWith("</html>")) refinedHtml += "\n</body>\n</html>";
        console.log(`[REFINE] salvaged truncated DOCTYPE (max_tokens), length=${refinedHtml.length}`);
      }
    }
  }

  if (!refinedHtml) {
    console.warn("[REFINE] could not extract HTML from response, returning original");
    return { project: currentProject, changedFiles: [] };
  }

  refinedHtml = await resolvePexelsPlaceholders(refinedHtml);

  const updatedFile: GeneratedFile = { path: "/index.html", content: refinedHtml };
  const updatedFiles = currentProject.files.map((f) =>
    f.path === "/index.html" ? updatedFile : f,
  );

  return {
    project: { ...currentProject, files: updatedFiles },
    changedFiles: ["/index.html"],
  };
};
