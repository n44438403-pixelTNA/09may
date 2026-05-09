import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Volume2, Square, BookOpen, Star, Palette, Check, Type, RotateCcw, Search } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import { splitIntoTopics, NotesTopic as Topic } from '../utils/notesSplitter';
import { READING_FONTS, TOP_10_READING_FONTS, ensureReadingFontLoaded, getReadingFontById, ReadingFont } from '../utils/notesFonts';
import { ReadingStylePopover } from './ReadingStylePopover';

const FONT_SIZES = [13, 15, 17, 20] as const;
const FONT_SIZE_KEY = 'nst_reading_font_size';
const FONT_FAMILY_KEY = 'nst_reading_font_family';
const VOICE_SPEED_KEY = 'nst_tts_speed';
const VOICE_SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;
const SPEED_LABELS = ['0.75x', '1x', '1.25x', '1.5x', '1.75x', '2x'] as const;
const getStoredSpeedIdx = (): number => {
  try {
    const v = parseInt(localStorage.getItem(VOICE_SPEED_KEY) || '1', 10);
    return isNaN(v) || v < 0 || v > 5 ? 1 : v;
  } catch { return 1; }
};

const getStoredFontFamilyId = (): string | null => {
  try { return localStorage.getItem(FONT_FAMILY_KEY); } catch { return null; }
};

const getStoredFontIdx = (): number => {
  try {
    const v = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '1', 10);
    return isNaN(v) || v < 0 || v > 3 ? 1 : v;
  } catch { return 1; }
};

/* ─────────  Reading-text colour palettes (per app theme)  ─────────
   For each theme we curate 6 colours that stay readable on that theme's
   background. The first entry of every palette is the recommended one
   (marked with a ★ in the picker UI). Selection is persisted per-theme
   so switching dark↔light keeps a sensible default in each theme.        */
