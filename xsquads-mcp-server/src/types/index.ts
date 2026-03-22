export interface SquadAgent {
  id: string;
  filename: string;
  content: string;
}

export interface SquadTask {
  id: string;
  filename: string;
  content: string;
}

export interface SquadWorkflow {
  id: string;
  filename: string;
  content: string;
  parsed: Record<string, unknown> | null;
}

export interface SquadChecklist {
  id: string;
  filename: string;
  content: string;
}

export interface SquadDataFile {
  id: string;
  filename: string;
  content: string;
  parsed: Record<string, unknown> | null;
}

export interface SquadConfig {
  content: string;
  parsed: Record<string, unknown> | null;
}

export interface RoutingEntry {
  keywords: string[];
  primaryAgent: string;
  secondaryAgent: string;
  description: string;
}

export interface SquadMetadata {
  name: string;
  version: string;
  shortTitle: string;
  description: string;
  slashPrefix: string;
  tags: string[];
  author?: string;
  license?: string;
  entryAgent?: string;
}

export interface Squad {
  id: string;
  dirName: string;
  metadata: SquadMetadata;
  agents: SquadAgent[];
  tasks: SquadTask[];
  workflows: SquadWorkflow[];
  checklists: SquadChecklist[];
  dataFiles: SquadDataFile[];
  config: SquadConfig | null;
  readme: string | null;
  routingMatrix: Record<string, RoutingEntry>;
}

export interface SquadSuggestion {
  squadId: string;
  squadName: string;
  shortTitle: string;
  description: string;
  relevanceScore: number;
  matchedTags: string[];
  matchedRouting: string[];
}
