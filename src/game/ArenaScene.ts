import Phaser from 'phaser';
import { inputManager } from './input.ts';
import { soundEngine } from './audio.ts';
import {
  ARENA_CONFIG,
  STAMINA_COSTS,
  calculateKnockback,
  evaluateArenaBounds,
  consumeStamina,
  regenerateStamina,
  applyDamage,
  handlePlayerFall,
  PlayerStats,
} from './rules.ts';
import {
  SoloMatchConfig,
  CharacterArchetype,
  CHARACTER_PROFILES,
  AIDifficulty,
  RoomState,
  AuthoritativeMatchTick,
} from './multiplayerTypes.ts';
import { multiplayerClient } from './multiplayerClient.ts';

export interface Combatant {
  id: string;
  name: string;
  colorName: string;
  tint: number;
  isHuman: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number; // Face angle in radians
  aimX: number;
  aimY: number;
  stats: PlayerStats;
  dashTimer: number;
  dashDuration: number;
  dashVx: number;
  dashVy: number;
  knockbackImmunityTimer: number;
  attackCooldown: number;
  tacticalCooldown: number;
  grappleState: {
    active: boolean;
    targetX: number;
    targetY: number;
    targetType: 'anchor' | 'player' | 'crate' | 'point';
    targetRef?: Combatant | Crate;
    length: number;
  } | null;
  isFalling: boolean;
  fallScale: number;
  respawnTimer: number;
  invulnerableTimer: number;
  container: Phaser.GameObjects.Container;
  bodySprite: Phaser.GameObjects.Arc;
  glowSprite: Phaser.GameObjects.Arc;
  visorSprite: Phaser.GameObjects.Arc;
  weaponAimGlow: Phaser.GameObjects.Rectangle;
  overheadBarBg: Phaser.GameObjects.Rectangle;
  overheadBarFill: Phaser.GameObjects.Rectangle;
  overheadName: Phaser.GameObjects.Text;
}

export interface Bumper {
  x: number;
  y: number;
  radius: number;
  sprite: Phaser.GameObjects.Container;
  pulseTween?: Phaser.Tweens.Tween;
  lastHitTime: number;
}

export interface GrappleAnchor {
  x: number;
  y: number;
  radius: number;
  container: Phaser.GameObjects.Container;
}

export interface Crate {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  angle: number;
  container: Phaser.GameObjects.Container;
}

export interface PowerupItem {
  id: string;
  type: 'overdrive' | 'shield' | 'supergrapple' | 'speed';
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  spawnTime: number;
}

export interface ArenaEvent {
  name: string;
  type: 'magnetic_surge' | 'electric_storm' | 'gravity_pull' | 'sudden_death';
  timeRemaining: number;
  duration: number;
  active: boolean;
}

export interface GameStateUpdate {
  players: PlayerStats[];
  matchTimeSeconds: number;
  currentRound: number;
  totalRounds: number;
  nextEventName: string;
  nextEventTime: number;
  isGameOver: boolean;
  winner: PlayerStats | null;
  suddenDeath: boolean;
  cameraShakeTrauma: number;
}

export class ArenaScene extends Phaser.Scene {
  private players: Combatant[] = [];
  private bumpers: Bumper[] = [];
  private anchors: GrappleAnchor[] = [];
  private crates: Crate[] = [];
  private powerups: PowerupItem[] = [];
  private activeEvent: ArenaEvent | null = null;
  private nextEventTimer: number = 25; // First event in 25s
  private nextEventIndex: number = 0;
  private eventCatalog: Array<{ name: string; type: ArenaEvent['type'] }> = [
    { name: 'Magnetic Surge', type: 'magnetic_surge' },
    { name: 'Electric Storm', type: 'electric_storm' },
    { name: 'Gravity Vortex', type: 'gravity_pull' },
    { name: 'Sudden Death', type: 'sudden_death' },
  ];

  // Visual & World objects
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private electricBarrierGraphics!: Phaser.GameObjects.Graphics;
  private gravityWellContainer!: Phaser.GameObjects.Container;
  private launchPadContainer!: Phaser.GameObjects.Container;

  public matchPhase: 'title' | 'countdown' | 'fighting' | 'ended' = 'title';
  public isOnlineMode: boolean = false;
  private currentSoloConfig: SoloMatchConfig | null = null;
  private aiDifficulty: AIDifficulty = 'normal';
  private lastInputSentTime: number = 0;
  private unsubTick?: () => void;
  private unsubCountdown?: () => void;
  private unsubMatchEnd?: () => void;
  private countdownTimer: number = 3.5;
  private lastBeepInt: number = 4;
  private countdownBannerContainer?: Phaser.GameObjects.Container;
  private countdownText?: Phaser.GameObjects.Text;

  private matchTimeRemaining: number = ARENA_CONFIG.matchDurationSeconds;
  private currentRound: number = 1;
  private totalRounds: number = 3;
  private isGameOver: boolean = false;
  private isPaused: boolean = false;
  private suddenDeathActive: boolean = false;
  private hitstopTimer: number = 0;
  private currentPlatformRadius: number = ARENA_CONFIG.radius;

  // Gravity well & hazards position
  private gravityWellPos = { x: -280, y: 120 };
  private gravityWellActive = true;
  private electricBarrierPylons = [
    { x: 340, y: -140 },
    { x: 380, y: 100 },
  ];
  private electricBarrierActive = false;
  private electricBarrierTimer = 6;
  private launchPadPos = { x: 300, y: 240, angle: -Math.PI * 0.75 };

  // Callbacks to React
  private onStateUpdate?: (state: GameStateUpdate) => void;
  private lastStateEmitTime: number = 0;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  public init(data: { onStateUpdate?: (state: GameStateUpdate) => void }) {
    this.onStateUpdate = data.onStateUpdate;
  }

