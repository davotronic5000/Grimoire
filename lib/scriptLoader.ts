import type { RoleDefinition, ParsedScript } from './types';
import { normalizeRoleId } from './roles';

// Per the official schema, entries can be strings (official IDs) or objects
type RawEntry = string | Record<string, unknown>;

/**
 * Parse a raw script JSON array into a normalized ParsedScript.
 *
 * Handles the official BotC script JSON schema:
 *   - String entry            → official role ID (e.g. "washerwoman")
 *   - { id }                  → official role reference
 *   - { id, name, team, ability, … } → homebrew role definition
 *   - { id: "_meta", name }   → script metadata
 */
export function parseScript(
  raw: RawEntry[],
  scriptId: string,
  rolesDb: Record<string, RoleDefinition>
): ParsedScript {
  const homebrewRoles: Record<string, RoleDefinition> = {};
  const roleIds: string[] = [];
  const seen = new Set<string>();

  // Find _meta entry (always an object)
  const metaEntry = raw.find(
    e => typeof e === 'object' && e !== null && (e as Record<string, unknown>).id === '_meta'
  ) as Record<string, unknown> | undefined;

  const meta = {
    id: scriptId,
    name: (metaEntry?.name as string) ?? 'Custom Script',
    colour: metaEntry?.colour as string | undefined,
  };

  for (const entry of raw) {
    // ── String entry: plain official role ID ──────────────────────────
    if (typeof entry === 'string') {
      const id = normalizeRoleId(entry, rolesDb);
      if (id && !seen.has(id)) {
        seen.add(id);
        roleIds.push(id);
      }
      continue;
    }

    const e = entry as Record<string, unknown>;
    const rawId = typeof e.id === 'string' ? e.id : undefined;
    if (!rawId || rawId === '_meta' || rawId === '') continue;

    // ── Homebrew role: has name, team, and ability ────────────────────
    if (
      typeof e.name === 'string' &&
      typeof e.team === 'string' &&
      typeof e.ability === 'string'
    ) {
      // Schema uses British 'traveller'; internal code uses American 'traveler'
      const rawTeam = e.team === 'traveller' ? 'traveler' : e.team;

      homebrewRoles[rawId] = {
        id: rawId,
        name: e.name,
        team: rawTeam as RoleDefinition['team'],
        ability: e.ability,
        edition: 'custom',
        firstNight: typeof e.firstNight === 'number' ? e.firstNight : 0,
        firstNightReminder: typeof e.firstNightReminder === 'string' ? e.firstNightReminder : '',
        otherNight: typeof e.otherNight === 'number' ? e.otherNight : 0,
        otherNightReminder: typeof e.otherNightReminder === 'string' ? e.otherNightReminder : '',
        reminders: Array.isArray(e.reminders) ? (e.reminders as string[]) : [],
        setup: typeof e.setup === 'boolean' ? e.setup : false,
      };

      if (!seen.has(rawId)) {
        seen.add(rawId);
        roleIds.push(rawId);
      }
      continue;
    }

    // ── Official role reference object ────────────────────────────────
    const id = normalizeRoleId(rawId, rolesDb);
    if (id && !seen.has(id)) {
      seen.add(id);
      roleIds.push(id);
    }
  }

  return {
    meta,
    roleIds,
    homebrewRoles: Object.keys(homebrewRoles).length > 0 ? homebrewRoles : undefined,
  };
}

/**
 * Load a built-in script by ID ('tb' | 'bmr' | 'snv').
 */
export async function loadBuiltinScript(
  scriptId: 'tb' | 'bmr' | 'snv',
  rolesDb: Record<string, RoleDefinition>
): Promise<ParsedScript> {
  const res = await fetch(`/data/${scriptId}.json`);
  if (!res.ok) throw new Error(`Failed to load script: ${scriptId}`);
  const raw: RawEntry[] = await res.json();
  return parseScript(raw, scriptId, rolesDb);
}

/**
 * Parse an uploaded custom script JSON file.
 * Returns a ParsedScript or an error message string.
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

  // Each entry must be a string or an object with an "id" field
  const valid = (raw as unknown[]).every(
    e =>
      typeof e === 'string' ||
      (typeof e === 'object' && e !== null && 'id' in (e as object))
  );
  if (!valid) {
    return {
      error: 'Invalid script format. Each entry must be a role ID string or an object with an "id" field.',
    };
  }

  const customId = `custom-${Date.now()}`;
  return parseScript(raw as RawEntry[], customId, rolesDb);
}
