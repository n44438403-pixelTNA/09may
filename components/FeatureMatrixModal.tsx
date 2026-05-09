
import React from 'react';
import { X, Check, Lock, AlertTriangle, Crown, List, Shield, Zap, Sparkles, BookOpen, Star, Layout, MessageSquare, Gamepad2, Trophy, Video, FileText, Headphones } from 'lucide-react';
import { SystemSettings } from '../types';
import { NSTA_DEFAULT_FEATURES } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings?: SystemSettings;
  discountActive?: boolean;
}

export const FeatureMatrixModal: React.FC<Props> = ({ isOpen, onClose, settings, discountActive }) => {
  if (!isOpen) return null;

  // Merge dynamic config with defaults to ensure all rows exist
  const featureConfig = settings?.featureConfig || {};
  const mergedFeatures = NSTA_DEFAULT_FEATURES.map(def => {
      const stored = featureConfig[def.id];
      return stored ? { ...def, ...stored } : def;
  });

  // Group by Category
  const groupedFeatures: Record<string, any[]> = {};
  mergedFeatures.forEach(f => {
      if (!groupedFeatures[f.category]) groupedFeatures[f.category] = [];
      groupedFeatures[f.category].push(f);
  });

  const getLimitDisplay = (feature: any, tier: 'free' | 'basic' | 'ultra') => {
      // 1. Check if Tier is Allowed
      const allowedTiers = (feature.allowedTiers || ['FREE', 'BASIC', 'ULTRA']).map((t: string) => t.toLowerCase());
      if (!allowedTiers.includes(tier)) {
          return <span className="text-red-500 font-bold flex items-center justify-center gap-1"><Lock size={12}/> Locked</span>;
      }

      // 2. Check for Specific Limit
      const limit = feature.limits?.[tier];
      if (limit !== undefined) {
          return <span className="text-slate-700 font-bold">{limit} / Day</span>;
      }

      // 3. Unlimited (if allowed but no limit)
      return <span className="text-green-600 font-black flex items-center justify-center gap-1"><Check size={14}/> Unlimited</span>;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* HEADER */}
        <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0 border-b border-slate-800">
            <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <Crown className="text-yellow-400 fill-yellow-400" /> Plan Matrix
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Feature Comparison & Availability</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* STICKY COLUMN HEADERS */}
        <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 shrink-0 text-center sticky top-0 z-20 shadow-md">
            <div className="p-4 flex items-center justify-start pl-6 font-black text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                Feature
            </div>
            <div className="p-4 bg-green-50/90 border-l border-white backdrop-blur-sm">
                <h3 className="font-black text-green-700 text-sm">FREE</h3>
                <p className="text-[10px] text-green-600 font-bold">Starter</p>
            </div>
            <div className="p-4 bg-blue-50/90 border-l border-white backdrop-blur-sm relative overflow-hidden">
                <h3 className="font-black text-blue-700 text-sm">BASIC</h3>
                <p className="text-[10px] text-blue-600 font-bold">Standard</p>
            </div>
            <div className="p-4 bg-purple-50/90 border-l border-white backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-yellow-400 to-transparent"></div>
                <h3 className="font-black text-purple-700 text-sm flex items-center justify-center gap-1">ULTRA <Crown size={12} className="fill-purple-700"/></h3>
                <p className="text-[10px] text-purple-600 font-bold">Best Value</p>
            </div>
        </div>

        {/* CONTENT (SCROLLABLE) */}
        <div className="overflow-y-auto custom-scrollbar bg-white flex-1">
            {Object.keys(groupedFeatures).map((category, catIndex) => (
                <div key={catIndex}>
                    {/* CATEGORY HEADER */}
                    <div className="bg-slate-50 p-3 px-6 border-y border-slate-100 flex items-center gap-2 sticky top-0 z-10 shadow-sm">
                        <span className="font-black text-slate-800 text-xs uppercase tracking-widest">{category}</span>
                    </div>

                    {/* FEATURE ROWS */}
                    {groupedFeatures[category].map((feature: any, featIndex: number) => {
                        const isLocked = feature.visible === false;

                        return (
                            <div key={featIndex} className={`grid grid-cols-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors relative group ${isLocked ? 'grayscale opacity-70 bg-slate-50' : ''}`}>

                                {/* LOCKED OVERLAY */}
                                {isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 backdrop-blur-[1px]">
                                        <div className="bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                                            <Lock size={12} /> FEATURE CURRENTLY LOCKED
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 pl-6 flex items-center gap-3 text-sm font-bold text-slate-700 border-r border-slate-50">
                                    {feature.label}
                                </div>
                                <div className="p-4 flex items-center justify-center text-xs font-medium text-slate-600 border-r border-slate-50 text-center">
                                    {/* HIDDEN IN MATRIX - REMOVE THIS */}
                                    {/* {getLimitDisplay(feature, 'free')} */}
                                    <span className="text-[10px] text-slate-500 font-bold">Standard</span>
                                </div>
                                <div className="p-4 flex items-center justify-center text-xs font-bold bg-blue-50/10 border-r border-slate-50 text-center">
                                    {getLimitDisplay(feature, 'basic')}
                                </div>
                                <div className="p-4 flex items-center justify-center text-xs font-black bg-purple-50/10 text-center">
                                    {getLimitDisplay(feature, 'ultra')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center flex justify-between items-center shrink-0">
            <p className="text-[10px] text-slate-500 font-medium">
                * Prices and features subject to change. Admin controls all access rights via NSTA Control Panel.
            </p>
            <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
                Close Matrix
            </button>
        </div>
      </div>
    </div>
  );
};
