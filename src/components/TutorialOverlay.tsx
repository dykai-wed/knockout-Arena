import React from 'react';
import { TutorialStepId } from '../game/rules.ts';
import { ArrowRight, CheckCircle2, RotateCcw, X, Sparkles, Navigation, Anchor, Zap, ShieldAlert } from 'lucide-react';
import { KeyBindings, DEFAULT_KEYBINDINGS } from '../game/input.ts';

export interface TutorialOverlayProps {
  currentStep: TutorialStepId;
  isMobile: boolean;
  stepProgress: number; // 0 to 1
  keybindings?: KeyBindings;
  onNextStep?: () => void;
  onSkipTutorial: () => void;
  onRestartTutorial: () => void;
}

const STEP_DETAILS: Record<
  TutorialStepId,
  {
    title: string;
    desktopText: string;
    mobileText: string;
    actionIcon: React.ReactNode;
    keyLabel: (kb: KeyBindings) => string;
  }
> = {
  1: {
    title: '1. MOVEMENT & POSITIONING',
    desktopText: 'Use W, A, S, D to maneuver your combatant around the arena floor.',
    mobileText: 'Touch and drag the Virtual Joystick on the bottom-left to move your combatant.',
    actionIcon: <Navigation className="text-cyan-400 transform -rotate-45" size={20} />,
    keyLabel: () => 'WASD / JOYSTICK',
  },
  2: {
    title: '2. PRIMARY ATTACK',
    desktopText: 'Aim with your mouse and Left-Click (LMB) to strike the training dummy.',
    mobileText: 'Aim toward the dummy and press the large blue ATTACK button on the bottom-right.',
    actionIcon: <Zap className="text-cyan-300" size={20} />,
    keyLabel: (kb) => kb.attack,
  },
  3: {
    title: '3. KNOCKBACK PHYSICS',
    desktopText: 'Time your strike to propel the opponent backward toward the perimeter.',
    mobileText: 'Hit the opponent firmly to propel them backward with kinetic momentum.',
    actionIcon: <Sparkles className="text-amber-400" size={20} />,
    keyLabel: (kb) => 'MOMENTUM HIT',
  },
  4: {
    title: '4. GRAPPLE HOOK',
    desktopText: 'Right-Click (RMB) or press Space to deploy your energy tether and latch on.',
    mobileText: 'Tap the GRAPPLE button to fling your tether and pull yourself or reel targets.',
    actionIcon: <Anchor className="text-cyan-400" size={20} />,
    keyLabel: (kb) => kb.grapple,
  },
  5: {
    title: '5. DASH EVASION',
    desktopText: 'Press Shift to execute a high-speed dash burst across the arena floor.',
    mobileText: 'Tap the DASH button for quick invulnerable burst repositioning.',
    actionIcon: <Navigation className="text-cyan-400" size={20} />,
    keyLabel: (kb) => kb.dash,
  },
  6: {
    title: '6. TACTICAL ABILITY',
    desktopText: 'Press E to activate your character class tactical ability.',
    mobileText: 'Tap the TACTICAL button on your right thumb cluster to activate suit power.',
    actionIcon: <ShieldAlert className="text-purple-400" size={20} />,
    keyLabel: (kb) => kb.tactical,
  },
  7: {
    title: '7. AVOID ARENA HAZARDS',
    desktopText: 'Navigate carefully near the outer edge and avoid bouncing into the void.',
    mobileText: 'Stay balanced on the platform and steer clear of the purple gravity vortex.',
    actionIcon: <Sparkles className="text-red-400" size={20} />,
    keyLabel: () => 'SAFE ZONE',
  },
  8: {
    title: '8. SURVIVAL CHALLENGE',
    desktopText: 'Hold your ground and stay alive on the platform against active combatants!',
    mobileText: 'Dodge incoming knockbacks and stay on the arena platform!',
    actionIcon: <CheckCircle2 className="text-emerald-400" size={20} />,
    keyLabel: () => 'SURVIVE',
  },
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  currentStep,
  isMobile,
  stepProgress,
  keybindings = DEFAULT_KEYBINDINGS,
  onSkipTutorial,
  onRestartTutorial,
}) => {
  const stepInfo = STEP_DETAILS[currentStep] || STEP_DETAILS[1];
  const progressPercent = Math.min(100, Math.round(stepProgress * 100));

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-none">
      <div className="cyber-panel p-3.5 sm:p-4 rounded-xl border-2 border-cyan-400 bg-slate-950/95 shadow-[0_0_25px_rgba(0,240,255,0.4)] pointer-events-auto flex flex-col gap-2.5">
        {/* Step Indicator & Controls Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-400/40">
              STEP {currentStep}/8
            </span>
            <span className="font-cyber font-bold text-xs sm:text-sm text-white tracking-wider">
              {stepInfo.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRestartTutorial}
              title="Restart Tutorial"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Restart Tutorial"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onSkipTutorial}
              className="text-[10px] font-cyber text-slate-400 hover:text-cyan-300 px-2 py-0.5 rounded border border-slate-700 hover:border-cyan-500 transition-colors"
            >
              SKIP TUTORIAL
            </button>
          </div>
        </div>

        {/* Instructions Body */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-cyan-400/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.25)]">
            {stepInfo.actionIcon}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
              {isMobile ? stepInfo.mobileText : stepInfo.desktopText}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-400">
                RECOMMENDED INPUT: <b className="text-white px-1 py-0.2 bg-slate-800 rounded">{stepInfo.keyLabel(keybindings)}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>REQUIREMENT PROGRESS</span>
            <span className="text-cyan-300 font-bold">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
