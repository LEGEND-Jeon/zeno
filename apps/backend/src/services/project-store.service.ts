import type { GeneratedProject, Variant } from "@zeno/shared";
import { store } from "../lib/store";

export async function saveGeneration(
  projectId: string,
  generationId: string,
  variants: Variant[],
): Promise<void> {
  store.generation.create({
    id: generationId,
    projectId,
    variants: variants.map((v) => ({
      id: v.id,
      name: v.name,
      summary: v.summary,
      brief: v.brief,
      project: v.project,
      uiMap: v.uiMap,
    })),
  });
}

export async function loadLatestProject(
  variantId: string,
): Promise<GeneratedProject> {
  const latestRevision = store.revision.findFirst({ variantId });

  if (latestRevision) {
    return latestRevision.project as unknown as GeneratedProject;
  }

  const variant = store.variant.findUnique(variantId);

  if (!variant) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  return variant.project as unknown as GeneratedProject;
}

export async function saveRevision(
  variantId: string,
  revisionId: string,
  project: GeneratedProject,
  changedFiles: string[],
  messageId?: string,
): Promise<void> {
  store.revision.create({
    id: revisionId,
    variantId,
    project,
    changedFiles,
    messageId,
  });
}

export async function loadLatestGeneration(
  projectId: string,
): Promise<{ generationId: string; variants: Variant[] } | null> {
  const generation = store.generation.findFirst({ projectId });

  if (!generation) return null;

  const variants: Variant[] = generation.variants.map((v) => ({
    id: v.id,
    name: v.name,
    summary: v.summary,
    revisionId: v.revisions[0]?.id ?? `rev_initial_${v.id}`,
    brief: v.brief as Variant["brief"],
    project: (v.revisions[0]?.project ?? v.project) as unknown as GeneratedProject,
    uiMap: v.uiMap as Variant["uiMap"],
  }));

  return { generationId: generation.id, variants };
}
