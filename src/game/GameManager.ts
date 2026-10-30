import Phaser from 'phaser';
import { ArenaScene, GameStateUpdate } from './ArenaScene.ts';
import { inputManager } from './input.ts';
import { SoloMatchConfig, RoomState } from './multiplayerTypes.ts';

export class GameManager {
  private game: Phaser.Game | null = null;
  private scene: ArenaScene | null = null;
  private containerElement: HTMLElement | null = null;

  public init(container: HTMLElement, onStateUpdate: (state: GameStateUpdate) => void) {
    if (this.game) {
      this.destroy();
    }

    this.containerElement = container;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
      transparent: false,
      backgroundColor: '#06080d',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      fps: {
        target: 60,
        forceSetTimeOut: true,
      },
      scene: [ArenaScene],
    };

    this.game = new Phaser.Game(config);

    // Grab scene reference once created
    this.game.events.once('ready', () => {
      this.scene = this.game?.scene.getScene('ArenaScene') as ArenaScene;
      if (this.scene) {
        this.scene.init({ onStateUpdate });
      }
    });

    // Wire mouse move for aiming in world space
    container.addEventListener('mousemove', this.handleMouseMove);
    container.addEventListener('mousedown', this.handleMouseDown);
    container.addEventListener('mouseup', this.handleMouseUp);
    container.addEventListener('contextmenu', this.handleContextMenu);
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.scene || !this.containerElement) return;
    const rect = this.containerElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates through active camera
    const camera = this.scene.cameras.main;
    if (camera) {
      const worldPoint = camera.getWorldPoint(clientX, clientY);
      const humanPos = this.scene.getHumanPosition() || { x: 0, y: 0 };
      inputManager.setMouseAimWorld(worldPoint.x, worldPoint.y, humanPos.x, humanPos.y);
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      inputManager.setTouchAction('knockback', true);
    } else if (e.button === 2) {
      inputManager.setTouchAction('grapple', true);
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      inputManager.setTouchAction('knockback', false);
    } else if (e.button === 2) {
      inputManager.setTouchAction('grapple', false);
    }
  };

  public startMatch() {
    if (this.scene) {
      this.scene.startMatch();
    }
  }

  public startTutorial() {
    if (this.scene) {
      this.scene.startTutorial();
    }
  }

  public skipTutorialStep() {
    if (this.scene) {
      this.scene.skipTutorialStep();
    }
  }

  public restartTutorial() {
    if (this.scene) {
      this.scene.restartTutorial();
    }
  }

  public startSoloMatch(config: SoloMatchConfig) {
    if (this.scene) {
      this.scene.startSoloMatch(config);
    }
  }

  public startOnlineMatch(room: RoomState) {
    if (this.scene) {
      this.scene.startOnlineMatch(room);
    }
  }

  public setTitleMode() {
    if (this.scene) {
      this.scene.setTitleMode();
    }
  }

  public restart() {
    if (this.scene) {
      this.scene.restartMatch();
    }
  }

  public setPaused(paused: boolean) {
    if (this.scene) {
      this.scene.setPaused(paused);
    }
  }

  public destroy() {
    if (this.containerElement) {
      this.containerElement.removeEventListener('mousemove', this.handleMouseMove);
      this.containerElement.removeEventListener('mousedown', this.handleMouseDown);
      this.containerElement.removeEventListener('mouseup', this.handleMouseUp);
      this.containerElement.removeEventListener('contextmenu', this.handleContextMenu);
    }
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
      this.scene = null;
    }
  }
}

export const gameManager = new GameManager();
