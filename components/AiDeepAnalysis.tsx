import React, { useState, useEffect } from 'react';
import { User, SystemSettings, MCQResult, TopicItem } from '../types';
import { BrainCircuit, Play, Pause, ChevronDown, ChevronUp, Star, Lock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { saveUserToLive, saveAiInteraction } from '../firebase';
import { speakText, stopSpeech, getCategorizedVoices } from '../utils/textToSpeech';
import { TodayRevisionView } from './TodayRevisionView';

interface Props {
    user: User;
    settings?: SystemSettings;
    onUpdateUser: (user: User) => void;
    onBack: () => void;
}

interface TopicAnalysis {
    topic: string;
    chapterId: string;
    subjectName: string;
    mistakeCount: number;
    totalAttempts: number;
    mastery: number; // 0-5
    status: 'WEAK' | 'AVERAGE' | 'STRONG';
    advice: string;
    mistakes: { question: string, correct: string }[];
}

export const AiDeepAnalysis: React.FC<Props> = ({ user, settings, onUpdateUser, onBack }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [topics, setTopics] = useState<TopicAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingNotesTopic, setViewingNotesTopic] = useState<TopicAnalysis | null>(null);

    const COST = settings?.aiDeepAnalysisCost ?? 10;

    useEffect(() => {
        // Check if already unlocked in this session
        const sessionKey = `nst_deep_analysis_unlocked_${user.id}`;
        if (sessionStorage.getItem(sessionKey)) {
            setIsUnlocked(true);
            analyzeHistory();
        } else {
            setLoading(false);
        }
    }, [user.id]);

    const analyzeHistory = () => {
        setLoading(true);
        // DERIVE DATA FROM MCQ HISTORY
        const history = user.mcqHistory || [];
        const topicMap: Record<string, TopicAnalysis> = {};

        history.forEach(test => {
            const topicName = test.chapterTitle || 'General';
            
            if (!topicMap[topicName]) {
                topicMap[topicName] = {
                    topic: topicName,
                    chapterId: test.chapterId,
                    subjectName: test.subjectName || 'General',
                    mistakeCount: 0,
                    totalAttempts: 0,
                    mastery: 0,
                    status: 'AVERAGE',
                    advice: '',
                    mistakes: []
                };
            }

            topicMap[topicName].totalAttempts += test.totalQuestions;
            topicMap[topicName].mistakeCount += test.wrongCount;

            if (test.wrongQuestions) {
                test.wrongQuestions.forEach(wq => {
                    topicMap[topicName].mistakes.push({
                        question: wq.question,
                        correct: 'Check notes for answer' // Ideally we have correct answer
                    });
                });
            }
        });

        const derivedTopics: TopicAnalysis[] = Object.values(topicMap).map(t => {
            const accuracy = 1 - (t.mistakeCount / (t.totalAttempts || 1));
            let status: TopicAnalysis['status'] = 'AVERAGE';
            let stars = 3;

            if (accuracy >= 0.8) { status = 'STRONG'; stars = 5; }
            else if (accuracy < 0.5) { status = 'WEAK'; stars = 1; }
            else { status = 'AVERAGE'; stars = 3; }

            // AI Advice Generation (Mock logic based on status)
            let advice = "";
            if (status === 'WEAK') advice = `You are struggling with ${t.topic}. Focus on core concepts. Review the notes immediately.`;
            else if (status === 'AVERAGE') advice = `Good effort in ${t.topic}, but accuracy can improve. Try solving more practice questions.`;
            else advice = `Excellent command over ${t.topic}! Keep revising to maintain this streak.`;

            return { ...t, status, mastery: stars, advice };
        });

        // Add Mock Data if empty (For Demo)
        if (derivedTopics.length === 0) {
            derivedTopics.push(
                { topic: 'Photosynthesis', chapterId: 'demo-1', subjectName: 'Science', mistakeCount: 5, totalAttempts: 10, mastery: 1, status: 'WEAK', advice: 'You made 5 fundamental errors in Light Reaction. Revise Chloroplast structure.', mistakes: [{ question: 'Site of Dark Reaction?', correct: 'Stroma' }] },
                { topic: 'Algebra', chapterId: 'demo-2', subjectName: 'Math', mistakeCount: 2, totalAttempts: 15, mastery: 3, status: 'AVERAGE', advice: 'Calculation errors detected. Slow down while solving quadratic equations.', mistakes: [{ question: 'Roots of x^2-4=0?', correct: '+2, -2' }] },
                { topic: 'Optics', chapterId: 'demo-3', subjectName: 'Science', mistakeCount: 0, totalAttempts: 20, mastery: 5, status: 'STRONG', advice: 'Perfect score! You have mastered Ray Diagrams.', mistakes: [] }
            );
        }

        setTopics(derivedTopics);
        setLoading(false);
    };

    const handleUnlock = () => {
        if (user.credits < COST) {
            alert(`Insufficient Coins! You need ${COST} coins.`);
            return;
        }

        if (!confirm(`Unlock AI Deep Analysis for ${COST} coins?`)) return;

        const updatedUser = { ...user, credits: user.credits - COST };
        onUpdateUser(updatedUser);
        
        // Save Local Unlock
        sessionStorage.setItem(`nst_deep_analysis_unlocked_${user.id}`, 'true');
        
        // Cloud Sync happens via onUpdateUser usually, but we ensure it:
        saveUserToLive(updatedUser);

        setIsUnlocked(true);
        analyzeHistory();
    };

    const handlePlayAdvice = (text: string) => {
        if (isPlaying) {
            stopSpeech();
            setIsPlaying(false);
        } else {
            speakText(text, undefined, 1.0);
            setIsPlaying(true);
        }
    };

    const downloadReport = () => {
        const htmlContent = `
            <html>
                <head>
                    <title>AI Deep Analysis Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .topic { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
                        .weak { border-left: 5px solid red; background: #fff5f5; }
                        .average { border-left: 5px solid orange; background: #fffaf0; }
                        .strong { border-left: 5px solid green; background: #f0fff4; }
                        h2 { color: #333; }
                        .stats { font-size: 0.9em; color: #666; }
                        .advice { font-style: italic; color: #444; margin-top: 10px; }
                        .mistakes { margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
                        .mistake-item { color: #d32f2f; font-size: 0.9em; }
                    </style>
                </head>
                <body>
                    <h1>AI Deep Analysis Report - ${user.name}</h1>
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    <hr/>
                    ${topics.map(t => `
                        <div class="topic ${t.status.toLowerCase()}">
                            <h2>${t.topic} <span style="font-size:0.6em; color: #888;">(${t.chapterId || 'N/A'})</span></h2>
                            <div class="stats">
                                <strong>Status:</strong> ${t.status} |
                                <strong>Mistakes:</strong> ${t.mistakeCount} |
                                <strong>Attempts:</strong> ${t.totalAttempts}
                            </div>
                            <div class="advice">
                                <strong>AI Advice:</strong> "${t.advice}"
                            </div>
                            ${t.mistakes.length > 0 ? `
                                <div class="mistakes">
                                    <strong>Key Mistakes:</strong>
                                    <ul>
                                        ${t.mistakes.map(m => `<li class="mistake-item">${m.question}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = user.name ? user.name.replace(/\s+/g, '_') : 'Student';
        a.download = `Analysis_Report_${safeName}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isUnlocked) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-violet-100 p-6 rounded-full mb-6 animate-pulse">
                    <BrainCircuit size={64} className="text-violet-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">AI Deep Analysis Hub</h2>
                <p className="text-slate-600 mb-8 w-full">
                    Unlock smart insights, mistake patterns, and personalized audio guidance to boost your score.
                </p>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 w-full max-w-xs">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Entry Cost</span>
                        <span className="text-lg font-black text-violet-600">{COST} Coins</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">Your Balance</span>
                        <span className={`text-lg font-black ${user.credits >= COST ? 'text-green-600' : 'text-red-600'}`}>{user.credits} Coins</span>
                    </div>
                </div>
                <button 
                    onClick={handleUnlock}
                    className="bg-violet-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform flex items-center gap-3"
                >
                    <Lock size={20} /> Unlock Now
                </button>
                <button onClick={onBack} className="mt-6 text-slate-500 font-bold text-sm hover:text-slate-600">Go Back</button>
            </div>
        );
    }

    return (
        <div className="pb-24 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><ChevronUp className="rotate-[-90deg]" size={20} /></button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <BrainCircuit className="text-violet-600" /> Deep Analysis
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Performance Analysis</p>
                    </div>
                </div>
                <button
                    onClick={downloadReport}
                    className="bg-violet-100 text-violet-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-violet-200 flex items-center gap-2"
                >
                    Download
                </button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10"><p className="animate-pulse font-bold text-slate-500">Analyzing your brain patterns...</p></div>
                ) : (
                    topics.map((t, idx) => (
                        <div 
                            key={idx} 
                            className={`rounded-2xl border-2 transition-all overflow-hidden ${
                                t.status === 'WEAK' ? 'border-red-100 bg-red-50/50' : 
                                t.status === 'STRONG' ? 'border-green-100 bg-green-50/50' : 
                                'border-blue-100 bg-blue-50/50'
                            }`}
                        >
                            <div 
                                onClick={() => setExpandedTopic(expandedTopic === t.topic ? null : t.topic)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/50"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-black text-slate-800 text-lg">{t.topic}</h3>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded text-white ${
                                            t.status === 'WEAK' ? 'bg-red-500' : 
                                            t.status === 'STRONG' ? 'bg-green-500' : 
                                            'bg-blue-500'
                                        }`}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600">
                                        {t.mistakeCount > 0 ? `❌ ${t.mistakeCount} Mistakes` : '✅ Perfect Score'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill={i < t.mastery ? "currentColor" : "none"} className={i < t.mastery ? "" : "text-slate-300"} />
                                        ))}
                                    </div>
                                    {expandedTopic === t.topic ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                                </div>
                            </div>

                            {expandedTopic === t.topic && (
                                <div className="p-4 pt-0 border-t border-slate-100/50 bg-white/50">
                                    {/* AI Audio Guidance */}
                                    <div className="mt-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                                        <button 
                                            onClick={() => handlePlayAdvice(t.advice)}
                                            className="p-3 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform flex-shrink-0"
                                        >
                                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                        </button>
                                        <div>
                                            <p className="text-[10px] font-bold text-violet-600 uppercase mb-1">AI Audio Insight</p>
                                            <p className="text-sm text-slate-700 font-medium italic">"{t.advice}"</p>
                                        </div>
                                    </div>

                                    {/* Mistakes List */}
                                    {t.mistakes.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase">Key Mistakes</p>
                                            {t.mistakes.map((m, i) => (
                                                <div key={i} className="flex gap-3 items-start bg-red-50 p-3 rounded-lg border border-red-100">
                                                    <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{m.question}</p>
                                                        {/* <p className="text-[10px] text-green-600 mt-1">Ans: {m.correct}</p> */}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingNotesTopic(t);
                                            }}
                                            className="text-xs font-bold text-blue-600 hover:underline"
                                        >
                                            View Detailed Notes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* NOTES VIEWER OVERLAY */}
            {viewingNotesTopic && (
                <TodayRevisionView
                    user={user}
                    topics={[{
                        id: viewingNotesTopic.chapterId + '_analysis',
                        chapterId: viewingNotesTopic.chapterId,
                        chapterName: viewingNotesTopic.topic,
                        name: viewingNotesTopic.topic,
                        score: 0,
                        lastAttempt: new Date().toISOString(),
                        status: viewingNotesTopic.status === 'STRONG' ? 'EXCELLENT' : viewingNotesTopic.status,
                        nextRevision: null,
                        mcqDueDate: null,
                        subjectName: viewingNotesTopic.subjectName,
                        isSubTopic: false
                    }]}
                    onClose={() => setViewingNotesTopic(null)}
                    onComplete={() => setViewingNotesTopic(null)}
                />
            )}
        </div>
    );
};
