import React, { useEffect, useState } from 'react';
import { Play, Settings, Shield, Zap, Sparkles } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame, onOpenSettings }) => {
  const [selectedColor, setSelectedColor] = useState<'cyan' | 'red' | 'green' | 'yellow' | 'purple' | 'orange'>('cyan');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundEngine.ensureContext();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const chassises = [
    { id: 'cyan', name: 'CYBER-X', color: '#00f0ff', perk: 'Agile Grappler (+15% tether speed)' },
    { id: 'red', name: 'TITAN-V', color: '#ff3b3b', perk: 'Heavy Impactor (+20% knockback)' },
    { id: 'green', name: 'AEGIS-3', color: '#00ff66', perk: 'Shielded (+25 max shield)' },
    { id: 'yellow', name: 'STORM-4', color: '#ffd600', perk: 'Supersonic (+15% dash distance)' },
    { id: 'purple', name: 'VORTEX-9', color: '#bf5af2', perk: 'EMP Pulse (-25% tactical cooldown)' },
    { id: 'orange', name: 'SOLAR-1', color: '#ff8800', perk: 'Kinetic Bumper (+25% bumper boost)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center p-6 bg-[#06080d]/92 backdrop-blur-none text-white select-none">
      {/* Background Neon Energy Rays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header / Branding */}
      <div className="relative z-10 flex flex-col items-center mt-4">
        {/* Bespoke Sci-Fi SVG Title Emblem Lockup */}
        <div className="flex items-center gap-3">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 animate-pulse" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,14 44,34 24,44 4,34 4,14" stroke="#00f0ff" strokeWidth="3" fill="rgba(0, 240, 255, 0.1)" />
            <circle cx="24" cy="24" r="8" fill="#00f0ff" />
            <line x1="24" y1="4" x2="24" y2="44" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
          <div className="flex flex-col">
            <h1 className="font-cyber font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-300 to-cyan-500 drop-shadow-[0_0_20px_rgba(0,240,255,0.7)]">
              KNOCKOUT ARENA
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-[1px] w-8 bg-cyan-400/60" />
              <p className="text-[10px] sm:text-xs font-cyber tracking-[0.3em] uppercase text-cyan-400">
                OUTTHINK · OUTMANEUVER · OUTLAST
              </p>
              <span className="h-[1px] w-8 bg-cyan-400/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Centerpiece: Hero Combatant Customizer */}
      <div className="relative z-10 w-full max-w-xl cyber-panel cyber-corner p-4 sm:p-6 border-cyan-500/40 my-auto">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-500/20">
          <span className="font-cyber text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
            <Shield size={16} /> SELECT COMBATANT CHASSIS
          </span>
          <span className="text-[10px] font-mono text-slate-400">6-PLAYER DEATHMATCH</span>
        </div>

        {/* Chassis Selector Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {chassises.map((chassis) => {
            const isSelected = selectedColor === chassis.id;
            return (
              <button
                key={chassis.id}
                onClick={() => {
                  setSelectedColor(chassis.id as any);
                  soundEngine.playKnockbackHit(false);
                }}
                className={`cyber-panel p-2 flex flex-col items-center gap-1.5 rounded transition-all ${
                  isSelected
                    ? 'border-white ring-2 shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                style={{
                  borderColor: isSelected ? chassis.color : undefined,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-white/80 shadow-md flex items-center justify-center"
                  style={{ backgroundColor: chassis.color }}
                >
                  {isSelected && <Zap size={14} className="text-black" />}
                </div>
                <span className="text-[10px] font-cyber font-bold text-slate-200">
                  {chassis.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Perk Preview */}
        {(() => {
          const active = chassises.find((c) => c.id === selectedColor)!;
          return (
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex items-center gap-3">
              <Sparkles size={18} style={{ color: active.color }} />
              <div className="flex flex-col">
                <span className="text-xs font-cyber font-bold text-white tracking-wide">
                  {active.name} CHASSIS PROFILE
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {active.perk}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Primary Start CTA Button */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            data-start="true"
            onClick={() => {
              soundEngine.ensureContext();
              onStartGame();
            }}
            className="flex-1 py-3.5 sm:py-4 px-6 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-cyber font-extrabold text-base sm:text-lg tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Play size={20} className="fill-current" />
            ENTER THE ARENA
          </button>

          <button
            onClick={onOpenSettings}
            className="py-3 px-4 rounded cyber-panel border-cyan-500/40 hover:border-cyan-300 text-cyan-300 flex items-center justify-center gap-2 font-cyber text-sm tracking-wider cursor-pointer"
            aria-label="Settings"
          >
            <Settings size={18} />
            SETTINGS
          </button>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <p className="text-[11px] sm:text-xs font-mono text-slate-400 tracking-wider">
          WASD Move · LMB Knockback · Space Grapple · Shift Dash · Esc Pause
        </p>
        <span className="text-[10px] text-slate-600">
          Mobile touch virtual joystick & thumb cluster automatically active on touchscreens
        </span>
      </div>
    </div>
  );
};
