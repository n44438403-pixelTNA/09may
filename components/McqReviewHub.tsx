
import React, { useState, useEffect } from 'react';
import { User, StudentTab, SystemSettings } from '../types';
import { CheckSquare, Calendar, TrendingUp, AlertTriangle, Clock, CheckCircle, BrainCircuit, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { getChapterData } from '../firebase';
import { CustomAlert } from './CustomDialogs';

interface Props {
    user: User;
    onTabChange: (tab: StudentTab) => void;
    settings?: SystemSettings;
    onNavigateContent?: (type: 'MCQ', chapterId: string, topicName?: string, subjectName?: string) => void;
}

type TopicStatus = 'WEAK' | 'AVERAGE' | 'STRONG' | 'MASTERED';

interface McqTaskItem {
    id: string;
    name: string;
    score: number;
    lastAttempt: string;
    status: TopicStatus;
    nextTestDate: string; // ISO Date
    subjectName?: string;
    streak: number; // Consecutive high scores (>80%)
}

export const McqReviewHub: React.FC<Props> = ({ user, onTabChange, settings, onNavigateContent }) => {
    const [tasks, setTasks] = useState<McqTaskItem[]>([]);
    const [activeFilter, setActiveFilter] = useState<'TODAY' | 'WEAK' | 'AVERAGE' | 'STRONG'>('TODAY');

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, type: 'SUCCESS'|'ERROR'|'INFO', title?: string, message: string}>({isOpen: false, type: 'INFO', message: ''});
    const showAlert = (msg: string, type: 'SUCCESS'|'ERROR'|'INFO' = 'INFO', title?: string) => {
        setAlertConfig({ isOpen: true, type, title, message: msg });
    };

    useEffect(() => {
        // LOGIC: Separate Spaced Repetition for MCQ
        // < 50% -> 2 Days
        // 50-80% -> 3 Days
        // > 80% -> 7 Days
        // 2x > 80% -> 30 Days

        const history = user.mcqHistory || [];
        const taskMap = new Map<string, McqTaskItem>();

        // We need to process history chronologically to build streaks
        // Sort history by date ascending
        const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const tempTracker = new Map<string, { streak: number, lastScore: number, lastDate: string }>();

        sortedHistory.forEach(result => {
            const topicName = result.chapterTitle || 'Unknown Topic';
            const percentage = (result.score / result.totalQuestions) * 100;
            const attemptDate = new Date(result.date);

            let currentStreak = 0;
            if (tempTracker.has(topicName)) {
                currentStreak = tempTracker.get(topicName)!.streak;
            }

            if (percentage >= 80) {
                currentStreak += 1;
            } else {
                currentStreak = 0; // Reset streak on low score
            }

            tempTracker.set(topicName, {
                streak: currentStreak,
                lastScore: percentage,
                lastDate: result.date
            });

            // Calculate Next Due Date based on result
            let daysToAdd = 2; // Default Weak (< 50%)
            let status: TopicStatus = 'WEAK';

            if (percentage < 50) {
                daysToAdd = 2;
                status = 'WEAK';
            } else if (percentage < 80) {
                daysToAdd = 3;
                status = 'AVERAGE';
            } else {
                // > 80%
                if (currentStreak >= 2) {
                    daysToAdd = 30;
                    status = 'MASTERED';
                } else {
                    daysToAdd = 7;
                    status = 'STRONG';
                }
            }

            const nextDue = new Date(attemptDate);
            nextDue.setDate(nextDue.getDate() + daysToAdd);

            // Always keep the LATEST calculation for a topic
            taskMap.set(topicName, {
                id: result.chapterId,
                name: topicName,
                score: percentage,
                lastAttempt: result.date,
                status,
                nextTestDate: nextDue.toISOString(),
                subjectName: result.subjectName,
                streak: currentStreak
            });
        });

        setTasks(Array.from(taskMap.values()).sort((a, b) => new Date(a.nextTestDate).getTime() - new Date(b.nextTestDate).getTime()));
    }, [user.mcqHistory]);

    const getStatusColor = (status: TopicStatus) => {
        if (status === 'WEAK') return 'text-red-600 bg-red-50 border-red-200';
        if (status === 'STRONG') return 'text-green-600 bg-green-50 border-green-200';
        if (status === 'MASTERED') return 'text-purple-600 bg-purple-50 border-purple-200';
        return 'text-orange-600 bg-orange-50 border-orange-200';
    };

    const getStatusIcon = (status: TopicStatus) => {
        if (status === 'WEAK') return <AlertTriangle size={14} />;
        if (status === 'STRONG') return <CheckCircle size={14} />;
        if (status === 'MASTERED') return <BrainCircuit size={14} />;
        return <TrendingUp size={14} />;
    };

    return (
        <div className="space-y-6 pb-24 p-4 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <CheckSquare className="text-purple-600" /> MCQ Review
                </h2>
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                    Spaced Repetition
                </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6">
                <p className="text-xs text-purple-800 leading-relaxed">
                    <strong>Logic:</strong>
                    <br/>• Score &lt; 50% → Retest in 2 Days
                    <br/>• Score 50-80% → Retest in 3 Days
                    <br/>• Score &gt; 80% → Retest in 7 Days
                    <br/>• 2x &gt; 80% → Mastered (30 Days)
                </p>
            </div>

            {/* FILTER BUTTONS */}
            <div className="grid grid-cols-4 gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                {[
                    { id: 'TODAY', label: 'Due Today', icon: Calendar },
                    { id: 'WEAK', label: 'Weak', icon: AlertTriangle },
                    { id: 'AVERAGE', label: 'Average', icon: TrendingUp },
                    { id: 'STRONG', label: 'Strong', icon: CheckCircle }
                ].map(tab => {
                    const isActive = activeFilter === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFilter(tab.id as any)}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
                                isActive ? 'bg-white shadow-sm text-purple-600 scale-105' : 'text-slate-600 hover:bg-white/50'
                            }`}
                        >
                            <Icon size={16} className={isActive ? 'mb-1 text-purple-600' : 'mb-1 text-slate-500'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* TASK LIST */}
            <div>
                <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                    {activeFilter === 'TODAY' ? '📝 Tests Due Today' :
                     activeFilter === 'WEAK' ? '⚠️ Needs Practice' :
                     activeFilter === 'AVERAGE' ? '📈 Improving' : '💪 Mastered'}
                </h3>

                {(() => {
                    let displayedTasks = tasks;
                    if (activeFilter === 'TODAY') {
                        const now = new Date();
                        displayedTasks = tasks.filter(t => new Date(t.nextTestDate) <= now);
                    } else if (activeFilter === 'STRONG') {
                        displayedTasks = tasks.filter(t => t.status === 'STRONG' || t.status === 'MASTERED');
                    } else {
                        displayedTasks = tasks.filter(t => t.status === activeFilter);
                    }

                    if (displayedTasks.length === 0) {
                        return (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <CheckSquare className="mx-auto text-slate-300 mb-2" size={40} />
                                <p className="text-slate-500 font-bold text-sm">No tests scheduled.</p>
                                <p className="text-xs text-slate-500 mt-1">Great job keeping up!</p>

                                {activeFilter === 'TODAY' && (
                                    <button
                                        onClick={() => onTabChange('COURSES')}
                                        className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform"
                                    >
                                        Practice New Topics
                                    </button>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-3">
                            {displayedTasks.map((task, idx) => {
                                const due = new Date(task.nextTestDate);
                                const now = new Date();
                                const diffTime = due.getTime() - now.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                let dueLabel = '';
                                let dueColor = 'text-slate-500';
                                const isDue = diffDays <= 0;

                                if (isDue) {
                                    dueLabel = 'Due Today';
                                    dueColor = 'text-red-600 font-black animate-pulse';
                                } else if (diffDays === 1) {
                                    dueLabel = 'Tomorrow';
                                    dueColor = 'text-orange-500 font-bold';
                                } else {
                                    dueLabel = `${diffDays} Days Left`;
                                    dueColor = 'text-blue-500 font-bold';
                                }

                                return (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                        {/* Status Stripe */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.status === 'WEAK' ? 'bg-red-500' : task.status === 'MASTERED' ? 'bg-purple-500' : task.status === 'STRONG' ? 'bg-green-500' : 'bg-orange-500'}`}></div>

                                        <div className="flex justify-between items-start mb-4 pl-3">
                                            <div className="overflow-hidden flex-1 pr-2">
                                                <h4 className="font-bold text-slate-800 text-sm truncate">{task.name}</h4>

                                                {/* OMR Style Topic Breakdown Bar */}
                                                <div className="mt-2 w-full max-w-[150px] h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                                    <div style={{ width: `${task.score}%` }} className={`h-full ${task.score >= 80 ? 'bg-green-500' : task.score < 50 ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border ${getStatusColor(task.status)}`}>
                                                        {getStatusIcon(task.status)} {task.status}
                                                    </span>
                                                    <span className={`text-[10px] flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 ${dueColor}`}>
                                                        <Clock size={10} className="inline" /> {dueLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-2 min-w-[50px]">
                                                <div className={`text-lg font-black ${task.score >= 80 ? 'text-green-600' : task.score < 50 ? 'text-red-600' : 'text-orange-600'}`}>
                                                    {Math.round(task.score)}%
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Last</div>
                                            </div>
                                        </div>

                                        {isDue ? (
                                            <button
                                                onClick={() => onNavigateContent ? onNavigateContent('MCQ', task.id, undefined, task.subjectName) : null}
                                                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <CheckSquare size={16} /> Start Review Test
                                            </button>
                                        ) : (
                                            <div className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200">
                                                <Clock size={16} /> Unlock in {diffDays} Days
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            {/* GLOBAL ALERT MODAL */}
            <CustomAlert
                isOpen={alertConfig.isOpen}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig(prev => ({...prev, isOpen: false}))}
            />
        </div>
    );
};
