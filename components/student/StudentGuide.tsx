import React, { useState } from "react";
import { SystemSettings } from "../../types";
import { getStudentGuideData } from "../../utils/studentDocumentation";
import {
  BookOpen,
  HelpCircle,
  Zap,
  Gamepad2,
  GraduationCap,
  X,
  ChevronRight,
  ChevronDown,
  Coins,
  Layout,
} from "lucide-react";

interface Props {
  settings?: SystemSettings;
  onClose: () => void;
}

export const StudentGuide: React.FC<Props> = ({ settings, onClose }) => {
  const data = getStudentGuideData(settings);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "FEATURES" | "FAQ">(
    "OVERVIEW",
  );
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 p-6 text-white shrink-0 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BookOpen size={100} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <GraduationCap className="text-indigo-400" /> App Guide
            </h2>
            <p className="text-slate-300 text-xs font-medium mt-1">
              Master the app features & costs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex bg-white border-b border-slate-200 shrink-0 overflow-x-auto shadow-sm z-10 px-2 pt-2">
          {[
            { id: "OVERVIEW", label: "Start Here", icon: Layout },
            { id: "FEATURES", label: "Features & Costs", icon: Coins },
            { id: "FAQ", label: "Help / FAQ", icon: HelpCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? "text-indigo-600 border-indigo-600 bg-indigo-50/50 rounded-t-lg"
                  : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <tab.icon
                size={16}
                className={activeTab === tab.id ? "text-indigo-600" : ""}
              />{" "}
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* OVERVIEW TAB */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  {data.overview.title}
                </h3>
                <p className="text-sm font-bold text-indigo-600 mb-4">
                  {data.overview.subtitle}
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {data.overview.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                    <Zap size={20} className="text-indigo-600" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    Study Smart
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Use AI Planner & Notes
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                    <Gamepad2 size={20} className="text-blue-600" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    Play & Win
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Compete on Leaderboard
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FEATURES & COSTS TAB */}
          {activeTab === "FEATURES" && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 flex gap-3 items-center mb-4">
                <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
                  <Coins size={18} />
                </div>
                <p className="text-xs text-yellow-800 font-bold">
                  Costs shown below are live based on current Admin settings.
                </p>
              </div>

              {data.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md transition-all hover:shadow-lg"
                >
                  <div className="bg-slate-50 p-3 border-b border-slate-100 font-bold text-slate-700 uppercase text-xs tracking-wider">
                    {feat.title}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {feat.items.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {item.details}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-black px-2 py-1 rounded shadow-sm ${
                            item.cost.toLowerCase().includes("free")
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                          }`}
                        >
                          {item.cost}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FAQ TAB */}
          {activeTab === "FAQ" && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              {data.faq.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md"
                >
                  <button
                    onClick={() =>
                      setExpandedFeature(
                        expandedFeature === item.q ? null : item.q,
                      )
                    }
                    className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-bold text-slate-800 text-sm">
                      {item.q}
                    </span>
                    {expandedFeature === item.q ? (
                      <ChevronDown
                        size={16}
                        className="text-[var(--primary)]"
                      />
                    ) : (
                      <ChevronRight size={16} className="text-slate-500" />
                    )}
                  </button>
                  {expandedFeature === item.q && (
                    <div className="p-4 pt-0 text-sm text-slate-600 leading-relaxed bg-slate-50/50 border-t border-slate-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-center shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
