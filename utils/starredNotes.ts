const STORAGE_KEY = 'nst_starred_notes';

export interface StarredNote {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  type: string;
  chapterId?: string;
  subjectName?: string;
  starredAt: number;
}

export const getStarredNotes = (): StarredNote[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StarredNote[];
  } catch {
    return [];
  }
};

export const isNoteStarred = (id: string): boolean => {
  return getStarredNotes().some(n => n.id === id);
};

export const addStarredNote = (note: StarredNote): void => {
  const existing = getStarredNotes();
  if (existing.some(n => n.id === note.id)) return;
  const updated = [note, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const removeStarredNote = (id: string): void => {
  const existing = getStarredNotes();
  const updated = existing.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const toggleStarredNote = (note: StarredNote): boolean => {
  if (isNoteStarred(note.id)) {
    removeStarredNote(note.id);
    return false;
  } else {
    addStarredNote(note);
    return true;
  }
};
