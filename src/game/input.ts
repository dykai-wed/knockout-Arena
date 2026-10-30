/**
 * KNOCKOUT ARENA - Unified Input Abstraction
 * Handles desktop keyboard & mouse (with customizable bindings, mouse aim, pointer lock)
 * as well as mobile multi-touch virtual controls (analog joystick, floating joystick, thumb cluster).
 */

import { AimAssistLevel } from './rules.ts';

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

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  attack: string; // 'LMB' or key code
  grapple: string; // 'RMB' or key code
  dash: string; // 'ShiftLeft'
  tactical: string; // 'KeyE'
  interact: string; // 'KeyF'
  pause: string; // 'Escape'
}

export const DEFAULT_KEYBINDINGS: KeyBindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  attack: 'LMB',
  grapple: 'RMB',
  dash: 'ShiftLeft',
  tactical: 'KeyE',
  interact: 'KeyF',
  pause: 'Escape',
};

export interface ControlSettings {
  // Mobile
  joystickScale: number; // 0.8 - 1.4
  buttonScale: number; // 0.8 - 1.4
  opacity: number; // 0.3 - 1.0
  joystickType: 'fixed' | 'floating';
  vibration: boolean;
  leftHanded: boolean;
  customPositions?: {
    joystick?: { x: number; y: number };
    buttons?: { x: number; y: number };
  };
  // Shared / Desktop
  aimAssist: AimAssistLevel;
  mouseSensitivity: number; // 0.5 - 2.5
  reducedEffects: boolean;
  keybindings: KeyBindings;
}

export type TouchControlSettings = ControlSettings;

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  joystickScale: 1.0,
  buttonScale: 1.0,
  opacity: 0.85,
  joystickType: 'fixed',
  vibration: true,
  leftHanded: false,
  aimAssist: 'standard',
  mouseSensitivity: 1.0,
  reducedEffects: false,
  keybindings: { ...DEFAULT_KEYBINDINGS },
};

export const DEFAULT_TOUCH_SETTINGS = DEFAULT_CONTROL_SETTINGS;

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
  private settings: ControlSettings = { ...DEFAULT_CONTROL_SETTINGS };

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

  public setIsMobile(isMobile: boolean) {
    this.isMobileDevice = isMobile;
  }

  public getSettings(): ControlSettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<ControlSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      keybindings: {
        ...this.settings.keybindings,
        ...(newSettings.keybindings || {}),
      },
    };
    try {
      localStorage.setItem('knockout_touch_settings', JSON.stringify(this.settings));
    } catch {
      // LocalStorage error ignored
    }
  }

  public resetToDefaults() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_CONTROL_SETTINGS));
    try {
      localStorage.setItem('knockout_touch_settings', JSON.stringify(this.settings));
    } catch {
      // Ignored
    }
    return this.settings;
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('knockout_touch_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          ...DEFAULT_CONTROL_SETTINGS,
          ...parsed,
          keybindings: {
            ...DEFAULT_KEYBINDINGS,
            ...(parsed.keybindings || {}),
          },
        };
      }
    } catch {
      // Default
    }
  }

  private setupDesktopListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      const kb = this.settings.keybindings;

      // Prevent page scrolling on Space / Arrow keys during game
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      this.keysHeld.add(e.code);

      // Handle custom bound Pause key
      if (e.code === kb.pause || e.code === 'Escape' || e.code === 'KeyP') {
        this.touchActions.pause = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    // Safety: Reset keys on window blur so inputs never get stuck
    window.addEventListener('blur', () => {
      this.clearAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearAll();
      }
    });

    // Prevent context menu on right click globally during gameplay so RMB can be used for grapple
    window.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'CANVAS' || target.closest('[data-testid="game-canvas-container"]'))) {
        e.preventDefault();
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

  // Pointer Lock API helpers for desktop capture
  public requestPointerLock(element: HTMLElement) {
    try {
      if (element.requestPointerLock && document.pointerLockElement !== element) {
        element.requestPointerLock();
      }
    } catch {
      // Ignored if user interaction requirement isn't satisfied
    }
  }

  public exitPointerLock() {
    try {
      if (document.exitPointerLock && document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // Ignored
    }
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

  public setMouseGrapple(pressed: boolean) {
    this.touchActions.grapple = pressed;
  }

  /**
   * Main per-frame input update loop. Consumes keyboard + touch and updates edge triggers.
   */
  public update() {
    const kb = this.settings.keybindings;

    // 1. Calculate movement vector from customizable keys and arrow keys
    let mx = 0;
    let my = 0;

    if (this.keysHeld.has(kb.moveUp) || this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) my -= 1;
    if (this.keysHeld.has(kb.moveDown) || this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) my += 1;
    if (this.keysHeld.has(kb.moveLeft) || this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) mx -= 1;
    if (this.keysHeld.has(kb.moveRight) || this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) mx += 1;

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

    // 2. Action states based on keys + mouse + touch
    const kbPressed =
      this.touchActions.knockback ||
      (kb.attack !== 'LMB' && this.keysHeld.has(kb.attack));

    const grapplePressed =
      this.touchActions.grapple ||
      (kb.grapple !== 'RMB' && this.keysHeld.has(kb.grapple)) ||
      (kb.grapple === 'RMB' && this.keysHeld.has('Space')); // Space preserved as backup

    const dashPressed =
      this.touchActions.dash ||
      this.keysHeld.has(kb.dash) ||
      this.keysHeld.has('ShiftLeft') ||
      this.keysHeld.has('ShiftRight');

    const tacticalPressed =
      this.touchActions.tactical ||
      this.keysHeld.has(kb.tactical) ||
      this.keysHeld.has('KeyE');

    const interactPressed =
      this.touchActions.interact ||
      this.keysHeld.has(kb.interact) ||
      this.keysHeld.has('KeyF') ||
      this.keysHeld.has('KeyQ');

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
