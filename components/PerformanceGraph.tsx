import React, { useState } from 'react';
import { MCQResult, User } from '../types';
import { TrendingUp, Award, Target, Zap, ChevronRight, X } from 'lucide-react';

interface Props {
  history: MCQResult[];
  user: User;
  onViewNotes?: (topic: string) => void;
}

export const PerformanceGraph: React.FC<Props> = ({ history, user, onViewNotes }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate Metrics
  const totalTests = history.length;
  const avgScore = totalTests > 0
    ? Math.round(history.reduce((acc, h) => acc + (h.totalQuestions > 0 ? (h.score/h.totalQuestions)*100 : 0), 0) / totalTests)
    : 0;

  const recentTests = [...history].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const bestSubject = "General"; // Placeholder logic for now

  // Circular Progress Logic
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (avgScore / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-black text-slate-800 text-lg">Performance</h3>
          <p className="text-xs text-slate-600">Your Learning Stats</p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 bg-blue-50 p-2 rounded-xl hover:bg-blue-100 transition-colors"
        >
          {showDetails ? <X size={18}/> : <ChevronRight size={18}/>}
        </button>
      </div>

      <div className="flex items-center gap-6">
        {/* CIRCULAR PROGRESS */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={avgScore >= 80 ? '#22c55e' : avgScore >= 50 ? '#3b82f6' : '#ef4444'}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-800">{avgScore}%</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase">Avg</span>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-2 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-1 bg-purple-100 text-purple-600 rounded-lg"><Target size={12}/></div>
              <span className="text-[10px] font-bold text-slate-600 uppercase">Tests</span>
            </div>
            <p className="text-lg font-black text-slate-800">{totalTests}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-1 bg-orange-100 text-orange-600 rounded-lg"><Zap size={12}/></div>
              <span className="text-[10px] font-bold text-slate-600 uppercase">Best</span>
            </div>
            <p className="text-lg font-black text-slate-800">{Math.max(...history.map(h => h.totalQuestions > 0 ? Math.round((h.score/h.totalQuestions)*100) : 0), 0)}%</p>
          </div>
        </div>
      </div>

      {/* DETAILED VIEW (Dropdown) */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Recent Activity</h4>
          <div className="space-y-3">
            {recentTests.length === 0 && <p className="text-center text-xs text-slate-500">No tests taken yet.</p>}
            {recentTests.map((test, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-1.5 h-8 rounded-full ${test.score/test.totalQuestions >= 0.8 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate w-32">{test.chapterTitle}</p>
                    <p className="text-[10px] text-slate-500">{new Date(test.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-700">{Math.round((test.score/test.totalQuestions)*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
