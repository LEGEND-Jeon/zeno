"use client";

import { useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";
import type { GeneratedProject } from "@zeno/shared";
import { toWebContainerTree } from "@/lib/to-webcontainer-tree";

type Props = {
  project: GeneratedProject;
};

let webcontainerPromise: Promise<WebContainer> | null = null;
let hasMountedInitialTree = false;
let hasStartedDevServer = false;
let serverReadyPromise: Promise<string> | null = null;
let currentPackageJson = "";

async function getWebContainer() {
  if (!webcontainerPromise) {
    webcontainerPromise = WebContainer.boot();
  }
  return webcontainerPromise;
}

async function ensureDirectories(wc: WebContainer, filePath: string) {
  const parts = filePath.split("/").filter(Boolean);
  let currentPath = "";

  for (let i = 0; i < parts.length - 1; i += 1) {
    currentPath += `/${parts[i]}`;
    try {
      await wc.fs.mkdir(currentPath);
    } catch {
      // 이미 있으면 무시
    }
  }
}

async function patchFiles(wc: WebContainer, project: GeneratedProject) {
  for (const file of project.files) {
    await ensureDirectories(wc, file.path);
    await wc.fs.writeFile(file.path, file.content);
  }
}

function getPackageJsonContent(project: GeneratedProject) {
  return (
    project.files.find((file) => file.path === "/package.json")?.content ?? ""
  );
}

async function installDependenciesIfNeeded(
  wc: WebContainer,
  project: GeneratedProject,
) {
  const nextPackageJson = getPackageJsonContent(project);

  if (!nextPackageJson) return;
  if (nextPackageJson === currentPackageJson) return;

  currentPackageJson = nextPackageJson;

  const installProcess = await wc.spawn("npm", [
    "install",
    "--prefer-offline",
    "--no-audit",
    "--no-fund",
    "--progress=false",
  ]);

  installProcess.output.pipeTo(
    new WritableStream({
      write(chunk) {
        console.log("[npm install]", chunk);
      },
    }),
  );

  const exitCode = await Promise.race([
    installProcess.exit,
    new Promise<number>((_, reject) =>
      setTimeout(() => reject(new Error("npm install timed out after 3 minutes")), 3 * 60 * 1000),
    ),
  ]);

  if (exitCode !== 0) {
    throw new Error(`npm install failed (exit code ${exitCode})`);
  }
}

async function startDevServerIfNeeded(wc: WebContainer) {
  if (hasStartedDevServer) return;

  if (!serverReadyPromise) {
    serverReadyPromise = new Promise((resolve, reject) => {
      wc.on("server-ready", (_port, url) => {
        resolve(url);
      });

      wc.on("error", (error) => {
        reject(error);
      });
    });
  }

  await wc.spawn("npm", ["run", "dev"]);
  hasStartedDevServer = true;
}

export default function WebContainerPreview({ project }: Props) {
  const [status, setStatus] = useState<
    | "idle"
    | "booting"
    | "mounting"
    | "updating"
    | "installing"
    | "starting"
    | "ready"
    | "error"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    const requestId = ++requestIdRef.current;

    async function run() {
      try {
        setErrorMessage("");
        setStatus(hasMountedInitialTree ? "updating" : "booting");

        const wc = await getWebContainer();
        if (disposed || requestId !== requestIdRef.current) return;

        if (!hasMountedInitialTree) {
          setStatus("mounting");
          await wc.mount(toWebContainerTree(project));
          hasMountedInitialTree = true;
        } else {
          // 기존 컨테이너 유지, 파일만 덮어쓰기
          await patchFiles(wc, project);
        }

        if (disposed || requestId !== requestIdRef.current) return;

        setStatus("installing");
        await installDependenciesIfNeeded(wc, project);

        if (disposed || requestId !== requestIdRef.current) return;

        setStatus(hasStartedDevServer ? "updating" : "starting");
        await startDevServerIfNeeded(wc);

        if (!serverReadyPromise) {
          throw new Error("Preview server did not start");
        }

        const url = await serverReadyPromise;
        if (disposed || requestId !== requestIdRef.current) return;

        setPreviewUrl(url);
        setStatus("ready");
      } catch (error) {
        console.error(error);

        if (!disposed) {
          setStatus("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Preview 실행 중 오류가 발생했습니다.",
          );
        }
      }
    }

    run();

    return () => {
      disposed = true;
    };
  }, [project]);

  if (status === "error") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-red-400">
        {errorMessage || "Preview 실행 중 오류가 발생했습니다."}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      {previewUrl ? (
        <iframe
          src={previewUrl}
          title="Generated Project Preview"
          className="h-full w-full bg-white"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
          Preview 준비 중... ({status})
        </div>
      )}

      {previewUrl && status !== "ready" ? (
        <div className="absolute right-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs text-white">
          {status === "updating" ? "Updating preview..." : `${status}...`}
        </div>
      ) : null}
    </div>
  );
}
