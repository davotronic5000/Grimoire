import type { RoleDefinition, RoleTeam, NightOrderEntry, NightOrderOverride } from './types';

// Team display colors
export const TEAM_COLORS: Record<RoleTeam, string> = {
  townsfolk: '#3b82f6',
  outsider: '#06b6d4',
  minion: '#f97316',
  demon: '#ef4444',
  traveler: '#a855f7', // NOTE: American spelling to match Roles.json data
  loric: '#2dd4bf',
  fabled: '#f59e0b',
};

export const TEAM_LABELS: Record<RoleTeam, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
  traveler: 'Traveler',
  loric: 'Loric',
  fabled: 'Fabled',
};

// IDs of the 4 special night-order entries (no team, no icon)
const SPECIAL_NIGHT_IDS = ['Dusk', 'Dawn', 'Minion_Information', 'Demon_Information'];

// Recognized spellings for the 4 special entries as they appear in a script's
// custom _meta.firstNight/otherNight override arrays (e.g. "dusk", "minioninfo").
const SPECIAL_ID_ALIASES: Record<string, string> = {
  dusk: 'Dusk',
  dawn: 'Dawn',
  minioninfo: 'Minion_Information',
  minioninformation: 'Minion_Information',
  demoninfo: 'Demon_Information',
  demoninformation: 'Demon_Information',
};

function resolveSpecialId(rawId: string): string | null {
  const key = rawId.toLowerCase().replace(/[\s_]/g, '');
  return SPECIAL_ID_ALIASES[key] ?? null;
}

/**
 * Build a lookup map from role ID -> RoleDefinition.
 * Excludes special entries (no team).
 */
export function buildRolesIndex(
  rawRoles: RoleDefinition[]
): Record<string, RoleDefinition> {
  const index: Record<string, RoleDefinition> = {};
  for (const role of rawRoles) {
    if (role.team) {
      index[role.id] = role;
    }
  }
  return index;
}

/**
 * Build an alias map to normalize non-standard role IDs from custom scripts.
 * e.g. 'scarletwoman' -> 'scarlet_woman', 'fortuneteller' -> 'fortune_teller'
 */
let _aliasMap: Record<string, string> | null = null;

export function buildAliasMap(rolesDb: Record<string, RoleDefinition>): void {
  _aliasMap = {};
  for (const id of Object.keys(rolesDb)) {
    const noUnderscore = id.replace(/_/g, '').toLowerCase();
    if (noUnderscore !== id) {
      _aliasMap[noUnderscore] = id;
    }
    // Also store lowercase version pointing to canonical
    _aliasMap[id.toLowerCase()] = id;
  }
}

/**
 * Normalize a potentially non-standard role ID to the canonical form
 * used in Roles.json.
 */
export function normalizeRoleId(
  rawId: string,
  rolesDb: Record<string, RoleDefinition>
): string {
  if (!rawId || rawId === '_meta') return rawId;

  // Already canonical
  if (rolesDb[rawId]) return rawId;

  // Build alias map on first use
  if (!_aliasMap) buildAliasMap(rolesDb);

  const lower = rawId.toLowerCase();
  const noUnderscore = lower.replace(/_/g, '');

  return _aliasMap![lower] ?? _aliasMap![noUnderscore] ?? rawId;
}

/**
 * Get the icon path for a role (served from /public/icons/).
 */
export function getIconPath(roleId: string): string {
  return `/icons/${roleId}.png`;
}

/**
 * Get the icon URL for a role, preferring a custom image URL (homebrew roles)
 * over the default local icon path.
 */
export function getRoleIconPath(role: RoleDefinition): string {
  return role.image ?? `/icons/${role.id}.png`;
}

/**
 * Get the generic fallback icon path for a team, shown when a specific role
 * icon fails to load.
 */
