import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SquadRegistry } from "../core/squad-registry.js";
import {
  buildActivationPrompt,
  buildCombinedPrompt,
} from "../core/prompt-builder.js";

export function registerTools(
  server: McpServer,
  registry: SquadRegistry
): void {
  // ─── listSquads ──────────────────────────────────────────────────────
  server.tool(
    "listSquads",
    "List all available XSquads with their metadata summary",
    {},
    async () => {
      const squads = registry.getAll();
      const list = squads.map((s) => ({
        id: s.id,
        name: s.metadata.name,
        shortTitle: s.metadata.shortTitle,
        description: s.metadata.description,
        tags: s.metadata.tags,
        agentCount: s.agents.length,
        taskCount: s.tasks.length,
        workflowCount: s.workflows.length,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(list, null, 2),
          },
        ],
      };
    }
  );

  // ─── getSquad ────────────────────────────────────────────────────────
  server.tool(
    "getSquad",
    "Get detailed information about a specific squad including agents, tasks, workflows, and routing",
    {
      squadId: z
        .string()
        .describe("The squad identifier (e.g. 'brand-squad', 'copy-squad')"),
    },
    async ({ squadId }) => {
      const squad = registry.get(squadId);
      if (!squad) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Squad "${squadId}" not found. Use listSquads to see available squads.`,
            },
          ],
          isError: true,
        };
      }

      const detail = {
        id: squad.id,
        metadata: squad.metadata,
        agents: squad.agents.map((a) => ({
          id: a.id,
          filename: a.filename,
        })),
        tasks: squad.tasks.map((t) => ({
          id: t.id,
          filename: t.filename,
        })),
        workflows: squad.workflows.map((w) => ({
          id: w.id,
          filename: w.filename,
          parsed: w.parsed
            ? {
                name: (w.parsed.workflow as Record<string, unknown>)?.name,
                trigger: (w.parsed.workflow as Record<string, unknown>)?.trigger,
                type: (w.parsed.workflow as Record<string, unknown>)?.type,
              }
            : null,
        })),
        checklists: squad.checklists.map((c) => c.id),
        dataFiles: squad.dataFiles.map((d) => d.id),
        routingMatrix: squad.routingMatrix,
        hasReadme: squad.readme !== null,
        hasConfig: squad.config !== null,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(detail, null, 2),
          },
        ],
      };
    }
  );

  // ─── suggestSquad ────────────────────────────────────────────────────
  server.tool(
    "suggestSquad",
    "Suggest the best squad(s) for a given objective by analyzing tags, routing keywords, and descriptions",
    {
      objective: z
        .string()
        .describe("The user's objective or challenge description"),
      maxResults: z
        .number()
        .optional()
        .describe("Maximum number of suggestions to return (default: 3)"),
    },
    async ({ objective, maxResults }) => {
      const suggestions = registry.suggest(objective, maxResults ?? 3);

      if (suggestions.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No matching squads found for the given objective. Try rephrasing or use listSquads to browse all available squads.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(suggestions, null, 2),
          },
        ],
      };
    }
  );

  // ─── activateSquad ───────────────────────────────────────────────────
  server.tool(
    "activateSquad",
    "Activate a squad by generating a full activation prompt with the orchestrator, specialists, tasks, and workflows ready for execution",
    {
      squadId: z
        .string()
        .describe("The squad identifier to activate"),
      objective: z
        .string()
        .describe("The user's objective or challenge"),
      context: z
        .string()
        .optional()
        .describe("Additional context about the project, brand, or situation"),
    },
    async ({ squadId, objective, context }) => {
      const squad = registry.get(squadId);
      if (!squad) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Squad "${squadId}" not found. Use listSquads to see available squads.`,
            },
          ],
          isError: true,
        };
      }

      const prompt = buildActivationPrompt(squad, objective, context);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                squadId: squad.id,
                squadName: squad.metadata.shortTitle,
                activation: {
                  systemMessage: prompt.systemMessage,
                  userMessage: prompt.userMessage,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── combineSquads ───────────────────────────────────────────────────
  server.tool(
    "combineSquads",
    "Combine multiple squads into a coordinated multi-squad activation prompt for complex objectives",
    {
      squadIds: z
        .array(z.string())
        .describe("Array of squad identifiers to combine"),
      objective: z
        .string()
        .describe("The user's objective or challenge"),
      context: z
        .string()
        .optional()
        .describe("Additional context about the project"),
    },
    async ({ squadIds, objective, context }) => {
      const squads = [];
      const notFound: string[] = [];

      for (const id of squadIds) {
        const squad = registry.get(id);
        if (squad) {
          squads.push(squad);
        } else {
          notFound.push(id);
        }
      }

      if (squads.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `None of the specified squads were found: ${notFound.join(", ")}. Use listSquads to see available squads.`,
            },
          ],
          isError: true,
        };
      }

      const prompt = buildCombinedPrompt(squads, objective, context);

      const result: Record<string, unknown> = {
        activatedSquads: squads.map((s) => s.id),
        activation: {
          systemMessage: prompt.systemMessage,
          userMessage: prompt.userMessage,
        },
      };

      if (notFound.length > 0) {
        result.warnings = [`Squads not found: ${notFound.join(", ")}`];
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // ─── listSquadFiles ──────────────────────────────────────────────────
  server.tool(
    "listSquadFiles",
    "List all files within a squad organized by category (agents, tasks, workflows, checklists, data)",
    {
      squadId: z.string().describe("The squad identifier"),
    },
    async ({ squadId }) => {
      const squad = registry.get(squadId);
      if (!squad) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Squad "${squadId}" not found.`,
            },
          ],
          isError: true,
        };
      }

      const files = {
        squadId: squad.id,
        agents: squad.agents.map((a) => ({
          id: a.id,
          filename: a.filename,
        })),
        tasks: squad.tasks.map((t) => ({
          id: t.id,
          filename: t.filename,
        })),
        workflows: squad.workflows.map((w) => ({
          id: w.id,
          filename: w.filename,
        })),
        checklists: squad.checklists.map((c) => ({
          id: c.id,
          filename: c.filename,
        })),
        dataFiles: squad.dataFiles.map((d) => ({
          id: d.id,
          filename: d.filename,
        })),
        hasReadme: squad.readme !== null,
        hasConfig: squad.config !== null,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    }
  );

  // ─── getSquadWorkflow ────────────────────────────────────────────────
  server.tool(
    "getSquadWorkflow",
    "Get the full definition of a specific workflow within a squad, including phases, agents, and completion criteria",
    {
      squadId: z.string().describe("The squad identifier"),
      workflowId: z
        .string()
        .describe("The workflow identifier (e.g. 'wf-brand-creation')"),
    },
    async ({ squadId, workflowId }) => {
      const squad = registry.get(squadId);
      if (!squad) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Squad "${squadId}" not found.`,
            },
          ],
          isError: true,
        };
      }

      const workflow = squad.workflows.find((w) => w.id === workflowId);
      if (!workflow) {
        const available = squad.workflows.map((w) => w.id).join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `Workflow "${workflowId}" not found in squad "${squadId}". Available: ${available || "none"}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: workflow.content,
          },
        ],
      };
    }
  );
}
