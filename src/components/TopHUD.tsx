import React from 'react';
import { PlayerStats, formatMatchTimer } from '../game/rules.ts';
import { Volume2, VolumeX, Pause } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';

interface TopHUDProps {
  matchTimeSeconds: number;
  currentRound: number;
  totalRounds: number;
  players: (PlayerStats & { x?: number; y?: number })[];
  nextEventName: string;
  nextEventTime: number;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  matchTimeSeconds,
  currentRound,
  totalRounds,
  players,
  nextEventName,
  nextEventTime,
  onPause,
  isMuted,
  onToggleMute,
}) => {
  const you = players.find((p) => p.id === 'p1') || players[0];
  const opponents = players.filter((p) => p.id !== 'p1');
  const aliveCount = players.filter((p) => p.isAlive && p.lives > 0).length;

  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-30 pt-safe px-3 sm:px-6">
      <div className="flex items-start justify-between gap-2 max-w-7xl mx-auto">
        {/* Top-Left: Round, Timer & Lives */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Timer Panel */}
            <div className="cyber-panel cyber-corner px-3 py-1.5 flex items-center gap-2 border-cyan-400/40">
              <span className="text-cyan-400 text-sm sm:text-base">⏱</span>
              <span className="font-cyber font-bold text-lg sm:text-2xl tracking-wider tabular-nums text-white neon-cyan-glow">
                {formatMatchTimer(matchTimeSeconds)}
              </span>
              <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest pl-1 border-l border-slate-700">
                ROUND {currentRound}/{totalRounds}
              </div>
            </div>

            {/* Lives count */}
            <div className="cyber-panel cyber-corner px-3 py-1.5 flex items-center gap-2 border-red-500/30">
              <span className="text-[10px] sm:text-xs uppercase font-cyber text-slate-400 tracking-wider">LIVES</span>
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                {[...Array(3)].map((_, i) => (
                  <span
                    key={i}
                    className={`transition-opacity duration-300 ${
                      i < (you?.lives || 0) ? 'text-red-400 opacity-100 scale-110' : 'text-slate-600 opacity-40'
                    }`}
                  >
                    💀
                  </span>
                ))}
              </div>
              <span className="text-xs sm:text-sm font-cyber font-bold text-slate-200 tabular-nums">
                {aliveCount}/6
              </span>
            </div>
          </div>

          {/* Left Vertical Opponent Cards Stack (Desktop & Tablet) */}
          <div className="hidden md:flex flex-col gap-1.5 mt-2 w-36">
            {opponents.map((opp) => {
              const isEliminated = !opp.isAlive || opp.lives <= 0;
              return (
                <div
                  key={opp.id}
                  className={`cyber-panel px-2 py-1 rounded transition-all duration-300 flex items-center gap-2 ${
                    isEliminated ? 'opacity-35 grayscale border-slate-800' : 'border-slate-700/60'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
                    style={{ backgroundColor: opp.color }}
                  >
                    {opp.name.replace('P', '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[10px] leading-tight">
                      <span className="font-cyber font-semibold text-slate-300">{opp.name}</span>
                      <span className="text-slate-400 font-mono text-[9px]">
                        {isEliminated ? 'OUT' : `❤ ${opp.lives}`}
                      </span>
                    </div>
                    {/* Tiny Health Bar */}
                    <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                      <div
                        className="h-full transition-all duration-200"
                        style={{
                          width: `${isEliminated ? 0 : opp.health}%`,
                          backgroundColor: opp.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-Center: Player Status Badges */}
        <div className="cyber-panel cyber-corner px-2 sm:px-3 py-1 flex items-center gap-1.5 sm:gap-3 border-cyan-500/20 max-w-[200px] sm:max-w-none overflow-x-auto scrollbar-none">
          {players.map((p) => {
            const isElim = !p.isAlive || p.lives <= 0;
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center flex-shrink-0 transition-all ${
                  isElim ? 'opacity-30' : 'opacity-100'
                }`}
              >
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-cyber font-bold border ${
                    p.id === 'p1' ? 'border-cyan-300 ring-2 ring-cyan-400/40' : 'border-slate-700'
                  }`}
                  style={{
                    backgroundColor: isElim ? '#1f2937' : '#0f172a',
                    color: p.color,
                  }}
                >
                  {p.id === 'p1' ? '★' : p.name.replace('P', '')}
                </div>
                <span className="text-[8px] sm:text-[9px] font-cyber text-slate-400 mt-0.5">
                  {p.id === 'p1' ? 'YOU' : p.name}
                </span>
                <div className="w-3.5 sm:w-5 h-0.5 bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${isElim ? 0 : Math.max(15, p.health)}%`,
                      backgroundColor: p.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top-Right: Minimap Radar & Next Event & Utility Controls */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          {/* Audio & Pause Utility buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleMute}
              className="cyber-panel w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-cyan-400 hover:text-white hover:border-cyan-400 transition-colors pointer-events-auto"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={onPause}
              className="cyber-panel w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-cyan-400 hover:text-white hover:border-cyan-400 transition-colors pointer-events-auto"
              title="Pause Game [Esc]"
              aria-label="Pause Game"
            >
              <Pause size={15} />
            </button>
          </div>

          {/* Minimap Radar Screen */}
          <div className="cyber-panel cyber-corner p-1.5 border-cyan-500/30 flex flex-col items-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#080d17] border border-cyan-500/40 overflow-hidden flex items-center justify-center">
              {/* Radar Grid Circles */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/20" />
              <div className="absolute inset-5 rounded-full border border-cyan-500/25" />
              <div className="absolute w-full h-[1px] bg-cyan-500/20" />
              <div className="absolute h-full w-[1px] bg-cyan-500/20" />

              {/* Compass N Indicator */}
              <span className="absolute top-0.5 text-[8px] font-cyber text-cyan-400 font-bold">N</span>

              {/* Player Dots on Minimap */}
              {players.map((p) => {
                if (!p.isAlive || p.lives <= 0) return null;
                // Scale arena coordinates (-460..460) to radar size (~80px)
                const radarRadius = 38;
                const arenaRadius = 460;
                const px = ((p.x || 0) / arenaRadius) * radarRadius;
                const py = ((p.y || 0) / arenaRadius) * radarRadius;

                return (
                  <div
                    key={p.id}
                    className={`absolute rounded-full transition-transform duration-75 ${
                      p.id === 'p1'
                        ? 'w-2.5 h-2.5 ring-1 ring-cyan-300 z-10 animate-pulse'
                        : 'w-1.5 h-1.5'
                    }`}
                    style={{
                      transform: `translate(${px}px, ${py}px)`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 6px ${p.color}`,
                    }}
                  />
                );
              })}
            </div>

            {/* Next Event Timer Card */}
            <div className="mt-1 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-cyber text-slate-300">
              <span className="text-purple-400">⚡</span>
              <span className="uppercase tracking-wider text-slate-400">NEXT:</span>
              <span className="text-cyan-300 font-bold truncate max-w-[80px]">
                {nextEventName}
              </span>
              <span className="text-purple-300 font-mono tabular-nums">
                00:{nextEventTime < 10 ? `0${nextEventTime}` : nextEventTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
