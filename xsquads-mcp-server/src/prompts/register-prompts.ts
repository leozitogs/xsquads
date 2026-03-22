import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SquadRegistry } from "../core/squad-registry.js";
import {
  buildActivationPrompt,
  buildCombinedPrompt,
} from "../core/prompt-builder.js";

export function registerPrompts(
  server: McpServer,
  registry: SquadRegistry
): void {
  // Register a dynamic activation prompt for each squad
  for (const squad of registry.getAll()) {
    server.prompt(
      `activate-${squad.id}`,
      `Activate the ${squad.metadata.shortTitle} — ${squad.metadata.description}`,
      {
        objective: z
          .string()
          .describe("Your objective or challenge for this squad"),
        context: z
          .string()
          .optional()
          .describe("Additional context (project details, constraints, etc.)"),
      },
      ({ objective, context }) => {
        const prompt = buildActivationPrompt(squad, objective, context);
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `${prompt.systemMessage}\n\n---\n\n${prompt.userMessage}`,
              },
            },
          ],
        };
      }
    );
  }

  // Register a generic squad activation prompt
  server.prompt(
    "activate-squad",
    "Activate any squad by ID with an objective and optional context",
    {
      squadId: z
        .string()
        .describe("The squad identifier (e.g. 'brand-squad')"),
      objective: z
        .string()
        .describe("Your objective or challenge"),
      context: z
        .string()
        .optional()
        .describe("Additional context"),
    },
    ({ squadId, objective, context }) => {
      const squad = registry.get(squadId);
      if (!squad) {
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Squad "${squadId}" not found. Available squads: ${registry.listIds().join(", ")}`,
              },
            },
          ],
        };
      }

      const prompt = buildActivationPrompt(squad, objective, context);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${prompt.systemMessage}\n\n---\n\n${prompt.userMessage}`,
            },
          },
        ],
      };
    }
  );

  // Register a multi-squad combination prompt
  server.prompt(
    "combine-squads",
    "Activate multiple squads together for a complex multi-domain objective",
    {
      squadIds: z
        .string()
        .describe(
          "Comma-separated list of squad IDs (e.g. 'brand-squad,copy-squad,storytelling')"
        ),
      objective: z
        .string()
        .describe("Your objective or challenge"),
      context: z
        .string()
        .optional()
        .describe("Additional context"),
    },
    ({ squadIds, objective, context }) => {
      const ids = squadIds.split(",").map((id) => id.trim());
      const squads = ids
        .map((id) => registry.get(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);

      if (squads.length === 0) {
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `No valid squads found. Available: ${registry.listIds().join(", ")}`,
              },
            },
          ],
        };
      }

      const prompt = buildCombinedPrompt(squads, objective, context);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${prompt.systemMessage}\n\n---\n\n${prompt.userMessage}`,
            },
          },
        ],
      };
    }
  );

  // Register a diagnostic prompt
  server.prompt(
    "diagnose",
    "Diagnose a challenge and get routed to the best squad and specialist",
    {
      challenge: z
        .string()
        .describe("Describe your challenge or problem in detail"),
    },
    ({ challenge }) => {
      const suggestions = registry.suggest(challenge, 3);

      let responseText: string;
      if (suggestions.length === 0) {
        responseText = [
          "# Squad Diagnostic",
          "",
          "No matching squads found for your challenge.",
          "",
          `Available squads: ${registry.listIds().join(", ")}`,
          "",
          "Please try rephrasing your challenge or browse the available squads.",
        ].join("\n");
      } else {
        const parts = [
          "# Squad Diagnostic",
          "",
          `**Challenge:** ${challenge}`,
          "",
          "## Recommended Squads",
          "",
        ];

        for (const suggestion of suggestions) {
          parts.push(`### ${suggestion.shortTitle} (score: ${suggestion.relevanceScore})`);
          parts.push(suggestion.description);
          parts.push("");
          if (suggestion.matchedTags.length > 0) {
            parts.push(`**Matched tags:** ${suggestion.matchedTags.join(", ")}`);
          }
          if (suggestion.matchedRouting.length > 0) {
            parts.push(
              `**Matched routing domains:** ${suggestion.matchedRouting.join(", ")}`
            );
          }
          parts.push("");
        }

        parts.push("## Next Steps");
        parts.push("");
        parts.push(
          `Use \`activate-${suggestions[0].squadId}\` to activate the top recommended squad, or use \`combine-squads\` if multiple squads are relevant.`
        );

        responseText = parts.join("\n");
      }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: responseText,
            },
          },
        ],
      };
    }
  );
}
