import React, { useEffect, useState, useRef } from 'react';

interface Props {
  newStreak: number;
  prevStreak: number;
  isNewRecord: boolean;
  onClose: () => void;
}

export const StreakLoginPopup: React.FC<Props> = ({ newStreak, prevStreak, isNewRecord, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [numVisible, setNumVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDecrement = newStreak < prevStreak && prevStreak > 1;
  const isFirstLogin = prevStreak === 0;
  const isMilestone = [7, 14, 21, 30, 50, 100].includes(newStreak);

  useEffect(() => {
    // Entrance animation
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setNumVisible(true), 400);
    // Auto close after 6s
    timerRef.current = setTimeout(() => handleClose(), 6500);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  // Dynamic fire config based on streak
  const streakDay = Math.min(newStreak, 7);
  const fireSizes   = [32, 44, 58, 72, 86, 100, 116, 132];
  const fireGlows   = [4,  10, 16, 22, 30,  38,  46,  56];
  const fireColors  = [
    'rgba(251,191,36,0.35)', 'rgba(251,191,36,0.55)',
    'rgba(251,146,60,0.6)',  'rgba(251,146,60,0.7)',
    'rgba(249,115,22,0.75)', 'rgba(239,68,68,0.7)',
    'rgba(239,68,68,0.8)',   'rgba(239,68,68,0.9)',
  ];
  const extra = newStreak > 7 ? Math.min((newStreak - 7) * 4, 28) : 0;
  const fireSize  = Math.min((fireSizes[streakDay] ?? 132) + (newStreak > 7 ? (newStreak - 7) * 4 : 0), 150);
  const fireGlow  = (fireGlows[streakDay] ?? 56) + (newStreak > 7 ? Math.min((newStreak - 7) * 3, 24) : 0);
  const fireColor = fireColors[streakDay] ?? fireColors[7];

  const dayLabel =
    newStreak === 0 ? 'Streak Lost' :
    newStreak === 1 ? 'Day 1 — Shuru ho gaya! 🚀' :
    newStreak === 2 ? 'Day 2 — Warm Up! 🔥' :
    newStreak === 3 ? 'Day 3 — On Fire! 🔥🔥' :
    newStreak === 4 ? 'Day 4 — Blazing! 🔥🔥🔥' :
    newStreak === 5 ? 'Day 5 — Unstoppable! ⚡' :
    newStreak === 6 ? 'Day 6 — Almost Legend! 💪' :
    `Day ${newStreak} — Legend! 👑`;

  const accent = isDecrement ? { from: '#7f1d1d', to: '#450a0a', border: '#ef4444', glow: 'rgba(239,68,68,0.35)', bar: 'rgba(239,68,68,0.8)' }
    : isNewRecord ? { from: '#1c1400', to: '#0a0800', border: '#fbbf24', glow: 'rgba(251,191,36,0.4)', bar: 'rgba(251,191,36,0.9)' }
    : isMilestone  ? { from: '#0f1a2e', to: '#06091a', border: '#818cf8', glow: 'rgba(129,140,248,0.35)', bar: 'rgba(129,140,248,0.8)' }
    : { from: '#111827', to: '#070b14', border: '#374151', glow: 'rgba(251,191,36,0.15)', bar: 'rgba(251,191,36,0.6)' };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center pb-8 px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', transition: 'opacity 0.35s', opacity: visible ? 1 : 0 }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm relative overflow-hidden"
        style={{
          borderRadius: 28,
          background: `linear-gradient(160deg, ${accent.from}, ${accent.to})`,
          border: `1.5px solid ${accent.border}44`,
          boxShadow: `0 0 0 1px ${accent.border}22, 0 24px 60px rgba(0,0,0,0.7), 0 0 40px ${accent.glow}`,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s',
          opacity: visible ? 1 : 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent.bar}, transparent)`, animation: 'topbar-glow-pulse 2.5s ease-in-out infinite' }} />
        {/* Shimmer */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.06) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 3s linear infinite', pointerEvents: 'none' }} />

        <div className="relative p-6">
          {/* Close btn */}
          <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 text-xl transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>×</button>

          {/* Header label */}
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: isDecrement ? '#fca5a5' : isNewRecord ? '#fde68a' : isMilestone ? '#a5b4fc' : '#fbbf24aa' }}>
            {isDecrement ? '⚠️ Streak Lost' : isNewRecord ? '🏆 New Record!' : isMilestone ? '🎖️ Milestone!' : 'Login Streak'}
          </p>

          {/* Main content row */}
          <div className="flex items-center gap-5">
            {/* Fire */}
            <div className="shrink-0" style={{ width: 80, display: 'flex', justifyContent: 'center' }}>
              <span style={{
                fontSize: Math.min(fireSize, 80),
                lineHeight: 1,
                display: 'block',
                filter: `drop-shadow(0 0 ${fireGlow}px ${fireColor}) drop-shadow(0 0 ${fireGlow * 1.8}px ${fireColor}55)`,
                transition: 'all 0.5s ease',
              }}>🔥</span>
            </div>

            {/* Text block */}
            <div className="flex-1">
              {/* Number */}
              <div
                className="font-black leading-none mb-1"
                style={{
                  fontSize: newStreak >= 100 ? '3.8rem' : newStreak >= 10 ? '4.4rem' : '5rem',
                  color: isDecrement ? '#fca5a5' : '#fbbf24',
                  textShadow: `0 0 20px ${isDecrement ? 'rgba(239,68,68,0.6)' : fireColor}`,
                  opacity: numVisible ? 1 : 0,
                  transform: numVisible ? 'none' : 'translateY(12px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                }}
              >
                {newStreak}
                <span className="text-sm font-black ml-1.5 opacity-50" style={{ fontSize: '0.9rem' }}>
                  {newStreak === 1 ? 'day' : 'days'}
                </span>
              </div>

              {/* Day label badge */}
              <div
                className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full mb-1"
                style={{
                  background: isDecrement ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.1)',
                  border: `1px solid ${isDecrement ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.25)'}`,
                  color: isDecrement ? '#fca5a5' : '#fde68a',
                }}
              >
                {dayLabel}
              </div>

              {/* Milestone text */}
              {isMilestone && !isDecrement && (
                <p className="text-[11px] font-bold" style={{ color: '#a5b4fc' }}>
                  🎉 {newStreak} Day Milestone!
                </p>
              )}

              {/* New record text */}
              {isNewRecord && (
                <p className="text-[11px] font-bold" style={{ color: '#fde68a' }}>
                  +100 💰 Record bonus credited!
                </p>
              )}
            </div>
          </div>

          {/* Reason box (only when streak lost) */}
          {isDecrement && (
            <div className="mt-4 rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#fca5a5' }}>Kya hua?</p>
              <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Kal app nahi kholi thi, isliye streak {prevStreak} se {newStreak} ho gayi. Aaj se dobara shuru karo — ek din bhi mat chodo!
              </p>
            </div>
          )}

          {/* Bonus credited (on increment) */}
          {!isDecrement && !isNewRecord && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xl">🎁</span>
              <div>
                <p className="text-[11px] font-black" style={{ color: 'rgba(251,191,36,0.9)' }}>Daily Login Bonus Credited!</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Check your credits for today's reward</p>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleClose}
            className="mt-5 w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all active:scale-95"
            style={{
              background: isDecrement
                ? 'linear-gradient(90deg, #dc2626, #b91c1c)'
                : isNewRecord
                  ? 'linear-gradient(90deg, #d97706, #b45309)'
                  : 'linear-gradient(90deg, #1d4ed8, #1e40af)',
              color: 'white',
              boxShadow: isDecrement ? '0 4px 20px rgba(239,68,68,0.3)' : isNewRecord ? '0 4px 20px rgba(251,191,36,0.3)' : '0 4px 20px rgba(29,78,216,0.3)',
            }}
          >
            {isDecrement ? 'Aaj se dobara shuru karo 💪' : isNewRecord ? 'Zabardast! Continue karo 🏆' : 'Continue Learning 🔥'}
          </button>

          {/* Sparkles for non-decrement */}
          {!isDecrement && [10, 28, 52, 74, 90].map((l, i) => (
            <div key={i} style={{
              position: 'absolute', top: `${6 + (i % 4) * 10}%`, left: `${l}%`,
              width: i % 2 === 0 ? 5 : 3, height: i % 2 === 0 ? 5 : 3,
              borderRadius: '50%',
              background: isNewRecord ? '#fde68a' : '#fbbf24',
              opacity: 0.7,
              animation: `sparkle-blink ${1.4 + i * 0.35}s ease-in-out infinite ${i * 0.25}s`,
              pointerEvents: 'none',
            }} />
          ))}
        </div>

        {/* Progress bar at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent.bar}88, transparent)` }} />
      </div>
    </div>
  );
};