export function getGenericIconPath(team: RoleTeam | '' | undefined): string {
  switch (team) {
    case 'townsfolk': return '/icons/generic_townsfolk.png';
    case 'outsider':  return '/icons/generic_outsider.png';
    case 'minion':    return '/icons/generic_minion.png';
    case 'demon':     return '/icons/generic_demon.png';
    case 'traveler':  return '/icons/generic_traveler.png';
    case 'fabled':    return '/icons/generic_fabled.png';
    case 'loric':     return '/icons/generic_loric.png';
    default:          return '/icons/generic_townsfolk.png';
  }
}

/**
 * Get team color for a role team value.
 */
export function getRoleTeamColor(team: RoleTeam | '' | undefined): string {
  if (!team) return '#6b7280'; // gray for unassigned
  return TEAM_COLORS[team as RoleTeam] ?? '#6b7280';
}

/**
 * Split a script's own role list into the Loric/Fabled role IDs it directly
 * includes, so they can default to "in play" instead of requiring the
 * Storyteller to add them manually via the Storytools drawer.
 */
export function getScriptStoryTools(
  scriptRoleIds: string[],
  rolesDb: Record<string, RoleDefinition>,
  homebrewRoles?: Record<string, RoleDefinition>
): { loricIds: string[]; fabledIds: string[] } {
  const loricIds: string[] = [];
  const fabledIds: string[] = [];
  for (const id of scriptRoleIds) {
    const role = homebrewRoles?.[id] ?? rolesDb[id];
    if (!role) continue;
    if (role.team === 'loric') loricIds.push(id);
    else if (role.team === 'fabled') fabledIds.push(id);
  }
  return { loricIds, fabledIds };
}

/**
 * Build the night order for a given phase.
 * Always includes Dusk (order 1) and Dawn (order 100).
 * First night only: also includes Minion_Information (6) and Demon_Information (9).
 *
 * Only includes roles that have at least one player assigned to them in the game
 * (pass assignedRoleIds for this filtering).
 */
export function getNightOrder(
  scriptRoleIds: string[],
  rolesDb: Record<string, RoleDefinition>,
  allRoles: RoleDefinition[], // full raw array including special entries
  phase: 'first' | 'other',
  assignedRoleIds: Set<string>,
  nightOrderOverride?: NightOrderOverride
): NightOrderEntry[] {
  const overrideList = phase === 'first' ? nightOrderOverride?.firstNight : nightOrderOverride?.otherNight;
  if (overrideList && overrideList.length > 0) {
    return buildOverrideNightOrder(overrideList, rolesDb, allRoles, phase, assignedRoleIds);
  }

  const entries: NightOrderEntry[] = [];

  // Add special entries
  const specialEntries = allRoles.filter(r =>
    SPECIAL_NIGHT_IDS.includes(r.id)
  );
  const dusk = specialEntries.find(r => r.id === 'Dusk');
  const dawn = specialEntries.find(r => r.id === 'Dawn');
  const minionInfo = specialEntries.find(r => r.id === 'Minion_Information');
  const demonInfo = specialEntries.find(r => r.id === 'Demon_Information');

  if (dusk) {
    entries.push({
      roleId: 'Dusk',
      name: 'Dusk',
      order: phase === 'first' ? dusk.firstNight : dusk.otherNight,
      reminder:
        phase === 'first'
          ? dusk.firstNightReminder
          : dusk.otherNightReminder,
      isSpecial: true,
    });
  }

  // First night only: Minion and Demon information
  if (phase === 'first') {
    if (minionInfo) {
      entries.push({
        roleId: 'Minion_Information',
        name: 'Minion Information',
        order: minionInfo.firstNight,
        reminder: minionInfo.firstNightReminder,
        isSpecial: true,
      });
    }
    if (demonInfo) {
      entries.push({
        roleId: 'Demon_Information',
        name: 'Demon Information',
        order: demonInfo.firstNight,
        reminder: demonInfo.firstNightReminder,
        isSpecial: true,
      });
    }
  }

  // Add script roles that wake this phase and are assigned to a player
  for (const roleId of scriptRoleIds) {
    const role = rolesDb[roleId];
    if (!role) continue;
    if (!assignedRoleIds.has(roleId)) continue;

    const order = phase === 'first' ? role.firstNight : role.otherNight;
    if (order === 0) continue; // doesn't wake this phase

    entries.push({
      roleId: role.id,
      name: role.name,
      order,
      reminder:
        phase === 'first'
          ? role.firstNightReminder
          : role.otherNightReminder,
      isSpecial: false,
    });
  }

  if (dawn) {
    entries.push({
      roleId: 'Dawn',
      name: 'Dawn',
      order: phase === 'first' ? dawn.firstNight : dawn.otherNight,
      reminder:
        phase === 'first'
          ? dawn.firstNightReminder
          : dawn.otherNightReminder,
      isSpecial: true,
    });
  }

  // Sort by order number
  entries.sort((a, b) => a.order - b.order);
  return entries;
}