  public create() {
    // Center of arena world is (0, 0)
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.cameras.main.centerOn(0, 0);
    this.cameras.main.setBackgroundColor('#06080d');

    this.createBackground();
    this.createArenaGeometry();
    this.createHazardsAndProps();
    this.createPlayers();
    this.createCountdownBanner();

    // Spawn initial power-ups
    this.spawnPowerup('overdrive', 0, 180);
    this.spawnPowerup('speed', -160, -160);

    // Click to attack on desktop
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        inputManager.setTouchAction('knockback', true);
      }
    });
    this.input.on('pointerup', () => {
      inputManager.setTouchAction('knockback', false);
    });

    // Window resize handler
    this.scale.on('resize', this.handleResize, this);
    this.handleResize();
  }

  private handleResize() {
    const w = this.scale.width;
    const h = this.scale.height;
    // Scale camera zoom so arena fits comfortably across phones and desktop
    const minDim = Math.min(w, h);
    // Base arena is ~1100px wide
    const targetZoom = Math.max(0.48, Math.min(1.05, minDim / 940));
    this.cameras.main.setZoom(targetZoom);
    this.cameras.main.centerOn(0, 0);
  }

  private createBackground() {
    // Cosmic lava & abyss particles
    const bgGfx = this.add.graphics();
    bgGfx.setDepth(-100);

    // Deep starry lava void gradient rings
    for (let r = 900; r >= 460; r -= 40) {
      const alpha = Phaser.Math.Clamp((r - 460) / 400, 0.1, 0.45);
      bgGfx.lineStyle(40, 0xff3b00, alpha * 0.35);
      bgGfx.strokeCircle(0, 0, r);
    }

    // Outer molten lava tendrils and glowing embers
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const dist = 580 + Math.sin(i * 3) * 80;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      bgGfx.fillStyle(0xff5500, 0.6);
      bgGfx.fillCircle(px, py, 6 + (i % 5) * 2);
    }
  }

  private createArenaGeometry() {
    this.arenaGraphics = this.add.graphics();
    this.arenaGraphics.setDepth(-10);
    this.renderArenaFloor();
  }

  private renderArenaFloor() {
    const g = this.arenaGraphics;
    g.clear();

    const R = this.currentPlatformRadius;
    const numSides = 8; // Octagonal sci-fi platform

    // 1. Outer metallic platform drop shadow
    g.fillStyle(0x05070a, 0.95);
    this.drawRegularPolygon(g, 0, 12, R + 12, numSides);

    // 2. Base platform surface - dark titanium metallic plates
    g.fillStyle(0x181f2b, 1);
    this.drawRegularPolygon(g, 0, 0, R, numSides);

    // Inner plate beveling
    g.fillStyle(0x212a38, 1);
    this.drawRegularPolygon(g, 0, 0, R - 24, numSides);

    // 3. Hazard warning edge stripe ring
    g.lineStyle(10, 0xff7700, 0.85);
    this.drawRegularPolygonOutline(g, 0, 0, R - 8, numSides);

    // Outer neon cyan guard border
    g.lineStyle(6, 0x00f0ff, 0.95);
    this.drawRegularPolygonOutline(g, 0, 0, R - 18, numSides);

    // 4. Panel sector dividing lines
    g.lineStyle(2, 0x0e1724, 0.8);
    for (let i = 0; i < numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2;
      const x1 = Math.cos(angle) * (ARENA_CONFIG.innerRadius - 20);
      const y1 = Math.sin(angle) * (ARENA_CONFIG.innerRadius - 20);
      const x2 = Math.cos(angle) * (R - 24);
      const y2 = Math.sin(angle) * (R - 24);
      g.lineBetween(x1, y1, x2, y2);
    }

    // 5. Central raised octagonal combat platform
    g.fillStyle(0x0f1520, 1);
    this.drawRegularPolygon(g, 0, 0, ARENA_CONFIG.innerRadius, numSides);

    // Central platform neon cyan energy ring
    g.lineStyle(4, 0x00f0ff, 0.9);
    this.drawRegularPolygonOutline(g, 0, 0, ARENA_CONFIG.innerRadius - 10, numSides);

    // Inner core glowing disk
    g.fillStyle(0x08243b, 1);
    g.fillCircle(0, 0, 90);
    g.lineStyle(3, 0x00e5ff, 0.8);
    g.strokeCircle(0, 0, 90);
    g.lineStyle(1.5, 0x00a8ff, 0.5);
    g.strokeCircle(0, 0, 50);
  }

  private drawRegularPolygon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, sides: number) {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
      points.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
    g.fillPoints(points, true);
  }

  private drawRegularPolygonOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, sides: number) {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / sides;
      points.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
    g.strokePoints(points, true);
  }

  private createHazardsAndProps() {
    this.fxGraphics = this.add.graphics();
    this.fxGraphics.setDepth(20);

    this.electricBarrierGraphics = this.add.graphics();
    this.electricBarrierGraphics.setDepth(15);

    // 1. Create 4 glowing bumpers (Cyan core with orange base)
    const bumperPositions = [
      { x: -140, y: -130 },
      { x: 140, y: -130 },
      { x: -140, y: 130 },
      { x: 140, y: 130 },
    ];

    bumperPositions.forEach((pos) => {
      const bContainer = this.add.container(pos.x, pos.y);
      bContainer.setDepth(5);

      // Base ring (orange tech mount)
      const base = this.add.arc(0, 0, 36, 0, 360, false, 0xff7700, 1);
      const innerBase = this.add.arc(0, 0, 30, 0, 360, false, 0x1f1915, 1);
      const bumperCore = this.add.arc(0, 0, 24, 0, 360, false, 0x00f0ff, 0.95);
      const bumperGlow = this.add.arc(0, 0, 16, 0, 360, false, 0xffffff, 0.9);

      bContainer.add([base, innerBase, bumperCore, bumperGlow]);

      // Subtle pulse tween
      this.tweens.add({
        targets: bumperCore,
        scale: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 800,
        ease: 'Sine.easeInOut',
      });

      this.bumpers.push({
        x: pos.x,
        y: pos.y,
        radius: 34,
        sprite: bContainer,
        lastHitTime: 0,
      });
    });

    // 2. Create 4 Grapple Anchors (tech pylons with glowing cyan nodes)
    const anchorPositions = [
      { x: 0, y: -340 },
      { x: 0, y: 340 },
      { x: -350, y: 0 },
      { x: 350, y: -260 },
    ];

    anchorPositions.forEach((pos) => {
      const aContainer = this.add.container(pos.x, pos.y);
      aContainer.setDepth(6);

      const pylonBase = this.add.rectangle(0, 0, 32, 32, 0x1c2430);
      pylonBase.setStrokeStyle(2, 0x00f0ff, 0.8);
      const pylonNode = this.add.arc(0, 0, 12, 0, 360, false, 0x00f0ff, 1);
      const pylonPulse = this.add.arc(0, 0, 18, 0, 360, false, 0x00f0ff, 0.3);

      this.tweens.add({
        targets: pylonPulse,
        scale: 1.4,
        alpha: 0,
        repeat: -1,
        duration: 1200,
      });

      aContainer.add([pylonBase, pylonPulse, pylonNode]);
      this.anchors.push({
        x: pos.x,
        y: pos.y,
        radius: 20,
        container: aContainer,
      });
    });

    // 3. Create 3 Movable Crates
    const cratePositions = [
      { x: -210, y: -30 },
      { x: -170, y: 220 },
      { x: 190, y: -40 },
    ];

    cratePositions.forEach((pos) => {
      const cContainer = this.add.container(pos.x, pos.y);
      cContainer.setDepth(7);

      const box = this.add.rectangle(0, 0, 48, 48, 0x242d3b);
      box.setStrokeStyle(2, 0xff8c00, 0.8);
      const stripe1 = this.add.rectangle(0, 0, 40, 8, 0x181f2a);
      const stripe2 = this.add.rectangle(0, 0, 8, 40, 0x181f2a);
      const hazardMark = this.add.text(0, 0, '⚠️', { fontSize: '14px' }).setOrigin(0.5);

      cContainer.add([box, stripe1, stripe2, hazardMark]);

      this.crates.push({
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        width: 48,
        height: 48,
        angle: 0,
        container: cContainer,
      });
    });

    // 4. Create Gravity Well
    this.gravityWellContainer = this.add.container(this.gravityWellPos.x, this.gravityWellPos.y);
    this.gravityWellContainer.setDepth(4);
    const vortexOuter = this.add.arc(0, 0, 60, 0, 360, false, 0x8000ff, 0.2);
    const vortexMid = this.add.arc(0, 0, 40, 0, 360, false, 0xa855f7, 0.4);
    const vortexCore = this.add.arc(0, 0, 18, 0, 360, false, 0x120024, 0.95);
    const vortexLabel = this.add.text(0, -66, 'GRAVITY WELL', {
      fontFamily: 'Chakra Petch',
      fontSize: '11px',
      color: '#c084fc',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [vortexOuter, vortexMid],
      rotation: Math.PI * 2,
      repeat: -1,
      duration: 3000,
    });

    this.gravityWellContainer.add([vortexOuter, vortexMid, vortexCore, vortexLabel]);

    // 5. Create Launch Pad
    this.launchPadContainer = this.add.container(this.launchPadPos.x, this.launchPadPos.y);
    this.launchPadContainer.setDepth(4);
    const padBase = this.add.rectangle(0, 0, 52, 52, 0x1e2736);
    padBase.setStrokeStyle(2, 0xffd700, 0.85);
    const chevronText = this.add.text(0, 0, '>>>', {
      fontFamily: 'Rajdhani',
      fontSize: '22px',
      color: '#ffea00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    chevronText.setRotation(this.launchPadPos.angle);

    this.launchPadContainer.add([padBase, chevronText]);
  }

  private createPlayers() {
    const combatantConfigs = [
      { id: 'p1', name: 'YOU', color: 'cyan', tint: 0x00f0ff, isHuman: true, startAngle: Math.PI / 2, personality: 'player' as const },
      { id: 'p2', name: 'P2', color: 'red', tint: 0xff3838, isHuman: false, startAngle: -Math.PI / 2, personality: 'aggressor' as const },
      { id: 'p3', name: 'P3', color: 'green', tint: 0x00ff66, isHuman: false, startAngle: -Math.PI * 0.8, personality: 'survivor' as const },
      { id: 'p4', name: 'P4', color: 'yellow', tint: 0xffd600, isHuman: false, startAngle: -Math.PI * 0.2, personality: 'opportunist' as const },
      { id: 'p5', name: 'P5', color: 'purple', tint: 0xbf5af2, isHuman: false, startAngle: Math.PI * 0.2, personality: 'controller' as const },
      { id: 'p6', name: 'P6', color: 'orange', tint: 0xff8800, isHuman: false, startAngle: Math.PI * 0.8, personality: 'duelist' as const },
    ];

    combatantConfigs.forEach((cfg, idx) => {
      // Position evenly around central circle
      const dist = 140;
      const angle = (idx / combatantConfigs.length) * Math.PI * 2;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      const container = this.add.container(px, py);
      container.setDepth(10);

      // Body circular chassis
      const glowSprite = this.add.arc(0, 0, 24, 0, 360, false, cfg.tint, 0.35);
      const bodySprite = this.add.arc(0, 0, 18, 0, 360, false, 0x111622, 1);
      bodySprite.setStrokeStyle(3, cfg.tint, 1);

      // Visor / Face directional indicator
      const visorSprite = this.add.arc(10, 0, 6, 0, 360, false, cfg.tint, 1);

      // Aim directional laser
      const weaponAimGlow = this.add.rectangle(0, 0, 28, 2, cfg.tint, cfg.isHuman ? 0.85 : 0.45);
      weaponAimGlow.setOrigin(0, 0.5);

      // Overhead name & health bar
      const overheadName = this.add.text(0, -32, cfg.name, {
        fontFamily: 'Chakra Petch',
        fontSize: '11px',
        color: cfg.color === 'cyan' ? '#00f0ff' : '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const overheadBarBg = this.add.rectangle(0, -22, 36, 5, 0x0a0f17);
      overheadBarBg.setStrokeStyle(1, 0x223044);
      const overheadBarFill = this.add.rectangle(-18, -22, 36, 5, cfg.tint).setOrigin(0, 0.5);

      container.add([glowSprite, weaponAimGlow, bodySprite, visorSprite, overheadName, overheadBarBg, overheadBarFill]);

      const combatant: Combatant = {
        id: cfg.id,
        name: cfg.name,
        colorName: cfg.color,
        tint: cfg.tint,
        isHuman: cfg.isHuman,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        radius: 20,
        angle: angle,
        aimX: Math.cos(angle),
        aimY: Math.sin(angle),
        stats: {
          id: cfg.id,
          name: cfg.name,
          color: cfg.color,
          accentHex: cfg.tint,
          health: 100,
          maxHealth: 100,
          shield: 50,
          maxShield: 50,
          stamina: 100,
          maxStamina: 100,
          lives: ARENA_CONFIG.initialLives,
          isAlive: true,
          score: 0,
          kos: 0,
          grapplesUsed: 0,
          bumpersHit: 0,
          activePowerup: null,
          personality: cfg.personality,
        },
        dashTimer: 0,
        dashDuration: 0.18,
        dashVx: 0,
        dashVy: 0,
        knockbackImmunityTimer: 0,
        attackCooldown: 0,
        tacticalCooldown: 0,
        grappleState: null,
        isFalling: false,
        fallScale: 1,
        respawnTimer: 0,
        invulnerableTimer: 2.0, // Brief spawn invulnerability
        container,
        bodySprite,
        glowSprite,
        visorSprite,
        weaponAimGlow,
        overheadBarBg,
        overheadBarFill,
        overheadName,
      };

      this.players.push(combatant);
    });
  }

  private createCountdownBanner() {
    this.countdownBannerContainer = this.add.container(0, -60);
    this.countdownBannerContainer.setDepth(100);
    this.countdownBannerContainer.setVisible(false);

    const bg = this.add.rectangle(0, 0, 240, 72, 0x050a14, 0.92);
    bg.setStrokeStyle(2, 0x00f0ff, 0.95);

    this.countdownText = this.add.text(0, 0, 'READY', {
      fontFamily: 'Chakra Petch',
      fontSize: '44px',
      color: '#00f0ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.countdownBannerContainer.add([bg, this.countdownText]);
  }

  public spawnPowerup(type: PowerupItem['type'], x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(8);

    const color = type === 'overdrive' ? 0xc084fc : type === 'shield' ? 0x00f0ff : type === 'speed' ? 0xffea00 : 0x00ff66;
    const ring = this.add.arc(0, 0, 20, 0, 360, false, color, 0.3);
    const core = this.add.arc(0, 0, 12, 0, 360, false, color, 0.9);
    const iconText = this.add.text(0, 0, type === 'overdrive' ? '⚡' : type === 'shield' ? '🛡️' : type === 'speed' ? '⏩' : '⚓', {
      fontSize: '14px',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: ring,
      scale: 1.3,
      alpha: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 700,
    });

    container.add([ring, core, iconText]);

    this.powerups.push({
      id: `pw_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      container,
      spawnTime: this.time.now,
    });
  }

  public update(time: number, delta: number) {
    if (this.isPaused) return;

    // Clamped delta time to prevent tunneling
    const dt = Math.min(delta / 1000, 0.05);

    // 1. If in TITLE mode: keep arena in ambient preview (no combat, no timer drain)
    if (this.matchPhase === 'title') {
      const camAngle = time * 0.0003;
      this.cameras.main.centerOn(Math.cos(camAngle) * 35, Math.sin(camAngle) * 35);

      // Keep players at their starting positions, facing slightly outward
      this.players.forEach((p) => {
        p.container.setPosition(p.x, p.y);
        p.visorSprite.setPosition(Math.cos(p.angle) * 12, Math.sin(p.angle) * 12);
        p.weaponAimGlow.setRotation(p.angle);
      });

      if (time - this.lastStateEmitTime > 100) {
        this.lastStateEmitTime = time;
        this.emitStateToReact();
      }
      return;
    }

    // 2. If in COUNTDOWN mode: 3... 2... 1... FIGHT!
    if (this.matchPhase === 'countdown') {
      this.countdownTimer -= dt;
      const currentInt = Math.ceil(this.countdownTimer);

      if (currentInt > 0 && currentInt <= 3 && currentInt !== this.lastBeepInt) {
        this.lastBeepInt = currentInt;
        soundEngine.playCountdown(false);
        if (this.countdownText) {
          this.countdownText.setText(currentInt.toString());
          this.countdownText.setColor('#00f0ff');
        }
      }

      if (this.countdownTimer <= 0.6 && this.countdownTimer > 0) {
        if (this.countdownText && this.countdownText.text !== 'FIGHT!') {
          this.countdownText.setText('FIGHT!');
          this.countdownText.setColor('#ffd700');
          soundEngine.playCountdown(true);
        }
      }

      if (this.countdownTimer <= 0) {
        this.matchPhase = 'fighting';
        if (this.countdownBannerContainer) {
          this.countdownBannerContainer.setVisible(false);
        }
      }

      // Allow aiming during countdown so player can adjust direction
      inputManager.update();
      const input = inputManager.getState();
      const human = this.players.find((p) => p.isHuman);
      if (human && (input.aim.x !== 0 || input.aim.y !== 0)) {
        human.angle = Math.atan2(input.aim.y, input.aim.x);
        human.visorSprite.setPosition(Math.cos(human.angle) * 12, Math.sin(human.angle) * 12);
        human.weaponAimGlow.setRotation(human.angle);
      }

      if (time - this.lastStateEmitTime > 80) {
        this.lastStateEmitTime = time;
        this.emitStateToReact();
      }
      return;
    }

    // 3. FIGHTING PHASE (Active match)
    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Input Manager update
    inputManager.update();
    const input = inputManager.getState();

    // In online mode: client streams inputs and lets server drive simulation
    if (this.isOnlineMode) {
      if (time - this.lastInputSentTime > 33) {
        this.lastInputSentTime = time;
        multiplayerClient.sendInput({
          move: input.move,
          aim: input.aim,
          knockback: input.isKnockbackPressed,
          dash: input.isDashPressed,
          grapple: input.isGrapplePressed,
          tactical: input.isTacticalPressed,
        });
      }

      const myPlayer = this.players.find((p) => p.isHuman) || this.players[0];
      if (myPlayer && myPlayer.stats.isAlive) {
        this.cameras.main.pan(myPlayer.x, myPlayer.y, 100, 'Linear', true);
      } else {
        this.cameras.main.centerOn(0, 0);
      }

      this.updateElectricBarrier(dt);
      this.renderFX();

      if (time - this.lastStateEmitTime > 50) {
        this.lastStateEmitTime = time;
        this.emitStateToReact();
      }
      return;
    }

    // Sudden death & Match timer
    if (!this.isGameOver) {
      this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - dt);
      if (this.matchTimeRemaining <= 0 && !this.suddenDeathActive) {
        this.triggerSuddenDeath();
      }
    }

    // Update Arena Events
    this.updateArenaEvents(dt);

    // Update Electric Barrier
    this.updateElectricBarrier(dt);

    // Update Crates
    this.updateCrates(dt);

    // Update Players (Human + AI)
    this.players.forEach((player) => {
      if (!player.stats.isAlive) {
        player.container.setVisible(false);
        return;
      }

      // Decrement timers
      if (player.invulnerableTimer > 0) {
        player.invulnerableTimer -= dt;
        player.glowSprite.setAlpha(Math.sin(time * 0.02) * 0.4 + 0.5);
      } else {
        player.glowSprite.setAlpha(0.35);
      }

      if (player.attackCooldown > 0) player.attackCooldown -= dt;
      if (player.tacticalCooldown > 0) player.tacticalCooldown -= dt;
      if (player.knockbackImmunityTimer > 0) player.knockbackImmunityTimer -= dt;

      // Regenerate stamina
      player.stats.stamina = regenerateStamina(player.stats.stamina, dt);

      // Power-up countdown
      if (player.stats.activePowerup) {
        player.stats.activePowerup.duration -= dt;
        if (player.stats.activePowerup.duration <= 0) {
          player.stats.activePowerup = null;
        }
      }

      if (player.isFalling) {
        this.handleFallingPlayer(player, dt);
        return;
      }

      // Movement & Input
      if (player.isHuman) {
        this.handleHumanCombatant(player, input, dt);
      } else {
        this.handleAiCombatant(player, dt);
      }

      // Physics integration (velocity, friction, bounce)
      this.integratePhysics(player, dt);

      // Check arena boundaries & falling
      const bounds = evaluateArenaBounds({ x: player.x, y: player.y }, { x: 0, y: 0 }, this.currentPlatformRadius);
      if (bounds.isFalling && player.invulnerableTimer <= 0) {
        this.startFalling(player);
      }

      // Check Bumper collisions
      this.checkBumperCollisions(player);

      // Check Hazard interactions (Gravity well, launch pad, electric barrier)
      this.checkHazardInteractions(player, dt);

      // Check Power-up collection
      this.checkPowerupCollisions(player);

      // Update Visuals (overhead bars, container position)
      player.container.setPosition(player.x, player.y);
      player.visorSprite.setPosition(Math.cos(player.angle) * 12, Math.sin(player.angle) * 12);
      player.weaponAimGlow.setRotation(player.angle);

      // Update Overhead Bar
      const totalVitality = player.stats.health + player.stats.shield;
      const maxVitality = player.stats.maxHealth + player.stats.maxShield;
      const barRatio = Phaser.Math.Clamp(totalVitality / maxVitality, 0, 1);
      player.overheadBarFill.setScale(barRatio, 1);
    });

    // Player vs Player collisions & pushback
    this.resolvePlayerCollisions();

    // Render Grapple Tethers & FX
    this.renderFX();

    // Check Match Win/Loss conditions
    this.checkMatchConditions();

    // Send state to React HUD every 50ms
    if (time - this.lastStateEmitTime > 50) {
      this.lastStateEmitTime = time;
      this.emitStateToReact();
    }
  }

  private handleHumanCombatant(player: Combatant, input: ReturnType<typeof inputManager.getState>, dt: number) {
    const baseSpeed = player.stats.activePowerup?.type === 'speed' ? 360 : player.stats.activePowerup?.type === 'overdrive' ? 330 : 250;

    // Dash execution
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      player.vx = player.dashVx;
      player.vy = player.dashVy;
      // Dash ghost particle
      if (Math.random() < 0.4) {
        this.createDashGhost(player.x, player.y, player.tint);
      }
    } else {
      // Normal movement input
      if (input.move.x !== 0 || input.move.y !== 0) {
        const accel = 1800;
        player.vx = Phaser.Math.Linear(player.vx, input.move.x * baseSpeed, accel * dt / 250);
        player.vy = Phaser.Math.Linear(player.vy, input.move.y * baseSpeed, accel * dt / 250);
      }

      // Aiming
      if (input.aim.x !== 0 || input.aim.y !== 0) {
        player.angle = Math.atan2(input.aim.y, input.aim.x);
        player.aimX = input.aim.x;
        player.aimY = input.aim.y;
      }
    }

    // Action: Dash (Shift / Button)
    if (input.justDash && player.dashTimer <= 0) {
      const remainingStamina = consumeStamina(player.stats.stamina, STAMINA_COSTS.dash);
      if (remainingStamina !== null) {
        player.stats.stamina = remainingStamina;
        const dashDirX = input.move.x !== 0 || input.move.y !== 0 ? input.move.x : Math.cos(player.angle);
        const dashDirY = input.move.x !== 0 || input.move.y !== 0 ? input.move.y : Math.sin(player.angle);
        const dashSpeed = 640;
        player.dashTimer = player.dashDuration;
        player.dashVx = dashDirX * dashSpeed;
        player.dashVy = dashDirY * dashSpeed;
        player.invulnerableTimer = 0.18;
        soundEngine.playDash();
      }
    }

    // Action: Grapple (Space / Button)
    if (input.justGrapple) {
      if (player.grappleState?.active) {
        // Release grapple
        player.grappleState = null;
      } else {
        const remainingStamina = consumeStamina(player.stats.stamina, STAMINA_COSTS.grapple);
        if (remainingStamina !== null) {
          this.executeGrapple(player);
        }
      }
    }

    // Action: Knockback Attack (LMB / Button)
    if (input.justKnockback && player.attackCooldown <= 0) {
      this.executeKnockbackAttack(player);
    }

    // Action: Tactical Ability (E / Button)
    if (input.justTactical && player.tacticalCooldown <= 0) {
      const remainingStamina = consumeStamina(player.stats.stamina, STAMINA_COSTS.tactical);
      if (remainingStamina !== null) {
        player.stats.stamina = remainingStamina;
        this.executeTacticalAbility(player);
      }
    }

    // Handle Active Grapple Pull
    if (player.grappleState?.active) {
      this.processGrapplePull(player, dt);
    }
  }

  private handleAiCombatant(ai: Combatant, dt: number) {
    const speedMultMap: Record<AIDifficulty, number> = {
      easy: 0.75,
      normal: 1.0,
      hard: 1.25,
      extreme: 1.45,
    };
    const baseSpeed = 220 * (speedMultMap[this.aiDifficulty] || 1.0);

    // Find human player and other AI combatants
    const human = this.players.find((p) => p.isHuman && p.stats.isAlive && !p.isFalling);
    const aliveTargets = this.players.filter((p) => p.id !== ai.id && p.stats.isAlive && !p.isFalling);

    // AI personality behaviors
    let targetX = 0;
    let targetY = 0;
    let shouldAttack = false;
    let shouldGrapple = false;
    let shouldDash = false;

    const distFromCenter = Math.hypot(ai.x, ai.y);
    const isNearEdge = distFromCenter > this.currentPlatformRadius * 0.75;

    switch (ai.stats.personality) {
      case 'aggressor': {
        // Relentlessly chase closest target
        let closest: Combatant | null = null;
        let minDist = 9999;
        aliveTargets.forEach((t) => {
          const d = Math.hypot(t.x - ai.x, t.y - ai.y);
          if (d < minDist) {
            minDist = d;
            closest = t;
          }
        });

        if (closest) {
          targetX = (closest as Combatant).x;
          targetY = (closest as Combatant).y;
          if (minDist < 85) shouldAttack = true;
          if (minDist > 160 && minDist < 300 && Math.random() < 0.05) shouldDash = true;
        }
        break;
      }

      case 'survivor': {
        // Stay strictly near center, evade edges
        if (isNearEdge) {
          targetX = 0;
          targetY = 0;
          if (distFromCenter > this.currentPlatformRadius * 0.85) shouldGrapple = true;
        } else {
          // Circle center slowly
          const ang = this.time.now * 0.001 + parseInt(ai.id.replace('p', ''));
          targetX = Math.cos(ang) * 90;
          targetY = Math.sin(ang) * 90;
          // Defend if enemy too close
          const nearEnemy = aliveTargets.find((t) => Math.hypot(t.x - ai.x, t.y - ai.y) < 70);
          if (nearEnemy) shouldAttack = true;
        }
        break;
      }

      case 'opportunist': {
        // Go for power-ups or weak players
        if (this.powerups.length > 0) {
          targetX = this.powerups[0].x;
          targetY = this.powerups[0].y;
        } else if (human) {
          targetX = human.x;
          targetY = human.y;
          if (Math.hypot(human.x - ai.x, human.y - ai.y) < 80) shouldAttack = true;
        }
        break;
      }

      case 'controller': {
        // Camp near gravity well or launch pad and knock players in
        targetX = this.gravityWellPos.x + 80;
        targetY = this.gravityWellPos.y;
        const nearEnemy = aliveTargets.find((t) => Math.hypot(t.x - ai.x, t.y - ai.y) < 90);
        if (nearEnemy) shouldAttack = true;
        break;
      }

      case 'duelist':
      default: {
        // Tactical mid-range, use grapple and knockback
        if (human) {
          const d = Math.hypot(human.x - ai.x, human.y - ai.y);
          if (d > 140) {
            targetX = human.x;
            targetY = human.y;
          } else if (d < 70) {
            shouldAttack = true;
            targetX = ai.x - (human.x - ai.x);
            targetY = ai.y - (human.y - ai.y);
          } else {
            // Strafe
            targetX = human.x + Math.sin(this.time.now * 0.002) * 110;
            targetY = human.y + Math.cos(this.time.now * 0.002) * 110;
            if (Math.random() < 0.04) shouldGrapple = true;
          }
        }
        break;
      }
    }

    // Move towards target
    const dx = targetX - ai.x;
    const dy = targetY - ai.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 10) {
      const nx = dx / dist;
      const ny = dy / dist;
      ai.vx = Phaser.Math.Linear(ai.vx, nx * baseSpeed, 1200 * dt / 250);
      ai.vy = Phaser.Math.Linear(ai.vy, ny * baseSpeed, 1200 * dt / 250);
      ai.angle = Math.atan2(ny, nx);
      ai.aimX = nx;
      ai.aimY = ny;
    }

    // Execute actions
    if (shouldAttack && ai.attackCooldown <= 0) {
      this.executeKnockbackAttack(ai);
    }

    if (shouldDash && ai.dashTimer <= 0 && ai.stats.stamina >= STAMINA_COSTS.dash) {
      ai.stats.stamina -= STAMINA_COSTS.dash;
      ai.dashTimer = ai.dashDuration;
      ai.dashVx = Math.cos(ai.angle) * 580;
      ai.dashVy = Math.sin(ai.angle) * 580;
    }

    if (shouldGrapple && !ai.grappleState && ai.stats.stamina >= STAMINA_COSTS.grapple) {
      this.executeGrapple(ai);
    }

    // Process active grapple
    if (ai.grappleState?.active) {
      this.processGrapplePull(ai, dt);
    }
  }

  private executeKnockbackAttack(attacker: Combatant) {
    attacker.attackCooldown = 0.45; // Cooldown between attacks
    const attackRange = 90;
    const attackArc = Math.PI * 0.75; // ~135 degrees cone
    const powerMultiplier = attacker.stats.activePowerup?.type === 'overdrive' ? 2.0 : 1.0;
    const baseDamage = 25 * powerMultiplier;

    // Visual melee slash wave
    this.createSlashWave(attacker.x, attacker.y, attacker.angle, attacker.tint);
    soundEngine.playKnockbackHit(false);

    // Check hit targets
    this.players.forEach((target) => {
      if (target.id === attacker.id || !target.stats.isAlive || target.isFalling || target.invulnerableTimer > 0) return;

      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= attackRange) {
        const angleToTarget = Math.atan2(dy, dx);
        const angleDiff = Phaser.Math.Angle.Wrap(angleToTarget - attacker.angle);

        if (Math.abs(angleDiff) <= attackArc / 2) {
          // Hit confirmed!
          const knockback = calculateKnockback(
            { x: attacker.x, y: attacker.y },
            { x: target.x, y: target.y },
            480,
            powerMultiplier
          );

          target.vx += knockback.x;
          target.vy += knockback.y;

          // Apply damage
          const dmgResult = applyDamage(target.stats.health, target.stats.shield, baseDamage);
          target.stats.health = dmgResult.health;
          target.stats.shield = dmgResult.shield;
          attacker.stats.score += Math.round(baseDamage * 10);

          // Impact juice
          this.createImpactParticles(target.x, target.y, attacker.tint);
          soundEngine.playKnockbackHit(true);

          if (attacker.isHuman) {
            this.cameras.main.shake(120, 0.008);
            this.hitstopTimer = 0.04; // 40ms simulation hitstop
          }
        }
      }
    });

    // Also push crates in range
    this.crates.forEach((crate) => {
      const dx = crate.x - attacker.x;
      const dy = crate.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= attackRange + 20) {
        const kb = calculateKnockback({ x: attacker.x, y: attacker.y }, { x: crate.x, y: crate.y }, 400, powerMultiplier);
        crate.vx += kb.x;
        crate.vy += kb.y;
        this.createImpactParticles(crate.x, crate.y, 0xffaa00);
      }
    });
  }

  private executeGrapple(combatant: Combatant) {
    const maxGrappleRange = combatant.stats.activePowerup?.type === 'supergrapple' ? 520 : 360;
    combatant.stats.grapplesUsed += 1;

    // Check closest Grapple Anchor in view cone
    let bestTarget: { x: number; y: number; type: 'anchor' | 'crate' | 'player'; ref?: any } | null = null;
    let minDist = maxGrappleRange;

    // 1. Anchors
    this.anchors.forEach((anchor) => {
      const d = Math.hypot(anchor.x - combatant.x, anchor.y - combatant.y);
      if (d < minDist) {
        minDist = d;
        bestTarget = { x: anchor.x, y: anchor.y, type: 'anchor' };
      }
    });

    // 2. Crates
    this.crates.forEach((crate) => {
      const d = Math.hypot(crate.x - combatant.x, crate.y - combatant.y);
      if (d < minDist) {
        minDist = d;
        bestTarget = { x: crate.x, y: crate.y, type: 'crate', ref: crate };
      }
    });

    // 3. Opponents in line of sight
    this.players.forEach((other) => {
      if (other.id === combatant.id || !other.stats.isAlive || other.isFalling) return;
      const d = Math.hypot(other.x - combatant.x, other.y - combatant.y);
      if (d < minDist && d > 60) {
        minDist = d;
        bestTarget = { x: other.x, y: other.y, type: 'player', ref: other };
      }
    });

    if (bestTarget) {
      combatant.grappleState = {
        active: true,
        targetX: (bestTarget as any).x,
        targetY: (bestTarget as any).y,
        targetType: (bestTarget as any).type,
        targetRef: (bestTarget as any).ref,
        length: minDist,
      };
      soundEngine.playGrappleLatch();
    } else {
      soundEngine.playGrappleShoot();
    }
  }

  private processGrapplePull(combatant: Combatant, dt: number) {
    if (!combatant.grappleState) return;

    let targetX = combatant.grappleState.targetX;
    let targetY = combatant.grappleState.targetY;

    if (combatant.grappleState.targetRef) {
      targetX = combatant.grappleState.targetRef.x;
      targetY = combatant.grappleState.targetRef.y;
    }

    const dx = targetX - combatant.x;
    const dy = targetY - combatant.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 40) {
      // Arrived at grapple target, release
      combatant.grappleState = null;
      return;
    }

    const pullSpeed = 520;
    const nx = dx / dist;
    const ny = dy / dist;

    // Pull combatant towards target
    combatant.vx = Phaser.Math.Linear(combatant.vx, nx * pullSpeed, 2000 * dt / 250);
    combatant.vy = Phaser.Math.Linear(combatant.vy, ny * pullSpeed, 2000 * dt / 250);

    // If target is a crate or player, pull them back towards combatant (elastic tug-of-war)
    if (combatant.grappleState.targetType === 'crate' && combatant.grappleState.targetRef) {
      const crate = combatant.grappleState.targetRef as Crate;
      crate.vx -= nx * pullSpeed * 0.4;
      crate.vy -= ny * pullSpeed * 0.4;
    } else if (combatant.grappleState.targetType === 'player' && combatant.grappleState.targetRef) {
      const other = combatant.grappleState.targetRef as Combatant;
      other.vx -= nx * pullSpeed * 0.6;
      other.vy -= ny * pullSpeed * 0.6;
    }
  }

  private executeTacticalAbility(combatant: Combatant) {
    combatant.tacticalCooldown = 3.5;
    const blastRadius = 200;

    // Shockwave ring
    this.createEMPShockwave(combatant.x, combatant.y, combatant.tint);
    soundEngine.playTactical();

    if (combatant.isHuman) {
      this.cameras.main.shake(180, 0.012);
    }

    // Blast all enemies away
    this.players.forEach((target) => {
      if (target.id === combatant.id || !target.stats.isAlive || target.isFalling) return;
      const dx = target.x - combatant.x;
      const dy = target.y - combatant.y;
      const dist = Math.hypot(dx, dy);
      if (dist < blastRadius) {
        const impulse = calculateKnockback({ x: combatant.x, y: combatant.y }, { x: target.x, y: target.y }, 600, 1.0);
        target.vx += impulse.x;
        target.vy += impulse.y;
        target.stats.shield = Math.max(0, target.stats.shield - 30);
      }
    });
  }

  private integratePhysics(entity: { x: number; y: number; vx: number; vy: number }, dt: number) {
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;

    // High tech arena friction
    const friction = 0.92;
    entity.vx *= Math.pow(friction, dt * 60);
    entity.vy *= Math.pow(friction, dt * 60);

    if (Math.abs(entity.vx) < 2) entity.vx = 0;
    if (Math.abs(entity.vy) < 2) entity.vy = 0;
  }

  private checkBumperCollisions(player: Combatant) {
    this.bumpers.forEach((bumper) => {
      const dx = player.x - bumper.x;
      const dy = player.y - bumper.y;
      const dist = Math.hypot(dx, dy);
      const minDist = player.radius + bumper.radius;

      if (dist < minDist) {
        const overlap = minDist - dist;
        const nx = dist > 0.001 ? dx / dist : 1;
        const ny = dist > 0.001 ? dy / dist : 0;

        // Repel player
        player.x += nx * overlap;
        player.y += ny * overlap;

        const bounceImpulse = this.activeEvent?.type === 'magnetic_surge' ? 760 : 540;
        player.vx = nx * bounceImpulse;
        player.vy = ny * bounceImpulse;

        player.stats.bumpersHit += 1;
        soundEngine.playBumperBounce();
        this.createBumperFlash(bumper.x, bumper.y);

        if (player.isHuman) {
          this.cameras.main.shake(100, 0.006);
        }
      }
    });
  }

  private checkHazardInteractions(player: Combatant, dt: number) {
    // 1. Gravity Well
    if (this.gravityWellActive) {
      const dx = this.gravityWellPos.x - player.x;
      const dy = this.gravityWellPos.y - player.y;
      const dist = Math.hypot(dx, dy);
      const pullRadius = 180;

      if (dist < pullRadius && dist > 10) {
        const pullStrength = this.activeEvent?.type === 'gravity_pull' ? 520 : 280;
        const force = (1 - dist / pullRadius) * pullStrength;
        player.vx += (dx / dist) * force * dt;
        player.vy += (dy / dist) * force * dt;
      }
    }

    // 2. Launch Pad
    const ldx = player.x - this.launchPadPos.x;
    const ldy = player.y - this.launchPadPos.y;
    if (Math.hypot(ldx, ldy) < 36) {
      const launchSpeed = 820;
      player.vx = Math.cos(this.launchPadPos.angle) * launchSpeed;
      player.vy = Math.sin(this.launchPadPos.angle) * launchSpeed;
      soundEngine.playLaunchPad();
      this.createLaunchSparks(this.launchPadPos.x, this.launchPadPos.y);
    }

    // 3. Electric Barrier
    if (this.electricBarrierActive) {
      // Line segment between pylons
      const p1 = this.electricBarrierPylons[0];
      const p2 = this.electricBarrierPylons[1];
      const distToLine = this.pointToSegmentDistance(player.x, player.y, p1.x, p1.y, p2.x, p2.y);

      if (distToLine < player.radius + 14 && player.invulnerableTimer <= 0) {
        const impulseAngle = Math.atan2(player.y - (p1.y + p2.y) / 2, player.x - (p1.x + p2.x) / 2);
        player.vx = Math.cos(impulseAngle) * 600;
        player.vy = Math.sin(impulseAngle) * 600;

        const dmg = applyDamage(player.stats.health, player.stats.shield, 35);
        player.stats.health = dmg.health;
        player.stats.shield = dmg.shield;

        soundEngine.playElectricZap();
        this.createElectricSparks(player.x, player.y);
      }
    }
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  private checkPowerupCollisions(player: Combatant) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pw = this.powerups[i];
      const dist = Math.hypot(player.x - pw.x, player.y - pw.y);

      if (dist < player.radius + 18) {
        // Collect powerup!
        player.stats.activePowerup = {
          type: pw.type,
          duration: 12,
          maxDuration: 12,
        };

        if (pw.type === 'shield') {
          player.stats.shield = 50;
        }

        soundEngine.playPowerup();
        pw.container.destroy();
        this.powerups.splice(i, 1);

        // Respawn another power-up after 15 seconds
        this.time.delayedCall(15000, () => {
          const angle = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 180;
          const types: PowerupItem['type'][] = ['overdrive', 'shield', 'speed', 'supergrapple'];
          const pickedType = types[Math.floor(Math.random() * types.length)];
          this.spawnPowerup(pickedType, Math.cos(angle) * r, Math.sin(angle) * r);
        });
      }
    }
  }

  private updateCrates(dt: number) {
    this.crates.forEach((crate) => {
      this.integratePhysics(crate, dt);
      crate.container.setPosition(crate.x, crate.y);

      // Crate vs bumper
      this.bumpers.forEach((b) => {
        const dx = crate.x - b.x;
        const dy = crate.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.radius + 24) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          crate.vx = nx * 400;
          crate.vy = ny * 400;
        }
      });
    });
  }

  private updateElectricBarrier(dt: number) {
    this.electricBarrierTimer -= dt;
    if (this.electricBarrierTimer <= 0) {
      this.electricBarrierActive = !this.electricBarrierActive;
      this.electricBarrierTimer = this.electricBarrierActive ? 4 : 8; // On for 4s, off for 8s
      if (this.electricBarrierActive) {
        soundEngine.playElectricZap();
      }
    }

    const g = this.electricBarrierGraphics;
    g.clear();

    const p1 = this.electricBarrierPylons[0];
    const p2 = this.electricBarrierPylons[1];

    // Pylons
    g.fillStyle(0x182230, 1);
    g.fillCircle(p1.x, p1.y, 14);
    g.fillCircle(p2.x, p2.y, 14);
    g.lineStyle(2, 0x00f0ff, 0.9);
    g.strokeCircle(p1.x, p1.y, 14);
    g.strokeCircle(p2.x, p2.y, 14);

    if (this.electricBarrierActive) {
      // Draw lightning arc
      g.lineStyle(4, 0x00f0ff, 0.9);
      const segments = 8;
      let currX = p1.x;
      let currY = p1.y;

      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const targetX = Phaser.Math.Linear(p1.x, p2.x, t);
        const targetY = Phaser.Math.Linear(p1.y, p2.y, t);
        const jitterX = i === segments ? 0 : (Math.random() - 0.5) * 20;
        const jitterY = i === segments ? 0 : (Math.random() - 0.5) * 20;
        g.lineBetween(currX, currY, targetX + jitterX, targetY + jitterY);
        currX = targetX + jitterX;
        currY = targetY + jitterY;
      }
    } else {
      // Idle dashed warning laser
      g.lineStyle(1.5, 0xff5500, 0.4);
      g.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
  }

  private updateArenaEvents(dt: number) {
    if (this.activeEvent) {
      this.activeEvent.timeRemaining -= dt;
      if (this.activeEvent.timeRemaining <= 0) {
        this.activeEvent = null;
        this.nextEventTimer = 25; // Next event in 25s
      }
    } else {
      this.nextEventTimer -= dt;
      if (this.nextEventTimer <= 0) {
        // Trigger next event
        const template = this.eventCatalog[this.nextEventIndex % this.eventCatalog.length];
        this.nextEventIndex++;

        this.activeEvent = {
          name: template.name,
          type: template.type,
          timeRemaining: 18,
          duration: 18,
          active: true,
        };

        if (template.type === 'sudden_death') {
          this.triggerSuddenDeath();
        }
      }
    }
  }

  private triggerSuddenDeath() {
    this.suddenDeathActive = true;
    // Shrink platform over time
    this.tweens.add({
      targets: this,
      currentPlatformRadius: 320,
      duration: 6000,
      onUpdate: () => {
        this.renderArenaFloor();
      },
    });
  }

  private resolvePlayerCollisions() {
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const p1 = this.players[i];
        const p2 = this.players[j];

        if (!p1.stats.isAlive || !p2.stats.isAlive || p1.isFalling || p2.isFalling) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dist > 0.001 ? dx / dist : 1;
          const ny = dist > 0.001 ? dy / dist : 0;

          // Push apart
          p1.x -= nx * overlap * 0.5;
          p1.y -= ny * overlap * 0.5;
          p2.x += nx * overlap * 0.5;
          p2.y += ny * overlap * 0.5;

          // Exchange momentum
          const relVx = p1.vx - p2.vx;
          const relVy = p1.vy - p2.vy;
          const normalVel = relVx * nx + relVy * ny;

          if (normalVel > 0) {
            const impulse = normalVel * 0.8;
            p1.vx -= nx * impulse;
            p1.vy -= ny * impulse;
            p2.vx += nx * impulse;
            p2.vy += ny * impulse;
          }
        }
      }
    }
  }

  private startFalling(player: Combatant) {
    player.isFalling = true;
    player.grappleState = null;
    player.fallScale = 1.0;
    soundEngine.playElimination();

    if (player.isHuman) {
      this.cameras.main.shake(300, 0.015);
    }
  }

  private handleFallingPlayer(player: Combatant, dt: number) {
    player.fallScale -= dt * 1.5;
    player.container.setScale(Math.max(0, player.fallScale));
    player.container.setRotation(player.container.rotation + dt * 8);

    if (player.fallScale <= 0.1) {
      player.isFalling = false;
      player.container.setScale(1);
      player.container.setRotation(0);

      // Decrement lives
      const fallResult = handlePlayerFall(player.stats.lives);
      player.stats.lives = fallResult.livesRemaining;

      if (fallResult.isEliminated) {
        player.stats.isAlive = false;
        player.container.setVisible(false);
      } else {
        // Respawn at center with invulnerability
        player.x = (Math.random() - 0.5) * 80;
        player.y = (Math.random() - 0.5) * 80;
        player.vx = 0;
        player.vy = 0;
        player.stats.health = fallResult.resetHealth;
        player.stats.shield = fallResult.resetShield;
        player.invulnerableTimer = 2.5; // 2.5s safe return
      }
    }
  }

  private renderFX() {
    const g = this.fxGraphics;
    g.clear();

    // Render active grapple lines
    this.players.forEach((p) => {
      if (p.grappleState?.active) {
        let tx = p.grappleState.targetX;
        let ty = p.grappleState.targetY;
        if (p.grappleState.targetRef) {
          tx = p.grappleState.targetRef.x;
          ty = p.grappleState.targetRef.y;
        }

        // High-tech laser tether beam
        g.lineStyle(3, p.tint, 0.85);
        g.lineBetween(p.x, p.y, tx, ty);
        g.lineStyle(1.5, 0xffffff, 0.95);
        g.lineBetween(p.x, p.y, tx, ty);

        // Target glowing ring
        g.strokeCircle(tx, ty, 8);
      }
    });
  }

  private createSlashWave(x: number, y: number, angle: number, color: number) {
    const wave = this.add.graphics();
    wave.setDepth(18);
    wave.lineStyle(4, color, 0.9);
    wave.beginPath();
    wave.arc(0, 0, 48, -Math.PI * 0.35, Math.PI * 0.35);
    wave.strokePath();

    wave.setPosition(x, y);
    wave.setRotation(angle);

    this.tweens.add({
      targets: wave,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 180,
      onComplete: () => wave.destroy(),
    });
  }

  private createEMPShockwave(x: number, y: number, color: number) {
    const ring = this.add.arc(x, y, 20, 0, 360, false, color, 0.7);
    ring.setDepth(18);
    this.tweens.add({
      targets: ring,
      radius: 200,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private createBumperFlash(x: number, y: number) {
    const flash = this.add.arc(x, y, 40, 0, 360, false, 0x00f0ff, 0.8);
    flash.setDepth(16);
    this.tweens.add({
      targets: flash,
      scale: 1.6,
      alpha: 0,
      duration: 250,
      onComplete: () => flash.destroy(),
    });
  }

  private createImpactParticles(x: number, y: number, color: number) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.arc(x, y, 3, 0, 360, false, color, 1);
      p.setDepth(22);
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 300,
        onComplete: () => p.destroy(),
      });
    }
  }

  private createDashGhost(x: number, y: number, color: number) {
    const ghost = this.add.arc(x, y, 18, 0, 360, false, color, 0.35);
    ghost.setDepth(9);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: 0.6,
      duration: 200,
      onComplete: () => ghost.destroy(),
    });
  }

  private createLaunchSparks(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.arc(x, y, 4, 0, 360, false, 0xffea00, 1);
      p.setDepth(21);
      this.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 50,
        alpha: 0,
        duration: 240,
        onComplete: () => p.destroy(),
      });
    }
  }

  private createElectricSparks(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const p = this.add.arc(x, y, 3, 0, 360, false, 0x00f0ff, 1);
      p.setDepth(21);
      this.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 60,
        alpha: 0,
        duration: 250,
        onComplete: () => p.destroy(),
      });
    }
  }

  private checkMatchConditions() {
    if (this.isGameOver) return;

    const alivePlayers = this.players.filter((p) => p.stats.isAlive && p.stats.lives > 0);

    if (alivePlayers.length <= 1 || this.matchTimeRemaining <= 0) {
      this.isGameOver = true;
      const winner = alivePlayers.length === 1 ? alivePlayers[0].stats : this.players[0].stats;

      if (winner.id === 'p1') {
        soundEngine.playVictory();
      } else {
        soundEngine.playDefeat();
      }

      this.emitStateToReact();
    }
  }

  private emitStateToReact() {
    if (!this.onStateUpdate) return;

    const alive = this.players.filter((p) => p.stats.isAlive && p.stats.lives > 0);
    const winner = this.isGameOver ? (alive.length === 1 ? alive[0].stats : this.players[0].stats) : null;

    this.onStateUpdate({
      players: this.players.map((p) => ({
        ...p.stats,
        // attach live position for radar/minimap
        x: p.x,
        y: p.y,
      } as any)),
      matchTimeSeconds: this.matchTimeRemaining,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      nextEventName: this.activeEvent ? this.activeEvent.name : this.eventCatalog[this.nextEventIndex % this.eventCatalog.length].name,
      nextEventTime: this.activeEvent ? Math.ceil(this.activeEvent.timeRemaining) : Math.ceil(this.nextEventTimer),
      isGameOver: this.isGameOver,
      winner,
      suddenDeath: this.suddenDeathActive,
      cameraShakeTrauma: 0,
    });
  }

  public handleServerTick(tick: AuthoritativeMatchTick) {
    this.matchTimeRemaining = tick.matchTimeRemaining;
    this.isGameOver = tick.isGameOver;

    tick.players.forEach((pNet) => {
      const local = this.players[pNet.slotIndex];
      if (!local) return;

      local.x = pNet.x;
      local.y = pNet.y;
      local.vx = pNet.vx;
      local.vy = pNet.vy;
      local.angle = pNet.angle;
      local.stats.health = pNet.health;
      local.stats.shield = pNet.shield;
      local.stats.stamina = pNet.stamina;
      local.stats.lives = pNet.lives;
      local.stats.isAlive = pNet.isAlive;
      local.stats.score = pNet.score;
      local.isFalling = pNet.isFalling;
      if (pNet.activePowerup) {
        local.stats.activePowerup = {
          type: pNet.activePowerup.type as any,
          duration: pNet.activePowerup.duration,
          maxDuration: 12,
        };
      } else {
        local.stats.activePowerup = null;
      }

      local.container.setPosition(pNet.x, pNet.y);
      local.container.setVisible(pNet.isAlive);
      local.visorSprite.setPosition(Math.cos(pNet.angle) * 12, Math.sin(pNet.angle) * 12);
      local.weaponAimGlow.setRotation(pNet.angle);

      const maxHp = local.stats.maxHealth || 100;
      const hpRatio = Math.max(0, Math.min(1, pNet.health / maxHp));
      local.overheadBarFill.setScale(hpRatio, 1);

      if (pNet.grappleTarget) {
        local.grappleState = {
          active: true,
          targetX: pNet.grappleTarget.x,
          targetY: pNet.grappleTarget.y,
          targetType: 'point',
          length: Math.hypot(pNet.grappleTarget.x - pNet.x, pNet.grappleTarget.y - pNet.y),
        };
      } else {
        local.grappleState = null;
      }
    });

    if (tick.isGameOver) {
      this.emitStateToReact();
    }
  }

  public startOnlineMatch(room: RoomState) {
    this.isOnlineMode = true;
    this.matchPhase = room.status === 'playing' ? 'fighting' : 'countdown';
    this.isPaused = false;
    this.isGameOver = false;

    // Unsubscribe previous client listeners
    if (this.unsubCountdown) this.unsubCountdown();
    if (this.unsubTick) this.unsubTick();
    if (this.unsubMatchEnd) this.unsubMatchEnd();

    this.unsubCountdown = multiplayerClient.onCountdown((count) => {
      if (this.countdownBannerContainer) {
        this.countdownBannerContainer.setVisible(true);
        if (this.countdownText) {
          this.countdownText.setText(count > 0 ? count.toString() : 'FIGHT!');
          this.countdownText.setColor(count > 0 ? '#00f0ff' : '#ffd700');
        }
      }
      soundEngine.playCountdown(count === 0);
      if (count === 0) {
        this.matchPhase = 'fighting';
        if (this.countdownBannerContainer) {
          this.countdownBannerContainer.setVisible(false);
        }
      }
    });

    this.unsubTick = multiplayerClient.onTick((tick) => {
      this.handleServerTick(tick);
    });

    this.unsubMatchEnd = multiplayerClient.onMatchEnd((winnerName) => {
      this.isGameOver = true;
      this.matchPhase = 'ended';
      if (winnerName) {
        soundEngine.playVictory();
      }
      this.emitStateToReact();
    });

    // Reconfigure the 6 slots for online play
    room.slots.forEach((slot, idx) => {
      const p = this.players[idx];
      if (!p) return;

      if (slot.type === 'empty') {
        p.container.setVisible(false);
        p.stats.isAlive = false;
        p.stats.lives = 0;
        return;
      }

      const isMe = slot.playerId === multiplayerClient.playerId;
      p.isHuman = isMe;
      p.name = isMe ? `${slot.name} (YOU)` : slot.name;
      p.stats.name = p.name;
      p.colorName = slot.color;
      const hexColor = parseInt(slot.color.replace('#', '0x'), 16) || 0x00f0ff;
      p.tint = hexColor;
      p.stats.accentHex = hexColor;

      p.bodySprite.setStrokeStyle(3, hexColor, 1);
      p.glowSprite.setFillStyle(hexColor, 0.35);
      p.visorSprite.setFillStyle(hexColor, 1);
      p.weaponAimGlow.setFillStyle(hexColor, isMe ? 0.85 : 0.45);
      p.overheadName.setText(slot.name);
      p.overheadName.setColor(isMe ? '#00f0ff' : '#ffffff');
      p.overheadBarFill.setFillStyle(hexColor, 1);
      p.container.setVisible(true);
      p.stats.isAlive = true;
      p.stats.lives = room.settings.startingLives;
      p.stats.score = 0;
      p.stats.health = 100;
      p.stats.shield = 50;
      p.stats.stamina = 100;
    });

    this.cameras.main.centerOn(0, 0);
  }

  public startSoloMatch(config: SoloMatchConfig) {
    this.isOnlineMode = false;
    this.currentSoloConfig = config;
    this.aiDifficulty = config.difficulty;
    this.matchTimeRemaining = config.durationSeconds;
    this.isGameOver = false;
    this.isPaused = false;
    this.suddenDeathActive = false;
    this.currentPlatformRadius = ARENA_CONFIG.radius;
    this.renderArenaFloor();

    // 1. Configure Human Player
    const human = this.players[0];
    const charProfile = CHARACTER_PROFILES[config.character];
    human.isHuman = true;
    human.name = 'YOU';
    human.stats.name = 'YOU';
    human.stats.color = charProfile.color;
    human.stats.accentHex = charProfile.tintHex;
    human.tint = charProfile.tintHex;
    human.stats.lives = config.lives;
    human.stats.maxHealth = 100;
    human.stats.health = 100;
    human.stats.maxShield = config.character === 'aegis' ? 80 : 50;
    human.stats.shield = human.stats.maxShield;
    human.stats.maxStamina = config.character === 'tracer' ? 120 : 100;
    human.stats.stamina = human.stats.maxStamina;
    human.stats.isAlive = true;
    human.stats.score = 0;
    human.stats.kos = 0;
    human.container.setVisible(true);

    human.bodySprite.setStrokeStyle(3, charProfile.tintHex, 1);
    human.glowSprite.setFillStyle(charProfile.tintHex, 0.35);
    human.visorSprite.setFillStyle(charProfile.tintHex, 1);
    human.weaponAimGlow.setFillStyle(charProfile.tintHex, 0.85);
    human.overheadName.setText('YOU');
    human.overheadName.setColor('#00f0ff');
    human.overheadBarFill.setFillStyle(charProfile.tintHex, 1);

    // 2. Configure AI Bots
    const defaultAiNames = ['ShadowRider', 'VortexBot', 'TitanCore', 'SolarEdge', 'EchoPulse'];
    const personalities: Array<'aggressor' | 'controller' | 'duelist' | 'survivor' | 'opportunist'> = [
      'aggressor',
      'controller',
      'duelist',
      'survivor',
      'opportunist',
    ];
    const aiArchetypes: CharacterArchetype[] = ['vanguard', 'vortex', 'solar', 'hookshot', 'aegis'];

    for (let i = 1; i < this.players.length; i++) {
      const bot = this.players[i];
      const botIdx = i - 1;

      if (botIdx < config.aiCount) {
        const arch = aiArchetypes[botIdx % aiArchetypes.length];
        const botProfile = CHARACTER_PROFILES[arch];
        const botName = defaultAiNames[botIdx % defaultAiNames.length];
        const botPersonality = personalities[botIdx % personalities.length];

        bot.isHuman = false;
        bot.name = botName;
        bot.stats.name = botName;
        bot.stats.personality = botPersonality;
        bot.stats.color = botProfile.color;
        bot.stats.accentHex = botProfile.tintHex;
        bot.tint = botProfile.tintHex;
        bot.stats.lives = config.lives;
        bot.stats.maxHealth = 100;
        bot.stats.health = 100;
        bot.stats.maxShield = 50;
        bot.stats.shield = 50;
        bot.stats.stamina = 100;
        bot.stats.isAlive = true;
        bot.stats.score = 0;
        bot.stats.kos = 0;
        bot.container.setVisible(true);

        bot.bodySprite.setStrokeStyle(3, botProfile.tintHex, 1);
        bot.glowSprite.setFillStyle(botProfile.tintHex, 0.35);
        bot.visorSprite.setFillStyle(botProfile.tintHex, 1);
        bot.weaponAimGlow.setFillStyle(botProfile.tintHex, 0.45);
        bot.overheadName.setText(botName);
        bot.overheadName.setColor('#ffffff');
        bot.overheadBarFill.setFillStyle(botProfile.tintHex, 1);
      } else {
        bot.stats.isAlive = false;
        bot.stats.lives = 0;
        bot.container.setVisible(false);
      }
    }

    // Reset active combatants positions
    const activeCombatants = this.players.filter((p) => p.stats.isAlive);
    const dist = 140;
    activeCombatants.forEach((p, idx) => {
      const angle = (idx / activeCombatants.length) * Math.PI * 2;
      p.x = Math.cos(angle) * dist;
      p.y = Math.sin(angle) * dist;
      p.vx = 0;
      p.vy = 0;
      p.angle = angle;
      p.isFalling = false;
      p.dashTimer = 0;
      p.container.setScale(1);
      p.container.setRotation(0);
      p.container.setPosition(p.x, p.y);
      p.invulnerableTimer = 1.0;
      p.grappleState = null;
      p.attackCooldown = 0;
      p.tacticalCooldown = 0;
    });

    this.cameras.main.centerOn(0, 0);

    // 3. Initiate countdown banner
    this.matchPhase = 'countdown';
    this.countdownTimer = 3.5;
    this.lastBeepInt = 4;

    if (this.countdownBannerContainer) {
      this.countdownBannerContainer.setVisible(true);
      if (this.countdownText) {
        this.countdownText.setText('3');
        this.countdownText.setColor('#00f0ff');
      }
    }
  }

  public startMatch() {
    if (this.currentSoloConfig) {
      this.startSoloMatch(this.currentSoloConfig);
      return;
    }

    this.startSoloMatch({
      character: 'tracer',
      aiCount: 4,
      difficulty: 'normal',
      durationSeconds: 180,
      lives: 3,
      arena: 'The Core',
    });
  }

  public setTitleMode() {
    this.matchPhase = 'title';
    this.isOnlineMode = false;
    this.matchTimeRemaining = ARENA_CONFIG.matchDurationSeconds;
    this.isGameOver = false;
    if (this.countdownBannerContainer) {
      this.countdownBannerContainer.setVisible(false);
    }
  }

  public restartMatch() {
    if (this.currentSoloConfig) {
      this.startSoloMatch(this.currentSoloConfig);
    } else {
      this.startMatch();
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }
}
