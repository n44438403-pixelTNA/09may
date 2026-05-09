
import React, { useState } from 'react';
import { Feature, FeatureGroup, ALL_FEATURES } from '../../utils/featureRegistry';
import { SystemSettings } from '../../types';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
    onNavigate: (tab: string) => void;
    activeTab: string;
    counts?: Record<string, number>;
    hasPermission: (perm: string) => boolean;
    userRole: string;
    settings?: SystemSettings; // NEW: To check defaultAdminPermissions
}

const GROUPS: { key: FeatureGroup; label: string; icon: keyof typeof LucideIcons; color: string }[] = [
    { key: 'CORE', label: 'Core Management', icon: 'Box', color: 'blue' },
    { key: 'REQUESTS', label: 'User Requests', icon: 'Inbox', color: 'indigo' },
    { key: 'REVISION', label: 'Revision Hub', icon: 'BrainCircuit', color: 'pink' },
    { key: 'CONTENT', label: 'Content & Analysis', icon: 'BarChart3', color: 'purple' },
    { key: 'GAME', label: 'Gamification', icon: 'Gamepad2', color: 'orange' },
    { key: 'NSTA_CONTROL', label: 'NSTA Control', icon: 'Sliders', color: 'violet' },
    { key: 'ADVANCED', label: 'Advanced Settings', icon: 'Settings', color: 'slate' },
];

export const FeatureGroupList: React.FC<Props> = ({ onNavigate, activeTab, counts, hasPermission, userRole, settings }) => {
    // Default open the group that contains the active tab, or CORE
    const findGroupForTab = (tab: string) => {
        const feature = ALL_FEATURES.find(f => f.adminTab === tab);
        return feature ? feature.group : 'CORE';
    };

    const [expandedGroup, setExpandedGroup] = useState<FeatureGroup>(findGroupForTab(activeTab));

    const handleGroupClick = (group: FeatureGroup) => {
        if (expandedGroup === group) {
            // Optional: Toggle close? Maybe keep one open always for better UX?
            // Let's allow toggle
            // setExpandedGroup(null as any);
        } else {
            setExpandedGroup(group);
        }
    };

    const renderIcon = (name: string, size: number = 20, className?: string) => {
        const Icon = (LucideIcons as any)[name];
        return Icon ? <Icon size={size} className={className} /> : <LucideIcons.HelpCircle size={size} className={className} />;
    };

    return (
        <div className="space-y-4">
            {GROUPS.map((group) => {
                const isExpanded = expandedGroup === group.key;
                const groupFeatures = ALL_FEATURES.filter(f => {
                    if (f.group !== group.key || !f.adminVisible || !f.adminTab) return false;

                    // 1. Super Admin Check
                    if (f.requiresSuperAdmin && userRole !== 'ADMIN') return false;

                    // 2. Sub-Admin Global Master Switch (Feature Access Page Control)
                    // If user is SUB_ADMIN, we check if the feature ID is in defaultAdminPermissions (which acts as the "Allowed List" toggled by Shield)
                    // Note: If defaultAdminPermissions is undefined/empty, we might fallback to requiredPermission logic,
                    // BUT the user explicitely wants "control". So if list exists, we enforce it.
                    if (userRole === 'SUB_ADMIN' && settings?.defaultAdminPermissions) {
                        if (!settings.defaultAdminPermissions.includes(f.id)) return false;
                    }

                    // 3. Granular Permission Check (Legacy/Specific)
                    if (f.requiredPermission) {
                        return hasPermission(f.requiredPermission) || userRole === 'ADMIN';
                    }

                    return true;
                });

                if (groupFeatures.length === 0) return null;

                const GroupIcon = (LucideIcons as any)[group.icon];

                return (
                    <div key={group.key} className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isExpanded ? `bg-white border-${group.color}-100 shadow-sm` : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                        {/* HEADER */}
                        <button
                            onClick={() => handleGroupClick(group.key)}
                            className={`w-full p-4 flex items-center justify-between transition-colors ${isExpanded ? `bg-${group.color}-50` : 'bg-white hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${isExpanded ? `bg-white text-${group.color}-600 shadow-sm` : `bg-slate-100 text-slate-600 group-hover:bg-slate-200`}`}>
                                    {GroupIcon && <GroupIcon size={20} />}
                                </div>
                                <span className={`font-black text-sm uppercase tracking-wide ${isExpanded ? `text-${group.color}-900` : 'text-slate-600'}`}>
                                    {group.label}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isExpanded ? `bg-${group.color}-200 text-${group.color}-800` : 'bg-slate-100 text-slate-500'}`}>
                                    {groupFeatures.length}
                                </span>
                            </div>
                            <div className={isExpanded ? `text-${group.color}-600` : 'text-slate-300'}>
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </div>
                        </button>

                        {/* CONTENT GRID - HORIZONTAL SCROLL FOR MOBILE */}
                        {isExpanded && (
                            <div className="p-2 flex flex-wrap gap-2 overflow-x-auto justify-center sm:justify-start">
                                {groupFeatures.map(feature => {
                                    const isActive = activeTab === feature.adminTab;
                                    const count = counts?.[feature.id];

                                    return (
                                        <button
                                            key={feature.id}
                                            onClick={() => onNavigate(feature.adminTab!)}
                                            className={`
                                                relative p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 group w-[80px] shrink-0
                                                ${isActive
                                                    ? `bg-${feature.color || 'blue'}-50 border-${feature.color || 'blue'}-500 shadow-md transform scale-[1.02]`
                                                    : `bg-white border-slate-100 hover:border-${feature.color || 'blue'}-300 hover:shadow-lg hover:-translate-y-1`
                                                }
                                            `}
                                        >
                                            <div className={`
                                                p-2 rounded-full transition-all duration-200 relative
                                                ${isActive
                                                    ? `bg-${feature.color || 'blue'}-600 text-white shadow-lg`
                                                    : `bg-${feature.color || 'blue'}-50 text-${feature.color || 'blue'}-600 group-hover:scale-110`
                                                }
                                            `}>
                                                {renderIcon(feature.icon || 'Circle', 16)}
                                            </div>
                                            <span className={`
                                                font-bold text-[9px] text-center transition-colors leading-tight truncate w-full
                                                ${isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-800'}
                                            `}>
                                                {feature.label}
                                            </span>

                                            {isActive && (
                                                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${feature.color || 'blue'}-500 animate-pulse`}></div>
                                            )}

                                            {count !== undefined && count > 0 && (
                                                <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                                    {count}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
