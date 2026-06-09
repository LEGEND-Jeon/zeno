"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchProjectDetail } from "@/lib/project-api";
import type { ProjectDetailResponse } from "@zeno/shared";

const WebContainerPreview = dynamic(
  () => import("@/components/preview/webcontainer-preview"),
  { ssr: false },
);

type Props = {
  projectId: string;
};

export default function PreviewOnlyPage({ projectId }: Props) {
  const [projectDetail, setProjectDetail] = useState<ProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const title = projectDetail?.project?.name || 'Zeno Preview';
    document.title = title.split('—')[0].split(' - ')[0].trim();
  }, [projectDetail]);

  useEffect(() => {
    fetchProjectDetail(projectId)
      .then((detail) => {
        if (!detail) {
          setError("Project not found.");
        } else {
          setProjectDetail(detail);
        }
      })
      .catch(() => setError("Failed to load project."));
  }, [projectId]);

  if (error) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "#f87171", fontSize: 14 }}>
        {error}
      </div>
    );
  }

  if (!projectDetail) {
    return null;
  }

  const { latestGeneration, project } = projectDetail;
  const variant =
    latestGeneration?.variants.find((v) => v.id === project.selectedVariantId) ??
    latestGeneration?.variants[0] ??
    null;

  if (!variant) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "#f87171", fontSize: 14 }}>
        No variant found.
      </div>
    );
  }

  return (
    <>
      <style>{`html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }`}</style>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <WebContainerPreview project={variant.project} />
      </div>
    </>
  );
}
