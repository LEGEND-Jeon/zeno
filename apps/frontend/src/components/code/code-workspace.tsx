"use client";

import Editor from "@monaco-editor/react";
import { buildFileTree, getLanguageFromPath } from "@/lib/file-tree";
import { GeneratedProject } from "@zeno/shared";
import { useMemo, useState } from "react";
import FileExplorer from "./file-explorer";

type Props = {
  project: GeneratedProject;
};

const CodeWorkspace = ({ project }: Props) => {
  const tree = useMemo(() => buildFileTree(project.files), [project.files]);

  const fileMap = useMemo(() => {
    return Object.fromEntries(
      project.files.map((file) => [file.path, file.content]),
    );
  }, [project.files]);

  const initialPath = project.entry || project.files[0]?.path || null;
  const [selectedPath, setSelectedPath] = useState<string | null>(initialPath);

  const selectedContent = selectedPath ? fileMap[selectedPath] : "";
  const selectedLanguage = selectedPath
    ? getLanguageFromPath(selectedPath)
    : "plaintext";

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] overflow-hidden bg-white">
      <aside className="overflow-y-auto border-r border-gray-200 p-3">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Code
          </p>
        </div>

        <FileExplorer
          nodes={tree}
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
        />
      </aside>

      <section className="flex min-w-0 flex-col">
        <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
          {selectedPath ?? "파일을 선택하세요"}
        </div>

        <div className="min-h-0 flex-1">
          <Editor
            path={selectedPath ?? undefined}
            language={selectedLanguage}
            value={selectedContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
        </div>
      </section>
    </div>
  );
};

export default CodeWorkspace;
