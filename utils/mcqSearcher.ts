/**
 * mcqSearcher.ts — Pure local-storage word-match MCQ finder. No AI.
 *
 * For every cached chapter in storage (keys starting with `nst_content_`),
 * walks every MCQ source (admin-curated MCQs on Lucent pages, generated
 * Lucent MCQs, comp-mode MCQs, etc.) and returns the questions whose
 * question/options/explanation text contains any of the supplied keywords.
 *
 * Designed to mirror noteSearcher.ts so the Important Notes search bar can
 * surface MCQ hits alongside note hits.
 */

import { storage } from './storage';

export interface McqSearchHit {
  storageKey: string;
  chapterId: string;
  subjectName: string;
  board: string;
  classLevel: string;
  bookName: string;
  pageNo?: string;
  pageIndex?: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  matchedWords: string[];
  matchCount: number;
}

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

interface RawMcq {
  question?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  pageNo?: string | number;
  pageIndex?: number;
  bookName?: string;
}

// Pull MCQs out of every shape we know of: data.mcqs (flat), data.pages[*].mcqs
// (Lucent), data.lucentNotes[*].pages[*].mcqs (nested), and
// data.competitionMcqs / data.allMcqs as flat arrays.
function extractMcqs(data: any, defaultBook: string): RawMcq[] {
  const out: RawMcq[] = [];
  if (!data) return out;

  const pushList = (arr: any[], pageNo?: any, pageIndex?: number, book?: string) => {
    if (!Array.isArray(arr)) return;
    for (const m of arr) {
      if (!m || typeof m !== 'object' || !m.question) continue;
      out.push({
        question: m.question,
        options: Array.isArray(m.options) ? m.options : [],
        correctAnswer: typeof m.correctAnswer === 'number' ? m.correctAnswer : 0,
        explanation: m.explanation || m.examTip || '',
        pageNo: pageNo,
        pageIndex,
        bookName: book || defaultBook,
      });
    }
  };

  pushList(data.mcqs);
  pushList(data.competitionMcqs);
  pushList(data.allMcqs);

  if (Array.isArray(data.pages)) {
    data.pages.forEach((p: any, idx: number) => {
      const pgNo = p?.pageNo ?? (idx + 1);
      pushList(p?.mcqs, pgNo, idx, data.bookName || data.lessonTitle || defaultBook);
    });
  }

  if (Array.isArray(data.lucentNotes)) {
    data.lucentNotes.forEach((entry: any) => {
      const entryBook = entry?.bookName || entry?.lessonTitle || defaultBook;
      if (Array.isArray(entry.pages)) {
        entry.pages.forEach((p: any, idx: number) => {
          const pgNo = p?.pageNo ?? (idx + 1);
          pushList(p?.mcqs, pgNo, idx, entryBook);
        });
      }
    });
  }

  return out;
}

function parseKey(key: string): { board: string; classLevel: string; subjectName: string; chapterId: string } | null {
  if (!key.startsWith('nst_content_')) return null;
  const parts = key.replace('nst_content_', '').split('_');
  if (parts.length < 4) return null;
  return {
    board: parts[0],
    classLevel: parts[1],
    chapterId: parts[parts.length - 1],
    subjectName: parts.slice(2, parts.length - 1).join('_'),
  };
}

function matchWords(text: string, words: string[]): { count: number; matched: string[] } {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const w of words) {
    if (w.length >= 2 && lower.includes(w.toLowerCase())) matched.push(w);
  }
  return { count: matched.length, matched };
}

/**
 * Search every cached MCQ across all chapters for matches.
 * @param queryWords  words extracted from the user's search query
 * @param maxResults  limit returned hits (default 25)
 */
export async function searchMcqsByWords(
  queryWords: string[],
  maxResults = 25
): Promise<McqSearchHit[]> {
  if (!queryWords.length) return [];

  let keys: string[] = [];
  try {
    keys = (await storage.keys()).filter(k => k.startsWith('nst_content_'));
  } catch {
    return [];
  }

  const hits: McqSearchHit[] = [];

  for (const key of keys) {
    const meta = parseKey(key);
    if (!meta) continue;

    let data: any = null;
    try { data = await storage.getItem(key); } catch { continue; }
    if (!data) continue;

    const defaultBook = data.bookName || data.lessonTitle || meta.subjectName.replace(/-/g, ' ');
    const mcqs = extractMcqs(data, defaultBook);
    if (!mcqs.length) continue;

    for (const m of mcqs) {
      const haystack = [
        stripHtml(m.question || ''),
        ...(m.options || []).map(stripHtml),
        stripHtml(m.explanation || ''),
      ].join(' \n ');
      const { count, matched } = matchWords(haystack, queryWords);
      if (count === 0) continue;

      hits.push({
        storageKey: key,
        chapterId: meta.chapterId,
        subjectName: meta.subjectName.replace(/-/g, ' '),
        board: meta.board,
        classLevel: meta.classLevel,
        bookName: m.bookName || defaultBook,
        pageNo: m.pageNo != null ? String(m.pageNo) : undefined,
        pageIndex: m.pageIndex,
        question: stripHtml(m.question || ''),
        options: (m.options || []).map(stripHtml),
        correctAnswer: m.correctAnswer ?? 0,
        explanation: m.explanation ? stripHtml(m.explanation) : undefined,
        matchedWords: matched,
        matchCount: count,
      });
    }
  }

  // Sort: most matches first, then shorter (more focussed) questions first.
  hits.sort((a, b) => b.matchCount - a.matchCount || a.question.length - b.question.length);
  return hits.slice(0, maxResults);
}
