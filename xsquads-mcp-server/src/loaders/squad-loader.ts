import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { safeParseYaml } from "../utils/yaml-parser.js";
import { filenameToId, dirNameToTitle } from "../utils/text.js";
import type {
  Squad,
  SquadMetadata,
  SquadAgent,
  SquadTask,
  SquadWorkflow,
  SquadChecklist,
  SquadDataFile,
  SquadConfig,
  RoutingEntry,
} from "../types/index.js";

const IGNORED_DIRS = new Set(["_example", ".git", "node_modules", "dist"]);

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function readTextFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function loadFilesFromDir(
  dirPath: string,
  extensions: string[] = [".md", ".yaml", ".yml"]
): Promise<Array<{ filename: string; content: string }>> {
  if (!(await dirExists(dirPath))) return [];

  const entries = await readdir(dirPath);
  const results: Array<{ filename: string; content: string }> = [];

  for (const entry of entries.sort()) {
    const ext = entry.substring(entry.lastIndexOf("."));
    if (!extensions.includes(ext)) continue;

    const content = await readTextFile(join(dirPath, entry));
    if (content !== null) {
      results.push({ filename: entry, content });
    }
  }

  return results;
}

function extractMetadataFromSquadYaml(
  parsed: Record<string, unknown>,
  dirName: string
): SquadMetadata {
  return {
    name: (parsed.name as string) || dirName,
    version: (parsed.version as string) || "1.0.0",
    shortTitle: (parsed["short-title"] as string) || dirNameToTitle(dirName),
    description: (parsed.description as string) || "",
    slashPrefix: (parsed.slashPrefix as string) || dirName,
    tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
    author: parsed.author as string | undefined,
    license: parsed.license as string | undefined,
    entryAgent: undefined,
  };
}

function extractMetadataFromConfigYaml(
  parsed: Record<string, unknown>,
  dirName: string
): SquadMetadata {
  const squad = (parsed.squad as Record<string, unknown>) || {};
  return {
    name: (squad.name as string) || dirName,
    version: (squad.version as string) || "1.0.0",
    shortTitle:
      (squad.display_name as string) || dirNameToTitle(dirName),
    description: (squad.description as string) || "",
    slashPrefix: (squad.name as string) || dirName,
    tags: Array.isArray(squad.keywords) ? (squad.keywords as string[]) : [],
    author: squad.created_by as string | undefined,
    license: undefined,
    entryAgent: squad.entry_agent as string | undefined,
  };
}

function extractRoutingMatrix(
  parsed: Record<string, unknown>
): Record<string, RoutingEntry> {
  const matrix: Record<string, RoutingEntry> = {};
  const rm = parsed.routing_matrix as Record<string, unknown> | undefined;
  if (!rm || typeof rm !== "object") return matrix;

  for (const [key, value] of Object.entries(rm)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    matrix[key] = {
      keywords: Array.isArray(entry.triggers)
        ? (entry.triggers as string[])
        : [],
      primaryAgent: (entry.primary as string) || "",
      secondaryAgent: (entry.secondary as string) || "",
      description: (entry.description as string) || key,
    };
  }

  return matrix;
}

function extractRoutingFromData(
  parsed: Record<string, unknown>
): Record<string, RoutingEntry> {
  const matrix: Record<string, RoutingEntry> = {};
  const domains = parsed.domains as Record<string, unknown> | undefined;
  if (!domains || typeof domains !== "object") return matrix;

  for (const [key, value] of Object.entries(domains)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    matrix[key] = {
      keywords: Array.isArray(entry.keywords)
        ? (entry.keywords as string[])
        : [],
      primaryAgent: (entry.primary_agent as string) || "",
      secondaryAgent: (entry.secondary_agent as string) || "",
      description: (entry.description as string) || key,
    };
  }

  return matrix;
}

