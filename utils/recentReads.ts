import type { Chapter, Subject } from '../types';

const RECENT_CHAPTERS_KEY = 'nst_recent_chapters_v1';
const RECENT_HW_KEY = 'nst_recent_hw_v1';
const RECENT_LUCENT_KEY = 'nst_recent_lucent_v1';
const READ_DATES_KEY = 'nst_read_dates_v1';
const READ_ITEMS_BY_DAY_KEY = 'nst_read_items_by_day_v1';
const FULLY_READ_KEY = 'nst_fully_read_v1';
const MAX_ITEMS = 6;
const MAX_LUCENT_ITEMS = 12;
const MAX_DATES = 90;
const MAX_FULLY_READ = 200;

export interface RecentChapterEntry {
  id: string;
  ts: number;
  scrollY: number;
  scrollPct: number;
  contentType: 'PDF' | 'AUDIO' | 'VIDEO' | 'MCQ';
  board: string;
  classLevel: string;
  stream?: string;
  subject: Subject;
  chapter: Chapter;
}

export interface RecentHwEntry {
  id: string;
  ts: number;
  scrollY: number;
  scrollPct: number;
  title: string;
  date: string;
  targetSubject?: string;
  hw: any;
  topicIndex?: number;
}

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as unknown as T) : fallback;
  } catch {
    return fallback;
  }
};

export const getRecentChapters = (): RecentChapterEntry[] => {
  try {
    return safeParse<RecentChapterEntry[]>(localStorage.getItem(RECENT_CHAPTERS_KEY), []);
  } catch {
    return [];
  }
};

