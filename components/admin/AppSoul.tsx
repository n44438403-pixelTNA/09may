import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../../types';
import { ALL_FEATURES, Feature } from '../../utils/featureRegistry';
import { Save, CheckCircle, Settings, Shield, Star, Lock, Zap, BookOpen, Crown, BrainCircuit, Headphones, MessageSquare, Megaphone, Video, FileText } from 'lucide-react';

interface Props {
    settings: SystemSettings;
    onUpdateSettings: (s: SystemSettings) => void;
    onBack: () => void;
}

// Mapping of Feature IDs to the user's specific request list - UPDATED
const SOUL_FEATURES = [
    'QUICK_REVISION',
    'DEEP_DIVE',
    'PREMIUM_NOTES',
    'ADDITIONAL_NOTES',
    'VIDEO_ACCESS',
    'MCQ_FREE',
    'MCQ_PREMIUM',
    'AUDIO_LIBRARY',
    'REVISION_HUB_FREE',
    'REVISION_HUB_PREMIUM',
    'AI_STUDIO',
    'MY_ANALYSIS',
    'TOPIC_CONTENT',
    'REQUEST_CONTENT',
    // Removed Marksheet features as requested
];

export const AppSoul: React.FC<Props> = ({ settings, onUpdateSettings, onBack }) => {
    const [localConfig, setLocalConfig] = useState<Record<string, any>>(settings.featureConfig || {});

    useEffect(() => {
        if (settings.featureConfig) {
            setLocalConfig(settings.featureConfig);
        }
    }, [settings.featureConfig]);

    const handleTierToggle = (id: string, tier: 'FREE' | 'BASIC' | 'ULTRA') => {
        setLocalConfig(prev => {
            const current = prev[id] || {};
            const currentTiers = current.allowedTiers || ['FREE', 'BASIC', 'ULTRA'];
            let newTiers;
            if (currentTiers.includes(tier)) {
                newTiers = currentTiers.filter((t: string) => t !== tier);
            } else {
                newTiers = [...currentTiers, tier];
            }
            return {
                ...prev,
                [id]: { ...current, allowedTiers: newTiers }
            };
        });
    };

    const handleLimitChange = (id: string, tier: 'free' | 'basic' | 'ultra', value: string) => {
        setLocalConfig(prev => {
            const current = prev[id] || {};
            const currentLimits = current.limits || {};
            const newLimits = {
                ...currentLimits,
                [tier]: value === '' ? undefined : Number(value)
            };
            if (value === '') delete newLimits[tier];
            return {
                ...prev,
                [id]: { ...current, limits: newLimits }
            };
        });
    };

    const handleCostChange = (id: string, cost: number) => {
        setLocalConfig(prev => {
            const current = prev[id] || {};
            return {
                ...prev,
                [id]: { ...current, creditCost: cost }
            };
        });
    };

    const handleLockToggle = (id: string) => {
        setLocalConfig(prev => {
            const current = prev[id] || {};
            const isVisible = current.visible !== false;
            return {
                ...prev,
                [id]: { ...current, visible: !isVisible }
            };
        });
    };

    const saveChanges = () => {
        const updatedSettings = {
            ...settings,
            featureConfig: localConfig
        };
        onUpdateSettings(updatedSettings);
        alert("App Soul Configurations Saved Successfully!");
    };

    const getIcon = (id: string) => {
        if (id.includes('MCQ')) return <CheckCircle size={24} className="text-green-500"/>;
        if (id.includes('NOTES') || id.includes('DEEP')) return <FileText size={24} className="text-blue-500"/>;
        if (id.includes('VIDEO')) return <Video size={24} className="text-red-500"/>;
        if (id.includes('AUDIO')) return <Headphones size={24} className="text-pink-500"/>;
        if (id.includes('AI') || id.includes('STUDIO')) return <BrainCircuit size={24} className="text-purple-500"/>;
        if (id.includes('REVISION')) return <Zap size={24} className="text-yellow-500"/>;
        if (id.includes('REQUEST')) return <Megaphone size={24} className="text-orange-500"/>;
        return <Star size={24} className="text-slate-600"/>;
    };

    // Filter relevant features
    const soulFeatures = ALL_FEATURES.filter(f => SOUL_FEATURES.includes(f.id));

    return (
        <div className="bg-slate-50 min-h-screen p-6 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 text-slate-600">
                        &larr;
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Crown className="text-violet-600 fill-violet-200" /> App Soul
                        </h1>
                        <p className="text-slate-600 text-xs font-medium">Core Feature Control</p>
                    </div>
                </div>
            </div>

            {/* Sticky Save Button - Mobile Optimized */}
            <div className="fixed inset-x-0 bottom-8 w-full mx-auto pointer-events-none z-[9999] flex justify-end px-6 safe-area-bottom">
                <button
                    onClick={saveChanges}
                    className="pointer-events-auto w-12 h-12 bg-violet-600 text-white rounded-full shadow-2xl hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center border-2 border-white"
                    title="Save Soul Config"
                >
                    <Save size={20} />
                </button>
            </div>

            {/* Grid - Mobile Optimized */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-24">
                {soulFeatures.map(feature => {
                    const conf = localConfig[feature.id] || {};
                    const isVisible = conf.visible !== false;
                    const allowedTiers = conf.allowedTiers || (feature.requiredSubscription === 'ULTRA' ? ['ULTRA'] : feature.requiredSubscription === 'BASIC' ? ['BASIC', 'ULTRA'] : ['FREE', 'BASIC', 'ULTRA']);
                    const cost = conf.creditCost !== undefined ? conf.creditCost : 0;

                    return (
                        <div key={feature.id} className={`bg-white rounded-xl border transition-all ${isVisible ? 'border-slate-200 shadow-sm' : 'border-red-200 bg-red-50/30'}`}>
                            {/* Card Header */}
                            <div className="p-3 border-b border-slate-100 flex justify-between items-start">
                                <div className="flex items-center gap-2 overflow-hidden pr-2">
                                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                                        {getIcon(feature.id)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm text-slate-800 truncate">{feature.label}</h3>
                                        <p className="text-[9px] text-slate-500 font-mono truncate">{feature.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleLockToggle(feature.id)}
                                    className={`px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 shrink-0 transition-colors ${isVisible ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white shadow-md'}`}
                                >
                                    {isVisible ? <Lock size={10} className="opacity-50"/> : <Lock size={10} />}
                                    {isVisible ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {/* Controls - Compact */}
                            <div className={`p-2 space-y-2 ${!isVisible ? 'opacity-50 pointer-events-none grayscale' : ''}`}>

                                {/* Access Tiers - Compact Grid */}
                                <div className="grid grid-cols-3 gap-1">
                                    {['FREE', 'BASIC', 'ULTRA'].map(tier => {
                                        const isActive = allowedTiers.includes(tier);
                                        return (
                                            <button
                                                key={tier}
                                                onClick={() => handleTierToggle(feature.id, tier as any)}
                                                className={`py-1 rounded text-[8px] font-bold border transition-all ${
                                                    isActive
                                                    ? (tier === 'FREE' ? 'bg-green-50 border-green-200 text-green-700' : tier === 'BASIC' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-purple-50 border-purple-200 text-purple-700')
                                                    : 'bg-white border-slate-100 text-slate-300'
                                                }`}
                                            >
                                                {tier}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Limits & Cost Row */}
                                <div className="grid grid-cols-4 gap-2">
                                    {['free', 'basic', 'ultra'].map(tier => (
                                        <div key={tier} className="relative">
                                            <input
                                                type="number"
                                                placeholder="∞"
                                                value={conf.limits?.[tier] ?? ''}
                                                onChange={(e) => handleLimitChange(feature.id, tier as any, e.target.value)}
                                                className="w-full py-1.5 px-1 text-[9px] font-bold border border-slate-200 rounded text-center focus:ring-1 focus:ring-violet-500 outline-none"
                                            />
                                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] bg-white px-1 text-slate-500 font-bold uppercase">{tier.charAt(0)}</span>
                                        </div>
                                    ))}

                                    {/* Cost */}
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={cost}
                                            onChange={(e) => handleCostChange(feature.id, Number(e.target.value))}
                                            className="w-full py-1.5 px-1 bg-orange-50/50 border border-orange-200 rounded text-[9px] font-black text-orange-700 text-center focus:bg-white focus:ring-1 focus:ring-orange-200 outline-none"
                                            min="0"
                                        />
                                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] bg-white px-1 text-orange-500 font-bold uppercase">COST</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
