import { stripHtml } from './textToSpeech';

export interface NotesTopic {
  text: string;
  isHeading: boolean;
}

/**
 * Returns true if the string is essentially just ellipsis / dots / placeholders
 * and carries no real content — these lines come from AI truncation artifacts
 * or admin placeholder text and should be hidden from students.
 */
function isPlaceholderLine(t: string): boolean {
  const stripped = t.replace(/[.\u2026\s…\-_*]/g, '').trim();
  return stripped.length === 0;
}

/**
 * Removes trailing ellipsis / dots from a string (e.g. "topic text......" → "topic text").
 */
function stripTrailingDots(t: string): string {
  return t.replace(/[\s.…]+$/, '').trim();
}

/**
 * Splits notes content into a list of topic lines.
 * Handles markdown bullets (`*`, `-`, `•`), numbered items, headings (`###`),
 * `SET - N` style section labels, and plain HTML / text. Each non-empty line
 * becomes one topic; an indented continuation is appended to the previous topic.
 */
export const splitIntoTopics = (raw: string): NotesTopic[] => {
  if (!raw) return [];

  let text = raw;
  if (/[<][a-zA-Z!\/]/.test(text)) {
    text = text
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\/\s*(p|div|li|h[1-6]|tr|section|article)\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n* ')
      .replace(/<\s*h[1-6][^>]*>/gi, '\n### ');
    text = stripHtml(text);
  }

  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  const rawLines = text.split(/\r?\n/);
  const topics: NotesTopic[] = [];
  let buffer = '';
  let bufferIsHeading = false;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) topics.push({ text: trimmed, isHeading: bufferIsHeading });
    buffer = '';
    bufferIsHeading = false;
  };

  for (let line of rawLines) {
    line = line.replace(/\s+$/g, '');
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }

    const isMdHeading = /^#{1,6}\s+/.test(trimmed);
    const isShortBoldHeading = /^\*\*[^*]+\*\*\s*$/.test(trimmed) && trimmed.length < 80;
    // A "PART 1" / "UNIT 2" / "CHAPTER 3" prefix only counts as a STANDALONE
    // heading when the line is short and is just the label (with maybe a tiny
    // title). Earlier this matched even when the entire long content blob
    // happened to start with "PART 1:" — which made the whole library-reference
    // text turn into a single heading and skip all sentence-splitting (=> the
    // "Read More" view showed everything as one giant blob with "1 topics").
    // Now: only treat as heading when the line is short AND has no Hindi danda
    // or sentence-ending punctuation in the middle (i.e. it's truly a label).
    const isShortSectionLabel =
      /^(SET|MODEL\s*SET|UNIT|CHAPTER|PART)\s*[-–]?\s*\d+/i.test(trimmed) &&
      trimmed.length <= 80 &&
      !/[।!?]/.test(trimmed) &&
      // Allow at most one trailing period (e.g. "PART 1.")
      (trimmed.match(/\./g) || []).length <= 1;

    if (isMdHeading || isShortBoldHeading || isShortSectionLabel) {
      flush();
      const cleaned = trimmed.replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
      topics.push({ text: cleaned, isHeading: true });
      continue;
    }

    const isBulletStart = /^([*\-•]|\d+[.)])\s+/.test(trimmed);
    if (isBulletStart) {
      flush();
      buffer = trimmed.replace(/^([*\-•]|\d+[.)])\s+/, '');
    } else {
      if (buffer) {
        const indented = /^\s+/.test(line) || /^[-–]/.test(trimmed);
        if (indented) {
          buffer += ' ' + trimmed.replace(/^[-–]\s*/, '').trim();
          continue;
        }
        flush();
        buffer = trimmed;
      } else {
        buffer = trimmed;
      }
    }
  }
  flush();

  // Post-process: explode any topic line into per-sentence chunks so the
  // reader shows tappable lines instead of one giant paragraph blob. We split
  // on multiple boundaries (in priority order):
  //   1. Hindi danda (।)  — ALWAYS starts a new chunk (every full-stop = a
  //      new note line, as per the Read More requirement: "full stop ke
  //      baad new notes ban jayega").
  //   2. English . ! ?    — followed by whitespace + capital / Devanagari /
  //      digit / paren / emoji / bullet / hyphen (covers nearly everything
  //      that follows a sentence break, including 🎯/📝 emoji headers).
  //      Abbreviations like "Dr." or "e.g." don't match because they're
  //      followed by a lowercase letter.
  //   3. Inline section markers like "(IMPORTANT FACTS)", "(PRIMARY SECTOR):",
  //      "PART 1:", "🎯", "📝", "✏️" etc. — many imported library blobs glue
  //      everything inside one <p> with these as the only structure.
  // Headings are exploded too if they're long (>= 80 chars or contain a
  // sentence terminator) — the first chunk stays as the heading and the rest
  // become regular tappable body lines. Empty / placeholder fragments dropped.
  // Hindi danda is its own boundary (always splits, regardless of what follows).
  const HINDI_DANDA_BOUNDARY = /(?<=।)\s*/g;
  // English sentence end — needs a wider lookahead so we also split before
  // emojis, opening parens, bullets, dashes etc., not just A-Z / Devanagari.
  // Unicode property \p{Emoji} would be ideal but is not safe in older runtimes,
  // so we enumerate the common emoji ranges and symbol categories explicitly.
  const ENGLISH_SENTENCE_BOUNDARY =
    /(?<=[.!?])\s+(?=[A-Z\u0900-\u097F0-9(\-•*"'\u2013\u2014\u2018\u201C\uD83C-\uDBFF\u2600-\u27BF])/g;
  // Section markers that should each START a new topic line.
  const SECTION_MARKERS = /(?=(?:PART|UNIT|CHAPTER|SECTION|SET|MODEL\s*SET)\s*[-–]?\s*\d+\s*[:.)])|(?=\([A-Z][A-Z\s\/]{2,}\)\s*[:.)])|(?=📝|🎯|✏️|📌|⭐|💡|🔥|✨|📚|🎓|⚡)/g;

  const splitOneTopic = (raw: string): string[] => {
    let out: string[] = [raw];
    // 1. Hindi danda — always a sentence boundary.
    out = out.flatMap(s => s.split(HINDI_DANDA_BOUNDARY));
    // 2. English sentence-end split (. ! ?)
    out = out.flatMap(s => s.split(ENGLISH_SENTENCE_BOUNDARY));
    // 3. Section-marker split (for any fragment still > ~80 chars; we also
    //    catch leading inline labels like "PART 1:" / "🎯 EXAM SPECIAL" that
    //    survived the first two passes).
    out = out.flatMap(s => (s.length > 80 ? s.split(SECTION_MARKERS) : [s]));
    return out.map(s => s.trim()).filter(Boolean);
  };

  const exploded: NotesTopic[] = [];
  for (const t of topics) {
    const cleaned = t.text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    // Skip pure-placeholder lines (only dots, dashes, ellipsis etc.)
    if (isPlaceholderLine(cleaned)) continue;

    // Headings: keep short ones intact, but explode long heading-blobs so we
    // don't end up with a single un-tappable wall of text (the "PART 1: …"
    // library-reference bug).
    if (t.isHeading) {
      const looksLikeBlob = cleaned.length > 80 || /[।!?]/.test(cleaned);
      if (!looksLikeBlob) {
        exploded.push({ ...t, text: cleaned });
        continue;
      }
      const parts = splitOneTopic(cleaned);
      if (parts.length <= 1) {
        exploded.push({ ...t, text: stripTrailingDots(cleaned) || cleaned });
        continue;
      }
      // First chunk stays as the heading marker, rest become normal tappable lines.
      let first = true;
      for (const p of parts) {
        if (isPlaceholderLine(p)) continue;
        const finalText = stripTrailingDots(p) || p;
        if (!finalText) continue;
        exploded.push({ text: finalText, isHeading: first });
        first = false;
      }
      continue;
    }

    const parts = splitOneTopic(cleaned);
    if (parts.length <= 1) {
      const finalText = stripTrailingDots(cleaned);
      if (finalText) exploded.push({ ...t, text: finalText });
      continue;
    }
    for (const p of parts) {
      if (!isPlaceholderLine(p)) {
        const finalText = stripTrailingDots(p) || p;
        if (finalText) exploded.push({ text: finalText, isHeading: false });
      }
    }
  }
  return exploded;
};
