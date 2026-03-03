'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Game,
  Player,
  ReminderToken,
  RoleDefinition,
  CreateGameParams,
} from './types';
import { buildRolesIndex, buildAliasMap } from './roles';

interface AppState {
  // Persisted state
  games: Record<string, Game>;
  activeGameId: string | null;

  // Runtime state (not persisted — reloaded each session)
  rolesDb: Record<string, RoleDefinition> | null;
  allRoles: RoleDefinition[] | null; // full array including special entries

  // Actions
  loadRolesDb: () => Promise<void>;
  createGame: (params: CreateGameParams) => string;
  deleteGame: (gameId: string) => void;
  setActiveGame: (gameId: string | null) => void;
  updatePlayer: (
    gameId: string,
    playerId: string,
    updates: Partial<Player>
  ) => void;
  updatePlayerName: (gameId: string, playerId: string, name: string) => void;
  addReminderToken: (
    gameId: string,
    playerId: string,
    token: Omit<ReminderToken, 'id'>
  ) => void;
  removeReminderToken: (
    gameId: string,
    playerId: string,
    tokenId: string
  ) => void;
  addPlayer: (gameId: string, name: string) => void;
  removePlayer: (gameId: string, playerId: string) => void;
  setBluff: (gameId: string, index: 0 | 1 | 2, roleId: string | null) => void;
  togglePhase: (gameId: string) => void;
  togglePhaseBack: (gameId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      games: {},
      activeGameId: null,
      rolesDb: null,
      allRoles: null,

      loadRolesDb: async () => {
        if (get().rolesDb) return; // already loaded
        const [rolesRes, loricRes] = await Promise.all([
          fetch('/data/roles.json'),
          fetch('/data/loric.json'),
        ]);
        if (!rolesRes.ok) throw new Error('Failed to load roles database');
        const raw: RoleDefinition[] = await rolesRes.json();
        const loricRaw: RoleDefinition[] = loricRes.ok ? await loricRes.json() : [];
        const allRaw = [...raw, ...loricRaw];
        const db = buildRolesIndex(allRaw);
        buildAliasMap(db);
        set({ rolesDb: db, allRoles: allRaw });
      },

      createGame: (params) => {
        const id = nanoid();
        const players: Player[] = params.playerNames.map((name, i) => ({
          id: nanoid(),
          name,
          roleId: null,
          isAlive: true,
          hasGhostVote: false,
          reminderTokens: [],
          seat: i,
        }));
        const game: Game = {
          id,
          name: params.name,
          createdAt: Date.now(),
          scriptId: params.scriptId,
          scriptName: params.scriptName,
          scriptRoleIds: params.scriptRoleIds,
          players,
          phase: 'night',
          dayNumber: 1,
          nightNumber: 1,
          bluffRoleIds: [null, null, null],
        };
        set(state => ({
          games: { ...state.games, [id]: game },
          activeGameId: id,
        }));
        return id;
      },

      deleteGame: (gameId) => {
        set(state => {
          const games = { ...state.games };
          delete games[gameId];
          return {
            games,
            activeGameId:
              state.activeGameId === gameId ? null : state.activeGameId,
          };
        });
      },

      setActiveGame: (gameId) => {
        set({ activeGameId: gameId });
      },

      updatePlayer: (gameId, playerId, updates) => {
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          return {
            games: {
              ...state.games,
              [gameId]: {
                ...game,
                players: game.players.map(p =>
                  p.id === playerId ? { ...p, ...updates } : p
                ),
              },
            },
          };
        });
      },

      updatePlayerName: (gameId, playerId, name) => {
        get().updatePlayer(gameId, playerId, { name });
      },

      addReminderToken: (gameId, playerId, token) => {
        const newToken: ReminderToken = { ...token, id: nanoid() };
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          return {
            games: {
              ...state.games,
              [gameId]: {
                ...game,
                players: game.players.map(p =>
                  p.id === playerId
                    ? { ...p, reminderTokens: [...p.reminderTokens, newToken] }
                    : p
                ),
              },
            },
          };
        });
      },

      removeReminderToken: (gameId, playerId, tokenId) => {
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          return {
            games: {
              ...state.games,
              [gameId]: {
                ...game,
                players: game.players.map(p =>
                  p.id === playerId
                    ? {
                        ...p,
                        reminderTokens: p.reminderTokens.filter(
                          t => t.id !== tokenId
                        ),
                      }
                    : p
                ),
              },
            },
          };
        });
      },

      addPlayer: (gameId, name) => {
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          const newPlayer: Player = {
            id: nanoid(),
            name: name.trim() || `Player ${game.players.length + 1}`,
            roleId: null,
            isAlive: true,
            hasGhostVote: false,
            reminderTokens: [],
            seat: game.players.length,
          };
          return {
            games: {
              ...state.games,
              [gameId]: { ...game, players: [...game.players, newPlayer] },
            },
          };
        });
      },

      removePlayer: (gameId, playerId) => {
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          return {
            games: {
              ...state.games,
              [gameId]: {
                ...game,
                players: game.players.filter(p => p.id !== playerId),
              },
            },
          };
        });
      },

      setBluff: (gameId, index, roleId) => {
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          const bluffRoleIds: [string | null, string | null, string | null] = [
            ...(game.bluffRoleIds ?? [null, null, null]),
          ] as [string | null, string | null, string | null];
          bluffRoleIds[index] = roleId;
          return {
            games: {
              ...state.games,
              [gameId]: { ...game, bluffRoleIds },
            },
          };
        });
      },

      togglePhase: (gameId) => {
        set(state => {
          const game = state.games[gameId];
          if (!game) return state;
          const goingToNight = game.phase === 'day';
          return {
            games: {
              ...state.games,
              [gameId]: {
                ...game,
                phase: goingToNight ? 'night' : 'day',
                nightNumber: goingToNight
                  ? game.nightNumber + 1
                  : game.nightNumber,
                dayNumber: !goingToNight
                  ? game.dayNumber + 1
                  : game.dayNumber,
              },
            },
          };
        });
      },

      togglePhaseBack: (gameId) => {
        set(state => {
          const game = state.games[gameId];
          // Can't go back from the very first night
          if (!game || (game.phase === 'night' && game.nightNumber === 1)) return state;
          const goingBackToDay = game.phase === 'night';
          return {
            games: {
              ...state.games,
              [gameId]: {
                ...game,
                phase: goingBackToDay ? 'day' : 'night',
                nightNumber: goingBackToDay
                  ? game.nightNumber - 1
                  : game.nightNumber,
                dayNumber: !goingBackToDay
                  ? game.dayNumber - 1
                  : game.dayNumber,
              },
            },
          };
        });
      },
    }),
    {
      name: 'botc-grimoire',
      // Exclude runtime state from localStorage
      partialize: state => ({
        games: state.games,
        activeGameId: state.activeGameId,
      }),
    }
  )
);
