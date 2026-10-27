import React, { useState } from 'react';
import {
  Copy,
  Check,
  Crown,
  User,
  Bot,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  ArrowLeft,
  Share2,
  ShieldAlert,
} from 'lucide-react';
import {
  RoomState,
  CharacterArchetype,
  CHARACTER_PROFILES,
  AIDifficulty,
  GameMode,
} from '../game/multiplayerTypes.ts';
import { multiplayerClient } from '../game/multiplayerClient.ts';
import { soundEngine } from '../game/audio.ts';

interface MultiplayerLobbyProps {
  room: RoomState;
  onLeave: () => void;
  onStartMatch: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  room,
  onLeave,
  onStartMatch,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === multiplayerClient.playerId;
  const mySlot = room.slots.find((s) => s.playerId === multiplayerClient.playerId);
  const myChar = mySlot?.character || 'tracer';
  const isReady = mySlot?.isReady || false;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?room=${room.code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReady = () => {
    soundEngine.playKnockbackHit(false);
    multiplayerClient.setReady(!isReady);
  };

  const selectCharacter = (char: CharacterArchetype) => {
    soundEngine.playKnockbackHit(false);
    multiplayerClient.updateCharacter(char);
  };

  // Host settings handlers
  const updateSetting = (key: string, val: any) => {
    if (!isHost) return;
    multiplayerClient.updateSettings({ [key]: val });
  };

  const cycleMode = () => {
    const next: GameMode = room.settings.mode === 'ffa' ? 'team' : 'ffa';
    updateSetting('mode', next);
  };

  const cycleDifficulty = (dir: 1 | -1) => {
    const diffs: AIDifficulty[] = ['easy', 'normal', 'hard', 'extreme'];
    const idx = diffs.indexOf(room.settings.difficulty);
    const next = (idx + dir + diffs.length) % diffs.length;
    updateSetting('difficulty', diffs[next]);
  };

  const cycleDuration = (dir: 1 | -1) => {
    const durations = [60, 120, 180, 300];
    const idx = durations.indexOf(room.settings.matchDuration);
    const next = (idx + dir + durations.length) % durations.length;
    updateSetting('matchDuration', durations[next]);
  };

  const cycleLives = (dir: 1 | -1) => {
    const next = Math.max(1, Math.min(5, room.settings.startingLives + dir));
    updateSetting('startingLives', next);
  };

  const cycleAiCount = (dir: 1 | -1) => {
    const humans = room.slots.filter((s) => s.type === 'human').length;
    const maxAi = 6 - humans;
    const next = Math.max(0, Math.min(maxAi, room.settings.aiCount + dir));
    updateSetting('aiCount', next);

    if (dir > 0) {
      multiplayerClient.addAi();
    } else {
      const lastAiSlot = room.slots.slice().reverse().find((s) => s.type === 'ai');
      if (lastAiSlot) {
        multiplayerClient.removeAi(lastAiSlot.index);
      }
    }
  };

  const humans = room.slots.filter((s) => s.type === 'human' && s.isConnected);
  const allHumansReady = humans.every((h) => h.isReady);

  const activeProfile = CHARACTER_PROFILES[myChar];
  const archetypes: CharacterArchetype[] = ['vanguard', 'tracer', 'hookshot', 'aegis', 'vortex', 'solar'];

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-6 bg-[#06080d]/95 text-white select-none overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="cyber-panel px-3 py-1.5 rounded flex items-center gap-1.5 border-slate-700 hover:border-red-400 text-slate-300 hover:text-white transition-all text-xs font-cyber cursor-pointer"
          >
            <ArrowLeft size={14} /> LEAVE LOBBY
          </button>
          <div className="flex items-center gap-2">
            <span className="font-cyber font-bold text-lg sm:text-xl text-white tracking-wider">
              {room.settings.isPrivate ? 'PRIVATE ROOM' : 'PUBLIC ARENA'}
            </span>
            <div className="cyber-panel px-2.5 py-1 rounded flex items-center gap-2 border-cyan-500/40">
              <span className="text-[10px] font-mono text-slate-400">ROOM CODE:</span>
              <span className="font-mono font-bold text-cyan-300 text-sm tracking-wider">
                {room.code}
              </span>
              <button
                onClick={copyCode}
                className="text-cyan-400 hover:text-white transition-colors"
                title="Copy Room Code"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={copyLink}
          className="cyber-panel px-3 py-1.5 rounded flex items-center gap-1.5 border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-cyber cursor-pointer"
        >
          <Share2 size={14} /> INVITE FRIENDS
        </button>
      </div>

      {/* Main 3-Column Layout (Matching Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-7xl mx-auto w-full my-auto py-4">
        {/* COLUMN 1: 6/6 PLAYERS LOBBY SLOTS */}
        <div className="cyber-panel cyber-corner p-4 sm:p-5 border-cyan-500/40 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20 mb-3">
              <span className="font-cyber font-bold text-xs sm:text-sm tracking-wider text-cyan-300">
                {room.slots.filter((s) => s.type !== 'empty').length}/6 COMBATANTS
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {room.settings.mode === 'team' ? 'TEAM BATTLE' : 'FREE-FOR-ALL'}
              </span>
            </div>

            {/* 6 Slots List */}
            <div className="flex flex-col gap-2">
              {room.slots.map((slot) => {
                const isMe = slot.playerId === multiplayerClient.playerId;
                return (
                  <div
                    key={slot.index}
                    className={`cyber-panel p-2.5 rounded flex items-center justify-between border transition-all ${
                      slot.type === 'empty'
                        ? 'border-slate-800/80 bg-slate-950/40 opacity-60'
                        : isMe
                        ? 'border-cyan-400/80 bg-cyan-950/30'
                        : 'border-slate-700/80 bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-mono text-slate-500 font-bold w-3">
                        {slot.index + 1}
                      </span>

                      {/* Icon Avatar */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-white/60"
                        style={{ backgroundColor: slot.color, color: '#000000' }}
                      >
                        {slot.isHost ? (
                          <Crown size={14} className="text-amber-300 fill-amber-300" />
                        ) : slot.type === 'human' ? (
                          <User size={14} />
                        ) : slot.type === 'ai' ? (
                          <Bot size={14} />
                        ) : (
                          <Plus size={14} className="text-slate-600" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-cyber text-xs truncate font-bold ${
                              isMe ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            {slot.type === 'empty' ? 'Empty Slot' : isMe ? `${slot.name} (You)` : slot.name}
                          </span>
                          {slot.isHost && (
                            <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded font-mono">
                              HOST
                            </span>
                          )}
                        </div>

                        {slot.type !== 'empty' && (
                          <span className="text-[9px] font-mono text-slate-400 capitalize">
                            {slot.character} {slot.personality ? `· ${slot.personality}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge / Host Controls */}
                    <div className="flex items-center gap-2">
                      {slot.type === 'human' ? (
                        <span
                          className={`text-[9px] font-cyber px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            slot.isReady
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {slot.isReady ? 'READY' : 'WAITING'}
                        </span>
                      ) : slot.type === 'ai' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-cyber px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                            AI BOT
                          </span>
                          {isHost && (
                            <button
                              onClick={() => multiplayerClient.removeAi(slot.index)}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1"
                              title="Remove AI Bot"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        isHost && (
                          <button
                            onClick={() => multiplayerClient.addAi()}
                            className="text-[9px] font-cyber px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={11} /> ADD AI
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 1 Footer CTA: Ready Button for Non-Host */}
          {!isHost && (
            <button
              onClick={toggleReady}
              className={`mt-4 py-3 px-4 rounded font-cyber font-bold tracking-wider text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isReady
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
              }`}
            >
              <Check size={18} />
              {isReady ? 'YOU ARE READY (CLICK TO UNREADY)' : 'MARK AS READY'}
            </button>
          )}
        </div>

        {/* COLUMN 2: MATCH SETTINGS (Host controls) */}
        <div className="cyber-panel cyber-corner p-4 sm:p-5 border-cyan-500/40 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20 mb-3">
              <span className="font-cyber font-bold text-xs sm:text-sm tracking-wider text-cyan-300">
                MATCH SETTINGS
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {isHost ? 'HOST CONFIGURABLE' : 'HOST CONTROLLED'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 font-mono text-xs">
              {/* Game Mode */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">Game Mode</span>
                <div className="flex items-center gap-2">
                  {isHost && (
                    <button onClick={cycleMode} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronLeft size={15} />
                    </button>
                  )}
                  <span className="font-bold text-white text-[11px] w-24 text-center">
                    {room.settings.mode === 'ffa' ? 'Free-for-All' : 'Team Battle'}
                  </span>
                  {isHost && (
                    <button onClick={cycleMode} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Human Players */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">Human Players</span>
                <span className="font-bold text-cyan-300 tabular-nums">
                  {room.slots.filter((s) => s.type === 'human').length} Connected
                </span>
              </div>

              {/* AI Opponents */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">AI Opponents</span>
                <div className="flex items-center gap-2">
                  {isHost && (
                    <button onClick={() => cycleAiCount(-1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronLeft size={15} />
                    </button>
                  )}
                  <span className="font-bold text-white tabular-nums w-12 text-center">
                    {room.settings.aiCount}
                  </span>
                  {isHost && (
                    <button onClick={() => cycleAiCount(1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* AI Difficulty */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">AI Difficulty</span>
                <div className="flex items-center gap-2">
                  {isHost && (
                    <button onClick={() => cycleDifficulty(-1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronLeft size={15} />
                    </button>
                  )}
                  <span className="font-bold text-cyan-300 uppercase w-20 text-center text-[11px]">
                    {room.settings.difficulty}
                  </span>
                  {isHost && (
                    <button onClick={() => cycleDifficulty(1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Match Duration */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">Match Duration</span>
                <div className="flex items-center gap-2">
                  {isHost && (
                    <button onClick={() => cycleDuration(-1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronLeft size={15} />
                    </button>
                  )}
                  <span className="font-bold text-white w-20 text-center text-[11px]">
                    {Math.round(room.settings.matchDuration / 60)} Minutes
                  </span>
                  {isHost && (
                    <button onClick={() => cycleDuration(1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Starting Lives */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">Starting Lives</span>
                <div className="flex items-center gap-2">
                  {isHost && (
                    <button onClick={() => cycleLives(-1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronLeft size={15} />
                    </button>
                  )}
                  <span className="font-bold text-white tabular-nums w-12 text-center text-[11px]">
                    {room.settings.startingLives}
                  </span>
                  {isHost && (
                    <button onClick={() => cycleLives(1)} className="p-0.5 text-cyan-400 hover:text-white">
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Arena */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-300 font-cyber">Arena</span>
                <span className="font-bold text-cyan-400 font-cyber text-[11px]">The Core</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: CHARACTER SELECT & START CTA */}
        <div className="cyber-panel cyber-corner p-4 sm:p-5 border-cyan-500/40 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-cyan-500/20 mb-3">
              <span className="font-cyber font-bold text-xs sm:text-sm tracking-wider text-cyan-300">
                CHARACTER SELECT
              </span>
              <span className="text-[10px] font-mono text-slate-400">PICK YOUR COMBATANT</span>
            </div>

            {/* Archetype Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {archetypes.map((arch) => {
                const prof = CHARACTER_PROFILES[arch];
                const isSelected = myChar === arch;
                return (
                  <button
                    key={arch}
                    onClick={() => selectCharacter(arch)}
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
                    <span className="text-[9px] font-cyber font-bold text-slate-200">
                      {prof.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Profile Detail Box */}
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-cyber font-bold text-sm text-white">
                  {activeProfile.name}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                  {activeProfile.perk}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 leading-tight">
                {activeProfile.description}
              </p>

              {/* Stats Bars */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[9px] font-cyber text-slate-400">
                <div>
                  <div className="flex justify-between"><span>PWR</span><span>{activeProfile.power}/5</span></div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                    <div className="h-full bg-red-500" style={{ width: `${(activeProfile.power / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between"><span>SPD</span><span>{activeProfile.speed}/5</span></div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                    <div className="h-full bg-cyan-400" style={{ width: `${(activeProfile.speed / 5) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between"><span>GRP</span><span>{activeProfile.grapple}/5</span></div>
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mt-0.5">
                    <div className="h-full bg-emerald-400" style={{ width: `${(activeProfile.grapple / 5) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* START MATCH CTA BUTTON (Matching prominent golden CTA in image 2) */}
          <div className="mt-4 flex flex-col gap-2">
            {isHost ? (
              <button
                onClick={onStartMatch}
                disabled={!allHumansReady}
                className={`w-full py-4 px-6 rounded font-cyber font-extrabold text-base tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,160,0,0.5)] transition-all cursor-pointer ${
                  allHumansReady
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-black transform hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                <Play size={20} className="fill-current" />
                START MATCH
              </button>
            ) : (
              <div className="text-center text-xs font-mono text-slate-400 py-2">
                Waiting for host to launch the match...
              </div>
            )}

            {isHost && !allHumansReady && (
              <div className="text-[10px] font-mono text-amber-400 text-center flex items-center justify-center gap-1">
                <ShieldAlert size={12} /> Waiting for all players to mark Ready
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
