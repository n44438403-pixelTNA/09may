import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Type, Search, RotateCcw, Check, X } from 'lucide-react';
import {
  READING_FONTS,
  TOP_10_READING_FONTS,
  ensureReadingFontLoaded,
  getReadingFontById,
  ReadingFont,
} from '../utils/notesFonts';

const FONT_SIZES = [13, 15, 17, 20] as const;
const FONT_SIZE_KEY = 'nst_reading_font_size';
const FONT_FAMILY_KEY = 'nst_reading_font_family';
export const READING_STYLE_EVENT = 'nst-reading-style-changed';

export const dispatchReadingStyleChange = () => {
  try {
    window.dispatchEvent(new CustomEvent(READING_STYLE_EVENT));
  } catch {}
};

const readStoredIdx = (): number => {
  try {
    const v = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '1', 10);
    return isNaN(v) || v < 0 || v > 3 ? 1 : v;
  } catch {
    return 1;
  }
};
const readStoredFamilyId = (): string | null => {
  try {
    return localStorage.getItem(FONT_FAMILY_KEY);
  } catch {
    return null;
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_TABS: Array<[string, string]> = [
  ['top10', 'Top 10'],
  ['all', 'All'],
  ['sans', 'Sans'],
  ['serif', 'Serif'],
  ['display', 'Display'],
  ['handwriting', 'Script'],
  ['mono', 'Mono'],
  ['indic', 'Hindi'],
];

export const ReadingStylePopover: React.FC<Props> = ({ isOpen, onClose }) => {
  const [fontIdx, setFontIdx] = useState<number>(readStoredIdx);
  const [fontFamilyId, setFontFamilyId] = useState<string | null>(readStoredFamilyId);
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategory, setFontCategory] = useState<
    'top10' | 'all' | 'sans' | 'serif' | 'display' | 'handwriting' | 'mono' | 'indic'
  >('top10');

  // Re-sync from localStorage every time the popover opens, in case the user
  // changed something elsewhere (e.g. the in-card ChunkedNotesReader picker
  // on a Lesson page) since the popover was last mounted.
  useEffect(() => {
    if (!isOpen) return;
    setFontIdx(readStoredIdx());
    setFontFamilyId(readStoredFamilyId());
  }, [isOpen]);

  const activeFont: ReadingFont | null = useMemo(
    () => getReadingFontById(fontFamilyId),
    [fontFamilyId],
  );

  useEffect(() => {
    if (activeFont?.gfontParam) ensureReadingFontLoaded(activeFont.gfontParam);
  }, [activeFont]);

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    let pool: ReadingFont[];
    if (fontCategory === 'top10') pool = TOP_10_READING_FONTS;
    else if (fontCategory === 'all') pool = READING_FONTS;
    else pool = READING_FONTS.filter((f) => f.category === fontCategory);
    if (!q) return pool;
    return pool.filter((f) => f.label.toLowerCase().includes(q));
  }, [fontSearch, fontCategory]);

  const setSize = (newIdx: number) => {
    setFontIdx(newIdx);
    try {
      localStorage.setItem(FONT_SIZE_KEY, String(newIdx));
    } catch {}
    dispatchReadingStyleChange();
    try {
      if (navigator.vibrate) navigator.vibrate(15);
    } catch {}
  };

  const pickFont = (id: string | null) => {
    setFontFamilyId(id);
    try {
      if (id) localStorage.setItem(FONT_FAMILY_KEY, id);
      else localStorage.removeItem(FONT_FAMILY_KEY);
    } catch {}
    dispatchReadingStyleChange();
    try {
      if (navigator.vibrate) navigator.vibrate(20);
    } catch {}
  };

  if (!isOpen) return null;

  // Render via Portal so the popover is positioned against the VIEWPORT, not
  // against any transformed/scrolled ancestor in PdfView. This guarantees the
  // sheet sits perfectly in the centre of the screen on every page.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px]"
      />
      <div
        className="fixed z-[1000] w-[94vw] max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2">
            <Type size={16} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Reading Style</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Live Preview — shows a short notes-style sample line in the
            currently-selected font + size. Updates instantly as the user
            picks a different size button or taps a font from the list, so
            they can see exactly how their notes will look BEFORE closing
            the popup. Mixes English + Hindi sample so Indic and Latin
            fonts both demonstrate correctly. */}
        <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-indigo-50/40 to-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
              Preview
            </span>
            <span className="text-[10px] font-medium text-slate-400 truncate max-w-[55%] text-right">
              {activeFont ? activeFont.label : 'Default (Inter)'} · {FONT_SIZES[fontIdx]}px
            </span>
          </div>
          <div
            className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5 text-slate-800 leading-snug"
            style={{
              fontFamily: activeFont?.family || undefined,
              fontSize: `${FONT_SIZES[fontIdx]}px`,
            }}
          >
            The mitochondria is the powerhouse of the cell.
            <br />
            <span className="text-slate-600">यह कोशिका में ऊर्जा का उत्पादन करती है।</span>
          </div>
        </div>

        {/* Text Size */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Text Size
            </span>
            <span className="text-[11px] font-mono text-slate-700">
              {FONT_SIZES[fontIdx]}px
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fontIdx > 0 && setSize(fontIdx - 1)}
              disabled={fontIdx === 0}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 flex items-center"
              title="Font chhota karein"
            >
              <span style={{ fontSize: '11px', lineHeight: 1 }}>A</span>
              <span className="text-sm ml-0.5">−</span>
            </button>
            <div className="flex-1 flex gap-1">
              {FONT_SIZES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setSize(i)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    i === fontIdx
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => fontIdx < 3 && setSize(fontIdx + 1)}
              disabled={fontIdx === 3}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 flex items-center"
              title="Font bada karein"
            >
              <span style={{ fontSize: '17px', lineHeight: 1 }}>A</span>
              <span className="text-sm ml-0.5">+</span>
            </button>
          </div>
        </div>

        {/* Font Family header */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Font Family
            <span className="ml-1.5 text-[10px] font-medium text-slate-400 normal-case tracking-normal">
              ({READING_FONTS.length}+ choices)
            </span>
          </span>
          {activeFont && (
            <button
              onClick={() => pickFont(null)}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
              title="Default font par wapas jaayein"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              placeholder="Search font name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {CATEGORY_TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFontCategory(key as any)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition ${
                fontCategory === key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Font list */}
        <div className="flex-1 overflow-y-auto border-t border-slate-100">
          <button
            onClick={() => pickFont(null)}
            className={`w-full px-4 py-2 text-left flex items-center justify-between border-b border-slate-100 ${
              !activeFont ? 'bg-indigo-50' : 'hover:bg-slate-50'
            }`}
          >
            <span className="text-sm text-slate-900">Default (Inter)</span>
            {!activeFont && <Check size={14} className="text-indigo-600" />}
          </button>
          {filteredFonts.map((f) => {
            if (f.gfontParam) ensureReadingFontLoaded(f.gfontParam);
            return (
              <button
                key={f.id}
                onClick={() => pickFont(f.id)}
                className={`w-full px-4 py-2 text-left flex items-center justify-between border-b border-slate-50 ${
                  activeFont?.id === f.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className="text-base text-slate-900 truncate"
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </span>
                {activeFont?.id === f.id && (
                  <Check size={14} className="text-indigo-600 shrink-0" />
                )}
              </button>
            );
          })}
          {filteredFonts.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-6">
              No fonts match "{fontSearch}".
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};
