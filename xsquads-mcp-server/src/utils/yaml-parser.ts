import { parse as parseYaml } from "yaml";

export function safeParseYaml(content: string): Record<string, unknown> | null {
  try {
    const result = parseYaml(content);
    if (result && typeof result === "object") {
      return result as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
