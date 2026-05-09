import React from 'react';
import { Crown } from 'lucide-react';
import { PendingReward } from '../types';

interface Props {
    reward: PendingReward;
    onClaim: () => void;
    onIgnore: () => void;
}

export const RewardPopup: React.FC<Props> = ({ reward, onClaim, onIgnore }) => {
    const isCoins = reward.type === 'COINS';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={onIgnore}
        >
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(145deg, #0f0f23, #1a1040, #0f0f23)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Shimmer sweep overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(105deg, transparent 30%, rgba(251,191,36,0.13) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer-sweep 2.8s linear infinite',
                    }}
                />

                {/* Bottom glow bar */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.65), rgba(253,230,138,0.9), rgba(251,191,36,0.65), transparent)',
                        animation: 'topbar-glow-pulse 2s ease-in-out infinite',
                    }}
                />

                {/* Top glow bar */}
                <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.4), rgba(253,230,138,0.6), rgba(251,191,36,0.4), transparent)',
                        animation: 'topbar-glow-pulse 2s ease-in-out infinite 1s',
                    }}
                />

                {/* Sparkle dots */}
                {[8, 25, 52, 75, 93].map((l, i) => (
                    <div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                        style={{
                            top: `${6 + (i % 3) * 10}%`,
                            left: `${l}%`,
                            background: '#fbbf24',
                            animation: `sparkle-blink ${1.4 + i * 0.35}s ease-in-out infinite ${i * 0.25}s`,
                        }}
                    />
                ))}

                <div className="relative px-7 pt-8 pb-7 text-center text-white">
                    {/* Close button */}
                    <button
                        onClick={onIgnore}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/50 text-xl hover:text-white/80 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                        ×
                    </button>

                    {/* Icon */}
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1.5px solid rgba(251,191,36,0.28)',
                            boxShadow: '0 0 24px rgba(251,191,36,0.15)',
                        }}
                    >
                        {isCoins ? (
                            <span
                                className="text-4xl"
                                style={{ animation: 'sparkle-blink 1.6s ease-in-out infinite' }}
                            >
                                🪙
                            </span>
                        ) : (
                            <Crown
                                size={38}
                                style={{
                                    color: '#fbbf24',
                                    filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.7))',
                                }}
                            />
                        )}
                    </div>

                    {/* Eyebrow */}
                    <p
                        className="text-[10px] font-black uppercase tracking-widest mb-1"
                        style={{ color: '#fbbf24', letterSpacing: '0.18em' }}
                    >
                        Reward Unlocked!
                    </p>

                    {/* Main value */}
                    {isCoins ? (
                        <div className="my-2">
                            <span
                                className="text-7xl font-black"
                                style={{
                                    color: '#fbbf24',
                                    textShadow: '0 0 28px rgba(251,191,36,0.75), 0 0 56px rgba(251,191,36,0.35)',
                                }}
                            >
                                +{reward.amount}
                            </span>
                            <p className="text-amber-300 font-bold text-base mt-1">Free Credits</p>
                        </div>
                    ) : (
                        <div className="my-2">
                            <Crown
                                size={32}
                                className="mx-auto mb-2"
                                style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }}
                            />
                            <p className="text-xl font-black text-white">
                                {reward.subLevel} Access
                            </p>
                            {reward.durationHours && (
                                <p className="text-amber-300 font-bold text-sm mt-1">
                                    {reward.durationHours}h Subscription
                                </p>
                            )}
                        </div>
                    )}

                    {/* Label chip */}
                    <div
                        className="rounded-2xl px-4 py-2.5 mb-5 mt-3"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(251,191,36,0.18)',
                        }}
                    >
                        <p className="text-[11px] text-white/60 font-semibold">{reward.label}</p>
                    </div>

                    {/* Claim button */}
                    <button
                        onClick={onClaim}
                        className="w-full py-3.5 rounded-2xl font-black text-sm text-white hover:opacity-90 active:scale-95 transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            boxShadow: '0 4px 24px rgba(245,158,11,0.45)',
                        }}
                    >
                        🎁 Claim Reward
                    </button>

                    <button
                        onClick={onIgnore}
                        className="mt-3 text-[11px] text-white/35 font-bold uppercase tracking-wider hover:text-white/60 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
