/**
 * Revision Hub V2 — Spaced-Repetition + Pure Local-Search (No AI)
 *
 * Cycle:
 *  MCQ galat → Notes due tomorrow → MCQ due after → good score → longer interval
 *
 * Notes finding: local storage ke sabhi cached chapters mein wrong-question words
 * se match karta hai, jitna zyada match utna pehle dikhega. AI use nahi hota.
 *
 * Tabs:
 *  [Aaj Ka Kaam] — today's notes + MCQ due
 *  [Schedule]    — full upcoming schedule + how it works info
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft, BrainCircuit, BookOpen, Trash2, ChevronRight, Sparkles,
  CheckCircle, ChevronDown, ChevronUp, Calendar, Zap, Info,
  RefreshCw, Target, Search, FileText, AlertCircle, ListChecks, Clock
} from 'lucide-react';
import type { SystemSettings, User } from '../types';
import {
  getDueItems, getUpcomingItems, markNotesReviewed, markMcqDone,
  clearTracker, getAllBuckets, bucketKey, keywordsForBucket, type WeakBucket
} from '../utils/revisionTrackerV2';
import { searchNotesByWords, type NoteSearchResult } from '../utils/noteSearcher';

interface Props {
  user: User;
  settings?: SystemSettings;
  onBack: () => void;
  onOpenChapter?: (subjectId: string, chapterId: string, chapterTitle?: string) => void;
  onOpenMcq?: (subjectId: string, chapterId: string, chapterTitle?: string, topic?: string) => void;
}

type ActiveTab = 'daily' | 'schedule';

function daysUntil(ts: number): string {
  const diff = ts - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function accuracyColor(acc: number): string {
  if (acc < 0.3) return 'rose';
  if (acc < 0.5) return 'orange';
  if (acc < 0.7) return 'amber';
  return 'emerald';
}

interface SubjectGroup {
  subjectId: string;
  subjectName: string;
  chapters: ChapterGroup[];
}
interface ChapterGroup {
  chapterId: string;
  chapterTitle: string;
  buckets: WeakBucket[];
}

function groupBySubjectChapter(items: WeakBucket[]): SubjectGroup[] {
  const map: Record<string, SubjectGroup> = {};
  for (const b of items) {
    const sid = b.subjectId;
    const sname = b.subjectName || sid;
    if (!map[sid]) map[sid] = { subjectId: sid, subjectName: sname, chapters: [] };
    const sg = map[sid];
    let cg = sg.chapters.find(c => c.chapterId === b.chapterId);
    if (!cg) {
      cg = { chapterId: b.chapterId, chapterTitle: b.chapterTitle || b.chapterId, buckets: [] };
      sg.chapters.push(cg);
    }
    cg.buckets.push(b);
  }
  return Object.values(map);
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const RevisionHubV2: React.FC<Props> = ({ user, settings, onBack, onOpenChapter, onOpenMcq }) => {
  const revisionConfig = settings?.revisionConfig;

  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [dueItems, setDueItems] = useState<WeakBucket[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<WeakBucket[]>([]);
  const [totalTracked, setTotalTracked] = useState(0);
  const [allBuckets, setAllBuckets] = useState<WeakBucket[]>([]);

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [noteResults, setNoteResults] = useState<Record<string, NoteSearchResult[]>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});
  const [selfRateKey, setSelfRateKey] = useState<string | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const reload = useCallback(() => {
    const due = getDueItems();
    setDueItems(due);
    setUpcomingItems(getUpcomingItems(30));
    const all = getAllBuckets();
    setAllBuckets(all);
    setTotalTracked(all.filter(b => b.wrongQuestions.length > 0).length);
    setNoteResults({});
    setLoadingNotes({});
    setSelfRateKey(null);
  }, []);

  useEffect(() => { reload(); }, []);

  const dueNotes = useMemo(() => dueItems.filter(b => !b.stage || b.stage === 'NOTES'), [dueItems]);
  const dueMcq   = useMemo(() => dueItems.filter(b => b.stage === 'MCQ'),               [dueItems]);

  const notesGroups    = useMemo(() => groupBySubjectChapter(dueNotes),    [dueNotes]);
  const mcqGroups      = useMemo(() => groupBySubjectChapter(dueMcq),      [dueMcq]);
  const upcomingGroups = useMemo(() => groupBySubjectChapter(
    showAllUpcoming ? upcomingItems : upcomingItems.slice(0, 10)
  ), [upcomingItems, showAllUpcoming]);

  const toggleChapter = (key: string) =>
    setExpandedChapters(p => ({ ...p, [key]: !p[key] }));

  // ── Load matching notes for a bucket from local storage (no AI) ──────────
  const loadNotesForBucket = useCallback(async (b: WeakBucket) => {
    const k = bucketKey(b.subjectId, b.chapterId, b.pageKey, b.topic);
    if (noteResults[k] !== undefined || loadingNotes[k]) return;

    setLoadingNotes(p => ({ ...p, [k]: true }));
    try {
      const words = keywordsForBucket(b);
      const results = await searchNotesByWords(words, 10);
      setNoteResults(p => ({ ...p, [k]: results }));
    } catch {
      setNoteResults(p => ({ ...p, [k]: [] }));
    } finally {
      setLoadingNotes(p => ({ ...p, [k]: false }));
    }
  }, [noteResults, loadingNotes]);

  // ── Mark notes reviewed → schedule MCQ ──────────────────────────────────
  const handleNotesRead = (b: WeakBucket, noteResult?: NoteSearchResult) => {
    const k = bucketKey(b.subjectId, b.chapterId, b.pageKey, b.topic);
    markNotesReviewed(k, revisionConfig);
    if (noteResult) {
      onOpenChapter?.(b.subjectId, noteResult.chapterId, noteResult.noteTitle || noteResult.chapterTitleFromKey);
    } else {
      onOpenChapter?.(b.subjectId, b.chapterId, b.chapterTitle);
    }
    reload();
  };

  // ── MCQ open + self-rating ────────────────────────────────────────────────
  const handleMcqOpen = (b: WeakBucket) => {
    const k = bucketKey(b.subjectId, b.chapterId, b.pageKey, b.topic);
    setSelfRateKey(k);
    if (onOpenMcq) onOpenMcq(b.subjectId, b.chapterId, b.chapterTitle, b.topic);
    else if (onOpenChapter) onOpenChapter(b.subjectId, b.chapterId, b.chapterTitle);
  };

  const handleSelfRate = (key: string, score: 'weak' | 'average' | 'strong') => {
    const acc = score === 'strong' ? 0.85 : score === 'average' ? 0.60 : 0.25;
    markMcqDone(key, acc, revisionConfig);
    setSelfRateKey(null);
    reload();
  };

  const handleClear = () => {
    clearTracker();
    setShowClearConfirm(false);
    reload();
  };

  const totalDue = dueItems.length;

  // ── Sub-components ────────────────────────────────────────────────────────

  const SectionHeader = ({
    icon, label, count, color,
  }: { icon: React.ReactNode; label: string; count: number; color: string }) => (
    <div className="flex items-center gap-2 px-1 mb-2">
      <div className={`w-7 h-7 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center`}>{icon}</div>
      <p className="text-sm font-black text-slate-800">{label}</p>
      <span className={`ml-auto text-xs font-bold bg-${color}-100 text-${color}-700 rounded-full px-2 py-0.5`}>{count}</span>
    </div>
  );

  const EmptyCard = ({ msg }: { msg: string }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
      <CheckCircle size={22} className="mx-auto text-emerald-400 mb-2" />
      <p className="text-sm font-bold text-slate-600">{msg}</p>
    </div>
  );

  // Notes bucket card
  const NotesBucketCard = ({ b }: { b: WeakBucket }) => {
    const k = bucketKey(b.subjectId, b.chapterId, b.pageKey, b.topic);
    const acc = b.correct / Math.max(b.total, 1);
    const tone = accuracyColor(acc);
    const results = noteResults[k];
    const loading = loadingNotes[k] ?? false;
    const isSearched = results !== undefined;

    return (
      <div className="border-b border-slate-100 last:border-b-0">
        <div className="px-4 py-3 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-${tone}-50 text-${tone}-600 flex flex-col items-center justify-center shrink-0 font-black`}>
            <span className="text-xs leading-none">{Math.round(acc * 100)}%</span>
            <span className="text-[8px] uppercase">acc</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{b.topic}</p>
            {b.pageLabel && <p className="text-[10px] text-slate-500">{b.pageLabel}</p>}
            <p className="text-[10px] text-rose-500 font-bold">{b.wrongCount} galat · {b.total} attempts</p>
          </div>
          <button
            onClick={() => loadNotesForBucket(b)}
            className={`shrink-0 flex items-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors ${isSearched ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            disabled={loading}
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
            {isSearched ? 'Searched' : 'Find Notes'}
          </button>
        </div>

        {loading && (
          <div className="px-4 pb-3 flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw size={12} className="animate-spin" /> Searching cached notes…
          </div>
        )}

        {isSearched && !loading && (
          <div className="px-4 pb-3 space-y-2">
            {results.length === 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>No cached notes match this topic yet. Open the chapter notes once so they get cached, then try again.</span>
              </div>
            )}
            {results.map((r, i) => (
              <div key={r.storageKey + i} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
                  <FileText size={13} className="text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{r.noteTitle || r.subjectName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 leading-none truncate max-w-[140px]">
                        📚 {r.bookName || r.subjectName}
                      </span>
                      {r.pageNo && (
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 leading-none shrink-0">
                          📄 Topic {r.pageNo}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 shrink-0">{r.board} · Class {r.classLevel}</span>
                    </div>
                  </div>
                  <div className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                    r.matchCount >= 4 ? 'bg-emerald-100 text-emerald-700' :
                    r.matchCount >= 3 ? 'bg-indigo-100 text-indigo-700' :
                    r.matchCount >= 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {r.matchCount} match{r.matchCount !== 1 ? 'es' : ''}
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 px-3 py-2 leading-relaxed line-clamp-3">{r.noteContent}</p>
                {r.matchedWords.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {r.matchedWords.slice(0, 6).map(w => (
                      <span key={w} className="text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-1.5 py-0.5">{w}</span>
                    ))}
                  </div>
                )}
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleNotesRead(b, r)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    <BookOpen size={13} /> Yeh Notes Padho
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => handleNotesRead(b, undefined)}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 text-xs font-bold py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              <BookOpen size={13} /> Original Chapter Kholo
            </button>
          </div>
        )}

        {b.wrongQuestions.length > 0 && !isSearched && !loading && (
          <div className="px-4 pb-3 space-y-1.5">
            {b.wrongQuestions.slice(0, 2).map((q, i) => (
              <div key={i} className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                <p className="text-[11px] text-slate-700">{q.question}</p>
                {q.correctOption && (
                  <p className="text-[10px] text-emerald-700 font-bold mt-0.5">✓ {q.correctOption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // MCQ bucket card
  const McqBucketCard = ({ b }: { b: WeakBucket }) => {
    const k = bucketKey(b.subjectId, b.chapterId, b.pageKey, b.topic);
    const isSelfRating = selfRateKey === k;

    return (
      <div className="border-b border-slate-100 last:border-b-0 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Target size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{b.topic}</p>
            {b.pageLabel && <p className="text-[10px] text-slate-500">{b.pageLabel}</p>}
            <p className="text-[10px] text-rose-500 font-bold">{b.wrongCount} galat · {b.total} attempts</p>
          </div>
          {!isSelfRating && (
            <button
              onClick={() => handleMcqOpen(b)}
              className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <Zap size={13} /> Practice
            </button>
          )}
        </div>

        {isSelfRating && (
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-bold text-slate-600 mb-2">After MCQ practice, rate your performance:</p>
            <div className="flex gap-2">
              <button onClick={() => handleSelfRate(k, 'weak')}     className="flex-1 py-2 rounded-xl bg-rose-100    text-rose-700    text-xs font-bold border border-rose-200">😕 Weak</button>
              <button onClick={() => handleSelfRate(k, 'average')}  className="flex-1 py-2 rounded-xl bg-amber-100   text-amber-700   text-xs font-bold border border-amber-200">🙂 Okay</button>
              <button onClick={() => handleSelfRate(k, 'strong')}   className="flex-1 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">💪 Strong</button>
            </div>
          </div>
        )}

        {b.wrongQuestions.length > 0 && !isSelfRating && (
          <div className="mt-2 space-y-1.5">
            {b.wrongQuestions.slice(0, 2).map((q, i) => (
              <div key={i} className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                <p className="text-[11px] text-slate-700">{q.question}</p>
                {q.correctOption && (
                  <p className="text-[10px] text-emerald-700 font-bold mt-0.5">✓ {q.correctOption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Subject–Chapter accordion
  const SubjectChapterList = ({
    groups,
    renderBucket,
  }: {
    groups: SubjectGroup[];
    renderBucket: (b: WeakBucket) => React.ReactNode;
  }) => (
    <div className="space-y-3">
      {groups.map(sg => (
        <div key={sg.subjectId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{sg.subjectName}</p>
          </div>
          {sg.chapters.map(cg => {
            const chKey = `${sg.subjectId}::${cg.chapterId}`;
            const expanded = expandedChapters[chKey] !== false;
            return (
              <div key={cg.chapterId}>
                <button
                  onClick={() => toggleChapter(chKey)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <BookOpen size={15} className="text-indigo-500 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-slate-800 truncate">{cg.chapterTitle}</span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{cg.buckets.length} topic{cg.buckets.length !== 1 ? 's' : ''}</span>
                  {expanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                </button>
                {expanded && (
                  <div className="border-t border-slate-100">
                    {cg.buckets.map(b => (
                      <div key={`${b.chapterId}::${b.pageKey}::${b.topic}`}>
                        {renderBucket(b)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // ── How It Works card ─────────────────────────────────────────────────────
  const HowItWorksCard = () => (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 overflow-hidden">
      <button
        onClick={() => setShowHowItWorks(p => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <Info size={16} className="text-indigo-500 shrink-0" />
        <p className="flex-1 text-sm font-black text-indigo-800">Revision Hub Kaise Kaam Karta Hai?</p>
        {showHowItWorks ? <ChevronUp size={15} className="text-indigo-400 shrink-0" /> : <ChevronDown size={15} className="text-indigo-400 shrink-0" />}
      </button>
      {showHowItWorks && (
        <div className="px-4 pb-4 space-y-2 border-t border-indigo-100">
          <div className="flex gap-3 pt-2">
            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">①</span>
            <p className="text-sm text-indigo-700">When you answer an MCQ <strong>incorrectly</strong>, that topic gets tracked here.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">②</span>
            <p className="text-sm text-indigo-700"><strong>Day 2:</strong> Tap "Find Notes" — the app scans every cached chapter (no AI, plain word-match) and shows the best matching notes.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">③</span>
            <p className="text-sm text-indigo-700">After you read the notes, an <strong>MCQ Practice</strong> is scheduled for the next day. Then self-rate (Weak / Okay / Strong).</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">④</span>
            <p className="text-sm text-indigo-700">Good score → the gap grows. Weak → it returns sooner. Score 100% → notes resurface in 10 days, MCQ rerun in 20 days.</p>
          </div>
          <div className="mt-2 rounded-xl bg-white border border-indigo-100 p-2">
            <div className="flex items-center gap-1 text-[11px] flex-wrap">
              <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">Wrong MCQ</span>
              <ChevronRight size={10} className="text-slate-400" />
              <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">Notes (Day 2)</span>
              <ChevronRight size={10} className="text-slate-400" />
              <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">MCQ Practice</span>
              <ChevronRight size={10} className="text-slate-400" />
              <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Interval ↑</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 to-white pb-24">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 truncate">
              <BrainCircuit size={20} className="text-indigo-600 shrink-0" /> Revision Hub
            </h2>
            <p className="text-[11px] text-slate-500 -mt-0.5">Local word-match · Koi AI nahi</p>
          </div>
          {totalTracked > 0 && (
            <button onClick={() => setShowClearConfirm(true)} className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 shrink-0">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-colors ${
              activeTab === 'daily'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/60'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks size={14} />
            Today's Tasks
            {totalDue > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {totalDue > 9 ? '9+' : totalDue}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-colors ${
              activeTab === 'schedule'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/60'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={14} />
            Schedule
            {upcomingItems.length > 0 && (
              <span className="bg-slate-300 text-slate-700 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {upcomingItems.length > 9 ? '9+' : upcomingItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Confirm clear */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl">
            <p className="font-black text-slate-800 mb-2">Reset Revision Hub?</p>
            <p className="text-sm text-slate-500 mb-5">All tracking data and the revision schedule will be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-sm font-bold">Cancel</button>
              <button onClick={handleClear} className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold">Reset</button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-5">

        {/* ═══════════════════════════════════════════════════════
            TAB 1 — AAJ KA KAAM (Daily Tasks)
        ════════════════════════════════════════════════════════ */}
        {activeTab === 'daily' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm text-center">
                <p className="text-2xl font-black text-indigo-600">{totalDue}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Due Today</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm text-center">
                <p className="text-2xl font-black text-blue-600">{dueNotes.length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Notes</p>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm text-center">
                <p className="text-2xl font-black text-emerald-600">{dueMcq.length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">MCQ</p>
              </div>
            </div>

            {/* Empty state */}
            {totalTracked === 0 && (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-6 text-center">
                <Sparkles size={30} className="mx-auto text-indigo-400 mb-3" />
                <p className="font-black text-indigo-800 text-base mb-1">No topics being tracked yet</p>
                <p className="text-sm text-indigo-600 mb-4">Get an MCQ wrong and that topic will automatically show up here.</p>
                <button onClick={() => { setShowHowItWorks(true); setActiveTab('schedule'); }} className="text-xs font-bold text-indigo-600 underline">
                  How does it work? →
                </button>
              </div>
            )}

            {/* Notes due today */}
            {totalTracked > 0 && (
              <div>
                <SectionHeader icon={<BookOpen size={14} />} label="Notes To Read Today" count={dueNotes.length} color="indigo" />
                {dueNotes.length === 0
                  ? <EmptyCard msg="No notes pending today!" />
                  : <SubjectChapterList groups={notesGroups} renderBucket={b => <NotesBucketCard b={b} />} />
                }
              </div>
            )}

            {/* MCQ due today */}
            {totalTracked > 0 && (
              <div>
                <SectionHeader icon={<Target size={14} />} label="MCQ Practice For Today" count={dueMcq.length} color="emerald" />
                {dueMcq.length === 0
                  ? <EmptyCard msg="No MCQs pending today!" />
                  : <SubjectChapterList groups={mcqGroups} renderBucket={b => <McqBucketCard b={b} />} />
                }
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2 — SCHEDULE (Upcoming + How it Works)
        ════════════════════════════════════════════════════════ */}
        {activeTab === 'schedule' && (
          <>
            {/* How it works */}
            <HowItWorksCard />

            {/* All upcoming items */}
            {upcomingItems.length === 0 && totalTracked === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                <Calendar size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-500">No scheduled revisions yet</p>
                <p className="text-xs text-slate-400 mt-1">Practice MCQs — wrong answers will be tracked here.</p>
              </div>
            )}

            {upcomingItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    <Clock size={14} />
                  </div>
                  <p className="text-sm font-black text-slate-700">Upcoming Schedule</p>
                  <span className="ml-auto text-xs font-bold bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{upcomingItems.length} items</span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {(showAllUpcoming ? upcomingItems : upcomingItems.slice(0, 10)).map(b => {
                    const acc = b.correct / Math.max(b.total, 1);
                    const tone = accuracyColor(acc);
                    const isToday = !b.nextDueAt || b.nextDueAt <= Date.now();
                    return (
                      <div key={`${b.chapterId}::${b.pageKey}::${b.topic}`} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                        <div className={`w-9 h-9 rounded-xl bg-${tone}-50 text-${tone}-600 flex items-center justify-center shrink-0`}>
                          {b.stage === 'MCQ' ? <Target size={14} /> : <BookOpen size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{b.topic}</p>
                          <p className="text-[10px] text-slate-500 truncate">{b.subjectName} · {b.chapterTitle}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-0.5">
                          <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.stage === 'MCQ' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {b.stage === 'MCQ' ? 'MCQ' : 'Notes'}
                          </p>
                          <p className={`text-[10px] font-bold ${isToday ? 'text-rose-600' : 'text-slate-500'}`}>
                            {b.nextDueAt ? daysUntil(b.nextDueAt) : 'Today'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {upcomingItems.length > 10 && (
                    <button
                      onClick={() => setShowAllUpcoming(p => !p)}
                      className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-slate-50 flex items-center justify-center gap-1"
                    >
                      {showAllUpcoming
                        ? <><ChevronUp size={13} /> Kam Dikhao</>
                        : <><ChevronDown size={13} /> Sab Dikhao ({upcomingItems.length})</>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* All tracked topics summary */}
            {allBuckets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-500 flex items-center justify-center">
                    <Target size={14} />
                  </div>
                  <p className="text-sm font-black text-slate-700">Sare Tracked Topics</p>
                  <span className="ml-auto text-xs font-bold bg-rose-100 text-rose-600 rounded-full px-2 py-0.5">{totalTracked}</span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {allBuckets.filter(b => b.wrongQuestions.length > 0).slice(0, 20).map(b => {
                    const acc = b.correct / Math.max(b.total, 1);
                    const tone = accuracyColor(acc);
                    return (
                      <div key={`${b.chapterId}::${b.pageKey}::${b.topic}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0">
                        <div className={`w-8 h-8 rounded-lg bg-${tone}-50 text-${tone}-600 flex flex-col items-center justify-center shrink-0 font-black`}>
                          <span className="text-[10px] leading-none">{Math.round(acc * 100)}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{b.topic}</p>
                          <p className="text-[10px] text-slate-500 truncate">{b.subjectName} · {b.chapterTitle}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] text-rose-500 font-bold">{b.wrongCount} galat</p>
                          <p className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${b.stage === 'MCQ' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {b.stage === 'MCQ' ? 'MCQ ready' : 'Notes'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default RevisionHubV2;
