import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, Users, Trash2, AlertTriangle, Info, Search, GitCompare, BookOpen, X } from 'lucide-react';
import { subscribeToTopNoteStars, NoteStarEntry, adminDeleteNoteStarEntry } from '../services/noteStars';

export const AdminTrendingNotes: React.FC = () => {
  const [entries, setEntries] = useState<Record<string, NoteStarEntry>>({});
  const [deletingHash, setDeletingHash] = useState<string | null>(null);
  const [confirmHash, setConfirmHash] = useState<string | null>(null);
  const [showCompareGuide, setShowCompareGuide] = useState(false);

  useEffect(() => {
    const unsub = subscribeToTopNoteStars(50, setEntries);
    return () => { try { unsub(); } catch {} };
  }, []);

  const ranked = Object.values(entries)
    .filter(e => e.count > 0 && e.label)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const topCount = ranked[0]?.count || 0;
  const totalSaves = ranked.reduce((sum, e) => sum + e.count, 0);
  const uniqueStudents = ranked.reduce((set, e) => {
    Object.keys((e as any).users || {}).forEach(u => set.add(u));
    return set;
  }, new Set<string>()).size;

  const handleDelete = async (hash: string) => {
    setDeletingHash(hash);
    try {
      await adminDeleteNoteStarEntry(hash);
      setConfirmHash(null);
    } catch {
      alert('Delete nahi hua. Firebase rules check karo.');
    } finally {
      setDeletingHash(null);
    }
  };

  return (
    <div className="space-y-4 mt-4">

      {/* === MAIN CARD === */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-100">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
            <TrendingUp size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-base flex items-center gap-2 flex-wrap">
              Trending Important Notes
              <span className="text-[10px] font-black text-white bg-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Students kis topic ko sabse jyada Important mark kar rahe hain
            </p>
          </div>
          <button
            onClick={() => setShowCompareGuide(v => !v)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${showCompareGuide ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
          >
            <GitCompare size={13} /> Compare Guide
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-amber-700 font-black text-xl leading-none">{ranked.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-amber-600 font-black mt-1.5">Topics</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-3 text-center">
            <div className="text-rose-700 font-black text-xl leading-none">{totalSaves.toLocaleString('en-IN')}</div>
            <div className="text-[9px] uppercase tracking-widest text-rose-600 font-black mt-1.5">Total Saves</div>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-3 text-center">
            <div className="text-violet-700 font-black text-xl leading-none">{uniqueStudents.toLocaleString('en-IN')}</div>
            <div className="text-[9px] uppercase tracking-widest text-violet-600 font-black mt-1.5">Students</div>
          </div>
        </div>

        {/* Admin note about delete */}
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4">
          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 font-semibold leading-snug">
            Delete karne par wo topic ki <strong>saari student saves</strong> hata jaayengi aur trending list se hat jaayega. Ye action undo nahi hota.
          </p>
        </div>

        {ranked.length === 0 ? (
          <div className="text-center py-12 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
            <Star size={42} className="text-amber-300 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-600">Abhi koi student ne note save nahi kiya</p>
            <p className="text-[11px] text-slate-400 mt-1 font-semibold">Pehla ⭐ aate hi yahan dikhega</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 -mr-1">
            {ranked.map((entry, idx) => {
              const pct = topCount > 0 ? Math.max(8, Math.round((entry.count / topCount) * 100)) : 0;
              const isTop3 = idx < 3;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              const isConfirming = confirmHash === entry.hash;
              const isDeleting = deletingHash === entry.hash;

              return (
                <div
                  key={entry.hash || idx}
                  className={`rounded-2xl p-4 border-2 transition-all ${
                    isConfirming
                      ? 'border-red-400 bg-red-50'
                      : isTop3
                      ? 'border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/40 to-white shadow-sm'
                      : 'border-slate-200 bg-white hover:border-amber-200'
                  }`}
                >
                  {/* Top row — rank + title + count + delete */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0 ${
                      isTop3
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white text-lg shadow-md'
                        : 'bg-slate-100 text-slate-600 text-sm border border-slate-200'
                    }`}>
                      {medal || `#${idx + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[14px] text-slate-800 leading-snug line-clamp-2">
                        {entry.label}
                      </p>
                      {entry.source?.subject && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                          <BookOpen size={9} /> {entry.source.subject}
                          {entry.source.pageNo ? ` · p.${entry.source.pageNo}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={`text-right ${isTop3 ? 'text-amber-700' : 'text-slate-600'}`}>
                        <div className="font-black text-lg leading-none flex items-center gap-1 justify-end">
                          <Users size={13} />
                          {entry.count.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-70">Saves</div>
                      </div>
                      {/* Delete controls */}
                      {!isConfirming ? (
                        <button
                          onClick={() => setConfirmHash(entry.hash)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-200 text-[10px] font-bold hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={11} /> Hatao
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-end">
                          <p className="text-[10px] text-red-600 font-black text-right">Pakka delete karein?</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setConfirmHash(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition-all"
                            >
                              Ruko
                            </button>
                            <button
                              onClick={() => handleDelete(entry.hash)}
                              disabled={isDeleting}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-all disabled:opacity-60"
                            >
                              {isDeleting ? (
                                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={10} />
                              )}
                              {isDeleting ? 'Hata raha...' : 'Haan, Hatao'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-amber-50 rounded-full overflow-hidden border border-amber-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTop3
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-slate-300 to-slate-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-black tabular-nums shrink-0 w-10 text-right ${
                      isTop3 ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === COMPARE MODE GUIDE (toggled) === */}
      {showCompareGuide && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <GitCompare size={17} />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">Compare Mode — Student Kaise Use Karta Hai?</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Shortcut kahan kahan milta hai</p>
              </div>
            </div>
            <button onClick={() => setShowCompareGuide(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">

            {/* Step 1 */}
            <div className="flex gap-3 bg-violet-50 border border-violet-200 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</div>
              <div>
                <p className="text-xs font-black text-violet-800 flex items-center gap-1.5">
                  <Search size={12} /> Home Screen — Search Bar mein topic likhein
                </p>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Student home screen pe search bar mein koi bhi topic type kare (jaise <strong>"Bharat ki Rajvyavastha"</strong>). Turant neeche:
                </p>
                <ul className="mt-1.5 space-y-1">
                  <li className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                    <strong className="text-violet-700">⚖️ Points se Compare</strong> — Ek topic ke common aur extra points side-by-side
                  </li>
                  <li className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <strong className="text-emerald-700">📚 Topic se Compare</strong> — Puri notes side-by-side (AI se topic extract hoti hai)
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-slate-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</div>
              <div>
                <p className="text-xs font-black text-slate-800">Search Results mein "Compare" Button</p>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Agar search results mein 2+ books ke notes milein to har section ke header mein <strong>⚖️ Compare N Books</strong> button aata hai — directly wahi se compare khul jaata hai.
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-violet-100 text-violet-700 text-[9px] font-black">Class 6-12 Notes</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[9px] font-black">Competition Books</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</div>
              <div>
                <p className="text-xs font-black text-blue-800">Search Mode toggle — "Compare Mode"</p>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Search bar ke paas ek mode switcher hota hai. Student <strong>"Compare"</strong> mode choose kare, phir topic type kare — bade Compare buttons seedha dikhte hain bina scroll kiye.
                </p>
              </div>
            </div>

            {/* What happens inside */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <p className="text-[11px] font-black text-indigo-800 mb-2 flex items-center gap-1.5">
                <Info size={12} /> Compare View andar kya hota hai?
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-1.5 text-[10px] text-slate-700">
                  <span className="text-green-600 font-black mt-0.5">✓</span>
                  <span><strong>Common Points</strong> — Jo baat dono/sabhi books mein likhi hai (green highlight)</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] text-slate-700">
                  <span className="text-blue-600 font-black mt-0.5">+</span>
                  <span><strong>Extra/Unique Points</strong> — Jo sirf ek book mein hai, doosri mein nahi (blue highlight)</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] text-slate-700">
                  <span className="text-violet-600 font-black mt-0.5">📖</span>
                  <span><strong>Study Mode</strong> — Floating button dabao, top bar hat jaata hai — distraction-free reading</span>
                </li>
                <li className="flex items-start gap-1.5 text-[10px] text-slate-700">
                  <span className="text-amber-600 font-black mt-0.5">🤖</span>
                  <span><strong>AI Summary</strong> — Dono books ka AI-generated comparison summary</span>
                </li>
              </ul>
            </div>

            {/* TopicName tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] font-black text-amber-800 mb-1 flex items-center gap-1.5">
                <Star size={11} className="text-amber-500" /> Admin Tip — TopicName Tag karo
              </p>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Book Notes add karte waqt <strong>Topic Name</strong> field fill karo (violet badge wala field). Agar alag-alag books ke notes ka topicName same ho, to Compare View us topic ka exact section automatically nikal leta hai — zyada precise result milta hai.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
