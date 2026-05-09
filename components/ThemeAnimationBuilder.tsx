import React, { useState, useEffect } from 'react';
import { User, UserCustomTheme, UserCustomAnimation } from '../types';
import { TOP_BAR_EFFECTS, TopBarEffectsLayer } from '../utils/topBarEffects';
import {
    saveUserTheme, saveUserAnimation,
    publishTheme, publishAnimation,
    subscribePublishedThemes, subscribePublishedAnimations,
    likePublishedTheme, likePublishedAnimation
} from '../firebase';

interface Props {
    user: User;
    onUpdateUser: (u: User) => void;
    onBack: () => void;
}

const THEME_COST = 100;
const ANIMATION_COST = 200;
const APPLY_HOURS = 24;

const PRESET_THEMES = [
    { name: 'Ocean', bg: '#0f172a', accent: '#38bdf8', text: '#e2e8f0', card: '#1e293b' },
    { name: 'Sakura', bg: '#fff1f2', accent: '#f43f5e', text: '#1e293b', card: '#ffe4e6' },
    { name: 'Forest', bg: '#052e16', accent: '#22c55e', text: '#dcfce7', card: '#14532d' },
    { name: 'Gold', bg: '#1c1003', accent: '#fbbf24', text: '#fef9c3', card: '#292309' },
    { name: 'Purple Rain', bg: '#2e1065', accent: '#a855f7', text: '#f3e8ff', card: '#3b0764' },
    { name: 'Sunset', bg: '#1c0a00', accent: '#f97316', text: '#ffedd5', card: '#2c1206' },
    { name: 'Mint', bg: '#f0fdf4', accent: '#10b981', text: '#064e3b', card: '#d1fae5' },
    { name: 'Slate', bg: '#0f172a', accent: '#64748b', text: '#f1f5f9', card: '#1e293b' },
];

type Tab = 'THEME' | 'ANIMATION' | 'GLOBAL_THEMES' | 'GLOBAL_ANIMATIONS';

