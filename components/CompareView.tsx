import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Download, BookOpen, ChevronDown, ChevronUp, Volume2, GitCompare, Maximize2, Minimize2, CheckCircle2, Shuffle, MapPin, ChevronsRight } from 'lucide-react';
import { ChunkedNotesReader } from './ChunkedNotesReader';
import type { NoteSearchResult, PageBlob } from '../utils/noteSearcher';
import { loadAllPagesFromKey } from '../utils/noteSearcher';

interface Props {
  hits: NoteSearchResult[];
  query: string;
  onClose: () => void;
  user?: { subscriptionLevel?: string; isPremium?: boolean };
  settings?: Record<string, any>;
}

type Mode = 'topic-compare' | 'book-by-book' | 'read-all';

// ── Helpers ──

function normalizeSentence(s: string): string {
  return s.toLowerCase().replace(/[^\u0900-\u097fa-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function getSignificantWords(s: string): string[] {
  return normalizeSentence(s).split(' ').filter(w => w.length >= 3);
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(getSignificantWords(a));
  const wb = new Set(getSignificantWords(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  wa.forEach(w => { if (wb.has(w)) common++; });
  return common / Math.min(wa.size, wb.size);
}

function splitIntoPoints(text: string): string[] {
  return text
    .split(/[\n।]+/)
    .map(s => s.replace(/^[-•●▪\*\d]+[\.\)]\s*/, '').trim())
    .filter(s => s.length >= 10);
}

// ── Topic Boundary Extraction ──

interface TopicSection {
  topicTitle: string;   // The heading line that matched the query
  topicEnd: string;     // First line of the NEXT topic (so reader knows where it ends)
  sectionText: string;  // All lines from heading to next heading
}

// ── Line classifier ──

type LineKind =
  | { type: 'markdown'; level: number; text: string }  // ## Title  → level 2
  | { type: 'numbered'; text: string }                  // 1. Babar
  | { type: 'emoji-heading'; text: string }             // 🏁 Title
  | { type: 'end-marker'; text: string }                // THE END / SAMPANN / 🛑
  | { type: 'separator' }                               // --- / ===
  | { type: 'content'; text: string };

const END_WORDS = [
  'the end', 'topic closed', 'topic finished', 'sampann', 'samaapt',
  'समाप्त', 'सम्पन्न', 'yahan khatam', 'chapter end', 'end of topic',
  'topic wrap', 'topic complete', '[ topic closed ]', '🏁', '🔚', '🛑',
  'status: 100%',
];

const END_EMOJI_RX = /[🏁🔚🛑]/u;

function classifyLine(raw: string): LineKind {
  const line = raw.trim();

  // Markdown heading: ## Title
  const mdMatch = line.match(/^(#{1,6})\s+(.+)/);
  if (mdMatch) return { type: 'markdown', level: mdMatch[1].length, text: mdMatch[2].trim() };

  // Hard separator
  if (/^([=\-─━*]{3,})\s*$/.test(line)) return { type: 'separator' };

  const lower = line.toLowerCase();

  // End marker (must check before emoji-heading so 🏁 lines are caught here)
  if (END_WORDS.some(w => lower.includes(w)) || END_EMOJI_RX.test(line)) {
    return { type: 'end-marker', text: line };
  }

  // Emoji-heading: line starts with emoji, is short
  if (/^\p{Emoji}/u.test(line) && line.length < 100) {
    return { type: 'emoji-heading', text: line };
  }

  // Numbered heading: "1. Title" or "1) Title" — NOT a list item inside content
  const numMatch = line.match(/^(\d{1,2})[\.\)]\s+(.+)/);
  if (numMatch && numMatch[2].length < 80) return { type: 'numbered', text: numMatch[2].trim() };

  return { type: 'content', text: line };
}

/** Assign a comparable "rank" to a heading so we can find the NEXT heading of equal/higher rank. */
function headingRank(kind: LineKind): number {
  if (kind.type === 'markdown') return kind.level;   // 1 = #, 2 = ##, 3 = ###
  if (kind.type === 'emoji-heading') return 2;        // treat like ##
  if (kind.type === 'numbered') return 2;             // treat like ##
  return 99;
}

/**
 * Smart topic-boundary extraction.
 *
 * Understands:
 *   - Markdown headings  (##, ###, ####)
 *   - Emoji headings     (🏁 Title, ✅ Phase 1 …)
 *   - Numbered sections  (1. Babar, 2. Humayun)
 *   - Separator lines    (---, ===, ═══)
 *   - End markers        (THE END, SAMPANN, समाप्त, 🛑, 🔚, [TOPIC CLOSED] …)
 */
function extractTopicSection(fullText: string, queryWords: string[]): TopicSection | null {
  const effectiveWords = queryWords.filter(w => w.length >= 2);
  if (effectiveWords.length === 0) return null;

  const rawLines = fullText.split('\n').filter(l => l.trim().length > 0);
  if (rawLines.length < 2) return null;

  // Classify every line
  const classified = rawLines.map((raw, idx) => ({ idx, raw: raw.trim(), kind: classifyLine(raw) }));

  const hasAlpha = (s: string) => /[\u0900-\u097fa-zA-Z]/.test(s);

  const scoreLine = (raw: string): number => {
    const lower = raw.toLowerCase();
    return effectiveWords.filter(w => lower.includes(w.toLowerCase())).length;
  };

  // ── Find the best start heading that contains query words ──
  const headingTypes: LineKind['type'][] = ['markdown', 'emoji-heading', 'numbered'];

  // Also allow plain short lines (fallback)
  const isShortPlainHeading = (raw: string, kind: LineKind) =>
    kind.type === 'content' && hasAlpha(raw) && raw.length < 70 &&
    !raw.endsWith(',') && !raw.endsWith(';');

  const candidates = classified
    .map(c => {
      const score = scoreLine(c.raw);
      const isHeading = headingTypes.includes(c.kind.type) || isShortPlainHeading(c.raw, c.kind);
      return { ...c, score, isHeading };
    })
    .filter(c => c.score > 0 && c.isHeading)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Among equal score: prefer explicit headings over plain short lines
      const aIsExplicit = headingTypes.includes(a.kind.type) ? 0 : 1;
      const bIsExplicit = headingTypes.includes(b.kind.type) ? 0 : 1;
      if (aIsExplicit !== bIsExplicit) return aIsExplicit - bIsExplicit;
      return a.raw.length - b.raw.length; // shorter = more heading-like
    });

  if (candidates.length === 0) return null;

  const startEntry = candidates[0];
  const startIdx = startEntry.idx;
  const topicTitle = startEntry.raw;
  const startRank = headingRank(startEntry.kind);

  // ── Find topic end: next heading of same/higher rank, separator, or end-marker ──
  let endIdx = classified.length;
  for (let i = startIdx + 1; i < classified.length; i++) {
    const { kind, raw } = classified[i];

    // End marker → hard stop
    if (kind.type === 'end-marker') {
      // Include the end marker itself in the section so it's visible
      endIdx = i + 1;
      break;
    }

    // Separator → hard stop
    if (kind.type === 'separator') { endIdx = i; break; }

    // Another heading of same or higher rank (lower level number) that doesn't match query
    if (headingTypes.includes(kind.type)) {
      const rank = headingRank(kind);
      if (rank <= startRank && scoreLine(raw) === 0 && i > startIdx + 2) {
        endIdx = i; break;
      }
    }

    // Plain short line that looks like a new section heading, no query words
    if (isShortPlainHeading(raw, kind) && scoreLine(raw) === 0 && hasAlpha(raw) && i > startIdx + 3) {
      endIdx = i; break;
    }
  }

  const sectionLines = classified.slice(startIdx, endIdx).map(c => c.raw);
  const sectionText = sectionLines.join('\n');

  // The line just after our section = topicEnd (what comes next)
  const nextEntry = classified[endIdx];
  const topicEnd = nextEntry ? nextEntry.raw : '';

  if (sectionLines.length < 2) return null;
  return { topicTitle, topicEnd, sectionText };
}

// ── Compare Engine ──

interface BookContent {
  bookName: string;
  pageNo?: string;
  text: string;
  topicTitle?: string;
  topicEnd?: string;
}

interface TopicCompareResult {
  common: string[];
  extra: {
    bookName: string;
    pageNo?: string;
    points: string[];
    topicTitle?: string;
    topicEnd?: string;
  }[];
}

function computeTopicComparison(bookContents: BookContent[]): TopicCompareResult {
  if (bookContents.length === 0) return { common: [], extra: [] };

  const bookPoints = bookContents.map(bc => ({
    bookName: bc.bookName,
    pageNo: bc.pageNo,
    topicTitle: bc.topicTitle,
    topicEnd: bc.topicEnd,
    points: splitIntoPoints(bc.text),
  }));

  const common: string[] = [];
  const usedCommon = new Set<string>();
  const extraPerBook = bookPoints.map(b => ({
    bookName: b.bookName,
    pageNo: b.pageNo,
    topicTitle: b.topicTitle,
    topicEnd: b.topicEnd,
    points: [] as string[],
  }));

  bookPoints.forEach((book, bi) => {
    book.points.forEach(point => {
      let matchedInOther = false;
      for (let other = 0; other < bookPoints.length; other++) {
        if (other === bi) continue;
        if (bookPoints[other].points.some(p => wordOverlap(point, p) >= 0.5)) {
          matchedInOther = true;
          break;
        }
      }
      if (matchedInOther) {
        const alreadyIn = common.some(c => wordOverlap(point, c) >= 0.65);
        const norm = normalizeSentence(point);
        if (!alreadyIn && !usedCommon.has(norm)) {
          common.push(point);
          usedCommon.add(norm);
        }
      } else {
        extraPerBook[bi].points.push(point);
      }
    });
  });

  return { common, extra: extraPerBook };
}

// ── Component ──

export const CompareView: React.FC<Props> = ({ hits, query, onClose, user, settings }) => {
  const [mode, setMode] = useState<Mode>('topic-compare');
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set(hits.map((_, i) => i)));

  const [topicResult, setTopicResult] = useState<TopicCompareResult | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const [floatPos, setFloatPos] = useState({ x: window.innerWidth - 72, y: Math.floor(window.innerHeight * 0.55) });
  const floatDragging = useRef(false);
  const floatMoved = useRef(false);
  const floatStart = useRef({ px: 0, py: 0, bx: 0, by: 0 });

  // Group hits by bookName (deduplicate)
  const books = useMemo(() => {
    const seen = new Set<string>();
    return hits.filter(h => {
      const key = h.bookName || h.subjectName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [hits]);

  const combinedContent = useMemo(() => {
    return books.map(h => {
      const bookName = h.bookName || h.subjectName;
      return `${bookName}:\n${(h.noteContent || '').trim()}`;
    }).join('\n\n');
  }, [books]);

  // ── Load topic compare with topic-boundary extraction ──
  const loadTopicCompare = useCallback(async () => {
    setTopicLoading(true);
    setTopicResult(null);
    try {
      const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
      const bookContents: BookContent[] = [];

      // Check if ALL hits have the same topicName — if so, use topic-name based match
      const topicNames = books.map(b => b.topicName).filter(Boolean);
      const allSameTopicName = topicNames.length === books.length && new Set(topicNames).size === 1;

      await Promise.all(books.map(async (book) => {
        const bookName = book.bookName || book.subjectName;
        const key = book.storageKey;

        let fullText = '';

        // hw_* and lucent_* are virtual keys — use noteFullContent directly
        if (key.startsWith('hw_') || key.startsWith('lucent_')) {
          fullText = book.noteFullContent || book.noteContent || '';
        } else {
          // Real cached chapter — load all pages and pick best match
          const blobs = await loadAllPagesFromKey(key, words);
          if (blobs.length > 0 && blobs[0].text.length > 10) {
            fullText = blobs[0].text;
          } else {
            fullText = book.noteFullContent || book.noteContent || '';
          }
        }

        if (fullText.length <= 10) return;

        // If this note has an explicit topicName tag, use it to extract the section
        // more precisely (prepend as heading so extractTopicSection finds it)
        if (book.topicName) {
          const topicWords = book.topicName.split(/\s+/).filter(w => w.length >= 2);
          const searchWords = allSameTopicName ? topicWords : words;
          const section = extractTopicSection(fullText, searchWords);
          if (section) {
            bookContents.push({
              bookName,
              pageNo: book.pageNo,
              text: section.sectionText,
              topicTitle: book.topicName,   // Use the admin-tagged topic name as authoritative
              topicEnd: section.topicEnd,
            });
          } else {
            // Full text if section not found — the whole note is about this topic
            bookContents.push({
              bookName,
              pageNo: book.pageNo,
              text: fullText,
              topicTitle: book.topicName,
            });
          }
          return;
        }

        // Standard path: try to extract topic-specific section by query words
        const section = extractTopicSection(fullText, words);

        if (section) {
          bookContents.push({
            bookName,
            pageNo: book.pageNo,
            text: section.sectionText,
            topicTitle: section.topicTitle,
            topicEnd: section.topicEnd,
          });
        } else {
          // Full text fallback
          bookContents.push({ bookName, pageNo: book.pageNo, text: fullText });
        }
      }));

      setTopicResult(computeTopicComparison(bookContents));
    } finally {
      setTopicLoading(false);
    }
  }, [books, query]);

  useEffect(() => { loadTopicCompare(); }, []);
  useEffect(() => {
    if (mode === 'topic-compare' && !topicResult && !topicLoading) loadTopicCompare();
  }, [mode]);

  const toggleBook = (idx: number) => {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ── Floating drag ──
  const onFloatTouchStart = (e: React.TouchEvent) => {
    floatDragging.current = true; floatMoved.current = false;
    floatStart.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, bx: floatPos.x, by: floatPos.y };
  };
  const onFloatTouchMove = (e: React.TouchEvent) => {
    if (!floatDragging.current) return;
    const dx = e.touches[0].clientX - floatStart.current.px;
    const dy = e.touches[0].clientY - floatStart.current.py;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) floatMoved.current = true;
    setFloatPos({ x: Math.max(8, Math.min(window.innerWidth - 68, floatStart.current.bx + dx)), y: Math.max(8, Math.min(window.innerHeight - 68, floatStart.current.by + dy)) });
    e.preventDefault();
  };
  const onFloatTouchEnd = () => { floatDragging.current = false; };
  const onFloatMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); floatDragging.current = true; floatMoved.current = false;
    floatStart.current = { px: e.clientX, py: e.clientY, bx: floatPos.x, by: floatPos.y };
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - floatStart.current.px; const dy = ev.clientY - floatStart.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) floatMoved.current = true;
      setFloatPos({ x: Math.max(8, Math.min(window.innerWidth - 68, floatStart.current.bx + dx)), y: Math.max(8, Math.min(window.innerHeight - 68, floatStart.current.by + dy)) });
    };
    const onUp = () => { floatDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  // ── Download ──
  const handleDownload = () => {
    const lines: string[] = [`COMPARE: "${query}"`, `Books: ${books.length}`, '', '═'.repeat(60), ''];
    if (mode === 'topic-compare' && topicResult) {
      lines.push(`✅ COMMON POINTS (${topicResult.common.length}):`, '');
      topicResult.common.forEach((pt, i) => lines.push(`${i + 1}. ${pt}`));
      lines.push('', '─'.repeat(60), '');
      topicResult.extra.forEach(({ bookName, pageNo, points, topicTitle, topicEnd }) => {
        lines.push(`📚 ${bookName}${pageNo ? ` — Page ${pageNo}` : ''}`);
        if (topicTitle) lines.push(`   Topic: ${topicTitle}`);
        if (topicEnd) lines.push(`   Ends before: ${topicEnd}`);
        lines.push(`   Extra Points (${points.length}):`);
        points.forEach((pt, i) => lines.push(`  ${i + 1}. ${pt}`));
        lines.push('');
      });
    } else {
      books.forEach((h, i) => {
        lines.push(`📚 ${i + 1}. ${h.bookName || h.subjectName}`);
        if (h.pageNo) lines.push(`   Page: ${h.pageNo}`);
        lines.push('', h.noteFullContent || h.noteContent, '', '─'.repeat(60), '');
      });
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `compare_${query.replace(/\s+/g, '_').slice(0, 40)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-hidden">

      {/* Header */}
      {!focusMode && (
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-lg">
          <div className="p-2 rounded-xl bg-white/20"><GitCompare size={18} /></div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-base leading-tight">Compare Books</h2>
            <p className="text-[11px] text-violet-200 truncate">
              "{query}" — {books.length} book{books.length !== 1 ? 's' : ''} mein mila
            </p>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0">
            <Download size={13} /> Download
          </button>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Mode tabs */}
      {!focusMode && (
        <div className="flex bg-slate-100 p-1 gap-1 shrink-0 mx-3 mt-3 rounded-xl">
          <button onClick={() => setMode('topic-compare')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'topic-compare' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>
            <Shuffle size={12} /> Compare
          </button>
          <button onClick={() => setMode('book-by-book')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'book-by-book' ? 'bg-white shadow text-violet-700' : 'text-slate-500'}`}>
            <BookOpen size={12} /> Book Wise
          </button>
          <button onClick={() => setMode('read-all')} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'read-all' ? 'bg-white shadow text-violet-700' : 'text-slate-500'}`}>
            <Volume2 size={12} /> Read All
          </button>
        </div>
      )}

      {/* Focus mode mini bar */}
      {focusMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white shrink-0">
          <span className="text-xs font-bold text-slate-400 truncate">"{query}"</span>
          <button onClick={() => setFocusMode(false)} className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white">
            <Minimize2 size={14} /> Exit Focus
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* ── TOPIC COMPARE MODE ── */}
        {mode === 'topic-compare' && (
          <div className="px-3 pt-3 space-y-3">

            {topicLoading && (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">Topic-wise compare ho raha hai...</p>
                <p className="text-xs text-slate-400 mt-1">{books.length} books se
                  {books.some(b => b.topicName)
                    ? ` tagged topic "${books.find(b => b.topicName)?.topicName}" ka pura section nikal raha hai`
                    : ` sirf "${query}" wala section nikal raha hai`}
                </p>
              </div>
            )}

            {!topicLoading && topicResult && (
              <>
                {/* Book + Topic info strip */}
                <div className="flex flex-wrap gap-2">
                  {books.map((h, i) => {
                    const bookName = h.bookName || h.subjectName;
                    const bookExtra = topicResult.extra[i];
                    return (
                      <div key={i} className="flex flex-col gap-1 bg-violet-50 border border-violet-200 rounded-2xl px-3 py-2 min-w-0 max-w-full">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-[11px] font-black text-violet-800 truncate">{bookName}</span>
                          {h.pageNo && <span className="text-[10px] text-violet-400 font-medium shrink-0">· p.{h.pageNo}</span>}
                        </div>
                        {bookExtra?.topicTitle && (
                          <div className="flex items-start gap-1 pl-5">
                            <MapPin size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-emerald-700 font-bold leading-snug">{bookExtra.topicTitle}</span>
                          </div>
                        )}
                        {bookExtra?.topicEnd && (
                          <div className="flex items-start gap-1 pl-5">
                            <ChevronsRight size={10} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-slate-400 font-medium leading-snug line-clamp-1">Aage: {bookExtra.topicEnd}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── COMMON POINTS ── */}
                <div className="rounded-2xl border-2 border-emerald-400 overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-black">Common Points</p>
                      <p className="text-[10px] text-emerald-100">
                        {topicResult.common.length > 0
                          ? `${topicResult.common.length} points jo sab books mein hain`
                          : 'Sab books mein common koi clear point nahi mila'}
                      </p>
                    </div>
                  </div>
                  {topicResult.common.length === 0 ? (
                    <div className="bg-white px-4 py-5 text-center">
                      <p className="text-xs text-slate-400">Books ke notes kaafi alag hain — neeche har book ke extra points dekh sakte hain.</p>
                    </div>
                  ) : (
                    <div className="bg-white px-3 pb-2">
                      <ChunkedNotesReader
                        key={`compare-common-${query}`}
                        content={topicResult.common.join('\n')}
                        topBarLabel="Common Points"
                        searchQuery={query}
                        language="hi-IN"
                      />
                    </div>
                  )}
                </div>

                {/* ── EXTRA POINTS (per book) ── */}
                {topicResult.extra.map(({ bookName, pageNo, points, topicTitle, topicEnd }, bi) => {
                  if (points.length === 0) return null;
                  return (
                    <div key={bi} className="rounded-2xl border border-violet-200 overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-[11px] flex items-center justify-center shrink-0">{bi + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{bookName}</p>
                            <p className="text-[10px] text-violet-200">
                              {pageNo ? `Page ${pageNo} · ` : ''}{points.length} Extra Points
                            </p>
                          </div>
                        </div>
                        {/* Topic start/end inside extra-points card */}
                        {(topicTitle || topicEnd) && (
                          <div className="mt-2 ml-8 flex flex-col gap-1">
                            {topicTitle && (
                              <div className="flex items-center gap-1.5">
                                <MapPin size={10} className="text-emerald-300 shrink-0" />
                                <span className="text-[10px] text-emerald-200 font-bold truncate">{topicTitle}</span>
                              </div>
                            )}
                            {topicEnd && (
                              <div className="flex items-center gap-1.5">
                                <ChevronsRight size={10} className="text-violet-300 shrink-0" />
                                <span className="text-[10px] text-violet-200 truncate">Aage: {topicEnd}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-white px-3 pb-2">
                        <ChunkedNotesReader
                          key={`compare-extra-${bi}-${query}`}
                          content={points.join('\n')}
                          topBarLabel={`${bookName}${pageNo ? ` · Pg ${pageNo}` : ''}`}
                          searchQuery={query}
                          language="hi-IN"
                        />
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={loadTopicCompare}
                  className="w-full py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  🔄 Dobara Compare Karein
                </button>
              </>
            )}

            {!topicLoading && !topicResult && (
              <div className="text-center py-10">
                <p className="text-xs text-slate-400 mb-3">Data load nahi hua.</p>
                <button onClick={loadTopicCompare} className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Retry</button>
              </div>
            )}
          </div>
        )}

        {/* ── BOOK WISE MODE ── */}
        {mode === 'book-by-book' && (
          <div className="space-y-3 px-3 pt-3">
            {books.map((h, i) => {
              const bookName = h.bookName || h.subjectName;
              const classInfo = h.classLevel === 'COMPETITION' ? 'Competition' : `Class ${h.classLevel}`;
              const isOpen = expandedBooks.has(i);
              return (
                <div key={`${h.storageKey}_${i}`} className="rounded-2xl border border-violet-100 overflow-hidden shadow-sm">
                  <button
                    className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 text-left"
                    onClick={() => toggleBook(i)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-sm shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{bookName}</p>
                      <p className="text-[10px] font-bold text-violet-500">
                        {classInfo} · {h.subjectName.replace(/-/g, ' ')}
                        {h.pageNo ? ` · Page ${h.pageNo}` : ''}
                        {' · '}{h.matchCount} match{h.matchCount !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-violet-400 shrink-0" /> : <ChevronDown size={16} className="text-violet-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="bg-white px-3 pb-2">
                      {h.matchedWords && h.matchedWords.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-1 pt-2 pb-1">
                          {h.matchedWords.map((w, wi) => (
                            <span key={wi} className="bg-violet-100 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded-full">{w}</span>
                          ))}
                        </div>
                      )}
                      <ChunkedNotesReader
                        key={`compare-book-${i}-${query}`}
                        content={h.noteFullContent || h.noteContent || ''}
                        topBarLabel={`${bookName}${h.pageNo ? ` · Pg ${h.pageNo}` : ''}`}
                        searchQuery={query}
                        language="hi-IN"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── READ ALL MODE ── */}
        {mode === 'read-all' && (
          <div className="px-3 pt-3">
            <ChunkedNotesReader
              content={combinedContent}
              topBarLabel={`Compare: ${query}`}
              searchQuery={query}
              language="hi-IN"
            />
          </div>
        )}
      </div>

      {/* ── Floating Focus Button ── */}
      <div
        style={{ position: 'fixed', left: floatPos.x, top: floatPos.y, zIndex: 350, touchAction: 'none', userSelect: 'none' }}
        onTouchStart={onFloatTouchStart}
        onTouchMove={onFloatTouchMove}
        onTouchEnd={onFloatTouchEnd}
        onMouseDown={onFloatMouseDown}
      >
        <button
          onClick={() => { if (!floatMoved.current) setFocusMode(prev => !prev); }}
          className={`w-14 h-14 rounded-full text-white shadow-2xl flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform border-2 border-white/30 ${focusMode ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 'bg-gradient-to-br from-violet-600 to-indigo-600'}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {focusMode
            ? <><Minimize2 size={20} /><span className="text-[8px] font-black leading-none">EXIT</span></>
            : <><Maximize2 size={20} /><span className="text-[8px] font-black leading-none">FOCUS</span></>
          }
        </button>
      </div>
    </div>
  );
};
