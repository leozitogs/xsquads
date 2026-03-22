/**
 * Converts a filename stem into a human-readable ID.
 * Example: "brand-chief.md" -> "brand-chief"
 */
export function filenameToId(filename: string): string {
  return filename.replace(/\.(md|yaml|yml|json)$/, "");
}

/**
 * Converts a directory name into a display-friendly title.
 * Example: "brand-squad" -> "Brand Squad"
 */
export function dirNameToTitle(dirName: string): string {
  return dirName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Tokenizes an input string into lowercase keywords for matching.
 */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
