/**
 * noteSearcher.ts — Pure local-storage word-match note finder. No AI.
 *
 * For every cached chapter in storage (keys starting with `nst_content_`),
 * counts how many unique query words appear in the note text.
 * Returns results sorted by match count (highest first).
 */

import { storage } from './storage';

export interface NoteSearchResult {
  storageKey: string;
  chapterId: string;
  subjectName: string;
  board: string;
  classLevel: string;
  // Best matching note within the chapter
  noteTitle: string;
  noteContent: string;      // ~360 char snippet around the match
  noteFullContent: string;  // full plain text of the matched blob (for Compare view)
  matchCount: number;       // how many unique query words matched
  matchedWords: string[];
  // So the caller can open the chapter
  chapterTitleFromKey: string;
  // Source info — book name and page/topic number
  bookName?: string;     // admin-set book name (e.g. "Lucent GK") or subject name
  pageNo?: string;       // page number string or topic identifier (e.g. "42", "Topic 3")
  topicName?: string;    // admin-tagged topic name for topic-wise compare matching
}

/** Strip HTML tags and collapse whitespace to get plain text. */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Blob {
  title: string;
  text: string;
  bookName?: string;
  pageNo?: string;
}

/** Build a plain-text blob from all note fields in a stored chapter record. */
function extractTextBlobs(data: any, defaultSubject: string): Blob[] {
  const out: Blob[] = [];
  if (!data) return out;

  // Standard topic notes (topicNotes, deepDive*, allTopics)
  const addFromArray = (arr: any[], titleField = 'title', contentField = 'content') => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item, idx) => {
      const t = item?.[titleField] || item?.topic || '';
      const c = item?.[contentField] || item?.content || '';
      if (c) {
        const cleanTitle = stripHtml(t);
        // pageNo: use the item's explicit pageNo field, or its index+1 as fallback
        const pg = item?.pageNo
          ? String(item.pageNo)
          : (item?.pageIndex != null ? `${item.pageIndex + 1}` : `${idx + 1}`);
        out.push({
          title: cleanTitle,
          text: stripHtml(c),
          bookName: data.bookName || defaultSubject,
          pageNo: pg,
        });
      }
    });
  };

  addFromArray(data.topicNotes);
  addFromArray(data.deepDiveEntries);
  addFromArray(data.schoolDeepDiveEntries);
  addFromArray(data.competitionDeepDiveEntries);
  addFromArray(data.allTopics);

  // Lucent-style: data has a `pages` array with { pageNo, content } per page
  if (Array.isArray(data.pages)) {
    data.pages.forEach((p: any) => {
      const c = p?.content || '';
      if (c) {
        out.push({
          title: p?.title || stripHtml(p?.pageNo ? `Page ${p.pageNo}` : ''),
          text: stripHtml(c),
          bookName: data.bookName || data.lessonTitle || defaultSubject,
          pageNo: p?.pageNo ? String(p.pageNo) : undefined,
        });
      }
    });
  }

  // Nested lucentNotes array (if the chapter record embeds a LucentNoteEntry)
  if (Array.isArray(data.lucentNotes)) {
    data.lucentNotes.forEach((entry: any) => {
      const entryBook = entry?.bookName || entry?.lessonTitle || defaultSubject;
      if (Array.isArray(entry.pages)) {
        entry.pages.forEach((p: any) => {
          const c = p?.content || '';
          if (c) {
            out.push({
              title: p?.title || (p?.pageNo ? `Page ${p.pageNo}` : ''),
              text: stripHtml(c),
              bookName: entryBook,
              pageNo: p?.pageNo ? String(p.pageNo) : undefined,
            });
          }
        });
      }
    });
  }

  // Flat content field
  if (typeof data.content === 'string' && data.content.length > 10) {
    out.push({
      title: '',
      text: stripHtml(data.content),
      bookName: data.bookName || defaultSubject,
    });
  }

  return out;
}

/** Count unique words from `queryWords` that appear in `text` (case-insensitive). */
function countMatches(text: string, queryWords: string[]): { count: number; words: string[] } {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const w of queryWords) {
    if (w.length >= 3 && lower.includes(w.toLowerCase())) {
      matched.push(w);
    }
  }
  return { count: matched.length, words: matched };
}

