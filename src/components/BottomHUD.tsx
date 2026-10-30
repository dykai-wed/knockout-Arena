import React from 'react';
import { PlayerStats, STAMINA_COSTS } from '../game/rules.ts';
import { Zap, Anchor, ShieldAlert, Sparkles, Navigation, Hand } from 'lucide-react';
import { KeyBindings, DEFAULT_KEYBINDINGS } from '../game/input.ts';

interface BottomHUDProps {
  player: PlayerStats;
  isMobile: boolean;
  interactPrompt?: {
    label: string;
    targetName: string;
  } | null;
  keybindings?: KeyBindings;
  tacticalCooldown?: number;
}

export const BottomHUD: React.FC<BottomHUDProps> = ({
  player,
  isMobile,
  interactPrompt,
  keybindings = DEFAULT_KEYBINDINGS,
  tacticalCooldown = 0,
}) => {
  const staminaPercent = Math.round((player.stamina / player.maxStamina) * 100);
  const healthPercent = Math.round((player.health / player.maxHealth) * 100);
  const shieldPercent = Math.round((player.shield / player.maxShield) * 100);

  const formatKeyName = (code: string) => {
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
    if (code === 'Space') return 'SPACE';
    if (code === 'Escape') return 'ESC';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-20 pb-safe px-3 sm:px-6">
      <div className="flex flex-col gap-1.5 max-w-7xl mx-auto">
        {/* Contextual Interaction Floating Hint (Desktop & Mobile) */}
        {interactPrompt && (
          <div className="flex justify-center pointer-events-auto">
            <div className="cyber-panel px-3.5 py-1.5 border-amber-400 bg-slate-950/90 rounded-full flex items-center gap-2 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-bounce">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-xs font-cyber font-bold tracking-wider">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-white font-mono text-[10px] mr-1.5">
                  {formatKeyName(keybindings.interact)}
                </span>
                {interactPrompt.label}: {interactPrompt.targetName}
              </span>
            </div>
          </div>
        )}

        {/* Main HUD Dock */}
        <div className="flex items-end justify-between gap-2 sm:gap-4 flex-wrap">
          {/* Bottom-Left: Player Avatar & Vitality (Health + Shield) */}
          <div className="cyber-panel cyber-corner p-2 sm:p-3 flex items-center gap-3 border-cyan-500/40 pointer-events-auto">
            {/* Cybernetic Helmet Avatar */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/40 to-slate-900" />
              <div className="w-8 h-3 bg-cyan-400 rounded-full blur-[1px] shadow-[0_0_8px_#00f0ff] animate-pulse" />
              <div className="absolute bottom-1 text-[8px] font-cyber text-cyan-300 font-bold tracking-tighter">
                CYBER-X
              </div>
            </div>

            {/* Vitality Stats */}
            <div className="flex flex-col gap-1 min-w-[110px] sm:min-w-[140px]">
              <div className="flex justify-between items-center">
                <span className="font-cyber font-bold text-sm sm:text-base text-cyan-300 tracking-wider">
                  YOU
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-slate-400">
                  {player.health}/{player.maxHealth}
                </span>
              </div>

              {/* Health Bar (Green/Cyan) */}
              <div className="h-2 sm:h-2.5 bg-slate-900/90 rounded border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
                  style={{ width: `${healthPercent}%` }}
                />
              </div>

              {/* Shield Bar (Blue) */}
              <div className="h-1.5 sm:h-2 bg-slate-900/90 rounded border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-150"
                  style={{ width: `${shieldPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom-Center-Left: Stamina Meter */}
          <div className="cyber-panel cyber-corner p-2 sm:p-3 flex flex-col gap-1 border-cyan-500/30 min-w-[100px] sm:min-w-[130px] pointer-events-auto">
            <div className="flex justify-between items-center text-[10px] sm:text-xs font-cyber text-slate-400">
              <span className="uppercase tracking-widest text-cyan-400">STAMINA</span>
              <span className="font-bold font-mono text-cyan-300 tabular-nums">{staminaPercent}%</span>
            </div>
            <div className="h-2 bg-slate-950 rounded border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-75"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>

          {/* Bottom-Center: 4 Ability Action Cards (Desktop Only - hidden on mobile) */}
          {!isMobile && (
            <div className="hidden lg:flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto">
              {/* Ability 1: Dash */}
              <div className="cyber-panel p-2 flex flex-col items-center justify-center rounded border-cyan-500/40 w-14 sm:w-16 h-16 sm:h-18 transition-transform hover:scale-105">
                <Navigation size={18} className="text-cyan-400 transform -rotate-45" />
                <span className="text-[10px] sm:text-xs font-cyber font-bold text-white mt-1">Dash</span>
                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-0.5">
                  <span className="px-1 py-0.2 bg-slate-800 rounded font-mono text-slate-300">
                    {formatKeyName(keybindings.dash)}
                  </span>
                  <span>({STAMINA_COSTS.dash})</span>
                </div>
              </div>

              {/* Ability 2: Grapple (RMB) */}
              <div className="cyber-panel p-2 flex flex-col items-center justify-center rounded border-cyan-500/40 w-14 sm:w-16 h-16 sm:h-18 transition-transform hover:scale-105">
                <Anchor size={18} className="text-cyan-400" />
                <span className="text-[10px] sm:text-xs font-cyber font-bold text-white mt-1">Grapple</span>
                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-0.5">
                  <span className="px-1 py-0.2 bg-slate-800 rounded font-mono text-slate-300">
                    {formatKeyName(keybindings.grapple)}
                  </span>
                  <span>({STAMINA_COSTS.grapple})</span>
                </div>
              </div>

              {/* Ability 3: Knockback Attack (LMB) */}
              <div className="cyber-panel p-2 flex flex-col items-center justify-center rounded border-cyan-400/80 ring-1 ring-cyan-400/30 w-14 sm:w-16 h-16 sm:h-18 transition-transform hover:scale-105">
                <Zap size={18} className="text-cyan-300 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-cyber font-bold text-cyan-200 mt-1">Knockback</span>
                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-0.5">
                  <span className="px-1 py-0.2 bg-slate-800 rounded font-mono text-slate-300">
                    {formatKeyName(keybindings.attack)}
                  </span>
                  <span>({STAMINA_COSTS.knockback})</span>
                </div>
              </div>

              {/* Ability 4: Tactical Ability */}
              <div className="cyber-panel p-2 flex flex-col items-center justify-center rounded border-cyan-500/40 w-14 sm:w-16 h-16 sm:h-18 transition-transform hover:scale-105">
                <ShieldAlert size={18} className={tacticalCooldown <= 0 ? 'text-purple-400 animate-pulse' : 'text-slate-500'} />
                <span className="text-[10px] sm:text-xs font-cyber font-bold text-white mt-1">
                  {tacticalCooldown <= 0 ? 'Tactical' : `${Math.ceil(tacticalCooldown)}s`}
                </span>
                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-0.5">
                  <span className="px-1 py-0.2 bg-slate-800 rounded font-mono text-slate-300">
                    {formatKeyName(keybindings.tactical)}
                  </span>
                  <span>({STAMINA_COSTS.tactical})</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom-Right-Center: Active Power-up Card (Hidden on narrow mobile, shown on tablet/desktop) */}
          <div className="hidden sm:flex cyber-panel cyber-corner p-2 sm:p-2.5 items-center gap-2 border-purple-500/30 min-w-[120px] pointer-events-auto">
            <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-400 flex items-center justify-center text-purple-300">
              <Sparkles size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-cyber text-slate-400 uppercase tracking-widest">
                ACTIVE POWER-UP
              </span>
              <span className="text-xs font-cyber font-bold text-purple-300 uppercase">
                {player.activePowerup ? `${player.activePowerup.type} ${Math.ceil(player.activePowerup.duration)}s` : 'NONE'}
              </span>
            </div>
          </div>

          {/* Bottom-Right: Desktop Controls Reference (Compact Panel) */}
          <div className="hidden lg:flex cyber-panel cyber-corner p-2.5 flex-col gap-1 text-[10px] text-slate-300 border-slate-700/60 pointer-events-auto">
            <span className="font-cyber font-bold text-cyan-400 tracking-wider uppercase text-[10px]">
              DESKTOP CONTROLS
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[9px] text-slate-400">
              <span><b className="text-cyan-300">WASD</b> Move</span>
              <span><b className="text-cyan-300">Mouse</b> Aim</span>
              <span><b className="text-cyan-300">{formatKeyName(keybindings.attack)}</b> Attack</span>
              <span><b className="text-cyan-300">{formatKeyName(keybindings.grapple)}</b> Grapple</span>
              <span><b className="text-cyan-300">{formatKeyName(keybindings.dash)}</b> Dash</span>
              <span><b className="text-cyan-300">{formatKeyName(keybindings.tactical)}</b> Tactical</span>
              <span><b className="text-cyan-300">{formatKeyName(keybindings.interact)}</b> Interact</span>
              <span><b className="text-cyan-300">{formatKeyName(keybindings.pause)}</b> Pause</span>
            </div>
          </div>
        </div>

        {/* Bottom Branding Bar */}
        <div className="flex justify-between items-center text-[10px] sm:text-xs font-cyber tracking-widest text-slate-500 pt-1 border-t border-slate-800/80">
          <span className="text-cyan-400/80 font-bold">KNOCKOUT ARENA</span>
          <span className="italic uppercase tracking-widest text-slate-500">
            OUTTHINK. OUTMANEUVER. OUTLAST.
          </span>
        </div>
      </div>
    </div>
  );
};
