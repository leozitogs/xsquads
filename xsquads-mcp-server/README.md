# XSquads MCP Server

A production-ready Model Context Protocol (MCP) server that exposes the [XSquads](https://github.com/leozitogs/xsquads) repository as structured AI capabilities.

This server bridges the gap between the static file structure of the XSquads repository and dynamic AI clients (like Claude Desktop, Cursor, etc.), allowing them to discover, inspect, and activate specialized AI squads seamlessly.

## Features

- **Dynamic Loading**: Automatically parses the `xsquads` repository structure, reading `squad.yaml`, `config.yaml`, agents, tasks, workflows, and checklists.
- **MCP Tools**:
  - `listSquads`: Browse available squads.
  - `getSquad`: Deep dive into a squad's capabilities.
  - `suggestSquad`: Get AI-driven routing recommendations based on your objective.
  - `activateSquad`: Generate a complete activation prompt for a specific squad.
  - `combineSquads`: Orchestrate multiple squads for complex cross-domain tasks.
  - `listSquadFiles` & `getSquadWorkflow`: Inspect internal squad files.
- **MCP Resources**: Exposes all squad files (agents, tasks, workflows, checklists, data, configs) as readable `xsquads://` URIs.
- **MCP Prompts**: Provides ready-to-use prompts for activating specific squads, diagnosing challenges, or combining multiple squads.

## Architecture

The server is built using the official `@modelcontextprotocol/sdk` (v1.x) and follows a clean, modular architecture:

```
src/
├── core/
│   ├── prompt-builder.ts  # Logic for assembling complex activation prompts
│   └── squad-registry.ts  # In-memory database of loaded squads
├── loaders/
│   └── squad-loader.ts    # File system parser for the xsquads structure
├── prompts/
│   └── register-prompts.ts # MCP Prompts registration
├── resources/
│   └── register-resources.ts # MCP Resources registration
├── tools/
│   └── register-tools.ts  # MCP Tools registration
├── types/
│   └── index.ts           # TypeScript interfaces
├── utils/
│   ├── text.ts            # Text processing and tokenization
│   └── yaml-parser.ts     # Safe YAML parsing
└── index.ts               # Main entry point and stdio transport setup
```

### Assumptions Made

1. **Squad Structure**: Assumes squads follow the standard folder structure (`agents/`, `tasks/`, `workflows/`, `checklists/`, `data/`, `config/`).
2. **Metadata**: Assumes metadata is located in `squad.yaml` or `config/config.yaml`. If neither exists, it falls back to using the directory name.
3. **Routing**: Assumes routing logic is defined in `squad.yaml` under `routing_matrix` or in `data/routing-catalog.yaml`.
4. **Orchestrators**: Assumes the orchestrator agent file contains "chief", "orchestrator", or "architect" in its filename.

## Installation

1. Clone this repository inside or alongside your `xsquads` repository.
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Configuration

The server needs to know where your `xsquads` repository is located. By default, it assumes the server is located inside the `xsquads` repository (e.g., `xsquads/mcp-server/`).

If it's located elsewhere, set the `XSQUADS_ROOT` environment variable:

```bash
export XSQUADS_ROOT=/path/to/your/xsquads
```

## Usage

### Local Development

Run the server directly using `tsx`:

```bash
npm run dev
```

### Production

Run the compiled JavaScript:

```bash
npm start
```

### Integrating with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "xsquads": {
      "command": "node",
      "args": ["/path/to/xsquads-mcp-server/dist/index.js"],
      "env": {
        "XSQUADS_ROOT": "/path/to/your/xsquads"
      }
    }
  }
}
```

## Extending the Server

To add new capabilities:
1. **Tools**: Add new tool definitions in `src/tools/register-tools.ts`.
2. **Resources**: Add new resource templates in `src/resources/register-resources.ts`.
3. **Prompts**: Add new prompt templates in `src/prompts/register-prompts.ts`.
4. **Loaders**: If you add new folder types to the `xsquads` repo, update `src/loaders/squad-loader.ts` to parse them.
