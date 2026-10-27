import { WebSocket } from 'ws';
import {
  RoomState,
  RoomSettings,
  LobbySlot,
  ClientAction,
  ServerMessage,
  DEFAULT_ROOM_SETTINGS,
  PlayerNetState,
  AuthoritativeMatchTick,
  CHARACTER_PROFILES,
} from '../src/game/multiplayerTypes.ts';
import {
  ARENA_CONFIG,
  STAMINA_COSTS,
  calculateKnockback,
  evaluateArenaBounds,
  applyDamage,
  handlePlayerFall,
} from '../src/game/rules.ts';

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  name: string;
  roomCode: string | null;
  sessionId: string;
}

interface ServerRoom {
  state: RoomState;
  clients: Map<string, ConnectedClient>; // playerId -> client
  disconnectTimers: Map<string, NodeJS.Timeout>;
  tickInterval?: NodeJS.Timeout;
  countdownTimer?: NodeJS.Timeout;
  matchData?: {
    tickCount: number;
    timeRemaining: number;
    players: PlayerNetState[];
    activeEvent: { name: string; type: string; timeRemaining: number } | null;
    nextEventTimer: number;
    bumpers: Array<{ x: number; y: number; radius: number }>;
    gravityWellPos: { x: number; y: number };
    launchPadPos: { x: number; y: number; angle: number };
    platformRadius: number;
  };
}

export class MultiplayerServer {
  private rooms: Map<string, ServerRoom> = new Map();
  private clients: Map<WebSocket, ConnectedClient> = new Map();