/**
 * Parse a storage key of the form `nst_content_[BOARD]_[CLASS][STREAM]_[SUBJECT]_[CHAPTERID]`
 * into its components. Returns null if it doesn't match.
 */
function parseKey(key: string): { board: string; classLevel: string; subjectName: string; chapterId: string } | null {
  if (!key.startsWith('nst_content_')) return null;
  const parts = key.replace('nst_content_', '').split('_');
  // Minimum: board + class + subject + chapterId = 4 parts
  if (parts.length < 4) return null;
  const board = parts[0];
  const classLevel = parts[1];
  const chapterId = parts[parts.length - 1];
  // Subject is everything between classLevel and chapterId
  const subjectName = parts.slice(2, parts.length - 1).join('_');
  return { board, classLevel, subjectName, chapterId };
}

/**
 * Search ALL locally cached notes for matches to the given query words.
 * Returns results sorted by match count (descending), highest match first.
 *
 * @param queryWords  Array of words extracted from wrong MCQ questions / topic name
 * @param maxResults  Max results to return (default 20)
 */
export async function searchNotesByWords(
  queryWords: string[],
  maxResults = 20
): Promise<NoteSearchResult[]> {
  if (!queryWords.length) return [];

  let keys: string[] = [];
  try {
    keys = (await storage.keys()).filter(k => k.startsWith('nst_content_'));
  } catch {
    return [];
  }

  const results: NoteSearchResult[] = [];

  for (const key of keys) {
    const meta = parseKey(key);
    if (!meta) continue;

    let data: any = null;
    try {
      data = await storage.getItem(key);
    } catch { continue; }
    if (!data) continue;

    const defaultSubject = meta.subjectName.replace(/-/g, ' ');
    const blobs = extractTextBlobs(data, defaultSubject);
    if (!blobs.length) continue;

    // Find the blob with the highest match count in this chapter
    let bestBlob: Blob | null = null;
    let bestCount = 0;
    let bestWords: string[] = [];

    for (const blob of blobs) {
      const combined = (blob.title + ' ' + blob.text).toLowerCase();
      const { count, words } = countMatches(combined, queryWords);
      if (count > bestCount) {
        bestCount = count;
        bestBlob = blob;
        bestWords = words;
      }
    }

    if (bestCount === 0 || !bestBlob) continue;

    // Build a readable snippet (~300 chars) from the best blob
    const rawText = bestBlob.text;
    const firstMatchIdx = (() => {
      const lower = rawText.toLowerCase();
      for (const w of bestWords) {
        const i = lower.indexOf(w.toLowerCase());
        if (i >= 0) return i;
      }
      return 0;
    })();
    const start = Math.max(0, firstMatchIdx - 60);
    const end = Math.min(rawText.length, firstMatchIdx + 300);
    let snippet = rawText.slice(start, end).trim();
    if (start > 0) snippet = '… ' + snippet;
    if (end < rawText.length) snippet += ' …';

    results.push({
      storageKey: key,
      chapterId: meta.chapterId,
      subjectName: defaultSubject,
      board: meta.board,
      classLevel: meta.classLevel,
      noteTitle: bestBlob.title || defaultSubject,
      noteContent: snippet,
      noteFullContent: bestBlob.text,
      matchCount: bestCount,
      matchedWords: bestWords,
      chapterTitleFromKey: meta.chapterId,
      bookName: bestBlob.bookName || defaultSubject,
      pageNo: bestBlob.pageNo,
    });
  }

  // Sort: most matches first; within same count, sort by note length (longer = more content)
  results.sort((a, b) => b.matchCount - a.matchCount || b.noteContent.length - a.noteContent.length);

  return results.slice(0, maxResults);
}

/**
 * Search ALL locally cached notes (nst_content_*) where the CHAPTER TITLE,
 * SUBJECT NAME, or any blob TITLE contains the query words.
 * Used for "Title se Compare" on Class 6-12 chapters.
 */
