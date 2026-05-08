"use client";

import { useState } from "react";
import type { FileTreeNode } from "@/lib/file-tree";

type Props = {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
};

const TreeNodeItem = ({
  node,
  selectedPath,
  onSelectFile,
}: {
  node: FileTreeNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}) => {
  const [open, setOpen] = useState(true);

  if (node.type === "folder") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          <span className="w-4 text-xs">{open ? "▾" : "▸"}</span>
          <span className="font-medium">{node.name}</span>
        </button>

        {open ? (
          <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-2">
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${
        isSelected ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="w-4 text-xs">•</span>
      <span>{node.name}</span>
    </button>
  );
};

const FileExplorer = ({ nodes, selectedPath, onSelectFile }: Props) => {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
};

export default FileExplorer;
