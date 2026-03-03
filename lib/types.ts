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
  reminders: string[]; // reminder token labels this role uses
  setup: boolean;
  ability: string;
}

// NOTE: Roles.json uses 'traveler' (American single-L) — do NOT use 'traveller'
export type RoleTeam =
  | 'townsfolk'
  | 'outsider'
  | 'minion'
  | 'demon'
  | 'traveler'
  | 'loric';

export interface ParsedScript {
  meta: {
    id: string; // 'tb' | 'bmr' | 'snv' | 'custom'
    name: string;
    colour?: string;
  };
  roleIds: string[]; // normalized role IDs in this script
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
  hasGhostVote: boolean; // dead players' ghost vote token
  reminderTokens: ReminderToken[];
  seat: number; // position index 0..n-1 for circle layout
}

export interface Game {
  id: string; // nanoid
  name: string;
  createdAt: number; // Date.now()
  scriptId: string; // 'tb' | 'bmr' | 'snv' | 'custom-{timestamp}'
  scriptName: string;
  scriptRoleIds: string[]; // normalized IDs of roles in this game's script
  players: Player[];
  phase: 'day' | 'night';
  dayNumber: number;
  nightNumber: number;
  /** Three demon bluff role IDs (null = slot empty). May be absent on old persisted games. */
  bluffRoleIds?: [string | null, string | null, string | null];
}

export interface CreateGameParams {
  name: string;
  scriptId: string;
  scriptName: string;
  scriptRoleIds: string[];
  playerNames: string[];
}

// Night order entry (used by NightOrderPanel)
export interface NightOrderEntry {
  roleId: string;
  name: string;
  order: number;
  reminder: string;
  isSpecial: boolean; // true for Dusk, Dawn, Minion Info, Demon Info
}
