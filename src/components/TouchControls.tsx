import React, { useRef, useState, useEffect } from 'react';
import { inputManager, TouchControlSettings } from '../game/input.ts';
import { Zap, Navigation, Anchor, ShieldAlert, Target } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';

interface TouchControlsProps {
  settings: TouchControlSettings;
  visible?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ settings, visible = true }) => {
  if (!visible) return null;
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 }); // Offset from base center
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 50 * settings.joystickScale;

  // Touch handlers for Virtual Joystick (Left Thumb)
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    if (joystickBaseRef.current) {
      const rect = joystickBaseRef.current.getBoundingClientRect();
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    setJoystickActive(true);
    handleJoystickTouchMove(e);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const dist = Math.hypot(dx, dy);

        // Dead zone check (10% of max radius)
        const deadZone = 6;
        if (dist < deadZone) {
          setJoystickPos({ x: 0, y: 0 });
          inputManager.setTouchMove(0, 0);
        } else {
          const clampedDist = Math.min(dist, maxRadius);
          const nx = dx / dist;
          const ny = dy / dist;

          setJoystickPos({
            x: nx * clampedDist,
            y: ny * clampedDist,
          });

          // Send normalized -1..1 vector to input manager
          inputManager.setTouchMove((nx * clampedDist) / maxRadius, (ny * clampedDist) / maxRadius);
        }
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setJoystickPos({ x: 0, y: 0 });
        inputManager.setTouchMove(0, 0);
        break;
      }
    }
  };

  // Button Action Helper with Haptic & Sound
  const triggerActionButton = (action: 'knockback' | 'dash' | 'grapple' | 'tactical', pressed: boolean) => {
    inputManager.setTouchAction(action, pressed);
    if (pressed && settings.vibration) {
      soundEngine.triggerHaptic('light');
    }
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-20 flex justify-between items-end p-4 pb-safe select-none"
      style={{ opacity: settings.opacity }}
    >
      {/* LEFT SIDE: Virtual Analog Joystick */}
      <div
        className="pointer-events-auto relative touch-none ml-2 mb-2 select-none"
        style={{
          width: `${130 * settings.joystickScale}px`,
          height: `${130 * settings.joystickScale}px`,
        }}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        {/* Joystick Base Ring */}
        <div
          ref={joystickBaseRef}
          className={`w-full h-full rounded-full border-2 border-cyan-400/40 bg-slate-950/60 backdrop-blur-none flex items-center justify-center transition-all ${
            joystickActive ? 'border-cyan-300 ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(0,240,255,0.3)]' : ''
          }`}
        >
          {/* Inner Crosshairs */}
          <div className="absolute w-8 h-[1px] bg-cyan-400/30" />
          <div className="absolute h-8 w-[1px] bg-cyan-400/30" />

          {/* Floating Thumb Stick */}
          <div
            className="w-12 h-12 rounded-full bg-cyan-500/80 border-2 border-white shadow-[0_0_12px_#00f0ff] flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-white shadow-inner" />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Action Buttons Cluster */}
      <div
        className="pointer-events-auto relative mr-2 mb-2 flex items-end gap-3 select-none touch-none"
        style={{ transform: `scale(${settings.buttonScale})`, transformOrigin: 'bottom right' }}
      >
        {/* Secondary Buttons Column */}
        <div className="flex flex-col gap-2.5 items-center">
          {/* Dash Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerActionButton('dash', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              triggerActionButton('dash', false);
            }}
            onTouchCancel={() => triggerActionButton('dash', false)}
            className="w-13 h-13 rounded-full bg-slate-900/90 border border-cyan-400/60 flex flex-col items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)] active:scale-90 active:bg-cyan-500 active:text-white transition-all"
            aria-label="Dash"
          >
            <Navigation size={18} className="transform -rotate-45" />
            <span className="text-[9px] font-cyber font-bold">DASH</span>
          </button>

          {/* Grapple Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerActionButton('grapple', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              triggerActionButton('grapple', false);
            }}
            onTouchCancel={() => triggerActionButton('grapple', false)}
            className="w-13 h-13 rounded-full bg-slate-900/90 border border-cyan-400/60 flex flex-col items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)] active:scale-90 active:bg-cyan-500 active:text-white transition-all"
            aria-label="Grapple Hook"
          >
            <Anchor size={18} />
            <span className="text-[9px] font-cyber font-bold">GRAPPLE</span>
          </button>

          {/* Tactical Ability Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerActionButton('tactical', true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              triggerActionButton('tactical', false);
            }}
            onTouchCancel={() => triggerActionButton('tactical', false)}
            className="w-13 h-13 rounded-full bg-slate-900/90 border border-purple-400/60 flex flex-col items-center justify-center text-purple-300 shadow-[0_0_10px_rgba(192,132,252,0.25)] active:scale-90 active:bg-purple-600 active:text-white transition-all"
            aria-label="Tactical Ability"
          >
            <ShieldAlert size={18} />
            <span className="text-[9px] font-cyber font-bold">TACTICAL</span>
          </button>
        </div>

        {/* Primary KNOCKBACK Attack Button (Large target for thumb) */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            triggerActionButton('knockback', true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            triggerActionButton('knockback', false);
          }}
          onTouchCancel={() => triggerActionButton('knockback', false)}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 border-2 border-white flex flex-col items-center justify-center text-white shadow-[0_0_20px_rgba(0,240,255,0.6)] active:scale-90 active:from-cyan-400 active:to-cyan-600 transition-all"
          aria-label="Knockback Attack"
        >
          <Zap size={28} className="animate-pulse" />
          <span className="text-[10px] font-cyber font-extrabold tracking-wider">ATTACK</span>
        </button>
      </div>
    </div>
  );
};
