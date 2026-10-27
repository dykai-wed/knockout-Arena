import React from 'react';
import { X, Navigation, Anchor, Zap, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none text-white select-none">
      <div className="w-full max-w-2xl cyber-panel cyber-corner p-6 border-cyan-500/50 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <HelpCircle size={22} className="text-cyan-400" />
            <h2 className="font-cyber font-bold text-xl tracking-wider text-white">
              HOW TO PLAY KNOCKOUT ARENA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Sections */}
        <div className="flex flex-col gap-4 text-xs font-mono">
          {/* Objective */}
          <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex flex-col gap-1">
            <span className="font-cyber font-bold text-cyan-300 text-sm">MISSION OBJECTIVE</span>
            <p className="text-slate-300 leading-relaxed">
              Knock your opponents off the floating cybernetic arena platform into the molten void! Each combatant begins with 3 lives. The last surviving pilot or team wins the match.
            </p>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Desktop Controls */}
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex flex-col gap-1.5">
              <span className="font-cyber font-bold text-cyan-400 text-xs uppercase tracking-wider">
                DESKTOP CONTROLS
              </span>
              <div className="flex justify-between text-slate-300"><span>Move</span><span className="text-white font-bold">WASD / Arrows</span></div>
              <div className="flex justify-between text-slate-300"><span>Aim</span><span className="text-white font-bold">Mouse Cursor</span></div>
              <div className="flex justify-between text-slate-300"><span>Knockback Strike</span><span className="text-white font-bold">Left Mouse Button</span></div>
              <div className="flex justify-between text-slate-300"><span>Grapple Tether</span><span className="text-white font-bold">Spacebar</span></div>
              <div className="flex justify-between text-slate-300"><span>Dash Burst</span><span className="text-white font-bold">Shift</span></div>
              <div className="flex justify-between text-slate-300"><span>Tactical Ability</span><span className="text-white font-bold">E</span></div>
              <div className="flex justify-between text-slate-300"><span>Pause</span><span className="text-white font-bold">Esc / P</span></div>
            </div>

            {/* Mobile Controls */}
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex flex-col gap-1.5">
              <span className="font-cyber font-bold text-cyan-400 text-xs uppercase tracking-wider">
                MOBILE TOUCH CONTROLS
              </span>
              <p className="text-slate-300 leading-relaxed">
                <b>Left Side</b>: Virtual Analog Joystick for smooth 8-way directional movement.<br />
                <b>Right Side</b>: Large prominent Knockback Attack button, Dash button, Grapple button, and Tactical ability button. Supports simultaneous multi-touch.
              </p>
            </div>
          </div>

          {/* Key Arena Hazards & Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-cyber font-bold">
                <Zap size={14} /> BUMPERS
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                High-rebound mechanical pads that launch combatants at extreme velocities on impact.
              </p>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-cyber font-bold">
                <Anchor size={14} /> GRAPPLE ANCHORS
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Attach laser cables to swing across gaps or pull yourself back from the edge.
              </p>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-purple-400 font-cyber font-bold">
                <Sparkles size={14} /> GRAVITY WELL
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Swirling purple vortex that drags nearby combatants inward. Beware of the pull!
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-2 py-3 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold tracking-wider cursor-pointer"
        >
          GOT IT, RETURN TO MENU
        </button>
      </div>
    </div>
  );
};
