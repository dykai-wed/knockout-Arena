/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gameManager } from './game/GameManager.ts';
import { GameStateUpdate } from './game/ArenaScene.ts';
import { inputManager, TouchControlSettings } from './game/input.ts';
import { soundEngine } from './game/audio.ts';
import { multiplayerClient } from './game/multiplayerClient.ts';
import { RoomState, SoloMatchConfig, CharacterArchetype } from './game/multiplayerTypes.ts';

import { MainMenu } from './components/MainMenu.tsx';
import { SoloMatchSetup } from './components/SoloMatchSetup.tsx';
import { MultiplayerLobby } from './components/MultiplayerLobby.tsx';
import { JoinRoomModal } from './components/JoinRoomModal.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { TopHUD } from './components/TopHUD.tsx';
import { BottomHUD } from './components/BottomHUD.tsx';
import { TouchControls } from './components/TouchControls.tsx';
import { TutorialOverlay } from './components/TutorialOverlay.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';

export type AppView = 'menu' | 'solo_setup' | 'join_room' | 'lobby' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // High-level App Navigation & Match Flow
  const [appView, setAppView] = useState<AppView>('menu');
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  const [currentSoloConfig, setCurrentSoloConfig] = useState<SoloMatchConfig | null>(null);

  // Modals & Settings
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [touchSettings, setTouchSettings] = useState<TouchControlSettings>(() => inputManager.getSettings());
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Live Game State from Phaser simulation
  const [simState, setSimState] = useState<GameStateUpdate | null>(null);

  // Sync game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = appView;
  }, [appView]);

  // Check mobile device & URL ?room=CODE on boot and on resize
  useEffect(() => {
    const updateDeviceMode = () => {
      const hasTouch = typeof window !== 'undefined' && (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 960 ||
        /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
      );
      setIsMobileDevice(hasTouch);
      inputManager.setIsMobile(hasTouch);
    };

    updateDeviceMode();
    window.addEventListener('resize', updateDeviceMode);

    // Check ?room=CODE in URL query params
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim().length > 0) {
      setInitialRoomCode(roomParam.trim().toUpperCase());
      setAppView('join_room');
    }

    return () => window.removeEventListener('resize', updateDeviceMode);
  }, []);

  // Subscribe to multiplayer client room events
  useEffect(() => {
    const unsubRoom = multiplayerClient.onRoomUpdate((room) => {
      setActiveRoom({ ...room });
    });

    const unsubCountdown = multiplayerClient.onCountdown(() => {
      soundEngine.ensureContext();
      setAppView('playing');
      if (multiplayerClient.room) {
        gameManager.startOnlineMatch(multiplayerClient.room);
      }
    });

    const unsubTick = multiplayerClient.onTick(() => {
      // If we receive ticks and we are still in lobby, transition to playing
      setAppView((prev) => {
        if (prev === 'lobby') {
          if (multiplayerClient.room) {
            gameManager.startOnlineMatch(multiplayerClient.room);
          }
          return 'playing';
        }
        return prev;
      });
    });

    const unsubMatchEnd = multiplayerClient.onMatchEnd(() => {
      setAppView('gameover');
    });

    const unsubError = multiplayerClient.onError((errMsg) => {
      setConnectionError(errMsg);
      setTimeout(() => setConnectionError(null), 4000);
    });

    return () => {
      unsubRoom();
      unsubCountdown();
      unsubTick();
      unsubMatchEnd();
      unsubError();
    };
  }, []);

  // Handle incoming simulation state updates from Phaser scene
  const handleStateUpdate = useCallback((update: GameStateUpdate) => {
    setSimState(update);
    if (update.isGameOver) {
      setAppView('gameover');
    }
  }, []);

  // Mount Phaser game once on startup (dormant title mode by default)
  useEffect(() => {
    if (canvasMountRef.current) {
      gameManager.init(canvasMountRef.current, handleStateUpdate);
    }

    return () => {
      gameManager.destroy();
    };
  }, [handleStateUpdate]);

  // Global keyboard shortcuts (Pause on Escape / P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (appView === 'playing') {
          setAppView('paused');
          gameManager.setPaused(true);
        } else if (appView === 'paused') {
          setAppView('playing');
          gameManager.setPaused(false);
        }
      } else if (e.code === 'KeyM') {
        const muted = soundEngine.toggleMute();
        setIsMuted(muted);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appView]);

  // Actions
  const handleStartSoloMatch = (config: SoloMatchConfig) => {
    soundEngine.ensureContext();
    setCurrentSoloConfig(config);
    setAppView('playing');
    gameManager.setPaused(false);
    gameManager.startSoloMatch(config);
  };

  const handleCreateRoom = async (name: string, character: CharacterArchetype) => {
    soundEngine.ensureContext();
    try {
      await multiplayerClient.createRoom(name, character);
      setAppView('lobby');
    } catch {
      setConnectionError('Unable to connect to multiplayer server.');
    }
  };

  const handleJoinRoom = async (code: string, name: string, character: CharacterArchetype) => {
    soundEngine.ensureContext();
    try {
      await multiplayerClient.joinRoom(code, name, character);
      setAppView('lobby');
    } catch {
      setConnectionError('Unable to join private room.');
    }
  };

  const handleQuickMatch = async () => {
    soundEngine.ensureContext();
    try {
      await multiplayerClient.quickMatch('Pilot', 'tracer');
      setAppView('lobby');
    } catch {
      setConnectionError('Unable to find quick match.');
    }
  };

  const handleLeaveRoom = () => {
    multiplayerClient.leaveRoom();
    setActiveRoom(null);
    setAppView('menu');
    gameManager.setTitleMode();
  };

  const handleStartTutorial = () => {
    soundEngine.ensureContext();
    setAppView('playing');
    gameManager.setPaused(false);
    gameManager.startTutorial();
  };

  const resumeGame = () => {
    setAppView('playing');
    gameManager.setPaused(false);
  };

  const pauseGame = () => {
    inputManager.exitPointerLock();
    setAppView('paused');
    gameManager.setPaused(true);
  };

  const restartGame = () => {
    setAppView('playing');
    gameManager.setPaused(false);
    if (simState?.isTutorialMode) {
      gameManager.restartTutorial();
    } else if (currentSoloConfig) {
      gameManager.startSoloMatch(currentSoloConfig);
    } else {
      gameManager.restart();
    }
  };

  const returnToMainMenu = () => {
    inputManager.exitPointerLock();
    if (activeRoom) {
      multiplayerClient.leaveRoom();
      setActiveRoom(null);
    }
    setAppView('menu');
    gameManager.setTitleMode();
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleUpdateSettings = (partial: Partial<TouchControlSettings>) => {
    inputManager.updateSettings(partial);
    setTouchSettings(inputManager.getSettings());
  };

  const youPlayer = simState?.players.find((p) => p.id === 'p1' || p.name.includes('YOU')) || simState?.players[0];

  return (
    <div className="relative w-full h-full bg-[#06080d] overflow-hidden select-none font-sans">
      {/* 1. Isolated Phaser 3 Canvas Viewport */}
      <div
        ref={canvasMountRef}
        data-testid="game-canvas-container"
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* Connection / Toast Error Banner */}
      {connectionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-950/90 border border-red-500 rounded text-red-200 text-xs font-mono shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          {connectionError}
        </div>
      )}

      {/* Action Message / Warning Feedback Banner (e.g. low stamina, ability recharging) */}
      {simState?.actionMessage && (appView === 'playing' || appView === 'paused') && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 bg-slate-950/90 border border-amber-400/80 rounded-full text-amber-300 text-xs font-cyber tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse flex items-center gap-2 pointer-events-none">
          <span className="text-amber-400">⚡</span> {simState.actionMessage}
        </div>
      )}

      {/* 2. MAIN MENU (Default state on initial load - NO auto-play) */}
      {appView === 'menu' && !isEditLayoutMode && (
        <MainMenu
          onSelectSolo={() => setAppView('solo_setup')}
          onSelectFriends={() => setAppView('join_room')}
          onSelectQuickMatch={handleQuickMatch}
          onStartTutorial={handleStartTutorial}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* 3. SOLO MATCH SETUP */}
      {appView === 'solo_setup' && (
        <SoloMatchSetup
          onStartMatch={handleStartSoloMatch}
          onBack={() => setAppView('menu')}
        />
      )}

      {/* 4. JOIN / CREATE PRIVATE ROOM MODAL */}
      {appView === 'join_room' && (
        <JoinRoomModal
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onClose={() => setAppView('menu')}
          initialCode={initialRoomCode}
        />
      )}

      {/* 5. MULTIPLAYER LOBBY */}
      {appView === 'lobby' && activeRoom && (
        <MultiplayerLobby
          room={activeRoom}
          onLeave={handleLeaveRoom}
          onStartMatch={() => multiplayerClient.startMatch()}
        />
      )}

      {/* 6. IN-GAME HUD (Visible in 'playing' or 'paused') */}
      {(appView === 'playing' || appView === 'paused') && simState && (
        <>
          <TopHUD
            matchTimeSeconds={simState.matchTimeSeconds}
            currentRound={simState.currentRound}
            totalRounds={simState.totalRounds}
            players={simState.players}
            nextEventName={simState.nextEventName}
            nextEventTime={simState.nextEventTime}
            onPause={pauseGame}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {youPlayer && (
            <BottomHUD
              player={youPlayer}
              isMobile={isMobileDevice}
              interactPrompt={simState.interactPrompt}
              keybindings={touchSettings.keybindings}
              tacticalCooldown={simState.humanTacticalCooldown || 0}
            />
          )}

          {/* Interactive Tutorial Guided Overlay */}
          {simState.isTutorialMode && simState.tutorialStep && (
            <TutorialOverlay
              currentStep={simState.tutorialStep}
              isMobile={isMobileDevice}
              stepProgress={simState.tutorialProgress || 0}
              keybindings={touchSettings.keybindings}
              onNextStep={() => gameManager.skipTutorialStep()}
              onSkipTutorial={returnToMainMenu}
              onRestartTutorial={() => gameManager.restartTutorial()}
            />
          )}

        </>
      )}

      {/* Virtual Touch Controls on Mobile Devices / Edit Mode */}
      {(appView === 'playing' || appView === 'paused' || isEditLayoutMode) && (
        <TouchControls
          settings={touchSettings}
          visible={isMobileDevice || isEditLayoutMode}
          interactNearby={Boolean(simState?.interactPrompt)}
          interactLabel={simState?.interactPrompt?.label || 'COLLECT'}
          tacticalCooldown={simState?.humanTacticalCooldown || 0}
          characterArchetype={currentSoloConfig?.character || 'tracer'}
          isEditLayoutMode={isEditLayoutMode}
          onSaveLayout={(layout) => {
            handleUpdateSettings({ customPositions: layout });
            setIsEditLayoutMode(false);
          }}
          onCloseEditLayout={() => setIsEditLayoutMode(false)}
        />
      )}

      {/* Mobile Landscape Orientation Hint */}
      {isMobileDevice && (
        <div className="md:hidden fixed top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-slate-950/80 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-cyber text-cyan-300 flex items-center gap-1.5 shadow-lg">
            <span>🔄</span> Rotate device to landscape for full arena view
          </div>
        </div>
      )}

      {/* 7. PAUSE MODAL */}
      {appView === 'paused' && (
        <PauseModal
          onResume={resumeGame}
          onRestart={activeRoom ? () => setAppView('lobby') : restartGame}
          onHome={returnToMainMenu}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 8. GAME OVER / VICTORY MODAL */}
      {appView === 'gameover' && simState && youPlayer && (
        <GameOverModal
          winner={simState.winner}
          playerStats={youPlayer}
          matchDurationSeconds={simState.matchTimeSeconds}
          onRestart={activeRoom ? () => setAppView('lobby') : restartGame}
          onHome={returnToMainMenu}
        />
      )}

      {/* 9. HOW TO PLAY MODAL */}
      {isHowToPlayOpen && (
        <HowToPlayModal onClose={() => setIsHowToPlayOpen(false)} />
      )}

      {/* 10. SETTINGS MODAL */}
      {isSettingsOpen && (
        <SettingsModal
          settings={touchSettings}
          onUpdateSettings={handleUpdateSettings}
          onOpenEditLayout={() => {
            setIsSettingsOpen(false);
            setIsEditLayoutMode(true);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