  public handleConnection(ws: WebSocket) {
    const playerId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const client: ConnectedClient = {
      ws,
      playerId,
      name: `Player_${Math.floor(100 + Math.random() * 900)}`,
      roomCode: null,
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    this.clients.set(ws, client);

    ws.on('message', (data: string | Buffer) => {
      try {
        const action: ClientAction = JSON.parse(data.toString());
        this.handleClientAction(client, action);
      } catch (err) {
        // Invalid json
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(client);
      this.clients.delete(ws);
    });
  }

  private send(client: ConnectedClient, msg: ServerMessage) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  }

  private broadcast(room: ServerRoom, msg: ServerMessage) {
    const data = JSON.stringify(msg);
    room.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  private createDefaultSlots(hostName: string, hostId: string, aiCount: number): LobbySlot[] {
    const defaultColors = ['#00f0ff', '#ff3b3b', '#00ff66', '#ffd600', '#bf5af2', '#ff8800'];
    const aiPersonalities = ['aggressor', 'controller', 'duelist', 'survivor', 'opportunist'] as const;

    const slots: LobbySlot[] = [];

    // Slot 0: Host
    slots.push({
      index: 0,
      type: 'human',
      playerId: hostId,
      name: hostName,
      isHost: true,
      isReady: true,
      character: 'tracer',
      team: 1,
      color: defaultColors[0],
      isConnected: true,
      personality: 'player',
    });

    // Slots 1 to aiCount: AI opponents
    for (let i = 1; i <= 5; i++) {
      if (i <= aiCount) {
        const pType = aiPersonalities[(i - 1) % aiPersonalities.length];
        slots.push({
          index: i,
          type: 'ai',
          playerId: `ai_${i}`,
          name: `AI - ${pType.charAt(0).toUpperCase() + pType.slice(1)}`,
          isHost: false,
          isReady: true,
          character: i === 1 ? 'vanguard' : i === 2 ? 'vortex' : i === 3 ? 'solar' : 'hookshot',
          team: 2,
          color: defaultColors[i],
          isConnected: true,
          personality: pType,
        });
      } else {
        slots.push({
          index: i,
          type: 'empty',
          playerId: null,
          name: `Empty Slot ${i + 1}`,
          isHost: false,
          isReady: false,
          character: 'tracer',
          team: 1,
          color: defaultColors[i],
          isConnected: false,
        });
      }
    }

    return slots;
  }

  private handleClientAction(client: ConnectedClient, action: ClientAction) {
    switch (action.type) {
      case 'create_room': {
        const code = this.generateRoomCode();
        client.name = action.name || client.name;
        client.roomCode = code;

        const settings: RoomSettings = {
          ...DEFAULT_ROOM_SETTINGS,
          ...(action.settings || {}),
        };

        const slots = this.createDefaultSlots(client.name, client.playerId, settings.aiCount);
        if (action.character && slots[0]) {
          slots[0].character = action.character;
        }

        const room: ServerRoom = {
          state: {
            code,
            hostId: client.playerId,
            status: 'lobby',
            settings,
            slots,
          },
          clients: new Map([[client.playerId, client]]),
          disconnectTimers: new Map(),
        };

        this.rooms.set(code, room);

        this.send(client, {
          type: 'room_joined',
          room: room.state,
          playerId: client.playerId,
          isHost: true,
          slotIndex: 0,
        });
        break;
      }

      case 'join_room': {
        const room = this.rooms.get(action.code.toUpperCase());
        if (!room) {
          this.send(client, { type: 'error', message: 'Room not found. Check the code and try again.' });
          return;
        }

        if (room.state.status === 'playing') {
          // Check for reconnect
          const existingSlot = room.state.slots.find((s) => s.playerId === action.sessionId);
          if (!existingSlot) {
            this.send(client, { type: 'error', message: 'Match already in progress.' });
            return;
          }
        }

        client.name = action.name || client.name;
        client.roomCode = room.state.code;
        room.clients.set(client.playerId, client);

        // Find empty slot or replace AI if needed
        let targetSlot = room.state.slots.find((s) => s.type === 'empty');
        if (!targetSlot) {
          // Check if an AI slot can be taken
          targetSlot = room.state.slots.slice().reverse().find((s) => s.type === 'ai');
        }

        if (!targetSlot) {
          this.send(client, { type: 'error', message: 'Room is full (6/6 combatants).' });
          return;
        }

        targetSlot.type = 'human';
        targetSlot.playerId = client.playerId;
        targetSlot.name = client.name;
        targetSlot.character = action.character || 'tracer';
        targetSlot.isReady = false;
        targetSlot.isConnected = true;
        targetSlot.personality = 'player';

        // Update settings human count
        room.state.settings.humanPlayers = room.state.slots.filter((s) => s.type === 'human').length;
        room.state.settings.aiCount = room.state.slots.filter((s) => s.type === 'ai').length;

        this.send(client, {
          type: 'room_joined',
          room: room.state,
          playerId: client.playerId,
          isHost: false,
          slotIndex: targetSlot.index,
        });

        this.broadcast(room, { type: 'room_update', room: room.state });
        break;
      }

      case 'quick_match': {
        // Find public room with open slots
        let targetRoom: ServerRoom | null = null;
        for (const r of this.rooms.values()) {
          if (!r.state.settings.isPrivate && r.state.status === 'lobby') {
            const hasSlot = r.state.slots.some((s) => s.type === 'empty' || s.type === 'ai');
            if (hasSlot) {
              targetRoom = r;
              break;
            }
          }
        }

        if (targetRoom) {
          this.handleClientAction(client, {
            type: 'join_room',
            code: targetRoom.state.code,
            name: action.name,
            character: action.character,
          });
        } else {
          this.handleClientAction(client, {
            type: 'create_room',
            name: action.name,
            character: action.character,
            settings: { isPrivate: false, aiCount: 3 },
          });
        }
        break;
      }

      case 'set_ready': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room) return;
        const slot = room.state.slots.find((s) => s.playerId === client.playerId);
        if (slot) {
          slot.isReady = action.ready;
          this.broadcast(room, { type: 'room_update', room: room.state });
        }
        break;
      }

      case 'update_character': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room) return;
        const slot = room.state.slots.find((s) => s.playerId === client.playerId);
        if (slot) {
          slot.character = action.character;
          this.broadcast(room, { type: 'room_update', room: room.state });
        }
        break;
      }

