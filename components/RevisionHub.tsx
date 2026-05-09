import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, StudentTab, SystemSettings, TopicItem, TopicStatus } from '../types';
import { BrainCircuit, Clock, CheckCircle, TrendingUp, AlertTriangle, ArrowRight, BookOpen, AlertCircle, X, FileText, CheckSquare, Calendar, Zap, AlertCircle as AlertIcon, ChevronDown, ChevronUp, Loader2, Lock, Unlock, MessageSquare, Bot, PlayCircle, Star, Volume2, Mic, AlertOctagon, Crown, Layout, Trophy, Maximize, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import { generateCustomNotes } from '../services/groq';
import { saveAiInteraction, getChapterData, saveUserToLive, saveDemand } from '../firebase';
import { storage } from '../utils/storage';
import { CustomAlert } from './CustomDialogs';
import { RevisionSession } from './RevisionSession';
import { TodayRevisionView } from './TodayRevisionView';
import { TodayMcqSession } from './TodayMcqSession';
import { TopicChart } from './TopicChart';
import { RevisionDonutChart } from './RevisionDonutChart';
import { WeakAverageNotesView } from './WeakAverageNotesView';
import { speakWithHighlight } from '../utils/ttsHighlighter';
import { LEVEL_UP_CONFIG } from '../constants';
import { MarksheetCard } from './MarksheetCard'; // Import MarksheetCard
import { MonthlyMarksheet } from './MonthlyMarksheet'; // Import MonthlyMarksheet
import { checkFeatureAccess } from '../utils/permissionUtils';
import { formatMcqNotes, findRelevantNote } from '../utils/noteFormatter';
import { DEFAULT_SUBJECTS } from '../constants';

interface Props {
    user: User;
    onTabChange: (tab: StudentTab) => void;
    settings?: SystemSettings;
    onNavigateContent?: (type: 'PDF' | 'MCQ', chapterId: string, topicName?: string, subjectName?: string) => void;
    onUpdateUser?: (user: User) => void;
}

const RevisionHubComponent: React.FC<Props> = ({ user, onTabChange, settings, onNavigateContent, onUpdateUser }) => {
    // --- LEVEL LOCK CHECK ---
    const userLevel = user.level || 1;
    const levelConfig = settings?.levelConfig || LEVEL_UP_CONFIG;
    // Find if REVISION_HUB is unlocked
    const requiredLevel = levelConfig.find(l => l.featureId === 'REVISION_HUB')?.level || 1;
    const isLevelLocked = settings?.isLevelSystemEnabled && userLevel < requiredLevel;

    // --- REVISION LOGIC CONFIG (PREMIUM ANALYSIS) ---
    const revisionConfig = settings?.revisionConfig;
    const thresholds = revisionConfig?.thresholds || { strong: 65, average: 50, mastery: 80 };
    const intervals = revisionConfig?.intervals || {
        weak: { revision: 1 * 24 * 3600, mcq: 3 * 24 * 3600 },
        average: { revision: 3 * 24 * 3600, mcq: 5 * 24 * 3600 },
        strong: { revision: 7 * 24 * 3600, mcq: 10 * 24 * 3600 },
        mastered: { revision: 30 * 24 * 3600, mcq: 10 * 24 * 3600 }
    };
    const masteryCountReq = revisionConfig?.mastery.requiredCount || 2;

    const [topics, setTopics] = useState<TopicItem[]>([]);

    // Initial Mode Logic with Permission Check
    const [hubMode, setHubMode] = useState<'FREE' | 'PREMIUM'>(() => {
        const premiumAccess = checkFeatureAccess('REVISION_HUB_PREMIUM', user, settings || {});
        // Admins and sub-admins should default to PREMIUM mode
        if (premiumAccess.hasAccess && (user.subscriptionTier !== 'FREE' || user.role === 'ADMIN' || user.isSubAdmin)) return 'PREMIUM';
        return 'FREE';
    });

    const [activeFilter, setActiveFilter] = useState<'TODAY' | 'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT' | 'MISTAKES' | 'MCQ' | 'WEAK_NOTES'>('TODAY');
    const [scoreViewMode, setScoreViewMode] = useState<'LATEST' | 'ALL_TIME'>('LATEST'); // NEW: Score View Mode
    const [ttsRate, setTtsRate] = useState(1.0); // TTS Speed Control

    // Mistakes View State
    const [expandedMistakeTest, setExpandedMistakeTest] = useState<string | null>(null);
    const [expandedMistakeAttemptId, setExpandedMistakeAttemptId] = useState<string | null>(null);

    // UI State
    const [showReport, setShowReport] = useState(false);
    const [showTodayRevisionSession, setShowTodayRevisionSession] = useState(false);
    const [showTodayMcqSession, setShowTodayMcqSession] = useState(false);
    const [sessionResult, setSessionResult] = useState<any>(null); // For Marksheet
    const [showCompletedHistory, setShowCompletedHistory] = useState(false);
    const [showYesterdayHistory, setShowYesterdayHistory] = useState(false);

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, type: 'SUCCESS'|'ERROR'|'INFO', title?: string, message: string}>({isOpen: false, type: 'INFO', message: ''});

    // SCROLL TO HIDE HEADER STATE REMOVED
    const showHeader = true; // Always show header
    const handleScroll = () => {}; // No-op

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    // Track recently completed MCQs for Marksheet view
    const [completedMcqResults, setCompletedMcqResults] = useState<any[]>([]);
    const [completedMcqQuestions, setCompletedMcqQuestions] = useState<any[]>([]);
    const [showCompletedMarksheets, setShowCompletedMarksheets] = useState(false);

    // Calculate Today's Counts (Midnight Comparison)
    const now = new Date();
    const todayStr = now.toDateString();

    // Calculate Yesterday's Date
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const pendingNotes = useMemo(() => {
        return topics.filter(t => t.nextRevision && new Date(t.nextRevision) <= now);
    }, [topics]);

    const pendingMcqs = useMemo(() => {
        return topics.filter(t => t.mcqDueDate && new Date(t.mcqDueDate) <= now);
    }, [topics]);

    // ---- INLINE NOTES PREVIEW LOADER (Today's Tasks list) ----
    const [pendingNotesContent, setPendingNotesContent] = useState<Record<string, string>>({});
    const [expandedPendingNote, setExpandedPendingNote] = useState<string | null>(null);

    useEffect(() => {
        if (activeFilter !== 'TODAY' || pendingNotes.length === 0) return;
        let cancelled = false;

        const userBoard = user.board || 'CBSE';
        const userClass = user.classLevel || '10';
        const userStream = user.stream || null;
        const streamKey = (userClass === '11' || userClass === '12') && userStream ? `-${userStream}` : '';

        const hindiMapReverse: Record<string, string> = {
            'भौतिकी': 'Physics', 'रसायन शास्त्र': 'Chemistry', 'जीव विज्ञान': 'Biology',
            'गणित': 'Mathematics', 'इतिहास': 'History', 'भूगोल': 'Geography',
            'राजनीति विज्ञान': 'Political Science', 'अर्थशास्त्र': 'Economics',
            'व्यवसाय अध्ययन': 'Business Studies', 'लेखाशास्त्र': 'Accountancy',
            'विज्ञान': 'Science', 'सामाजिक विज्ञान': 'Social Science',
            'अंग्रेजी': 'English', 'हिन्दी': 'Hindi', 'संस्कृत': 'Sanskrit',
            'कंप्यूटर विज्ञान': 'Computer Science'
        };

        const loadOne = async (topic: TopicItem): Promise<[string, string]> => {
            const cacheKey = `${topic.chapterId}__${topic.name}`;
            try {
                let subject = topic.subjectName || 'Unknown';
                if (hindiMapReverse[subject]) subject = hindiMapReverse[subject];
                const englishSubject = topic.subjectId && (DEFAULT_SUBJECTS as any)[topic.subjectId]
                    ? (DEFAULT_SUBJECTS as any)[topic.subjectId].name
                    : subject;
                const strictKey = `nst_content_${userBoard}_${userClass}${streamKey}_${englishSubject}_${topic.chapterId}`;

                let data: any = await storage.getItem(strictKey);
                if (!data) {
                    try {
                        const allKeys = await storage.keys();
                        const matchKey = allKeys.find(k => k.endsWith(`_${topic.chapterId}`) && k.startsWith('nst_content_'));
                        if (matchKey) data = await storage.getItem(matchKey);
                    } catch (e) {}
                }
                if (!data) { try { data = await getChapterData(strictKey); } catch (e) {} }
                if (!data) { try { data = await getChapterData(topic.chapterId); } catch (e) {} }

                if (!data) return [cacheKey, ''];

                const combinedNotes = [...(data.topicNotes || []), ...(data.deepDiveEntries || []), ...(data.allTopics || [])];
                let html = '';
                let relevant: any = null;
                if (combinedNotes.length > 0) {
                    relevant = findRelevantNote(combinedNotes, topic.name);
                }
                if (relevant && relevant.content) {
                    html = formatMcqNotes(relevant.content);
                } else if (data.content && data.content.length > 5) {
                    html = formatMcqNotes(data.content);
                } else if (combinedNotes.length > 0) {
                    html = combinedNotes
                        .map((n: any) => formatMcqNotes(n.content || ''))
                        .filter(Boolean)
                        .join('<hr class="my-4 border-slate-200" />');
                }
                return [cacheKey, html];
            } catch (e) {
                return [cacheKey, ''];
            }
        };

        (async () => {
            const updates: Record<string, string> = {};
            for (const t of pendingNotes) {
                const cacheKey = `${t.chapterId}__${t.name}`;
                if (pendingNotesContent[cacheKey] !== undefined) continue;
                const [k, html] = await loadOne(t);
                if (cancelled) return;
                updates[k] = html;
            }
            if (!cancelled && Object.keys(updates).length > 0) {
                setPendingNotesContent(prev => ({ ...prev, ...updates }));
            }
        })();

        return () => { cancelled = true; };
    }, [activeFilter, pendingNotes, user.board, user.classLevel, user.stream]);

    const [processedTopics, setProcessedTopics] = useState<TopicItem[]>([]);
    const [completedToday, setCompletedToday] = useState<{name: string, scoreStr: string, chapterId?: string, chapterTitle?: string, subjectName?: string}[]>([]);
    const [completedYesterday, setCompletedYesterday] = useState<{name: string, scoreStr: string, chapterId?: string, chapterTitle?: string, subjectName?: string}[]>([]);
    const [mistakesHistory, setMistakesHistory] = useState<any[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                // Merge user.mcqHistory with nst_user_history (Saved Notes)
                const mergedMap = new Map<string, any>();
                (user.mcqHistory || []).forEach(h => {
                    if (h.id) mergedMap.set(h.id, h);
                });

                try {
                    const savedNotes = await storage.getItem<any[]>('nst_user_history') || [];
                    savedNotes.forEach((note: any) => {
                        if (note.analytics && note.analytics.id) {
                            mergedMap.set(note.analytics.id, note.analytics);
                        } else if (note.type === 'REVISION_NOTES' && note.id) {
                            mergedMap.set(note.id, note);
                        }
                    });
                } catch(e) {}

                const history = Array.from(mergedMap.values());

            const topicMap = new Map<string, TopicItem>();

            // Sort history chronologically (oldest first)
            const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Tracking Map: UniqueID -> { status, score, lastMcqDate, lastRevDate, excellentCount, totalQs, totalCorrect }
            const trackingMap = new Map<string, {
                status: TopicStatus,
                score: number,
                lastMcqDate: string,
                lastRevDate: string | null,
                excellentCount: number,
                totalQs: number,
                totalCorrect: number,
                cycleCount: number
            }>();

            sortedHistory.forEach(result => {
                const isNoteRevision = (result as any).type === 'REVISION_NOTES';
                const attemptDate = result.date;

                // Helper to process a subtopic
                const processSubTopic = (name: string, reportedStatus?: TopicStatus, scorePct?: number, qCount?: number, correct?: number) => {
                    // Normalize ID
                    const uniqueId = `${result.chapterId}_${name.trim()}`;

                    let current = trackingMap.get(uniqueId) || {
                        status: 'AVERAGE',
                        score: 0,
                        lastMcqDate: '',
                        lastRevDate: null,
                        excellentCount: 0,
                        totalQs: 0,
                        totalCorrect: 0,
                        cycleCount: 0
                    };

                    if (isNoteRevision) {
                        current.lastRevDate = attemptDate;
                    } else {
                        current.lastMcqDate = attemptDate;
                        current.cycleCount += 1;

                        const questionsInThisAttempt = qCount !== undefined ? qCount : result.totalQuestions;
                        const correctInThisAttempt = correct !== undefined ? correct : result.correctCount;

                        current.totalQs = questionsInThisAttempt;
                        current.totalCorrect = correctInThisAttempt;

                        // OVERRIDE: Check Global Topic Strength if available (ONLY IF ALL_TIME MODE)
                        let percentage = current.totalQs > 0 ? (current.totalCorrect / current.totalQs) * 100 : 0;

                        if (scoreViewMode === 'ALL_TIME' && user.topicStrength && user.topicStrength[name.trim()]) {
                             const s = user.topicStrength[name.trim()];
                             if (s.total > 0) {
                                 percentage = (s.correct / s.total) * 100;
                                 current.totalQs = s.total; // Sync total
                                 current.totalCorrect = s.correct;
                             }
                        }

                        current.score = percentage;

                        const thisAttemptPct = scorePct !== undefined ? scorePct : (questionsInThisAttempt > 0 ? (correctInThisAttempt / questionsInThisAttempt) * 100 : 0);

                        // Smart Streak Tracking (Exponential Backoff)
                        if (thisAttemptPct >= thresholds.mastery) {
                            current.excellentCount = (current.excellentCount || 0) + 1;
                        } else if (thisAttemptPct < thresholds.average) {
                            current.excellentCount = 0; // Reset streak on failure
                        }

                        if (reportedStatus) {
                            current.status = reportedStatus;
                        } else {
                            if (percentage >= thresholds.mastery) current.status = 'EXCELLENT';
                            else if (percentage >= thresholds.strong) current.status = 'STRONG';
                            else if (percentage >= thresholds.average) current.status = 'AVERAGE';
                            else current.status = 'WEAK';
                        }
                    }
                    trackingMap.set(uniqueId, current);

                    let nextRev: string | null = null;
                    let mcqDue: string | null = null;

                    const lastActionWasRevision = current.lastRevDate && new Date(current.lastRevDate).getTime() > new Date(current.lastMcqDate).getTime();

                    // SMART INTERVAL SCALING (Exponential Backoff)
                    const getSmartInterval = (baseSeconds: number, streak: number) => {
                        if (streak <= 1) return baseSeconds;
                        // Multiplier: 1.5x for each streak level beyond 1
                        // e.g. Streak 2 -> 1.5x, Streak 3 -> 2.25x
                        const multiplier = Math.pow(1.5, streak - 1);
                        return Math.floor(baseSeconds * multiplier);
                    };

                    const getIntervalsForStatus = (status: TopicStatus) => {
                        if (status === 'WEAK') return intervals.weak;
                        if (status === 'AVERAGE') return intervals.average;
                        return intervals.strong;
                    };

                    const baseIntervals = getIntervalsForStatus(current.status);

                    // Apply Scaling based on Streak
                    const scaledRevision = getSmartInterval(baseIntervals.revision, current.excellentCount);
                    const scaledMcq = getSmartInterval(baseIntervals.mcq, current.excellentCount);

                    if (lastActionWasRevision) {
                        const date = new Date(current.lastRevDate!);
                        date.setSeconds(date.getSeconds() + scaledMcq);
                        mcqDue = date.toISOString();
                    } else {
                        const date = new Date(current.lastMcqDate);
                        date.setSeconds(date.getSeconds() + scaledRevision);
                        nextRev = date.toISOString();
                    }

                    topicMap.set(uniqueId, {
                        id: uniqueId,
                        chapterId: result.chapterId,
                        chapterName: result.chapterTitle || 'Unknown Chapter',
                        name: name,
                        score: current.score,
                        lastAttempt: result.date,
                        status: current.status,
                        nextRevision: nextRev,
                        mcqDueDate: mcqDue,
                        subjectId: result.subjectId, // Pass ID
                        subjectName: result.subjectName,
                        isSubTopic: true,
                        // Pass Aggregates
                        totalQs: current.totalQs,
                        totalCorrect: current.totalCorrect,
                        cycleCount: current.cycleCount // NEW: Cycle Count
                    });
                };

                // 1. Try Parse Ultra Report
                if (result.ultraAnalysisReport) {
                    try {
                        const parsed = JSON.parse(result.ultraAnalysisReport);
                        if (parsed.topics && Array.isArray(parsed.topics)) {
                            // If topics breakdown available, we should ideally use that.
                            // But for now, we attribute the FULL test score to each subtopic mentioned,
                            // or better, treat them as individual mini-results if data allows.
                            // Given current data structure, we might not have per-topic Q/Correct counts here easily without deeper parsing.
                            // Falling back to Chapter Level attribution for Q counts to avoid skewing logic.
                            parsed.topics.forEach((t: any) => {
                                let s: TopicStatus = 'AVERAGE';
                                if (t.status === 'WEAK') s = 'WEAK';
                                else if (t.status === 'STRONG') s = 'STRONG';
                                else if (t.status === 'EXCELLENT') s = 'EXCELLENT';

                                // Use specific stats if available
                                const pct = t.percent !== undefined ? t.percent : undefined;
                                const total = t.total !== undefined ? t.total : undefined;
                                const correct = t.correct !== undefined ? t.correct : undefined;

                                processSubTopic(t.name, s, pct, total, correct);
                            });
                            return;
                        }
                    } catch (e) {}
                }

                // 1.5 Try Topic Analysis directly if ultra analysis wasn't parsed
                if (!isNoteRevision && result.topicAnalysis) {
                    try {
                        const topics = Object.keys(result.topicAnalysis);
                        if (topics.length > 0) {
                            topics.forEach(topicName => {
                                const analysis = result.topicAnalysis![topicName];
                                const percentage = analysis.percentage || 0;
                                let s: TopicStatus = 'WEAK';
                                if (percentage >= thresholds.mastery) s = 'EXCELLENT';
                                else if (percentage >= thresholds.strong) s = 'STRONG';
                                else if (percentage >= thresholds.average) s = 'AVERAGE';
                                processSubTopic(topicName, s, percentage, analysis.total, analysis.correct);
                            });
                            return;
                        }
                    } catch (e) {}
                }

                // 2. Fallback (Chapter Level)
                const percentage = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
                let status: TopicStatus | undefined = undefined;

                if (!isNoteRevision) {
                    if (percentage >= thresholds.mastery) status = 'EXCELLENT';
                    else if (percentage >= thresholds.strong) status = 'STRONG';
                    else if (percentage >= thresholds.average) status = 'AVERAGE';
                    else status = 'WEAK';
                }

                processSubTopic(result.chapterTitle || 'Chapter', status, percentage, result.totalQuestions, result.correctCount);
            });

            // Calculate priorities
            const getPriority = (item: TopicItem) => {
                const date = new Date(item.nextRevision || item.mcqDueDate || item.lastAttempt).getTime();
                const now = Date.now();
                const daysOverdue = Math.max(0, (now - date) / (1000 * 60 * 60 * 24));
                const scoreWeight = (100 - (item.score || 0)) * 2;
                const timeWeight = daysOverdue * 10;
                let statusWeight = 0;
                if (item.status === 'WEAK') statusWeight = 500;
                else if (item.status === 'AVERAGE') statusWeight = 200;
                return scoreWeight + timeWeight + statusWeight;
            };

            // Set Processed Topics State
            const finalTopics = Array.from(topicMap.values()).sort((a, b) => getPriority(b) - getPriority(a));
            setProcessedTopics(finalTopics);

            // Populate Today, Yesterday, and Mistakes
            const todayStr = new Date().toDateString();
            const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

                const rawTodayList = history
                    .filter(h => new Date(h.date).toDateString() === todayStr && (h as any).type === 'REVISION_NOTES')
                    .map(h => {
                        let name = h.chapterTitle || 'Topic';
                        if (h.ultraAnalysisReport) {
                            try {
                                const parsed = JSON.parse(h.ultraAnalysisReport);
                                if (parsed.topics && parsed.topics.length > 0) name = parsed.topics[0].name;
                            } catch(e) {}
                        }
                        return {
                            name,
                            scoreStr: `${Math.round(h.score || 0)}%`,
                            chapterId: h.chapterId,
                            chapterTitle: h.chapterTitle,
                            subjectName: h.subjectName
                        };
                    });

                const uniqueToday = [];
                const seenToday = new Set();
                for (const item of rawTodayList) {
                    const key = `${item.chapterId}_${item.name}`;
                    if (!seenToday.has(key)) {
                        seenToday.add(key);
                        uniqueToday.push(item);
                    }
                }
                setCompletedToday(uniqueToday);

                const rawYesterdayList = history
                    .filter(h => new Date(h.date).toDateString() === yesterdayStr && (h as any).type === 'REVISION_NOTES')
                    .map(h => {
                        let name = h.chapterTitle || 'Topic';
                        if (h.ultraAnalysisReport) {
                            try {
                                const parsed = JSON.parse(h.ultraAnalysisReport);
                                if (parsed.topics && parsed.topics.length > 0) name = parsed.topics[0].name;
                            } catch(e) {}
                        }
                        return {
                            name,
                            scoreStr: `${Math.round(h.score || 0)}%`,
                            chapterId: h.chapterId,
                            chapterTitle: h.chapterTitle,
                            subjectName: h.subjectName
                        };
                    });

                const uniqueYesterday = [];
                const seenYesterday = new Set();
                for (const item of rawYesterdayList) {
                    const key = `${item.chapterId}_${item.name}`;
                    if (!seenYesterday.has(key)) {
                        seenYesterday.add(key);
                        uniqueYesterday.push(item);
                    }
                }
                setCompletedYesterday(uniqueYesterday);

                const mistakes = history
                    .filter(h => h.wrongQuestions && h.wrongQuestions.length > 0)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setMistakesHistory(mistakes);

            } catch (e) {
                console.error("Revision Hub Processing Error:", e);
                setProcessedTopics([]);
            }
        };

        loadHistory();
    }, [user.mcqHistory, user.id, scoreViewMode]); // Update when state triggers

    useEffect(() => {
        let isMounted = true;

        const expandTopics = async () => {
            if (isMounted) setTopics(processedTopics);
            // If there are too many topics (> 20), do not attempt to deep-expand all of them at once via network
            // as it will freeze the app. We just show chapter level.
            if (processedTopics.length > 20) return;

            // Parallel Processing for Speed
            const expandedResults = await Promise.all(processedTopics.map(async (topic) => {
                const isChapterLevel = topic.name === topic.chapterName;
                if (!isChapterLevel) return [topic];

                try {
                    const board = user.board || 'CBSE';
                    const classLevel = user.classLevel || '10';
                    const streamKey = (classLevel === '11' || classLevel === '12') && user.stream ? `-${user.stream}` : '';
                    const subject = topic.subjectName || 'Unknown';
                    const strictKey = `nst_content_${board}_${classLevel}${streamKey}_${subject}_${topic.chapterId}`;

                    let data: any = await storage.getItem(strictKey);
                    if (!data) {
                        // Fast fetch: Only fetch strictKey from cloud first to avoid double network hits.
                        // We do not await legacy parallel unless strict fails to save massive network time.
                        data = await getChapterData(strictKey).catch(() => null);
                        if (!data) {
                             data = await getChapterData(topic.chapterId).catch(() => null);
                        }

                        // Cache it immediately so next render is 0ms
                        if (data) {
                            storage.setItem(strictKey, data).catch(() => {});
                        }
                    }

                    if (data) {
                        const subTopics = new Set<string>();
                        if (data.topicNotes && Array.isArray(data.topicNotes)) {
                            data.topicNotes.forEach((n: any) => { if (n.topic) subTopics.add(n.topic.trim()); });
                        }
                        if (subTopics.size === 0 && data.manualMcqData) {
                            data.manualMcqData.forEach((q: any) => { if (q.topic) subTopics.add(q.topic.trim()); });
                        }

                        if (subTopics.size > 0) {
                            const newSubTopics: TopicItem[] = [];
                            subTopics.forEach(subName => {
                                const exists = processedTopics.some(t => t.chapterId === topic.chapterId && t.name === subName);
                                let subNotesCount = 0;
                                if (data.topicNotes) {
                                    subNotesCount = data.topicNotes.filter((n: any) => n.topic && n.topic.trim() === subName).length;
                                }

                                if (!exists) {
                                    newSubTopics.push({
                                        ...topic,
                                        id: `${topic.chapterId}_${subName}`,
                                        name: subName,
                                        isSubTopic: true,
                                        notesCount: subNotesCount
                                    });
                                }
                            });
                            return newSubTopics;
                        } else {
                            if (data.topicNotes) topic.notesCount = data.topicNotes.length;
                        }
                    }
                } catch (e) {
                    console.error("Error expanding chapter:", e);
                }
                return [topic];
            }));

            if (isMounted) {
                const flattened = expandedResults.flat();

                // STRICT DEDUPLICATION (Fix for "2 baar dikh raha hai")
                const uniqueMap = new Map<string, TopicItem>();
                flattened.forEach(item => {
                    // Use a composite key or just ID if robust
                    const semanticKey = `${item.chapterId}_${item.name.trim().toLowerCase()}`;

                    if (!uniqueMap.has(semanticKey)) {
                        uniqueMap.set(semanticKey, item);
                    }
                });
                const uniqueTopics = Array.from(uniqueMap.values());

                setTopics(uniqueTopics);
            }
        };

        expandTopics();

        return () => { isMounted = false; };
    }, [processedTopics, user.board, user.classLevel, user.stream]);

    // --- HELPER FUNCTIONS ---

    const getTimeUntil = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        const now = new Date();
        const target = new Date(dateStr);
        const diff = target.getTime() - now.getTime();

        if (diff <= 0) return "Ready";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h`;
    };

    const getCleanDisplayName = (topicName: string, mainTopicName: string, subjectName?: string) => {
        if (!topicName || typeof topicName !== 'string') return 'Unknown Topic';
        let cleanName = topicName.trim();

        // Helper to strip prefix case-insensitively
        const stripPrefix = (str: string, prefix: string) => {
            if (!str || typeof str !== 'string' || !prefix || typeof prefix !== 'string') return str;
            if (str.toLowerCase().startsWith(prefix.toLowerCase())) {
                let rest = str.substring(prefix.length);
                // Remove common separators
                return rest.replace(/^[\s\-:|–>]+/, '').trim();
            }
            return str;
        };

        if (subjectName) cleanName = stripPrefix(cleanName, subjectName);
        if (mainTopicName) cleanName = stripPrefix(cleanName, mainTopicName);

        return cleanName || topicName;
    };






    // WEEKLY BREAKDOWN GROUPING (New Request)
    const getWeeklyBreakdown = (filteredTopics: TopicItem[]) => {
        const weeks: Record<string, TopicItem[]> = {
            'Week 1': [],
            'Week 2': [],
            'Week 3': [],
            'Week 4': [],
            'Week 5+': []
        };

        const nowTime = new Date().getTime();

        // Sort by Score Ascending (Weakest First)
        const sortedTopics = [...filteredTopics].sort((a, b) => a.score - b.score);

        sortedTopics.forEach(t => {
            const dueDate = t.nextRevision || t.mcqDueDate || t.lastAttempt; // Fallback to last attempt if no due date
            if (!dueDate) return;

            const dueTime = new Date(dueDate).getTime();
            const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));

            // Grouping Logic
            if (diffDays <= 7) weeks['Week 1'].push(t); // Includes Overdue
            else if (diffDays <= 14) weeks['Week 2'].push(t);
            else if (diffDays <= 21) weeks['Week 3'].push(t);
            else if (diffDays <= 28) weeks['Week 4'].push(t);
            else weeks['Week 5+'].push(t);
        });

        // Clean up empty weeks
        Object.keys(weeks).forEach(key => {
            if (weeks[key].length === 0) delete weeks[key];
        });

        return weeks;
    };

    const totalTopics = topics.length;
    // We include all topics in the strength breakdown so the numbers perfectly match what's visible in the tabs
    const strongTopics = topics.filter(t => t.status === 'EXCELLENT' || t.status === 'STRONG').length;
    const weakTopics = topics.filter(t => t.status === 'WEAK').length;
    const averageTopics = topics.filter(t => t.status === 'AVERAGE').length;
    const excellentTopics = topics.filter(t => t.status === 'EXCELLENT').length;
    const strongOnlyTopics = topics.filter(t => t.status === 'STRONG').length;
    const masteryScore = totalTopics > 0 ? Math.round((strongTopics / totalTopics) * 100) : 0;

    const donutChartData = [
        { name: 'Weak', value: weakTopics, color: '#ef4444', filterId: 'WEAK' as const }, // red-500
        { name: 'Average', value: averageTopics, color: '#f97316', filterId: 'AVERAGE' as const }, // orange-500
        { name: 'Strong', value: strongOnlyTopics, color: '#22c55e', filterId: 'STRONG' as const }, // green-500
        { name: 'Mastery', value: excellentTopics, color: '#3b82f6', filterId: 'EXCELLENT' as const }, // blue-500
    ];

    // TTS LOGIC (Updated for Weekly View)
    const handleReadPage = (weeks: Record<string, TopicItem[]>) => {
        let textToSpeak = "";

        try {
            Object.keys(weeks).forEach(week => {
                textToSpeak += `${week}. `;
                weeks[week].forEach(t => {
                     textToSpeak += `${getCleanDisplayName(t.name, t.chapterName, t.subjectName)}. Score ${Math.round(t.score)} percent. `;
                });
            });

            if (textToSpeak) {
                console.log("Reading Page Content:", textToSpeak);
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.rate = ttsRate; // USE STATE RATE

                // Voice Selection (Prefer Google/Microsoft English)
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v =>
                    v.name.includes('Google US English') ||
                    v.name.includes('Microsoft Zira') ||
                    v.lang.startsWith('en')
                );
                if (preferredVoice) utterance.voice = preferredVoice;

                utterance.onerror = (e) => console.error("TTS Error:", e);
                window.speechSynthesis.speak(utterance);
            } else {
                setAlertConfig({isOpen: true, type: 'INFO', message: "Nothing to read on this page."});
            }
        } catch (e) {
            console.error("TTS Preparation Failed:", e);
            setAlertConfig({isOpen: true, type: 'ERROR', message: "Failed to start audio reader."});
        }
    };

    // NEW: Handle AI Plan Generation (Placeholder for now)
    const handleGenerateAiPlan = () => {
        setAlertConfig({
            isOpen: true,
            type: 'INFO',
            title: 'AI Study Plan',
            message: 'AI Personalized Plans are coming soon! Stay tuned.'
        });
    };

    // SUBSCRIPTION LOGIC
    const isFreeUser = user.subscriptionTier === 'FREE';
    // For Hub Access logic:
    // Free Mode: Visible but restricted features.
    // Premium Mode: Visible with all features.
    // Only blocked if Level System locks it entirely.

    const handleTopicClick = (t: TopicItem) => {
        if (hubMode === 'FREE') {
            setAlertConfig({
                isOpen: true,
                type: 'INFO',
                title: 'Free Mode Restriction',
                message: `📖 In Free Mode, we tell you WHAT to study ("${t.name}").\nTo access deep content, analysis, and instant revision tools, switch to Premium Mode.`
            });
            return;
        }

        // Logic for Basic User (Sundays Only) - Preserved if relevant, but user wants clear Free/Premium split now.
        // Assuming Premium Mode covers Basic/Ultra logic.
        if (user.subscriptionLevel === 'BASIC' && now.getDay() !== 0 && hubMode === 'PREMIUM') {
             setAlertConfig({
                isOpen: true,
                type: 'INFO',
                title: 'Basic Plan Restriction',
                message: 'Basic users can only access Premium Revision Content on Sundays. Upgrade to Ultra for daily access.'
            });
            return;
        }

        if (onNavigateContent) {
            onNavigateContent('PDF', t.chapterId, t.name, t.subjectName);
        }
    };

     const handleUndoRevision = (topicName: string, chapterId: string) => {
        const history = [...(user.mcqHistory || [])];
        const entryIndex = history.findIndex(h => {
            const isToday = new Date(h.date).toDateString() === todayStr;
            const isRevision = (h as any).type === 'REVISION_NOTES';
            let topicMatch = false;
            if (h.ultraAnalysisReport) {
                try {
                    const parsed = JSON.parse(h.ultraAnalysisReport);
                    if (parsed.topics?.some((t: any) => t.name === topicName)) topicMatch = true;
                } catch(e) {}
            } else {
                if (h.chapterTitle === topicName) topicMatch = true;
            }
            return isToday && isRevision && topicMatch;
        });

        if (entryIndex !== -1) {
            history.splice(entryIndex, 1);
            const updatedUser = { ...user, mcqHistory: history };
            if (onUpdateUser) {
                onUpdateUser(updatedUser);
                saveUserToLive(updatedUser);
                setAlertConfig({isOpen: true, type: 'SUCCESS', message: `Undid revision for ${topicName}`});
            }
        }
    };

    // LEVEL LOCK VIEW
    if (isLevelLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center animate-in fade-in">
                <div className="bg-slate-100 p-6 rounded-full mb-6 relative">
                    <BrainCircuit size={64} className="text-slate-500" />
                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-2 rounded-full border-4 border-white">
                        <Lock size={20} />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Revision Hub Locked</h2>
                <p className="text-slate-600 mb-6 max-w-xs">
                    This advanced feature unlocks at <span className="font-bold text-indigo-600">Level {requiredLevel}</span>.
                    Keep learning to level up!
                </p>
                <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase">Current Level</p>
                    <p className="text-3xl font-black text-slate-800">{userLevel} <span className="text-sm text-slate-500 font-medium">/ {requiredLevel}</span></p>
                </div>
            </div>
        );
    }

    return (
        <div onScroll={handleScroll} className="space-y-4 px-4 pt-2 pb-32 animate-in fade-in relative h-[calc(100vh-80px)] overflow-y-auto">

            {/* PROFESSIONAL HEADER CARD & CONTROLS */}
            <div className="bg-slate-900 rounded-[2rem] p-5 sm:p-6 relative overflow-hidden shadow-xl mb-6 z-10">
                {/* Decorative Elements */}
                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-[-30px] left-[-20px] w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col gap-6">
                    {/* Greeting & Briefing */}
                    <div className="flex items-start gap-4">
                        <div className="bg-white/10 p-3 sm:p-3.5 rounded-2xl backdrop-blur-md border border-white/20 text-white shrink-0 shadow-sm">
                            <BrainCircuit size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 leading-tight">
                                Hello, {user.name?.split(' ')[0] || 'Student'}! 👋
                            </h1>
                            <p className="text-xs sm:text-sm text-indigo-100 font-medium mt-1 opacity-90 leading-relaxed">
                                You have <span className="font-black text-white px-0.5">{pendingNotes.length} notes</span> to read and <span className="font-black text-white px-0.5">{pendingMcqs.length} MCQs</span> pending.
                            </p>
                        </div>
                    </div>

                    {/* INLINE CONTROLS (LATEST SCORE | PREMIUM | FREE HUB) */}
                    <div className="flex flex-col gap-2.5 w-full mt-2">
                        {/* Row 1: Content Mode and Score Mode Toggle */}
                        <div className="flex items-center gap-2.5 w-full">
                            {(() => {
                                const isFreeUser = user.subscriptionTier === 'FREE';
                                const isBasicUser = user.subscriptionLevel === 'BASIC';
                                const isSunday = new Date().getDay() === 0;

                                let showPremium = false;
                                let showFree = false;

                                if (user.role === 'ADMIN' || user.isSubAdmin || (user.subscriptionTier !== 'FREE' && user.subscriptionLevel !== 'BASIC')) {
                                    showPremium = true;
                                } else if (isBasicUser) {
                                    if (isSunday) showPremium = true;
                                    else showFree = true;
                                } else if (isFreeUser) {
                                    showFree = true;
                                }

                                return (
                                    <>
                                        {showPremium && (
                                            <button
                                                onClick={() => setHubMode('PREMIUM')}
                                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                                    hubMode === 'PREMIUM'
                                                    ? 'bg-gradient-to-r from-[#9b66ff] to-[#bd8cff] shadow-md text-white'
                                                    : 'bg-[#9b66ff]/20 text-[#9b66ff] border border-[#9b66ff]/40'
                                                }`}
                                            >
                                                <Crown size={14} className={hubMode === 'PREMIUM' ? 'text-yellow-300' : 'text-[#9b66ff]'} /> PREMIUM
                                            </button>
                                        )}

                                        {showFree && (
                                            <button
                                                onClick={() => setHubMode('FREE')}
                                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                                    hubMode === 'FREE'
                                                    ? 'bg-white/10 border border-white/20 text-white'
                                                    : 'bg-transparent border border-white/20 text-white/70 hover:text-white'
                                                }`}
                                            >
                                                <BookOpen size={14} /> FREE
                                            </button>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Score Mode Toggle */}
                            <button
                                onClick={() => setScoreViewMode(prev => prev === 'LATEST' ? 'ALL_TIME' : 'LATEST')}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center ${
                                    scoreViewMode === 'LATEST'
                                    ? 'bg-gradient-to-r from-[#7a64ff] to-[#9988ff] text-white shadow-md'
                                    : 'bg-gradient-to-r from-[#9b66ff] to-[#bd8cff] text-white shadow-md'
                                }`}
                            >
                                {scoreViewMode === 'LATEST' ? 'LATEST SCORE' : 'AVG SCORE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB SYSTEM (Overview vs Topic Strength) */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-6 relative z-10 w-full overflow-x-auto no-scrollbar">
                <div className="flex min-w-max w-full gap-1">
                    <button
                        onClick={() => setActiveFilter('TODAY')}
                        className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            activeFilter === 'TODAY' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-600'
                        }`}
                    >
                        <Layout size={18} /> Self Study
                    </button>
                    <button
                        onClick={() => setActiveFilter('WEAK')} // Default entry for strength view
                        className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            ['WEAK', 'AVERAGE', 'STRONG', 'EXCELLENT'].includes(activeFilter) ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-600'
                        }`}
                    >
                        <TrendingUp size={18} /> Topic Strength
                    </button>
                </div>
            </div>

            {/* SUB-TABS FOR TOPIC STRENGTH - Hidden as per user request to use the Chart exclusively */}

            {/* --- STATS OVERVIEW CHART (Only when looking at Topic Strength) --- */}
            {['WEAK', 'AVERAGE', 'STRONG', 'EXCELLENT'].includes(activeFilter) && (
                <RevisionDonutChart activeFilter={activeFilter}
                    data={donutChartData}
                    onSegmentClick={(filterId) => {
                        setActiveFilter(filterId);
                    }}
                />
            )}

            {/* SESSIONS */}
            {showTodayRevisionSession && hubMode === 'PREMIUM' && (
                <TodayRevisionView
                    user={user}
                    topics={pendingNotes}
                    onClose={() => setShowTodayRevisionSession(false)}
                    onComplete={(completed) => {
                        const newHistoryEntries = completed.map(t => ({
                            id: `rev-note-${Date.now()}-${t.id}`,
                            userId: user.id,
                            chapterId: t.chapterId,
                            subjectId: t.subjectId || 'REV_ID',
                            subjectName: t.subjectName || 'Revision',
                            chapterTitle: t.chapterName,
                            date: new Date().toISOString(),
                            type: 'REVISION_NOTES',
                            score: t.score,
                            totalQuestions: 0,
                            correctCount: 0,
                            wrongCount: 0,
                            totalTimeSeconds: 0,
                            averageTimePerQuestion: 0,
                            performanceTag: 'GOOD' as any,
                            ultraAnalysisReport: JSON.stringify({
                                topics: [{ name: t.name, status: t.status }]
                            })
                        }));
                         // @ts-ignore
                        const updatedHistory = [...(user.mcqHistory || []), ...newHistoryEntries];
                        const updatedUser = { ...user, mcqHistory: updatedHistory };
                        if (onUpdateUser) {
                            onUpdateUser(updatedUser);
                            saveUserToLive(updatedUser);
                        }
                        setShowTodayRevisionSession(false);
                    }}
                />
            )}

             {showTodayMcqSession && hubMode === 'PREMIUM' && (
                <TodayMcqSession
                    user={user}
                    topics={pendingMcqs}
                    onClose={() => setShowTodayMcqSession(false)}
                    onComplete={(results, questions) => {
                        try {
                            // Prepend new results so they reflect immediately in history
                            const updatedHistory = [...results, ...(user.mcqHistory || [])];
                            let updatedUser = { ...user, mcqHistory: updatedHistory };

                            // Update global topicStrength to correctly categorize topics in Revision Hub buckets
                            if (!updatedUser.topicStrength) updatedUser.topicStrength = {};
                            if (!updatedUser.progress) updatedUser.progress = {};

                            results.forEach(result => {
                                if (result.topicAnalysis) {
                                    Object.keys(result.topicAnalysis).forEach(topicName => {
                                        const analysis = result.topicAnalysis![topicName];
                                        const currentStats = updatedUser.topicStrength![topicName] || { correct: 0, total: 0 };
                                        updatedUser.topicStrength![topicName] = {
                                            correct: currentStats.correct + analysis.correct,
                                            total: currentStats.total + analysis.total
                                        };

                                        // Update MCQ Due Date based on performance
                                        const subjectId = result.subjectId;
                                        const chapterId = result.chapterId;
                                        if (subjectId && chapterId && topicName) {
                                            if (!updatedUser.progress[subjectId]) updatedUser.progress[subjectId] = { chapters: {} };
                                            if (!updatedUser.progress[subjectId].chapters[chapterId]) updatedUser.progress[subjectId].chapters[chapterId] = { status: 'NOT_STARTED', topics: {} };

                                            const chapterProgress = updatedUser.progress[subjectId].chapters[chapterId];
                                            if (!chapterProgress.topics[topicName]) {
                                                chapterProgress.topics[topicName] = { status: 'COMPLETED' };
                                            }

                                            const topicProg = chapterProgress.topics[topicName];

                                            // Calculate next dates based on percentage
                                            const percent = analysis.percentage;
                                            let statusType: 'weak' | 'average' | 'strong' | 'mastered' = 'average';
                                            if (percent >= 80) statusType = 'strong';
                                            else if (percent < 50) statusType = 'weak';

                                            const currentIntervals = settings?.revisionConfig?.intervals || intervals;
                                            const now = Date.now();
                                            topicProg.mcqDueDate = new Date(now + currentIntervals[statusType].mcq * 1000).toISOString();
                                            topicProg.nextRevision = new Date(now + currentIntervals[statusType].revision * 1000).toISOString();
                                        }
                                    });
                                }
                            });

                            if (onUpdateUser) {
                                onUpdateUser(updatedUser);
                                // Fire and forget save to avoid UI blocking
                                saveUserToLive(updatedUser).catch(e => console.error("Save Error:", e));
                            }
                        } catch (e) {
                            console.error("Completion Error:", e);
                        }
                        setShowTodayMcqSession(false);

                        // Show Marksheet for all completed topics instantly
                        if (results.length > 0) {
                            setCompletedMcqResults(results);
                            if (questions) setCompletedMcqQuestions(questions);
                            setShowCompletedMarksheets(true);
                        }
                    }}
                />
            )}

            {/* Completed Marksheets Overlay */}
            {showCompletedMarksheets && completedMcqResults.length > 0 && (
                <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                        <h2 className="text-lg font-black text-slate-800">Session Analysis</h2>
                        <button
                            onClick={() => setShowCompletedMarksheets(false)}
                            className="bg-slate-200 p-2 rounded-full text-slate-600 hover:bg-slate-300 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 space-y-6 pb-4">
                        {completedMcqResults.map((result, idx) => (
                            <MarksheetCard
                                key={result.id || idx}
                                result={result}
                                user={user}
                                questions={completedMcqQuestions} // Use the accumulated session questions
                                onClose={() => setShowCompletedMarksheets(false)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {showReport && (
                <MonthlyMarksheet
                    user={user}
                    onClose={() => setShowReport(false)}
                    reportType="MONTHLY"
                    settings={settings}
                />
            )}

            <CustomAlert
                isOpen={alertConfig.isOpen}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig(prev => ({...prev, isOpen: false}))}
            />

            {/* --- MAIN CONTENT AREA --- */}

            {/* 1. TODAY VIEW */}
            {activeFilter === 'TODAY' && (
                 <div className="relative z-10 space-y-6">
                    {/* NOTES SECTION */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                <BookOpen className="text-[var(--primary)]" size={20} /> Pending Notes
                            </h3>
                            {/* FREE MODE INDICATOR */}
                            {hubMode === 'FREE' && pendingNotes.length > 0 && (
                                <div className="text-[10px] font-bold text-slate-500 italic bg-slate-100 px-2 py-1 rounded">
                                    Self Study List
                                </div>
                            )}
                        </div>
                         {pendingNotes.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-xs font-bold">No notes due.</div>
                        ) : (
                             <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-black text-slate-800 mb-2">Today's Tasks</h4>
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {pendingNotes.map((t, i) => {
                                            const cacheKey = `${t.chapterId}__${t.name}`;
                                            const noteHtml = pendingNotesContent[cacheKey];
                                            const isLoading = noteHtml === undefined;
                                            const hasContent = !!(noteHtml && noteHtml.trim());
                                            const isExpanded = expandedPendingNote === cacheKey;
                                            return (
                                                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedPendingNote(isExpanded ? null : cacheKey)}
                                                        className="w-full flex items-start justify-between gap-2 text-left"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className="font-bold text-slate-700 text-sm break-words">{t.name}</h5>
                                                            {t.chapterName && (
                                                                <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5 truncate">{t.chapterName}</p>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                                            {isLoading ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : hasContent ? (
                                                                <>
                                                                    <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Read'}</span>
                                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                </>
                                                            ) : (
                                                                <span className="text-orange-500 italic">No notes</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                    {isExpanded && hasContent && (
                                                        <div
                                                            className="prose prose-sm prose-slate max-w-none text-justify mt-3 pt-3 border-t border-slate-200 text-slate-700 animate-in fade-in slide-in-from-top-1 duration-200"
                                                            dangerouslySetInnerHTML={{ __html: noteHtml }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="w-full pt-2">
                                    <button
                                        onClick={() => {
                                            if (hubMode === 'FREE') {
                                                setAlertConfig({
                                                    isOpen: true,
                                                    type: 'INFO',
                                                    title: 'Locked Content',
                                                    message: 'Notes and MCQs are locked in Free Mode. Upgrade to Premium to start revising.'
                                                });
                                                return;
                                            }
                                            if (user.subscriptionLevel === 'BASIC' && now.getDay() !== 0) {
                                                setAlertConfig({isOpen: true, type: 'INFO', title: 'Sunday Only', message: 'Basic Plan allows revision sessions only on Sundays.'});
                                            } else {
                                                setShowTodayRevisionSession(true);
                                            }
                                        }}
                                        className={`w-full py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 ${
                                            hubMode === 'FREE'
                                            ? 'bg-slate-200 text-slate-600 cursor-not-allowed shadow-none'
                                            : 'bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700'
                                        }`}
                                    >
                                        {hubMode === 'FREE' ? <Lock size={18} /> : <BookOpen size={18} />}
                                        {hubMode === 'FREE' ? 'Content Locked' : 'Read All Notes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PENDING MCQs (Premium Only) */}
                    {hubMode === 'PREMIUM' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                    <CheckSquare className="text-purple-600" size={20} /> Pending MCQs
                                </h3>
                            </div>
                            {pendingMcqs.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs font-bold">No MCQs due.</div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 mb-3">Practice List</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {pendingMcqs.map((t, i) => {
                                                return (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-shadow">
                                                        <div>
                                                            <h5 className="font-bold text-slate-700 text-sm">{getCleanDisplayName(t.name, t.chapterName, t.subjectName)}</h5>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">{t.chapterName}</p>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-md">
                                                            MCQ Set
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="w-full pt-2">
                                        <button
                                            onClick={() => {
                                                if (user.subscriptionLevel === 'BASIC' && now.getDay() !== 0) {
                                                    setAlertConfig({isOpen: true, type: 'INFO', title: 'Sunday Only', message: 'Basic Plan allows revision sessions only on Sundays.'});
                                                } else {
                                                    setShowTodayMcqSession(true);
                                                }
                                            }}
                                            className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                        >
                                            <PlayCircle size={18} /> Start MCQ Session
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                                        {/* COMPLETED TODAY */}
                    <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 transition-all">
                        <div
                            onClick={() => completedToday.length > 0 && setShowCompletedHistory(!showCompletedHistory)}
                            className={`flex justify-between items-center ${completedToday.length > 0 ? 'cursor-pointer' : 'opacity-70'}`}
                        >
                            <h3 className="font-black text-slate-600 text-sm flex items-center gap-2">
                                <CheckCircle size={16} className={completedToday.length > 0 ? "text-green-500" : "text-slate-400"} />
                                Completed Today ({completedToday.length})
                            </h3>
                            {completedToday.length > 0 && (showCompletedHistory ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />)}
                        </div>

                        {completedToday.length === 0 && (
                            <div className="text-center py-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                No tasks completed today
                            </div>
                        )}

                        {showCompletedHistory && completedToday.length > 0 && (
                            <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-2">
                                {completedToday.map((t, i) => (
                                    <div key={i} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity">
                                        <div>
                                            <h4 className="font-bold text-slate-700 text-xs">{getCleanDisplayName(t.name, t.chapterTitle || '', t.subjectName)}</h4>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUndoRevision(t.name, t.chapterId);
                                            }}
                                            className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold hover:bg-red-100 flex items-center gap-1"
                                        >
                                            <XCircle size={12} /> Undo
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* YESTERDAY REPORT (Premium Only) */}
                    {completedYesterday.length > 0 && hubMode === 'PREMIUM' && (
                        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 transition-all mt-4">
                            <div
                                onClick={() => setShowYesterdayHistory(!showYesterdayHistory)}
                                className="flex justify-between items-center cursor-pointer"
                            >
                                <h3 className="font-black text-slate-600 text-sm flex items-center gap-2">
                                    <Clock size={16} className="text-orange-500" /> Yesterday's Report ({completedYesterday.length})
                                </h3>
                                {showYesterdayHistory ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                            </div>

                            {showYesterdayHistory && (
                                <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-2">
                                    {completedYesterday.map((t, i) => (
                                        <div key={i} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between opacity-75">
                                            <div>
                                                <h4 className="font-bold text-slate-700 text-xs">{getCleanDisplayName(t.name, t.chapterTitle || '', t.subjectName)}</h4>
                                                <p className="text-[9px] text-slate-500">{t.subjectName}</p>
                                            </div>
                                            <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                                Done
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            )}

            {/* 2. FILTERED VIEWS (WEEKLY BREAKDOWN) */}
            {activeFilter !== 'TODAY' && activeFilter !== 'MCQ' && activeFilter !== 'MISTAKES' && (
                <div className="space-y-6 relative z-10">
                     <TopicChart topics={topics.filter(t => t.status === activeFilter)} type={activeFilter as any} />

                     {(() => {
                        const relevantTopics = topics.filter(t => t.status === activeFilter);
                        const weeklyData = getWeeklyBreakdown(relevantTopics);
                        const weekKeys = Object.keys(weeklyData);

                        if (weekKeys.length === 0) {
                            return <div className="text-center py-12 text-slate-500 font-bold">No topics found.</div>;
                        }

                        return weekKeys.map(week => (
                            <div key={week} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                                {/* WEEK HEADER */}
                                <div className="bg-slate-100 p-3 border-b border-slate-200">
                                    <h4 className="font-black text-slate-700 flex items-center gap-2 text-base uppercase tracking-wide">
                                        <Calendar size={18} className="text-indigo-500" /> {week}
                                    </h4>
                                </div>

                                <div className="p-4 space-y-4">
                                    {weeklyData[week].map((t, i) => {
                                        const displayName = getCleanDisplayName(t.name, t.chapterName, t.subjectName);
                                        const percent = Math.round(t.score || 0);
                                        const dueDateStr = t.nextRevision || t.mcqDueDate;
                                        const timer = getTimeUntil(dueDateStr);

                                        // Visual Decay Logic (Overdue)
                                        const isOverdue = dueDateStr && new Date(dueDateStr) < new Date();
                                        const decayOpacity = isOverdue ? 'opacity-100' : 'opacity-80';
                                        const overdueHighlight = isOverdue ? 'ring-2 ring-red-100 bg-red-50/30' : '';

                                        // Colors based on score/status
                                        let barColor = "bg-orange-500";
                                        let textColor = "text-orange-600";
                                        if (percent >= 80) { barColor = "bg-green-500"; textColor = "text-green-600"; }
                                        else if (percent < 50) { barColor = "bg-red-500"; textColor = "text-red-600"; }

                                        // Subject Badge Color
                                        let badgeColor = "bg-slate-100 text-slate-600";
                                        const sub = (t.subjectName || '').toLowerCase();
                                        if (sub.includes('math')) badgeColor = "bg-blue-100 text-blue-600";
                                        else if (sub.includes('science')) badgeColor = "bg-purple-100 text-purple-600";
                                        else if (sub.includes('social')) badgeColor = "bg-orange-100 text-orange-600";

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleTopicClick(t)}
                                                className={`group ${hubMode === 'PREMIUM' ? 'cursor-pointer' : 'cursor-not-allowed'} ${decayOpacity} ${overdueHighlight} p-2 rounded-lg transition-all hover:bg-slate-50`}
                                            >
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <div className="flex flex-col gap-1 overflow-hidden flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${badgeColor}`}>
                                                                {t.subjectName ? t.subjectName.substring(0, 3) : 'GEN'}
                                                            </span>
                                                            {timer && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 border ${timer === 'Ready' ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                                                                    <Clock size={8} /> {timer === 'Ready' ? 'Ready Now' : `In ${timer}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-slate-700 text-xs uppercase truncate group-hover:text-indigo-600 transition-colors mt-0.5">
                                                                {displayName}
                                                            </span>
                                                            {/* STATS ROW */}
                                                            {(t.totalQs || 0) > 0 && (
                                                                <span className="text-[10px] text-slate-500 font-medium leading-relaxed block mt-1">
                                                                    {t.totalCorrect || 0}/{t.totalQs} Correct • {percent}%<br/>
                                                                    <span className="text-slate-600 font-bold">Lesson Cycle:</span> {t.cycleCount || 1} • <span className="text-purple-600 font-bold">Hub Cycle:</span> {t.cycleCount || 1}<br/>
                                                                    <span className="text-xs text-orange-600 font-bold">Next MCQ: {t.mcqDueDate ? new Date(t.mcqDueDate).toLocaleDateString() : 'N/A'}</span> • <span className="text-xs text-slate-600">Last Attempt: {t.lastAttempt ? new Date(t.lastAttempt).toLocaleDateString() : 'N/A'}</span>
                                                                </span>
                                                            )}
                                                            {/* NOTES INDICATOR */}
                                                            {t.notesCount && t.notesCount > 0 && (
                                                                <span className="text-[9px] text-indigo-500 font-bold flex items-center gap-1 mt-0.5">
                                                                    <BookOpen size={10} /> {t.notesCount} Notes Available
                                                                </span>
                                                            )}
                                                        </div>
                                                        {hubMode === 'FREE' && <Lock size={10} className="text-slate-500 shrink-0" />}
                                                    </div>
                                                    <span className={`text-xs font-black ${textColor}`}>
                                                        {percent}%
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                    <div
                                                        className={`h-full ${barColor} transition-all duration-1000 ease-out shadow-sm`}
                                                        style={{ width: `${Math.max(5, percent)}%` }} // Min width for visibility
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ));
                     })()}
                </div>
            )}

            {/* 3. MCQ VIEW */}
            {activeFilter === 'MCQ' && (
                <div className="space-y-4 relative z-10">
                     {topics.filter(t => t.mcqDueDate && new Date(t.mcqDueDate) > now).length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-bold">No upcoming MCQs locked.</div>
                    ) : (
                        topics.filter(t => t.mcqDueDate && new Date(t.mcqDueDate) > now).map((t, i) => {
                             const timer = getTimeUntil(t.mcqDueDate);
                             return (
                                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 opacity-75">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-700">{getCleanDisplayName(t.name, t.chapterName, t.subjectName)}</h4>
                                            <p className="text-xs text-slate-500">{t.chapterName}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                            <Lock size={12} className="text-slate-500" />
                                            <span className="text-xs font-bold text-slate-600">{timer}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* 4. MISTAKES VIEW */}
            {activeFilter === 'MISTAKES' && (
                <div className="space-y-4 relative z-10">
                    {(() => {


                        const mergedMap = new Map<string, any>();
                        (user.mcqHistory || []).forEach(h => { if (h.id) mergedMap.set(h.id, h); });
                        try {
                            const savedNotesStr = localStorage.getItem('nst_user_history');
                            if (savedNotesStr) {
                                const savedNotes = JSON.parse(savedNotesStr);
                                savedNotes.forEach((note: any) => {
                                    if (note.analytics && note.analytics.id) {
                                        mergedMap.set(note.analytics.id, note.analytics);
                                    }
                                });
                            }
                        } catch(e) {}
                        const history = Array.from(mergedMap.values());

                        // Filter for mistakes
                        const mistakesHistory = history
                            .filter(h => h.wrongQuestions && h.wrongQuestions.length > 0)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


                        if (mistakesHistory.length === 0) {
                            return (
                                <div className="text-center py-12 text-slate-500 font-bold">
                                    <CheckCircle size={48} className="mx-auto text-green-200 mb-4" />
                                    No mistakes recorded yet! Great job!
                                </div>
                            );
                        }

                        // Group by Test Name
                        const grouped: Record<string, typeof mistakesHistory> = {};
                        mistakesHistory.forEach(h => {
                             const name = h.chapterTitle || 'Unknown Test';
                             if (!grouped[name]) grouped[name] = [];
                             grouped[name].push(h);
                        });

                        return Object.keys(grouped).map(testName => (
                            <div key={testName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                {/* LEVEL 1: Test Name Header */}
                                <div
                                    onClick={() => setExpandedMistakeTest(expandedMistakeTest === testName ? null : testName)}
                                    className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-sm">{testName}</h4>
                                        <p className="text-xs text-slate-500">{grouped[testName].length} Attempts</p>
                                    </div>
                                    {expandedMistakeTest === testName ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                </div>

                                {/* LEVEL 2: Attempts List */}
                                {expandedMistakeTest === testName && (
                                    <div className="bg-slate-50/50">
                                        {grouped[testName].map((attempt, idx) => (
                                            <div key={attempt.id || idx} className="border-b border-slate-100 last:border-0">
                                                <div
                                                    onClick={() => setExpandedMistakeAttemptId(expandedMistakeAttemptId === attempt.id ? null : attempt.id)}
                                                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-white transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${
                                                            attempt.score >= 80 ? 'bg-green-100 text-green-600' :
                                                            attempt.score < 50 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                                        }`}>
                                                            <AlertOctagon size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700">
                                                                {new Date(attempt.date).toLocaleDateString()} at {new Date(attempt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500">
                                                                Score: {Math.round(attempt.totalQuestions > 0 ? (attempt.score / attempt.totalQuestions) * 100 : 0)}% • {attempt.wrongQuestions?.length || 0} Mistakes
                                                            </p>
                                                        </div>
                                                    </div>
                                                     {expandedMistakeAttemptId === attempt.id ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
                                                </div>

                                                {/* LEVEL 3: Mistakes Detail */}
                                                {expandedMistakeAttemptId === attempt.id && (
                                                    <div className="bg-red-50/30 p-4 space-y-4 border-t border-red-50 inset-shadow-sm">
                                                        {attempt.wrongQuestions?.map((q, qIdx) => (
                                                            <div key={qIdx} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                                                                <div className="flex gap-2 mb-2">
                                                                    <span className="text-xs font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded h-fit">Q{q.qIndex + 1}</span>
                                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.question }} />
                                                                </div>

                                                                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                                                    <p className="text-[10px] font-bold text-green-700 mb-0.5">Correct Answer:</p>
                                                                    <p className="text-xs text-green-800 font-medium" dangerouslySetInnerHTML={{ __html: String(q.correctAnswer) }} />
                                                                </div>

                                                                {q.explanation && (
                                                                    <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                        <p className="text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                                                                            <BookOpen size={10} /> Explanation
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ));
                    })()}
                </div>
            )}

            {/* FOOTER */}
        </div>
    );
};

export const RevisionHub = React.memo(RevisionHubComponent);
