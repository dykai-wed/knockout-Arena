import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, Home, Target, Zap, Anchor } from 'lucide-react';
import { PlayerStats, formatMatchTimer } from '../game/rules.ts';

interface GameOverModalProps {
  winner: PlayerStats | null;
  playerStats: PlayerStats;
  matchDurationSeconds: number;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  playerStats,
  matchDurationSeconds,
  onRestart,
  onHome,
}) => {
  const isVictory = winner?.id === 'p1';

  useEffect(() => {
    if (isVictory) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#ffffff', '#ffd700', '#bf5af2'],
        });
      } catch {
        // Confetti fallback
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVictory, onRestart]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none text-white select-none">
      <div
        className={`w-full max-w-md cyber-panel cyber-corner p-6 flex flex-col gap-5 shadow-[0_0_40px_rgba(0,0,0,0.9)] ${
          isVictory ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(0,240,255,0.3)]' : 'border-red-500/80'
        }`}
      >
        {/* Outcome Header */}
        <div className="flex flex-col items-center text-center gap-1">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-1 border-2 ${
              isVictory
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_20px_#00f0ff]'
                : 'bg-red-950/80 border-red-500 text-red-400 shadow-[0_0_20px_#ff3b3b]'
            }`}
          >
            {isVictory ? <Trophy size={32} /> : <Skull size={32} />}
          </div>

          <h2
            className={`font-cyber font-extrabold text-3xl sm:text-4xl tracking-widest ${
              isVictory ? 'text-cyan-300 neon-cyan-glow' : 'text-red-400'
            }`}
          >
            {isVictory ? 'ARENA CHAMPION' : 'ELIMINATED'}
          </h2>

          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            {isVictory
              ? 'YOU OUTLASTED ALL 5 OPPONENTS'
              : `WINNER: ${winner?.name || 'OPPONENT'}`}
          </p>
        </div>

        {/* Match Performance Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex flex-col items-center">
            <Target size={16} className="text-cyan-400 mb-1" />
            <span className="text-[9px] uppercase font-cyber text-slate-400">SCORE</span>
            <span className="font-cyber font-bold text-lg text-white tabular-nums">
              {playerStats.score}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex flex-col items-center">
            <Zap size={16} className="text-orange-400 mb-1" />
            <span className="text-[9px] uppercase font-cyber text-slate-400">BUMPERS</span>
            <span className="font-cyber font-bold text-lg text-white tabular-nums">
              {playerStats.bumpersHit}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex flex-col items-center">
            <Anchor size={16} className="text-cyan-400 mb-1" />
            <span className="text-[9px] uppercase font-cyber text-slate-400">GRAPPLES</span>
            <span className="font-cyber font-bold text-lg text-white tabular-nums">
              {playerStats.grapplesUsed}
            </span>
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex flex-col items-center">
            <Skull size={16} className="text-red-400 mb-1" />
            <span className="text-[9px] uppercase font-cyber text-slate-400">LIVES LEFT</span>
            <span className="font-cyber font-bold text-lg text-white tabular-nums">
              {playerStats.lives}/3
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5 mt-2">
          <button
            data-start="true"
            onClick={onRestart}
            className="py-3.5 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all cursor-pointer text-base"
          >
            <RotateCcw size={18} />
            PLAY AGAIN [SPACE / ENTER]
          </button>

          <button
            onClick={onHome}
            className="py-2.5 px-4 rounded cyber-panel border-slate-700 hover:border-slate-500 text-slate-300 font-cyber text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home size={16} />
            RETURN TO TITLE
          </button>
        </div>
      </div>
    </div>
  );
};
