import React from 'react';
import { AppNotification } from '../types';

interface Props {
    notification: AppNotification;
    isClaimed: boolean;
    onClaim: () => void;
    onDismiss: () => void;
}

export const EngagementRewardPopup: React.FC<Props> = ({
    notification,
    isClaimed,
    onClaim,
    onDismiss,
}) => {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={onDismiss}
        >
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(145deg, #052e16, #064e3b, #052e16)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Shimmer sweep overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(105deg, transparent 30%, rgba(52,211,153,0.13) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer-sweep 2.8s linear infinite',
                    }}
                />

                {/* Bottom glow bar */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.65), rgba(167,243,208,0.9), rgba(52,211,153,0.65), transparent)',
                        animation: 'topbar-glow-pulse 2s ease-in-out infinite',
                    }}
                />

                {/* Top glow bar */}
                <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.4), rgba(167,243,208,0.6), rgba(52,211,153,0.4), transparent)',
                        animation: 'topbar-glow-pulse 2s ease-in-out infinite 1s',
                    }}
                />

                {/* Sparkle dots */}
                {[10, 28, 55, 76, 94].map((l, i) => (
                    <div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                        style={{
                            top: `${7 + (i % 3) * 10}%`,
                            left: `${l}%`,
                            background: '#34d399',
                            animation: `sparkle-blink ${1.5 + i * 0.32}s ease-in-out infinite ${i * 0.22}s`,
                        }}
                    />
                ))}

                <div className="relative px-7 pt-8 pb-7 text-center text-white">
                    {/* Close button */}
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/50 text-xl hover:text-white/80 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                        ×
                    </button>

                    {/* Icon */}
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                            background: 'rgba(52,211,153,0.12)',
                            border: '1.5px solid rgba(52,211,153,0.28)',
                            boxShadow: '0 0 24px rgba(52,211,153,0.15)',
                        }}
                    >
                        <span
                            className="text-4xl"
                            style={{ animation: 'sparkle-blink 1.6s ease-in-out infinite' }}
                        >
                            📚
                        </span>
                    </div>

                    {/* Eyebrow */}
                    <p
                        className="text-[10px] font-black uppercase tracking-widest mb-1"
                        style={{ color: '#34d399', letterSpacing: '0.18em' }}
                    >
                        Engagement Reward
                    </p>

                    {/* Title */}
                    <h3 className="text-xl font-black text-white mt-1 mb-1 leading-snug">
                        {notification.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(167,243,208,0.75)' }}>
                        {notification.body}
                    </p>

                    {/* Credit amount */}
                    {notification.rewardCredits && (
                        <div className="my-2">
                            <span
                                className="text-7xl font-black"
                                style={{
                                    color: '#34d399',
                                    textShadow: '0 0 28px rgba(52,211,153,0.75), 0 0 56px rgba(52,211,153,0.35)',
                                }}
                            >
                                +{notification.rewardCredits}
                            </span>
                            <p className="text-emerald-300 font-bold text-base mt-1">Free Credits</p>
                        </div>
                    )}

                    {/* Claim / Claimed button */}
                    <div className="mt-5">
                        {isClaimed ? (
                            <div
                                className="w-full py-3.5 rounded-2xl font-black text-sm text-white text-center"
                                style={{
                                    background: 'rgba(52,211,153,0.15)',
                                    border: '1.5px solid rgba(52,211,153,0.3)',
                                }}
                            >
                                ✓ Credited to Your Account!
                            </div>
                        ) : (
                            <button
                                onClick={onClaim}
                                className="w-full py-3.5 rounded-2xl font-black text-sm text-white hover:opacity-90 active:scale-95 transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    boxShadow: '0 4px 24px rgba(5,150,105,0.45)',
                                }}
                            >
                                ✦ Claim {notification.rewardCredits} Credits
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onDismiss}
                        className="mt-3 text-[11px] text-white/35 font-bold uppercase tracking-wider hover:text-white/60 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
