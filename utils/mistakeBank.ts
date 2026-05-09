import { storage } from './storage';

const MISTAKE_BANK_KEY = 'nst_mistake_bank_v1';

export interface MistakeEntry {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  topic?: string;
  chapterTitle?: string;
  subjectName?: string;
  classLevel?: string;
  board?: string;
  addedAt: number;
  lastSeenAt: number;
  attempts: number;
  source?: string;
}

const hashQuestion = (q: string, correctAnswer: number): string => {
  const norm = (q || '').replace(/\s+/g, ' ').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = ((hash << 5) - hash) + norm.charCodeAt(i);
    hash |= 0;
  }
  return `mst_${Math.abs(hash).toString(36)}_${correctAnswer}`;
};

export const getMistakeBank = async (): Promise<MistakeEntry[]> => {
  try {
    const items = await storage.getItem<MistakeEntry[]>(MISTAKE_BANK_KEY);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

export const getMistakeBankSync = (): MistakeEntry[] => {
  try {
    const raw = localStorage.getItem(MISTAKE_BANK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeMistakeBank = async (items: MistakeEntry[]): Promise<void> => {
  try {
    await storage.setItem(MISTAKE_BANK_KEY, items);
    try { localStorage.setItem(MISTAKE_BANK_KEY, JSON.stringify(items)); } catch {}
  } catch (e) {
    console.error('writeMistakeBank failed:', e);
  }
};

export const addMistakes = async (
  newItems: Array<Omit<MistakeEntry, 'id' | 'addedAt' | 'lastSeenAt' | 'attempts'>>
): Promise<number> => {
  if (!newItems || newItems.length === 0) return 0;
  const existing = await getMistakeBank();
  const byId = new Map<string, MistakeEntry>();
  existing.forEach(e => byId.set(e.id, e));
  const now = Date.now();
  let added = 0;
  for (const raw of newItems) {
    if (!raw.question || !Array.isArray(raw.options) || raw.options.length < 2) continue;
    const id = hashQuestion(raw.question, raw.correctAnswer);
    if (byId.has(id)) {
      const prev = byId.get(id)!;
      byId.set(id, { ...prev, lastSeenAt: now, attempts: (prev.attempts || 0) + 1 });
    } else {
      byId.set(id, {
        id,
        question: raw.question,
        options: raw.options,
        correctAnswer: raw.correctAnswer,
        explanation: raw.explanation,
        topic: raw.topic,
        chapterTitle: raw.chapterTitle,
        subjectName: raw.subjectName,
        classLevel: raw.classLevel,
        board: raw.board,
        source: raw.source,
        addedAt: now,
        lastSeenAt: now,
        attempts: 1,
      });
      added++;
    }
  }
  await writeMistakeBank(Array.from(byId.values()));
  return added;
};

export const removeMistakes = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  const existing = await getMistakeBank();
  const set = new Set(ids);
  await writeMistakeBank(existing.filter(e => !set.has(e.id)));
};

export const removeMistakeByQuestion = async (question: string, correctAnswer: number): Promise<void> => {
  const id = hashQuestion(question, correctAnswer);
  await removeMistakes([id]);
};

export const clearMistakeBank = async (): Promise<void> => {
  await writeMistakeBank([]);
};

export const getMistakeCount = (): number => {
  return getMistakeBankSync().length;
};
