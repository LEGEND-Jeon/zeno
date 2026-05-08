import fs from "node:fs";
import path from "node:path";

type TemplateFile = {
  path: string;
  content: string;
};

function walk(dir: string, baseDir: string): TemplateFile[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: TemplateFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(fullPath, baseDir));
      continue;
    }

    const relativePath = fullPath.replace(baseDir, "").replace(/\\/g, "/");

    result.push({
      path: relativePath.startsWith("/") ? relativePath : `/${relativePath}`,
      content: fs.readFileSync(fullPath, "utf-8"),
    });
  }

  return result;
}

export function loadTemplateFiles(): TemplateFile[] {
  const templateRoot = path.resolve(
    process.cwd(),
    "src/template/react-vite-shadcn",
  );

  return walk(templateRoot, templateRoot);
}
