import React, { useState } from 'react';
import { TouchControlSettings } from '../game/input.ts';
import { X, Sliders, Volume2, Smartphone, Globe } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';

interface SettingsModalProps {
  settings: TouchControlSettings;
  onUpdateSettings: (settings: Partial<TouchControlSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem('knockout_ws_url') || '');

  const handleSaveWsUrl = (val: string) => {
    setWsUrl(val);
    if (val.trim()) {
      localStorage.setItem('knockout_ws_url', val.trim());
    } else {
      localStorage.removeItem('knockout_ws_url');
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none text-white select-none">
      <div className="w-full max-w-md cyber-panel cyber-corner p-6 border-cyan-500/50 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-cyan-400" />
            <h2 className="font-cyber font-bold text-lg sm:text-xl tracking-wider text-white">
              CONTROL & AUDIO SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Close Settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Touch Controls Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-cyan-300 font-cyber text-xs uppercase tracking-wider">
            <Smartphone size={16} /> MOBILE TOUCH CONFIGURATION
          </div>

          {/* Joystick Scale Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>Joystick Size</span>
              <span>{Math.round(settings.joystickScale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={settings.joystickScale}
              onChange={(e) => onUpdateSettings({ joystickScale: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded cursor-pointer"
            />
          </div>

          {/* Button Scale Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>Action Buttons Size</span>
              <span>{Math.round(settings.buttonScale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={settings.buttonScale}
              onChange={(e) => onUpdateSettings({ buttonScale: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded cursor-pointer"
            />
          </div>

          {/* Control Opacity Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>Touch Controls Opacity</span>
              <span>{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={settings.opacity}
              onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-800 h-2 rounded cursor-pointer"
            />
          </div>

          {/* Aim Assist Toggle */}
          <div className="flex justify-between items-center py-1">
            <div className="flex flex-col">
              <span className="text-xs font-cyber text-slate-200">Aim Assistance</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Auto-aligns attack arc toward nearest opponent
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.aimAssist}
              onChange={(e) => onUpdateSettings({ aimAssist: e.target.checked })}
              className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
            />
          </div>

          {/* Vibration Feedback Toggle */}
          <div className="flex justify-between items-center py-1">
            <div className="flex flex-col">
              <span className="text-xs font-cyber text-slate-200">Vibration Feedback (Haptics)</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Haptic pulses on impacts, dashes and knockbacks
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.vibration}
              onChange={(e) => onUpdateSettings({ vibration: e.target.checked })}
              className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Audio Section */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-cyan-300 font-cyber text-xs uppercase tracking-wider">
            <Volume2 size={16} /> SOUND SYNTHESIS
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-cyber text-slate-200">Test Sound FX</span>
            <button
              onClick={() => soundEngine.playKnockbackHit(true)}
              className="py-1 px-3 rounded cyber-panel text-cyan-400 text-xs font-cyber hover:border-cyan-400"
            >
              TEST KNOCKBACK
            </button>
          </div>
        </div>

        {/* Multiplayer Server Section (GitHub Pages / Custom Server) */}
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-cyan-300 font-cyber text-xs uppercase tracking-wider">
            <Globe size={16} /> MULTIPLAYER SERVER (OPTIONAL)
          </div>
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
            Leave blank for default. On static hosts like GitHub Pages, Solo Battle works offline 100%. To play online rooms, provide an external WebSocket backend URL (e.g., <span className="text-cyan-400">wss://knockout-server.onrender.com/ws</span>).
          </p>
          <input
            type="text"
            placeholder="wss://your-backend.com/ws"
            value={wsUrl}
            onChange={(e) => handleSaveWsUrl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded px-3 py-1.5 text-xs font-mono text-cyan-200 outline-none"
          />
        </div>

        {/* Done CTA */}
        <button
          onClick={onClose}
          className="mt-2 py-3 px-4 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold tracking-wider cursor-pointer"
        >
          CONFIRM & RETURN
        </button>
      </div>
    </div>
  );
};