type ColorSwatch = { hex: string; name: string };
const READING_PALETTE: Record<'light' | 'dark' | 'blue', ColorSwatch[]> = {
  light: [
    { hex: '#1e293b', name: 'Slate' },     // recommended
    { hex: '#0f172a', name: 'Ink' },
    { hex: '#1e3a8a', name: 'Navy' },
    { hex: '#3730a3', name: 'Indigo' },
    { hex: '#065f46', name: 'Forest' },
    { hex: '#7c2d12', name: 'Sienna' },
  ],
  dark: [
    { hex: '#f1f5f9', name: 'Soft White' }, // recommended
    { hex: '#fde68a', name: 'Amber' },
    { hex: '#a7f3d0', name: 'Mint' },
    { hex: '#bae6fd', name: 'Sky' },
    { hex: '#fecaca', name: 'Rose' },
    { hex: '#ffffff', name: 'Pure White' },
  ],
  blue: [
    { hex: '#e0f2fe', name: 'Ice' },        // recommended
    { hex: '#ffffff', name: 'White' },
    { hex: '#fde68a', name: 'Amber' },
    { hex: '#a7f3d0', name: 'Mint' },
    { hex: '#fbcfe8', name: 'Pink' },
    { hex: '#c7d2fe', name: 'Lavender' },
  ],
};
const COLOR_KEY = (mode: 'light' | 'dark' | 'blue') => `nst_text_color_${mode}`;
const detectMode = (): 'light' | 'dark' | 'blue' => {
  if (typeof document === 'undefined') return 'light';
  const cls = document.documentElement.classList;
  if (cls.contains('dark-mode-blue')) return 'blue';
  if (cls.contains('dark-mode')) return 'dark';
  return 'light';
};
const getStoredColor = (mode: 'light' | 'dark' | 'blue'): string => {
  try {
    const v = localStorage.getItem(COLOR_KEY(mode));
    if (v && /^#[0-9a-f]{6}$/i.test(v)) return v;
  } catch {}
  return READING_PALETTE[mode][0].hex;
};

interface Props {
  content: string;
  className?: string;
  language?: string;
  topBarLabel?: string;
  /** When true, the reader starts "Read All" automatically on mount / content change. */
  autoStart?: boolean;
  /** Fires after the last topic has finished being read aloud. */
  onComplete?: () => void;
  /** Fires the moment "Read All" / tap-to-read TTS begins (start of any read session).
   *  Used to immediately mark a note as "in progress" in Continue Reading. */
  onReadingStart?: () => void;
  /** When true, hides the sticky "Read All" top bar (use when parent renders controls externally). */
  hideTopBar?: boolean;
  /** Topic index to scroll to / highlight on mount (used to restore reading position
   *  after a tab switch unmounts and remounts the reader). */
  initialIndex?: number | null;
  /** Fired with the latest topic index the user is at (tap-to-read or auto-advance)
   *  so the parent can persist it for later restoration. */
  onPositionChange?: (idx: number) => void;
  /** Unique key for this note (e.g. "hw_abc123") to namespace saved stars. */
  noteKey?: string;
  /** Returns true if a topic text is currently starred. */
  isStarred?: (text: string) => boolean;
  /** Called when user taps the star on a topic. */
  onStarToggle?: (text: string) => void;
  /** Optional search phrase. When set, the reader finds the first topic that
   *  contains the phrase (case-insensitive), scrolls to it, highlights it,
   *  and auto-starts TTS from that line. Used by Home search → "click result
   *  → jump to exact line and read aloud" flow. */
  searchQuery?: string;
  /** Optional getter for the global "social proof" save count of a topic.
   *  When provided and >0, the topic shows a small "⭐ N" pill so students see
   *  how many other learners have marked the same line as Important. */
  getStarCount?: (topicText: string) => number;
  /** External text-colour override (hex). When set, this colour is applied to
   *  every topic line and the in-reader Palette colour picker is hidden — the
   *  parent component is fully in charge of reading colour (e.g. PdfView's
   *  inline Read More wrapper which lets the user pick a coherent background
   *  + text-colour preset together). */
  textColorOverride?: string;
}


export const ChunkedNotesReader: React.FC<Props> = ({ content, className, language = 'hi-IN', topBarLabel, autoStart, onComplete, onReadingStart, hideTopBar, initialIndex, onPositionChange, noteKey, isStarred, onStarToggle, searchQuery, getStarCount, textColorOverride }) => {
  const topics = useMemo(() => splitIntoTopics(content), [content]);

  const [activeIdx, setActiveIdx] = useState<number | null>(initialIndex ?? null);
  const [isReading, setIsReading] = useState(false);
  const isReadingRef = useRef(false);
  useEffect(() => { isReadingRef.current = isReading; }, [isReading]);

  // Voice speed control
  const [speedIdx, setSpeedIdx] = useState<number>(getStoredSpeedIdx);
  const speedIdxRef = useRef(speedIdx);
  useEffect(() => { speedIdxRef.current = speedIdx; }, [speedIdx]);
  const cycleSpeed = () => {
    setSpeedIdx(prev => {
      const next = (prev + 1) % VOICE_SPEEDS.length;
      try { localStorage.setItem(VOICE_SPEED_KEY, String(next)); } catch {}
      speedIdxRef.current = next;
      return next;
    });
  };

  // Font scaling
  const [fontIdx, setFontIdx] = useState<number>(getStoredFontIdx);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const fontSize = FONT_SIZES[fontIdx];

  // Font family — student can pick from 500+ Google Fonts. The chosen font
  // persists in localStorage and is loaded on demand. `null` means "default"
  // (the app's normal Inter / system font), which is also what the Reset
  // button restores to.
  const [fontFamilyId, setFontFamilyId] = useState<string | null>(getStoredFontFamilyId);
  const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategory, setFontCategory] = useState<'all' | 'top10' | 'sans' | 'serif' | 'display' | 'handwriting' | 'mono' | 'indic'>('top10');
  const activeFont: ReadingFont | null = useMemo(() => getReadingFontById(fontFamilyId), [fontFamilyId]);
  // Whenever the active font changes, eagerly load its <link> tag so the page
  // can render with the right glyphs immediately.
  useEffect(() => {
    if (activeFont?.gfontParam) ensureReadingFontLoaded(activeFont.gfontParam);
  }, [activeFont]);
  const pickFontFamily = (id: string | null) => {
    setFontFamilyId(id);
    try {
      if (id) localStorage.setItem(FONT_FAMILY_KEY, id);
      else localStorage.removeItem(FONT_FAMILY_KEY);
    } catch {}
    try { window.dispatchEvent(new CustomEvent('nst-reading-style-changed')); } catch {}
    try { if (navigator.vibrate) navigator.vibrate(20); } catch {}
  };
  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    let pool: ReadingFont[];
    if (fontCategory === 'top10') pool = TOP_10_READING_FONTS;
    else if (fontCategory === 'all') pool = READING_FONTS;
    else pool = READING_FONTS.filter(f => f.category === fontCategory);
    if (!q) return pool;
    return pool.filter(f => f.label.toLowerCase().includes(q));
  }, [fontSearch, fontCategory]);

  // Reading text colour — per active theme. We watch the <html> class list so
  // when the user flips Light/Dark/Blue from the Settings sheet, the picker
  // and applied colour update instantly without a remount.
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'blue'>(detectMode);
  const [textColor, setTextColor] = useState<string>(() => getStoredColor(detectMode()));
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [inlineSearch, setInlineSearch] = useState(false);
  const [inlineQuery, setInlineQuery] = useState('');
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const obs = new MutationObserver(() => {
      const m = detectMode();
      setThemeMode(prev => (prev !== m ? m : prev));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  // When theme flips, restore that theme's saved colour (or its default).
  useEffect(() => { setTextColor(getStoredColor(themeMode)); }, [themeMode]);
  const pickColor = (hex: string) => {
    setTextColor(hex);
    try { localStorage.setItem(COLOR_KEY(themeMode), hex); } catch {}
    try { if (navigator.vibrate) navigator.vibrate(20); } catch {}
  };

  const changeFontSize = (delta: number) => {
    setFontIdx(prev => {
      const next = Math.max(0, Math.min(3, prev + delta));
      try { localStorage.setItem(FONT_SIZE_KEY, String(next)); } catch {}
      try { window.dispatchEvent(new CustomEvent('nst-reading-style-changed')); } catch {}
      return next;
    });
    try { if (navigator.vibrate) navigator.vibrate(30); } catch {}
  };

  // Stay in sync with external Reading-Style controls (e.g. PdfView's outer
  // "Aa" font popover). When the user changes size or family from outside,
  // every mounted reader re-reads the stored values so the change is visible
  // instantly without unmounting/remounting the topic list.
  useEffect(() => {
    const sync = () => {
      try {
        const v = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '1', 10);
        if (!isNaN(v) && v >= 0 && v <= 3) setFontIdx(v);
      } catch {}
      try {
        const id = localStorage.getItem(FONT_FAMILY_KEY);
        setFontFamilyId(id);
      } catch {}
    };
    window.addEventListener('nst-reading-style-changed', sync);
    return () => window.removeEventListener('nst-reading-style-changed', sync);
  }, []);

  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Notify parent whenever the active line changes so position can be persisted.
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => {
    if (activeIdx !== null && onPositionChangeRef.current) {
      onPositionChangeRef.current(activeIdx);
    }
  }, [activeIdx]);

  // On first mount, scroll the saved line into view (without auto-playing).
  useEffect(() => {
    if (initialIndex == null) return;
    const t = setTimeout(() => {
      itemRefs.current[initialIndex]?.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a stable ref to the latest onComplete so playFrom (memoised) always
  // calls the freshest version without retriggering its dependencies.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const playFrom = useCallback((idx: number) => {
    if (!isReadingRef.current) return;
    if (idx >= topics.length) {
      isReadingRef.current = false;
      setIsReading(false);
      setActiveIdx(null);
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }
    setActiveIdx(idx);
    setTimeout(() => {
      itemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    speakText(
      topics[idx].text,
      undefined,
      VOICE_SPEEDS[speedIdxRef.current] ?? 1.0,
      language,
      undefined,
      () => {
        if (isReadingRef.current) playFrom(idx + 1);
      }
    );
  }, [topics, language]);

  // Stable ref to the latest onReadingStart so we can call it from startFromIndex
  // without making the callback identity unstable.
  const onReadingStartRef = useRef(onReadingStart);
  useEffect(() => { onReadingStartRef.current = onReadingStart; }, [onReadingStart]);

  const startFromIndex = useCallback((startIdx: number) => {
    if (topics.length === 0) return;
    stopSpeech();
    isReadingRef.current = true;
    setIsReading(true);
    // Notify parent so it can flag this note as "in progress" right away.
    if (onReadingStartRef.current) {
      try { onReadingStartRef.current(); } catch {}
    }
    // Defer to next tick so cancel() flushes before speak()
    setTimeout(() => playFrom(startIdx), 80);
  }, [playFrom, topics.length]);

  const stopAll = useCallback(() => {
    isReadingRef.current = false;
    setIsReading(false);
    setActiveIdx(null);
    stopSpeech();
  }, []);

  // Stop on unmount or when content changes
  useEffect(() => {
    return () => {
      isReadingRef.current = false;
      stopSpeech();
    };
  }, []);

  // Stop TTS when user switches browser tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isReadingRef.current) {
        stopAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stopAll]);

  // Reset position only when content actually changes after the first render
  // (so a fresh mount with restored initialIndex isn't immediately wiped).
  const contentChangedOnce = useRef(false);
  useEffect(() => {
    if (!contentChangedOnce.current) {
      contentChangedOnce.current = true;
      return;
    }
    stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Auto-start "Read All" when the autoStart prop is true (used by Lucent's
  // Auto-Read & Sync mode + the Concept-page Read All to chain pages/topics
  // together). Defer slightly so that the stopAll() above on content change
  // has a chance to flush first. When `autoStart` flips from true → false the
  // parent has cancelled chained playback, so we mirror that by stopping any
  // in-flight TTS in this reader so it doesn't keep advancing lines.
  useEffect(() => {
    if (!autoStart) {
      if (isReadingRef.current) stopAll();
      return;
    }
    if (topics.length === 0) return;
    const t = setTimeout(() => startFromIndex(0), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, content]);

  // When a `searchQuery` is provided (Home search → click result), locate the
  // first topic that contains the phrase, scroll to it, highlight it, and
  // auto-start TTS from that line so the user instantly hears the matched part.
  const searchHandledRef = useRef<string>('');
  useEffect(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return;
    if (topics.length === 0) return;
    // Avoid re-firing for the same query on incidental re-renders.
    const sig = `${q}::${topics.length}`;
    if (searchHandledRef.current === sig) return;
    searchHandledRef.current = sig;

    const matchIdx = topics.findIndex(t => (t.text || '').toLowerCase().includes(q));
    if (matchIdx < 0) return;
    const t = setTimeout(() => {
      itemRefs.current[matchIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startFromIndex(matchIdx);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, content]);

  if (topics.length === 0) {
    return (
      <div className={`text-center py-10 text-slate-400 ${className || ''}`}>
        <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No readable text</p>
      </div>
    );
  }

  return (
    <div className={className || ''}>
      {/* Centered Reading Style popover (Portal-based, viewport-centred).
          Tapping the small Type ("T") button in the top bar opens this same
          popup — same as PdfView's outer "Aa" button — so the experience is
          consistent regardless of where the picker is launched from. */}
      <ReadingStylePopover isOpen={showFontFamilyMenu} onClose={() => setShowFontFamilyMenu(false)} />
      {/* Header with font controls + Read All.
          NOTE: Must be fully opaque (`bg-white`) — earlier `bg-white/95` +
          backdrop-blur let the scrolling notes content bleed visibly behind
          the READ ALL bar, which broke readability. We also bump z-index so
          this bar always sits above scrolled content. */}
      {!hideTopBar && (
        <div className="sticky top-0 z-20 bg-white py-2 mb-3 border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-600 truncate min-w-0">
              {topBarLabel || 'Notes'}
              <span className="text-slate-400 font-medium ml-2">
                {isReading && activeIdx !== null
                  ? `${activeIdx + 1} / ${topics.length}`
                  : `${topics.length} topics`}
              </span>
            </div>

            {/* Font size controls */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => changeFontSize(-1)}
                  disabled={fontIdx === 0}
                  className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 transition text-xs font-black"
                  title="Font chhota karein"
                  aria-label="Font chhota"
                >
                  A-
                </button>
                <span className="w-px h-4 bg-slate-300" />
                <button
                  type="button"
                  onClick={() => changeFontSize(1)}
                  disabled={fontIdx === 3}
                  className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 transition text-sm font-black"
                  title="Font bada karein"
                  aria-label="Font bada"
                >
                  A+
                </button>
              </div>

              {/* Font family picker — pehle yeh ek narrow card ke andar
                  absolute-position se kholta tha jisse Read More jaisi narrow
                  views mein side se cut ho jata tha. Ab same centered popup
                  use karte hain (ReadingStylePopover) jo Portal ke through
                  poori screen ke beech mein khulta hai — left-cut/clipping
                  nahi hota, aur category tabs (All/Hindi/etc.) tap karne par
                  bhi kuch gayab nahi hota. */}
              <button
                type="button"
                onClick={() => {
                  setShowFontFamilyMenu(true);
                  // Preload top10 fonts for previews
                  TOP_10_READING_FONTS.forEach(f => ensureReadingFontLoaded(f.gfontParam));
                }}
                className={`p-1.5 rounded-lg transition flex items-center gap-1 ${activeFont ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'}`}
                title={activeFont ? `Font: ${activeFont.label}` : 'Font badlein (686+ choices)'}
                aria-label="Pick reading font"
                aria-expanded={showFontFamilyMenu}
              >
                <Type size={14} />
              </button>

              {/* Reading-text colour picker — opens a small palette below the
                  bar with 6 swatches curated for the active theme. The first
                  swatch carries a ★ (recommended) badge; the active swatch
                  shows a ✓. Selection persists per-theme.
                  HIDDEN when `textColorOverride` is set — in that mode the
                  parent fully owns the reading colour (e.g. PdfView's inline
                  Read More wrapper picks bg + text together as a coherent
                  preset, so two color pickers would just confuse the user. */}
              <div className="relative" style={{ display: textColorOverride ? 'none' : undefined }}>
                <button
                  type="button"
                  onClick={() => setShowColorMenu(s => !s)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition flex items-center gap-1"
                  title="Text rang chunein"
                  aria-label="Pick text color"
                  aria-expanded={showColorMenu}
                >
                  <Palette size={14} className="text-slate-600" />
                  <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: textColor }} />
                </button>
                {showColorMenu && (
                  <>
                    {/* Click-outside backdrop */}
                    <div className="fixed inset-0 z-30" onClick={() => setShowColorMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                        Text Color · {themeMode === 'blue' ? 'Blue' : themeMode === 'dark' ? 'Dark' : 'Light'} mode
                      </p>
                      <div className="grid grid-cols-6 gap-2">
                        {READING_PALETTE[themeMode].map((sw, i) => {
                          const isSelected = sw.hex.toLowerCase() === textColor.toLowerCase();
                          const isRecommended = i === 0;
                          return (
                            <button
                              key={sw.hex}
                              type="button"
                              onClick={() => { pickColor(sw.hex); }}
                              title={`${sw.name}${isRecommended ? ' · Recommended' : ''}`}
                              className={`relative aspect-square rounded-lg border-2 transition-all active:scale-90 ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-400'}`}
                              style={{ backgroundColor: sw.hex }}
                            >
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <Check size={12} className="text-white drop-shadow" strokeWidth={4} />
                                </span>
                              )}
                              {isRecommended && !isSelected && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-[8px] font-black text-white flex items-center justify-center shadow">★</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">★ = recommended for this mode</p>
                    </div>
                  </>
                )}
              </div>

              {/* Inline Search button */}
              <button
                type="button"
                onClick={() => { setInlineSearch(s => !s); setInlineQuery(''); }}
                className={`p-1.5 rounded-lg transition flex items-center gap-1 ${inlineSearch ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'}`}
                title="Notes mein search karein"
                aria-label="Search notes"
              >
                <Search size={14} />
              </button>

              {/* Voice Speed Button */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="shrink-0 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition text-[10px] font-black text-slate-700 whitespace-nowrap"
                title="Voice speed badlein"
                aria-label={`Speed: ${SPEED_LABELS[speedIdx]}`}
              >
                {SPEED_LABELS[speedIdx]}
              </button>

              <button
                onClick={() => {
                  if (isReading) {
                    try { if (navigator.vibrate) navigator.vibrate(30); } catch {}
                    stopAll();
                  } else {
                    try { if (navigator.vibrate) navigator.vibrate(50); } catch {}
                    startFromIndex(initialIndex ?? 0);
                  }
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition ${
                  isReading
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isReading ? <><Square size={13} /> Stop</> : initialIndex ? <><Volume2 size={13} /> Continue</> : <><Volume2 size={13} /> Read All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline search panel */}
      {inlineSearch && (
        <div className="sticky top-[52px] z-10 bg-white border-b border-slate-100 px-0 pb-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={inlineQuery}
              onChange={e => setInlineQuery(e.target.value)}
              placeholder="Koi topic ya line dhundho..."
              className="w-full pl-8 pr-8 py-2 text-sm border border-blue-200 rounded-xl bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400"
            />
            {inlineQuery && (
              <button
                onClick={() => setInlineQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >✕</button>
            )}
          </div>
          {inlineQuery.trim() && (() => {
            const q = inlineQuery.trim().toLowerCase();
            const hits = topics
              .map((t, idx) => ({ t, idx }))
              .filter(({ t }) => !t.isHeading && (t.text || '').toLowerCase().includes(q))
              .slice(0, 10);
            if (hits.length === 0) return (
              <p className="text-center text-xs text-slate-400 py-2">Koi result nahi mila</p>
            );
            return (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {hits.map(({ t, idx }) => {
                  const txt = t.text || '';
                  const qi = txt.toLowerCase().indexOf(q);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setInlineSearch(false);
                        setInlineQuery('');
                        setTimeout(() => {
                          itemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          startFromIndex(idx);
                        }, 100);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition text-xs text-slate-700 line-clamp-2"
                    >
                      <span className="text-[10px] text-blue-500 font-bold mr-1">#{idx + 1}</span>
                      {qi > 0 && <span>{txt.slice(0, qi)}</span>}
                      <mark className="bg-yellow-200 text-slate-800 rounded px-0.5">{txt.slice(qi, qi + q.length)}</mark>
                      <span>{txt.slice(qi + q.length)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Topic list — tap any line to start TTS from that line */}
      <div className="space-y-1.5">
        {topics.map((topic, idx) => {
          const isActive = isReading && activeIdx === idx;
          // Headings are non-readable so keep them as static blocks.
          if (topic.isHeading) {
            return (
              <div
                key={`tp-${idx}`}
                ref={(el) => { itemRefs.current[idx] = el; }}
                className="mt-4 mb-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-transparent border-l-4 border-indigo-400"
              >
                <p
                  className="font-black text-indigo-800 uppercase tracking-wide"
                  style={{ fontSize: `${Math.min(fontSize + 2, 20)}px`, fontFamily: activeFont?.family }}
                >
                  {topic.text}
                </p>
              </div>
            );
          }

          // Whole topic is a button so taps anywhere on the line start/stop TTS.
          const starred = isStarred ? isStarred(topic.text) : false;
          const starCount = getStarCount ? getStarCount(topic.text) : 0;
          return (
            <div
              key={`tp-${idx}`}
              ref={(el) => { itemRefs.current[idx] = el as any; }}
              className={`group relative w-full rounded-lg transition-colors ${
                isActive
                  ? 'bg-yellow-50 ring-2 ring-yellow-300'
                  : starred
                    ? 'bg-amber-50'
                    : 'hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  try { if (navigator.vibrate) navigator.vibrate(isActive ? 30 : 50); } catch {}
                  if (isActive) stopAll();
                  else startFromIndex(idx);
                }}
                aria-label={isActive ? 'Stop reading this line' : 'Read from this line'}
                title={isActive ? 'Tap to stop' : 'Tap to read from here'}
                className="w-full text-left pl-4 pr-10 py-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                <p
                  className={`leading-relaxed ${isActive ? 'text-yellow-900 font-semibold' : ''}`}
                  style={{
                    fontSize: `${fontSize}px`,
                    // The active (currently-being-read) line keeps its yellow
                    // highlight colour for clarity. Other lines use the
                    // parent-supplied override (if any) or the student's
                    // chosen palette colour for the active theme.
                    color: isActive ? undefined : (textColorOverride || textColor),
                    fontFamily: activeFont?.family,
                  }}
                >
                  <span className={`font-bold mr-1.5 ${starred ? 'text-amber-400' : 'text-indigo-400'}`}>•</span>
                  {topic.text}
                </p>
                {/* Save count badge intentionally hidden here — yeh ab sirf
                    "Important / Starred Notes" ke Global tab page par dikhega taa ki
                    reading view clean rahe. */}
              </button>
              {/* TTS active indicator */}
              {isActive && (
                <span
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-red-100 text-red-600 animate-pulse pointer-events-none"
                  aria-hidden="true"
                >
                  <Square size={12} fill="currentColor" />
                </span>
              )}
              {/* Star button — only visible on the line currently being read by
                  TTS. When TTS stops, the star disappears. The amber background
                  on already-starred lines still indicates "saved to Important
                  Notes". To un-star later, tap the line to start TTS again,
                  then tap the star. ~28px hit area for easy tapping. */}
              {onStarToggle && isActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    try { if (navigator.vibrate) navigator.vibrate(40); } catch {}
                    onStarToggle(topic.text);
                  }}
                  onPointerDown={(e) => { e.stopPropagation(); }}
                  style={{ width: '28px', height: '28px', padding: 0 }}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full inline-flex items-center justify-center transition-all shadow-sm border-2 z-10 ${
                    starred
                      ? 'text-amber-600 bg-amber-100 border-amber-400 hover:bg-amber-200'
                      : 'text-amber-500 bg-white border-amber-300 hover:bg-amber-50'
                  }`}
                  aria-label={starred ? 'Remove star' : 'Star this note'}
                  title={starred ? 'Tap to un-star' : 'Tap to add to Important Notes'}
                >
                  <Star size={15} className={starred ? 'fill-amber-500' : ''} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
