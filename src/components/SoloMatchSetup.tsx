import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, ArrowLeft, Shield, Zap, Sparkles } from 'lucide-react';
import {
  CharacterArchetype,
  CHARACTER_PROFILES,
  AIDifficulty,
} from '../game/multiplayerTypes.ts';
import { soundEngine } from '../game/audio.ts';

export interface SoloMatchConfig {
  character: CharacterArchetype;
  aiCount: number;
  difficulty: AIDifficulty;
  durationSeconds: number;
  lives: number;
  arena: string;
}

interface SoloMatchSetupProps {
  onStartMatch: (config: SoloMatchConfig) => void;
  onBack: () => void;
}

export const SoloMatchSetup: React.FC<SoloMatchSetupProps> = ({ onStartMatch, onBack }) => {
  const [selectedChar, setSelectedChar] = useState<CharacterArchetype>('tracer');
  const [aiCount, setAiCount] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [duration, setDuration] = useState<number>(180);
  const [lives, setLives] = useState<number>(3);

  const difficulties: AIDifficulty[] = ['easy', 'normal', 'hard', 'extreme'];
  const durations = [
    { label: '1 Minute', sec: 60 },
    { label: '2 Minutes', sec: 120 },
    { label: '3 Minutes', sec: 180 },
    { label: '5 Minutes', sec: 300 },
  ];

  const archetypes: CharacterArchetype[] = ['vanguard', 'tracer', 'hookshot', 'aegis', 'vortex', 'solar'];

  const cycleDifficulty = (dir: 1 | -1) => {
    const idx = difficulties.indexOf(difficulty);
    const next = (idx + dir + difficulties.length) % difficulties.length;
    setDifficulty(difficulties[next]);
  };

  const cycleDuration = (dir: 1 | -1) => {
    const currentIdx = durations.findIndex((d) => d.sec === duration);
    const next = (currentIdx + dir + durations.length) % durations.length;
    setDuration(durations[next].sec);
  };

  const cycleLives = (dir: 1 | -1) => {
    setLives((prev) => Math.max(1, Math.min(5, prev + dir)));
  };

  const cycleAiCount = (dir: 1 | -1) => {
    setAiCount((prev) => Math.max(0, Math.min(5, prev + dir)));
  };

  const handleStart = () => {
    soundEngine.playKnockbackHit(false);
    onStartMatch({
      character: selectedChar,
      aiCount,
      difficulty,
      durationSeconds: duration,
      lives,
      arena: 'The Core',
    });
  };

  const activeProfile = CHARACTER_PROFILES[selectedChar];

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-6 bg-[#06080d]/95 text-white select-none overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 max-w-6xl mx-auto w-full">
        <button
          onClick={onBack}
          className="cyber-panel px-3 py-1.5 rounded flex items-center gap-2 border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all text-xs font-cyber cursor-pointer"
        >
          <ArrowLeft size={16} /> BACK
        </button>

        <div className="text-center">
          <h2 className="font-cyber font-bold text-xl sm:text-2xl tracking-wider text-cyan-300">
            SOLO BATTLE SETUP
          </h2>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            OFFLINE CUSTOM COMBAT MATCH
          </span>
        </div>

        <div className="w-16" />
      </div>

      {/* Main Grid: Match Settings (Left) & Character Select (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto w-full my-auto py-4">
        {/* MATCH SETTINGS CARD */}
        <div className="cyber-panel cyber-corner p-5 sm:p-6 border-cyan-500/40 flex flex-col gap-4">
          <h3 className="font-cyber font-bold text-base tracking-wider text-cyan-300 pb-2 border-b border-cyan-500/20 flex items-center gap-2">
            <Zap size={18} /> MATCH RULES & AI SETUP
          </h3>

          <div className="flex flex-col gap-3 font-mono text-xs">
            {/* AI Opponents Count */}
            <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-300 font-cyber">AI Opponents</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cycleAiCount(-1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-white w-14 text-center tabular-nums">
                  {aiCount} {aiCount === 1 ? 'Bot' : 'Bots'}
                </span>
                <button
                  onClick={() => cycleAiCount(1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* AI Difficulty */}
            <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-300 font-cyber">AI Difficulty</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cycleDifficulty(-1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-cyan-300 uppercase w-20 text-center">
                  {difficulty}
                </span>
                <button
                  onClick={() => cycleDifficulty(1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Match Duration */}
            <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-300 font-cyber">Match Duration</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cycleDuration(-1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-white w-24 text-center">
                  {durations.find((d) => d.sec === duration)?.label}
                </span>
                <button
                  onClick={() => cycleDuration(1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Starting Lives */}
            <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-300 font-cyber">Starting Lives</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cycleLives(-1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-white w-14 text-center tabular-nums">
                  {lives} {lives === 1 ? 'Life' : 'Lives'}
                </span>
                <button
                  onClick={() => cycleLives(1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Arena Selection */}
            <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-300 font-cyber">Arena</span>
              <span className="font-bold text-cyan-400 font-cyber">The Core (Octagon)</span>
            </div>
          </div>
        </div>

        {/* CHARACTER SELECT CARD */}
        <div className="cyber-panel cyber-corner p-5 sm:p-6 border-cyan-500/40 flex flex-col justify-between">
          <div>
            <h3 className="font-cyber font-bold text-base tracking-wider text-cyan-300 pb-2 border-b border-cyan-500/20 flex items-center gap-2">
              <Shield size={18} /> SELECT COMBATANT ARCHETYPE
            </h3>

            {/* Archetype Chips */}
            <div className="grid grid-cols-3 gap-2 my-3">
              {archetypes.map((arch) => {
                const prof = CHARACTER_PROFILES[arch];
                const isSelected = selectedChar === arch;
                return (
                  <button
                    key={arch}
                    onClick={() => setSelectedChar(arch)}
                    className={`cyber-panel p-2 rounded flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-300 ring-2 ring-cyan-400/50 bg-cyan-950/40 scale-105'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full border border-white/80 flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: prof.color, color: '#000000' }}
                    >
                      {prof.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-cyber font-bold text-slate-200">
                      {prof.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Profile Detail Box */}
            <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-cyber font-bold text-sm text-white">
                  {activeProfile.name}
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                  {activeProfile.perk}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {activeProfile.description}
              </p>

              {/* Stats Bars */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-cyber text-slate-400">
                <div>
                  <div className="flex justify-between"><span>POWER</span><span>{activeProfile.power}/5</span></div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                    <div className="h-full bg-red-500" style={{ width: `${(activeProfile.power / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between"><span>SPEED</span><span>{activeProfile.speed}/5</span></div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                    <div className="h-full bg-cyan-400" style={{ width: `${(activeProfile.speed / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between"><span>GRAPPLE</span><span>{activeProfile.grapple}/5</span></div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                    <div className="h-full bg-emerald-400" style={{ width: `${(activeProfile.grapple / 5) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* START MATCH CTA */}
          <button
            onClick={handleStart}
            className="mt-5 py-4 px-6 rounded bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-black font-cyber font-extrabold text-base tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,160,0,0.5)] cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play size={20} className="fill-current" />
            START MATCH
          </button>
        </div>
      </div>
    </div>
  );
};
