import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LessonContent, User, SystemSettings, UsageHistoryEntry } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronUp, Trash2, Search, FileText, CheckCircle2, Lock, AlertCircle, Folder, Download, ChevronRight, Play, X as XIcon, Star, Volume2, Square, Target, Sparkles } from 'lucide-react';
import { getMistakeBank, removeMistakes, clearMistakeBank, MistakeEntry } from '../utils/mistakeBank';
import { MistakePracticeView } from './MistakePracticeView';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import { LessonView } from './LessonView';
import { saveUserToLive, getChapterData } from '../firebase';
import { storage } from '../utils/storage';
import { CustomAlert, CustomConfirm } from './CustomDialogs';
import { OfflineDownloads } from './OfflineDownloads';
import { saveOfflineItem } from '../utils/offlineStorage';
import { SubscriptionHistory } from './SubscriptionHistory';
import {
    getRecentChapters, getRecentHomeworks, getRecentLucent,
    removeRecentChapter, removeRecentHomework, removeRecentLucent,
    getFullyReadMap, removeFullyRead,
    type RecentChapterEntry, type RecentHwEntry, type RecentLucentEntry, type FullyReadEntry,
} from '../utils/recentReads';
import {
    getFlashcardSessions, getNotesReadSessions,
    clearFlashcardSessions, clearNotesReadSessions,
    formatDur,
    type FlashcardSession, type NotesReadSession,
} from '../utils/flashcardHistory';
import { Layers, Clock } from 'lucide-react';

interface Props {
    user: User;
    onUpdateUser: (u: User) => void;
    settings?: SystemSettings;
    initialTab?: 'READING' | 'ACTIVITY' | 'MISTAKE' | 'OFFLINE' | 'SUB_HISTORY' | 'STARRED' | 'FLASHCARDS';
    /** Resume a chapter from a "Continue Reading" entry — closes History and opens the chapter. */
    onResumeRecentChapter?: (entry: RecentChapterEntry) => void;
    /** Resume a homework note (Sar Sangrah / Speedy / etc). */
    onResumeRecentHw?: (entry: RecentHwEntry) => void;
    /** Resume a Lucent Book page. */
    onResumeRecentLucent?: (entry: RecentLucentEntry) => void;
}

