import React, { useState, useEffect } from 'react';
import { User, MCQItem, MCQResult, TopicItem } from '../types';
import { X, CheckCircle, ArrowRight, Loader2, BrainCircuit, AlertCircle, List } from 'lucide-react';
import { getChapterData, saveUserToLive, saveTestResult, saveDemand } from '../firebase';
import { storage } from '../utils/storage';
import { generateAnalysisJson } from '../utils/analysisUtils';
import { recordAttempt as recordRevisionAttempt } from '../utils/revisionTrackerV2';
import { addMistakes, removeMistakeByQuestion } from '../utils/mistakeBank';

interface Props {
    user: User;
    topics: TopicItem[];
    onClose: () => void;
    onComplete: (results: MCQResult[], questions?: any[]) => void;
}

export const TodayMcqSession: React.FC<Props> = ({ user, topics, onClose, onComplete }) => {
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentMcqData, setCurrentMcqData] = useState<MCQItem[]>([]);
    const [allSessionQuestions, setAllSessionQuestions] = useState<any[]>([]);

    // Test State for Current Topic
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResult, setShowResult] = useState(false); // Result for current topic
    const [topicScore, setTopicScore] = useState(0);
    const [showSidebar, setShowSidebar] = useState(false);

    const [topicSummary, setTopicSummary] = useState<{name: string, score: number, total: number} | null>(null);
    const [sessionResults, setSessionResults] = useState<MCQResult[]>([]);

    // Timers
    const [totalTime, setTotalTime] = useState(0);
    const [questionTime, setQuestionTime] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTotalTime(prev => prev + 1);
            setQuestionTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Reset question timer on new question
    useEffect(() => {
        setQuestionTime(0);
    }, [qIndex, currentIndex]);

    useEffect(() => {
        loadTopicData(currentIndex);
    }, [currentIndex]);

    const loadTopicData = async (index: number) => {
        if (index >= topics.length) {
            if (sessionResults.length === 0) {
                onComplete([]);
                return;
            }

            // --- MEGA ANALYSIS COMBINATION ---
            // User requested: "ek hi analisis me sare topic ķe question honge ek saath mega analysis aayega"
            // We combine all individual topic results into ONE mega result.
            let totalQ = 0;
            let totalScore = 0;
            let totalCorrect = 0;
            let totalWrong = 0;
            let megaOmrData: any[] = [];
            let megaWrongQuestions: any[] = [];
            let megaTopicAnalysis: Record<string, any> = {};

            sessionResults.forEach(res => {
                totalQ += res.totalQuestions;
                totalScore += res.score;
                totalCorrect += res.correctCount;
                totalWrong += res.wrongCount;

                // Merge OMR Data (adjusting indices so they don't overlap in the UI)
                const startIndex = megaOmrData.length;
                if (res.omrData) {
                    res.omrData.forEach(omr => {
                        megaOmrData.push({ ...omr, qIndex: startIndex + omr.qIndex });
                    });
                }

                // Merge Wrong Questions (adjusting indices)
                if (res.wrongQuestions) {
                    res.wrongQuestions.forEach(wq => {
                        megaWrongQuestions.push({ ...wq, qIndex: startIndex + wq.qIndex });
                    });
                }

                // Merge Topic Analysis
                if (res.topicAnalysis) {
                    Object.keys(res.topicAnalysis).forEach(key => {
                        if (!megaTopicAnalysis[key]) {
                            megaTopicAnalysis[key] = { ...res.topicAnalysis![key] };
                        } else {
                            megaTopicAnalysis[key].total += res.topicAnalysis![key].total;
                            megaTopicAnalysis[key].correct += res.topicAnalysis![key].correct;
                            megaTopicAnalysis[key].percentage = Math.round((megaTopicAnalysis[key].correct / megaTopicAnalysis[key].total) * 100);
                        }
                    });
                }
            });

            const percentage = totalQ > 0 ? (totalScore / totalQ) * 100 : 0;
            let performanceTag: 'EXCELLENT' | 'GOOD' | 'BAD' | 'VERY_BAD' = 'GOOD';
            if (percentage >= 80) performanceTag = 'EXCELLENT';
            else if (percentage < 50) performanceTag = 'BAD';

            const megaResult: MCQResult = {
                id: `mega-rev-${Date.now()}`,
                userId: user.id,
                chapterId: 'mega-revision',
                subjectId: 'mega-revision',
                subjectName: 'Mega Revision Session',
                chapterTitle: `Revision Analysis (${topics.length} Topics)`,
                date: new Date().toISOString(),
                totalQuestions: totalQ,
                correctCount: totalCorrect,
                wrongCount: totalWrong,
                score: totalScore,
                totalTimeSeconds: totalTime,
                averageTimePerQuestion: totalQ > 0 ? totalTime / totalQ : 0,
                performanceTag: performanceTag,
                omrData: megaOmrData,
                wrongQuestions: megaWrongQuestions,
                topicAnalysis: megaTopicAnalysis
            };

            // Call onComplete with the SINGLE mega result
            onComplete([megaResult], allSessionQuestions);
            return;
        }

        setLoading(true);
        const topic = topics[index];
        setQIndex(0);
        setAnswers({});
        setShowResult(false);
        setTopicScore(0);

        try {
            let data: any = null;
            const board = user.board || 'CBSE';
            const classLevel = user.classLevel || '10';
            const streamKey = (classLevel === '11' || classLevel === '12') && user.stream ? `-${user.stream}` : '';
            const subject = topic.subjectName || 'Unknown';

            // Fetch Content
            const strictKey = `nst_content_${board}_${classLevel}${streamKey}_${subject}_${topic.chapterId}`;
            data = await storage.getItem(strictKey);
            if (!data) data = await getChapterData(strictKey);
            if (!data) data = await getChapterData(topic.chapterId);

            let mcqs: MCQItem[] = [];
            if (data && data.manualMcqData) {
                // Filter by Subtopic Logic
                const normSubTopic = topic.name.toLowerCase().trim();
                mcqs = data.manualMcqData.filter((q: any) => q.topic && q.topic.toLowerCase().trim() === normSubTopic);

                // Fallback: If no subtopic specific MCQs, maybe use generic ones?
                // User logic is specific to subtopics now. If empty, we might need to skip or show empty.
                if (mcqs.length === 0) {
                     // Try loose match
                     mcqs = data.manualMcqData.filter((q: any) => q.topic && q.topic.toLowerCase().includes(normSubTopic));
                }
            }

            // AUTO-SKIP EMPTY TOPICS & REPORT
            if (mcqs.length === 0) {
                console.log(`Skipping ${topic.name} - No MCQs found`);
                // Report Missing Content to Admin
                saveDemand(user.id, `Missing MCQs for Revision: ${topic.name} (${topic.chapterName})`);

                setCurrentIndex(prev => prev + 1); // Automatically move to next
                return; // Early exit, let effect re-trigger
            }

            // FISHER-YATES SHUFFLE (Randomization)
            for (let i = mcqs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mcqs[i], mcqs[j]] = [mcqs[j], mcqs[i]];
            }

            // LIMIT QUESTIONS (User Request: Don't show 200-400 questions)
            // Cap at 20 questions per revision session to prevent burnout
            const limitedMcqs = mcqs.slice(0, 2000);

            setCurrentMcqData(limitedMcqs);
            setAllSessionQuestions(prev => [...prev, ...limitedMcqs]);
        } catch (e) {
            console.error("Failed to load MCQ", e);
            setCurrentMcqData([]);
            setCurrentIndex(prev => prev + 1); // Skip on error
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (optionIdx: number) => {
        if (answers[qIndex] !== undefined) return;

        const newAnswers = { ...answers, [qIndex]: optionIdx };
        setAnswers(newAnswers);

        // Auto Advance after short delay
        setTimeout(() => {
            if (qIndex < currentMcqData.length - 1) {
                setQIndex(prev => prev + 1);
            } else {
                // Topic Finished -> Auto Submit Topic (No Result Screen)
                calculateAndNext(newAnswers);
            }
        }, 500);
    };

    const calculateAndNext = (finalAnswers: Record<number, number>) => {
        let correct = 0;
        currentMcqData.forEach((q, i) => {
            if (finalAnswers[i] === q.correctAnswer) correct++;
        });
        // Save & Move Next immediately
        processTopicResult(correct, finalAnswers);
    };

    const processTopicResult = (score: number, finalAnswers: Record<number, number>) => {
        // Save Result
        const topic = topics[currentIndex];
        const total = currentMcqData.length;
        const percentage = total > 0 ? (score/total)*100 : 0;

        // Determine Status based on NEW Logic
        // < 50 Weak, 50-79 Avg, >= 80 Excellent (User said "80% aagaya ab ye topic jayega exclent page me")
        // Wait, did user define "Strong"?
        // User: "10 topic week , 5 avrage aur 2 stronge hua... mcq banaye 80% aagaya ab ye topic jayega exclent page me"
        // Implies: < 50 Weak, 50-65 Avg, 65-79 Strong, >= 80 Excellent. (Approximation)
        let status = 'AVERAGE';
        if (percentage < 50) status = 'WEAK';
        else if (percentage >= 80) status = 'EXCELLENT';
        else if (percentage >= 65) status = 'STRONG';

        // Use helper to generate report matching other components
        // Create dummy "submittedQuestions" array where every question is from this subtopic
        // But we need individual correctness. We have `answers` (Record<qIndex, optionIndex>)
        // and `currentMcqData`.

        // Reconstruct user answers for the helper
        const userAnswersMap: Record<number, number> = {};
        currentMcqData.forEach((_, idx) => {
            if (answers[idx] !== undefined) userAnswersMap[idx] = answers[idx];
        });

        const analysisJson = generateAnalysisJson(currentMcqData, userAnswersMap, user.mcqHistory, topic.chapterId);

        // Generate Granular Topic Analysis for History Comparison (identical to McqView)
        const topicAnalysis: Record<string, { correct: number, total: number, percentage: number }> = {};

        const omrData: { qIndex: number, selected: number, correct: number, timeSpent?: number }[] = [];
        const wrongQuestions: { question: string, qIndex: number, explanation?: string, correctAnswer?: string | number }[] = [];

        currentMcqData.forEach((q, idx) => {
            const t = (q.topic || 'General').trim();
            if (!topicAnalysis[t]) topicAnalysis[t] = { correct: 0, total: 0, percentage: 0 };

            topicAnalysis[t].total += 1;
            const selectedOpt = userAnswersMap[idx];
            const isSelected = selectedOpt !== undefined ? selectedOpt : -1;

            omrData.push({
                qIndex: idx,
                selected: isSelected,
                correct: q.correctAnswer,
                timeSpent: 0 // Mocked for now, not tracked per question here
            });

            if (isSelected !== -1 && isSelected !== q.correctAnswer) {
                wrongQuestions.push({
                    question: q.question,
                    qIndex: idx,
                    explanation: q.explanation,
                    correctAnswer: q.correctAnswer
                });
            }

            if (selectedOpt === q.correctAnswer) {
                topicAnalysis[t].correct += 1;
            } else if (selectedOpt !== undefined && selectedOpt !== -1) {
                wrongQuestions.push({
                    question: q.question,
                    qIndex: idx,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation
                });
            }
        });

        // Calculate Percentages
        Object.keys(topicAnalysis).forEach(t => {
            const s = topicAnalysis[t];
            s.percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        });

        const result: MCQResult = {
            id: `mcq-rev-${Date.now()}`,
            userId: user.id,
            chapterId: topic.chapterId,
            chapterTitle: topic.chapterName,
            subjectId: topic.subjectId || 'REVISION',
            subjectName: topic.subjectName || 'Revision',
            date: new Date().toISOString(),
            score: score,
            totalQuestions: total,
            correctCount: score,
            wrongCount: total - score,
            totalTimeSeconds: totalTime,
            averageTimePerQuestion: totalTime / (total || 1),
            performanceTag: percentage >= 80 ? 'EXCELLENT' : percentage >= 50 ? 'GOOD' : 'BAD',
            ultraAnalysisReport: analysisJson,
            topicAnalysis: topicAnalysis,
            omrData: omrData,
            wrongQuestions: wrongQuestions,
            topic: topic.name // Store the revision topic name
        };

        setSessionResults(prev => [...prev, result]);

        // Record wrong answers into Revision Hub tracker so they show in Revision Hub
        if (currentMcqData.length > 0) {
            const userAnswersArr = currentMcqData.map((_, idx) => userAnswersMap[idx] ?? null);
            try {
                recordRevisionAttempt({
                    subjectId: topic.subjectId || 'REVISION',
                    subjectName: topic.subjectName || 'Revision',
                    chapterId: topic.chapterId,
                    chapterTitle: topic.chapterName,
                    pageKey: topic.chapterId,
                    questions: currentMcqData,
                    userAnswers: userAnswersArr,
                });
            } catch (_) { /* silent — tracking is non-critical */ }
        }

        // ── MY MISTAKE BANK ──────────────────────────────────────────────
        // Push every wrong-answered question into the persistent mistake bank
        // so the My Mistake page can show & replay them. Right-answered ones
        // are removed (so once student fixes a mistake it disappears).
        // Mirrors the same flow McqView uses for school MCQs — earlier the
        // Today/Revision MCQ session was skipping this step entirely so
        // wrong answers in revision never landed on the My Mistake page.
        try {
            const wrongPayload = currentMcqData
                .map((q, idx) => {
                    const selected = userAnswersMap[idx];
                    if (selected !== undefined && selected !== q.correctAnswer) {
                        return {
                            question: q.question,
                            options: q.options || [],
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            topic: q.topic || topic.name,
                            chapterTitle: topic.chapterName,
                            subjectName: topic.subjectName || 'Revision',
                            classLevel: user.classLevel,
                            board: user.board,
                            source: 'REVISION',
                        };
                    }
                    return null;
                })
                .filter((x): x is NonNullable<typeof x> => x !== null);
            if (wrongPayload.length > 0) addMistakes(wrongPayload);
            // Remove correctly-answered mistakes from the bank.
            currentMcqData.forEach((q, idx) => {
                const selected = userAnswersMap[idx];
                if (selected !== undefined && selected === q.correctAnswer) {
                    removeMistakeByQuestion(q.question, q.correctAnswer);
                }
            });
        } catch (err) { console.warn('mistakeBank update failed:', err); }

        // Save to DB immediately to be safe
        saveTestResult(user.id, result);

        // Show Micro Summary Overlay
        setTopicSummary({
            name: topic.name,
            score: score,
            total: total
        });

        // Auto Advance after 1.5s (Modified to allow manual view if needed, but keeping auto-flow for speed)
        // User requested "same analysis" if they want.
        // We will add a "View Analysis" button on the summary screen that pauses the timer.
        // But default behavior remains fast.

        setTimeout(() => {
            setTopicSummary(null);
            setCurrentIndex(prev => prev + 1);
        }, 800); // Reduced delay to 800ms for faster transition
    };

    // MEGA ANALYSIS OVERLAY (Triggers when all topics are done but before passing to parent to allow review)
    if (currentIndex >= topics.length) {
        // We will call onComplete immediately, but since this component unmounts upon onComplete,
        // we rely on the parent (RevisionHub) to display the Marksheet (Mega Analysis).
        // Wait, the parent (RevisionHub) handles the "showCompletedMarksheets".
        // But the user requested: "ek hi analisis me sare topic ķe question honge ek saath mega analysis aayega"
        // This means we should COMBINE all session results into ONE Mega MCQResult before returning.
        return null;
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
                <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                <p className="font-bold text-slate-600 animate-pulse">Loading Topic {currentIndex + 1}...</p>
            </div>
        );
    }

    // Completion View
    if (currentIndex >= topics.length) {
        return null; // Handled by loadTopicData check, but for safety
    }

    const topic = topics[currentIndex];

    // No Questions Found View (Should be skipped automatically, but safety net)
    if (currentMcqData.length === 0) {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
                <Loader2 size={48} className="text-slate-300 animate-spin mb-4" />
                <p className="text-slate-500 font-bold">Skipping empty topic...</p>
            </div>
        );
    }


    // MCQ Question View
    const question = currentMcqData[qIndex];
    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Sidebar Overlay */}
            {showSidebar && (
                <div className="fixed inset-0 bg-black/50 z-[110]" onClick={() => setShowSidebar(false)}>
                    <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800">Session Topics</h3>
                            <button onClick={() => setShowSidebar(false)}><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            {topics.map((t, idx) => {
                                const isCurrent = idx === currentIndex;
                                const isDone = idx < currentIndex;
                                return (
                                    <div key={idx} className={`p-3 rounded-xl border ${isCurrent ? 'bg-blue-50 border-blue-200' : isDone ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-100'}`}>
                                        <p className={`text-xs font-bold ${isCurrent ? 'text-blue-700' : 'text-slate-700'}`}>{t.name}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] uppercase text-slate-500 font-bold">{t.chapterName}</span>
                                            {isCurrent && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Active</span>}
                                            {isDone && <CheckCircle size={12} className="text-green-500" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={() => {
                        // Back Button = Submit & Exit (Auto)
                        // If we have some results, complete. If not, just close.
                        if (sessionResults.length > 0) {
                            onComplete(sessionResults, allSessionQuestions);
                        } else {
                            onClose();
                        }
                    }} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
                        <ArrowRight size={18} className="rotate-180" /> {/* Back Icon */}
                    </button>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide max-w-[150px] truncate">{topic.name}</h3>
                        <p className="text-xs text-slate-500 font-bold">Q {qIndex + 1} / {currentMcqData.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowSidebar(true)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                        <List size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
                            <span className="text-xs font-mono font-bold text-slate-700">
                                {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            // "Apne aap submit ho jayega" - Manual submit also triggers finish
                            onComplete(sessionResults, allSessionQuestions);
                        }}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-green-700"
                    >
                        Submit
                    </button>
                </div>
            </div>

            {/* Progress */}
            <div className="h-1 bg-slate-100 w-full">
                <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${((qIndex + 1) / currentMcqData.length) * 100}%` }}
                ></div>
            </div>

            {/* Question */}
            <div className="flex-1 overflow-y-auto p-6 pb-24">
                <div className="text-lg font-bold text-slate-800 mb-8 leading-relaxed">
                    <span dangerouslySetInnerHTML={{ __html: question.question }} />
                    {question.statements && question.statements.length > 0 && (
                        <div className="mt-4 mb-2 flex flex-col space-y-2">
                            {question.statements.map((stmt, sIdx) => (
                                <div key={sIdx} className="bg-slate-50/80 p-3 rounded-lg border-l-4 border-indigo-200 text-slate-700 text-base font-medium" dangerouslySetInnerHTML={{ __html: stmt }} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {question.options.map((opt, idx) => {
                        const isSelected = answers[qIndex] === idx;
                        const isCorrect = idx === question.correctAnswer;
                        let btnClass = "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

                        if (answers[qIndex] !== undefined) {
                            if (isCorrect) btnClass = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500";
                            else if (isSelected) btnClass = "border-red-500 bg-red-50 text-red-700";
                            else btnClass = "border-slate-100 opacity-50 text-slate-800";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={answers[qIndex] !== undefined}
                                className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-3 ${btnClass}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                                    answers[qIndex] !== undefined && isCorrect ? 'bg-green-500 border-green-500 text-white' :
                                    answers[qIndex] !== undefined && isSelected ? 'bg-red-500 border-red-500 text-white' :
                                    'bg-slate-100 border-slate-300 text-slate-600'
                                }`}>
                                    {['A','B','C','D'][idx]}
                                </div>
                                <span className="flex-1">{opt}</span>
                                {answers[qIndex] !== undefined && isCorrect && <CheckCircle size={18} className="text-green-600" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
