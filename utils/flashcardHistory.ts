// Flashcard + Notes-read activity tracker (localStorage based, offline-safe).
// Used by the History page to show:
//  - How many flashcard sessions the student has completed (and from which subject / lesson).
//  - Which notes the student has read and how long they spent on each.

const FLASHCARD_KEY = 'nst_flashcard_sessions_v1';
const NOTES_READ_KEY = 'nst_notes_read_sessions_v1';
const MAX_ENTRIES = 200;

export interface FlashcardSession {
  id: string;
  ts: number;            // session END timestamp (ms)
  subject: string;       // subject name (or "—")
  lessonTitle: string;   // chapter / lesson / page title
  total: number;         // questions shown in the session
  viewed: number;        // questions actually viewed (>=1)
  durationSec: number;   // wall-clock seconds spent in the session
}

export interface NotesReadSession {
  id: string;
  ts: number;
  subject: string;
  lessonTitle: string;
  kind: 'homework' | 'lucent' | 'chapter';
  durationSec: number;
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

// Defensive: if a caller (or older storage) shoved a Subject object into the
// `subject` field, coerce it back to a plain string. Otherwise React would
// crash with "Objects are not valid as a React child" the moment HistoryPage
// tried to render it.
const coerceSubject = (val: any): string => {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.id === 'string') return val.id;
  }
  return '—';
};

// ---------- FLASHCARD ----------

export const getFlashcardSessions = (): FlashcardSession[] => {
  try {
    const list = safeParse<FlashcardSession[]>(localStorage.getItem(FLASHCARD_KEY), []);
    return list.map(s => ({ ...s, subject: coerceSubject((s as any).subject) }));
  } catch {
    return [];
  }
};

export const recordFlashcardSession = (entry: Omit<FlashcardSession, 'id' | 'ts'>) => {
  try {
    if (!entry || entry.viewed < 1 || entry.durationSec < 2) return; // ignore quick exits
    const list = getFlashcardSessions();
    const next: FlashcardSession = {
      ...entry,
      subject: coerceSubject((entry as any).subject),
      id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
    };
    list.unshift(next);
    localStorage.setItem(FLASHCARD_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {}
};

export const clearFlashcardSessions = () => {
  try { localStorage.removeItem(FLASHCARD_KEY); } catch {}
};

// ---------- NOTES READ ----------

export const getNotesReadSessions = (): NotesReadSession[] => {
  try {
    const list = safeParse<NotesReadSession[]>(localStorage.getItem(NOTES_READ_KEY), []);
    return list.map(s => ({ ...s, subject: coerceSubject((s as any).subject) }));
  } catch {
    return [];
  }
};

export const recordNotesReadSession = (entry: Omit<NotesReadSession, 'id' | 'ts'>) => {
  try {
    if (!entry || entry.durationSec < 5) return; // ignore < 5 second taps
    const list = getNotesReadSessions();
    const next: NotesReadSession = {
      ...entry,
      subject: coerceSubject((entry as any).subject),
      id: `nr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
    };
    list.unshift(next);
    localStorage.setItem(NOTES_READ_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {}
};

export const clearNotesReadSessions = () => {
  try { localStorage.removeItem(NOTES_READ_KEY); } catch {}
};

// ---------- HELPERS ----------

export const formatDur = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
};
