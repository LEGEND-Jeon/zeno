import { notFound, redirect } from "next/navigation";
import ProjectChatLayout from "@/components/project/project-chat-layout";
import { fetchProjectDetail } from "@/lib/project-api";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const projectDetail = await fetchProjectDetail(projectId);

  if (!projectDetail) {
    notFound();
  }

  if (!projectDetail.messages.length) {
    redirect("/");
  }

  return <ProjectChatLayout initialProjectDetail={projectDetail} />;
}
