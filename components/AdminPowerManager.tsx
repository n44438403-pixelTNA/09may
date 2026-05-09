import React, { useState } from 'react';
import { SystemSettings, FeatureCategory } from '../types';
import { DollarSign, Eye, EyeOff, Save, Search, Settings, Lock, Package, Trash2, Edit3, X, Plus, Crown, LayoutGrid, List, CheckSquare, Gamepad2, BrainCircuit, Activity, BarChart3, Star, Zap, PenTool, Banknote, Layers, Bell, Ticket, Flame, Video, GraduationCap, ShoppingBag, Home as HomeIcon, Navigation } from 'lucide-react';
import { ALL_FEATURES } from '../utils/featureRegistry';

interface Props {
    settings: SystemSettings;
    onUpdate: (s: SystemSettings) => void;
}

export const AdminPowerManager: React.FC<Props> = ({ settings, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'PRICING' | 'VISIBILITY' | 'TOPBAR' | 'BOTTOMNAV' | 'HOMEGRID'>('PRICING');
    const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);

    const updateSetting = (key: keyof SystemSettings, value: any) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        onUpdate(newSettings);
    };

    // Helper: toggle item in a hidden-list array setting
    const toggleHidden = (key: 'hiddenTopBarButtons' | 'hiddenBottomNavButtons' | 'hiddenHomeButtons', id: string) => {
        const current = (localSettings[key] as string[]) || [];
        const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
        updateSetting(key, updated);
    };

    // Top bar buttons we expose for hiding
    const TOPBAR_BUTTONS = [
        { id: 'STREAK', label: 'Streak Badge', Icon: Flame, hint: 'The 🔥 day-counter chip' },
        { id: 'CREDITS', label: 'Credits Chip', Icon: Crown, hint: '"50 CR" coin balance pill' },
        { id: 'LIGHTNING', label: 'Lightning ⚡', Icon: Zap, hint: 'Custom Page / Updates button' },
        { id: 'NOTIFICATION', label: 'Notification 🔔', Icon: Bell, hint: 'Bell icon with red dot' },
        { id: 'SALE', label: 'Sale Discount Chip', Icon: Ticket, hint: 'Special offer "% OFF" badge' },
    ];

    // Bottom nav slots we expose for hiding
    const BOTTOM_NAV_BUTTONS = [
        { id: 'HOMEWORK', label: 'Homework', Icon: GraduationCap, hint: 'Shown when active homework exists' },
        { id: 'REVISION_V2', label: 'Revision Hub', Icon: BrainCircuit, hint: 'Brain-circuit icon — Revision tab' },
        { id: 'GK', label: 'Important', Icon: Star, hint: 'Star icon — opens Important Notes' },
        { id: 'VIDEO', label: 'Video', Icon: Video, hint: 'When video is in bottom nav (not top bar)' },
        { id: 'PROFILE', label: 'Profile', Icon: Crown, hint: 'When video is moved to top bar' },
        { id: 'APP_STORE', label: 'Apps Store', Icon: ShoppingBag, hint: 'Apps marketplace tab' },
    ];

    // Home grid features (Layer 1+2 features — student-facing dashboard buttons)
    const HOME_GRID_FEATURES = ALL_FEATURES.filter(f => (f.surfaceLevel === 1 || f.surfaceLevel === 2) && !f.requiresSuperAdmin);

    return (
        <div className="p-6 bg-white min-h-[500px]">
            {/* TABS */}
            <div className="flex flex-wrap gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl">
                {[
                    { id: 'PRICING', icon: DollarSign, label: 'Pricing & Costs' },
                    { id: 'VISIBILITY', icon: Eye, label: 'Modules' },
                    { id: 'TOPBAR', icon: Crown, label: 'Top Bar' },
                    { id: 'BOTTOMNAV', icon: Navigation, label: 'Bottom Nav' },
                    { id: 'HOMEGRID', icon: HomeIcon, label: 'Home Grid' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: PRICING */}
            {activeTab === 'PRICING' && (
                <div className="space-y-6">
                    {/* GLOBAL COSTS */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2"><DollarSign size={16} /> Content Credit Costs (0 = Free)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {[
                                { key: 'defaultPdfCost', label: 'PDF Access', default: 5 },
                                { key: 'defaultVideoCost', label: 'Video Access', default: 5 },
                                { key: 'mcqTestCost', label: 'MCQ Test Entry', default: 2 },
                                { key: 'mcqAnalysisCost', label: 'MCQ Analysis', default: 5 },
                                { key: 'mcqAnalysisCostUltra', label: 'Ultra Analysis', default: 20 },
                                { key: 'mcqHistoryCost', label: 'History View', default: 1 },
                                { key: 'chatCost', label: 'AI Chat Msg', default: 1 },
                                { key: 'gameCost', label: 'Spin Wheel', default: 0 },
                            ].map((item) => (
                                <div key={item.key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">{item.label}</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">🪙</span>
                                        <input
                                            type="number"
                                            // @ts-ignore
                                            value={localSettings[item.key] !== undefined ? localSettings[item.key] : item.default}
                                            onChange={(e) => updateSetting(item.key as keyof SystemSettings, Number(e.target.value))}
                                            className="w-full p-1.5 border rounded font-bold text-sm"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: VISIBILITY */}
            {activeTab === 'VISIBILITY' && (
                <div className="space-y-6">
                     <div className="p-4 border rounded-xl bg-slate-50 col-span-1 md:col-span-2">
                         <h4 className="font-bold text-slate-700 text-sm mb-4">Module Visibility</h4>
                         <div className="flex flex-wrap gap-4">
                             {[
                                 {key: 'isChatEnabled', label: 'Chat Module'},
                                 {key: 'isGameEnabled', label: 'Game Module'},
                                 {key: 'isPaymentEnabled', label: 'Payment Gateway'},
                                 {key: 'allowSignup', label: 'Allow Signups'},
                             ].map(mod => (
                                 <label key={mod.key} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm cursor-pointer hover:bg-slate-50">
                                     <input
                                        type="checkbox"
                                        // @ts-ignore
                                        checked={localSettings[mod.key] !== false}
                                        onChange={e => updateSetting(mod.key as keyof SystemSettings, e.target.checked)}
                                        className="accent-green-600 w-4 h-4"
                                     />
                                     <span className="text-xs font-bold text-slate-700">{mod.label}</span>
                                 </label>
                             ))}
                         </div>
                     </div>
                </div>
            )}

            {/* TAB 3: TOP BAR — per-button hide/unhide */}
            {activeTab === 'TOPBAR' && (
                <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-200">
                        <h4 className="font-black text-slate-800 text-sm mb-1 flex items-center gap-2">
                            <Crown size={16} className="text-amber-600" /> Top Bar Buttons
                        </h4>
                        <p className="text-[11px] text-slate-600 mb-4">
                            Har button ko alag se hide ya show kar sakte hain. Greyed-out = hidden from students.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TOPBAR_BUTTONS.map(btn => {
                                const isHidden = (localSettings.hiddenTopBarButtons || []).includes(btn.id);
                                return (
                                    <button
                                        key={btn.id}
                                        onClick={() => toggleHidden('hiddenTopBarButtons', btn.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isHidden ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-amber-300 shadow-sm hover:shadow-md'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHidden ? 'bg-slate-200 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>
                                            <btn.Icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-slate-800">{btn.label}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{btn.hint}</div>
                                        </div>
                                        <div className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-all ${isHidden ? 'bg-slate-300' : 'bg-emerald-500'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${isHidden ? '' : 'translate-x-4'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: BOTTOM NAV — per-slot hide/unhide */}
            {activeTab === 'BOTTOMNAV' && (
                <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                        <h4 className="font-black text-slate-800 text-sm mb-1 flex items-center gap-2">
                            <Navigation size={16} className="text-blue-600" /> Bottom Navigation Slots
                        </h4>
                        <p className="text-[11px] text-slate-600 mb-4">
                            Hide karne par baki buttons automatically slide ho jaayenge.
                            <span className="font-bold"> Home button hamesha visible rehta hai.</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {BOTTOM_NAV_BUTTONS.map(btn => {
                                const isHidden = (localSettings.hiddenBottomNavButtons || []).includes(btn.id);
                                return (
                                    <button
                                        key={btn.id}
                                        onClick={() => toggleHidden('hiddenBottomNavButtons', btn.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isHidden ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-blue-300 shadow-sm hover:shadow-md'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHidden ? 'bg-slate-200 text-slate-400' : 'bg-blue-100 text-blue-700'}`}>
                                            <btn.Icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-slate-800">{btn.label}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{btn.hint}</div>
                                        </div>
                                        <div className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-all ${isHidden ? 'bg-slate-300' : 'bg-emerald-500'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${isHidden ? '' : 'translate-x-4'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: HOME GRID — feature buttons on home page */}
            {activeTab === 'HOMEGRID' && (
                <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200">
                        <h4 className="font-black text-slate-800 text-sm mb-1 flex items-center gap-2">
                            <HomeIcon size={16} className="text-emerald-600" /> Home Page Buttons
                        </h4>
                        <p className="text-[11px] text-slate-600 mb-4">
                            Sabhi home grid feature buttons. Hide karne par yeh button student ke home par nahi dikhega.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1">
                            {HOME_GRID_FEATURES.map(f => {
                                const isHidden = (localSettings.hiddenHomeButtons || []).includes(f.id) || (localSettings.hiddenFeatures || []).includes(f.id);
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleHidden('hiddenHomeButtons', f.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isHidden ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-emerald-300 shadow-sm hover:shadow-md'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isHidden ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-slate-800 truncate">{f.label}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{f.description || f.id}</div>
                                        </div>
                                        <div className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-all ${isHidden ? 'bg-slate-300' : 'bg-emerald-500'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${isHidden ? '' : 'translate-x-4'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3 italic">
                            Tip: Aap pre-existing "Hidden Features" list ka bhi use kar sakte hain (yeh dono respect kiye jaate hain).
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
