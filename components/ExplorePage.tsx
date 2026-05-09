import React, { useState, useEffect } from 'react';
import { User, SystemSettings, WeeklyTest, Challenge20, StudentTab } from '../types';
import { BannerCarousel } from './BannerCarousel';
import { Sparkles, BrainCircuit, Rocket, Zap, ArrowRight, Crown, Headphones, FileText, CheckCircle, Video as VideoIcon, MessageCircle, Lock, Layout, Star } from 'lucide-react';
import { SpeakButton } from './SpeakButton';
import { generateMorningInsight } from '../services/morningInsight';
import { getActiveChallenges } from '../services/questionBank';

interface Props {
    user: User;
    settings?: SystemSettings;
    onTabChange: (tab: StudentTab) => void;
    onStartWeeklyTest?: (test: WeeklyTest) => void;
    onOpenAiChat: () => void;
    onOpenAiNotes: () => void;
}

export const ExplorePage: React.FC<Props> = ({ user, settings, onTabChange, onStartWeeklyTest, onOpenAiChat, onOpenAiNotes }) => {
    const [morningBanner, setMorningBanner] = useState<any>(null);
    const [challenges20, setChallenges20] = useState<Challenge20[]>([]);

    // --- DISCOUNT LOGIC ---
    const [discountStatus, setDiscountStatus] = useState<'WAITING' | 'ACTIVE' | 'NONE'>('NONE');
    const [discountTimer, setDiscountTimer] = useState<string | null>(null);

    useEffect(() => {
        const evt = settings?.specialDiscountEvent;
        const formatDiff = (diff: number) => {
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
        };

        const checkStatus = () => {
            if (!evt?.enabled) {
                setDiscountStatus('NONE');
                return;
            }
            const now = Date.now();
            const startsAt = evt.startsAt ? new Date(evt.startsAt).getTime() : now;
            const endsAt = evt.endsAt ? new Date(evt.endsAt).getTime() : now;

            if (now < startsAt) {
                setDiscountStatus('WAITING');
                setDiscountTimer(formatDiff(startsAt - now));
            } else if (now < endsAt) {
                setDiscountStatus('ACTIVE');
                setDiscountTimer(formatDiff(endsAt - now));
            } else {
                setDiscountStatus('NONE');
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [settings?.specialDiscountEvent]);

    // --- MORNING INSIGHT ---
    useEffect(() => {
        const loadMorningInsight = async () => {
            const now = new Date();
            // Check Setting (Default: TRUE)
            if (settings?.showMorningInsight !== false && now.getHours() >= 6) {
                const today = now.toDateString();
                const savedBanner = localStorage.getItem('nst_morning_banner');
                if (savedBanner) {
                    const parsed = JSON.parse(savedBanner);
                    if (parsed.date === today) {
                        setMorningBanner(parsed);
                        return;
                    }
                }
                const isGen = localStorage.getItem(`nst_insight_gen_${today}`);
                if (!isGen) {
                     const logs = JSON.parse(localStorage.getItem('nst_universal_analysis_logs') || '[]');
                     if (logs.length > 0) {
                         try {
                             await generateMorningInsight(logs, settings, (banner) => {
                                 localStorage.setItem('nst_morning_banner', JSON.stringify(banner));
                                 setMorningBanner(banner);
                             });
                         } catch(e) {}
                     }
                }
            } else {
                setMorningBanner(null);
            }
        };
        loadMorningInsight();
    }, [settings]);

    // --- BANNER RENDERING HELPERS ---
    const renderSimpleBanner = (
        title: string,
        subtitle: string,
        bgClass: string,
        icon: React.ReactNode,
        onClick?: () => void,
        isDisabled: boolean = false
    ) => (
        <div
            onClick={!isDisabled ? onClick : undefined}
            className={`w-full h-48 p-6 relative overflow-hidden flex flex-col justify-center text-white ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'} ${bgClass} rounded-none`}
        >
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mb-10"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        {icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                        {isDisabled ? 'Locked' : 'Featured'}
                    </span>
                </div>
                <h2 className="text-2xl font-black mb-1 leading-tight">{title}</h2>
                <p className="text-sm opacity-90 font-medium max-w-[85%]">{subtitle}</p>
                {isDisabled && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm border border-white/20">
                        <Lock size={12} /> Premium Only
                    </div>
                )}
            </div>
            {!isDisabled && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                    <ArrowRight size={20} />
                </div>
            )}
        </div>
    );

    // --- FEATURE CHECKS ---
    // Use settings.contentVisibility first, fallback to true if undefined
    const isVisible = (type: 'VIDEO' | 'PDF' | 'MCQ' | 'AUDIO') => {
        if (settings?.contentVisibility?.[type] !== undefined) {
            return settings.contentVisibility[type];
        }
        return true; // Default Visible
    };

    return (
        <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4">

            <section>
                <div className="flex items-center gap-2 mb-4 px-4 pt-4">
                    <Sparkles className="text-yellow-500" />
                    <h2 className="text-xl font-black text-slate-800">Discover</h2>
                </div>

                {/* BANNER CAROUSEL - 2 Second Interval */}
                <BannerCarousel autoPlay={true} interval={2000} className="shadow-xl mx-4 rounded-3xl overflow-hidden min-h-[192px]">

                    {/* 0. MORNING INSIGHT BANNER (If Active) */}
                    {morningBanner && (
                        <div
                            onClick={() => {
                                // If it has a question, maybe navigate to a specific view or just show alert?
                                // For now, we just show it. Maybe open AI Chat with the context?
                                onOpenAiChat();
                            }}
                            className="w-full h-48 p-6 relative overflow-hidden flex flex-col justify-center text-white bg-gradient-to-r from-orange-400 to-pink-500 cursor-pointer"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                        <Zap className="text-yellow-300" size={20} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-90">Morning Insight</span>
                                </div>
                                <h2 className="text-xl font-black mb-1 leading-tight line-clamp-2">{morningBanner.insight || "Daily Knowledge Boost"}</h2>
                                <p className="text-xs opacity-90 font-medium max-w-[90%] line-clamp-2">{morningBanner.question || "Check out your daily challenge!"}</p>
                            </div>
                            <div className="absolute right-4 bottom-4 bg-white/20 p-2 rounded-full backdrop-blur-md">
                                <ArrowRight size={20} />
                            </div>
                        </div>
                    )}

                    {/* 1. ULTRA SUBSCRIPTION (Always Visible unless User is Ultra?) */}
                    {/* Keeping it visible as an upsell or info banner */}
                    {renderSimpleBanner(
                        "Ultra Subscription",
                        "Unlock Unlimited Access to Everything.",
                        "bg-gradient-to-r from-violet-600 to-indigo-600",
                        <Crown className="text-yellow-300" size={20} />,
                        () => onTabChange('STORE')
                    )}

                    {/* 2. BASIC SUBSCRIPTION */}
                    {renderSimpleBanner(
                        "Basic Subscription",
                        "Get Essential Study Materials.",
                        "bg-gradient-to-r from-blue-500 to-cyan-500",
                        <Star className="text-white" size={20} />,
                        () => onTabChange('STORE')
                    )}

                    {/* 3. ULTRA PDF (CONDITIONAL) */}
                    {isVisible('PDF') && renderSimpleBanner(
                        "Ultra PDF Library",
                        "Premium High-Yield Notes.",
                        "bg-gradient-to-r from-emerald-500 to-teal-600",
                        <FileText className="text-white" size={20} />,
                        () => onTabChange('PDF'), // Changed to Navigate
                        !user.isPremium // Dynamic Lock
                    )}

                    {/* 4. ULTRA VIDEO (CONDITIONAL) */}
                    {isVisible('VIDEO') && renderSimpleBanner(
                        "Ultra Video Lectures",
                        "HD Animated Concepts.",
                        "bg-gradient-to-r from-red-500 to-rose-600",
                        <VideoIcon className="text-white" size={20} />,
                        () => onTabChange('VIDEO'), // Changed to Navigate
                        !user.isPremium // Dynamic Lock
                    )}

                    {/* 5. ULTRA AUDIO (CONDITIONAL) */}
                    {isVisible('AUDIO') && renderSimpleBanner(
                        "Ultra Audiobooks",
                        "Learn on the Go.",
                        "bg-gradient-to-r from-pink-500 to-fuchsia-600",
                        <Headphones className="text-white" size={20} />,
                        () => onTabChange('AUDIO'), // Changed to Navigate
                        !user.isPremium // Dynamic Lock
                    )}

                    {/* 6. ULTRA MCQ (CONDITIONAL) */}
                    {isVisible('MCQ') && renderSimpleBanner(
                        "Ultra MCQ Tests",
                        "Exam Level Practice.",
                        "bg-gradient-to-r from-orange-500 to-amber-600",
                        <CheckCircle className="text-white" size={20} />,
                        () => onTabChange('MCQ'), // Changed to Navigate
                        !user.isPremium // Dynamic Lock
                    )}

                    {/* 7. AI CHAT (Open Chat) - CONDITIONAL */}
                    {settings?.isAiEnabled !== false && renderSimpleBanner(
                        "Ask AI Anything",
                        "Clear your doubts instantly.",
                        "bg-gradient-to-r from-slate-800 to-slate-900",
                        <MessageCircle className="text-blue-400" size={20} />,
                        onOpenAiChat
                    )}

                    {/* 8. AI NOTES (Open Notes) - CONDITIONAL */}
                    {settings?.isAiEnabled !== false && renderSimpleBanner(
                        "AI Smart Notes",
                        "Generate notes on any topic.",
                        "bg-gradient-to-r from-indigo-900 to-violet-900",
                        <BrainCircuit className="text-purple-400" size={20} />,
                        onOpenAiNotes
                    )}

                </BannerCarousel>
            </section>

            {/* ASK YOUR DOUBTS (AI Chat Section) */}
            {settings?.isAiEnabled !== false && (
                <section className="px-4">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageCircle className="text-indigo-600" />
                        <h2 className="text-xl font-black text-slate-800">Ask Your Doubts</h2>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-lg border border-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 z-0"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                    <BrainCircuit size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">Personal AI Tutor</h3>
                                    <p className="text-xs text-slate-600 font-bold">Available 24/7</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                Stuck on a concept? Need a quick explanation? Ask our AI Tutor anything!
                            </p>

                            <button
                                onClick={onOpenAiChat}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                            >
                                <span className="group-hover:animate-pulse">✨</span> Start Chatting
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* CUSTOM HTML PAGE BUTTON (Large Banner Style) */}
            <section className="px-4">
                <div
                    onClick={() => onTabChange('CUSTOM_PAGE')}
                    className="w-full h-40 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center text-white cursor-pointer shadow-lg active:scale-95 transition-all mt-4"
                >
                    <div className="absolute left-0 bottom-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                    <Layout size={24} className="text-white" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">New</span>
                            </div>
                            <h2 className="text-2xl font-black">Blogger Hub</h2>
                            <p className="text-sm opacity-90 font-medium mt-1">Explore custom articles & updates.</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                            <ArrowRight size={24} />
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};