/**
 * Build a night order from an explicit script-defined sequence of role IDs
 * (plus 'dusk'/'dawn'/'minioninfo'/'demoninfo'), used when a script's _meta
 * specifies its own firstNight/otherNight override. Position in the array
 * is the order — this replaces each role's default firstNight/otherNight
 * number entirely for that phase.
 */
function buildOverrideNightOrder(
  overrideList: string[],
  rolesDb: Record<string, RoleDefinition>,
  allRoles: RoleDefinition[],
  phase: 'first' | 'other',
  assignedRoleIds: Set<string>
): NightOrderEntry[] {
  const entries: NightOrderEntry[] = [];
  const specialLookup = new Map(
    allRoles.filter(r => SPECIAL_NIGHT_IDS.includes(r.id)).map(r => [r.id, r])
  );

  overrideList.forEach((rawId, i) => {
    const order = i + 1;
    const specialId = resolveSpecialId(rawId);
    if (specialId) {
      const special = specialLookup.get(specialId);
      if (!special) return;
      entries.push({
        roleId: specialId,
        name: specialId.replace(/_/g, ' '),
        order,
        reminder: phase === 'first' ? special.firstNightReminder : special.otherNightReminder,
        isSpecial: true,
      });
      return;
    }

    const id = rolesDb[rawId] ? rawId : normalizeRoleId(rawId, rolesDb);
    const role = rolesDb[id];
    if (!role) return;
    if (!assignedRoleIds.has(id)) return;

    entries.push({
      roleId: role.id,
      name: role.name,
      order,
      reminder: phase === 'first' ? role.firstNightReminder : role.otherNightReminder,
      isSpecial: false,
    });
  });

  return entries;
}

/**
 * Role count distribution for a given player count.
 * Returns { townsfolk, outsider, minion, demon }
 * Based on official BotC rules.
 */
export function getRoleDistribution(playerCount: number): {
  townsfolk: number;
  outsider: number;
  minion: number;
  demon: number;
} {
  const distributions: Record<
    number,
    { townsfolk: number; outsider: number; minion: number; demon: number }
  > = {
    5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
    6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
    7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
    8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
    9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
    10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
    11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
    12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
    13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
    14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
    15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
    16: { townsfolk: 9, outsider: 3, minion: 3, demon: 1 },
    17: { townsfolk: 11, outsider: 1, minion: 3, demon: 1 }, // approx
    18: { townsfolk: 11, outsider: 2, minion: 3, demon: 1 },
    19: { townsfolk: 11, outsider: 3, minion: 3, demon: 1 },
    20: { townsfolk: 11, outsider: 4, minion: 3, demon: 1 },
  };
  return (
    distributions[playerCount] ?? {
      townsfolk: Math.ceil(playerCount * 0.6),
      outsider: 1,
      minion: Math.floor(playerCount * 0.15),
      demon: 1,
    }
  );
}
