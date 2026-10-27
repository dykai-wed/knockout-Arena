import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Sliders } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  onOpenSettings,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none text-white select-none">
      <div className="w-full max-w-sm cyber-panel cyber-corner p-6 border-cyan-500/50 flex flex-col gap-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        {/* Title */}
        <div className="text-center pb-2 border-b border-cyan-500/30">
          <h2 className="font-cyber font-bold text-2xl tracking-widest text-cyan-400">
            ARENA PAUSED
          </h2>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            SIMULATION SUSPENDED
          </span>
        </div>

        {/* Buttons List */}
        <div className="flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={onResume}
            className="py-3 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
          >
            <Play size={18} className="fill-current" />
            RESUME COMBAT [ESC]
          </button>

          <button
            onClick={onRestart}
            className="py-2.5 px-4 rounded cyber-panel border-cyan-500/40 hover:border-cyan-300 text-cyan-300 font-cyber font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw size={16} />
            RESTART MATCH
          </button>

          <button
            onClick={onOpenSettings}
            className="py-2.5 px-4 rounded cyber-panel border-cyan-500/40 hover:border-cyan-300 text-cyan-300 font-cyber font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sliders size={16} />
            TOUCH & CONTROLS SETTINGS
          </button>

          <button
            onClick={onToggleMute}
            className="py-2.5 px-4 rounded cyber-panel border-slate-700 hover:border-slate-500 text-slate-300 font-cyber text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
          </button>

          <button
            onClick={onHome}
            className="py-2.5 px-4 rounded cyber-panel border-red-500/30 hover:border-red-400 text-red-400 font-cyber text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
          >
            <Home size={16} />
            ABANDON TO TITLE
          </button>
        </div>
      </div>
    </div>
  );
};
