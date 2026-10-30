import React, { useState, useEffect } from 'react';
import { TouchControlSettings, KeyBindings, DEFAULT_KEYBINDINGS, inputManager } from '../game/input.ts';
import { X, Sliders, Volume2, Smartphone, Globe, Keyboard, Sparkles, Check, RotateCcw, Crosshair, EyeOff, Vibrate } from 'lucide-react';
import { soundEngine } from '../game/audio.ts';
import { AimAssistLevel } from '../game/rules.ts';

interface SettingsModalProps {
  settings: TouchControlSettings;
  onUpdateSettings: (settings: Partial<TouchControlSettings>) => void;
  onClose: () => void;
  onOpenEditLayout?: () => void;
}

type SettingsTab = 'controls' | 'mobile' | 'audio_access' | 'server';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onOpenEditLayout,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('controls');
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem('knockout_ws_url') || '');
  const [rebindingKey, setRebindingKey] = useState<keyof KeyBindings | null>(null);

  const keybindings = settings.keybindings || DEFAULT_KEYBINDINGS;

  const handleSaveWsUrl = (val: string) => {
    setWsUrl(val);
    if (val.trim()) {
      localStorage.setItem('knockout_ws_url', val.trim());
    } else {
      localStorage.removeItem('knockout_ws_url');
    }
  };

  // Keyboard remapping listener
  useEffect(() => {
    if (!rebindingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't bind Escape as it is used to cancel binding or pause
      if (e.code === 'Escape' && rebindingKey !== 'pause') {
        setRebindingKey(null);
        return;
      }

      onUpdateSettings({
        keybindings: {
          ...keybindings,
          [rebindingKey]: e.code,
        },
      });

      setRebindingKey(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [rebindingKey, keybindings, onUpdateSettings]);

  const formatKeyName = (code: string) => {
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
    if (code === 'Space') return 'SPACE';
    if (code === 'Escape') return 'ESC';
    if (code === 'LMB') return 'LEFT CLICK';
    if (code === 'RMB') return 'RIGHT CLICK';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  };

  const handleResetDefaults = () => {
    const defaults = inputManager.resetToDefaults();
    onUpdateSettings(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-none text-white select-none">
      <div className="w-full max-w-xl cyber-panel cyber-corner p-4 sm:p-6 border-cyan-500/60 flex flex-col gap-4 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-cyan-400" />
            <h2 className="font-cyber font-bold text-lg sm:text-xl tracking-wider text-white">
              SYSTEM & CONTROL SETTINGS
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

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 text-xs font-cyber">
          <button
            onClick={() => setActiveTab('controls')}
            className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'controls' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Keyboard size={13} />
            <span className="hidden sm:inline">DESKTOP</span> CONTROLS
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'mobile' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            MOBILE
          </button>

          <button
            onClick={() => setActiveTab('audio_access')}
            className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'audio_access' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Volume2 size={13} />
            AUDIO & FX
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'server' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe size={13} />
            NETWORK
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto pr-1 flex flex-col gap-4 text-xs font-sans max-h-[58vh]">
          {/* TAB 1: DESKTOP CONTROLS & AIM ASSIST */}
          {activeTab === 'controls' && (
            <div className="flex flex-col gap-4">
              {/* Aim Assistance Config */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-cyan-300 font-cyber font-bold tracking-wider">
                  <Crosshair size={15} /> AIM ASSISTANCE
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Subtly guides aim toward nearby combatants in front of you. Never attacks automatically.
                </p>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['off', 'low', 'standard'] as AimAssistLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => onUpdateSettings({ aimAssist: lvl })}
                      className={`py-1.5 rounded font-cyber text-xs uppercase border transition-all ${
                        settings.aimAssist === lvl
                          ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                          : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 'off' ? 'OFF' : lvl === 'low' ? 'LOW' : 'STANDARD'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mouse Sensitivity */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between items-center text-slate-300 font-cyber">
                  <span>MOUSE AIM SENSITIVITY</span>
                  <span className="font-mono text-cyan-400">{(settings.mouseSensitivity || 1.0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.mouseSensitivity || 1.0}
                  onChange={(e) => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-800 h-2 rounded cursor-pointer"
                />
              </div>

              {/* Key Remapping Matrix */}
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-cyan-300 font-cyber font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <Keyboard size={15} /> KEYBOARD REMAPPING
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Click button, then press key</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { key: 'moveUp', label: 'Move Up' },
                    { key: 'moveDown', label: 'Move Down' },
                    { key: 'moveLeft', label: 'Move Left' },
                    { key: 'moveRight', label: 'Move Right' },
                    { key: 'attack', label: 'Knockback Attack' },
                    { key: 'grapple', label: 'Grapple Hook' },
                    { key: 'dash', label: 'Dash Evasion' },
                    { key: 'tactical', label: 'Tactical Ability' },
                    { key: 'interact', label: 'Interact / Collect' },
                    { key: 'pause', label: 'Pause Match' },
                  ].map(({ key, label }) => {
                    const k = key as keyof KeyBindings;
                    const isRebinding = rebindingKey === k;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded bg-slate-950/70 border border-slate-800"
                      >
                        <span className="text-[11px] text-slate-300 font-sans">{label}</span>
                        <button
                          onClick={() => setRebindingKey(k)}
                          className={`px-2 py-0.5 rounded font-mono text-xs font-bold transition-all ${
                            isRebinding
                              ? 'bg-amber-500 text-black animate-pulse border border-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {isRebinding ? 'PRESS KEY' : formatKeyName(keybindings[k])}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE TOUCH CONTROLS */}
          {activeTab === 'mobile' && (
            <div className="flex flex-col gap-4">
              {/* Joystick Type: Fixed vs Floating */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="font-cyber font-bold text-cyan-300">JOYSTICK PLACEMENT MODE</span>
                <p className="text-[11px] text-slate-400 font-mono">
                  Floating joystick appears wherever your left thumb touches the screen. Fixed stays in bottom-left corner.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => onUpdateSettings({ joystickType: 'fixed' })}
                    className={`py-2 rounded font-cyber text-xs uppercase border transition-all ${
                      settings.joystickType === 'fixed'
                        ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    FIXED CORNER
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ joystickType: 'floating' })}
                    className={`py-2 rounded font-cyber text-xs uppercase border transition-all ${
                      settings.joystickType === 'floating'
                        ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    FLOATING THUMB
                  </button>
                </div>
              </div>

              {/* Slider: Joystick Size */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between items-center text-slate-300 font-cyber">
                  <span>JOYSTICK SIZE</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.joystickScale * 100)}%</span>
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

              {/* Slider: Buttons Size */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between items-center text-slate-300 font-cyber">
                  <span>COMBAT BUTTONS SIZE</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.buttonScale * 100)}%</span>
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

              {/* Slider: Opacity */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex justify-between items-center text-slate-300 font-cyber">
                  <span>TOUCH HUD OPACITY</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.opacity * 100)}%</span>
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

              {/* Edit Layout Mode Trigger */}
              {onOpenEditLayout && (
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-cyber font-bold text-xs text-cyan-300">CUSTOM BUTTON POSITIONING</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Drag and place buttons directly where your thumbs rest
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEditLayout();
                    }}
                    className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs"
                  >
                    EDIT LAYOUT
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO & ACCESSIBILITY */}
          {activeTab === 'audio_access' && (
            <div className="flex flex-col gap-4">
              {/* Haptic Vibration */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-slate-200 font-cyber">
                    <Vibrate size={15} className="text-cyan-400" />
                    <span>Haptic Vibration Feedback</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Tactile pulses on hits, dashes, and damage (supported mobile devices)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.vibration}
                  onChange={(e) => onUpdateSettings({ vibration: e.target.checked })}
                  className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              {/* Reduced Screen Effects */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-slate-200 font-cyber">
                    <EyeOff size={15} className="text-purple-400" />
                    <span>Reduced Visual Effects</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Reduces screen shake, high-intensity flashes, and particle bursts
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reducedEffects || false}
                  onChange={(e) => onUpdateSettings({ reducedEffects: e.target.checked })}
                  className="w-5 h-5 accent-purple-400 rounded cursor-pointer"
                />
              </div>

              {/* Sound FX Preview */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-cyber text-slate-200">Sound Synthesis Preview</span>
                  <span className="text-[10px] text-slate-400 font-mono">Auditory feedback on kinetic hit</span>
                </div>
                <button
                  onClick={() => soundEngine.playKnockbackHit(true)}
                  className="py-1 px-3 rounded cyber-panel text-cyan-400 text-xs font-cyber hover:border-cyan-400"
                >
                  TEST HIT FX
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: NETWORK & WEBSOCKET */}
          {activeTab === 'server' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-cyan-300 font-cyber text-xs uppercase tracking-wider">
                <Globe size={16} /> MULTIPLAYER SERVER (OPTIONAL)
              </div>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                Leave blank for default. On static hosts like GitHub Pages, Solo Battle works offline 100%. To host online multiplayer rooms, provide an external WebSocket backend URL (e.g., <span className="text-cyan-400">wss://knockout-server.onrender.com/ws</span>).
              </p>
              <input
                type="text"
                placeholder="wss://your-backend.com/ws"
                value={wsUrl}
                onChange={(e) => handleSaveWsUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded px-3 py-2 text-xs font-mono text-cyan-200 outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-cyber text-slate-400 hover:text-white px-3 py-2 rounded hover:bg-slate-800 transition-colors"
          >
            <RotateCcw size={14} /> RESET TO DEFAULTS
          </button>

          <button
            onClick={onClose}
            className="py-2 px-5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold tracking-wider cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
