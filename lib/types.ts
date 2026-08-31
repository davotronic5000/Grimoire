// Core role data matching Roles.json structure
export interface RoleDefinition {
  id: string;
  name: string;
  edition: string; // 'tb' | 'bmr' | 'snv' | '' (travellers/custom)
  team: RoleTeam | ''; // '' for special entries (Dusk, Dawn, etc.)
  firstNight: number; // 0 = does not wake
  firstNightReminder: string;
  otherNight: number; // 0 = does not wake
  otherNightReminder: string;
  reminders: string[]; // reminder token labels this role uses (player-specific)
  remindersGlobal?: string[]; // reminder tokens that can be placed on any player
  setup: boolean;
  ability: string;
  /** Custom image URL for homebrew roles (from script JSON "image" field) */
  image?: string;
}

// NOTE: Roles.json uses 'traveler' (American single-L) — do NOT use 'traveller'
export type RoleTeam =
  | 'townsfolk'
  | 'outsider'
  | 'minion'
  | 'demon'
  | 'traveler'
  | 'loric'
  | 'fabled';

/** Explicit per-script night order — role IDs (plus 'dusk'/'dawn'/'minioninfo'/'demoninfo')
 *  in wake order, overriding each role's default firstNight/otherNight number. */
export interface NightOrderOverride {
  firstNight?: string[];
  otherNight?: string[];
}

export interface ParsedScript {
  meta: {
    id: string; // 'tb' | 'bmr' | 'snv' | 'custom'
    name: string;
    author?: string;
    colour?: string;
    /** Script-specific night order, when the script JSON's _meta defines one. */
    nightOrder?: NightOrderOverride;
  };
  roleIds: string[]; // normalized role IDs in this script
  /** Full definitions for homebrew roles not in the official roles DB */
  homebrewRoles?: Record<string, RoleDefinition>;
}

export interface ReminderToken {
  id: string; // unique per instance (nanoid)
  sourceRoleId: string; // which role created this token
  label: string; // label text from role.reminders[]
}

export interface Player {
  id: string; // nanoid
  name: string;
  roleId: string | null;
  isAlive: boolean;
  reminderTokens: ReminderToken[];
  seat: number; // position index 0..n-1 for circle layout
  /** Explicit alignment override — null/undefined means use role default */
  alignment?: 'good' | 'evil' | null;
}

export interface Game {
  id: string; // nanoid
  name: string;
  createdAt: number; // Date.now()
  scriptId: string; // 'tb' | 'bmr' | 'snv' | 'custom-{timestamp}'
  scriptName: string;
  scriptAuthor?: string;
  scriptRoleIds: string[]; // normalized IDs of roles in this game's script (may include mid-game additions)
  baseScriptRoleIds?: string[]; // original script roles at game creation — used by resetGame
  players: Player[];
  phase: 'day' | 'night';
  dayNumber: number;
  nightNumber: number;
  /** Three demon bluff role IDs (null = slot empty). May be absent on old persisted games. */
  bluffRoleIds?: [string | null, string | null, string | null];
  /** Active Loric character IDs for this game. */
  loricIds?: string[];
  /** Active Fabled character IDs for this game. */
  fabledIds?: string[];
  /** Normal script role IDs the Storyteller is holding themselves (not assigned to a player). */
  storytellerRoleIds?: string[];
  /** Homebrew role definitions from a custom script upload, persisted with the game. */
  homebrewRoles?: Record<string, RoleDefinition>;
  /** Script-specific night order, when the script defines one — overrides per-role firstNight/otherNight numbers. */
  nightOrderOverride?: NightOrderOverride;
}

export interface CreateGameParams {
  name: string;
  scriptId: string;
  scriptName: string;
  scriptAuthor?: string;
  scriptRoleIds: string[];
  playerNames: string[];
  homebrewRoles?: Record<string, RoleDefinition>;
  nightOrderOverride?: NightOrderOverride;
}

// Night order entry (used by NightOrderPanel)
export interface NightOrderEntry {
  roleId: string;
  name: string;
  order: number;
  reminder: string;
  isSpecial: boolean; // true for Dusk, Dawn, Minion Info, Demon Info
}
