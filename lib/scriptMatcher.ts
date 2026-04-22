import type { RoleDefinition } from './types';

// Common OCR substitutions to normalise before matching
const OCR_FIXES: [RegExp, string][] = [
  [/0/g, 'o'],
  [/1/g, 'l'],
  [/\|/g, 'l'],
  [/[^a-z ]/g, ' '],
];

function normalise(text: string): string {
  let t = text.toLowerCase();
  for (const [pattern, replacement] of OCR_FIXES) t = t.replace(pattern, replacement);
  return t;
}

/**
 * Given raw OCR text and the full roles database, return IDs of roles whose
 * names appear in the text.  Uses normalised substring matching, so minor OCR
 * noise (extra spaces, punctuation) is tolerated.
 */
export function matchRolesFromText(
  ocrText: string,
  rolesDb: Record<string, RoleDefinition>,
): string[] {
  const haystack = normalise(ocrText);
  const matched: string[] = [];

  for (const role of Object.values(rolesDb)) {
    if (!role.team) continue; // skip special entries
    const needle = normalise(role.name);
    if (needle.length < 3) continue; // skip very short names to avoid false positives
    if (haystack.includes(needle)) {
      matched.push(role.id);
    }
  }

  return matched;
}
