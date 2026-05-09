import React, { useState, useEffect } from 'react';
import { SystemSettings, AppFeature } from '../../types';
import { ALL_FEATURES } from '../../utils/featureRegistry';
import { Search, Save, Eye, EyeOff, Tag, Star, Lock, CheckCircle, RefreshCw, LayoutGrid, List, Sparkles, ToggleLeft, ToggleRight, Plus, Trash2, Shield, Settings } from 'lucide-react';

interface Props {
    settings: SystemSettings;
    onUpdateSettings: (s: SystemSettings) => void;
    onBack: () => void;
}

export const FeatureAccessPage: React.FC<Props> = ({ settings, onUpdateSettings, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [localConfig, setLocalConfig] = useState<Record<string, any>>(settings.featureConfig || {});
    const [subAdminPermissions, setSubAdminPermissions] = useState<string[]>(settings.defaultAdminPermissions || []);
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [configMode, setConfigMode] = useState<'STUDENT' | 'SUB_ADMIN'>('STUDENT');

    // Add Feature Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFeature, setNewFeature] = useState({ id: '', title: '', category: 'CUSTOM' });
    const [customCategory, setCustomCategory] = useState('');

    // Initialize config from settings if empty, but respect existing
    useEffect(() => {
        if (settings.featureConfig) {
            setLocalConfig(settings.featureConfig);
        }
        if (settings.defaultAdminPermissions) {
            setSubAdminPermissions(settings.defaultAdminPermissions);
        }
    }, [settings.featureConfig, settings.defaultAdminPermissions]);

    const handleToggle = (id: string, field: 'visible' | 'isNew' | 'isUpdated' | 'isDummy') => {
        setLocalConfig(prev => {
            const current = prev[id] || {};
            return {
                ...prev,
                [id]: { ...current, [field]: current[field] !== undefined ? !current[field] : (field === 'visible' ? false : true) }
            };
        });
    };

    // Handle Multiple Tiers via Checkboxes
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
            // If value is empty, remove the limit key
            const newLimits = {
                ...currentLimits,
                [tier]: value === '' ? undefined : Number(value)
            };
            // Clean up undefined values
            if (value === '') delete newLimits[tier];

            return {
                ...prev,
                [id]: {
                    ...current,
                    limits: newLimits
                }
            };
        });
    };

    const handleSubAdminToggle = (id: string) => {
        setSubAdminPermissions(prev => {
            if (prev.includes(id)) {
                return prev.filter(p => p !== id);
            } else {
                return [...prev, id];
            }
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

    const handleAddFeature = () => {
        if (!newFeature.id || !newFeature.title) {
            alert("ID and Title are required");
            return;
        }

        const finalCategory = newFeature.category === 'NEW_CATEGORY' ? customCategory : newFeature.category;

        // Add to localConfig (this implicitly 'creates' it for the merged list)
        setLocalConfig(prev => ({
            ...prev,
            [newFeature.id]: {
                label: newFeature.title,
                visible: true,
                allowedTiers: ['FREE', 'BASIC', 'ULTRA'],
                customCategory: finalCategory || 'CUSTOM' // Store category if needed
            }
        }));
        setShowAddModal(false);
        setNewFeature({ id: '', title: '', category: 'CUSTOM' });
        setCustomCategory('');
    };

    const handleDeleteFeature = (id: string) => {
        if (window.confirm(`Are you sure you want to delete feature "${id}"? This will remove its configuration.`)) {
            setLocalConfig(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        }
    };

    const saveChanges = () => {
        const updatedSettings = {
            ...settings,
            featureConfig: localConfig,
            defaultAdminPermissions: subAdminPermissions
        };
        onUpdateSettings(updatedSettings);
        alert("Feature configurations and Sub-Admin permissions saved successfully!");
    };

    // Combine static features with any custom ones found in config
    const coreFeatureIds = new Set(ALL_FEATURES.map(f => f.id));
    const customFeatureIds = Object.keys(localConfig).filter(id => !coreFeatureIds.has(id));

    // Map ALL_FEATURES (Registry) to expected Format
    const combinedFeatures = [
        ...ALL_FEATURES.map(f => ({
            id: f.id,
            title: f.label,
            category: f.group,
            enabled: true,
            isDummy: f.isDummy, // Preserve Dummy Status from Registry
            adminVisible: f.adminVisible // Preserve Admin Visibility
        })),
        ...customFeatureIds.map(id => ({
            id,
            title: localConfig[id].label || id,
            enabled: true,
            order: 999,
            category: localConfig[id].customCategory || 'CUSTOM',
            isDummy: false,
            adminVisible: false // Custom features default to student features unless specified
        }))
    ];

    // Merge with config state
    const mergedFeatures = combinedFeatures.map(f => {
        const conf = localConfig[f.id] || {};
        return {
            ...f,
            visible: conf.visible !== false,
            isNew: conf.isNew || false,
            isUpdated: conf.isUpdated || false,
            isDummy: conf.isDummy !== undefined ? conf.isDummy : (f.isDummy || false), // Respect Registry Default
            allowedTiers: conf.allowedTiers || (conf.minTier === 'ULTRA' ? ['ULTRA'] : conf.minTier === 'BASIC' ? ['BASIC', 'ULTRA'] : ['FREE', 'BASIC', 'ULTRA']),
            creditCost: conf.creditCost !== undefined ? conf.creditCost : 0,
            limits: conf.limits || {},
            isSubAdminAccessible: subAdminPermissions.includes(f.id),
            // Use config category if available (override), else default
            category: conf.customCategory || f.category || 'OTHER'
        };
    });

    // Extract Categories
    const categories = ['ALL', ...Array.from(new Set(mergedFeatures.map(f => f.category))).sort()];

    // Mapping of Feature IDs to the "App Soul" list - THESE ARE HIDDEN FROM HERE
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
        'REQUEST_CONTENT'
    ];

    const filteredFeatures = mergedFeatures.filter(f => {
        // 0. EXCLUDE SOUL FEATURES (Managed in App Soul Tab)
        if (SOUL_FEATURES.includes(f.id)) return false;

        // 1. FILTER BY MODE (STRICT SEPARATION)
        if (configMode === 'STUDENT' && f.adminVisible) return false;
        if (configMode === 'SUB_ADMIN' && !f.adminVisible) return false;

        // 2. SEARCH
        const matchesSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) || f.id.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        // 3. CATEGORY
        if (activeCategory !== 'ALL' && f.category !== activeCategory) return false;

        return true;
    });

    return (
        <div className="bg-slate-50 min-h-screen p-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 text-slate-600">
                        &larr;
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Feature Access Manager</h1>
                        <p className="text-xs text-slate-600 font-bold">{mergedFeatures.length} Features Detected</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {/* MODE SWITCHER */}
                    <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
                        <button
                            onClick={() => setConfigMode('STUDENT')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${configMode === 'STUDENT' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-700'}`}
                        >
                            Student
                        </button>
                        <button
                            onClick={() => setConfigMode('SUB_ADMIN')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${configMode === 'SUB_ADMIN' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-700'}`}
                        >
                            Sub-Admin
                        </button>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus size={20} /> Add Feature
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID')}
                        className="p-3 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50"
                    >
                        {viewMode === 'GRID' ? <List size={20} /> : <LayoutGrid size={20} />}
                    </button>
                    <button
                        onClick={saveChanges}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2 flex-1 md:flex-none justify-center"
                    >
                        <Save size={20} /> Save Config
                    </button>
                </div>
            </div>

            {/* Categories & Search */}
            <div className="space-y-4 mb-6">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search features..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-transparent outline-none font-bold text-slate-700"
                        />
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
                                activeCategory === cat
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid/List View */}
            <div className={`grid ${viewMode === 'GRID' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                {filteredFeatures.map(feature => {
                    const isCustom = !coreFeatureIds.has(feature.id);
                    return (
                        <div key={feature.id} className={`bg-white p-4 rounded-xl border-2 transition-all relative ${feature.visible ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60 bg-slate-50'}`}>

                            {/* Delete Button for Custom Features */}
                            {isCustom && (
                                <button
                                    onClick={() => handleDeleteFeature(feature.id)}
                                    className="absolute top-2 right-2 p-1.5 text-red-400 hover:bg-red-50 rounded-lg z-10"
                                    title="Delete Feature"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}

                            <div className="flex justify-between items-start mb-3 pr-8">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 text-sm">{feature.title}</h3>
                                        {feature.category && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{feature.category}</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{feature.id}</p>
                                </div>
                            </div>

                            {configMode === 'STUDENT' ? (
                                <>
                                    {/* Main Toggles (STUDENT) */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <button
                                            onClick={() => handleToggle(feature.id, 'visible')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-bold text-[10px] flex-1 justify-center whitespace-nowrap ${feature.visible ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-200'}`}
                                        >
                                            {feature.visible ? <ToggleRight size={14} /> : <Lock size={14} />}
                                            {feature.visible ? 'ACTIVE' : 'LOCKED'}
                                        </button>
                                    </div>

                                    {/* Status Flags */}
                                    <div className="flex gap-1 mb-4">
                                        <button onClick={() => handleToggle(feature.id, 'isNew')} className={`flex-1 py-1 rounded text-[9px] font-bold border ${feature.isNew ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-300 border-slate-100'}`}>NEW</button>
                                        <button onClick={() => handleToggle(feature.id, 'isUpdated')} className={`flex-1 py-1 rounded text-[9px] font-bold border ${feature.isUpdated ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-300 border-slate-100'}`}>UPDATED</button>
                                        <button onClick={() => handleToggle(feature.id, 'isDummy')} className={`flex-1 py-1 rounded text-[9px] font-bold border ${feature.isDummy ? 'bg-gray-800 text-white border-gray-900' : 'bg-white text-slate-300 border-slate-100'}`}>DUMMY</button>
                                    </div>

                                    {/* Limits & Access Config */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
                                            {['FREE', 'BASIC', 'ULTRA'].map(tier => (
                                                <div key={tier} className="p-2 text-center bg-slate-100">
                                                    <span className="text-[9px] font-black text-slate-600">{tier}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 divide-x divide-slate-200">
                                            {['FREE', 'BASIC', 'ULTRA'].map((tier) => {
                                                const t = tier as 'FREE' | 'BASIC' | 'ULTRA';
                                                const isAllowed = feature.allowedTiers.includes(t);
                                                const limitVal = feature.limits?.[t.toLowerCase() as 'free'|'basic'|'ultra'] ?? '';

                                                return (
                                                    <div key={tier} className="p-2 flex flex-col gap-2 items-center">
                                                        <button
                                                            onClick={() => handleTierToggle(feature.id, t)}
                                                            className={`w-full py-1 rounded text-[9px] font-bold flex items-center justify-center gap-1 transition-colors ${
                                                                isAllowed
                                                                ? (t === 'FREE' ? 'bg-green-100 text-green-700' : t === 'BASIC' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')
                                                                : 'bg-white border border-slate-200 text-slate-300'
                                                            }`}
                                                        >
                                                            {isAllowed ? <CheckCircle size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-300"></div>}
                                                            {isAllowed ? 'ON' : 'OFF'}
                                                        </button>

                                                        {isAllowed && (
                                                            <div className="w-full relative">
                                                                <Settings size={10} className="absolute left-1.5 top-1.5 text-slate-500" />
                                                                <input
                                                                    type="number"
                                                                    placeholder="∞"
                                                                    value={limitVal}
                                                                    onChange={(e) => handleLimitChange(feature.id, t.toLowerCase() as any, e.target.value)}
                                                                    className="w-full pl-5 pr-1 py-1 text-[10px] font-bold border border-slate-200 rounded text-center focus:ring-1 focus:ring-blue-500 outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Global Cost Override */}
                                    <div className="mt-3 flex items-center gap-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Credit Cost:</label>
                                        <input
                                            type="number"
                                            value={feature.creditCost}
                                            onChange={(e) => handleCostChange(feature.id, Number(e.target.value))}
                                            className="flex-1 p-1 text-xs border border-slate-200 rounded font-bold text-slate-700"
                                            min="0"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Sub-Admin Configuration Only */}
                                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col gap-3">
                                        <p className="text-[10px] font-bold text-purple-700 uppercase">Sub-Admin Permission</p>
                                        <button
                                            onClick={() => handleSubAdminToggle(feature.id)}
                                            className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all font-bold text-xs flex-1 justify-center whitespace-nowrap ${feature.isSubAdminAccessible ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Shield size={16} />
                                            {feature.isSubAdminAccessible ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                                        </button>
                                        <p className="text-[10px] text-slate-500 text-center">
                                            {feature.isSubAdminAccessible ? 'Sub-Admins can manage this feature.' : 'Hidden from Sub-Admins.'}
                                        </p>
                                    </div>
                                </>
                            )}

                        </div>
                    );
                })}
            </div>

            {/* Add Feature Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-slate-800">Add Custom Feature</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-600 font-bold">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Feature ID (Unique)</label>
                                <input
                                    type="text"
                                    value={newFeature.id}
                                    onChange={(e) => setNewFeature({...newFeature, id: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="MY_FEATURE_ID"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Feature Title</label>
                                <input
                                    type="text"
                                    value={newFeature.title}
                                    onChange={(e) => setNewFeature({...newFeature, title: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="My Feature Name"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Category</label>
                                <select
                                    value={newFeature.category}
                                    onChange={(e) => setNewFeature({...newFeature, category: e.target.value})}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                                >
                                    <option value="CUSTOM">Custom</option>
                                    {categories.filter(c => c !== 'ALL' && c !== 'CUSTOM').map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    <option value="NEW_CATEGORY">Create New...</option>
                                </select>

                                {newFeature.category === 'NEW_CATEGORY' && (
                                    <input
                                        type="text"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Enter Category Name"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddFeature}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                            >
                                Add Feature
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
