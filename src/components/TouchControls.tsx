import React, { useRef, useState, useEffect, useCallback } from 'react';
import { inputManager, TouchControlSettings } from '../game/input.ts';
import { Zap, Navigation, Anchor, ShieldAlert, Sparkles, Hand, Check, RotateCcw, X } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';
import { CharacterArchetype } from '../game/multiplayerTypes.ts';

interface TouchControlsProps {
  settings: TouchControlSettings;
  visible?: boolean;
  interactNearby?: boolean;
  interactLabel?: string;
  tacticalCooldown?: number;
  tacticalMaxCooldown?: number;
  characterArchetype?: CharacterArchetype;
  isEditLayoutMode?: boolean;
  onSaveLayout?: (positions: { joystick: { x: number; y: number }; buttons: { x: number; y: number } }) => void;
  onCloseEditLayout?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  settings,
  visible = true,
  interactNearby = false,
  interactLabel = 'COLLECT',
  tacticalCooldown = 0,
  tacticalMaxCooldown = 8,
  characterArchetype = 'vanguard',
  isEditLayoutMode = false,
  onSaveLayout,
  onCloseEditLayout,
}) => {
  if (!visible) return null;

  // Joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 });
  const [floatingBasePos, setFloatingBasePos] = useState<{ x: number; y: number } | null>(null);

  // Active button press states for visual feedback
  const [activeButtons, setActiveButtons] = useState<Record<string, boolean>>({
    attack: false,
    grapple: false,
    dash: false,
    tactical: false,
    interact: false,
  });

  // Track touches independently by identifier
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const actionTouchesRef = useRef<Map<number, string>>(new Map()); // touchId -> actionName

  // Drag positions for Edit Layout Mode
  const [customPositions, setCustomPositions] = useState<{
    joystick: { x: number; y: number };
    buttons: { x: number; y: number };
  }>(() => ({
    joystick: settings.customPositions?.joystick || { x: 24, y: 24 },
    buttons: settings.customPositions?.buttons || { x: 24, y: 24 },
  }));

  const draggingElementRef = useRef<'joystick' | 'buttons' | null>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });

  const maxRadius = 52 * settings.joystickScale;
  const isFloating = settings.joystickType === 'floating';

  // -------------------------------------------------------------
  // Left Zone Touch Handlers (Joystick)
  // -------------------------------------------------------------
  const handleLeftZoneTouchStart = (e: React.TouchEvent) => {
    if (isEditLayoutMode) return;
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    if (isFloating) {
      setFloatingBasePos({ x: touch.clientX, y: touch.clientY });
      joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      // Fixed joystick position
      const element = document.getElementById('fixed-joystick-base');
      if (element) {
        const rect = element.getBoundingClientRect();
        joystickCenterRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      } else {
        joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }

    setJoystickActive(true);
    updateJoystickFromTouch(touch.clientX, touch.clientY);
  };

  const handleLeftZoneTouchMove = (e: React.TouchEvent) => {
    if (isEditLayoutMode || joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        updateJoystickFromTouch(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const updateJoystickFromTouch = (clientX: number, clientY: number) => {
    const dx = clientX - joystickCenterRef.current.x;
    const dy = clientY - joystickCenterRef.current.y;
    const dist = Math.hypot(dx, dy);

    // Subtle deadzone to prevent jitter
    const deadZone = 7;
    if (dist < deadZone) {
      setJoystickOffset({ x: 0, y: 0 });
      inputManager.setTouchMove(0, 0);
    } else {
      const clampedDist = Math.min(dist, maxRadius);
      const nx = dx / dist;
      const ny = dy / dist;

      setJoystickOffset({
        x: nx * clampedDist,
        y: ny * clampedDist,
      });

      // Analog normalized vector (-1 to 1)
      const power = clampedDist / maxRadius;
      inputManager.setTouchMove(nx * power, ny * power);
    }
  };

  const handleLeftZoneTouchEnd = (e: React.TouchEvent) => {
    if (isEditLayoutMode) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setJoystickOffset({ x: 0, y: 0 });
        setFloatingBasePos(null);
        inputManager.setTouchMove(0, 0);
        break;
      }
    }
  };

  // -------------------------------------------------------------
  // Right Zone Action Button Touch Handlers
  // -------------------------------------------------------------
  const handleButtonTouchStart = (action: 'knockback' | 'grapple' | 'dash' | 'tactical' | 'interact', e: React.TouchEvent) => {
    if (isEditLayoutMode) return;
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      actionTouchesRef.current.set(touch.identifier, action);
    }

    setActiveButtons((prev) => ({ ...prev, [action]: true }));
    inputManager.setTouchAction(action === 'knockback' ? 'knockback' : action, true);

    if (settings.vibration) {
      soundEngine.triggerHaptic(action === 'knockback' ? 'medium' : 'light');
    }
  };

  const handleButtonTouchEnd = (action: 'knockback' | 'grapple' | 'dash' | 'tactical' | 'interact', e: React.TouchEvent) => {
    if (isEditLayoutMode) return;
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (actionTouchesRef.current.get(touch.identifier) === action) {
        actionTouchesRef.current.delete(touch.identifier);
      }
    }

    // Check if another finger is still holding this action
    let stillHeld = false;
    actionTouchesRef.current.forEach((val) => {
      if (val === action) stillHeld = true;
    });

    if (!stillHeld) {
      setActiveButtons((prev) => ({ ...prev, [action]: false }));
      inputManager.setTouchAction(action === 'knockback' ? 'knockback' : action, false);
    }
  };

  // -------------------------------------------------------------
  // Layout Edit Drag Handlers
  // -------------------------------------------------------------
  const startDrag = (elem: 'joystick' | 'buttons', e: React.TouchEvent | React.MouseEvent) => {
    if (!isEditLayoutMode) return;
    draggingElementRef.current = elem;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPosRef.current = {
      clientX,
      clientY,
      startX: customPositions[elem].x,
      startY: customPositions[elem].y,
    };
  };

  const onDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isEditLayoutMode || !draggingElementRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStartPosRef.current.clientX;
    const dy = clientY - dragStartPosRef.current.clientY;

    const elem = draggingElementRef.current;
    setCustomPositions((prev) => ({
      ...prev,
      [elem]: {
        x: Math.max(8, Math.min(180, dragStartPosRef.current.startX + (elem === 'joystick' ? dx : -dx))),
        y: Math.max(8, Math.min(180, dragStartPosRef.current.startY - dy)),
      },
    }));
  };

  const endDrag = () => {
    draggingElementRef.current = null;
  };

  // Clean reset when component unmounts
  useEffect(() => {
    return () => {
      inputManager.clearAll();
    };
  }, []);

  const tacticalReady = tacticalCooldown <= 0;
  const tacticalCooldownRatio = tacticalMaxCooldown > 0 ? Math.max(0, tacticalCooldown / tacticalMaxCooldown) : 0;

  return (
    <div
      className={`fixed inset-0 pointer-events-none ${isEditLayoutMode ? 'z-50' : 'z-30'} select-none overflow-hidden touch-none`}
      style={{ opacity: isEditLayoutMode ? 1 : settings.opacity }}
      onTouchMove={isEditLayoutMode ? onDragMove : undefined}
      onTouchEnd={isEditLayoutMode ? endDrag : undefined}
    >
      {/* Edit Layout Modal Header Banner */}
      {isEditLayoutMode && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-950/95 border-2 border-cyan-400 p-3 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.4)]">
          <div className="flex flex-col">
            <span className="font-cyber font-bold text-xs text-cyan-300">EDIT MOBILE LAYOUT</span>
            <span className="text-[10px] text-slate-400 font-mono">Drag control clusters to reposition for your thumbs</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCustomPositions({
                  joystick: { x: 24, y: 24 },
                  buttons: { x: 24, y: 24 },
                });
              }}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-cyber flex items-center gap-1 border border-slate-600"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              onClick={() => {
                if (onSaveLayout) onSaveLayout(customPositions);
                if (onCloseEditLayout) onCloseEditLayout();
              }}
              className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-cyber font-bold flex items-center gap-1"
            >
              <Check size={14} /> Save
            </button>
            <button
              onClick={onCloseEditLayout}
              className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEFT ZONE: Movement Virtual Joystick                          */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`pointer-events-auto absolute inset-y-0 left-0 w-1/2 select-none touch-none ${
          isEditLayoutMode ? 'border border-dashed border-cyan-500/30' : ''
        }`}
        onTouchStart={handleLeftZoneTouchStart}
        onTouchMove={handleLeftZoneTouchMove}
        onTouchEnd={handleLeftZoneTouchEnd}
        onTouchCancel={handleLeftZoneTouchEnd}
      >
        {/* Render Floating Joystick (at touch location) OR Fixed Joystick (at bottom-left) */}
        {isFloating && joystickActive && floatingBasePos ? (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${floatingBasePos.x}px`,
              top: `${floatingBasePos.y}px`,
              width: `${120 * settings.joystickScale}px`,
              height: `${120 * settings.joystickScale}px`,
            }}
          >
            {/* Base Ring */}
            <div className="w-full h-full rounded-full border-2 border-cyan-400/60 bg-slate-950/70 shadow-[0_0_20px_rgba(0,240,255,0.35)] flex items-center justify-center relative">
              <div className="absolute w-8 h-[1px] bg-cyan-400/40" />
              <div className="absolute h-8 w-[1px] bg-cyan-400/40" />
              {/* Thumb Stick */}
              <div
                className="w-13 h-13 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white shadow-[0_0_15px_#00f0ff] flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
                }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
              </div>
            </div>
          </div>
        ) : (
          /* Fixed Joystick Base */
          <div
            id="fixed-joystick-base"
            className={`absolute pointer-events-auto touch-none select-none ${
              isEditLayoutMode ? 'cursor-move ring-2 ring-cyan-400' : ''
            }`}
            style={{
              left: `${customPositions.joystick.x}px`,
              bottom: `${customPositions.joystick.y}px`,
              width: `${128 * settings.joystickScale}px`,
              height: `${128 * settings.joystickScale}px`,
            }}
            onTouchStart={(e) => isEditLayoutMode && startDrag('joystick', e)}
            onMouseDown={(e) => isEditLayoutMode && startDrag('joystick', e)}
          >
            {isEditLayoutMode && (
              <span className="absolute -top-6 left-0 bg-cyan-950/90 text-cyan-300 font-cyber text-[9px] px-1.5 py-0.5 rounded border border-cyan-400">
                JOYSTICK (DRAG)
              </span>
            )}
            <div
              className={`w-full h-full rounded-full border-2 bg-slate-950/75 flex items-center justify-center transition-all ${
                joystickActive
                  ? 'border-cyan-300 ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(0,240,255,0.4)]'
                  : 'border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
              }`}
            >
              {/* Radial direction ticks */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/20 pointer-events-none" />
              <div className="absolute w-8 h-[1px] bg-cyan-400/40 pointer-events-none" />
              <div className="absolute h-8 w-[1px] bg-cyan-400/40 pointer-events-none" />

              {/* Thumb Stick */}
              <div
                className="w-13 h-13 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white shadow-[0_0_15px_#00f0ff] flex items-center justify-center pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
                }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT ZONE: Combat Buttons Cluster                             */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`pointer-events-auto absolute inset-y-0 right-0 w-1/2 select-none touch-none ${
          isEditLayoutMode ? 'border border-dashed border-purple-500/30' : ''
        }`}
      >
        <div
          className={`absolute pointer-events-auto flex items-end gap-3 select-none touch-none ${
            isEditLayoutMode ? 'cursor-move ring-2 ring-purple-400 p-2 rounded-xl bg-purple-950/20' : ''
          }`}
          style={{
            right: `${customPositions.buttons.x}px`,
            bottom: `${customPositions.buttons.y}px`,
            transform: `scale(${settings.buttonScale})`,
            transformOrigin: 'bottom right',
          }}
          onTouchStart={(e) => isEditLayoutMode && startDrag('buttons', e)}
          onMouseDown={(e) => isEditLayoutMode && startDrag('buttons', e)}
        >
          {isEditLayoutMode && (
            <span className="absolute -top-7 right-0 bg-purple-950/90 text-purple-300 font-cyber text-[9px] px-1.5 py-0.5 rounded border border-purple-400">
              BUTTONS (DRAG)
            </span>
          )}

          {/* Contextual Interact Button (Smoothly appears when near an interactable object) */}
          {(interactNearby || isEditLayoutMode) && (
            <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-90 duration-200">
              <button
                onTouchStart={(e) => handleButtonTouchStart('interact', e)}
                onTouchEnd={(e) => handleButtonTouchEnd('interact', e)}
                onTouchCancel={(e) => handleButtonTouchEnd('interact', e)}
                className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center text-amber-200 transition-all ${
                  activeButtons.interact
                    ? 'scale-90 bg-amber-400 text-black border-white shadow-[0_0_20px_#f59e0b]'
                    : 'bg-amber-950/90 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/40 animate-pulse'
                }`}
                aria-label="Interact"
              >
                <Sparkles size={20} className="text-amber-300" />
                <span className="text-[9px] font-cyber font-bold tracking-tight">{interactLabel}</span>
              </button>
            </div>
          )}

          {/* Secondary Action Column: Dash, Grapple, Tactical */}
          <div className="flex flex-col gap-2.5 items-center">
            {/* Dash Button */}
            <button
              onTouchStart={(e) => handleButtonTouchStart('dash', e)}
              onTouchEnd={(e) => handleButtonTouchEnd('dash', e)}
              onTouchCancel={(e) => handleButtonTouchEnd('dash', e)}
              className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                activeButtons.dash
                  ? 'scale-90 bg-cyan-400 text-black border-white shadow-[0_0_20px_#00f0ff]'
                  : 'bg-slate-900/95 border-cyan-400/70 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:border-cyan-300'
              }`}
              aria-label="Dash"
            >
              <Navigation size={19} className="transform -rotate-45" />
              <span className="text-[9px] font-cyber font-bold">DASH</span>
            </button>

            {/* Grapple Button */}
            <button
              onTouchStart={(e) => handleButtonTouchStart('grapple', e)}
              onTouchEnd={(e) => handleButtonTouchEnd('grapple', e)}
              onTouchCancel={(e) => handleButtonTouchEnd('grapple', e)}
              className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                activeButtons.grapple
                  ? 'scale-90 bg-cyan-400 text-black border-white shadow-[0_0_20px_#00f0ff]'
                  : 'bg-slate-900/95 border-cyan-400/70 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:border-cyan-300'
              }`}
              aria-label="Grapple Hook"
            >
              <Anchor size={19} />
              <span className="text-[9px] font-cyber font-bold">GRAPPLE</span>
            </button>

            {/* Tactical Ability Button (With cooldown sweep & ready highlight) */}
            <div className="relative">
              <button
                onTouchStart={(e) => handleButtonTouchStart('tactical', e)}
                onTouchEnd={(e) => handleButtonTouchEnd('tactical', e)}
                onTouchCancel={(e) => handleButtonTouchEnd('tactical', e)}
                className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                  activeButtons.tactical
                    ? 'scale-90 bg-purple-500 text-white border-white shadow-[0_0_25px_#c084fc]'
                    : tacticalReady
                    ? 'bg-slate-900/95 border-purple-400 text-purple-200 shadow-[0_0_16px_rgba(192,132,252,0.4)] ring-1 ring-purple-300'
                    : 'bg-slate-950/90 border-slate-700 text-slate-500'
                }`}
                aria-label="Tactical Ability"
              >
                {/* Cooldown overlay sweep */}
                {!tacticalReady && (
                  <div
                    className="absolute inset-0 bg-slate-950/80 transition-all pointer-events-none"
                    style={{ height: `${tacticalCooldownRatio * 100}%` }}
                  />
                )}

                <ShieldAlert size={19} className={tacticalReady ? 'text-purple-300 animate-pulse' : 'text-slate-600'} />
                <span className="text-[8px] font-cyber font-bold relative z-10">
                  {tacticalReady ? 'ABILITY' : `${Math.ceil(tacticalCooldown)}s`}
                </span>
              </button>
            </div>
          </div>

          {/* Primary KNOCKBACK Attack Button (Largest target for natural right thumb resting spot) */}
          <button
            onTouchStart={(e) => handleButtonTouchStart('knockback', e)}
            onTouchEnd={(e) => handleButtonTouchEnd('knockback', e)}
            onTouchCancel={(e) => handleButtonTouchEnd('knockback', e)}
            className={`w-21 h-21 rounded-full border-2 flex flex-col items-center justify-center text-white transition-all ${
              activeButtons.attack
                ? 'scale-90 bg-gradient-to-br from-cyan-400 to-blue-500 border-white shadow-[0_0_30px_#00f0ff]'
                : 'bg-gradient-to-br from-cyan-600 to-blue-700 border-white shadow-[0_0_22px_rgba(0,240,255,0.6)] ring-2 ring-cyan-400/40 hover:ring-cyan-300'
            }`}
            aria-label="Knockback Attack"
          >
            <Zap size={30} className={activeButtons.attack ? 'scale-125' : 'animate-pulse'} />
            <span className="text-[11px] font-cyber font-extrabold tracking-wider mt-0.5">ATTACK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
