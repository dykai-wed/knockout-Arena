/**
 * KNOCKOUT ARENA - Core Pure Logic & Physics Math
 * Decoupled from UI and rendering for deterministic unit testing.
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerStats {
  id: string;
  name: string;
  color: string;
  accentHex: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  stamina: number;
  maxStamina: number;
  lives: number;
  isAlive: boolean;
  score: number;
  kos: number;
  grapplesUsed: number;
  bumpersHit: number;
  activePowerup: {
    type: 'overdrive' | 'shield' | 'supergrapple' | 'speed';
    duration: number;
    maxDuration: number;
  } | null;
  personality?: 'player' | 'aggressor' | 'survivor' | 'opportunist' | 'controller' | 'duelist';
}

export const STAMINA_COSTS = {
  dash: 25,
  grapple: 20,
  knockback: 0,
  tactical: 30,
};

export const ARENA_CONFIG = {
  radius: 460, // Outer platform radius
  innerRadius: 180, // Central octagonal ring
  deathRadius: 520, // Distance beyond which player falls into void
  staminaRegenRate: 15, // Stamina per second
  matchDurationSeconds: 180, // 3 minutes
  initialLives: 3,
};

/**
 * Calculates knockback velocity impulse based on attacker and target coordinates.
 */
export function calculateKnockback(
  attackerPos: Vector2D,
  targetPos: Vector2D,
  baseImpulse: number = 380,
  powerMultiplier: number = 1.0
): Vector2D {
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.0001) {
    // Exactly overlapping, push horizontally
    return { x: baseImpulse * powerMultiplier, y: 0 };
  }

  const nx = dx / dist;
  const ny = dy / dist;
  return {
    x: nx * baseImpulse * powerMultiplier,
    y: ny * baseImpulse * powerMultiplier,
  };
}

/**
 * Checks if a position is within the arena platform or in the hazard death zone.
 */
export function evaluateArenaBounds(
  pos: Vector2D,
  center: Vector2D = { x: 0, y: 0 },
  platformRadius: number = ARENA_CONFIG.radius,
  deathRadius: number = ARENA_CONFIG.deathRadius
): {
  distanceFromCenter: number;
  isSafe: boolean;
  isNearEdge: boolean;
  isFalling: boolean;
} {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  const dist = Math.hypot(dx, dy);

  return {
    distanceFromCenter: dist,
    isSafe: dist <= platformRadius,
    isNearEdge: dist > platformRadius * 0.78 && dist <= platformRadius,
    isFalling: dist > platformRadius,
  };
}

/**
 * Consumes stamina if available. Returns remaining stamina, or null if insufficient.
 */
export function consumeStamina(currentStamina: number, cost: number): number | null {
  if (currentStamina < cost) {
    return null;
  }
  return Math.max(0, currentStamina - cost);
}

/**
 * Regenerates stamina clamped to maxStamina.
 */
export function regenerateStamina(
  current: number,
  dt: number,
  rate: number = ARENA_CONFIG.staminaRegenRate,
  max: number = 100
): number {
  return Math.min(max, current + rate * dt);
}

/**
 * Evaluates damage taken, draining shield first before health.
 */
export function applyDamage(
  health: number,
  shield: number,
  damage: number
): { health: number; shield: number; damageDealtToHealth: number } {
  let remainingDamage = damage;
  let newShield = shield;
  let newHealth = health;
  let healthDamage = 0;

  if (newShield > 0) {
    const shieldDmg = Math.min(newShield, remainingDamage);
    newShield -= shieldDmg;
    remainingDamage -= shieldDmg;
  }

  if (remainingDamage > 0) {
    healthDamage = Math.min(newHealth, remainingDamage);
    newHealth = Math.max(0, newHealth - healthDamage);
  }

  return {
    health: Math.round(newHealth),
    shield: Math.round(newShield),
    damageDealtToHealth: Math.round(healthDamage),
  };
}

/**
 * Handles death / falling off arena: drops life, returns whether still alive.
 */
export function handlePlayerFall(
  lives: number,
  maxHealth: number = 100,
  maxShield: number = 50
): { livesRemaining: number; isEliminated: boolean; resetHealth: number; resetShield: number } {
  const livesRemaining = Math.max(0, lives - 1);
  return {
    livesRemaining,
    isEliminated: livesRemaining === 0,
    resetHealth: maxHealth,
    resetShield: maxShield,
  };
}

/**
 * Evaluates match status: checks if timer expired or only 1 player remains.
 */
export function evaluateMatchStatus(
  players: PlayerStats[],
  timeRemainingSeconds: number
): {
  isGameOver: boolean;
  winner: PlayerStats | null;
  aliveCount: number;
  isSuddenDeath: boolean;
} {
  const alivePlayers = players.filter((p) => p.isAlive && p.lives > 0);

  if (alivePlayers.length <= 1) {
    return {
      isGameOver: true,
      winner: alivePlayers.length === 1 ? alivePlayers[0] : null,
      aliveCount: alivePlayers.length,
      isSuddenDeath: false,
    };
  }

  if (timeRemainingSeconds <= 0) {
    // Sudden Death: Sort alive players by lives descending, then score
    const sorted = [...alivePlayers].sort((a, b) => {
      if (b.lives !== a.lives) return b.lives - a.lives;
      return b.score - a.score;
    });

    return {
      isGameOver: true,
      winner: sorted[0] || null,
      aliveCount: alivePlayers.length,
      isSuddenDeath: true,
    };
  }

  return {
    isGameOver: false,
    winner: null,
    aliveCount: alivePlayers.length,
    isSuddenDeath: timeRemainingSeconds < 20,
  };
}

/**
 * Formats seconds into MM:SS.
 */
export function formatMatchTimer(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
