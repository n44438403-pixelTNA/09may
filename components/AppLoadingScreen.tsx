import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, HelpCircle, Video, Headphones, BrainCircuit, Trophy, WifiOff, Users } from 'lucide-react';
import { APP_VERSION } from '../constants';
import { getSplashFontById, ensureGoogleFontLoaded } from '../utils/splashFonts';

interface AppLoadingScreenProps {
  onComplete: () => void;
  isPremium?: boolean;
  subscriptionLevel?: 'FREE' | 'BASIC' | 'ULTRA';
}

type ThemeVariant = 'black' | 'blue' | 'light';

function detectTheme(): ThemeVariant {
  try {
    const isDark = localStorage.getItem('nst_dark_mode') === 'true';
    if (!isDark) return 'light';
    const type = localStorage.getItem('nst_dark_theme_type') || 'black';
    return type === 'blue' ? 'blue' : 'black';
  } catch {
    return 'black';
  }
}

const THEME_STYLES: Record<ThemeVariant, {
  bg: string; text: string; subtext: string; boxBg: string; boxBorder: string;
  trackBg: string; bar: string; badge: string;
}> = {
  black: {
    bg: 'bg-black',
    text: 'text-white',
    subtext: 'text-gray-500',
    boxBg: 'bg-gray-900',
    boxBorder: 'border-gray-800',
    trackBg: 'bg-gray-900',
    bar: 'from-indigo-500 via-violet-500 to-purple-600',
    badge: 'text-gray-500',
  },
  blue: {
    bg: 'bg-[#050d1f]',
    text: 'text-white',
    subtext: 'text-blue-400/70',
    boxBg: 'bg-blue-950/60',
    boxBorder: 'border-blue-900/60',
    trackBg: 'bg-blue-950',
    bar: 'from-blue-500 via-indigo-500 to-purple-500',
    badge: 'text-blue-400/60',
  },
  light: {
    bg: 'bg-white',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    boxBg: 'bg-slate-50',
    boxBorder: 'border-slate-200',
    trackBg: 'bg-slate-200',
    bar: 'from-blue-500 via-indigo-500 to-purple-500',
    badge: 'text-slate-400',
  },
};

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ onComplete, isPremium = false, subscriptionLevel = 'FREE' }) => {
  const [progress, setProgress] = useState(0);
  const [stepPhase1, setStepPhase1] = useState(-1);
  const [stepPhase2, setStepPhase2] = useState(-1);
  const [logoTapped, setLogoTapped] = useState(false);

  const [themeVariant] = useState<ThemeVariant>(detectTheme);

  const [appName] = useState(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
      // Prefer short name (used as the splash logo word) — falls back to long name, then "IIC".
      return settingsObj?.appShortName || settingsObj?.appName || 'IIC';
    } catch {
      return 'IIC';
    }
  });

  // Admin-controlled developer name shown in the bottom "Developed by …" badge.
  // Reads from systemSettings.developerName (stored in localStorage by Admin > General Settings).
  const [developerName] = useState<string>(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
      const name = (settingsObj?.developerName ?? '').toString().trim();
      return name || 'Nadim Anwar';
    } catch {
      return 'Nadim Anwar';
    }
  });

  // Admin-controlled font-size for the splash short name (in pixels).
  // Reads from systemSettings.appShortNameSize. Clamped to [24, 120].
  const [appNameSize] = useState<number>(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
      const raw = Number(settingsObj?.appShortNameSize);
      if (Number.isFinite(raw) && raw > 0) return Math.min(120, Math.max(24, raw));
      return 30; // default = matches old text-3xl
    } catch {
      return 30;
    }
  });

  // === Splash Font (admin-controlled, read from system settings) ===
  // Falls back to a legacy localStorage choice (`nst_splash_font_id`) for
  // users who picked one before the picker was moved into Admin > General
  // Settings, then defaults to "default".
  const [splashFontId] = useState<string>(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : null;
      const adminChoice = settingsObj?.splashFontId;
      if (adminChoice) return adminChoice as string;
      return localStorage.getItem('nst_splash_font_id') || 'default';
    } catch {
      return 'default';
    }
  });
  const activeFont = getSplashFontById(splashFontId);

  // === Splash LOGO (admin-controlled) ===
  // When enabled (default), the splash shows an <img> instead of the gradient
  // short-name text. Admin can upload a custom logo (stored as data: URL) or
  // remove it (which falls back to the text rendering).
  const [splashLogo] = useState<{ enabled: boolean; url: string; size: number }>(() => {
    try {
      const settingsRaw = localStorage.getItem('nst_system_settings');
      const s = settingsRaw ? JSON.parse(settingsRaw) : null;
      const enabled = s?.splashLogoEnabled !== false; // default ON
      const url = (s?.splashLogoUrl as string) || '/splash-logo.png';
      const rawSize = Number(s?.splashLogoSize);
      const size = Number.isFinite(rawSize) && rawSize > 0
        ? Math.min(260, Math.max(60, rawSize))
        : 140;
      return { enabled, url, size };
    } catch {
      return { enabled: true, url: '/splash-logo.png', size: 140 };
    }
  });

  // Lazy-load the chosen Google Font on mount AND whenever it changes.
  useEffect(() => {
    if (activeFont.gfontParam) ensureGoogleFontLoaded(activeFont.gfontParam);
  }, [activeFont.gfontParam]);

  const onCompleteRef = useRef(onComplete);
  const appNameRef = useRef(appName);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { appNameRef.current = appName; }, [appName]);

  useEffect(() => {
    const duration = 5000;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = Math.floor((progress / 100) * steps);

    const timer = setInterval(() => {
      currentStep++;
      const currentProgress = Math.min(Math.floor((currentStep / steps) * 100), 100);
      setProgress(currentProgress);

      if (currentProgress < 50) {
        if (currentProgress >= 10) setStepPhase1(0);
        if (currentProgress >= 20) setStepPhase1(1);
        if (currentProgress >= 30) setStepPhase1(2);
        if (currentProgress >= 40) setStepPhase1(3);
      }

      if (currentProgress >= 50) {
        setStepPhase1(-1);
        if (currentProgress >= 50) setStepPhase2(0);
        if (currentProgress >= 60) setStepPhase2(1);
        if (currentProgress >= 70) setStepPhase2(2);
        if (currentProgress >= 80) setStepPhase2(3);
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        try {
          const utterance = new SpeechSynthesisUtterance('Welcome to ' + appNameRef.current);
          utterance.lang = 'en-US';
          utterance.rate = 1;
          utterance.pitch = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch {}
        setTimeout(() => {
          onCompleteRef.current();
        }, 300);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  const handleLogoTap = () => {
    if (logoTapped) return;
    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}
    setLogoTapped(true);
    setTimeout(() => setLogoTapped(false), 600);
  };

  const t = THEME_STYLES[themeVariant];

  const iconColor1 = themeVariant === 'light' ? 'text-blue-500' : 'text-blue-400';
  const iconColor2 = themeVariant === 'light' ? 'text-violet-600' : 'text-purple-400';
  const iconColor3 = themeVariant === 'light' ? 'text-rose-500' : 'text-rose-400';
  const iconColor4 = themeVariant === 'light' ? 'text-emerald-600' : 'text-emerald-400';
  const iconColor5 = themeVariant === 'light' ? 'text-amber-500' : 'text-amber-400';
  const iconColor6 = themeVariant === 'light' ? 'text-indigo-600' : 'text-indigo-400';
  const iconColor7 = themeVariant === 'light' ? 'text-teal-600' : 'text-teal-400';
  const iconColor8 = themeVariant === 'light' ? 'text-orange-500' : 'text-orange-400';

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${t.bg} ${t.text} overflow-hidden w-full mx-auto`}>


      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={`absolute top-[-10%] left-[-10%] w-[120%] h-[120%] ${
          themeVariant === 'blue'
            ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.4)_0%,transparent_55%)]'
            : themeVariant === 'black'
            ? 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25)_0%,transparent_55%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_55%)]'
        } animate-[spin_15s_linear_infinite]`} />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-8">
        {/* Logo / App Name — tappable for scale-up animation */}
        <button
          type="button"
          onClick={handleLogoTap}
          className="relative overflow-hidden mb-12 text-center animate-in slide-in-from-bottom-4 duration-700 fade-in focus:outline-none select-none rounded-2xl"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {splashLogo.enabled && splashLogo.url ? (
            // === Image LOGO (admin-controlled, default ON) ===
            <img
              src={splashLogo.url}
              alt={appName}
              draggable={false}
              onError={(e) => {
                // Agar uploaded logo load nahi hua to default pe wapas chala jaye.
                const img = e.currentTarget as HTMLImageElement;
                if (img.src.indexOf('/splash-logo.png') === -1) {
                  img.src = '/splash-logo.png';
                }
              }}
              className={`mb-2 mx-auto object-contain transition-transform duration-300 ease-out drop-shadow-xl ${
                logoTapped ? 'scale-[2.2]' : 'scale-100'
              }`}
              style={{
                width: `${splashLogo.size}px`,
                height: `${splashLogo.size}px`,
                maxWidth: '70vw',
              }}
            />
          ) : (
            // === Fallback: gradient short-name text (when admin disables logo) ===
            <h1
              className={`font-black tracking-tight mb-2 uppercase text-center leading-tight transition-transform duration-300 ease-out bg-clip-text text-transparent ${
                logoTapped ? 'scale-[2.2]' : 'scale-100'
              } ${
                subscriptionLevel === 'ULTRA'
                  ? 'bg-gradient-to-r from-slate-400 via-slate-300 to-slate-500'
                  : subscriptionLevel === 'BASIC'
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700'
                    : themeVariant === 'light'
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-600'
                      : 'bg-gradient-to-r from-sky-400 to-cyan-500'
              }`}
              style={{
                fontSize: `${appNameSize}px`,
                ...(activeFont.family ? { fontFamily: activeFont.family } : {}),
                ...(activeFont.letterSpacing ? { letterSpacing: activeFont.letterSpacing } : {}),
              }}
            >
              {appName}
            </h1>
          )}
          <p className={`text-xs font-bold tracking-widest ${t.subtext} uppercase mt-2 transition-opacity duration-300 ${logoTapped ? 'opacity-0' : 'opacity-100'}`}>
            Loading your experience...
          </p>

        </button>

        {/* Feature boxes */}
        <div className="relative w-full h-64 perspective-1000 mb-4">
          {/* Phase 1 */}
          <div className={`absolute inset-0 grid grid-cols-2 gap-4 w-full transition-all duration-500 ${progress < 50 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <BookOpen size={32} className={`${iconColor1} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>Notes</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <HelpCircle size={32} className={`${iconColor2} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>MCQ</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Video size={32} className={`${iconColor3} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>Video</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase1 >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Headphones size={32} className={`${iconColor4} mb-3`} />
              <span className={`font-bold tracking-wide ${t.text}`}>Audio</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className={`absolute inset-0 grid grid-cols-2 gap-4 w-full transition-all duration-500 ${progress >= 50 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <BrainCircuit size={32} className={`${iconColor5} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Smart<br />Revision</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Trophy size={32} className={`${iconColor6} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Daily<br />Quiz</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <WifiOff size={32} className={`${iconColor7} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Offline<br />Mode</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-6 rounded-2xl ${t.boxBg} border ${t.boxBorder} shadow-lg transition-all duration-500 transform ${stepPhase2 >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
              <Users size={32} className={`${iconColor8} mb-3`} />
              <span className={`font-bold tracking-wide text-center leading-tight ${t.text}`}>Teacher<br />Mode</span>
            </div>
          </div>
        </div>

        {/* Progress section */}
        <div className="w-full flex flex-col items-center mt-4">
          <div className="flex flex-col items-center justify-center mb-2">
            <div className={`text-4xl font-black font-mono tracking-tighter drop-shadow-md ${t.text}`}>
              {progress}%
            </div>
          </div>
          <div className={`w-full h-2 ${t.trackBg} rounded-full overflow-hidden mb-2 shadow-inner`}>
            <div
              className={`h-full bg-gradient-to-r ${t.bar} rounded-full transition-all duration-100 ease-linear shadow-sm`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className={`text-[11px] font-bold ${t.badge} tracking-wide`}>
              Developed by {developerName}
            </p>
            <span className={t.badge}>|</span>
            <p className={`text-[11px] ${t.badge} font-mono font-bold tracking-widest`}>
              v{APP_VERSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