export const ThemeAnimationBuilder: React.FC<Props> = ({ user, onUpdateUser, onBack }) => {
    const [tab, setTab] = useState<Tab>('THEME');
    const isUltra = user.isPremium && user.subscriptionLevel === 'ULTRA';
    const isBasicOrHigher = user.isPremium || user.role === 'ADMIN' || user.role === 'SUB_ADMIN';
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUB_ADMIN';

    // Theme state
    const [bgColor, setBgColor] = useState(user.customTheme?.bgColor || '#0f172a');
    const [accentColor, setAccentColor] = useState(user.customTheme?.accentColor || '#3b82f6');
    const [textColor, setTextColor] = useState(user.customTheme?.textColor || '#f1f5f9');
    const [cardColor, setCardColor] = useState(user.customTheme?.cardColor || '#1e293b');
    const [themeName, setThemeName] = useState(user.customTheme?.publishedName || '');
    const [themeSaving, setThemeSaving] = useState(false);

    // Animation state
    const [selectedEffect, setSelectedEffect] = useState(user.customAnimation?.effectId || 'shimmer-forward');
    const [animColor, setAnimColor] = useState(user.customAnimation?.color || '#a78bfa');
    const [animSpeed, setAnimSpeed] = useState(user.customAnimation?.speed || 1);
    const [animName, setAnimName] = useState(user.customAnimation?.publishedName || '');
    const [animSaving, setAnimSaving] = useState(false);

    // Global gallery
    const [publishedThemes, setPublishedThemes] = useState<any[]>([]);
    const [publishedAnimations, setPublishedAnimations] = useState<any[]>([]);

    useEffect(() => {
        const unsub1 = subscribePublishedThemes(setPublishedThemes);
        const unsub2 = subscribePublishedAnimations(setPublishedAnimations);
        return () => { unsub1(); unsub2(); };
    }, []);

    const timeLeft = (isoStr?: string) => {
        if (!isoStr) return null;
        const diff = new Date(isoStr).getTime() - Date.now();
        if (diff <= 0) return null;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return `${h}h ${m}m`;
    };

    const themeActiveUntil = user.activeThemeAppliedUntil;
    const animActiveUntil = user.activeAnimationAppliedUntil;
    const themeTimeLeft = timeLeft(themeActiveUntil);
    const animTimeLeft = timeLeft(animActiveUntil);

    const handleApplyTheme = async (publish = false) => {
        if (!isBasicOrHigher && !isAdmin) {
            alert('Ye feature sirf Basic ya Ultra subscribers ke liye hai!');
            return;
        }
        if (user.credits < THEME_COST) {
            alert(`Insufficient coins! Theme banane ke liye ${THEME_COST} coins chahiye. Aapke paas: ${user.credits} coins.`);
            return;
        }
        if (!confirm(`${THEME_COST} coins spend karke apna custom theme apply karein? (24 ghante ke liye)`)) return;
        setThemeSaving(true);
        const appliedUntil = new Date(Date.now() + APPLY_HOURS * 3600000).toISOString();
        const theme: UserCustomTheme = {
            id: `theme_${user.id}_${Date.now()}`,
            userId: user.id,
            userName: user.name,
            bgColor, accentColor, textColor, cardColor,
            createdAt: new Date().toISOString(),
            appliedUntil,
            publishedName: themeName || undefined,
            likes: 0,
        };
        await saveUserTheme(user.id, theme);
        if (publish && themeName.trim()) {
            await publishTheme({ ...theme, publishedName: themeName });
        }
        const updatedUser: User = {
            ...user,
            credits: user.credits - THEME_COST,
            customTheme: theme,
            activeThemeAppliedUntil: appliedUntil,
        };
        onUpdateUser(updatedUser);
        setThemeSaving(false);
        alert(`✅ Theme apply ho gayi! 24 ghante baad official theme wapas aa jayegi.${publish ? '\n🌍 Global gallery mein bhi publish ho gayi!' : ''}`);
    };

    const handleApplyAnimation = async (publish = false) => {
        if (!isUltra && !isAdmin) {
            alert('Custom animation sirf Ultra subscribers ke liye hai!');
            return;
        }
        if (user.credits < ANIMATION_COST) {
            alert(`Insufficient coins! Animation banane ke liye ${ANIMATION_COST} coins chahiye. Aapke paas: ${user.credits} coins.`);
            return;
        }
        if (!confirm(`${ANIMATION_COST} coins spend karke apna custom animation apply karein? (24 ghante ke liye)`)) return;
        setAnimSaving(true);
        const eff = TOP_BAR_EFFECTS.find(e => e.id === selectedEffect);
        const appliedUntil = new Date(Date.now() + APPLY_HOURS * 3600000).toISOString();
        const anim: UserCustomAnimation = {
            id: `anim_${user.id}_${Date.now()}`,
            userId: user.id,
            userName: user.name,
            effectId: selectedEffect,
            effectName: eff?.name || selectedEffect,
            color: animColor,
            speed: animSpeed,
            createdAt: new Date().toISOString(),
            appliedUntil,
            publishedName: animName || undefined,
            likes: 0,
        };
        await saveUserAnimation(user.id, anim);
        if (publish && animName.trim()) {
            await publishAnimation({ ...anim, publishedName: animName });
        }
        const updatedUser: User = {
            ...user,
            credits: user.credits - ANIMATION_COST,
            customAnimation: anim,
            activeAnimationAppliedUntil: appliedUntil,
        };
        onUpdateUser(updatedUser);
        setAnimSaving(false);
        alert(`✅ Animation apply ho gayi! 24 ghante baad official animation wapas aa jayegi.${publish ? '\n🌍 Global gallery mein bhi publish ho gayi!' : ''}`);
    };

    const handleLikeTheme = async (themeId: string) => {
        await likePublishedTheme(themeId, user.id);
    };
    const handleLikeAnim = async (animId: string) => {
        await likePublishedAnimation(animId, user.id);
    };

    const selectedEffectObj = TOP_BAR_EFFECTS.find(e => e.id === selectedEffect);
    const EFFECT_CATEGORIES = [...new Set(TOP_BAR_EFFECTS.map(e => e.category))];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 pb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div>
                    <h2 className="text-xl font-black text-slate-900">🎨 My Theme Studio</h2>
                    <p className="text-xs text-slate-500">Apna custom theme aur animation banao</p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-xs font-bold text-slate-500">Coins</p>
                    <p className="text-lg font-black text-amber-600">🪙 {user.credits}</p>
                </div>
            </div>

            {/* Active Status Cards */}
            {(themeTimeLeft || animTimeLeft) && (
                <div className="flex gap-3 mb-4">
                    {themeTimeLeft && (
                        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3 text-center">
                            <p className="text-[10px] font-black text-blue-600 uppercase mb-0.5">🎨 Custom Theme Active</p>
                            <p className="text-lg font-black text-blue-700">{themeTimeLeft}</p>
                            <p className="text-[9px] text-blue-500">baki hai</p>
                        </div>
                    )}
                    {animTimeLeft && (
                        <div className="flex-1 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-3 text-center">
                            <p className="text-[10px] font-black text-purple-600 uppercase mb-0.5">✨ Custom Animation Active</p>
                            <p className="text-lg font-black text-purple-700">{animTimeLeft}</p>
                            <p className="text-[9px] text-purple-500">baki hai</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Bar */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 gap-1">
                {([
                    { id: 'THEME', label: '🎨 Theme', sub: '100 coins' },
                    { id: 'ANIMATION', label: '✨ Animation', sub: '200 coins' },
                    { id: 'GLOBAL_THEMES', label: '🌍 Gallery', sub: 'Themes' },
                    { id: 'GLOBAL_ANIMATIONS', label: '💫 Gallery', sub: 'Anims' },
                ] as { id: Tab; label: string; sub: string }[]).map(t => (
                    <button key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex flex-col items-center gap-0.5 ${tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                        <span>{t.label}</span>
                        <span className={`text-[8px] font-bold ${tab === t.id ? 'text-indigo-500' : 'text-slate-400'}`}>{t.sub}</span>
                    </button>
                ))}
            </div>

            {/* ── THEME BUILDER ── */}
            {tab === 'THEME' && (
                <div className="space-y-4">
                    {/* Access gate */}
                    {!isBasicOrHigher && !isAdmin && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                            <p className="text-2xl mb-2">🔒</p>
                            <p className="font-black text-amber-800">Basic ya Ultra subscription chahiye</p>
                            <p className="text-xs text-amber-600 mt-1">Custom theme banane ke liye subscribe karo</p>
                        </div>
                    )}

                    {/* Cost notice */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-2xl">🪙</span>
                        <div>
                            <p className="text-sm font-black text-indigo-800">100 Coins — 24 Ghante Active</p>
                            <p className="text-xs text-indigo-600">Apply karne ke baad 24 ghante aapka custom theme dikhega, phir official theme wapas</p>
                        </div>
                    </div>

                    {/* Presets */}
                    <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Quick Presets</p>
                        <div className="grid grid-cols-4 gap-2">
                            {PRESET_THEMES.map(p => (
                                <button key={p.name}
                                    onClick={() => { setBgColor(p.bg); setAccentColor(p.accent); setTextColor(p.text); setCardColor(p.card); }}
                                    className="rounded-xl overflow-hidden border-2 border-slate-200 hover:border-indigo-400 transition-all active:scale-95"
                                    style={{ background: p.bg }}
                                    title={p.name}
                                >
                                    <div className="h-10 flex flex-col items-center justify-center gap-1 p-1">
                                        <div className="w-6 h-1.5 rounded-full" style={{ background: p.accent }}></div>
                                        <div className="w-5 h-1 rounded-full" style={{ background: p.text, opacity: 0.7 }}></div>
                                    </div>
                                    <p className="text-[8px] font-bold py-1 text-center truncate px-1" style={{ background: p.card, color: p.text }}>{p.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Pickers */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Custom Colors</p>
                        {([
                            { label: 'Background', val: bgColor, set: setBgColor, icon: '🖼️' },
                            { label: 'Accent / Buttons', val: accentColor, set: setAccentColor, icon: '🎯' },
                            { label: 'Text Color', val: textColor, set: setTextColor, icon: '🔤' },
                            { label: 'Card Background', val: cardColor, set: setCardColor, icon: '📦' },
                        ]).map(({ label, val, set, icon }) => (
                            <div key={label} className="flex items-center gap-3">
                                <span className="text-lg shrink-0">{icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700">{label}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{val}</p>
                                </div>
                                <input type="color" value={val} onChange={e => set(e.target.value)}
                                    className="w-10 h-10 rounded-xl cursor-pointer border-none shrink-0" />
                            </div>
                        ))}
                    </div>

                    {/* Live Preview */}
                    <div>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Live Preview</p>
                        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200" style={{ background: bgColor }}>
                            {/* Top bar */}
                            <div className="px-4 py-3 flex items-center justify-between" style={{ background: accentColor }}>
                                <span className="text-sm font-black" style={{ color: textColor }}>IIC App</span>
                                <div className="flex gap-2">
                                    <div className="w-5 h-5 rounded-full" style={{ background: `${textColor}40` }}></div>
                                    <div className="w-5 h-5 rounded-full" style={{ background: `${textColor}40` }}></div>
                                </div>
                            </div>
                            {/* Cards */}
                            <div className="p-3 grid grid-cols-2 gap-2">
                                {['Chapter 1', 'Chapter 2', 'MCQ', 'Notes'].map(c => (
                                    <div key={c} className="rounded-xl p-3" style={{ background: cardColor }}>
                                        <div className="w-8 h-1.5 rounded mb-1" style={{ background: accentColor }}></div>
                                        <p className="text-[10px] font-bold" style={{ color: textColor }}>{c}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Publish Name */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">📢 Global Gallery mein Publish?</p>
                        <input
                            value={themeName} onChange={e => setThemeName(e.target.value)}
                            placeholder="Theme ka naam (optional — sirf publish karna ho toh)"
                            className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5">Naam dene par sabhi users ke gallery mein dikhega</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleApplyTheme(false)}
                            disabled={themeSaving || (!isBasicOrHigher && !isAdmin)}
                            className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                        >
                            {themeSaving ? 'Saving...' : `🎨 Apply (${THEME_COST} coins)`}
                        </button>
                        {themeName.trim() && (
                            <button
                                onClick={() => handleApplyTheme(true)}
                                disabled={themeSaving || (!isBasicOrHigher && !isAdmin)}
                                className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-pink-600 text-white hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-lg"
                            >
                                {themeSaving ? '...' : `🌍 Apply + Publish`}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── ANIMATION BUILDER ── */}
            {tab === 'ANIMATION' && (
                <div className="space-y-4">
                    {/* Access gate */}
                    {!isUltra && !isAdmin && (
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                            <p className="text-2xl mb-2">👑</p>
                            <p className="font-black text-purple-800">Ultra Subscription chahiye</p>
                            <p className="text-xs text-purple-600 mt-1">Custom animation sirf Ultra subscribers bana sakte hain</p>
                        </div>
                    )}

                    {/* Cost notice */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-3 flex items-center gap-3">
                        <span className="text-2xl">🪙</span>
                        <div>
                            <p className="text-sm font-black text-purple-800">200 Coins — 24 Ghante Active</p>
                            <p className="text-xs text-purple-600">Apni profile pe ye animation chalti rahegi</p>
                        </div>
                    </div>

                    {/* Effect Color + Speed */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Animation Color & Speed</p>
                        <div className="flex items-center gap-3">
                            <input type="color" value={animColor} onChange={e => setAnimColor(e.target.value)}
                                className="w-12 h-12 rounded-xl cursor-pointer border-none shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700 mb-1">Speed: {animSpeed.toFixed(1)}x</p>
                                <input type="range" min={0.3} max={3} step={0.1} value={animSpeed}
                                    onChange={e => setAnimSpeed(parseFloat(e.target.value))}
                                    className="w-full accent-purple-600" />
                                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                                    <span>Slow</span><span>Fast</span>
                                </div>
                            </div>
                        </div>

                        {/* Live preview */}
                        <div className="relative overflow-hidden rounded-xl h-10 border border-slate-200" style={{ background: '#0f172a' }}>
                            <TopBarEffectsLayer effects={[{ id: selectedEffect, enabled: true, color: animColor, speed: animSpeed }]} />
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-[10px] font-bold text-white/70">{selectedEffectObj?.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Effect picker by category */}
                    {EFFECT_CATEGORIES.map(cat => {
                        const catEffects = TOP_BAR_EFFECTS.filter(e => e.category === cat);
                        return (
                            <div key={cat}>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{cat}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {catEffects.map(eff => (
                                        <button
                                            key={eff.id}
                                            onClick={() => setSelectedEffect(eff.id)}
                                            className={`relative overflow-hidden rounded-xl border-2 transition-all active:scale-95 ${selectedEffect === eff.id ? 'border-purple-500 shadow-lg shadow-purple-200' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="h-8 relative" style={{ background: '#0f172a' }}>
                                                <TopBarEffectsLayer effects={[{ id: eff.id, enabled: true, color: animColor, speed: animSpeed }]} />
                                            </div>
                                            <p className="text-[9px] font-bold py-1 px-2 bg-slate-50 text-slate-700 truncate">{eff.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Publish Name */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">📢 Global Gallery mein Publish?</p>
                        <input
                            value={animName} onChange={e => setAnimName(e.target.value)}
                            placeholder="Animation ka naam (optional)"
                            className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm border border-slate-200 focus:ring-2 focus:ring-purple-400 outline-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleApplyAnimation(false)}
                            disabled={animSaving || (!isUltra && !isAdmin)}
                            className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-purple-200"
                        >
                            {animSaving ? 'Saving...' : `✨ Apply (${ANIMATION_COST} coins)`}
                        </button>
                        {animName.trim() && (
                            <button
                                onClick={() => handleApplyAnimation(true)}
                                disabled={animSaving || (!isUltra && !isAdmin)}
                                className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-lg"
                            >
                                {animSaving ? '...' : '🌍 Apply + Publish'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── GLOBAL THEMES GALLERY ── */}
            {tab === 'GLOBAL_THEMES' && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500 text-center">Users ke banaye hue themes — Like karo ❤️</p>
                    {publishedThemes.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <p className="text-4xl mb-3">🎨</p>
                            <p className="font-bold text-sm">Abhi koi published theme nahi</p>
                            <p className="text-xs mt-1">Pehle hone wale bano!</p>
                        </div>
                    )}
                    {publishedThemes.map(t => (
                        <div key={t.id} className="rounded-2xl overflow-hidden shadow border border-slate-200">
                            {/* Mini preview */}
                            <div className="h-16 grid grid-cols-3 gap-1 p-2" style={{ background: t.bgColor }}>
                                {[1,2,3].map(i => (
                                    <div key={i} className="rounded-lg" style={{ background: t.cardColor }}>
                                        <div className="h-1.5 w-8 rounded mt-1.5 mx-auto" style={{ background: t.accentColor }}></div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white px-3 py-2 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">{t.publishedName || 'Custom Theme'}</p>
                                    <p className="text-[10px] text-slate-400">by {t.userName}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex gap-1">
                                        {[t.bgColor, t.accentColor, t.textColor, t.cardColor].map((c, i) => (
                                            <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: c }}></div>
                                        ))}
                                    </div>
                                    <button onClick={() => handleLikeTheme(t.id)}
                                        className="flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded-full text-xs font-black hover:bg-red-100 transition-all active:scale-95">
                                        ❤️ {t.likes || 0}
                                    </button>
                                    <button
                                        onClick={() => { setBgColor(t.bgColor); setAccentColor(t.accentColor); setTextColor(t.textColor); setCardColor(t.cardColor); setTab('THEME'); }}
                                        className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full hover:bg-indigo-200 transition-all">
                                        Use
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── GLOBAL ANIMATIONS GALLERY ── */}
            {tab === 'GLOBAL_ANIMATIONS' && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500 text-center">Ultra users ke banaye hue animations — Like karo ❤️</p>
                    {publishedAnimations.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <p className="text-4xl mb-3">✨</p>
                            <p className="font-bold text-sm">Abhi koi published animation nahi</p>
                            <p className="text-xs mt-1">Ultra user pehle wala bano!</p>
                        </div>
                    )}
                    {publishedAnimations.map(a => (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow">
                            {/* Preview */}
                            <div className="relative h-10 overflow-hidden" style={{ background: '#0f172a' }}>
                                <TopBarEffectsLayer effects={[{ id: a.effectId, enabled: true, color: a.color, speed: a.speed }]} />
                            </div>
                            <div className="px-3 py-2.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">{a.publishedName || a.effectName}</p>
                                    <p className="text-[10px] text-slate-400">by {a.userName} • {a.effectName}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ background: a.color }}></div>
                                    <button onClick={() => handleLikeAnim(a.id)}
                                        className="flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded-full text-xs font-black hover:bg-red-100 transition-all active:scale-95">
                                        ❤️ {a.likes || 0}
                                    </button>
                                    <button
                                        onClick={() => { setSelectedEffect(a.effectId); setAnimColor(a.color); setAnimSpeed(a.speed); setTab('ANIMATION'); }}
                                        className="text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-200 transition-all">
                                        Use
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