export const HistoryPage: React.FC<Props> = ({ user, onUpdateUser, settings, initialTab, onResumeRecentChapter, onResumeRecentHw, onResumeRecentLucent }) => {
  const [activeTab, setActiveTab] = useState<'READING' | 'ACTIVITY' | 'MISTAKE' | 'OFFLINE' | 'SUB_HISTORY' | 'STARRED' | 'FLASHCARDS'>(initialTab || 'READING');

  // ── MY MISTAKE STATE ─────────────────────────────────────────────
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [mistakeSearch, setMistakeSearch] = useState('');
  const [showPractice, setShowPractice] = useState(false);
  const [expandedMistakeId, setExpandedMistakeId] = useState<string | null>(null);
  const refreshMistakes = useCallback(() => {
    getMistakeBank().then(setMistakes).catch(() => setMistakes([]));
  }, []);
  useEffect(() => {
    if (activeTab === 'MISTAKE') refreshMistakes();
  }, [activeTab, refreshMistakes]);

  // FLASHCARDS / NOTES READ tracking (localStorage-backed)
  const [flashcardSessions, setFlashcardSessions] = useState<FlashcardSession[]>([]);
  const [notesReadSessions, setNotesReadSessions] = useState<NotesReadSession[]>([]);
  const refreshFlashcardData = React.useCallback(() => {
    setFlashcardSessions(getFlashcardSessions());
    setNotesReadSessions(getNotesReadSessions());
  }, []);
  useEffect(() => {
    if (activeTab === 'FLASHCARDS') refreshFlashcardData();
  }, [activeTab, refreshFlashcardData]);

  // Continue Reading state — combined chapter + homework + lucent + fully-read map.
  const [recentChapters, setRecentChapters] = useState<RecentChapterEntry[]>([]);
  const [recentHw, setRecentHw] = useState<RecentHwEntry[]>([]);
  const [recentLucent, setRecentLucent] = useState<RecentLucentEntry[]>([]);
  const [fullyReadMap, setFullyReadMap] = useState<Record<string, FullyReadEntry>>({});

  const refreshReading = React.useCallback(() => {
    setRecentChapters(getRecentChapters());
    setRecentHw(getRecentHomeworks());
    setRecentLucent(getRecentLucent());
    setFullyReadMap(getFullyReadMap());
  }, []);

  useEffect(() => {
    refreshReading();
  }, [activeTab, refreshReading]);
  
  // SAVED NOTES STATE
  const [history, setHistory] = useState<LessonContent[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);

  // USAGE HISTORY STATE (ACTIVITY LOG)
  const [usageLog, setUsageLog] = useState<UsageHistoryEntry[]>([]);

  // STARRED NOTES STATE — unified storage (nst_starred_notes_v1)
  type StarEntry = { id: string; noteKey: string; topicText: string; savedAt: string };
  const [starredNotes, setStarredNotes] = useState<StarEntry[]>([]);
  const [starSearch, setStarSearch] = useState('');

  // TTS playback for Important Notes revision
  const [isReadingStars, setIsReadingStars] = useState(false);
  const [readingStarIdx, setReadingStarIdx] = useState<number | null>(null);
  const isReadingStarsRef = useRef(false);
  const playStarFromRef = useRef<(notes: StarEntry[], idx: number) => void>();

  playStarFromRef.current = (notes: StarEntry[], idx: number) => {
    if (!isReadingStarsRef.current || idx >= notes.length) {
      isReadingStarsRef.current = false;
      setIsReadingStars(false);
      setReadingStarIdx(null);
      return;
    }
    setReadingStarIdx(idx);
    speakText(
      notes[idx].topicText,
      undefined,
      1.0,
      'hi-IN',
      undefined,
      () => { if (isReadingStarsRef.current) playStarFromRef.current?.(notes, idx + 1); }
    );
  };

  const startStarRead = useCallback((notes: StarEntry[]) => {
    if (notes.length === 0) return;
    stopSpeech();
    isReadingStarsRef.current = true;
    setIsReadingStars(true);
    setReadingStarIdx(null);
    setTimeout(() => playStarFromRef.current?.(notes, 0), 80);
  }, []);

  const stopStarRead = useCallback(() => {
    isReadingStarsRef.current = false;
    setIsReadingStars(false);
    setReadingStarIdx(null);
    stopSpeech();
  }, []);

  // Stop TTS when tab is hidden or component unmounts
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stopStarRead(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopStarRead();
    };
  }, [stopStarRead]);

  const loadStarredNotes = () => {
    try {
      const raw = localStorage.getItem('nst_starred_notes_v1');
      setStarredNotes(raw ? JSON.parse(raw) : []);
    } catch { setStarredNotes([]); }
  };

  const removeStarEntry = (id: string) => {
    try {
      const raw = localStorage.getItem('nst_starred_notes_v1');
      const all: StarEntry[] = raw ? JSON.parse(raw) : [];
      const updated = all.filter(n => n.id !== id);
      localStorage.setItem('nst_starred_notes_v1', JSON.stringify(updated));
      setStarredNotes(updated);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'STARRED') {
      loadStarredNotes();
      setStarSearch('');
    } else {
      stopStarRead();
    }
  }, [activeTab, stopStarRead]);

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({
      isOpen: false, 
      message: '', 
      onConfirm: () => {}
  });

  useEffect(() => {

    // Helper: strip out any MCQ-type entries from a saved-notes list
    const stripMcq = (list: any[]) => list.filter((item: any) => {
        const t = (item?.type || '').toString();
        return !t.includes('MCQ');
    });

    const loadHistory = async () => {
        // Load Saved Notes
        const parsed = await storage.getItem<any[]>('nst_user_history');
        if (parsed) {
            try {
                const userHistory = parsed.filter((item: any) => !item.userId || item.userId === user.id);
                const cleaned = stripMcq(userHistory);
                // Persist cleaned list back if we removed anything
                if (cleaned.length !== userHistory.length) {
                    const all = parsed.filter((item: any) => !((item?.type || '').toString().includes('MCQ')));
                    await storage.setItem('nst_user_history', all);
                    try { localStorage.setItem('nst_user_history', JSON.stringify(all)); } catch {}
                }
                setHistory(cleaned.reverse()); // Newest first
            } catch (e) { console.error("History parse error", e); }
        }
    };
    loadHistory();

    // Load Saved Notes (legacy localStorage fallback)
    const stored = localStorage.getItem('nst_user_history');
    if (stored) {
        try {
            const list = JSON.parse(stored);
            const cleaned = stripMcq(list);
            if (cleaned.length !== list.length) {
                try { localStorage.setItem('nst_user_history', JSON.stringify(cleaned)); } catch {}
            }
            setHistory(cleaned.reverse()); // Newest first
        } catch (e) { console.error("History parse error", e); }
    }


    // Load Activity Log from User Object (filter out MCQ entries) and purge from user
    if (user.usageHistory) {
        const cleanedUsage = user.usageHistory.filter(e => (e?.type || '') !== 'MCQ');
        setUsageLog([...cleanedUsage].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        }));

        // Persist cleanup so old MCQ entries vanish from user object too
        if (cleanedUsage.length !== user.usageHistory.length || (user as any).mcqHistory?.length) {
            const updatedUser: any = { ...user, usageHistory: cleanedUsage, mcqHistory: [] };
            try { onUpdateUser(updatedUser); } catch {}
            try { saveUserToLive(updatedUser); } catch {}
            try { localStorage.setItem('nst_current_user', JSON.stringify(updatedUser)); } catch {}
        }
    }
  }, [user.usageHistory, user.id]);

  const checkAvailability = (log: any) => {
    // If it's a direct URL log (like from content generation), it's always available
    if (log.videoUrl || log.pdfUrl || log.content) return true;

    if (!settings?.subjects) return true;
    const subjectData = settings.subjects.find(s => s.name === log.subject);
    if (!subjectData) return false;

    const chapters = subjectData.chapters || [];
    const chapter = chapters.find(c => c.title === log.itemTitle || c.id === log.itemId);
    if (!chapter) return false;

    if (log.type === 'VIDEO') return !!chapter.videoPlaylist;
    if (log.type === 'PDF') return !!chapter.pdfLink;
    return true;
  };

  const recordUsage = (type: 'VIDEO' | 'PDF' | 'MCQ' | 'AUDIO', item: any) => {
    const entry: any = {
        id: `usage-${Date.now()}`,
        type,
        itemId: item.id,
        itemTitle: item.title,
        subject: item.subjectName || 'General',
        durationSeconds: 0,
        timestamp: new Date().toISOString()
    };
    const updatedHistory = [entry, ...(user.usageHistory || [])];
    const updatedUser: User = { ...user, usageHistory: updatedHistory } as User;
    onUpdateUser(updatedUser);
    saveUserToLive(updatedUser);
  };

  const handleSaveOfflineLog = async (log: any, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
          if (log.type === 'PDF' || log.type === 'NOTES') {
              // Attempt to fetch full notes from DB
              const chapterData = await getChapterData('nst_chapter_content', log.itemId);
              if (chapterData && chapterData.notesHtml) {
                  await saveOfflineItem({
                      id: `note_${log.itemId}_${Date.now()}`,
                      type: 'NOTE',
                      title: log.itemTitle || 'Saved Note',
                      subtitle: log.subject || 'Notes',
                      data: { html: chapterData.notesHtml }
                  });
                  window.alert("Note Saved Offline!");
              } else if (log.content) {
                  // Direct content log
                  await saveOfflineItem({
                      id: `note_${log.itemId}_${Date.now()}`,
                      type: 'NOTE',
                      title: log.itemTitle || 'Saved Note',
                      subtitle: log.subject || 'Notes',
                      data: { html: log.content }
                  });
                  window.alert("Note Saved Offline!");
              } else {
                  window.alert("Full note content not found. Open the note first to sync it.");
              }
          }
      } catch (err) {
          console.error("Offline Save Error:", err);
          window.alert("Error saving offline.");
      }
  };

  const executeOpenItem = (item: LessonContent, cost: number) => {
      if (cost > 0) {
          const updatedUser: any = { ...user, credits: user.credits - cost };
          onUpdateUser(updatedUser);
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
          saveUserToLive(updatedUser);
      }

      setSelectedLesson(item);
  };

  const handleOpenItem = (item: LessonContent) => {
      // 0. Enforce Type Restrictions: only allow notes/PDF/video (MCQ removed)
      const allowedTypes = ['NOTES_SIMPLE', 'NOTES_PREMIUM', 'PDF_VIEWER', 'VIDEO_LECTURE', 'PDF', 'VIDEO'];
      const itemType = item.type || '';
      if (!allowedTypes.includes(itemType) && !itemType.includes('NOTES')) {
          return; // Disable click for others (including MCQ)
      }

      // 1. Check Cost
      // If it's a VIDEO or PDF coming from History, it should follow pricing too
      let cost = 0;
      if (itemType === 'VIDEO_LECTURE') {
          cost = settings?.videoHistoryCost ?? 2; // Default to 2 if not set
      } else if (itemType === 'NOTES_SIMPLE' || itemType === 'NOTES_PREMIUM') {
          cost = settings?.pdfHistoryCost ?? 1; // Default to 1 if not set
      }
      
      if (cost > 0) {
          // 2. Check Exemption (Admin or Premium)
          const isExempt = user.role === 'ADMIN' || 
                          (user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date());
          
          if (!isExempt) {
              if (user.credits < cost) {
                  setAlertConfig({isOpen: true, message: `Insufficient Credits! Viewing ${item.title} costs ${cost} coins.`});
                  return;
              }

              setConfirmConfig({
                  isOpen: true,
                  message: `Re-opening ${item.title} will cost ${cost} Credits. Proceed?`,
                  onConfirm: () => executeOpenItem(item, cost)
              });
              return;
          }
      }

      executeOpenItem(item, 0);
  };

  const filteredHistory = history.filter(h =>
    !((h.type || '').includes('MCQ')) &&
    ((h.title || '').toLowerCase().includes((search || '').toLowerCase()) ||
     (h.subjectName || '').toLowerCase().includes((search || '').toLowerCase()))
  );

  const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
  };

  if (selectedLesson) {
      return (
          <div className="animate-in slide-in-from-right duration-300">
              <button
                onClick={() => setSelectedLesson(null)}
                className="mb-4 text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                  &larr; Back to History
              </button>
              {/* Reuse LessonView but mock props usually passed from API */}
              <LessonView 
                 content={selectedLesson}
                 subject={{id: 'hist', name: selectedLesson.subjectName, icon: 'book', color: 'bg-slate-100'} as any} 
                 classLevel={'10' as any} // Display only
                 chapter={{id: 'hist', title: selectedLesson.title} as any}
                 loading={false}
                 onBack={() => setSelectedLesson(null)}
                 user={user}
                 settings={settings}
              />
          </div>
      )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CustomAlert
            isOpen={alertConfig.isOpen}
            message={alertConfig.message}
            onClose={() => setAlertConfig({...alertConfig, isOpen: false})}
        />
        <CustomConfirm
            isOpen={confirmConfig.isOpen}
            title="Confirm Action"
            message={confirmConfig.message}
            onConfirm={() => {
                confirmConfig.onConfirm();
                setConfirmConfig({...confirmConfig, isOpen: false});
            }}
            onCancel={() => setConfirmConfig({...confirmConfig, isOpen: false})}
        />
        
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                 <FileText className="text-blue-600" /> Downloads & History
            </h3>
        </div>

        {/* TABS */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto no-scrollbar gap-1">
            <button
                onClick={() => setActiveTab('READING')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'READING' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Reading
            </button>
            <button
                onClick={() => setActiveTab('FLASHCARDS')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'FLASHCARDS' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Flashcards
            </button>
            <button
                onClick={() => setActiveTab('MISTAKE')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'MISTAKE' ? 'bg-white shadow text-rose-600' : 'text-slate-600 hover:text-slate-700'}`}
            >
                <Target size={13} />
                My Mistake
                {mistakes.length > 0 && (
                  <span className="ml-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    {mistakes.length}
                  </span>
                )}
            </button>
            <button
                onClick={() => setActiveTab('ACTIVITY')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ACTIVITY' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Activity Log
            </button>
            <button
                onClick={() => setActiveTab('OFFLINE')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'OFFLINE' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Offline Saved
            </button>
            <button
                onClick={() => setActiveTab('SUB_HISTORY')}
                className={`flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'SUB_HISTORY' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
            >
                Sub History
            </button>
            {/* Important Notes tab removed — accessed from bottom-nav ⭐ Important tab */}
        </div>

        {activeTab === 'READING' && (
            <ReadingProgressSection
                recentChapters={recentChapters}
                recentHw={recentHw}
                recentLucent={recentLucent}
                fullyReadMap={fullyReadMap}
                onResumeChapter={(e) => { onResumeRecentChapter && onResumeRecentChapter(e); }}
                onResumeHw={(e) => { onResumeRecentHw && onResumeRecentHw(e); }}
                onResumeLucent={(e) => { onResumeRecentLucent && onResumeRecentLucent(e); }}
                onRemoveChapter={(id) => { removeRecentChapter(id); refreshReading(); }}
                onRemoveHw={(id) => { removeRecentHomework(id); refreshReading(); }}
                onRemoveLucent={(id) => { removeRecentLucent(id); refreshReading(); }}
                onClearDoneBadge={(id) => { removeFullyRead(id); refreshReading(); }}
            />
        )}

        {activeTab === 'FLASHCARDS' && (
            <FlashcardsActivitySection
                flashcardSessions={flashcardSessions}
                notesReadSessions={notesReadSessions}
                onClearFlashcards={() => {
                    setConfirmConfig({
                        isOpen: true,
                        message: 'Saare flashcard sessions delete kar dein?',
                        onConfirm: () => { clearFlashcardSessions(); refreshFlashcardData(); },
                    });
                }}
                onClearNotes={() => {
                    setConfirmConfig({
                        isOpen: true,
                        message: 'Saare notes-read records delete kar dein?',
                        onConfirm: () => { clearNotesReadSessions(); refreshFlashcardData(); },
                    });
                }}
            />
        )}

        {activeTab === 'SUB_HISTORY' && (
            <div className="animate-in fade-in duration-300">
                <SubscriptionHistory user={user} onBack={() => setActiveTab('MISTAKE')} hideHeader={true} />
            </div>
        )}

        {activeTab === 'OFFLINE' && (
            <div className="animate-in fade-in duration-300">
                <OfflineDownloads onBack={() => setActiveTab('MISTAKE')} hideHeader={true} user={user} settings={settings} />
            </div>
        )}

        {activeTab === 'STARRED' && (() => {
            const filtered = starredNotes.filter(n =>
                n.topicText?.toLowerCase().includes(starSearch.toLowerCase())
            );
            return (
            <div className="animate-in fade-in duration-300 space-y-3">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-1">
                    <Star size={16} className="text-amber-500" fill="currentColor" />
                    <h4 className="text-sm font-black text-slate-700">Important Notes</h4>
                    <span className="ml-2 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {starSearch ? `${filtered.length}/${starredNotes.length}` : starredNotes.length}
                    </span>
                    {filtered.length > 0 && (
                        <button
                            onClick={() => isReadingStars ? stopStarRead() : startStarRead(filtered)}
                            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                                isReadingStars
                                    ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200'
                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                            }`}
                        >
                            {isReadingStars
                                ? <><Square size={11} fill="currentColor" /> Stop</>
                                : <><Volume2 size={12} /> Read All</>
                            }
                        </button>
                    )}
                </div>

                {/* Reading progress bar */}
                {isReadingStars && readingStarIdx !== null && filtered.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Volume2 size={13} className="text-amber-500 animate-pulse shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-black text-amber-700">Padh raha hai...</span>
                                <span className="text-[10px] font-bold text-amber-600">{readingStarIdx + 1}/{filtered.length}</span>
                            </div>
                            <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${((readingStarIdx + 1) / filtered.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {starredNotes.length > 0 && (
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                        <input
                            type="text"
                            value={starSearch}
                            onChange={e => { setStarSearch(e.target.value); stopStarRead(); }}
                            placeholder="Notes mein search karo..."
                            className="w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-xl text-slate-700 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all"
                        />
                        {starSearch && (
                            <button
                                onClick={() => { setStarSearch(''); stopStarRead(); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
                            >
                                <XIcon size={14} />
                            </button>
                        )}
                    </div>
                )}

                {starredNotes.length === 0 ? (
                    <div className="text-center py-14 bg-amber-50 rounded-2xl border border-amber-100">
                        <Star size={40} className="text-amber-300 mx-auto mb-3" />
                        <p className="font-bold text-slate-600 text-sm">Koi important note nahi mili.</p>
                        <p className="text-xs text-slate-400 mt-1">Note padhte waqt ⭐ dabao — yahan dikhega.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 bg-amber-50 rounded-2xl border border-amber-100">
                        <Search size={32} className="text-amber-300 mx-auto mb-3" />
                        <p className="font-bold text-slate-600 text-sm">Koi match nahi mila.</p>
                        <p className="text-xs text-slate-400 mt-1">Doosra word try karo.</p>
                    </div>
                ) : (
                    filtered.map((note, idx) => {
                        const isCurrentlyReading = isReadingStars && readingStarIdx === idx;
                        return (
                        <div
                            key={note.id}
                            className={`rounded-2xl p-4 shadow-sm flex items-start gap-3 transition-all duration-300 ${
                                isCurrentlyReading
                                    ? 'bg-amber-50 border-2 border-amber-400 shadow-amber-100'
                                    : 'bg-white border border-amber-200'
                            }`}
                        >
                            <button
                                onClick={() => { if (isCurrentlyReading) stopStarRead(); else startStarRead(filtered.slice(idx)); }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                    isCurrentlyReading
                                        ? 'bg-amber-400 text-white animate-pulse'
                                        : 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                                }`}
                            >
                                {isCurrentlyReading
                                    ? <Square size={14} fill="currentColor" />
                                    : <Volume2 size={14} />
                                }
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm leading-snug ${isCurrentlyReading ? 'text-amber-800' : 'text-slate-800'}`}>{note.topicText}</p>
                                <p className="text-[10px] text-amber-500 font-bold mt-1">
                                    {note.savedAt ? new Date(note.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => removeStarEntry(note.id)}
                                className="p-1.5 rounded-full text-amber-400 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0 mt-0.5"
                                title="Remove"
                            >
                                <XIcon size={14} />
                            </button>
                        </div>
                        );
                    })
                )}
            </div>
            );
        })()}

        {activeTab === 'ACTIVITY' && (
            <div className="space-y-4">
                {usageLog.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        <p>No study activity recorded yet.</p>
                    </div>
                ) : (
                    // GROUPED VIEW
                    Object.entries(usageLog.reduce((acc: any, log) => {
                        const d = new Date(log.timestamp);
                        const isValid = !isNaN(d.getTime());
                        const year = isValid ? d.getFullYear() : 'Unknown Year';
                        const month = isValid ? d.toLocaleString('default', { month: 'long' }) : 'Unknown Month';
                        if (!acc[year]) acc[year] = {};
                        if (!acc[year][month]) acc[year][month] = [];
                        acc[year][month].push(log);
                        return acc;
                    }, {})).sort((a,b) => Number(b[0]) - Number(a[0])).map(([year, months]: any) => (
                        <div key={year} className="mb-4">
                            <h4 className="text-sm font-black text-slate-500 uppercase mb-2 ml-1">{year} Files</h4>
                            {Object.entries(months).map(([month, logs]: any) => (
                                <div key={month} className="mb-3">
                                    <details open className="group">
                                        <summary className="flex items-center gap-2 cursor-pointer bg-slate-200 p-3 rounded-xl mb-2 list-none hover:bg-slate-300 transition-colors">
                                            <Folder className="text-slate-600" size={18} />
                                            <span className="font-bold text-slate-700 text-sm">{month}</span>
                                            <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full ml-auto">{logs.length}</span>
                                            <ChevronDown size={16} className="text-slate-600 group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="pl-2 space-y-2">
                                            {logs.map((log: any, i: number) => (
                                                <div
                                                    key={i}
                                                    // onClick removed to disable interaction
                                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between opacity-90 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                                                            log.type === 'VIDEO' ? 'bg-red-500' :
                                                            log.type === 'PDF' ? 'bg-blue-500' :
                                                            log.type === 'AUDIO' ? 'bg-green-500' :
                                                            log.type === 'GAME' ? 'bg-orange-500' :
                                                            log.type === 'PURCHASE' ? 'bg-emerald-500' :
                                                            log.type === 'MCQ' ? 'bg-purple-500' : 'bg-slate-500'
                                                        }`}>
                                                            {log.type === 'VIDEO' ? '▶' : log.type === 'PDF' ? '📄' : log.type === 'AUDIO' ? '🎵' : log.type === 'GAME' ? '🎰' : log.type === 'PURCHASE' ? '💰' : '👁️'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-700">{log.itemTitle}</p>
                                                                {log.type === 'MCQ' && log.score !== undefined && (
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 90 ? 'bg-green-100 text-green-700' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 75 ? 'bg-blue-100 text-blue-700' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {(log.score / (log.totalQuestions || 1) * 100) >= 90 ? 'Excellent' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 75 ? 'Good' :
                                                                        (log.score / (log.totalQuestions || 1) * 100) >= 50 ? 'Average' : 'Bad'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-600">
                                                                {log.type === 'PURCHASE' ? 'Transaction' : log.type === 'GAME' ? 'Play Zone' : log.subject} • {(!isNaN(new Date(log.timestamp).getTime()) ? new Date(log.timestamp).toLocaleDateString() : 'Unknown Date')}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {log.type !== 'PURCHASE' && log.type !== 'GAME' && (
                                                                    <>
                                                                        {checkAvailability(log) ? (
                                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-100">
                                                                                <CheckCircle2 size={10} /> Available
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-rose-100">
                                                                                <AlertCircle size={10} /> Not Available
                                                                            </span>
                                                                        ) || null}
                                                                    </>
                                                                )}
                                                                {log.type === 'MCQ' && log.score !== undefined && (
                                                                    <p className="text-[10px] font-black text-indigo-600">Score: {Math.round((log.score / (log.totalQuestions || 1)) * 100)}% ({log.score}/{log.totalQuestions})</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {log.type === 'MCQ' ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                {!user.isPremium && user.role !== 'ADMIN' && (
                                                                    <span className="text-[9px] font-black text-slate-500 italic">Cost: {settings?.mcqHistoryCost ?? 1} CR</span>
                                                                )}
                                                                <button onClick={(e) => handleSaveOfflineLog(log, e)} className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors">
                                                                    <Download size={10} /> Save
                                                                </button>
                                                            </div>
                                                        ) : log.type === 'GAME' ? (
                                                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">Played</span>
                                                        ) : log.type === 'PURCHASE' ? (
                                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Success</span>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                <p className="font-black text-slate-700 text-sm">{formatDuration(log.durationSeconds || 0)}</p>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Time Spent</p>
                                                                {!user.isPremium && user.role !== 'ADMIN' && (
                                                                    <span className="text-[9px] font-black text-slate-500 italic">
                                                                        Re-open: {log.type === 'VIDEO' ? (settings?.videoHistoryCost ?? 2) : (settings?.pdfHistoryCost ?? 1)} CR
                                                                    </span>
                                                                )}
                                                                {(log.type === 'PDF' || log.type === 'NOTES') && (
                                                                    <button onClick={(e) => handleSaveOfflineLog(log, e)} className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md hover:bg-slate-200 transition-colors">
                                                                        <Download size={10} /> Save
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        )}

        {activeTab === 'MISTAKE' && (() => {
            const filteredMistakes = mistakes.filter(m =>
                !mistakeSearch ||
                m.question.toLowerCase().includes(mistakeSearch.toLowerCase()) ||
                (m.chapterTitle || '').toLowerCase().includes(mistakeSearch.toLowerCase()) ||
                (m.subjectName || '').toLowerCase().includes(mistakeSearch.toLowerCase())
            );
            return (
              <div className="animate-in fade-in duration-300">
                {/* Hero / Practice CTA */}
                <div className="rounded-3xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-5 text-white mb-5 shadow-lg">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Target size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-black leading-tight">My Mistake</h4>
                            <p className="text-xs text-white/90 mt-0.5">
                                {mistakes.length === 0
                                    ? 'Abhi koi galti save nahin hui. MCQ test do — galat answers yahan automatically jud jayenge.'
                                    : `${mistakes.length} galt question save hain. Practice karke clean karein!`}
                            </p>
                        </div>
                    </div>
                    {mistakes.length > 0 && (
                      <div className="flex gap-2">
                        <button
                            onClick={() => setShowPractice(true)}
                            className="flex-1 py-2.5 rounded-xl bg-white text-rose-600 font-black text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-md"
                        >
                            <Sparkles size={15} /> Practice Mistakes
                        </button>
                        <button
                            onClick={() => {
                                setConfirmConfig({
                                    isOpen: true,
                                    message: 'Saari mistakes clear kar dein?',
                                    onConfirm: () => { clearMistakeBank().then(refreshMistakes); },
                                });
                            }}
                            className="px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs"
                        >
                            <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                </div>

                {mistakes.length > 0 && (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search mistakes..."
                        value={mistakeSearch}
                        onChange={e => setMistakeSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-300 focus:outline-none text-sm"
                    />
                  </div>
                )}

                {filteredMistakes.length === 0 ? (
                    mistakes.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                          <Target size={42} className="mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-bold text-slate-600">No mistakes yet — keep learning!</p>
                          <p className="text-xs text-slate-400 mt-1">Galat MCQs apne aap yahan aa jayengi.</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-sm">No mistakes match your search.</div>
                    )
                ) : (
                    <div className="space-y-2.5">
                        {filteredMistakes.map((m) => {
                            const isOpen = expandedMistakeId === m.id;
                            return (
                              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-rose-300 transition-colors">
                                <button
                                    onClick={() => setExpandedMistakeId(isOpen ? null : m.id)}
                                    className="w-full text-left p-3.5 flex items-start gap-3"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-black text-xs">
                                        ✗
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {m.subjectName && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{m.subjectName}</span>}
                                            {m.chapterTitle && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full truncate max-w-[140px]">{m.chapterTitle}</span>}
                                            {m.attempts > 1 && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">×{m.attempts}</span>}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{m.question}</p>
                                    </div>
                                    <ChevronDown size={16} className={`text-slate-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                  <div className="px-3.5 pb-3.5 border-t border-slate-100 pt-3 space-y-1.5 bg-slate-50/60">
                                    {m.options.map((opt, oi) => (
                                      <div key={oi} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                                          oi === m.correctAnswer ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-100'
                                      }`}>
                                        <span className={`shrink-0 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center ${
                                          oi === m.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>{String.fromCharCode(65 + oi)}</span>
                                        <span className="text-slate-700 leading-snug">{opt}</span>
                                        {oi === m.correctAnswer && <CheckCircle2 size={14} className="ml-auto text-emerald-600 shrink-0" />}
                                      </div>
                                    ))}
                                    {m.explanation && (
                                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 mt-2">
                                        <div className="text-[10px] font-black text-amber-700 mb-0.5">EXPLANATION</div>
                                        <p className="text-[11px] text-slate-700 leading-relaxed">{m.explanation}</p>
                                      </div>
                                    )}
                                    <div className="flex gap-2 pt-2">
                                      <button
                                        onClick={() => { removeMistakes([m.id]).then(refreshMistakes); }}
                                        className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"
                                      >
                                        <Trash2 size={12} /> Remove
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                        })}
                    </div>
                )}

                {showPractice && (
                  <MistakePracticeView
                    mistakes={mistakes}
                    onClose={() => { setShowPractice(false); refreshMistakes(); }}
                    onComplete={() => refreshMistakes()}
                  />
                )}
              </div>
            );
        })()}
    </div>
  );
};

// =====================================================================
// ReadingProgressSection — shows Continue Reading items + Done badges.
// Renders three groups: Chapters, Homework Notes, Lucent Pages. Each row
// has a progress bar (% scrolled), a Resume button, a remove (X) button,
// and a green "Done" badge when the user has finished TTS for that note.
// =====================================================================
interface ReadingSectionProps {
    recentChapters: RecentChapterEntry[];
    recentHw: RecentHwEntry[];
    recentLucent: RecentLucentEntry[];
    fullyReadMap: Record<string, FullyReadEntry>;
    onResumeChapter: (e: RecentChapterEntry) => void;
    onResumeHw: (e: RecentHwEntry) => void;
    onResumeLucent: (e: RecentLucentEntry) => void;
    onRemoveChapter: (id: string) => void;
    onRemoveHw: (id: string) => void;
    onRemoveLucent: (id: string) => void;
    onClearDoneBadge: (id: string) => void;
}

const ReadingProgressSection: React.FC<ReadingSectionProps> = ({
    recentChapters, recentHw, recentLucent, fullyReadMap,
    onResumeChapter, onResumeHw, onResumeLucent,
    onRemoveChapter, onRemoveHw, onRemoveLucent, onClearDoneBadge,
}) => {
    const totalCount = recentChapters.length + recentHw.length + recentLucent.length;
    const doneEntries = useMemo(() => {
        const arr = Object.values(fullyReadMap);
        arr.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        return arr;
    }, [fullyReadMap]);

    const renderProgressBar = (pct: number, isDone: boolean) => (
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${isDone ? 100 : Math.max(2, Math.min(100, Math.round(pct || 0)))}%` }}
            />
        </div>
    );

    const renderRow = (key: string, opts: {
        title: string;
        subtitle?: string;
        pct: number;
        isDone: boolean;
        emoji: string;
        onResume: () => void;
        onRemove: () => void;
    }) => (
        <div key={key} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="text-2xl flex-none mt-0.5">{opts.emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-slate-800 truncate flex-1 min-w-0">{opts.title}</p>
                        {opts.isDone && (
                            <span className="flex-none inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={11} /> Done
                            </span>
                        )}
                    </div>
                    {opts.subtitle && <p className="text-xs text-slate-500 truncate">{typeof opts.subtitle === 'string' ? opts.subtitle : ''}</p>}
                    <div className="mt-2">{renderProgressBar(opts.pct, opts.isDone)}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{opts.isDone ? '100%' : `${Math.max(2, Math.min(100, Math.round(opts.pct || 0)))}%`} read</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={opts.onResume}
                                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1 rounded-full transition active:scale-95"
                            >
                                <Play size={11} /> Resume
                            </button>
                            <button
                                type="button"
                                onClick={opts.onRemove}
                                aria-label="Remove from list"
                                className="p-1 text-slate-400 hover:text-rose-500 rounded-full active:scale-95 transition"
                            >
                                <XIcon size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {totalCount === 0 && doneEntries.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                    <BookOpen size={42} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-700">Abhi tak kuch nahi padha.</p>
                    <p className="text-xs mt-1">Koi note ya chapter padhna shuru karein — yahan progress save hogi.</p>
                </div>
            ) : (
                <>
                    {recentChapters.length > 0 && (
                        <section>
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-1">Chapters</h4>
                            <div className="space-y-2">
                                {recentChapters.map(c => {
                                    // c.subject can be either a string OR a full
                                    // Subject object (older RecentChapterEntry
                                    // stored the whole {id,name,icon,color}).
                                    // Coerce to a plain string so renderRow's
                                    // <p>{opts.subtitle}</p> doesn't try to render
                                    // an object — that was the source of the
                                    // React #31 crash on this page.
                                    const subj: any = (c as any).subject;
                                    const subjectStr = typeof subj === 'string'
                                        ? subj
                                        : (subj && typeof subj === 'object' && typeof subj.name === 'string')
                                            ? subj.name
                                            : '';
                                    // c.title may also be missing on legacy
                                    // entries (the type defines it but the data
                                    // may have come from an older saver). Fall
                                    // back to the chapter object's title.
                                    const titleStr = (c as any).title
                                        || (c as any).chapter?.title
                                        || 'Untitled chapter';
                                    return renderRow(`ch_${c.id}`, {
                                        title: titleStr,
                                        subtitle: subjectStr,
                                        pct: c.scrollPct,
                                        isDone: false,
                                        emoji: '📖',
                                        onResume: () => onResumeChapter(c),
                                        onRemove: () => onRemoveChapter(c.id),
                                    });
                                })}
                            </div>
                        </section>
                    )}

                    {recentHw.length > 0 && (
                        <section>
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-1">Homework Notes</h4>
                            <div className="space-y-2">
                                {recentHw.map(h => renderRow(`hw_${h.id}`, {
                                    title: h.title || 'Homework',
                                    subtitle: h.targetSubject || 'Homework',
                                    pct: h.scrollPct,
                                    isDone: !!fullyReadMap[h.id],
                                    emoji: '📝',
                                    onResume: () => onResumeHw(h),
                                    onRemove: () => onRemoveHw(h.id),
                                }))}
                            </div>
                        </section>
                    )}

                    {recentLucent.length > 0 && (
                        <section>
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-1">Lucent Book Pages</h4>
                            <div className="space-y-2">
                                {recentLucent.map(l => renderRow(`lc_${l.id}`, {
                                    title: `${l.lessonTitle} — Page ${l.pageNo}`,
                                    subtitle: `${l.subject} • Page ${l.pageIndex + 1} of ${l.totalPages}`,
                                    pct: l.scrollPct,
                                    isDone: !!fullyReadMap[l.id],
                                    emoji: '📚',
                                    onResume: () => onResumeLucent(l),
                                    onRemove: () => onRemoveLucent(l.id),
                                }))}
                            </div>
                        </section>
                    )}

                    {doneEntries.length > 0 && (
                        <section>
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-600" /> Completed
                            </h4>
                            <div className="space-y-1.5">
                                {doneEntries.slice(0, 20).map(d => (
                                    <div key={`done_${d.id}`} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                                        <CheckCircle2 size={14} className="text-emerald-600 flex-none" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-emerald-800 truncate">{d.title}</p>
                                            {d.subtitle && <p className="text-[10px] text-emerald-700 truncate">{d.subtitle}</p>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onClearDoneBadge(d.id)}
                                            aria-label="Remove"
                                            className="p-1 text-emerald-400 hover:text-rose-500 rounded-full active:scale-95"
                                        >
                                            <XIcon size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};
// =====================================================================
// FLASHCARDS + NOTES READ activity panel.
// Powered by localStorage (utils/flashcardHistory) — works offline.
// =====================================================================
interface FlashcardsActivitySectionProps {
    flashcardSessions: FlashcardSession[];
    notesReadSessions: NotesReadSession[];
    onClearFlashcards: () => void;
    onClearNotes: () => void;
}

const FlashcardsActivitySection: React.FC<FlashcardsActivitySectionProps> = ({
    flashcardSessions, notesReadSessions, onClearFlashcards, onClearNotes,
}) => {
    // Aggregate stats
    const totalFlashcards = flashcardSessions.reduce((s, f) => s + (f.viewed || 0), 0);
    const totalFlashcardSessions = flashcardSessions.length;
    const totalFlashcardSec = flashcardSessions.reduce((s, f) => s + (f.durationSec || 0), 0);
    const totalNotesSec = notesReadSessions.reduce((s, n) => s + (n.durationSec || 0), 0);

    const fcSubjects = new Set(flashcardSessions.map(f => f.subject).filter(Boolean));
    const fcLessons = new Set(flashcardSessions.map(f => f.lessonTitle).filter(Boolean));
    const noteLessons = new Set(notesReadSessions.map(n => n.lessonTitle).filter(Boolean));

    // Per-subject totals (combined)
    const perSubject = React.useMemo(() => {
        const map: Record<string, { flashcards: number; sessions: number; readSec: number; flashSec: number }> = {};
        flashcardSessions.forEach(f => {
            const k = f.subject || '—';
            if (!map[k]) map[k] = { flashcards: 0, sessions: 0, readSec: 0, flashSec: 0 };
            map[k].flashcards += (f.viewed || 0);
            map[k].sessions += 1;
            map[k].flashSec += (f.durationSec || 0);
        });
        notesReadSessions.forEach(n => {
            const k = n.subject || '—';
            if (!map[k]) map[k] = { flashcards: 0, sessions: 0, readSec: 0, flashSec: 0 };
            map[k].readSec += (n.durationSec || 0);
        });
        return Object.entries(map).sort((a, b) =>
            (b[1].flashcards + b[1].sessions + b[1].readSec) - (a[1].flashcards + a[1].sessions + a[1].readSec)
        );
    }, [flashcardSessions, notesReadSessions]);

    const fmtDate = (ts: number) => {
        try {
            const d = new Date(ts);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' +
                d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const isEmpty = flashcardSessions.length === 0 && notesReadSessions.length === 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* SUMMARY GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                        <Layers size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Flashcards</span>
                    </div>
                    <p className="text-2xl font-black text-amber-900 leading-none">{totalFlashcards}</p>
                    <p className="text-[10px] font-bold text-amber-700 mt-1">{totalFlashcardSessions} sessions</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-indigo-700 mb-1">
                        <Clock size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Flashcard Time</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-900 leading-none">{formatDur(totalFlashcardSec)}</p>
                    <p className="text-[10px] font-bold text-indigo-700 mt-1">{fcSubjects.size} subjects</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                        <BookOpen size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Notes Padhe</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-900 leading-none">{noteLessons.size}</p>
                    <p className="text-[10px] font-bold text-emerald-700 mt-1">{notesReadSessions.length} sessions</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                        <Clock size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Reading Time</span>
                    </div>
                    <p className="text-2xl font-black text-blue-900 leading-none">{formatDur(totalNotesSec)}</p>
                    <p className="text-[10px] font-bold text-blue-700 mt-1">total padha</p>
                </div>
            </div>

            {isEmpty && (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    <Layers size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-black text-slate-700">Abhi tak koi activity nahi</p>
                    <p className="text-xs mt-1">Flashcards open karein ya koi note padhein — yahan record dikhega.</p>
                </div>
            )}

            {/* PER-SUBJECT BREAKDOWN */}
            {perSubject.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200 p-4">
                    <h4 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                        📚 Subject-wise breakdown
                    </h4>
                    <div className="space-y-2">
                        {perSubject.map(([subject, s]) => (
                            <div key={typeof subject === 'string' ? subject : JSON.stringify(subject)} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-800 truncate">
                                      {typeof subject === 'string'
                                        ? subject
                                        : (subject && typeof subject === 'object' && (subject as any).name)
                                          ? String((subject as any).name)
                                          : '—'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                        {s.flashcards > 0 && <>🃏 {s.flashcards} cards · {s.sessions} sessions</>}
                                        {s.flashcards > 0 && s.readSec > 0 && <> · </>}
                                        {s.readSec > 0 && <>📖 {formatDur(s.readSec)} padha</>}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-black text-indigo-600">{formatDur(s.flashSec + s.readSec)}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">total</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* FLASHCARD SESSIONS LIST */}
            {flashcardSessions.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                            <Layers size={14} className="text-amber-600" />
                            Flashcard Sessions
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {flashcardSessions.length}
                            </span>
                        </h4>
                        <button
                            onClick={onClearFlashcards}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50"
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {flashcardSessions.map(f => (
                            <div key={f.id} className="px-3 py-2 rounded-xl border border-amber-100 bg-amber-50/40">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 flex-1">{f.lessonTitle}</p>
                                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-white text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                        {f.viewed}/{f.total}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span className="truncate">{f.subject}</span>
                                    <span className="shrink-0 ml-2 flex items-center gap-2">
                                        <span className="text-indigo-600">⏱ {formatDur(f.durationSec)}</span>
                                        <span className="text-slate-400">{fmtDate(f.ts)}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* NOTES READ SESSIONS LIST */}
            {notesReadSessions.length > 0 && (
                <section className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black text-slate-700 flex items-center gap-2">
                            <BookOpen size={14} className="text-emerald-600" />
                            Notes Padhne ka History
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {notesReadSessions.length}
                            </span>
                        </h4>
                        <button
                            onClick={onClearNotes}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50"
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {notesReadSessions.map(n => (
                            <div key={n.id} className="px-3 py-2 rounded-xl border border-emerald-100 bg-emerald-50/40">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 flex-1">{n.lessonTitle}</p>
                                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        {n.kind === 'lucent' ? 'Lucent' : n.kind === 'homework' ? 'HW' : 'Chapter'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span className="truncate">{n.subject}</span>
                                    <span className="shrink-0 ml-2 flex items-center gap-2">
                                        <span className="text-emerald-700">⏱ {formatDur(n.durationSec)}</span>
                                        <span className="text-slate-400">{fmtDate(n.ts)}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
