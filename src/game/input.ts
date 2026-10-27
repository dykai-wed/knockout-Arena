/**
 * KNOCKOUT ARENA - Unified Input Abstraction
 * Handles desktop keyboard & mouse as well as mobile multi-touch virtual controls.
 */

export interface InputState {
  move: { x: number; y: number };
  aim: { x: number; y: number }; // Normalized aim direction
  aimTargetWorld: { x: number; y: number }; // Target point in world coords
  isKnockbackPressed: boolean;
  isDashPressed: boolean;
  isGrapplePressed: boolean;
  isTacticalPressed: boolean;
  isInteractPressed: boolean;
  isPausePressed: boolean;
  justKnockback: boolean;
  justDash: boolean;
  justGrapple: boolean;
  justTactical: boolean;
  justInteract: boolean;
  justPause: boolean;
}

export interface TouchControlSettings {
  joystickScale: number; // 0.8 - 1.4
  buttonScale: number; // 0.8 - 1.4
  opacity: number; // 0.3 - 1.0
  aimAssist: boolean;
  vibration: boolean;
  leftHanded: boolean;
}

export const DEFAULT_TOUCH_SETTINGS: TouchControlSettings = {
  joystickScale: 1.0,
  buttonScale: 1.0,
  opacity: 0.85,
  aimAssist: true,
  vibration: true,
  leftHanded: false,
};

class InputManager {
  private state: InputState = {
    move: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    aimTargetWorld: { x: 0, y: 0 },
    isKnockbackPressed: false,
    isDashPressed: false,
    isGrapplePressed: false,
    isTacticalPressed: false,
    isInteractPressed: false,
    isPausePressed: false,
    justKnockback: false,
    justDash: false,
    justGrapple: false,
    justTactical: false,
    justInteract: false,
    justPause: false,
  };

  private prevButtons = {
    knockback: false,
    dash: false,
    grapple: false,
    tactical: false,
    interact: false,
    pause: false,
  };

  private keysHeld = new Set<string>();
  private touchMove = { x: 0, y: 0 };
  private touchAim = { x: 0, y: 0 };
  private touchActions = {
    knockback: false,
    dash: false,
    grapple: false,
    tactical: false,
    interact: false,
    pause: false,
  };

  private isMobileDevice: boolean = false;
  private settings: TouchControlSettings = { ...DEFAULT_TOUCH_SETTINGS };

  constructor() {
    this.detectDevice();
    this.loadSettings();
    this.setupDesktopListeners();
  }

  private detectDevice() {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      this.isMobileDevice =
        /android|iphone|ipad|ipod|mobile/i.test(ua) ||
        ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 1);
    }
  }

  public getIsMobile(): boolean {
    return this.isMobileDevice;
  }

  public getSettings(): TouchControlSettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<TouchControlSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('knockout_touch_settings', JSON.stringify(this.settings));
    } catch {
      // LocalStorage error ignored
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('knockout_touch_settings');
      if (saved) {
        this.settings = { ...DEFAULT_TOUCH_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Default
    }
  }

  private setupDesktopListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      // Prevent scrolling on Space / Arrow keys during game
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keysHeld.add(e.code);

      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.touchActions.pause = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    // Safety: Reset keys on window blur so inputs never stick
    window.addEventListener('blur', () => {
      this.clearAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearAll();
      }
    });
  }

  public clearAll() {
    this.keysHeld.clear();
    this.touchMove = { x: 0, y: 0 };
    this.touchAim = { x: 0, y: 0 };
    this.touchActions = {
      knockback: false,
      dash: false,
      grapple: false,
      tactical: false,
      interact: false,
      pause: false,
    };
  }

  // Called by touch overlay components
  public setTouchMove(x: number, y: number) {
    this.touchMove = { x, y };
  }

  public setTouchAim(x: number, y: number) {
    this.touchAim = { x, y };
  }

  public setTouchAction(action: keyof typeof this.touchActions, pressed: boolean) {
    this.touchActions[action] = pressed;
  }

  public setMouseAimWorld(targetX: number, targetY: number, originX: number, originY: number) {
    this.state.aimTargetWorld = { x: targetX, y: targetY };
    const dx = targetX - originX;
    const dy = targetY - originY;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      this.state.aim = { x: dx / dist, y: dy / dist };
    }
  }

  public setMouseKnockback(pressed: boolean) {
    this.touchActions.knockback = pressed;
  }

  /**
   * Main per-frame input update loop. Consumes keyboard + touch and updates edge triggers.
   */
  public update() {
    // 1. Calculate movement vector
    let mx = 0;
    let my = 0;

    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) my -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) my += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) mx -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) mx += 1;

    // Normalize diagonal keyboard movement
    const keyDist = Math.hypot(mx, my);
    if (keyDist > 0) {
      mx /= keyDist;
      my /= keyDist;
    }

    // Blend touch movement if active
    if (Math.hypot(this.touchMove.x, this.touchMove.y) > 0.05) {
      mx = this.touchMove.x;
      my = this.touchMove.y;
    }

    this.state.move = { x: mx, y: my };

    // Update aim if touch aim is active
    if (Math.hypot(this.touchAim.x, this.touchAim.y) > 0.1) {
      const aimDist = Math.hypot(this.touchAim.x, this.touchAim.y);
      this.state.aim = { x: this.touchAim.x / aimDist, y: this.touchAim.y / aimDist };
    } else if (Math.hypot(mx, my) > 0.2 && !this.touchAim.x && !this.touchAim.y && this.isMobileDevice) {
      // On mobile without separate aim stick, face movement direction
      this.state.aim = { x: mx, y: my };
    }

    // 2. Action states
    const kbPressed = this.touchActions.knockback;
    const dashPressed = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') || this.touchActions.dash;
    const grapplePressed = this.keysHeld.has('Space') || this.touchActions.grapple;
    const tacticalPressed = this.keysHeld.has('KeyE') || this.touchActions.tactical;
    const interactPressed = this.keysHeld.has('KeyQ') || this.touchActions.interact;
    const pausePressed = this.touchActions.pause;

    this.state.isKnockbackPressed = kbPressed;
    this.state.isDashPressed = dashPressed;
    this.state.isGrapplePressed = grapplePressed;
    this.state.isTacticalPressed = tacticalPressed;
    this.state.isInteractPressed = interactPressed;
    this.state.isPausePressed = pausePressed;

    // Edge triggers (just pressed this frame)
    this.state.justKnockback = kbPressed && !this.prevButtons.knockback;
    this.state.justDash = dashPressed && !this.prevButtons.dash;
    this.state.justGrapple = grapplePressed && !this.prevButtons.grapple;
    this.state.justTactical = tacticalPressed && !this.prevButtons.tactical;
    this.state.justInteract = interactPressed && !this.prevButtons.interact;
    this.state.justPause = pausePressed && !this.prevButtons.pause;

    this.prevButtons = {
      knockback: kbPressed,
      dash: dashPressed,
      grapple: grapplePressed,
      tactical: tacticalPressed,
      interact: interactPressed,
      pause: pausePressed,
    };

    // Reset one-shot touch actions
    this.touchActions.pause = false;
  }

  public getState(): Readonly<InputState> {
    return this.state;
  }
}

export const inputManager = new InputManager();
