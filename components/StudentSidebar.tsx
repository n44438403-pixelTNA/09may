import React from 'react';
import { X, Gift, Gamepad2, CreditCard, Crown, History, BrainCircuit, Award, Trophy, Mail, User, ChevronRight, LogOut, FileClock, Download, Palette } from 'lucide-react';
import { StudentTab, User as UserType, SystemSettings } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: StudentTab) => void;
    user: UserType;
    onLogout: () => void;
    settings?: SystemSettings;
}

export const StudentSidebar: React.FC<Props> = ({ isOpen, onClose, onNavigate, user, onLogout, settings }) => {

    const rawItems: { id: StudentTab, icon: any, label: string, color: string, featureId?: string, category?: string }[] = [
        // --- LEARNING & PROGRESS ---
        { id: 'HISTORY', icon: History, label: 'Cloud History', color: 'text-slate-600', featureId: 'f21', category: 'LEARNING' },
        { id: 'ANALYTICS', icon: Trophy, label: 'Test Analysis', color: 'text-teal-600', featureId: 'f50', category: 'LEARNING' },
        { id: 'AI_HISTORY' as any, icon: BrainCircuit, label: 'AI History', color: 'text-indigo-600', featureId: 'f101', category: 'LEARNING' },
        { id: 'DOWNLOADS' as any, icon: Download, label: 'Offline Downloads', color: 'text-blue-500', category: 'LEARNING' },

        // --- PREMIUM & REWARDS ---
        { id: 'STORE', icon: Crown, label: 'Premium Store', color: 'text-yellow-600', featureId: 'f12', category: 'PREMIUM' },
        { id: 'SUB_HISTORY' as any, icon: CreditCard, label: 'My Plan', color: 'text-blue-600', featureId: 'f11', category: 'PREMIUM' },
        { id: 'REDEEM', icon: Gift, label: 'Redeem Code', color: 'text-pink-600', category: 'PREMIUM' },

        // --- FUN & GAMES ---
        { id: 'GAME', icon: Gamepad2, label: 'Play Game', color: 'text-orange-600', featureId: 'f9', category: 'FUN' },
        { id: 'PRIZES', icon: Award, label: 'Prizes', color: 'text-purple-600', featureId: 'f6', category: 'FUN' },
        { id: 'LEADERBOARD', icon: Trophy, label: 'Leaderboard', color: 'text-yellow-500', featureId: 'f5', category: 'FUN' },

        // --- CREATIVE ---
        { id: 'THEME_BUILDER' as StudentTab, icon: Palette, label: 'My Theme Studio', color: 'text-violet-600', category: 'CREATIVE' },

        // --- ACCOUNT ---
        { id: 'PROFILE', icon: User, label: 'My Profile', color: 'text-slate-800', featureId: 'f13', category: 'ACCOUNT' },
    ];

    const menuItems = rawItems.filter(item => {
        if (!item.featureId) return true;
        if (settings?.hiddenFeatures?.includes(item.featureId)) return false;
        return true;
    });

    const groupedItems: Record<string, typeof menuItems> = {
        'LEARNING': menuItems.filter(i => i.category === 'LEARNING'),
        'PREMIUM': menuItems.filter(i => i.category === 'PREMIUM'),
        'FUN': menuItems.filter(i => i.category === 'FUN'),
        'CREATIVE': menuItems.filter(i => i.category === 'CREATIVE'),
        'ACCOUNT': menuItems.filter(i => i.category === 'ACCOUNT'),
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">

                {/* Header */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                    <div>
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 text-xl font-black border border-white/20">
                            {(user.name || 'S').charAt(0)}
                        </div>
                        <h2 className="font-bold text-lg leading-tight">{user.name}</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">ID: {user.displayId || user.id.slice(0, 8)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Menu Items (Categorized) */}
                <div className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
                    {['LEARNING', 'PREMIUM', 'FUN', 'CREATIVE', 'ACCOUNT'].map(cat => {
                        const items = groupedItems[cat];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={cat} className="space-y-1">
                                <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{cat}</p>
                                {items.map((item) => {
                                    const badge = item.featureId ? settings?.featureBadges?.[item.featureId] : undefined;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                onNavigate(item.id);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all group relative"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-sm transition-all ${item.color}`}>
                                                    <item.icon size={20} />
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm group-hover:text-slate-900">{item.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {badge === 'NEW' && <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">NEW</span>}
                                                {badge === 'UPGRADE' && <span className="text-[10px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full">PRO</span>}
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                {(settings?.isLogoutEnabled !== false || user.role === 'ADMIN' || isImpersonating) && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold transition-all active:scale-95"
                        >
                            <LogOut size={20} />
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
