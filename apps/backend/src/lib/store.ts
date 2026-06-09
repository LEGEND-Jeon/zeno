import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function newId(): string {
  return `m${Date.now().toString(36)}${crypto.randomBytes(8).toString("hex")}`;
}

function now(): Date {
  return new Date();
}

export interface DbProject {
  id: string;
  userId: string;
  name: string;
  selectedVariantId: string | null;
  currentRevisionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbMessage {
  id: string;
  projectId: string;
  role: string;
  content: string;
  mode: string | null;
  interpretation: unknown;
  execution: unknown;
  generationId: string | null;
  interaction: unknown;
  choiceResponse: unknown;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}

export interface DbGeneration {
  id: string;
  projectId: string;
  createdAt: Date;
}

export interface DbVariant {
  id: string;
  generationId: string;
  name: string;
  summary: string;
  brief: unknown;
  project: unknown;
  uiMap: unknown;
  createdAt: Date;
}

export interface DbRevision {
  id: string;
  variantId: string;
  project: unknown;
  changedFiles: unknown;
  messageId: string | null;
  createdAt: Date;
}

const DATA_DIR = path.resolve(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function toDate(v: unknown): Date {
  return v instanceof Date ? v : new Date(v as string);
}

function loadInitialState(): {
  projects: Map<string, DbProject>;
  messages: Map<string, DbMessage>;
  generations: Map<string, DbGeneration>;
  variants: Map<string, DbVariant>;
  revisions: Map<string, DbRevision>;
} {
  const empty = {
    projects: new Map<string, DbProject>(),
    messages: new Map<string, DbMessage>(),
    generations: new Map<string, DbGeneration>(),
    variants: new Map<string, DbVariant>(),
    revisions: new Map<string, DbRevision>(),
  };

  try {
    if (!fs.existsSync(STORE_FILE)) return empty;
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const data = JSON.parse(raw) as {
      projects?: Record<string, DbProject>;
      messages?: Record<string, DbMessage>;
      generations?: Record<string, DbGeneration>;
      variants?: Record<string, DbVariant>;
      revisions?: Record<string, DbRevision>;
    };

    const projects = new Map<string, DbProject>(
      Object.entries(data.projects ?? {}).map(([k, v]) => [
        k,
        { ...v, createdAt: toDate(v.createdAt), updatedAt: toDate(v.updatedAt) },
      ]),
    );
    const messages = new Map<string, DbMessage>(
      Object.entries(data.messages ?? {}).map(([k, v]) => [
        k,
        { ...v, createdAt: toDate(v.createdAt) },
      ]),
    );
    const generations = new Map<string, DbGeneration>(
      Object.entries(data.generations ?? {}).map(([k, v]) => [
        k,
        { ...v, createdAt: toDate(v.createdAt) },
      ]),
    );
    const variants = new Map<string, DbVariant>(
      Object.entries(data.variants ?? {}).map(([k, v]) => [
        k,
        { ...v, createdAt: toDate(v.createdAt) },
      ]),
    );
    const revisions = new Map<string, DbRevision>(
      Object.entries(data.revisions ?? {}).map(([k, v]) => [
        k,
        { ...v, createdAt: toDate(v.createdAt) },
      ]),
    );

    console.log(
      `[store] loaded from disk — projects:${projects.size} messages:${messages.size} generations:${generations.size}`,
    );
    return { projects, messages, generations, variants, revisions };
  } catch (err) {
    console.error("[store] failed to load from disk, starting fresh:", err);
    return empty;
  }
}

const { projects, messages, generations, variants, revisions } = loadInitialState();

function persist(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      STORE_FILE,
      JSON.stringify({
        projects: Object.fromEntries(projects),
        messages: Object.fromEntries(messages),
        generations: Object.fromEntries(generations),
        variants: Object.fromEntries(variants),
        revisions: Object.fromEntries(revisions),
      }),
      "utf-8",
    );
  } catch (err) {
    console.error("[store] persist failed:", err);
  }
}

