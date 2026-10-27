import React from 'react';
import { User, Users, Globe, HelpCircle, Settings, Swords } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';

interface MainMenuProps {
  onSelectSolo: () => void;
  onSelectFriends: () => void;
  onSelectQuickMatch: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onSelectSolo,
  onSelectFriends,
  onSelectQuickMatch,
  onOpenHowToPlay,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-[#06080d]/95 text-white select-none overflow-y-auto">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-cyan-500/20 pb-4 max-w-7xl mx-auto w-full">
        {/* Logo Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <Swords size={22} className="text-cyan-300" />
          </div>
          <div>
            <h1 className="font-cyber font-extrabold text-2xl sm:text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-300 to-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">
              KNOCKOUT ARENA
            </h1>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 font-cyber text-xs">
          <button className="px-5 py-1.5 rounded bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.5)]">
            PLAY
          </button>
          <button
            onClick={onOpenHowToPlay}
            className="px-5 py-1.5 rounded text-slate-400 hover:text-white transition-colors"
          >
            HOW TO PLAY
          </button>
          <button
            onClick={onOpenSettings}
            className="px-5 py-1.5 rounded text-slate-400 hover:text-white transition-colors"
          >
            SETTINGS
          </button>
        </nav>

        {/* Right Profile Avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="cyber-panel px-3 py-1.5 rounded flex items-center gap-2 border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-900 border border-cyan-400 flex items-center justify-center">
              <User size={14} className="text-cyan-300" />
            </div>
            <span className="text-xs font-cyber font-bold tracking-wider hidden sm:inline">PILOT</span>
          </button>
        </div>
      </header>

      {/* Main Mode Selection Cards (Screen 1 in Reference) */}
      <main className="relative z-10 max-w-7xl mx-auto w-full my-auto py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Card 1: SOLO BATTLE */}
          <div className="cyber-panel cyber-corner p-6 sm:p-7 flex flex-col justify-between border-cyan-500/40 hover:border-cyan-400 transition-all group bg-gradient-to-b from-[#0a1120]/90 to-[#070b14]/95 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-400/60 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <User size={24} />
              </div>
              <h2 className="font-cyber font-bold text-2xl tracking-wider text-white group-hover:text-cyan-300 transition-colors">
                SOLO BATTLE
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-400 leading-relaxed">
                Fight against customizable AI opponents offline. Perfect for training and solo domination.
              </p>
            </div>

            <button
              onClick={() => {
                soundEngine.playKnockbackHit(false);
                onSelectSolo();
              }}
              className="mt-6 py-3 px-6 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-cyber font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.7)] transition-all cursor-pointer text-center"
            >
              PLAY SOLO
            </button>
          </div>

          {/* Card 2: PLAY WITH FRIENDS */}
          <div className="cyber-panel cyber-corner p-6 sm:p-7 flex flex-col justify-between border-purple-500/40 hover:border-purple-400 transition-all group bg-gradient-to-b from-[#140b24]/90 to-[#070b14]/95 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-950 border border-purple-400/60 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(192,132,252,0.3)]">
                <Users size={24} />
              </div>
              <h2 className="font-cyber font-bold text-2xl tracking-wider text-white group-hover:text-purple-300 transition-colors">
                PLAY WITH FRIENDS
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-400 leading-relaxed">
                Create or join a private room with a code. Mix human friends and AI bots up to 6 combatants.
              </p>
            </div>

            <button
              onClick={() => {
                soundEngine.playKnockbackHit(false);
                onSelectFriends();
              }}
              className="mt-6 py-3 px-6 rounded bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-cyber font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(192,132,252,0.4)] group-hover:shadow-[0_0_25px_rgba(192,132,252,0.7)] transition-all cursor-pointer text-center"
            >
              CREATE / JOIN ROOM
            </button>
          </div>

          {/* Card 3: ONLINE QUICK MATCH */}
          <div className="cyber-panel cyber-corner p-6 sm:p-7 flex flex-col justify-between border-emerald-500/40 hover:border-emerald-400 transition-all group bg-gradient-to-b from-[#0b1e17]/90 to-[#070b14]/95 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-400/60 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                <Globe size={24} />
              </div>
              <h2 className="font-cyber font-bold text-2xl tracking-wider text-white group-hover:text-emerald-300 transition-colors">
                ONLINE QUICK MATCH
              </h2>
              <p className="text-xs sm:text-sm font-mono text-slate-400 leading-relaxed">
                Jump straight into public multiplayer matchmaking. Fast lobby joining with instant combat.
              </p>
            </div>

            <button
              onClick={() => {
                soundEngine.playKnockbackHit(false);
                onSelectQuickMatch();
              }}
              className="mt-6 py-3 px-6 rounded bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-cyber font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(52,211,153,0.4)] group-hover:shadow-[0_0_25px_rgba(52,211,153,0.7)] transition-all cursor-pointer text-center"
            >
              FIND MATCH
            </button>
          </div>
        </div>

        {/* Secondary Utility Row (Matching image Screen 1 bottom) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <button
            onClick={onOpenHowToPlay}
            className="cyber-panel p-3.5 rounded flex items-center gap-3 border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400">
              <HelpCircle size={18} />
            </div>
            <div>
              <div className="text-xs font-cyber font-bold text-slate-200">HOW TO PLAY</div>
              <div className="text-[11px] font-mono text-slate-400">Learn the combat controls, bumpers, and hazards.</div>
            </div>
          </button>

          <button
            onClick={onOpenSettings}
            className="cyber-panel p-3.5 rounded flex items-center gap-3 border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Settings size={18} />
            </div>
            <div>
              <div className="text-xs font-cyber font-bold text-slate-200">SETTINGS</div>
              <div className="text-[11px] font-mono text-slate-400">Adjust touch controls, audio synthesis, and haptics.</div>
            </div>
          </button>
        </div>
      </main>

      {/* Footer Tagline */}
      <footer className="relative z-10 text-center py-2 border-t border-slate-800/80 max-w-7xl mx-auto w-full">
        <p className="text-[11px] font-cyber tracking-[0.4em] uppercase text-slate-500 font-semibold">
          BATTLE · GRAPPLE · DASH · SURVIVE
        </p>
      </footer>
    </div>
  );
};
