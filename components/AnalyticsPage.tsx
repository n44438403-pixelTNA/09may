
import React, { useState, useEffect } from 'react';
import type { User, MCQResult, PerformanceTag, SystemSettings } from '../types';
import { Clock, Calendar, BookOpen, TrendingUp, AlertTriangle, CheckCircle, XCircle, FileText, BrainCircuit, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MarksheetCard } from './MarksheetCard';
import { storage } from '../utils/storage';

interface Props {
  user: User;
  onBack: () => void;
  settings?: SystemSettings;
  onNavigateToChapter?: (chapterId: string, chapterTitle: string, subjectName: string, classLevel?: string) => void;
}

export const AnalyticsPage: React.FC<Props> = ({ user, onBack, settings, onNavigateToChapter }) => {
  const [selectedResult, setSelectedResult] = useState<MCQResult | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [initialView, setInitialView] = useState<'ANALYSIS' | 'RECOMMEND' | undefined>(undefined);
  const [showMoreTests, setShowMoreTests] = useState(false);
  const [historyRaw, setHistoryRaw] = useState<MCQResult[]>([]);

  const handleClearHistory = async () => {
      if (window.confirm("Are you sure you want to permanently delete all your test history? This action cannot be undone.")) {
          try {
              // Clear from IndexedDB
              const allNotes = await storage.getItem<any[]>('nst_user_history') || [];
              const remainingNotes = allNotes.filter(n => n.userId && n.userId !== user.id);
              await storage.setItem('nst_user_history', remainingNotes);

              // Clear state
              setHistoryRaw([]);

              // Clear from localStorage (if any)
              const lsHistoryStr = localStorage.getItem('nst_user_history');
              if (lsHistoryStr) {
                  try {
                      const lsHistory = JSON.parse(lsHistoryStr);
                      const newLsHistory = lsHistory.filter((h:any) => h.userId && h.userId !== user.id);
                      localStorage.setItem('nst_user_history', JSON.stringify(newLsHistory));
                  } catch (e) {}
              }

              alert("Test history cleared successfully.");
          } catch (e) {
              console.error("Failed to clear history:", e);
              alert("Failed to clear history.");
          }
      }
  };

  useEffect(() => {
      const loadHistory = async () => {
          const mergedMap = new Map<string, MCQResult>();

          // 1. Load from user.mcqHistory
          (user.mcqHistory || []).forEach(h => {
              if (h.id) mergedMap.set(h.id, h);
          });

          // 2. Load from Saved Notes (nst_user_history) via IndexedDB
          try {
              const savedNotes = await storage.getItem<any[]>('nst_user_history') || [];
              savedNotes.forEach((note: any) => {
                  if (note.analytics && note.analytics.id) {
                      mergedMap.set(note.analytics.id, note.analytics);
                  }
              });
          } catch(e) {}

          setHistoryRaw(Array.from(mergedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
      loadHistory();
  }, [user.mcqHistory, user.id]);
  
  // Annual Report Requirement: Show year data
  const history = historyRaw.filter(h => {
      // Validate that this is a valid history object first
      if (!h || typeof h !== 'object' || !h.id || typeof h.totalQuestions !== 'number') return false;
      const d = new Date(h.date);
      if (isNaN(d.getTime())) return false; // Invalid date

      const limit = new Date();
      limit.setDate(limit.getDate() - 365);
      return d >= limit;
  });

  const getQuestionsForAttempt = async (attemptId: string) => {
      try {

          const history = await storage.getItem<any[]>('nst_user_history') || [];
          // Match by analytics ID (which is result ID)
          const match = history.find((h: any) => h.analytics && h.analytics.id === attemptId && (!h.userId || h.userId === user.id));
          if (match && match.mcqData) {
              return match.mcqData;
          }

          const historyStr = localStorage.getItem('nst_user_history');
          if (historyStr) {
              const localHistory = JSON.parse(historyStr);
              // Match by analytics ID (which is result ID)
              const localMatch = localHistory.find((h: any) => h.analytics && h.analytics.id === attemptId);
              if (localMatch && localMatch.mcqData) {
                  return localMatch.mcqData;
              }

          }
      } catch (e) {}
      return [];
  };

  const handleOpenMarksheet = async (result: MCQResult, view?: 'ANALYSIS' | 'RECOMMEND') => {
      const questions = await getQuestionsForAttempt(result.id);
      setSelectedQuestions(questions);
      setInitialView(view);
      setSelectedResult(result);
  };
  
  // Calculate Totals
  const totalTests = history.length;
  const totalQuestions = history.reduce((acc, curr) => acc + (curr.totalQuestions || 0), 0);
  const totalCorrect = history.reduce((acc, curr) => acc + (curr.correctCount || 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  
  const totalTime = history.reduce((acc, curr) => acc + (curr.totalTimeSeconds || 0), 0);
  const avgTimePerQ = totalQuestions > 0 ? (totalTime / totalQuestions).toFixed(1) : '0';

  // Topic Analysis (Premium)
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Group History by Topic -> SubTopic
  const topicTree: Record<string, Record<string, MCQResult[]>> = {};
  history.forEach(h => {
      const topic = h.subjectName || 'General';
      // Subtopic is chapterTitle in this context
      const subtopic = h.chapterTitle || 'Miscellaneous';

      if (!topicTree[topic]) topicTree[topic] = {};
      if (!topicTree[topic][subtopic]) topicTree[topic][subtopic] = [];

      topicTree[topic][subtopic].push(h);
  });

  // --- REVISION LOGIC CONFIG (DYNAMIC THRESHOLDS) ---
  const revisionConfig = settings?.revisionConfig;
  const thresholds = revisionConfig?.thresholds || { strong: 80, average: 50 }; // Default as per previous logic

  // Trend Analysis (Last 10 tests)
    const trendData = history
        .slice(0, 10)
        .reverse() // Oldest to newest
        .map(h => ({
            date: new Date(h.date).toLocaleDateString(undefined, {day: 'numeric', month: 'short'}),
            score: (h.totalQuestions || 0) > 0 ? Math.round(((h.correctCount || 0) / h.totalQuestions) * 100) : 0,
            fullDate: new Date(h.date).toLocaleDateString(),
            topic: h.chapterTitle || 'General Test'
        }));

  // Categorized Analysis
  const categorizedHistory = {
      strong: history.filter(h => (h.totalQuestions || 0) > 0 && (((h.correctCount || 0) / h.totalQuestions) * 100) >= thresholds.strong),
      average: history.filter(h => (h.totalQuestions || 0) > 0 && (((h.correctCount || 0) / h.totalQuestions) * 100) >= thresholds.average && (((h.correctCount || 0) / h.totalQuestions) * 100) < thresholds.strong),
      weak: history.filter(h => (h.totalQuestions || 0) > 0 && (((h.correctCount || 0) / h.totalQuestions) * 100) < thresholds.average)
  };

  const getTagColor = (tag: PerformanceTag | undefined) => {
      if (!tag) return 'bg-slate-100 text-slate-700 border-slate-200';
      switch(tag) {
          case 'EXCELLENT': return 'bg-green-100 text-green-700 border-green-200';
          case 'GOOD': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'BAD': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'VERY_BAD': return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-slate-100 text-slate-600';
      }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-8 animate-in fade-in slide-in-from-right">
        {selectedResult && (
            <MarksheetCard 
                result={selectedResult} 
                user={user} 
                settings={settings}
                onClose={() => setSelectedResult(null)} 
                questions={selectedQuestions}
                initialView={initialView}
            />
        )}
        
        {/* HEADER */}
        <div className="bg-white p-4 shadow-sm border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><TrendingUp size={20} className="text-slate-600" /></button>
            <div>
                <h2 className="text-xl font-black text-slate-800">Annual Report</h2>
                <p className="text-xs text-slate-600 font-bold uppercase">Performance Analytics (This Year)</p>
            </div>
        </div>

        <div className="p-4 space-y-6">
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><CheckCircle size={18} /></div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Accuracy</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{accuracy}%</p>
                    <p className="text-[10px] text-slate-500">{totalCorrect}/{totalQuestions} Correct</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Clock size={18} /></div>
                        <span className="text-xs font-bold text-slate-500 uppercase">Speed</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{avgTimePerQ}s</p>
                    <p className="text-[10px] text-slate-500">Avg per Question</p>
                </div>
            </div>

            {/* PERFORMANCE TREND CHART */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500" /> Performance Trend
                </h3>
                {trendData.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Take tests to see your progress.</p>
                ) : (
                    <div className="w-full h-48 mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                    domain={[0, 100]}
                                    ticks={[0, 50, 100]}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                                    itemStyle={{ color: '#0f172a', fontWeight: 'black', fontSize: '14px' }}
                                    labelStyle={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}
                                    formatter={(value: number) => [`${value}%`, 'Score']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
                <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>Last 10 Tests</span>
                    <span>Target: 100%</span>
                </div>
            </div>

            {/* RECENT TESTS */}
            <div>
                <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-slate-500" /> Recent Tests
                    </h3>
                    {history.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm"
                        >
                            <Trash2 size={14} /> Clear History
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {history.length === 0 && <p className="text-slate-500 text-sm text-center py-8 bg-white rounded-xl border border-dashed">No tests taken yet.</p>}
                    {(showMoreTests ? history : history.slice(0, 10)).map((item) => (
                        <div 
                            key={item.id} 
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.chapterTitle || 'Test'}</h4>
                                    <p className="text-xs text-slate-600">{item.subjectName || 'General'} • {new Date(item.date).toLocaleDateString()}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-black border ${getTagColor(item.performanceTag)}`}>
                                    {item.performanceTag && typeof item.performanceTag === 'string' ? item.performanceTag.replace('_', ' ') : 'N/A'}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                                <div className="text-center flex-1 border-r border-slate-200">
                                    <p className="text-slate-500 font-bold uppercase text-[9px]">Score</p>
                                    <p className="font-black text-slate-700">{item.score || 0}/{item.totalQuestions || 0}</p>
                                </div>
                                <div className="text-center flex-1 border-r border-slate-200">
                                    <p className="text-slate-500 font-bold uppercase text-[9px]">Avg Time</p>
                                    <p className="font-black text-slate-700">{item.averageTimePerQuestion ? item.averageTimePerQuestion.toFixed(1) : '0.0'}s</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-slate-500 font-bold uppercase text-[9px]">Total Time</p>
                                    <p className="font-black text-slate-700">{Math.floor((item.totalTimeSeconds || 0)/60)}m {(item.totalTimeSeconds || 0)%60}s</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenMarksheet(item, 'ANALYSIS');
                                    }}
                                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText size={14} /> Details
                                </button>
                            </div>
                        </div>
                    ))}


                    {!showMoreTests && history.length > 10 && (
                        <button
                            onClick={() => setShowMoreTests(true)}
                            className="w-full py-3 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors mt-4 border border-dashed border-slate-300"
                        >
                            More
                        </button>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
};
