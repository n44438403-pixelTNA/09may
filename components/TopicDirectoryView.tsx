import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Search, BookOpen, GitCompare, TrendingUp, ChevronRight, List, Flame } from 'lucide-react';
import type { NoteSearchResult } from '../utils/noteSearcher';
import type { LucentNoteEntry, HomeworkItem } from '../types';
import type { NoteStarEntry } from '../services/noteStars';

interface TopicEntry {
  name: string;
  bookNames: string[];
  hits: NoteSearchResult[];
}

interface Props {
  settings: Record<string, any>;
  globalNoteStars: Record<string, NoteStarEntry>;
  onOpenCompare: (hits: NoteSearchResult[], query: string) => void;
  onClose: () => void;
}

const stripHtml = (s: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export const TopicDirectoryView: React.FC<Props> = ({
  settings,
  globalNoteStars,
  onOpenCompare,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  // Build all unique topics from lucentNotes + homework
  const allTopics = useMemo<TopicEntry[]>(() => {
    const map = new Map<string, { bookNames: Set<string>; hits: NoteSearchResult[] }>();

    const addHit = (topicName: string, bookName: string, hit: NoteSearchResult) => {
      const key = topicName.trim().toLowerCase();
      if (!key) return;
      const display = topicName.trim();
      if (!map.has(display)) map.set(display, { bookNames: new Set(), hits: [] });
      const entry = map.get(display)!;
      entry.bookNames.add(bookName);
      entry.hits.push(hit);
    };

    // Lucent notes
    ((settings?.lucentNotes || []) as LucentNoteEntry[]).forEach(entry => {
      const bookName = entry.bookName?.trim() || 'Lucent GK';
      (entry.pages || []).forEach((pg: any, pi: number) => {
        if (!pg.topicName?.trim()) return;
        const fullText = stripHtml(pg.content || '');
        addHit(pg.topicName, bookName, {
          storageKey: `lucent_${entry.id}_${pi}`,
          chapterId: entry.id,
          subjectName: entry.subject || 'lucent',
          board: 'COMPETITION',
          classLevel: 'COMPETITION',
          noteTitle: entry.lessonTitle,
          noteContent: fullText.substring(0, 150),
          noteFullContent: fullText,
          matchCount: 1,
          matchedWords: [pg.topicName],
          chapterTitleFromKey: entry.lessonTitle,
          bookName,
          pageNo: pg.pageNo,
          topicName: pg.topicName,
        });
      });
    });

    // Homework / page-wise competition books
    const customBooks: Record<string, string> = {};
    ((settings?.customBooks || []) as any[]).forEach((b: any) => {
      if (b.id && b.name) customBooks[b.id] = b.name;
    });
    ((settings?.homework || []) as HomeworkItem[]).forEach(hw => {
      if (!hw.topicName?.trim()) return;
      const displayLabel =
        hw.bookId && customBooks[hw.bookId]
          ? customBooks[hw.bookId]
          : hw.bookId === 'sar_sangrah' ? 'Sar Sangrah'
          : hw.bookId === 'speedy_science' ? 'Speedy Science'
          : hw.bookId === 'speedy_social' ? 'Speedy Social'
          : 'Competition Book';
      const plainText = stripHtml(hw.content || '');
      addHit(hw.topicName, displayLabel, {
        storageKey: `hw_${hw.id}`,
        chapterId: hw.id,
        subjectName: displayLabel,
        board: 'COMPETITION',
        classLevel: 'COMPETITION',
        noteTitle: hw.title || `Page ${hw.pageNo || '?'}`,
        noteContent: plainText.substring(0, 150),
        noteFullContent: plainText,
        matchCount: 1,
        matchedWords: [hw.topicName],
        chapterTitleFromKey: hw.title || `Page ${hw.pageNo || '?'}`,
        bookName: displayLabel,
        pageNo: hw.pageNo,
        topicName: hw.topicName,
      });
    });

    return Array.from(map.entries())
      .map(([name, { bookNames, hits }]) => ({
        name,
        bookNames: Array.from(bookNames),
        hits,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'hi'));
  }, [settings]);

  // Trending topics from globalNoteStars
  const trendingTopics = useMemo(() => {
    return Object.values(globalNoteStars)
      .filter(e => e.count > 0 && e.label)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [globalNoteStars]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTopics;
    return allTopics.filter(t => t.name.toLowerCase().includes(q));
  }, [allTopics, query]);

  // Alphabetical groups (only when not filtering)
  const groups = useMemo(() => {
    if (query.trim()) return null;
    const map = new Map<string, TopicEntry[]>();
    filtered.forEach(t => {
      const first = t.name[0]?.toUpperCase() || '#';
      const isAlpha = /[A-Z]/.test(first);
      const isDevanagari = first >= '\u0900' && first <= '\u097F';
      const key = (isAlpha || isDevanagari) ? first : '#';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, query]);

  const allLetters = useMemo(() => groups?.map(([k]) => k) || [], [groups]);

  const handleOpen = (topic: TopicEntry) => {
    if (topic.hits.length < 1) return;
    onOpenCompare(topic.hits, topic.name);
  };

  // Also allow opening a trending topic (label-based, find matching local hits)
  const handleTrending = (label: string) => {
    const norm = label.trim().toLowerCase();
    // Check if it matches a local topic
    const localMatch = allTopics.find(t => t.name.toLowerCase() === norm);
    if (localMatch && localMatch.hits.length >= 1) {
      onOpenCompare(localMatch.hits, localMatch.name);
      return;
    }
    // No local hit — open compare with query (will search across books)
    // We can't build hits here without search; inform user via search prefill
    setQuery(label);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shrink-0 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow">
            <List size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-slate-800 text-base leading-tight">Compare Topic Directory</h2>
            <p className="text-[10px] text-slate-400 font-semibold">
              {allTopics.length} topics · Tap karo → Compare khulega
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all shrink-0"
          >
            <X size={17} />
          </button>
        </div>
        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`${allTopics.length} topics mein search karein...`}
            className="w-full pl-9 pr-9 py-2.5 text-sm font-semibold bg-violet-50 border border-violet-200 rounded-xl text-slate-700 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-violet-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* A-Z jump bar — only when not searching */}
      {!query.trim() && allLetters.length > 4 && (
        <div className="bg-white border-b border-slate-100 shrink-0 px-4 py-1.5 overflow-x-auto">
          <div className="flex gap-1.5 w-max">
            {allLetters.map(letter => (
              <button
                key={letter}
                onClick={() => {
                  setActiveSection(letter);
                  document.getElementById(`topic-section-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all ${activeSection === letter ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* Trending section — only when not searching */}
        {!query.trim() && trendingTopics.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} className="text-amber-500" />
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Trending Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((t, i) => (
                <button
                  key={i}
                  onClick={() => handleTrending(t.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 hover:bg-amber-100 active:scale-95 transition-all"
                >
                  <TrendingUp size={10} className="text-amber-500 shrink-0" />
                  <span className="line-clamp-1 max-w-[120px]">{t.label}</span>
                  <span className="text-amber-400 font-black text-[9px]">·{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {allTopics.length === 0 && (
          <div className="text-center py-20 px-6">
            <GitCompare size={48} className="text-violet-200 mx-auto mb-4" />
            <p className="text-base font-black text-slate-700">Abhi koi topic tagged nahi hai</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Admin Dashboard → Book Notes Manager mein notes add karte waqt <strong>Topic Name</strong> field fill karo. Phir yahan sab topics dikhenge.
            </p>
          </div>
        )}

        {/* Filtered results (search active) */}
        {query.trim() && (
          <div className="px-4 pt-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Search size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-500">"{query}" se koi topic nahi mila</p>
                <p className="text-xs text-slate-400 mt-1">Aur words try karein</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  {filtered.length} topic{filtered.length !== 1 ? 's' : ''} mila
                </p>
                {filtered.map((topic, i) => (
                  <TopicCard key={i} topic={topic} onOpen={handleOpen} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Alphabetical grouped list (no search) */}
        {!query.trim() && groups && groups.map(([letter, topics]) => (
          <div key={letter} id={`topic-section-${letter}`} className="px-4 pt-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                {letter}
              </div>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[9px] font-black text-slate-400 uppercase">{topics.length}</span>
            </div>
            <div className="space-y-2">
              {topics.map((topic, i) => (
                <TopicCard key={i} topic={topic} onOpen={handleOpen} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TopicCard: React.FC<{ topic: TopicEntry; onOpen: (t: TopicEntry) => void }> = ({ topic, onOpen }) => {
  const canCompare = topic.hits.length >= 2;
  return (
    <button
      onClick={() => onOpen(topic)}
      className={`w-full flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] shadow-sm ${canCompare ? 'border-violet-100 hover:border-violet-300 hover:shadow-md' : 'border-slate-100 opacity-60'}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${canCompare ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
        {canCompare ? <GitCompare size={16} /> : <BookOpen size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-800 truncate">{topic.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {topic.bookNames.slice(0, 3).map((b, i) => (
            <span key={i} className="text-[9px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-100">{b}</span>
          ))}
          {topic.bookNames.length > 3 && (
            <span className="text-[9px] font-black text-slate-400">+{topic.bookNames.length - 3} more</span>
          )}
          {!canCompare && (
            <span className="text-[9px] font-bold text-slate-400">· Sirf 1 book (compare ke liye 2+ chahiye)</span>
          )}
        </div>
      </div>
      {canCompare && (
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-lg">{topic.hits.length} notes</span>
          <ChevronRight size={14} className="text-violet-400" />
        </div>
      )}
    </button>
  );
};
