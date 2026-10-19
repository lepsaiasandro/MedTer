/** Tokenize a search query into lowercase words (supports Georgian + Latin). */
export function searchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,;.|/\\]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Multi-token, multi-field match: every token must appear in at least one field.
 * Empty query matches everything.
 */
export function matchesSearch(
  query: string,
  fields: Array<string | number | undefined | null>
): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;

  const haystack = fields
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
    .map((v) => String(v).toLowerCase())
    .join(" · ");

  if (!haystack) return false;
  return tokens.every((token) => haystack.includes(token));
}
