/**
 * McqSearchView.tsx
 * Full-screen MCQ search, browse, and download.
 * - Search bar drives `searchMcqsByWords`
 * - Results grouped by book / topic
 * - Correct answer highlighted; explanation shown on expand
 * - Download visible MCQs as text
 * - Tier limit: admin controls via settings.featureConfig.MCQ_SEARCH.limits
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  X, Search, Download, ChevronDown, ChevronUp, CheckCircle, Circle,
  FileQuestion, Lock, Trophy, BookOpen, Loader2, ChevronRight,
} from 'lucide-react';
import type { McqSearchHit } from '../utils/mcqSearcher';

interface Props {
  initialQuery?: string;
  initialHits?: McqSearchHit[];
  onClose: () => void;
  user?: { subscriptionLevel?: string; isPremium?: boolean };
  settings?: Record<string, any>;
}

function getTierLimit(settings?: Record<string, any>, level?: string): number {
  const cfg = settings?.featureConfig?.MCQ_SEARCH?.limits;
  if (level === 'ULTRA') return cfg?.ultra ?? 9999;
  if (level === 'BASIC') return cfg?.basic ?? 20;
  return cfg?.free ?? 8;
}

function groupByBook(hits: McqSearchHit[]): { key: string; label: string; hits: McqSearchHit[] }[] {
  const map = new Map<string, { label: string; hits: McqSearchHit[] }>();
  for (const h of hits) {
    const key = `${h.bookName}__${h.classLevel}`;
    if (!map.has(key)) {
      const classInfo = h.classLevel === 'COMPETITION' ? '🏆 Competition' : `Class ${h.classLevel}`;
      map.set(key, { label: `${h.bookName} · ${classInfo}`, hits: [] });
    }
    map.get(key)!.hits.push(h);
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const McqCard: React.FC<{ hit: McqSearchHit; idx: number }> = ({ hit, idx }) => {
  const [revealed, setRevealed] = useState(false);
  const [showExp, setShowExp] = useState(false);
  return (
    <div className="bg-white border border-orange-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Question */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-black text-orange-500 bg-orange-50 rounded-full px-1.5 py-0.5 shrink-0 mt-0.5">Q{idx + 1}</span>
          <p className="text-sm font-bold text-slate-800 leading-snug flex-1">{hit.question}</p>
        </div>
      </div>
      {/* Options */}
      <div className="px-4 pb-2 space-y-1">
        {hit.options.map((opt, oi) => {
          const isCorrect = oi === hit.correctAnswer;
          return (
            <div
              key={oi}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all ${
                revealed && isCorrect
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold'
                  : 'bg-slate-50 border border-slate-100 text-slate-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${revealed && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {OPTION_LETTERS[oi]}
              </span>
              <span className="flex-1">{opt}</span>
              {revealed && isCorrect && <CheckCircle size={13} className="text-emerald-600 shrink-0" />}
            </div>
          );
        })}
      </div>
      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          onClick={() => setRevealed(r => !r)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
            revealed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          {revealed ? <CheckCircle size={12} /> : <Circle size={12} />}
          {revealed ? 'Answer shown' : 'Show Answer'}
        </button>
        {hit.explanation && (
          <button
            onClick={() => setShowExp(s => !s)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95"
          >
            {showExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Explanation
          </button>
        )}
      </div>
      {showExp && hit.explanation && (
        <div className="px-4 pb-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <p className="text-[11px] text-blue-800 leading-relaxed">{hit.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const McqSearchView: React.FC<Props> = ({ initialQuery = '', initialHits = [], onClose, user, settings }) => {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<McqSearchHit[]>(initialHits);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initialHits.length > 0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const subLevel = user?.isPremium ? (user.subscriptionLevel ?? 'FREE') : 'FREE';
  const limit = getTierLimit(settings, subLevel);
  const isUltra = subLevel === 'ULTRA';

  const visibleHits = isUltra ? hits : hits.slice(0, limit);
  const hiddenCount = hits.length - visibleHits.length;
  const groups = useMemo(() => groupByBook(visibleHits), [visibleHits]);

  // Auto-expand all groups when results come in
  React.useEffect(() => {
    if (groups.length > 0) {
      setExpandedGroups(new Set(groups.map(g => g.key)));
    }
  }, [groups.length]);

  const doSearch = useCallback(async (q: string) => {
    const words = q.trim().split(/\s+/).filter(w => w.length >= 2);
    if (!words.length) { setHits([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const mod = await import('../utils/mcqSearcher');
      const results = await mod.searchMcqsByWords(words, 100);
      setHits(results);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = () => {
    if (visibleHits.length === 0) return;
    const lines: string[] = [
      `MCQ SEARCH: "${query}"`,
      `Generated: ${new Date().toLocaleDateString('hi-IN')}`,
      `MCQs: ${visibleHits.length}`,
      '',
      '═'.repeat(60),
      '',
    ];
    let counter = 1;
    groups.forEach(g => {
      lines.push(`📚 ${g.label}`);
      lines.push('');
      g.hits.forEach(h => {
        lines.push(`Q${counter++}. ${h.question}`);
        h.options.forEach((o, oi) => {
          lines.push(`   ${OPTION_LETTERS[oi]}) ${o}${oi === h.correctAnswer ? '  ✓' : ''}`);
        });
        if (h.explanation) lines.push(`   💡 ${h.explanation}`);
        lines.push('');
      });
      lines.push('─'.repeat(60));
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcq_search_${query.replace(/\s+/g, '_').slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-lg">
        <div className="p-2 rounded-xl bg-white/20">
          <FileQuestion size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-base leading-tight">MCQ Search</h2>
          <p className="text-[11px] text-orange-100">
            {searched ? (loading ? 'Dhundh raha hai...' : `${hits.length} MCQ mila`) : 'Class 6–12 + Competition'}
          </p>
        </div>
        {visibleHits.length > 0 && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            <Download size={13} /> Download
          </button>
        )}
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors shrink-0">
          <X size={20} />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
            placeholder="MCQ search karein — topic, subject, question..."
            className="w-full pl-9 pr-20 py-2.5 text-sm border border-orange-200 rounded-xl bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400"
          />
          <button
            onClick={() => doSearch(query)}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 text-white px-3 py-1 rounded-lg text-xs font-bold active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Tier info */}
      {!isUltra && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-orange-50 border-b border-orange-100 shrink-0">
          <span className="text-[10px] font-bold text-orange-600">{subLevel}: {limit} MCQ limit</span>
          {hiddenCount > 0 && <span className="text-[10px] text-slate-400">{hiddenCount} aur locked hain</span>}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6 px-3 pt-2">

        {/* Empty / initial state */}
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
              <FileQuestion size={28} className="text-orange-500" />
            </div>
            <p className="text-base font-black text-slate-700 mb-1">MCQ Search</p>
            <p className="text-sm text-slate-400">Koi topic ya word type karein aur Search dabayein</p>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><BookOpen size={12} /> Class 6–12</span>
              <span className="flex items-center gap-1"><Trophy size={12} /> Competition</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={28} className="text-orange-500 animate-spin mb-3" />
            <p className="text-sm text-slate-400">MCQs dhundh raha hai...</p>
          </div>
        )}

        {/* No results */}
        {searched && !loading && hits.length === 0 && (
          <div className="text-center py-12">
            <FileQuestion size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Koi MCQ nahi mila</p>
            <p className="text-xs text-slate-400 mt-1">Dusra keyword try karein</p>
          </div>
        )}

        {/* Results grouped by book */}
        {!loading && groups.map((g) => {
          const isOpen = expandedGroups.has(g.key);
          let counter = 0;
          groups.forEach(gr => {
            if (gr.key === g.key) return;
            if (groups.indexOf(gr) < groups.indexOf(g)) counter += gr.hits.length;
          });
          return (
            <div key={g.key} className="mb-3">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(g.key)}
                className="w-full flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-left mb-1.5"
              >
                <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                  {g.label.includes('Competition') ? <Trophy size={12} className="text-white" /> : <BookOpen size={12} className="text-white" />}
                </div>
                <span className="flex-1 text-xs font-black text-slate-700 truncate">{g.label}</span>
                <span className="text-[10px] font-bold text-orange-500">{g.hits.length} MCQ</span>
                {isOpen ? <ChevronUp size={13} className="text-orange-400 shrink-0" /> : <ChevronDown size={13} className="text-orange-400 shrink-0" />}
              </button>

              {/* MCQ cards */}
              {isOpen && (
                <div className="space-y-2 pl-1">
                  {g.hits.map((hit, hi) => (
                    <McqCard key={`${hit.storageKey}_${hi}`} hit={hit} idx={counter + hi} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Tier lock message */}
        {hiddenCount > 0 && !loading && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-2">
            <Lock size={18} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800">{hiddenCount} aur MCQ locked hain</p>
              <p className="text-[10px] text-slate-500">
                {subLevel === 'BASIC' ? 'Ultra plan mein upgrade karein unlimited MCQ ke liye' : 'Basic ya Ultra plan mein upgrade karein'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
