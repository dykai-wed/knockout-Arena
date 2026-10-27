import React, { useState } from 'react';
import { X, Plus, LogIn, ArrowLeft } from 'lucide-react';
import { CharacterArchetype } from '../game/multiplayerTypes.ts';

interface JoinRoomModalProps {
  onCreateRoom: (name: string, character: CharacterArchetype) => void;
  onJoinRoom: (code: string, name: string, character: CharacterArchetype) => void;
  onClose: () => void;
  initialCode?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  onCreateRoom,
  onJoinRoom,
  onClose,
  initialCode = '',
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialCode ? 'join' : 'create');
  const [name, setName] = useState('Pilot');
  const [code, setCode] = useState(initialCode);
  const [character, setCharacter] = useState<CharacterArchetype>('tracer');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(name.trim() || 'Pilot', character);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoinRoom(code.trim().toUpperCase(), name.trim() || 'Pilot', character);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none text-white select-none">
      <div className="w-full max-w-md cyber-panel cyber-corner p-6 border-cyan-500/50 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
          <h2 className="font-cyber font-bold text-xl tracking-wider text-white">
            PLAY WITH FRIENDS
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded border border-slate-800 font-cyber text-xs">
          <button
            onClick={() => setTab('create')}
            className={`py-2 rounded font-bold transition-all ${
              tab === 'create'
                ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(192,132,252,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setTab('join')}
            className={`py-2 rounded font-bold transition-all ${
              tab === 'join'
                ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            JOIN ROOM
          </button>
        </div>

        {/* Player Name Input */}
        <div className="flex flex-col gap-1.5 font-mono text-xs">
          <label className="text-slate-300 font-cyber">YOUR PILOT CALLSIGN</label>
          <input
            type="text"
            maxLength={12}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 rounded bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white font-mono outline-none"
            placeholder="Enter name"
          />
        </div>

        {/* Create Room Form */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <p className="text-xs font-mono text-slate-400">
              Host a new private match room. You will receive a unique room code and shareable invitation link for your friends.
            </p>

            <button
              type="submit"
              className="py-3.5 px-4 rounded bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-cyber font-bold tracking-wider text-sm shadow-[0_0_20px_rgba(192,132,252,0.5)] cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus size={18} /> CREATE PRIVATE ROOM
            </button>
          </form>
        )}

        {/* Join Room Form */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <label className="text-slate-300 font-cyber">ROOM CODE (5 CHARACTERS)</label>
              <input
                type="text"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full p-3 rounded bg-slate-950 border border-cyan-500/60 focus:border-cyan-400 text-cyan-300 font-mono font-bold text-center tracking-[0.3em] text-lg uppercase outline-none"
                placeholder="7F3K9"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!code.trim()}
              className="py-3.5 px-4 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-cyber font-bold tracking-wider text-sm shadow-[0_0_20px_rgba(0,240,255,0.5)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={18} /> ENTER ROOM
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
