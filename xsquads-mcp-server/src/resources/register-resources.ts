import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SquadRegistry } from "../core/squad-registry.js";

export function registerResources(
  server: McpServer,
  registry: SquadRegistry
): void {
  // ─── Squad README ────────────────────────────────────────────────────
  server.resource(
    "squad-readme",
    new ResourceTemplate("xsquads://squads/{squadId}/readme", {
      list: async () => ({
        resources: registry
          .getAll()
          .filter((s) => s.readme !== null)
          .map((s) => ({
            uri: `xsquads://squads/${s.id}/readme`,
            name: `${s.metadata.shortTitle} — README`,
            mimeType: "text/markdown" as const,
          })),
      }),
    }),
    {
      description: "README documentation for a squad",
      mimeType: "text/markdown",
    },
    async (uri, { squadId }) => {
      const squad = registry.get(squadId as string);
      if (!squad || !squad.readme) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `README not found for squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: squad.readme }],
      };
    }
  );

  // ─── Squad Configuration (squad.yaml / config.yaml) ─────────────────
  server.resource(
    "squad-config",
    new ResourceTemplate("xsquads://squads/{squadId}/config", {
      list: async () => ({
        resources: registry
          .getAll()
          .filter((s) => s.config !== null)
          .map((s) => ({
            uri: `xsquads://squads/${s.id}/config`,
            name: `${s.metadata.shortTitle} — Configuration`,
            mimeType: "text/yaml" as const,
          })),
      }),
    }),
    {
      description: "Configuration file for a squad (squad.yaml or config.yaml)",
      mimeType: "text/yaml",
    },
    async (uri, { squadId }) => {
      const squad = registry.get(squadId as string);
      if (!squad || !squad.config) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Config not found for squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: squad.config.content }],
      };
    }
  );

  // ─── Agent Definitions ───────────────────────────────────────────────
  server.resource(
    "squad-agent",
    new ResourceTemplate("xsquads://squads/{squadId}/agents/{agentId}", {
      list: async () => ({
        resources: registry.getAll().flatMap((s) =>
          s.agents.map((a) => ({
            uri: `xsquads://squads/${s.id}/agents/${a.id}`,
            name: `${s.metadata.shortTitle} — Agent: ${a.id}`,
            mimeType: "text/markdown" as const,
          }))
        ),
      }),
    }),
    {
      description:
        "Agent definition file containing persona, routing, and behavior instructions",
      mimeType: "text/markdown",
    },
    async (uri, { squadId, agentId }) => {
      const squad = registry.get(squadId as string);
      if (!squad) {
        return {
          contents: [
            { uri: uri.href, text: `Squad "${squadId}" not found.` },
          ],
        };
      }
      const agent = squad.agents.find((a) => a.id === agentId);
      if (!agent) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Agent "${agentId}" not found in squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: agent.content }],
      };
    }
  );

  // ─── Task Definitions ────────────────────────────────────────────────
  server.resource(
    "squad-task",
    new ResourceTemplate("xsquads://squads/{squadId}/tasks/{taskId}", {
      list: async () => ({
        resources: registry.getAll().flatMap((s) =>
          s.tasks.map((t) => ({
            uri: `xsquads://squads/${s.id}/tasks/${t.id}`,
            name: `${s.metadata.shortTitle} — Task: ${t.id}`,
            mimeType: "text/markdown" as const,
          }))
        ),
      }),
    }),
    {
      description: "Task definition with inputs, outputs, and execution steps",
      mimeType: "text/markdown",
    },
    async (uri, { squadId, taskId }) => {
      const squad = registry.get(squadId as string);
      if (!squad) {
        return {
          contents: [
            { uri: uri.href, text: `Squad "${squadId}" not found.` },
          ],
        };
      }
      const task = squad.tasks.find((t) => t.id === taskId);
      if (!task) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Task "${taskId}" not found in squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: task.content }],
      };
    }
  );

  // ─── Workflow Definitions ────────────────────────────────────────────
  server.resource(
    "squad-workflow",
    new ResourceTemplate(
      "xsquads://squads/{squadId}/workflows/{workflowId}",
      {
        list: async () => ({
          resources: registry.getAll().flatMap((s) =>
            s.workflows.map((w) => ({
              uri: `xsquads://squads/${s.id}/workflows/${w.id}`,
              name: `${s.metadata.shortTitle} — Workflow: ${w.id}`,
              mimeType: "text/yaml" as const,
            }))
          ),
        }),
      }
    ),
    {
      description:
        "Workflow definition with phases, agent routing, and completion criteria",
      mimeType: "text/yaml",
    },
    async (uri, { squadId, workflowId }) => {
      const squad = registry.get(squadId as string);
      if (!squad) {
        return {
          contents: [
            { uri: uri.href, text: `Squad "${squadId}" not found.` },
          ],
        };
      }
      const workflow = squad.workflows.find((w) => w.id === workflowId);
      if (!workflow) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Workflow "${workflowId}" not found in squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: workflow.content }],
      };
    }
  );

  // ─── Checklist Definitions ───────────────────────────────────────────
  server.resource(
    "squad-checklist",
    new ResourceTemplate(
      "xsquads://squads/{squadId}/checklists/{checklistId}",
      {
        list: async () => ({
          resources: registry.getAll().flatMap((s) =>
            s.checklists.map((c) => ({
              uri: `xsquads://squads/${s.id}/checklists/${c.id}`,
              name: `${s.metadata.shortTitle} — Checklist: ${c.id}`,
              mimeType: "text/markdown" as const,
            }))
          ),
        }),
      }
    ),
    {
      description: "Quality checklist for validating squad outputs",
      mimeType: "text/markdown",
    },
    async (uri, { squadId, checklistId }) => {
      const squad = registry.get(squadId as string);
      if (!squad) {
        return {
          contents: [
            { uri: uri.href, text: `Squad "${squadId}" not found.` },
          ],
        };
      }
      const checklist = squad.checklists.find((c) => c.id === checklistId);
      if (!checklist) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Checklist "${checklistId}" not found in squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: checklist.content }],
      };
    }
  );

  // ─── Data Files ──────────────────────────────────────────────────────
  server.resource(
    "squad-data",
    new ResourceTemplate("xsquads://squads/{squadId}/data/{dataId}", {
      list: async () => ({
        resources: registry.getAll().flatMap((s) =>
          s.dataFiles.map((d) => ({
            uri: `xsquads://squads/${s.id}/data/${d.id}`,
            name: `${s.metadata.shortTitle} — Data: ${d.id}`,
            mimeType: d.filename.endsWith(".yaml") || d.filename.endsWith(".yml")
              ? ("text/yaml" as const)
              : ("text/markdown" as const),
          }))
        ),
      }),
    }),
    {
      description:
        "Supporting data files (frameworks, routing catalogs, benchmarks)",
      mimeType: "text/plain",
    },
    async (uri, { squadId, dataId }) => {
      const squad = registry.get(squadId as string);
      if (!squad) {
        return {
          contents: [
            { uri: uri.href, text: `Squad "${squadId}" not found.` },
          ],
        };
      }
      const dataFile = squad.dataFiles.find((d) => d.id === dataId);
      if (!dataFile) {
        return {
          contents: [
            {
              uri: uri.href,
              text: `Data file "${dataId}" not found in squad "${squadId}".`,
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, text: dataFile.content }],
      };
    }
  );
}
