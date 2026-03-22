import type { Squad, SquadSuggestion } from "../types/index.js";
import { tokenize } from "../utils/text.js";

export class SquadRegistry {
  private squads: Map<string, Squad> = new Map();

  register(squad: Squad): void {
    this.squads.set(squad.id, squad);
  }

  registerAll(squads: Squad[]): void {
    for (const squad of squads) {
      this.register(squad);
    }
  }

  get(id: string): Squad | undefined {
    return this.squads.get(id);
  }

  getAll(): Squad[] {
    return Array.from(this.squads.values());
  }

  listIds(): string[] {
    return Array.from(this.squads.keys());
  }

  get size(): number {
    return this.squads.size;
  }

  /**
   * Suggests the best squads for a given objective by scoring against
   * tags, routing keywords, description, and agent names.
   */
  suggest(objective: string, maxResults: number = 3): SquadSuggestion[] {
    const tokens = tokenize(objective);
    if (tokens.length === 0) return [];

    const suggestions: SquadSuggestion[] = [];

    for (const squad of this.squads.values()) {
      let score = 0;
      const matchedTags: string[] = [];
      const matchedRouting: string[] = [];

      // Score against tags
      for (const tag of squad.metadata.tags) {
        const tagTokens = tokenize(tag);
        for (const token of tokens) {
          if (tagTokens.some((tt) => tt.includes(token) || token.includes(tt))) {
            score += 3;
            if (!matchedTags.includes(tag)) matchedTags.push(tag);
          }
        }
      }

      // Score against routing matrix keywords
      for (const [domain, entry] of Object.entries(squad.routingMatrix)) {
        for (const keyword of entry.keywords) {
          const kwTokens = tokenize(keyword);
          for (const token of tokens) {
            if (kwTokens.some((kt) => kt.includes(token) || token.includes(kt))) {
              score += 4;
              if (!matchedRouting.includes(domain)) matchedRouting.push(domain);
            }
          }
        }
      }

      // Score against description
      const descTokens = tokenize(squad.metadata.description);
      for (const token of tokens) {
        if (descTokens.includes(token)) {
          score += 2;
        }
      }

      // Score against squad name
      const nameTokens = tokenize(squad.metadata.name);
      for (const token of tokens) {
        if (nameTokens.some((nt) => nt.includes(token) || token.includes(nt))) {
          score += 5;
        }
      }

      // Score against agent names
      for (const agent of squad.agents) {
        const agentTokens = tokenize(agent.id);
        for (const token of tokens) {
          if (agentTokens.some((at) => at.includes(token) || token.includes(at))) {
            score += 2;
          }
        }
      }

      if (score > 0) {
        suggestions.push({
          squadId: squad.id,
          squadName: squad.metadata.name,
          shortTitle: squad.metadata.shortTitle,
          description: squad.metadata.description,
          relevanceScore: score,
          matchedTags,
          matchedRouting,
        });
      }
    }

    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }
}
