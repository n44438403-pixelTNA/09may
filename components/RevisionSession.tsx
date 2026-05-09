import React, { useState, useEffect } from 'react';
import { User, SystemSettings, MCQItem } from '../types';
import { X, BookOpen, Zap, CheckCircle, AlertCircle, ChevronRight, Check, RotateCcw, Loader2 } from 'lucide-react';
import { getChapterData, saveUserToLive } from '../firebase';
import { storage } from '../utils/storage';
import { DEFAULT_SUBJECTS } from '../constants';
import { addMistakes, removeMistakeByQuestion } from '../utils/mistakeBank';

interface Props {
    user: User;
    settings?: SystemSettings;
    chapterId: string;
    subTopic: string;
    chapterTitle: string;
    subjectName?: string;
    onClose: () => void;
    onUpdateUser: (u: User) => void;
}

export const RevisionSession: React.FC<Props> = ({ user, settings, chapterId, subTopic, chapterTitle, subjectName, onClose, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<'NOTES' | 'MCQ'>('NOTES');
    const [loading, setLoading] = useState(true);
    const [notesContent, setNotesContent] = useState<string | null>(null);
    const [mcqData, setMcqData] = useState<MCQItem[]>([]);

    // Determine if MCQ is available based on status and time
    // Logic: Week (WEAK) -> 2 days after revision
    // Average (AVERAGE) -> 5 days after revision
    // Strong (STRONG) -> 10 days after revision
    const [isMcqAvailable, setIsMcqAvailable] = useState(false);
    const [readingTimer, setReadingTimer] = useState(10); // 10s Mandatory Reading

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (activeTab === 'NOTES' && readingTimer > 0) {
            interval = setInterval(() => {
                setReadingTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeTab, readingTimer]);

    useEffect(() => {
        const checkMcqAvailability = () => {
            if (!user.mcqHistory) return;
            
            // Find last revision entry for this subtopic
            const relevantHistory = user.mcqHistory
                .filter(h => h.chapterId === chapterId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            if (relevantHistory.length > 0) {
                const lastEntry = relevantHistory[0];
                let status = 'AVERAGE';
                if (lastEntry.ultraAnalysisReport) {
                    try {
                        const parsed = JSON.parse(lastEntry.ultraAnalysisReport);
                        const topic = parsed.topics?.find((t: any) => t.name === subTopic);
                        if (topic) status = topic.status;
                    } catch (e) {}
                }

                const lastDate = new Date(lastEntry.date);
                const now = new Date();
                const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

                let requiredDays = 5; // Default AVERAGE
                if (status === 'WEAK') requiredDays = 2;
                else if (status === 'STRONG') requiredDays = 10;
                // Note: We don't check streak here, but 7 is safe minimum for STRONG.
                // If it was a 30-day streak, diffDays will naturally be < 30 until due.

                setIsMcqAvailable(diffDays >= requiredDays);
            } else {
                // If no history, assume it's first revision or not set up, allow MCQ
                setIsMcqAvailable(true);
            }
        };
        checkMcqAvailability();
    }, [user.mcqHistory, chapterId, subTopic]);

    // MCQ State
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [notesRead, setNotesRead] = useState(false); // Track if user read notes

    // Extract stable user properties
    const userBoard = user.board || 'CBSE';
    const userClass = user.classLevel || '10';
    const userStream = user.stream;

    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            try {
                let data = null;
                const streamKey = (userClass === '11' || userClass === '12') && userStream ? `-${userStream}` : '';

                let subject = subjectName || 'Unknown';
                // REVERSE MAP FOR HINDI
                const hindiMapReverse: Record<string, string> = {
                    'भौतिकी': 'Physics',
                    'रसायन शास्त्र': 'Chemistry',
                    'जीव विज्ञान': 'Biology',
                    'गणित': 'Mathematics',
                    'इतिहास': 'History',
                    'भूगोल': 'Geography',
                    'राजनीति विज्ञान': 'Political Science',
                    'अर्थशास्त्र': 'Economics',
                    'व्यवसाय अध्ययन': 'Business Studies',
                    'लेखाशास्त्र': 'Accountancy',
                    'विज्ञान': 'Science',
                    'सामाजिक विज्ञान': 'Social Science',
                    'अंग्रेजी': 'English',
                    'हिन्दी': 'Hindi',
                    'संस्कृत': 'Sanskrit',
                    'कंप्यूटर विज्ञान': 'Computer Science'
                };
                if (hindiMapReverse[subject]) {
                    subject = hindiMapReverse[subject];
                }


                // 1. Try Strict Key
                const strictKey = `nst_content_${userBoard}_${userClass}${streamKey}_${subject}_${chapterId}`;
                data = await storage.getItem(strictKey);

                // 2. If Failed, Search by Chapter ID (Robust Search)
                if (!data) {
                    try {
                        const allKeys = await storage.keys();
                        const matchKey = allKeys.find(k => k.endsWith(`_${chapterId}`) && k.startsWith('nst_content_'));
                        if (matchKey) {
                            data = await storage.getItem(matchKey);
                        }
                    } catch(e) { console.warn("Storage Scan failed", e); }
                }

                // 3. Fallback to Firebase
                if (!data) {
                    try {
                        data = await getChapterData(strictKey);
                    } catch(e) { console.error("Firebase fetch failed", e); }
                }

                if (data) {
                    // Filter Notes (Normalize Matching)
                    let relevantNote = null;
                    const combinedNotes = [...(data.topicNotes || []), ...(data.deepDiveEntries || []), ...(data.allTopics || [])];
                    if (combinedNotes.length > 0) {
                        relevantNote = findRelevantNote(combinedNotes, subTopic);
                    }

                    if (relevantNote && relevantNote.content) {
                        setNotesContent(formatMcqNotes(relevantNote.content));
                    } else if (data.content && data.content.length > 5) {
                        // If no specific topic notes but main content exists, show main content as fallback
                        setNotesContent(formatMcqNotes(data.content));
                    } else if (combinedNotes.length > 0) {
                        // Fallback to aggregating all topic notes if data.content is insufficient
                        setNotesContent(combinedNotes.map((n: any) => formatMcqNotes(n.content)).join('<hr class="my-6 border-slate-200" />'));
                    }

                    // Filter MCQs (Normalize Matching)
                    if (data.manualMcqData) {
                        const normSubTopic = subTopic.toLowerCase().trim();
                        const relevantMcqs = data.manualMcqData.filter((q: any) => q.topic && q.topic.toLowerCase().trim() === normSubTopic);
                        setMcqData(relevantMcqs);
                    }
                } else {
                    // 4. Ultimate Fallback: Try to fetch using only Chapter ID from content_data collection directly
                    try {
                        const directData = await getChapterData(chapterId);
                        if (directData) {
                            let relevantNote = null;
                            const combinedDirectNotes = [...(directData.topicNotes || []), ...(directData.deepDiveEntries || []), ...(directData.allTopics || [])];
                            if (combinedDirectNotes.length > 0) {
                                relevantNote = findRelevantNote(combinedDirectNotes, subTopic);
                            }

                            if (relevantNote && relevantNote.content) {
                                setNotesContent(formatMcqNotes(relevantNote.content));
                            } else if (directData.content && directData.content.length > 20) {
                                setNotesContent(formatMcqNotes(directData.content));
                            } else if (combinedDirectNotes.length > 0) {
                                setNotesContent(combinedDirectNotes.map((n: any) => formatMcqNotes(n.content)).join('<hr class="my-6 border-slate-200" />'));
                            }

                            if (directData.manualMcqData) {
                                const normSubTopic = subTopic.toLowerCase().trim();
                                const relevantMcqs = directData.manualMcqData.filter((q: any) => q.topic && q.topic.toLowerCase().trim() === normSubTopic);
                                setMcqData(relevantMcqs);
                            }
                        }
                    } catch(e) { console.error("Ultimate Firebase fallback failed", e); }
                }
            } catch (e) {
                console.error("Failed to load revision content", e);
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [chapterId, subTopic, subjectName, userBoard, userClass, userStream]);

    const handleOptionSelect = (idx: number) => {
        if (selectedOption !== null) return; // Prevent change
        setSelectedOption(idx);

        const q = mcqData[currentQIndex];
        const correct = q.correctAnswer;
        const isRight = idx === correct;
        setIsCorrect(isRight);
        setShowExplanation(true);

        if (isRight) setScore(prev => prev + 1);

        // ── MY MISTAKE BANK ──────────────────────────────────────────────
        // Revision MCQ auto-grades on tap (no Submit button) — track wrong
        // answers immediately so they land on the My Mistake page, and
        // remove from the bank when the same question is answered correctly.
        try {
            if (isRight) {
                removeMistakeByQuestion(q.question, q.correctAnswer);
            } else {
                addMistakes([{
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    topic: q.topic || subTopic,
                    chapterTitle: chapterTitle,
                    subjectName: subjectName || 'Revision',
                    classLevel: user.classLevel,
                    board: user.board,
                    source: 'REVISION',
                }]);
            }
        } catch (err) { console.warn('mistakeBank update failed:', err); }
    };

    const nextQuestion = () => {
        if (currentQIndex < mcqData.length - 1) {
            setCurrentQIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowExplanation(false);
            setIsCorrect(null);
        } else {
            finishSession();
        }
    };

    const finishSession = () => {
        // Calculate Logic
        const total = mcqData.length;
        const finalScore = score; // Already updated
        const percentage = total > 0 ? (finalScore / total) * 100 : 0;

        // Status Logic
        let status = 'AVERAGE';
        if (percentage < 50) status = 'WEAK';
        else if (percentage >= 80) status = 'STRONG';

        // Construct Report for Spaced Repetition Logic in RevisionHub
        const ultraReport = {
            topics: [
                {
                    name: subTopic,
                    status: status
                }
            ]
        };

        // Create History Entry
        const newEntry = {
            testId: `rev-${Date.now()}`,
            chapterId: chapterId,
            chapterTitle: chapterTitle,
            subjectName: subjectName || 'Revision',
            score: finalScore,
            totalQuestions: total,
            date: new Date().toISOString(),
            type: 'REVISION_MCQ',
            ultraAnalysisReport: JSON.stringify(ultraReport)
        };

        // Update User
        const updatedUser = {
            ...user,
            mcqHistory: [...(user.mcqHistory || []), newEntry]
        };

        onUpdateUser(updatedUser);
        saveUserToLive(updatedUser);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-10">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div>
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{subTopic}</h2>
                    <p className="text-xs text-slate-600 font-bold">{chapterTitle} • Revision Mode</p>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* TABS */}
            <div className="flex p-2 bg-slate-50 gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('NOTES')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'NOTES' ? 'bg-white shadow text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <BookOpen size={16} /> Study Notes
                </button>
                <button
                    onClick={() => {
                        if (!isMcqAvailable) return;
                        if (readingTimer > 0) {
                            alert(`Please read the notes for ${readingTimer} more seconds before starting the test.`);
                            return;
                        }
                        setActiveTab('MCQ');
                        setNotesRead(true);
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${!isMcqAvailable ? 'opacity-50 cursor-not-allowed text-slate-300' : activeTab === 'MCQ' ? 'bg-white shadow text-purple-600 ring-1 ring-purple-100' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <Zap size={16} />
                    {isMcqAvailable ? (readingTimer > 0 ? `Wait (${readingTimer}s)` : 'Quick Practice') : 'Locked'}
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Loader2 size={32} className="animate-spin mb-2" />
                        <p className="text-xs font-bold">Fetching Revision Data...</p>
                    </div>
                ) : (
                    <>
                        {/* NOTES VIEW */}
                        {activeTab === 'NOTES' && (
                            <div className="max-w-3xl mx-auto">
                                {notesContent ? (
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 prose prose-sm prose-slate max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: notesContent }} />
                                        
                                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                                            {isMcqAvailable ? (
                                                <button
                                                    onClick={() => {
                                                        setNotesRead(true);
                                                        setActiveTab('MCQ');
                                                    }}
                                                    disabled={readingTimer > 0}
                                                    className={`flex items-center gap-2 px-8 py-4 font-bold rounded-2xl shadow-xl transition-all ${
                                                        readingTimer > 0
                                                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                                                        : 'bg-slate-900 text-white hover:bg-indigo-600 hover:scale-105 active:scale-95'
                                                    }`}
                                                >
                                                    {readingTimer > 0 ? (
                                                        <><Loader2 size={18} className="animate-spin" /> Read Carefully ({readingTimer}s)</>
                                                    ) : (
                                                        <><Zap size={18} className="text-yellow-400" /> Start MCQ Practice</>
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-xs font-bold text-center">
                                                    MCQ Practice will be unlocked after the required revision interval.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
                                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-500">
                                            <BookOpen size={32} />
                                        </div>
                                        <p className="font-bold text-slate-600">No specific notes found for this topic.</p>
                                        <p className="text-xs mt-1">Try checking the main chapter notes.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MCQ VIEW */}
                        {activeTab === 'MCQ' && (
                            <div className="w-full mx-auto h-full flex flex-col">
                                {!notesRead && !loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
                                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                                            <BookOpen size={32} />
                                        </div>
                                        <h3 className="font-black text-slate-800 text-lg">Notes First!</h3>
                                        <p className="text-sm text-slate-600 mt-1 mb-6">Please read the study notes carefully before starting the practice MCQ.</p>
                                        <button
                                            onClick={() => setActiveTab('NOTES')}
                                            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
                                        >
                                            Go to Notes
                                        </button>
                                    </div>
                                ) : mcqData.length > 0 ? (
                                    <div className="flex-1 flex flex-col gap-4">
                                        {/* PROGRESS BAR */}
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-600 transition-all duration-300"
                                                style={{ width: `${((currentQIndex + 1) / mcqData.length) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                            <span>Question {currentQIndex + 1} / {mcqData.length}</span>
                                            <span>Topic: {subTopic}</span>
                                        </div>

                                        {/* QUESTION CARD */}
                                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex-1 flex flex-col">
                                            <h3 className="text-lg font-bold text-slate-800 mb-6 leading-relaxed">
                                                {mcqData[currentQIndex].question}
                                            </h3>

                                            <div className="space-y-3 flex-1">
                                                {mcqData[currentQIndex].options.map((opt, idx) => {
                                                    let stateClass = "border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-600";
                                                    if (selectedOption !== null) {
                                                        if (idx === mcqData[currentQIndex].correctAnswer) {
                                                            stateClass = "bg-green-100 border-green-500 text-green-800 font-bold ring-2 ring-green-200";
                                                        } else if (idx === selectedOption) {
                                                            stateClass = "bg-red-100 border-red-500 text-red-800 font-bold";
                                                        } else {
                                                            stateClass = "opacity-50 border-slate-100";
                                                        }
                                                    } else if (selectedOption === idx) {
                                                         stateClass = "bg-purple-100 border-purple-500 text-purple-800 font-bold";
                                                    }

                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleOptionSelect(idx)}
                                                            disabled={selectedOption !== null}
                                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${stateClass}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                                                                selectedOption !== null && idx === mcqData[currentQIndex].correctAnswer ? 'bg-green-500 border-green-600 text-white' :
                                                                selectedOption === idx ? 'bg-red-500 border-red-600 text-white' :
                                                                'bg-white border-slate-300 text-slate-600'
                                                            }`}>
                                                                {['A','B','C','D'][idx]}
                                                            </div>
                                                            <span className="flex-1 text-sm">{opt}</span>
                                                            {selectedOption !== null && idx === mcqData[currentQIndex].correctAnswer && <CheckCircle size={20} className="text-green-600" />}
                                                            {selectedOption === idx && idx !== mcqData[currentQIndex].correctAnswer && <AlertCircle size={20} className="text-red-600" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* EXPLANATION & NEXT */}
                                        {showExplanation && (
                                            <div className="animate-in slide-in-from-bottom-4 space-y-4 pb-8">
                                                <div className={`p-4 rounded-xl border-l-4 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                                    <h4 className={`font-bold text-sm mb-1 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                                        {isCorrect ? 'Correct Answer!' : 'Incorrect'}
                                                    </h4>
                                                    <p className="text-xs text-slate-600">
                                                        {mcqData[currentQIndex].explanation || "No explanation provided."}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={nextQuestion}
                                                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {currentQIndex < mcqData.length - 1 ? 'Next Question' : 'Finish Revision'} <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
                                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-500">
                                            <Zap size={32} />
                                        </div>
                                        <p className="font-bold text-slate-600">No quick practice questions found.</p>
                                        <p className="text-xs mt-1">Try taking the full chapter test.</p>
                                        <button
                                            onClick={finishSession}
                                            className="mt-4 px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                                        >
                                            Go Back
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
