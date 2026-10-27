import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKnockback,
  evaluateArenaBounds,
  consumeStamina,
  regenerateStamina,
  applyDamage,
  handlePlayerFall,
  evaluateMatchStatus,
  formatMatchTimer,
  STAMINA_COSTS,
} from './rules.ts';

test('calculateKnockback applies correct impulse direction and magnitude', () => {
  const impulse = calculateKnockback({ x: 0, y: 0 }, { x: 10, y: 0 }, 200, 1.5);
  assert.equal(impulse.x, 300);
  assert.equal(impulse.y, 0);

  // Diagonal knockback
  const diag = calculateKnockback({ x: 0, y: 0 }, { x: 3, y: 4 }, 100, 1.0);
  assert.equal(Math.round(diag.x), 60);
  assert.equal(Math.round(diag.y), 80);
});

test('evaluateArenaBounds distinguishes safe, near-edge, and falling zones', () => {
  const center = { x: 0, y: 0 };
  const safe = evaluateArenaBounds({ x: 100, y: 100 }, center, 400, 480);
  assert.equal(safe.isSafe, true);
  assert.equal(safe.isFalling, false);

  const edge = evaluateArenaBounds({ x: 350, y: 0 }, center, 400, 480);
  assert.equal(edge.isSafe, true);
  assert.equal(edge.isNearEdge, true);
  assert.equal(edge.isFalling, false);

  const fallen = evaluateArenaBounds({ x: 450, y: 0 }, center, 400, 480);
  assert.equal(fallen.isSafe, false);
  assert.equal(fallen.isFalling, true);
});

test('consumeStamina and regenerateStamina maintain accurate limits', () => {
  const dashRemaining = consumeStamina(100, STAMINA_COSTS.dash);
  assert.equal(dashRemaining, 75);

  const insufficient = consumeStamina(10, STAMINA_COSTS.tactical);
  assert.equal(insufficient, null);

  const regenerated = regenerateStamina(50, 1.0, 20, 100);
  assert.equal(regenerated, 70);

  const clamped = regenerateStamina(95, 1.0, 20, 100);
  assert.equal(clamped, 100);
});

test('applyDamage depletes shields before health', () => {
  const res1 = applyDamage(100, 50, 30);
  assert.equal(res1.shield, 20);
  assert.equal(res1.health, 100);

  const res2 = applyDamage(100, 20, 50);
  assert.equal(res2.shield, 0);
  assert.equal(res2.health, 70);
  assert.equal(res2.damageDealtToHealth, 30);
});

test('handlePlayerFall decrements lives and handles elimination', () => {
  const fall1 = handlePlayerFall(3, 100, 50);
  assert.equal(fall1.livesRemaining, 2);
  assert.equal(fall1.isEliminated, false);

  const fallFinal = handlePlayerFall(1, 100, 50);
  assert.equal(fallFinal.livesRemaining, 0);
  assert.equal(fallFinal.isEliminated, true);
});

test('evaluateMatchStatus detects winner when 1 survivor remains or time expires', () => {
  const dummyPlayers = [
    { id: 'p1', name: 'YOU', color: 'cyan', accentHex: 0x00f0ff, health: 100, maxHealth: 100, shield: 50, maxShield: 50, stamina: 100, maxStamina: 100, lives: 2, isAlive: true, score: 300, kos: 2, grapplesUsed: 5, bumpersHit: 3, activePowerup: null },
    { id: 'p2', name: 'P2', color: 'red', accentHex: 0xff3b3b, health: 0, maxHealth: 100, shield: 0, maxShield: 50, stamina: 0, maxStamina: 100, lives: 0, isAlive: false, score: 100, kos: 0, grapplesUsed: 1, bumpersHit: 2, activePowerup: null },
    { id: 'p3', name: 'P3', color: 'green', accentHex: 0x00ff66, health: 0, maxHealth: 100, shield: 0, maxShield: 50, stamina: 0, maxStamina: 100, lives: 0, isAlive: false, score: 50, kos: 0, grapplesUsed: 0, bumpersHit: 1, activePowerup: null },
  ];

  const status = evaluateMatchStatus(dummyPlayers, 120);
  assert.equal(status.isGameOver, true);
  assert.equal(status.winner?.id, 'p1');
  assert.equal(status.aliveCount, 1);
});

test('formatMatchTimer formats MM:SS correctly', () => {
  assert.equal(formatMatchTimer(102), '01:42');
  assert.equal(formatMatchTimer(5), '00:05');
  assert.equal(formatMatchTimer(0), '00:00');
});
