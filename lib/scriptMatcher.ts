import type { RoleDefinition } from './types';

// Common OCR substitutions to normalise before matching
const OCR_FIXES: [RegExp, string][] = [
  [/0/g, 'o'],
  [/1/g, 'l'],
  [/\|/g, 'l'],
  [/vv/g, 'w'],
  [/rn/g, 'm'],
  [/[^a-z ']/g, ' '],
];

function normalise(text: string): string {
  let t = text.toLowerCase();
  for (const [pattern, replacement] of OCR_FIXES) t = t.replace(pattern, replacement);
  return t;
}

/**
 * Given raw OCR text and the full roles database, return IDs of roles whose
 * names appear in the text, ordered by their position in the text (i.e. the
 * order they appear on the printed script).
 */
export function matchRolesFromText(
  ocrText: string,
  rolesDb: Record<string, RoleDefinition>,
): string[] {
  const haystack = normalise(ocrText);
  const matches: { id: string; pos: number }[] = [];

  for (const role of Object.values(rolesDb)) {
    if (!role.team) continue;
    const needle = normalise(role.name);
    if (needle.length < 3) continue;
    // Word-boundary regex: prevents "Imp" matching inside "Important" etc.
    const pattern = new RegExp(`(?<![a-z])${needle.replace(/ +/g, ' +')}(?![a-z])`);
    const m = pattern.exec(haystack);
    if (m) {
      matches.push({ id: role.id, pos: m.index });
    }
  }

  return matches.sort((a, b) => a.pos - b.pos).map(m => m.id);
}
