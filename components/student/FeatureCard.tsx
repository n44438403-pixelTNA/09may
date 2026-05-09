
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Feature } from '../../utils/featureRegistry';

interface Props {
    feature: Feature;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    badge?: string | number;
}

export const FeatureCard: React.FC<Props> = ({ feature, onClick, isActive, disabled, badge }) => {
    const Icon = (LucideIcons as any)[feature.icon || 'Circle'];

    // Styles based on Surface Level (Grid vs List item)
    if (feature.surfaceLevel === 1) {
        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={`
                    relative p-3 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2 group active:scale-95 overflow-hidden h-24 w-full
                    ${isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-400'
                        : 'bg-white border border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-sm'
                    }
                    ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                `}
            >
                {/* Background Decoration */}
                <div className={`absolute -top-8 -right-8 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-150 ${isActive ? 'bg-white' : 'bg-blue-500'}`}></div>

                <div className={`
                    p-2 rounded-xl transition-colors
                    ${isActive ? 'bg-white/20 text-white' : 'bg-slate-50 text-blue-600 group-hover:bg-blue-50'}
                `}>
                    {Icon && <Icon size={20} />}
                </div>

                <span className={`font-black text-[10px] uppercase tracking-wide text-center leading-tight ${isActive ? 'text-white' : 'text-slate-700'}`}>
                    {feature.label}
                </span>

                {badge && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse border border-white">
                        {badge}
                    </div>
                )}
            </button>
        );
    }

    // Secondary / Tools Style (List Item)
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-200 border
                ${isActive
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <div className={`
                p-2 rounded-lg
                ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}
            `}>
                {Icon && <Icon size={20} />}
            </div>

            <div className="flex-1 text-left">
                <p className="font-bold text-sm">{feature.label}</p>
                {feature.description && <p className="text-[10px] text-slate-500 truncate">{feature.description}</p>}
            </div>

            {badge && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}

            <LucideIcons.ChevronRight size={16} className="text-slate-300" />
        </button>
    );
};
