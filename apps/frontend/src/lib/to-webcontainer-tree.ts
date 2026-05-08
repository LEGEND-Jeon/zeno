import { GeneratedProject } from "@zeno/shared";

type WebContainerFileNode = {
  file: {
    contents: string;
  };
};

type WebContainerDirectoryNode = {
  directory: Record<string, WebContainerNode>;
};

type WebContainerNode = WebContainerFileNode | WebContainerDirectoryNode;

export type WebContainerTree = Record<string, WebContainerNode>;

const isDirectoryNode = (
  node: WebContainerNode,
): node is WebContainerDirectoryNode => {
  return "directory" in node;
};

export const toWebContainerTree = (
  project: GeneratedProject,
): WebContainerTree => {
  const root: WebContainerTree = {};

  for (const file of project.files) {
    const parts = file.path.split("/").filter(Boolean);
    let current: Record<string, WebContainerNode> = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      if (isLast) {
        current[part] = {
          file: {
            contents: file.content,
          },
        };
        return;
      }

      if (!current[part]) {
        current[part] = {
          directory: {},
        };
      }

      const nextNode = current[part];
      if (!isDirectoryNode(nextNode)) {
        throw new Error(`Path collision: ${part} is a file, not a directory`);
      }

      current = nextNode.directory;
    });
  }

  return root;
};