export const saveRecentChapter = (entry: Omit<RecentChapterEntry, 'ts'>) => {
  try {
    const list = getRecentChapters().filter(e => e.id !== entry.id);
    list.unshift({ ...entry, ts: Date.now() });
    localStorage.setItem(RECENT_CHAPTERS_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {}
};

export const removeRecentChapter = (id: string) => {
  try {
    const list = getRecentChapters().filter(e => e.id !== id);
    localStorage.setItem(RECENT_CHAPTERS_KEY, JSON.stringify(list));
  } catch {}
};

export const getRecentHomeworks = (): RecentHwEntry[] => {
  try {
    return safeParse<RecentHwEntry[]>(localStorage.getItem(RECENT_HW_KEY), []);
  } catch {
    return [];
  }
};

export const saveRecentHomework = (entry: Omit<RecentHwEntry, 'ts'>) => {
  try {
    const list = getRecentHomeworks().filter(e => e.id !== entry.id);
    list.unshift({ ...entry, ts: Date.now() });
    localStorage.setItem(RECENT_HW_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {}
};

export const removeRecentHomework = (id: string) => {
  try {
    const list = getRecentHomeworks().filter(e => e.id !== id);
    localStorage.setItem(RECENT_HW_KEY, JSON.stringify(list));
  } catch {}
};

// === RECENT LUCENT BOOK PAGES ===
// Lucent Book pages are page-wise so we keep more of them than chapters/hw.
export interface RecentLucentEntry {
  id: string;          // synthetic: `lucent_${lucentId}_${pageIndex}`
  ts: number;
  lucentId: string;    // original LucentNoteEntry.id
  lessonTitle: string;
  subject: string;
  pageIndex: number;
  pageNo: string;
  totalPages: number;
  scrollY: number;
  scrollPct: number;   // page-level reading progress (0–100)
}

export const getRecentLucent = (): RecentLucentEntry[] => {
  try {
    return safeParse<RecentLucentEntry[]>(localStorage.getItem(RECENT_LUCENT_KEY), []);
  } catch {
    return [];
  }
};

export const saveRecentLucent = (entry: Omit<RecentLucentEntry, 'ts'>) => {
  try {
    const list = getRecentLucent().filter(e => e.id !== entry.id);
    list.unshift({ ...entry, ts: Date.now() });
    localStorage.setItem(RECENT_LUCENT_KEY, JSON.stringify(list.slice(0, MAX_LUCENT_ITEMS)));
  } catch {}
};

export const removeRecentLucent = (id: string) => {
  try {
    const list = getRecentLucent().filter(e => e.id !== id);
    localStorage.setItem(RECENT_LUCENT_KEY, JSON.stringify(list));
  } catch {}
};

// === FULLY-READ TRACKING ===
// When a TTS "Read All" finishes the LAST topic of a note, that note is marked
// as fully read. Used by the History page to show a green "Done" check.
export type FullyReadKind = 'chapter' | 'hw' | 'lucent';

export interface FullyReadEntry {
  id: string;
  ts: number;
  kind: FullyReadKind;
  title: string;
  subtitle?: string;
}

export const getFullyReadMap = (): Record<string, FullyReadEntry> => {
  try {
    const raw = localStorage.getItem(FULLY_READ_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
};

export const isFullyRead = (id: string): boolean => {
  return !!getFullyReadMap()[id];
};

export const markNoteFullyRead = (entry: Omit<FullyReadEntry, 'ts'>) => {
  try {
    const map = getFullyReadMap();
    map[entry.id] = { ...entry, ts: Date.now() };
    // Trim to MAX_FULLY_READ keeping newest by ts
    const sorted = Object.values(map).sort((a, b) => b.ts - a.ts).slice(0, MAX_FULLY_READ);
    const next: Record<string, FullyReadEntry> = {};
    sorted.forEach(e => { next[e.id] = e; });
    localStorage.setItem(FULLY_READ_KEY, JSON.stringify(next));
  } catch {}
};

export const removeFullyRead = (id: string) => {
  try {
    const map = getFullyReadMap();
    delete map[id];
    localStorage.setItem(FULLY_READ_KEY, JSON.stringify(map));
  } catch {}
};

// === READING STREAK ===

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getReadDates = (): string[] => {
  try {
    return safeParse<string[]>(localStorage.getItem(READ_DATES_KEY), []);
  } catch {
    return [];
  }
};

export const markReadToday = (itemId?: string) => {
  try {
    const t = todayKey();
    const list = getReadDates();
    if (list[0] !== t) {
      const next = [t, ...list.filter(d => d !== t)].slice(0, MAX_DATES);
      localStorage.setItem(READ_DATES_KEY, JSON.stringify(next));
    }
    // Track unique item IDs read per day for "best day" stats
    if (itemId) {
      const raw = localStorage.getItem(READ_ITEMS_BY_DAY_KEY);
      let map: Record<string, string[]> = {};
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) map = parsed;
      } catch {}
      const todayItems = new Set(map[t] || []);
      if (!todayItems.has(itemId)) {
        todayItems.add(itemId);
        map[t] = Array.from(todayItems);
        // Cap stored days
        const keys = Object.keys(map).sort().reverse().slice(0, MAX_DATES);
        const trimmed: Record<string, string[]> = {};
        keys.forEach(k => { trimmed[k] = map[k]; });
        localStorage.setItem(READ_ITEMS_BY_DAY_KEY, JSON.stringify(trimmed));
      }
    }
  } catch {}
};

export interface BestDay {
  dateStr: string;
  count: number;
}

export const getBestReadingDay = (): BestDay | null => {
  try {
    const raw = localStorage.getItem(READ_ITEMS_BY_DAY_KEY);
    if (!raw) return null;
    const map: Record<string, string[]> = JSON.parse(raw) || {};
    let best: BestDay | null = null;
    Object.entries(map).forEach(([dateStr, ids]) => {
      const count = Array.isArray(ids) ? new Set(ids).size : 0;
      if (count > 0 && (!best || count > best.count)) {
        best = { dateStr, count };
      }
    });
    return best;
  } catch {
    return null;
  }
};

export const getTodayItemCount = (): number => {
  try {
    const raw = localStorage.getItem(READ_ITEMS_BY_DAY_KEY);
    if (!raw) return 0;
    const map: Record<string, string[]> = JSON.parse(raw) || {};
    const ids = map[todayKey()];
    return Array.isArray(ids) ? new Set(ids).size : 0;
  } catch {
    return 0;
  }
};

export interface StreakInfo {
  current: number;
  longest: number;
  readToday: boolean;
}

export const getReadingStreak = (): StreakInfo => {
  const list = getReadDates();
  if (list.length === 0) return { current: 0, longest: 0, readToday: false };

  // Normalize and sort descending
  const set = new Set(list);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const readToday = set.has(fmt(today));

  // Current streak: walk back day-by-day from today (or yesterday if not read today)
  let current = 0;
  const cursor = new Date(today);
  if (!readToday) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(fmt(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak across saved dates
  const sorted = Array.from(set).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of sorted) {
    const d = new Date(ds + 'T00:00:00');
    if (prev) {
      const diffDays = Math.round((d.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) run++;
      else run = 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  return { current, longest: Math.max(longest, current), readToday };
};
