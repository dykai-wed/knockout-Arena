/**
 * KNOCKOUT ARENA - Shared Multiplayer Data Contracts & Types
 */

export type CharacterArchetype = 'vanguard' | 'tracer' | 'hookshot' | 'aegis' | 'vortex' | 'solar';

export interface CharacterProfile {
  id: CharacterArchetype;
  name: string;
  tagline: string;
  description: string;
  color: string;
  tintHex: number;
  perk: string;
  power: number; // 1-5 scale
  speed: number;
  grapple: number;
}

export const CHARACTER_PROFILES: Record<CharacterArchetype, CharacterProfile> = {
  vanguard: {
    id: 'vanguard',
    name: 'VANGUARD',
    tagline: 'High knockback, Slower recovery',
    description: 'A heavy brawler equipped with kinetic power cores that send foes flying.',
    color: '#ff3b3b',
    tintHex: 0xff3838,
    perk: '+25% Knockback Force',
    power: 5,
    speed: 3,
    grapple: 3,
  },
  tracer: {
    id: 'tracer',
    name: 'TRACER',
    tagline: 'Fast movement, Double dash',
    description: 'A nimble speedster capable of chaining swift burst dashes across hazards.',
    color: '#00f0ff',
    tintHex: 0x00f0ff,
    perk: '+20% Speed & Faster Stamina',
    power: 3,
    speed: 5,
    grapple: 4,
  },
  hookshot: {
    id: 'hookshot',
    name: 'HOOKSHOT',
    tagline: 'Extended grapple range',
    description: 'A master tactician wielding long-range magnetized tether cables.',
    color: '#00ff66',
    tintHex: 0x00ff66,
    perk: '+35% Grapple Range & Pull Speed',
    power: 3,
    speed: 4,
    grapple: 5,
  },
  aegis: {
    id: 'aegis',
    name: 'AEGIS',
    tagline: 'Enhanced deflector shield',
    description: 'Armored vanguard with regenerative energy shielding.',
    color: '#38bdf8',
    tintHex: 0x38bdf8,
    perk: '+30 Max Shield & Fast Regen',
    power: 4,
    speed: 3,
    grapple: 3,
  },
  vortex: {
    id: 'vortex',
    name: 'VORTEX',
    tagline: 'EMP Tactical Disruptor',
    description: 'Area controller capable of triggering devastating radial shockwaves.',
    color: '#bf5af2',
    tintHex: 0xbf5af2,
    perk: '-30% Tactical Cooldown',
    power: 4,
    speed: 3,
    grapple: 4,
  },
  solar: {
    id: 'solar',
    name: 'SOLAR',
    tagline: 'Kinetic Bumper specialist',
    description: 'Absorbs and multiplies momentum from bumper launches.',
    color: '#ff8800',
    tintHex: 0xff8800,
    perk: '+35% Bumper Launch Force',
    power: 4,
    speed: 4,
    grapple: 3,
  },
};

export type GameMode = 'ffa' | 'team';
export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export interface RoomSettings {
  mode: GameMode;
  humanPlayers: number;
  aiCount: number;
  difficulty: AIDifficulty;
  matchDuration: number; // in seconds (60, 120, 180, 300)
  startingLives: number;
  arena: string;
  allowAiFilling: boolean;
  isPrivate: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: 'ffa',
  humanPlayers: 1,
  aiCount: 4,
  difficulty: 'normal',
  matchDuration: 180,
  startingLives: 3,
  arena: 'The Core',
  allowAiFilling: true,
  isPrivate: true,
};

export interface LobbySlot {
  index: number;
  type: 'human' | 'ai' | 'empty';
  playerId: string | null;
  name: string;
  isHost: boolean;
  isReady: boolean;
  character: CharacterArchetype;
  team: 1 | 2;
  color: string;
  isConnected: boolean;
  personality?: 'player' | 'aggressor' | 'survivor' | 'opportunist' | 'controller' | 'duelist';
}

export type RoomStatus = 'lobby' | 'countdown' | 'playing' | 'ended';

export interface RoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  slots: LobbySlot[];
  countdown?: number;
}

export interface PlayerNetState {
  id: string;
  slotIndex: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
  shield: number;
  stamina: number;
  lives: number;
  isAlive: boolean;
  isFalling: boolean;
  score: number;
  activePowerup: {
    type: string;
    duration: number;
  } | null;
  color: string;
  character: CharacterArchetype;
  isHuman: boolean;
  team: 1 | 2;
  grappleTarget: { x: number; y: number } | null;
  invulnerable: boolean;
}

export interface AuthoritativeMatchTick {
  tick: number;
  matchTimeRemaining: number;
  players: PlayerNetState[];
  currentEvent: {
    name: string;
    type: string;
    timeRemaining: number;
  } | null;
  isGameOver: boolean;
  winnerId: string | null;
  winnerName: string | null;
}

export type ClientAction =
  | { type: 'create_room'; name: string; character: CharacterArchetype; settings?: Partial<RoomSettings> }
  | { type: 'join_room'; code: string; name: string; character: CharacterArchetype; sessionId?: string }
  | { type: 'quick_match'; name: string; character: CharacterArchetype }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'update_character'; character: CharacterArchetype }
  | { type: 'update_settings'; settings: Partial<RoomSettings> }
  | { type: 'add_ai'; personality?: string; slotIndex?: number }
  | { type: 'remove_ai'; slotIndex: number }
  | { type: 'kick_player'; slotIndex: number }
  | { type: 'start_match' }
  | { type: 'leave_room' }
  | {
      type: 'player_input';
      move: { x: number; y: number };
      aim: { x: number; y: number };
      knockback: boolean;
      dash: boolean;
      grapple: boolean;
      tactical: boolean;
      seq: number;
    };

export type ServerMessage =
  | { type: 'room_joined'; room: RoomState; playerId: string; isHost: boolean; slotIndex: number }
  | { type: 'room_update'; room: RoomState }
  | { type: 'match_countdown'; countdown: number }
  | { type: 'match_started'; initialState: AuthoritativeMatchTick }
  | { type: 'match_tick'; tick: AuthoritativeMatchTick }
  | { type: 'match_ended'; winnerId: string | null; winnerName: string | null; stats: any }
  | { type: 'error'; message: string };

export interface SoloMatchConfig {
  character: CharacterArchetype;
  aiCount: number;
  difficulty: AIDifficulty;
  durationSeconds: number;
  lives: number;
  arena: string;
}