export async function searchNotesByTitle(
  queryWords: string[],
  maxResults = 30
): Promise<NoteSearchResult[]> {
  if (!queryWords.length) return [];
  const effectiveWords = queryWords.filter(w => w.length >= 2);
  if (!effectiveWords.length) return [];

  let keys: string[] = [];
  try {
    keys = (await storage.keys()).filter(k => k.startsWith('nst_content_'));
  } catch {
    return [];
  }

  const results: NoteSearchResult[] = [];

  for (const key of keys) {
    const meta = parseKey(key);
    if (!meta) continue;

    // Normalise chapterId and subjectName for matching (replace - _ with space)
    const chapterWords = meta.chapterId.replace(/[-_]/g, ' ').toLowerCase();
    const subjectWords = meta.subjectName.replace(/[-_]/g, ' ').toLowerCase();

    // Check how many query words appear in chapter id / subject name
    const titleMatchedWords = effectiveWords.filter(w =>
      chapterWords.includes(w.toLowerCase()) || subjectWords.includes(w.toLowerCase())
    );

    // Also check blob titles
    let data: any = null;
    try { data = await storage.getItem(key); } catch { continue; }
    if (!data) continue;

    const defaultSubject = meta.subjectName.replace(/-/g, ' ');
    const blobs = extractTextBlobs(data, defaultSubject);

    // Find blobs whose TITLE contains a query word
    const blobTitleMatches: { blob: Blob; words: string[] }[] = [];
    for (const blob of blobs) {
      const blobTitle = (blob.title || '').toLowerCase();
      const matched = effectiveWords.filter(w => blobTitle.includes(w.toLowerCase()));
      if (matched.length > 0) {
        blobTitleMatches.push({ blob, words: matched });
      }
    }

    // Combine: chapter-level title match OR any blob title match
    const allMatchedWords = Array.from(new Set([
      ...titleMatchedWords,
      ...blobTitleMatches.flatMap(b => b.words),
    ]));
    if (allMatchedWords.length === 0) continue;

    // Pick best blob: prefer blob title match; fall back to first blob
    const bestEntry = blobTitleMatches.length > 0
      ? blobTitleMatches.sort((a, b) => b.words.length - a.words.length)[0]
      : { blob: blobs[0], words: titleMatchedWords };

    const best = bestEntry.blob;
    const fullText = best.text;
    const snippet = fullText.substring(0, 150);

    results.push({
      storageKey: key,
      chapterId: meta.chapterId,
      subjectName: defaultSubject,
      board: meta.board,
      classLevel: meta.classLevel,
      noteTitle: best.title || defaultSubject,
      noteContent: snippet,
      noteFullContent: fullText,
      matchCount: allMatchedWords.length,
      matchedWords: allMatchedWords,
      chapterTitleFromKey: meta.chapterId,
      bookName: best.bookName || defaultSubject,
      pageNo: best.pageNo,
    });
  }

  results.sort((a, b) => b.matchCount - a.matchCount || b.noteFullContent.length - a.noteFullContent.length);
  return results.slice(0, maxResults);
}

export interface PageBlob {
  title: string;
  text: string;
  bookName: string;
  pageNo?: string;
  matchCount: number;
}

/**
 * Load ALL pages/blobs from a single storage key (for Compare-by-Page mode).
 * Optionally ranks each page by how many query words it contains.
 */
export async function loadAllPagesFromKey(
  storageKey: string,
  queryWords: string[] = []
): Promise<PageBlob[]> {
  let data: any = null;
  try { data = await storage.getItem(storageKey); } catch { return []; }
  if (!data) return [];

  const meta = parseKey(storageKey);
  const defaultSubject = meta ? meta.subjectName.replace(/-/g, ' ') : '';
  const blobs = extractTextBlobs(data, defaultSubject);

  return blobs.map(b => {
    const { count } = queryWords.length
      ? countMatches((b.title + ' ' + b.text).toLowerCase(), queryWords)
      : { count: 0 };
    return {
      title: b.title,
      text: b.text,
      bookName: b.bookName || defaultSubject,
      pageNo: b.pageNo,
      matchCount: count,
    };
  }).sort((a, b) => b.matchCount - a.matchCount);
}
