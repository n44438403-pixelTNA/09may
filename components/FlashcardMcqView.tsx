import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ChevronRight, RotateCw, Volume2, Square, Shuffle, BookOpen, Eye, EyeOff } from 'lucide-react';
import type { MCQItem } from '../types';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import { recordFlashcardSession } from '../utils/flashcardHistory';

interface Props {
  questions: MCQItem[];
  title?: string;
  subtitle?: string;
  /** Subject name — used for the history entry. */
  subject?: string;
  onBack: () => void;
}

const SESSION_SIZE = 10; // user wants only 10 questions per session

const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const sampleN = <T,>(arr: T[], n: number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

export const FlashcardMcqView: React.FC<Props> = ({ questions, title, subtitle, subject, onBack }) => {
  // pickedIndices = indices into the original `questions` array, sampled to 10 random
  const [pickedIndices, setPickedIndices] = useState<number[]>(() => {
    const idx = questions.map((_, i) => i);
    return sampleN(idx, Math.min(SESSION_SIZE, idx.length));
  });
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState<null | 'q' | 'a'>(null);
  const lastSpokenRef = useRef<string>('');

  // Track session for history
  const sessionStartRef = useRef<number>(Date.now());
  const viewedIdxRef = useRef<Set<number>>(new Set([0]));

  // Reset on questions change
  useEffect(() => {
    const idx = questions.map((_, i) => i);
    setPickedIndices(sampleN(idx, Math.min(SESSION_SIZE, idx.length)));
    setPos(0);
    setRevealed(false);
    sessionStartRef.current = Date.now();
    viewedIdxRef.current = new Set([0]);
  }, [questions]);

  // Stop TTS on unmount or tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopSpeech();
        setAutoSpeak(null);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopSpeech();
    };
  }, []);

  // Record session on unmount
  useEffect(() => {
    return () => {
      const durationSec = Math.round((Date.now() - sessionStartRef.current) / 1000);
      recordFlashcardSession({
        subject: subject || '—',
        lessonTitle: title || 'Flashcards',
        total: pickedIndices.length,
        viewed: viewedIdxRef.current.size,
        durationSec,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = pickedIndices.length;
  const currentQ = useMemo(() => questions[pickedIndices[pos]] || null, [questions, pickedIndices, pos]);

  if (!currentQ) {
    return (
      <div className="fixed inset-0 z-[200] bg-white flex flex-col h-[100dvh]">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-base font-black text-slate-800">Flashcards</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <BookOpen size={48} className="text-slate-300 mb-3" />
          <p className="font-black text-slate-700">Koi MCQ available nahi hai</p>
          <p className="text-xs text-slate-500 mt-1">Pehle is chapter ka content load karein.</p>
        </div>
      </div>
    );
  }

  const goNext = () => {
    stopSpeech();
    setAutoSpeak(null);
    setRevealed(false);
    if (pos >= total - 1) {
      // End of session — re-pick a fresh random batch from the full pool so each
      // run feels different. Stays on the LAST card if pool < SESSION_SIZE.
      if (questions.length > total) {
        const idx = questions.map((_, i) => i);
        setPickedIndices(sampleN(idx, Math.min(SESSION_SIZE, idx.length)));
        setPos(0);
        viewedIdxRef.current = new Set([0]);
      }
      return;
    }
    const nextPos = pos + 1;
    setPos(nextPos);
    viewedIdxRef.current.add(nextPos);
  };
  const goPrev = () => {
    stopSpeech();
    setAutoSpeak(null);
    setRevealed(false);
    setPos(p => Math.max(0, p - 1));
  };
  const reshuffle = () => {
    stopSpeech();
    setAutoSpeak(null);
    setRevealed(false);
    const idx = questions.map((_, i) => i);
    setPickedIndices(sampleN(idx, Math.min(SESSION_SIZE, idx.length)));
    setPos(0);
    viewedIdxRef.current = new Set([0]);
  };

  const playSide = (side: 'q' | 'a') => {
    const cleanQ = stripHtml(currentQ.question);
    const opts = (currentQ.options || []).map(o => stripHtml(o));
    const text = side === 'q'
      ? `Question: ${cleanQ}.`
      : `Sahi jawab: Option ${String.fromCharCode(65 + currentQ.correctAnswer)}, ${opts[currentQ.correctAnswer] || ''}.${currentQ.explanation ? ` Explanation: ${stripHtml(currentQ.explanation)}` : ''}`;
    if (autoSpeak === side && lastSpokenRef.current === text) {
      stopSpeech();
      setAutoSpeak(null);
      return;
    }
    stopSpeech();
    setAutoSpeak(side);
    lastSpokenRef.current = text;
    speakText(text, null, 1.0, 'hi-IN', () => setAutoSpeak(side), () => setAutoSpeak(null)).catch(() => setAutoSpeak(null));
  };

  const isLast = pos >= total - 1;
  const canShuffleMore = questions.length > total;

  return (
    <div className="flashcard-page-bg fixed inset-0 z-[200] bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col h-[100dvh]">
      {/* Top Bar */}
      <div className="flashcard-topbar sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate">Flashcards · {total} ka set</p>
          <h2 className="text-base font-black text-slate-800 truncate">{title || 'Flashcards'}</h2>
          {subtitle && <p className="text-[10px] font-bold text-slate-500 truncate">{subtitle}</p>}
        </div>
        <button
          onClick={reshuffle}
          className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition"
          title="Naye 10 questions"
          aria-label="Shuffle questions"
        >
          <Shuffle size={16} />
        </button>
      </div>

      {/* Progress */}
      <div className="flashcard-progressbar bg-white/70 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
        <div className="text-[11px] font-bold text-slate-600">
          <span className="text-indigo-600 font-black">{pos + 1}</span>
          <span className="text-slate-400"> / {total}</span>
        </div>
        <div className="flex-1 mx-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${((pos + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex items-start justify-center">
        <div className="w-full max-w-2xl space-y-3">
          {/* Question card — tap anywhere on the question to BOTH read it
              aloud AND reveal the answer. The user requested touch-driven TTS:
              tap question → reads question; tap answer → reads answer. We
              keep reveal-on-tap because that's the core flashcard interaction;
              tapping a second time toggles the answer back to hidden and
              stops any ongoing speech. */}
          <button
            type="button"
            onClick={() => {
              if (revealed) {
                // Second tap → hide the answer + stop speech.
                stopSpeech();
                setAutoSpeak(null);
                setRevealed(false);
              } else {
                // First tap → reveal answer AND read the question aloud.
                setRevealed(true);
                playSide('q');
              }
            }}
            className="flashcard-card w-full text-left bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-5 sm:p-7 active:scale-[0.99] transition-transform min-h-[200px] flex flex-col"
            title="Tap karke question sune + answer dekhein"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="bg-indigo-100 text-indigo-700 text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                Q {pos + 1}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); playSide('q'); }}
                className={`p-2 rounded-full shrink-0 transition ${autoSpeak === 'q' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                title="Question sune"
              >
                {autoSpeak === 'q' ? <Square size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-800 leading-snug">
              {currentQ.question}
            </p>
            {currentQ.statements && currentQ.statements.length > 0 && (
              <div className="mt-3 space-y-1.5 pl-3 border-l-2 border-slate-200">
                {currentQ.statements.map((s, i) => (
                  <p key={i} className="text-sm text-slate-600">{s}</p>
                ))}
              </div>
            )}
            <div className="mt-auto pt-4 flex items-center justify-center gap-2 text-[11px] font-black text-indigo-500 uppercase tracking-wider">
              {revealed ? (<><EyeOff size={13} /> Tap to hide answer</>) : (<><Eye size={13} /> Tap karke answer dekhein</>)}
            </div>
          </button>

          {/* Prev / Next sit RIGHT under the question (per request) */}
          <div className="flex items-center gap-3">
            <button
              disabled={pos === 0}
              onClick={goPrev}
              className={`flashcard-prev flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                pos === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95'
              }`}
            >
              <ChevronRight size={16} className="rotate-180" /> Back
            </button>
            <button
              onClick={goNext}
              disabled={isLast && !canShuffleMore}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-black text-sm transition-all ${
                isLast && !canShuffleMore
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95'
              }`}
              title={isLast ? (canShuffleMore ? 'Naye 10 questions' : 'Set complete') : 'Agla question'}
            >
              {isLast ? (canShuffleMore ? (<><RotateCw size={14} /> Naye 10</>) : 'Set complete') : (<>Next <ChevronRight size={16} /></>)}
            </button>
          </div>

          {/* Answer reveal — only visible after tapping the question card.
              Whole card is now tappable: tap = read the answer aloud (toggle
              off if it's already speaking). The small speaker icon stays as
              a visible hint of the touch behaviour. */}
          {revealed && (
            <button
              type="button"
              onClick={() => playSide('a')}
              className="flashcard-card w-full text-left bg-white rounded-3xl shadow-lg border-2 border-emerald-200 p-5 animate-in fade-in slide-in-from-bottom-4 duration-200 active:scale-[0.99] transition-transform"
              title="Tap karke answer sune"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="bg-emerald-100 text-emerald-700 text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Sahi Jawab
                </span>
                <span
                  aria-hidden="true"
                  className={`p-2 rounded-full shrink-0 transition ${autoSpeak === 'a' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}
                  title="Answer sune"
                >
                  {autoSpeak === 'a' ? <Square size={14} /> : <Volume2 size={14} />}
                </span>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-3">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black bg-emerald-600 text-white">
                    {String.fromCharCode(65 + currentQ.correctAnswer)}
                  </span>
                  <p className="text-base font-black text-emerald-900 leading-snug">
                    {currentQ.options?.[currentQ.correctAnswer] || '—'}
                  </p>
                </div>
              </div>
              {currentQ.explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1">Explanation</p>
                  <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{currentQ.explanation}</p>
                </div>
              )}
              {currentQ.concept && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">Concept</p>
                  <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">{currentQ.concept}</p>
                </div>
              )}
              {currentQ.examTip && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Exam Tip</p>
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{currentQ.examTip}</p>
                </div>
              )}
              {currentQ.mnemonic && (
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-pink-700 mb-1">Memory Trick</p>
                  <p className="text-sm text-pink-900 leading-relaxed whitespace-pre-wrap">{currentQ.mnemonic}</p>
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