      case 'update_settings': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room || room.state.hostId !== client.playerId) return;

        room.state.settings = { ...room.state.settings, ...action.settings };
        this.broadcast(room, { type: 'room_update', room: room.state });
        break;
      }

      case 'add_ai': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room || room.state.hostId !== client.playerId) return;

        const emptySlot = room.state.slots.find((s) => s.type === 'empty');
        if (emptySlot) {
          const aiPersonalities = ['aggressor', 'controller', 'duelist', 'survivor', 'opportunist'] as const;
          const pType = action.personality || aiPersonalities[emptySlot.index % aiPersonalities.length];
          emptySlot.type = 'ai';
          emptySlot.playerId = `ai_${Date.now()}_${emptySlot.index}`;
          emptySlot.name = `AI - ${pType.charAt(0).toUpperCase() + pType.slice(1)}`;
          emptySlot.isReady = true;
          emptySlot.isConnected = true;
          emptySlot.character = 'vanguard';
          emptySlot.personality = pType as any;

          room.state.settings.aiCount = room.state.slots.filter((s) => s.type === 'ai').length;
          this.broadcast(room, { type: 'room_update', room: room.state });
        }
        break;
      }

      case 'remove_ai': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room || room.state.hostId !== client.playerId) return;

        const slot = room.state.slots[action.slotIndex];
        if (slot && slot.type === 'ai') {
          slot.type = 'empty';
          slot.playerId = null;
          slot.name = `Empty Slot ${action.slotIndex + 1}`;
          slot.isReady = false;
          slot.isConnected = false;

          room.state.settings.aiCount = room.state.slots.filter((s) => s.type === 'ai').length;
          this.broadcast(room, { type: 'room_update', room: room.state });
        }
        break;
      }

      case 'start_match': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room || room.state.hostId !== client.playerId) return;

        // Validation: Verify all human players are ready
        const humans = room.state.slots.filter((s) => s.type === 'human' && s.isConnected);
        const allReady = humans.every((h) => h.isReady);

        if (!allReady) {
          this.send(client, { type: 'error', message: 'All human players must mark Ready before starting.' });
          return;
        }

        // Start countdown sequence
        room.state.status = 'countdown';
        let count = 3;
        this.broadcast(room, { type: 'match_countdown', countdown: count });

        const interval = setInterval(() => {
          count--;
          if (count > 0) {
            this.broadcast(room, { type: 'match_countdown', countdown: count });
          } else {
            clearInterval(interval);
            this.startAuthoritativeMatch(room);
          }
        }, 1000);

        room.countdownTimer = interval;
        break;
      }

      case 'leave_room': {
        this.handleDisconnection(client);
        break;
      }

      case 'player_input': {
        const room = client.roomCode ? this.rooms.get(client.roomCode) : null;
        if (!room || !room.matchData || room.state.status !== 'playing') return;

        const p = room.matchData.players.find((pl) => pl.id === client.playerId);
        if (p && p.isAlive && !p.isFalling) {
          const char = CHARACTER_PROFILES[p.character] || CHARACTER_PROFILES.tracer;
          const baseSpeed = 240 * (char.speed / 4);

          // Apply input movement
          if (action.move.x !== 0 || action.move.y !== 0) {
            p.vx = action.move.x * baseSpeed;
            p.vy = action.move.y * baseSpeed;
          }

          if (action.aim.x !== 0 || action.aim.y !== 0) {
            p.angle = Math.atan2(action.aim.y, action.aim.x);
          }

          // Dash
          if (action.dash && p.stamina >= STAMINA_COSTS.dash) {
            p.stamina -= STAMINA_COSTS.dash;
            const dirX = action.move.x || Math.cos(p.angle);
            const dirY = action.move.y || Math.sin(p.angle);
            p.vx = dirX * 600;
            p.vy = dirY * 600;
            p.invulnerable = true;
            setTimeout(() => { p.invulnerable = false; }, 200);
          }

          // Knockback attack
          if (action.knockback) {
            this.resolveServerAttack(room, p);
          }

          // Tactical
          if (action.tactical && p.stamina >= STAMINA_COSTS.tactical) {
            p.stamina -= STAMINA_COSTS.tactical;
            this.resolveServerTactical(room, p);
          }
        }
        break;
      }
    }
  }

  private startAuthoritativeMatch(room: ServerRoom) {
    room.state.status = 'playing';

    // Populate active combatants from occupied slots
    const activeSlots = room.state.slots.filter((s) => s.type !== 'empty');
    const dist = 140;

    const players: PlayerNetState[] = activeSlots.map((slot, idx) => {
      const angle = (idx / activeSlots.length) * Math.PI * 2;
      return {
        id: slot.playerId || `p_${slot.index}`,
        slotIndex: slot.index,
        name: slot.name,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        angle,
        health: 100,
        shield: 50,
        stamina: 100,
        lives: room.state.settings.startingLives,
        isAlive: true,
        isFalling: false,
        score: 0,
        activePowerup: null,
        color: slot.color,
        character: slot.character,
        isHuman: slot.type === 'human',
        team: slot.team,
        grappleTarget: null,
        invulnerable: false,
      };
    });

    room.matchData = {
      tickCount: 0,
      timeRemaining: room.state.settings.matchDuration,
      players,
      activeEvent: null,
      nextEventTimer: 25,
      bumpers: [
        { x: -140, y: -130, radius: 34 },
        { x: 140, y: -130, radius: 34 },
        { x: -140, y: 130, radius: 34 },
        { x: 140, y: 130, radius: 34 },
      ],
      gravityWellPos: { x: -280, y: 120 },
      launchPadPos: { x: 300, y: 240, angle: -Math.PI * 0.75 },
      platformRadius: ARENA_CONFIG.radius,
    };

    const initialTick: AuthoritativeMatchTick = {
      tick: 0,
      matchTimeRemaining: room.matchData.timeRemaining,
      players: room.matchData.players,
      currentEvent: null,
      isGameOver: false,
      winnerId: null,
      winnerName: null,
    };

    this.broadcast(room, { type: 'match_started', initialState: initialTick });

    // Start 20Hz Authoritative Tick Loop
    room.tickInterval = setInterval(() => {
      this.serverTick(room);
    }, 50); // 20 ticks per second
  }

  private serverTick(room: ServerRoom) {
    if (!room.matchData || room.state.status !== 'playing') return;

    const data = room.matchData;
    const dt = 0.05;
    data.tickCount++;
    data.timeRemaining = Math.max(0, data.timeRemaining - dt);

    // AI decisions
    this.updateServerAI(room, dt);

    // Physics integration
    data.players.forEach((p) => {
      if (!p.isAlive) return;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.stamina = Math.min(100, p.stamina + 15 * dt);

      // Bumper collisions
      data.bumpers.forEach((b) => {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 20 + b.radius) {
          const nx = (dx || 1) / (dist || 1);
          const ny = (dy || 0) / (dist || 1);
          p.vx = nx * 580;
          p.vy = ny * 580;
        }
      });

      // Arena bounds check
      const bounds = evaluateArenaBounds({ x: p.x, y: p.y }, { x: 0, y: 0 }, data.platformRadius);
      if (bounds.isFalling && !p.isFalling && !p.invulnerable) {
        p.isFalling = true;
        p.lives = Math.max(0, p.lives - 1);

        if (p.lives <= 0) {
          p.isAlive = false;
        } else {
          // Respawn after 1.5s
          setTimeout(() => {
            if (room.matchData) {
              p.x = (Math.random() - 0.5) * 60;
              p.y = (Math.random() - 0.5) * 60;
              p.vx = 0;
              p.vy = 0;
              p.health = 100;
              p.shield = 50;
              p.isFalling = false;
              p.invulnerable = true;
              setTimeout(() => { p.invulnerable = false; }, 2000);
            }
          }, 1500);
        }
      }
    });

    // Check winner
    const alive = data.players.filter((p) => p.isAlive);
    const isOver = alive.length <= 1 || data.timeRemaining <= 0;
    const winner = alive[0] || data.players[0] || null;

    const tickPayload: AuthoritativeMatchTick = {
      tick: data.tickCount,
      matchTimeRemaining: Math.ceil(data.timeRemaining),
      players: data.players,
      currentEvent: data.activeEvent,
      isGameOver: isOver,
      winnerId: isOver && winner ? winner.id : null,
      winnerName: isOver && winner ? winner.name : null,
    };

    this.broadcast(room, { type: 'match_tick', tick: tickPayload });

    if (isOver) {
      if (room.tickInterval) clearInterval(room.tickInterval);
      room.state.status = 'ended';
      this.broadcast(room, {
        type: 'match_ended',
        winnerId: winner?.id || null,
        winnerName: winner?.name || null,
        stats: {},
      });
    }
  }

  private updateServerAI(room: ServerRoom, dt: number) {
    if (!room.matchData) return;
    const aiPlayers = room.matchData.players.filter((p) => !p.isHuman && p.isAlive && !p.isFalling);
    const targets = room.matchData.players.filter((p) => p.isAlive && !p.isFalling);

    aiPlayers.forEach((ai) => {
      // Find closest enemy
      let closest: PlayerNetState | null = null;
      let minDist = 9999;
      targets.forEach((t) => {
        if (t.id === ai.id) return;
        // Team mode check
        if (room.state.settings.mode === 'team' && t.team === ai.team) return;
        const d = Math.hypot(t.x - ai.x, t.y - ai.y);
        if (d < minDist) {
          minDist = d;
          closest = t;
        }
      });

      if (closest) {
        const dx = (closest as PlayerNetState).x - ai.x;
        const dy = (closest as PlayerNetState).y - ai.y;
        const dist = Math.hypot(dx, dy) || 1;
        ai.angle = Math.atan2(dy, dx);
        ai.vx = (dx / dist) * 200;
        ai.vy = (dy / dist) * 200;

        if (dist < 80 && Math.random() < 0.15) {
          this.resolveServerAttack(room, ai);
        }
      }
    });
  }

  private resolveServerAttack(room: ServerRoom, attacker: PlayerNetState) {
    if (!room.matchData) return;
    const attackRange = 90;

    room.matchData.players.forEach((target) => {
      if (target.id === attacker.id || !target.isAlive || target.invulnerable) return;
      if (room.state.settings.mode === 'team' && target.team === attacker.team) return;

      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= attackRange) {
        const impulse = calculateKnockback({ x: attacker.x, y: attacker.y }, { x: target.x, y: target.y }, 520, 1.0);
        target.vx += impulse.x;
        target.vy += impulse.y;

        const dmg = applyDamage(target.health, target.shield, 25);
        target.health = dmg.health;
        target.shield = dmg.shield;
        attacker.score += 250;
      }
    });
  }

  private resolveServerTactical(room: ServerRoom, user: PlayerNetState) {
    if (!room.matchData) return;
    const radius = 180;

    room.matchData.players.forEach((target) => {
      if (target.id === user.id || !target.isAlive || target.invulnerable) return;
      if (room.state.settings.mode === 'team' && target.team === user.team) return;

      const dx = target.x - user.x;
      const dy = target.y - user.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= radius) {
        const impulse = calculateKnockback({ x: user.x, y: user.y }, { x: target.x, y: target.y }, 600, 1.0);
        target.vx += impulse.x;
        target.vy += impulse.y;
        target.shield = Math.max(0, target.shield - 30);
      }
    });
  }

  private handleDisconnection(client: ConnectedClient) {
    if (!client.roomCode) return;
    const room = this.rooms.get(client.roomCode);
    if (!room) return;

    room.clients.delete(client.playerId);
    const slot = room.state.slots.find((s) => s.playerId === client.playerId);

    if (slot) {
      slot.isConnected = false;

      if (room.state.status === 'lobby') {
        // If host leaves lobby, promote next human or clean up
        if (slot.isHost) {
          const nextHuman = room.state.slots.find((s) => s.type === 'human' && s.playerId !== client.playerId && s.isConnected);
          if (nextHuman) {
            nextHuman.isHost = true;
            room.state.hostId = nextHuman.playerId!;
          } else {
            // Room empty, delete
            if (room.tickInterval) clearInterval(room.tickInterval);
            this.rooms.delete(room.state.code);
            return;
          }
        }
        slot.type = 'empty';
        slot.playerId = null;
        slot.isReady = false;
        this.broadcast(room, { type: 'room_update', room: room.state });
      } else {
        // In-game: start 30s reconnection window
        const timer = setTimeout(() => {
          if (room.state.settings.allowAiFilling) {
            slot.type = 'ai';
            slot.name = `AI - Sub`;
            slot.personality = 'survivor';
          }
          this.broadcast(room, { type: 'room_update', room: room.state });
        }, 30000);
        room.disconnectTimers.set(client.playerId, timer);
        this.broadcast(room, { type: 'room_update', room: room.state });
      }
    }
  }
}
