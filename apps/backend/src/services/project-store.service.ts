import type { GeneratedProject, Variant } from "@zeno/shared";
import { prisma } from "../lib/prisma";

export async function saveGeneration(
  projectId: string,
  generationId: string,
  variants: Variant[],
): Promise<void> {
  await prisma.generation.create({
    data: {
      id: generationId,
      projectId,
      variants: {
        create: variants.map((v) => ({
          id: v.id,
          name: v.name,
          summary: v.summary,
          brief: v.brief as object,
          project: v.project as object,
          uiMap: v.uiMap as object,
        })),
      },
    },
  });
}

export async function loadLatestProject(
  variantId: string,
): Promise<GeneratedProject> {
  const latestRevision = await prisma.revision.findFirst({
    where: { variantId },
    orderBy: { createdAt: "desc" },
  });

  if (latestRevision) {
    return latestRevision.project as unknown as GeneratedProject;
  }

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
  });

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
  await prisma.revision.create({
    data: {
      id: revisionId,
      variantId,
      project: project as unknown as object,
      changedFiles: changedFiles as unknown as object,
      messageId,
    },
  });
}

export async function loadLatestGeneration(
  projectId: string,
): Promise<{ generationId: string; variants: Variant[] } | null> {
  const generation = await prisma.generation.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      variants: {
        include: {
          revisions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!generation) return null;

  const variants: Variant[] = generation.variants.map((v) => ({
    id: v.id,
    name: v.name,
    summary: v.summary,
    revisionId: v.revisions[0]?.id ?? `rev_initial_${v.id}`,
    brief: v.brief as Variant["brief"],
    project: (v.revisions[0]?.project ??
      v.project) as unknown as GeneratedProject,
    uiMap: v.uiMap as Variant["uiMap"],
  }));

  return { generationId: generation.id, variants };
}