async function loadSingleSquad(
  squadsRoot: string,
  dirName: string
): Promise<Squad | null> {
  const squadDir = join(squadsRoot, dirName);

  // Load metadata from squad.yaml or config.yaml
  let metadata: SquadMetadata;
  let routingMatrix: Record<string, RoutingEntry> = {};

  const squadYamlContent = await readTextFile(join(squadDir, "squad.yaml"));
  const configYamlContent =
    (await readTextFile(join(squadDir, "config.yaml"))) ||
    (await readTextFile(join(squadDir, "config", "config.yaml")));

  if (squadYamlContent) {
    const parsed = safeParseYaml(squadYamlContent);
    if (parsed) {
      metadata = extractMetadataFromSquadYaml(parsed, dirName);
      routingMatrix = extractRoutingMatrix(parsed);
    } else {
      metadata = {
        name: dirName,
        version: "1.0.0",
        shortTitle: dirNameToTitle(dirName),
        description: "",
        slashPrefix: dirName,
        tags: [],
      };
    }
  } else if (configYamlContent) {
    const parsed = safeParseYaml(configYamlContent);
    if (parsed) {
      metadata = extractMetadataFromConfigYaml(parsed, dirName);
    } else {
      metadata = {
        name: dirName,
        version: "1.0.0",
        shortTitle: dirNameToTitle(dirName),
        description: "",
        slashPrefix: dirName,
        tags: [],
      };
    }
  } else {
    // No metadata file found — still try to load the squad
    metadata = {
      name: dirName,
      version: "1.0.0",
      shortTitle: dirNameToTitle(dirName),
      description: "",
      slashPrefix: dirName,
      tags: [],
    };
  }

  // Load agents
  const agentFiles = await loadFilesFromDir(join(squadDir, "agents"));
  const agents: SquadAgent[] = agentFiles.map((f) => ({
    id: filenameToId(f.filename),
    filename: f.filename,
    content: f.content,
  }));

  // Load tasks
  const taskFiles = await loadFilesFromDir(join(squadDir, "tasks"));
  const tasks: SquadTask[] = taskFiles.map((f) => ({
    id: filenameToId(f.filename),
    filename: f.filename,
    content: f.content,
  }));

  // Load workflows
  const workflowFiles = await loadFilesFromDir(join(squadDir, "workflows"), [
    ".yaml",
    ".yml",
  ]);
  const workflows: SquadWorkflow[] = workflowFiles.map((f) => ({
    id: filenameToId(f.filename),
    filename: f.filename,
    content: f.content,
    parsed: safeParseYaml(f.content),
  }));

  // Load checklists
  const checklistFiles = await loadFilesFromDir(join(squadDir, "checklists"));
  const checklists: SquadChecklist[] = checklistFiles.map((f) => ({
    id: filenameToId(f.filename),
    filename: f.filename,
    content: f.content,
  }));

  // Load data files
  const dataFiles: SquadDataFile[] = [];
  const dataDir = join(squadDir, "data");
  if (await dirExists(dataDir)) {
    const files = await loadFilesFromDir(dataDir, [
      ".yaml",
      ".yml",
      ".md",
      ".json",
    ]);
    for (const f of files) {
      const parsed =
        f.filename.endsWith(".yaml") || f.filename.endsWith(".yml")
          ? safeParseYaml(f.content)
          : null;
      dataFiles.push({
        id: filenameToId(f.filename),
        filename: f.filename,
        content: f.content,
        parsed,
      });

      // Try to extract routing from routing-catalog.yaml
      if (
        f.filename.includes("routing-catalog") &&
        parsed &&
        Object.keys(routingMatrix).length === 0
      ) {
        routingMatrix = extractRoutingFromData(parsed);
      }
    }
  }

  // Load config
  let config: SquadConfig | null = null;
  if (configYamlContent) {
    config = {
      content: configYamlContent,
      parsed: safeParseYaml(configYamlContent),
    };
  } else {
    const configDirContent = await readTextFile(
      join(squadDir, "config", "config.yaml")
    );
    if (configDirContent) {
      config = {
        content: configDirContent,
        parsed: safeParseYaml(configDirContent),
      };
    }
  }

  // Load README
  const readme = await readTextFile(join(squadDir, "README.md"));

  // Must have at least agents or tasks to be considered a valid squad
  if (agents.length === 0 && tasks.length === 0) {
    return null;
  }

  return {
    id: dirName,
    dirName,
    metadata,
    agents,
    tasks,
    workflows,
    checklists,
    dataFiles,
    config,
    readme,
    routingMatrix,
  };
}

export async function loadAllSquads(squadsRoot: string): Promise<Squad[]> {
  const entries = await readdir(squadsRoot);
  const squads: Squad[] = [];

  for (const entry of entries.sort()) {
    if (IGNORED_DIRS.has(entry)) continue;
    if (entry.startsWith(".")) continue;

    const fullPath = join(squadsRoot, entry);
    if (!(await dirExists(fullPath))) continue;

    const squad = await loadSingleSquad(squadsRoot, entry);
    if (squad) {
      squads.push(squad);
    }
  }

  return squads;
}
