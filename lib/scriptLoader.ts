import type { RoleDefinition, ParsedScript } from './types';
import { normalizeRoleId } from './roles';

interface RawScriptEntry {
  id: string;
  name?: string;
  team?: string;
  [key: string]: unknown;
}

/**
 * Parse a raw script JSON array into a normalized ParsedScript.
 * Handles 3 formats:
 * 1. Standard: [{ id: '_meta', name: '...' }, { id: 'roleId' }, ...]
 * 2. Full-object: entries have full role data (name, team, ability, etc.)
 * 3. No-meta: [{ id: 'roleId' }, ...] — no _meta entry
 */
export function parseScript(
  raw: RawScriptEntry[],
  scriptId: string,
  rolesDb: Record<string, RoleDefinition>
): ParsedScript {
  const metaEntry = raw.find(e => e.id === '_meta');

  const meta = {
    id: scriptId,
    name: (metaEntry?.name as string) ?? 'Custom Script',
    colour: metaEntry?.colour as string | undefined,
  };

  const roleEntries = raw.filter(e => e.id !== '_meta' && e.id !== '');

  const roleIds = roleEntries
    .map(e => normalizeRoleId(e.id, rolesDb))
    .filter(id => id && id !== '_meta');

  // De-duplicate while preserving order
  const seen = new Set<string>();
  const uniqueRoleIds = roleIds.filter(id => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { meta, roleIds: uniqueRoleIds };
}

/**
 * Load a built-in script by ID ('tb' | 'bmr' | 'snv').
 * Fetches from /public/data/{id}.json.
 */
export async function loadBuiltinScript(
  scriptId: 'tb' | 'bmr' | 'snv',
  rolesDb: Record<string, RoleDefinition>
): Promise<ParsedScript> {
  const res = await fetch(`/data/${scriptId}.json`);
  if (!res.ok) throw new Error(`Failed to load script: ${scriptId}`);
  const raw: RawScriptEntry[] = await res.json();
  return parseScript(raw, scriptId, rolesDb);
}

/**
 * Parse an uploaded custom script JSON file.
 * Returns a ParsedScript or an error message.
 */
export function parseUploadedScript(
  fileContent: string,
  rolesDb: Record<string, RoleDefinition>
): ParsedScript | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(fileContent);
  } catch {
    return { error: 'Invalid JSON file. Please check the file and try again.' };
  }

  if (!Array.isArray(raw)) {
    return { error: 'Script file must be a JSON array.' };
  }

  if (raw.length === 0) {
    return { error: 'Script file is empty.' };
  }

  const entries = raw as RawScriptEntry[];
  if (!entries.every(e => typeof e === 'object' && e !== null && 'id' in e)) {
    return { error: 'Each entry in the script must have an "id" field.' };
  }

  const customId = `custom-${Date.now()}`;
  return parseScript(entries, customId, rolesDb);
}