export const store = {
  project: {
    create(data: { name: string; userId: string }): DbProject {
      const project: DbProject = {
        id: newId(),
        userId: data.userId,
        name: data.name,
        selectedVariantId: null,
        currentRevisionId: null,
        createdAt: now(),
        updatedAt: now(),
      };
      projects.set(project.id, project);
      persist();
      return project;
    },

    findFirst(where: { id?: string; userId?: string }): DbProject | null {
      for (const p of projects.values()) {
        if (where.id !== undefined && p.id !== where.id) continue;
        if (where.userId !== undefined && p.userId !== where.userId) continue;
        return p;
      }
      return null;
    },

    update(
      id: string,
      data: { name?: string; selectedVariantId?: string | null; currentRevisionId?: string | null },
    ): void {
      const p = projects.get(id);
      if (!p) return;
      if (data.name !== undefined) p.name = data.name;
      if ("selectedVariantId" in data) p.selectedVariantId = data.selectedVariantId ?? null;
      if ("currentRevisionId" in data) p.currentRevisionId = data.currentRevisionId ?? null;
      p.updatedAt = now();
      persist();
    },
  },

  message: {
    create(data: Omit<DbMessage, "id" | "createdAt">): DbMessage {
      const message: DbMessage = { id: newId(), ...data, createdAt: now() };
      messages.set(message.id, message);
      persist();
      return message;
    },

    findFirst(where: {
      id?: string;
      projectId?: string;
      role?: string;
      status?: string;
      userId?: string;
    }): DbMessage | null {
      for (const m of messages.values()) {
        if (where.id !== undefined && m.id !== where.id) continue;
        if (where.projectId !== undefined && m.projectId !== where.projectId) continue;
        if (where.role !== undefined && m.role !== where.role) continue;
        if (where.status !== undefined && m.status !== where.status) continue;
        if (where.userId !== undefined) {
          const p = projects.get(m.projectId);
          if (!p || p.userId !== where.userId) continue;
        }
        return m;
      }
      return null;
    },

    findMany(
      where: { projectId?: string; role?: string },
      orderBy: "asc" | "desc" = "asc",
    ): DbMessage[] {
      const result: DbMessage[] = [];
      for (const m of messages.values()) {
        if (where.projectId !== undefined && m.projectId !== where.projectId) continue;
        if (where.role !== undefined && m.role !== where.role) continue;
        result.push(m);
      }
      result.sort((a, b) => {
        const d = a.createdAt.getTime() - b.createdAt.getTime();
        return orderBy === "desc" ? -d : d;
      });
      return result;
    },

    update(id: string, data: Partial<DbMessage>): void {
      const m = messages.get(id);
      if (!m) return;
      Object.assign(m, data);
      persist();
    },
  },

  generation: {
    create(data: {
      id: string;
      projectId: string;
      variants: Array<{
        id: string;
        name: string;
        summary: string;
        brief: unknown;
        project: unknown;
        uiMap: unknown;
      }>;
    }): void {
      generations.set(data.id, { id: data.id, projectId: data.projectId, createdAt: now() });
      for (const v of data.variants) {
        variants.set(v.id, { ...v, generationId: data.id, createdAt: now() });
      }
      persist();
    },

    findFirst(where: { projectId?: string }): (DbGeneration & {
      variants: (DbVariant & { revisions: DbRevision[] })[];
    }) | null {
      let found: DbGeneration | null = null;
      for (const g of generations.values()) {
        if (where.projectId !== undefined && g.projectId !== where.projectId) continue;
        if (!found || g.createdAt > found.createdAt) found = g;
      }
      if (!found) return null;

      const genVariants: (DbVariant & { revisions: DbRevision[] })[] = [];
      for (const v of variants.values()) {
        if (v.generationId !== found.id) continue;
        const varRevisions: DbRevision[] = [];
        for (const r of revisions.values()) {
          if (r.variantId === v.id) varRevisions.push(r);
        }
        varRevisions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        genVariants.push({ ...v, revisions: varRevisions.slice(0, 1) });
      }

      return { ...found, variants: genVariants };
    },
  },

  variant: {
    findUnique(id: string): DbVariant | null {
      return variants.get(id) ?? null;
    },
  },

  revision: {
    create(data: {
      id: string;
      variantId: string;
      project: unknown;
      changedFiles: unknown;
      messageId?: string;
    }): void {
      revisions.set(data.id, {
        id: data.id,
        variantId: data.variantId,
        project: data.project,
        changedFiles: data.changedFiles,
        messageId: data.messageId ?? null,
        createdAt: now(),
      });
      persist();
    },

    findFirst(where: { variantId?: string }): DbRevision | null {
      let found: DbRevision | null = null;
      for (const r of revisions.values()) {
        if (where.variantId !== undefined && r.variantId !== where.variantId) continue;
        if (!found || r.createdAt > found.createdAt) found = r;
      }
      return found;
    },
  },
};
