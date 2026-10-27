import {
  ClientAction,
  ServerMessage,
  RoomState,
  AuthoritativeMatchTick,
  CharacterArchetype,
  RoomSettings,
} from './multiplayerTypes.ts';

type RoomListener = (room: RoomState) => void;
type TickListener = (tick: AuthoritativeMatchTick) => void;
type CountdownListener = (count: number) => void;
type ErrorListener = (error: string) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  public playerId: string | null = null;
  public room: RoomState | null = null;
  public isHost: boolean = false;
  public mySlotIndex: number = 0;
  public currentTick: AuthoritativeMatchTick | null = null;

  private roomListeners = new Set<RoomListener>();
  private tickListeners = new Set<TickListener>();
  private countdownListeners = new Set<CountdownListener>();
  private errorListeners = new Set<ErrorListener>();
  private matchEndListeners = new Set<(winnerName: string | null) => void>();

  public connect(customUrl?: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let wsUrl = customUrl || localStorage.getItem('knockout_ws_url') || (import.meta.env.VITE_WS_URL as string);

      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (e) {
        reject(new Error(`Invalid WebSocket URL: ${wsUrl}`));
        return;
      }

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onerror = (err) => {
        const isGitHubPages = window.location.hostname.endsWith('github.io');
        const errorMsg = isGitHubPages && !localStorage.getItem('knockout_ws_url') && !import.meta.env.VITE_WS_URL
          ? 'Cannot connect to local server: GitHub Pages only hosts static files. Play Solo Battle offline, or provide a WebSocket backend URL in Settings!'
          : `Failed to connect to multiplayer server (${wsUrl}).`;
        this.notifyError(errorMsg);
        reject(new Error(errorMsg));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch {
          // Parse error
        }
      };

      this.ws.onclose = () => {
        // Disconnected
      };
    });
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'room_joined':
        this.room = msg.room;
        this.playerId = msg.playerId;
        this.isHost = msg.isHost;
        this.mySlotIndex = msg.slotIndex;
        this.notifyRoomListeners();
        break;

      case 'room_update':
        this.room = msg.room;
        this.notifyRoomListeners();
        break;

      case 'match_countdown':
        this.countdownListeners.forEach((fn) => fn(msg.countdown));
        break;

      case 'match_started':
      case 'match_tick':
        this.currentTick = msg.type === 'match_started' ? msg.initialState : msg.tick;
        this.tickListeners.forEach((fn) => fn(this.currentTick!));
        break;

      case 'match_ended':
        this.matchEndListeners.forEach((fn) => fn(msg.winnerName));
        break;

      case 'error':
        this.errorListeners.forEach((fn) => fn(msg.message));
        break;
    }
  }

  public send(action: ClientAction) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    }
  }

  public async createRoom(name: string, character: CharacterArchetype, settings?: Partial<RoomSettings>) {
    await this.connect();
    this.send({ type: 'create_room', name, character, settings });
  }

  public async joinRoom(code: string, name: string, character: CharacterArchetype) {
    await this.connect();
    this.send({ type: 'join_room', code, name, character });
  }

  public async quickMatch(name: string, character: CharacterArchetype) {
    await this.connect();
    this.send({ type: 'quick_match', name, character });
  }

  public setReady(ready: boolean) {
    this.send({ type: 'set_ready', ready });
  }

  public updateCharacter(character: CharacterArchetype) {
    this.send({ type: 'update_character', character });
  }

  public updateSettings(settings: Partial<RoomSettings>) {
    this.send({ type: 'update_settings', settings });
  }

  public addAi(personality?: string) {
    this.send({ type: 'add_ai', personality });
  }

  public removeAi(slotIndex: number) {
    this.send({ type: 'remove_ai', slotIndex });
  }

  public startMatch() {
    this.send({ type: 'start_match' });
  }

  public leaveRoom() {
    this.send({ type: 'leave_room' });
    this.room = null;
    this.isHost = false;
    this.notifyRoomListeners();
  }

  public sendInput(input: {
    move: { x: number; y: number };
    aim: { x: number; y: number };
    knockback: boolean;
    dash: boolean;
    grapple: boolean;
    tactical: boolean;
  }) {
    this.send({
      type: 'player_input',
      ...input,
      seq: Date.now(),
    });
  }

  public onRoomUpdate(fn: RoomListener) {
    this.roomListeners.add(fn);
    if (this.room) fn(this.room);
    return () => this.roomListeners.delete(fn);
  }

  public onTick(fn: TickListener) {
    this.tickListeners.add(fn);
    return () => this.tickListeners.delete(fn);
  }

  public onCountdown(fn: CountdownListener) {
    this.countdownListeners.add(fn);
    return () => this.countdownListeners.delete(fn);
  }

  public onError(fn: ErrorListener) {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  public onMatchEnd(fn: (winnerName: string | null) => void) {
    this.matchEndListeners.add(fn);
    return () => this.matchEndListeners.delete(fn);
  }

  private notifyRoomListeners() {
    if (this.room) {
      this.roomListeners.forEach((fn) => fn(this.room!));
    }
  }

  private notifyError(err: string) {
    this.errorListeners.forEach((fn) => fn(err));
  }
}

export const multiplayerClient = new MultiplayerClient();
