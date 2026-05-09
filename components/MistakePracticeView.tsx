import React, { useState, useMemo } from 'react';
import { X as XIcon, Check, AlertCircle, RefreshCw, Trophy, ChevronRight } from 'lucide-react';
import { MistakeEntry, removeMistakes } from '../utils/mistakeBank';

interface Props {
  mistakes: MistakeEntry[];
  onClose: () => void;
  onComplete?: (removedIds: string[]) => void;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const MistakePracticeView: React.FC<Props> = ({ mistakes, onClose, onComplete }) => {
  const session = useMemo(() => shuffle(mistakes), [mistakes]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = session.length;
  const current = session[idx];

  const handleSelect = (optIdx: number) => {
    if (revealed || !current) return;
    setSelected(optIdx);
    setRevealed(true);
    if (optIdx === current.correctAnswer) {
      setCorrectIds(prev => [...prev, current.id]);
    } else {
      setWrongCount(c => c + 1);
    }
  };

  const handleNext = () => {
    if (idx + 1 >= total) {
      // finish — strip correctly-answered ones from the bank
      removeMistakes(correctIds).finally(() => {
        setFinished(true);
        onComplete?.(correctIds);
      });
      return;
    }
    setIdx(i => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  if (total === 0) {
    return (
      <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-emerald-600" size={28} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">No mistakes to practice!</h3>
          <p className="text-sm text-slate-500 mb-6">Sab clean hai. Naye MCQ try karein.</p>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-800 text-white font-black">Close</button>
        </div>
      </div>
    );
  }

  if (finished) {
    const fixed = correctIds.length;
    const remaining = total - fixed;
    return (
      <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 text-white">
            <Trophy size={30} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-1">Practice Complete!</h3>
          <p className="text-sm text-slate-500 mb-5">Galtiyon se seekha kuch toh sahi.</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-2xl font-black text-emerald-600">{fixed}</div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase">Fixed</div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
              <div className="text-2xl font-black text-amber-600">{remaining}</div>
              <div className="text-[10px] font-bold text-amber-700 uppercase">Still Wrong</div>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black shadow-lg">
            Done
          </button>
        </div>
      </div>
    );
  }

  const isCorrect = revealed && selected === current.correctAnswer;
  const progressPct = Math.round(((idx + (revealed ? 1 : 0)) / total) * 100);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="bg-gradient-to-b from-slate-50 to-white sm:rounded-3xl w-full sm:max-w-lg flex flex-col shadow-2xl overflow-hidden max-h-screen">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <h3 className="text-base font-black tracking-tight">My Mistake Practice</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <XIcon size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="bg-white/20 rounded-full px-2 py-0.5">Q {idx + 1} / {total}</span>
            <span className="bg-emerald-400/30 rounded-full px-2 py-0.5">✓ {correctIds.length}</span>
            <span className="bg-rose-400/30 rounded-full px-2 py-0.5">✗ {wrongCount}</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {current.chapterTitle && (
            <div className="mb-2 flex flex-wrap gap-1.5 items-center text-[10px] font-bold text-slate-500">
              {current.subjectName && <span className="bg-slate-100 rounded-full px-2 py-0.5">{current.subjectName}</span>}
              <span className="bg-slate-100 rounded-full px-2 py-0.5">{current.chapterTitle}</span>
              {current.topic && <span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">{current.topic}</span>}
            </div>
          )}
          <h4 className="text-[15px] font-bold text-slate-800 leading-relaxed mb-4">
            {current.question}
          </h4>
          <div className="space-y-2">
            {current.options.map((opt, oi) => {
              const isSelected = selected === oi;
              const isCorrectOpt = oi === current.correctAnswer;
              let cls = 'border-slate-200 bg-white hover:border-indigo-300';
              if (revealed) {
                if (isCorrectOpt) cls = 'border-emerald-400 bg-emerald-50';
                else if (isSelected) cls = 'border-rose-400 bg-rose-50';
                else cls = 'border-slate-200 bg-slate-50 opacity-70';
              } else if (isSelected) {
                cls = 'border-indigo-400 bg-indigo-50';
              }
              return (
                <button
                  key={oi}
                  onClick={() => handleSelect(oi)}
                  disabled={revealed}
                  className={`w-full text-left rounded-2xl border-2 p-3 flex items-start gap-3 transition-all active:scale-[0.99] ${cls}`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full font-black text-sm flex items-center justify-center ${
                    revealed && isCorrectOpt ? 'bg-emerald-500 text-white' :
                    revealed && isSelected ? 'bg-rose-500 text-white' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-sm text-slate-800 leading-snug pt-0.5">{opt}</span>
                  {revealed && isCorrectOpt && <Check size={18} className="ml-auto text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          {revealed && current.explanation && (
            <div className={`mt-4 rounded-2xl border p-3 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`text-xs font-black mb-1 ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isCorrect ? 'Bilkul sahi!' : 'Yaad rakhein:'}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{current.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white">
          <button
            onClick={handleNext}
            disabled={!revealed}
            className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              revealed
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {idx + 1 >= total ? <><Trophy size={16} /> Finish</> : <>Next <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};
