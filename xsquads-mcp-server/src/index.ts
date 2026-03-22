#!/usr/bin/env node

import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadAllSquads } from "./loaders/squad-loader.js";
import { SquadRegistry } from "./core/squad-registry.js";
import { registerTools } from "./tools/register-tools.js";
import { registerResources } from "./resources/register-resources.js";
import { registerPrompts } from "./prompts/register-prompts.js";

const SQUADS_ROOT = process.env.XSQUADS_ROOT || resolve(process.cwd(), "..");

async function main(): Promise<void> {
  const squadsRoot = resolve(SQUADS_ROOT);

  // Load all squads from the filesystem
  const squads = await loadAllSquads(squadsRoot);

  if (squads.length === 0) {
    console.error(
      `[xsquads-mcp] No squads found at "${squadsRoot}". ` +
        `Set XSQUADS_ROOT to the path of your xsquads repository.`
    );
    process.exit(1);
  }

  console.error(
    `[xsquads-mcp] Loaded ${squads.length} squads from "${squadsRoot}": ` +
      squads.map((s) => s.id).join(", ")
  );

  // Initialize the registry
  const registry = new SquadRegistry();
  registry.registerAll(squads);

  // Create the MCP server
  const server = new McpServer({
    name: "xsquads-mcp-server",
    version: "1.0.0",
  });

  // Register all MCP primitives
  registerTools(server, registry);
  registerResources(server, registry);
  registerPrompts(server, registry);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[xsquads-mcp] Server running on stdio transport");
}

main().catch((err) => {
  console.error("[xsquads-mcp] Fatal error:", err);
  process.exit(1);
});
