import { GeneratedFile } from "@/shared";

export type FileTreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: FileTreeNode[];
    }
  | {
      type: "file";
      name: string;
      path: string;
    };

function createFolder(path: string, name: string): FileTreeNode {
  return {
    type: "folder",
    name,
    path,
    children: [],
  };
}

export function buildFileTree(files: GeneratedFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath += `/${part}`;
      const isLast = index === parts.length - 1;

      if (isLast) {
        const existing = currentLevel.find(
          (node) => node.type === "file" && node.path === currentPath,
        );

        if (!existing) {
          currentLevel.push({
            type: "file",
            name: part,
            path: currentPath,
          });
        }

        return;
      }

      let folder = currentLevel.find(
        (node) => node.type === "folder" && node.path === currentPath,
      );

      if (!folder || folder.type !== "folder") {
        folder = createFolder(currentPath, part);
        currentLevel.push(folder);
      }

      currentLevel = (folder as Extract<FileTreeNode, { type: "folder" }>).children;
    });
  }

  return sortTree(root);
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .map((node) =>
      node.type === "folder"
        ? { ...node, children: sortTree(node.children) }
        : node,
    );
}

export function getLanguageFromPath(path: string): string {
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}
