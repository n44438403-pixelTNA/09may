import React, { useState, useEffect } from 'react';
import { Chapter, User, Subject, SystemSettings, MCQResult, PerformanceTag } from '../types';
import { CheckCircle, Lock, ArrowLeft, Crown, PlayCircle, HelpCircle, Trophy, Clock, BrainCircuit, FileText, Layers, BookOpen, Eye, RefreshCw, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { checkFeatureAccess } from '../utils/permissionUtils';
import { CustomAlert, CustomConfirm } from './CustomDialogs';
import { getChapterData, saveUserToLive, saveUserHistory, savePublicActivity } from '../firebase';
import { storage } from '../utils/storage';
import { generateLocalAnalysis, generateAnalysisJson } from '../utils/analysisUtils';
import { saveOfflineItem } from '../utils/offlineStorage';
import { LessonView } from './LessonView'; 
import { MarksheetCard } from './MarksheetCard';
import { AiInterstitial } from './AiInterstitial';
import { FlashcardMcqView } from './FlashcardMcqView';
import { McqSpeakButtons } from './McqSpeakButtons';
import { recordAttempt as recordRevisionAttempt } from '../utils/revisionTrackerV2';
import { addMistakes, removeMistakeByQuestion } from '../utils/mistakeBank';

// Normalize chapter data so handleStart sees `manualMcqData` regardless of
// whether the admin/save layer used `manualMcqData` or `mcqData` (legacy).
const normalizeChapterData = (raw: any): any => {
  if (!raw) return raw;
  // If only `mcqData` exists, mirror it onto `manualMcqData` so downstream
  // checks (`!data.manualMcqData || data.manualMcqData.length === 0`) pass.
  if (!Array.isArray(raw.manualMcqData) && Array.isArray(raw.mcqData)) {
    return { ...raw, manualMcqData: raw.mcqData };
  }
  return raw;
};
const dataHasContent = (d: any) => !!(
  d && (
    (Array.isArray(d.manualMcqData) && d.manualMcqData.length > 0) ||
    (Array.isArray(d.mcqData) && d.mcqData.length > 0) ||
    (typeof d.notes === 'string' && d.notes.trim().length > 0) ||
    (typeof d.content === 'string' && d.content.trim().length > 0)
  )
);

// Resilient chapter-data fetcher.
// Admins occasionally save MCQ content under a slightly different key shape
// (e.g. with/without stream suffix, or a different subject-name spelling).
// We try the canonical key first, then a small set of common variants so the
// student isn't blocked by a key mismatch — especially Class 6-12 where
// stream is irrelevant but historical data sometimes carried a leading dash.
// As a LAST RESORT (mirroring RevisionHub.tsx + MarksheetCard.tsx), we scan
// all `nst_content_*` keys in localStorage and pick any whose key ends with
// `_${chapterId}` — chapter IDs are unique enough to make this safe.
const fetchChapterDataResilient = async (
  board: string,
  classLevel: string,
  stream: string | null,
  subjectName: string,
  chapterId: string,
): Promise<any | null> => {
  const variants: string[] = [];
  const push = (k: string) => { if (k && !variants.includes(k)) variants.push(k); };

  const isHigh = classLevel === '11' || classLevel === '12';
  const streamKey = isHigh && stream ? `-${stream}` : '';

  // Build all key variants we'll try
  push(`nst_content_${board}_${classLevel}${streamKey}_${subjectName}_${chapterId}`);
  if (!isHigh) push(`nst_content_${board}_${classLevel}_${subjectName}_${chapterId}`);
  if (!isHigh && stream) push(`nst_content_${board}_${classLevel}-${stream}_${subjectName}_${chapterId}`);
  push(`nst_content_${board}_${classLevel}-_${subjectName}_${chapterId}`);
  const normSub = (subjectName || '').trim();
  if (normSub && normSub !== subjectName) push(`nst_content_${board}_${classLevel}${streamKey}_${normSub}_${chapterId}`);
  push(`nst_content_${(board || '').toUpperCase()}_${classLevel}${streamKey}_${subjectName}_${chapterId}`);
  const altBoard = board === 'CBSE' ? 'BSEB' : 'CBSE';
  push(`nst_content_${altBoard}_${classLevel}${streamKey}_${subjectName}_${chapterId}`);

  // ── PHASE 1: localStorage variants (synchronous, instant) ─────────────
  for (const key of variants) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (dataHasContent(parsed)) {
          console.log('[McqView] ✓ localStorage key:', key);
          return normalizeChapterData(parsed);
        }
      }
    } catch {}
  }

  // ── PHASE 2: localStorage brute-force scan (still instant) ────────────
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('nst_content_') || !k.endsWith(`_${chapterId}`)) continue;
      try {
        const stored = localStorage.getItem(k);
        if (!stored) continue;
        const parsed = JSON.parse(stored);
        if (dataHasContent(parsed)) {
          console.log('[McqView] ✓ localStorage SCAN key:', k);
          return normalizeChapterData(parsed);
        }
      } catch {}
    }
  } catch {}

  // ── PHASE 3: Firebase — try ALL variants in PARALLEL with a single
  // overall 4 s budget. Whichever returns content first wins; the rest
  // are abandoned. This bounds the loading spinner to ≤4 s, not 20+ s.
  const fetchWithTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

  try {
    const remote = await fetchWithTimeout(
      Promise.any(
        variants.map(async (key) => {
          const data = await getChapterData(key);
          if (!dataHasContent(data)) throw new Error('empty');
          console.log('[McqView] ✓ Firebase key:', key);
          return normalizeChapterData(data);
        }),
      ),
      4000,
    );
    if (remote) return remote;
  } catch {}

  console.warn('[McqView] ✗ No MCQ data. Tried keys:', variants, 'chapterId:', chapterId);
  return null;
};

interface Props {
  chapter: Chapter;
  subject: Subject;
  user: User;
  board: string;
  classLevel: string;
  stream: string | null;
  onBack: () => void;
  onUpdateUser: (user: User) => void;
  settings?: SystemSettings; // New Prop
  topicFilter?: string; // NEW: Filter by Topic
  // NEW: Lucent-style cross-tab switch back to Notes (PdfView).
  onSwitchToNotes?: () => void;
  // NEW: Share MCQ to community popup
  onShareToCommunity?: (mcq: { question: string; options: [string,string,string,string]; correctAnswer: number; explanation: string }) => void;
}

export const McqView: React.FC<Props> = ({ 
  chapter, subject, user, board, classLevel, stream, onBack, onUpdateUser, settings, topicFilter, onSwitchToNotes, onShareToCommunity
}) => {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'SELECTION' | 'PRACTICE' | 'TEST' | 'FLASHCARD' | 'INTERACTIVE_LIST'>('SELECTION');
  const [flashcardData, setFlashcardData] = useState<any[] | null>(null);
  // === Unified Lucent-style Interactive List state ===
  // Single state that powers both MCQ mode (tap option → instant feedback)
  // and Q&A mode (tap to reveal correct answer). User switches between
  // the two via the 3-pill strip inside the list view itself.
  const [listData, setListData] = useState<any[] | null>(null);
  const [listMode, setListMode] = useState<'mcq' | 'qa'>('mcq');
  const [listAnswers, setListAnswers] = useState<Record<number, number>>({});
  const [listRevealed, setListRevealed] = useState<Record<number, boolean>>({});
  const [savedQuestions, setSavedQuestions] = useState<Record<number, boolean>>({});
  // Lucent-style 3-mode picker on the SELECTION screen.
  // 'MCQ'  → opens INTERACTIVE_LIST in 'mcq' mode (interactive, tap-to-answer)
  // 'QA'   → opens INTERACTIVE_LIST in 'qa' mode (tap-to-reveal)
  // 'CARD' → existing flashcard overlay (FlashcardMcqView)
  const [selectionMode, setSelectionMode] = useState<'MCQ' | 'QA' | 'CARD'>('MCQ');
  // Hide the legacy timed Free Practice / Premium Test cards behind an
  // "Advanced Test Mode" disclosure — the new 3-mode selector is the
  // primary entry point.
  const [showAdvancedTest, setShowAdvancedTest] = useState(false);
  const [lessonContent, setLessonContent] = useState<any>(null); // To pass to LessonView
  const [resultData, setResultData] = useState<MCQResult | null>(null);
  const [completedMcqData, setCompletedMcqData] = useState<any[]>([]); // Store used data for analysis
  
  // Custom Dialog State
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string, title?: string}>({isOpen: false, message: ''});
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showMoreHistory, setShowMoreHistory] = useState(false);

  // Interstitial State
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingStart, setPendingStart] = useState<{mode: 'PRACTICE' | 'TEST', data: any} | null>(null);

  // Topic Selector State
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // MCQ Difficulty State
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'>('MIXED');

  // NEW: MCQ Mode State (Free vs Premium Experience)
  const [mcqMode, setMcqMode] = useState<'FREE' | 'PREMIUM'>('FREE');

  // Load topics on mount if content exists locally or via minimal fetch.
  // Uses the same resilient/normalized lookup so topic chips show up even when
  // admin-uploaded MCQs landed under a key variant or legacy `mcqData` field.
  useEffect(() => {
      let cancelled = false;
      (async () => {
          const data: any = await fetchChapterDataResilient(board, classLevel, stream, subject.name, chapter.id);
          if (cancelled) return;
          const arr = Array.isArray(data?.manualMcqData) ? data.manualMcqData
                    : Array.isArray(data?.mcqData) ? data.mcqData
                    : null;
          if (arr && arr.length > 0) {
              const topics = Array.from(new Set(arr.map((q: any) => q.topic).filter(Boolean))) as string[];
              setAvailableTopics(topics);
          }
      })();
      return () => { cancelled = true; };
  }, [board, classLevel, stream, subject, chapter]);

  // Lucent-style Interactive MCQ List — load MCQs and open the unified
  // INTERACTIVE_LIST view in either 'mcq' (tap-to-answer) or 'qa'
  // (tap-to-reveal) mode. Same dataset, two reading experiences.
  const handleStartList = async (initialMode: 'mcq' | 'qa') => {
      setLoading(true);
      const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
      const data: any = await fetchChapterDataResilient(board, classLevel, stream, subject.name, chapter.id);
      if (!data || !data.manualMcqData || data.manualMcqData.length === 0) {
          const expectedKey = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
          setAlertConfig({
            isOpen: true,
            title: 'MCQ Coming Soon',
            message: `Is chapter ke MCQ abhi upload nahi hue.\n\nDebug info:\n• Chapter ID: ${chapter.id}\n• Subject: ${subject.name}\n• Class: ${classLevel}\n• Board: ${board}\n\nAdmin se request karein ki "${chapter.title || 'this chapter'}" ke MCQ upload karein.`
          });
          console.warn('[McqView] No MCQ data. Expected key:', expectedKey);
          setLoading(false);
          return;
      }
      let qs = [...data.manualMcqData];
      const activeFilter = topicFilter || selectedTopic;
      if (activeFilter) qs = qs.filter((q: any) => q.topic === activeFilter);
      if (qs.length === 0) {
          setAlertConfig({ isOpen: true, title: 'No Questions', message: `No MCQs found for the topic "${activeFilter}".` });
          setLoading(false);
          return;
      }
      // Restore previously saved bookmarks for this chapter (if any).
      const savedKey = `mcq_saved_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
      try {
          const stored = localStorage.getItem(savedKey);
          if (stored) setSavedQuestions(JSON.parse(stored));
          else setSavedQuestions({});
      } catch { setSavedQuestions({}); }
      setListData(qs);
      setListMode(initialMode);
      setListAnswers({});
      setListRevealed({});
      setViewMode('INTERACTIVE_LIST');
      setLoading(false);
  };

  const handleStartFlashcard = async () => {
      setLoading(true);
      const data: any = await fetchChapterDataResilient(board, classLevel, stream, subject.name, chapter.id);
      if (!data || !data.manualMcqData || data.manualMcqData.length === 0) {
          setAlertConfig({
            isOpen: true,
            title: 'Flashcards Coming Soon',
            message: `Is chapter ke flashcards abhi nahi banaye gaye.\n\nDebug info:\n• Chapter ID: ${chapter.id}\n• Subject: ${subject.name}\n• Class: ${classLevel}\n\nAdmin "${chapter.title || 'this chapter'}" ke MCQ upload karenge to flashcard yahan dikhega.`
          });
          setLoading(false);
          return;
      }
      let qs = [...data.manualMcqData];
      const activeFilter = topicFilter || selectedTopic;
      if (activeFilter) qs = qs.filter((q: any) => q.topic === activeFilter);
      // Shuffle so flashcard order varies
      for (let i = qs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [qs[i], qs[j]] = [qs[j], qs[i]];
      }
      if (qs.length === 0) {
          setAlertConfig({ isOpen: true, title: 'No Questions', message: `No MCQs found for the topic "${activeFilter}".` });
          setLoading(false);
          return;
      }
      setFlashcardData(qs);
      setViewMode('FLASHCARD');
      setLoading(false);
  };

  const handleStart = async (mode: 'PRACTICE' | 'TEST') => {
      // DAILY LIMIT CHECK
      if (user.role !== 'ADMIN') {
          const todayStr = new Date().toDateString();
          const solvedToday = (user.mcqHistory || [])
              .filter(h => new Date(h.date).toDateString() === todayStr)
              .reduce((sum, h) => sum + h.totalQuestions, 0);

          const mcqFeature = settings?.featureConfig?.['MCQ_FREE'];
          let dailyLimit = mcqFeature?.limits?.free ?? settings?.mcqLimitFree ?? 30;
          if (user.subscriptionLevel === 'BASIC') dailyLimit = mcqFeature?.limits?.basic ?? settings?.mcqLimitBasic ?? 50;
          if (user.subscriptionLevel === 'ULTRA') dailyLimit = mcqFeature?.limits?.ultra ?? settings?.mcqLimitUltra ?? 100;

          if (solvedToday >= dailyLimit) {
              setAlertConfig({
                  isOpen: true,
                  title: "Daily Limit Reached",
                  message: `You have reached your daily limit of ${dailyLimit} questions.\n\n${user.subscriptionLevel === 'ULTRA' ? 'Come back tomorrow!' : 'Upgrade plan to increase limit!'}`
              });
              return;
          }
      }

      // 1. Fetch Data First (To avoid charging for empty chapters)
      setLoading(true);
      const data: any = await fetchChapterDataResilient(board, classLevel, stream, subject.name, chapter.id);

      // Handle Empty Content
      if (!data || !data.manualMcqData || data.manualMcqData.length === 0) {
          // Show "Coming Soon" screen instead of alert
          const content = {
              id: Date.now().toString(),
              title: chapter.title,
              subtitle: 'Coming Soon',
              content: '', 
              type: 'MCQ_SIMPLE',
              isComingSoon: true, // New Flag
              dateCreated: new Date().toISOString(),
              subjectName: subject.name,
              mcqData: null
          };
          setLessonContent(content);
          setViewMode(mode);
          setLoading(false);
          return;
      }

      // DETERMINING MCQ MODE & COST
      // Logic:
      // - If mode is TEST -> Premium Test (New Experience). Requires Premium Sub OR Cost.
      // - If mode is PRACTICE -> Free Practice (Old Experience). Free.
      // NOTE: "pahle wala primimum mcq ab upgrade hoga ... aur free wala mcq banane pe analysis jo free hai ushka cradit lagega 20"
      
      let finalMode: 'FREE' | 'PREMIUM' = 'FREE';
      let cost = 0;

      if (mode === 'TEST') {
          // Premium Test Mode
          finalMode = 'PREMIUM';

          // Use App Soul for Cost & Access
          const access = checkFeatureAccess('MCQ_PREMIUM', user, settings || {});

          if (!access.hasAccess) {
             // If locked (either by Tier or explicit Lock)
             // If cost > 0, it means pay-per-view
             if (access.cost > 0) {
                 cost = access.cost;
             } else {
                 setAlertConfig({isOpen: true, title: "Locked Feature", message: access.reason === 'FEED_LOCKED' ? "Disabled by Admin." : "Upgrade your plan to access Premium Tests."});
                 setLoading(false);
                 return;
             }
          } else {
             // Granted Access (Subscription or Free Tier)
             // Check if there is still a cost (rare, but possible if configured)
             cost = access.cost;
          }

          if (user.credits < cost) {
              setAlertConfig({isOpen: true, title: "Low Balance", message: `Insufficient Credits for Premium Test! You need ${cost} coins.`});
              setLoading(false);
              return;
          }

      } else {
          // Free Practice Mode
          finalMode = 'FREE';
          cost = 0;
      }

      // Confirmation for Cost (if any)
      if (cost > 0) {
          setConfirmConfig({
              isOpen: true,
              title: "Start Premium Test",
              message: `Start Premium Test for ${cost} Coins?\nIncludes Instant Explanations & TTS.`,
              onConfirm: () => {
                  const updatedUser = { ...user, credits: user.credits - cost };
                  localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
                  saveUserToLive(updatedUser);
                  onUpdateUser(updatedUser);
                  setConfirmConfig(prev => ({...prev, isOpen: false}));

                  // Set Mode and Start
                  setMcqMode('PREMIUM');
                  triggerMcqStart(mode, data);
              }
          });
          setLoading(false);
          return;
      }
      
      setMcqMode(finalMode);
      triggerMcqStart(mode, data);
  };

  const triggerMcqStart = (mode: 'PRACTICE' | 'TEST', data: any) => {
    // 1. Process Questions (Filter, Shuffle & Slice based on Tier)
    let processedQuestions = [...(data.manualMcqData || [])];

    // TOPIC FILTER (Priority: Prop Filter > Selected Dropdown)
    const activeFilter = topicFilter || selectedTopic;
    if (activeFilter) {
        processedQuestions = processedQuestions.filter((q: any) => q.topic === activeFilter);
        if (processedQuestions.length === 0) {
            setAlertConfig({isOpen: true, title: "No Questions", message: `No questions found for topic: ${activeFilter}`});
            setLoading(false);
            return;
        }
    }
    
    // PREMIUM DIFFICULTY FILTER
    if (mode === 'TEST' && selectedDifficulty !== 'MIXED') {
        // Assume difficulty is stored as a tag or property. If not present, this won't filter out anything.
        // We'll normalize to uppercase for comparison
        processedQuestions = processedQuestions.filter((q: any) => {
            const diff = (q.difficultyLevel || q.difficulty || 'MEDIUM').toUpperCase();
            return diff === selectedDifficulty;
        });

        if (processedQuestions.length === 0) {
            setAlertConfig({isOpen: true, title: "No Questions", message: `No questions found for difficulty: ${selectedDifficulty}`});
            setLoading(false);
            return;
        }
    }

    // Shuffle Questions (Fisher-Yates)
    for (let i = processedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [processedQuestions[i], processedQuestions[j]] = [processedQuestions[j], processedQuestions[i]];
    }

    // Apply Tier Limits (Per Test Limit)
    // Free: 30, Basic: 50, Ultra: All
    const mcqFeature = settings?.featureConfig?.['MCQ_FREE'];
    let questionLimit = mcqFeature?.limits?.free ?? settings?.mcqLimitFree ?? 30;
    if (user.subscriptionLevel === 'BASIC') questionLimit = mcqFeature?.limits?.basic ?? settings?.mcqLimitBasic ?? 50;
    if (user.subscriptionLevel === 'ULTRA') questionLimit = mcqFeature?.limits?.ultra ?? settings?.mcqLimitUltra ?? 999999;

    // Admin Override
    if (user.role === 'ADMIN') questionLimit = 999999;

    processedQuestions = processedQuestions.slice(0, questionLimit);

    // Update data object with processed questions
    const processedData = {
        ...data,
        manualMcqData: processedQuestions
    };

    setPendingStart({mode, data: processedData});
    setShowInterstitial(true);
  };

  const handleInterstitialComplete = () => {
    setShowInterstitial(false);
    if (pendingStart) {
        proceedWithStart(pendingStart.mode, pendingStart.data);
        setPendingStart(null);
    }
  };

  const proceedWithStart = (mode: 'PRACTICE' | 'TEST', data: any) => {

      // SHUFFLE & LIMIT QUESTIONS
      const rawMcqData = data.manualMcqData || [];
      const rawMcqDataHi = data.manualMcqData_HI || [];
      const hasHindi = rawMcqDataHi.length === rawMcqData.length && rawMcqData.length > 0;

      // 1. Create Index Array
      const indices = Array.from({ length: rawMcqData.length }, (_, i) => i);

      // 2. Fisher-Yates Shuffle
      for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      // 3. Determine Limit based on Tier
      const mcqFeature = settings?.featureConfig?.['MCQ_FREE'];
      let limit = mcqFeature?.limits?.free ?? settings?.mcqLimitFree ?? 30; // Default Free

      if (user.role === 'ADMIN') {
          limit = 9999;
      } else if (user.subscriptionTier && user.subscriptionTier !== 'FREE') {
          if (user.subscriptionLevel === 'ULTRA') limit = mcqFeature?.limits?.ultra ?? settings?.mcqLimitUltra ?? 9999;
          else limit = mcqFeature?.limits?.basic ?? settings?.mcqLimitBasic ?? 50; // Basic Limit
      }

      // 4. Slice & Select
      const finalIndices = indices.slice(0, limit);
      const finalMcqData = finalIndices.map(i => rawMcqData[i]);
      const finalMcqDataHi = hasHindi ? finalIndices.map(i => rawMcqDataHi[i]) : undefined;

      // Prepare LessonContent object for the existing LessonView component
      const content = {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: mode === 'TEST' ? 'Premium Test Mode' : 'Free Practice Mode',
          content: '', // Not used for MCQ
          type: 'MCQ_ANALYSIS', // Always allow analysis flow
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          mcqData: finalMcqData,
          manualMcqData_HI: finalMcqDataHi
      };
      
      setLessonContent(content);
      setViewMode(mode);
      setLoading(false);
  };

  const handleMCQComplete = (score: number, answers: Record<number, number>, usedData: any[], timeTaken: number, timePerQuestion?: Record<number, number>) => {
      // 1. FILTER & REMAP DATA (Strict Requirement: Only show attempted questions)
      const answeredIndices = Object.keys(answers).map(Number).sort((a,b) => a - b);
      
      // Create the subset of questions
      const submittedQuestions = answeredIndices.map(idx => usedData[idx]);
      
      // Remap answers to the new indices (0, 1, 2...) AND Time Data
      const remappedAnswers: Record<number, number> = {};
      const remappedTime: Record<number, number> = {};

      answeredIndices.forEach((oldIdx, newIdx) => {
          remappedAnswers[newIdx] = answers[oldIdx];
          if (timePerQuestion && timePerQuestion[oldIdx] !== undefined) {
              remappedTime[newIdx] = timePerQuestion[oldIdx];
          }
      });

      // 2. Calculate Analytics
      const attemptsCount = answeredIndices.length; // Should match Object.keys(answers).length
      const averageTime = attemptsCount > 0 ? timeTaken / attemptsCount : 0;
      let performanceTag: PerformanceTag = 'VERY_BAD';
      if (averageTime <= 15) performanceTag = 'EXCELLENT';
      else if (averageTime <= 30) performanceTag = 'GOOD';
      else if (averageTime <= 45) performanceTag = 'BAD';

      // Build OMR Data (Using remapped indices and submittedQuestions)
      const omrData = submittedQuestions.map((q, idx) => ({
          qIndex: idx,
          selected: remappedAnswers[idx] !== undefined ? remappedAnswers[idx] : -1,
          correct: q.correctAnswer,
          timeSpent: remappedTime[idx] || 0 // Store per-question time
      }));

      // Build Wrong Questions List (Strictly Incorrect Attempts)
      const wrongQuestions = submittedQuestions
        .map((q, idx) => {
            const selected = remappedAnswers[idx] !== undefined ? remappedAnswers[idx] : -1;
            // Filter: Must be attempted (not -1) AND wrong
            if (selected !== -1 && selected !== q.correctAnswer) {
                return {
                    question: q.question,
                    qIndex: idx,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation
                };
            }
            return null;
        })
        .filter((item): item is { question: string; qIndex: number, correctAnswer: number } => item !== null);

      // ── MY MISTAKE BANK ──────────────────────────────────────────────
      // Push every wrong-answered question into the persistent mistake bank
      // so the My Mistake page can show & replay them. Right-answered ones
      // are removed (so once student fixes a mistake it disappears).
      try {
          const wrongPayload = submittedQuestions
              .map((q, idx) => {
                  const selected = remappedAnswers[idx] !== undefined ? remappedAnswers[idx] : -1;
                  if (selected !== -1 && selected !== q.correctAnswer) {
                      return {
                          question: q.question,
                          options: q.options || [],
                          correctAnswer: q.correctAnswer,
                          explanation: q.explanation,
                          topic: q.topic,
                          chapterTitle: chapter.title,
                          subjectName: subject.name,
                          classLevel: classLevel,
                          board: board,
                          source: 'MCQ',
                      };
                  }
                  return null;
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);
          if (wrongPayload.length > 0) addMistakes(wrongPayload);
          // Remove correctly-answered mistakes from the bank.
          submittedQuestions.forEach((q, idx) => {
              const selected = remappedAnswers[idx] !== undefined ? remappedAnswers[idx] : -1;
              if (selected !== -1 && selected === q.correctAnswer) {
                  removeMistakeByQuestion(q.question, q.correctAnswer);
              }
          });
      } catch (err) { console.warn('mistakeBank update failed:', err); }

      // Performance Label based on marks (Excllent, Good, Average, Bad)
      const scorePct = (score / attemptsCount) * 100;
      let perfLabel = "Bad";
      if (scorePct >= 90) perfLabel = "Excellent";
      else if (scorePct >= 75) perfLabel = "Good";
      else if (scorePct >= 50) perfLabel = "Average";

      // 3. Prepare Result Object
      const analysisJson = generateAnalysisJson(submittedQuestions, remappedAnswers, user.mcqHistory, chapter.id);

      // Generate Granular Topic Analysis for History Comparison
      const topicAnalysis: Record<string, { correct: number, total: number, percentage: number }> = {};
      submittedQuestions.forEach((q, idx) => {
          const t = (q.topic || 'General').trim();
          if (!topicAnalysis[t]) topicAnalysis[t] = { correct: 0, total: 0, percentage: 0 };

          topicAnalysis[t].total += 1;
          if (remappedAnswers[idx] === q.correctAnswer) {
              topicAnalysis[t].correct += 1;
          }
      });
      // Calculate Percentages
      Object.keys(topicAnalysis).forEach(t => {
          const s = topicAnalysis[t];
          s.percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      });

      const result: MCQResult = {
          id: `res-${Date.now()}`,
          userId: user.id,
          chapterId: chapter.id,
          subjectId: subject.id,
          subjectName: subject.name,
          chapterTitle: chapter.title,
          date: new Date().toISOString(),
          totalQuestions: submittedQuestions.length, // Only attempted count
          correctCount: score,
          wrongCount: attemptsCount - score,
          score: score,
          totalTimeSeconds: timeTaken,
          averageTimePerQuestion: averageTime,
          performanceTag: performanceTag, // Use calculated tag, or align types
          classLevel: classLevel,
          omrData: omrData,
          wrongQuestions: wrongQuestions,
          questionTimes: Object.values(remappedTime),
          topic: topicFilter, // Save topic if filtered
          ultraAnalysisReport: analysisJson,
          topicAnalysis: topicAnalysis // NEW: Enable Per-Topic Comparison
      };

      // 4. Update User Data
      let updatedUser = { ...user };

      // PRIZE LOGIC (SYLLABUS_MCQ)
      if (settings?.prizeRules) {
          const percentage = (score / attemptsCount) * 100;
          const eligibleRules = settings.prizeRules
              .filter(r => r.enabled && r.category === 'SYLLABUS_MCQ')
              .filter(r => attemptsCount >= r.minQuestions && percentage >= r.minPercentage)
              .sort((a, b) => b.minPercentage - a.minPercentage);

          const bestRule = eligibleRules[0];
          if (bestRule) {
              if (bestRule.rewardType === 'COINS') {
                  updatedUser.credits = (updatedUser.credits || 0) + (bestRule.rewardAmount || 0);
                  setAlertConfig({isOpen: true, title: "Reward Unlocked!", message: `🏆 ${bestRule.label}\n\nYou earned ${bestRule.rewardAmount} Coins!`});
              } else if (bestRule.rewardType === 'SUBSCRIPTION') {
                  const duration = bestRule.rewardDurationHours || 24;
                  const endDate = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
                  updatedUser = { 
                      ...updatedUser, 
                      subscriptionTier: bestRule.rewardSubTier || 'WEEKLY',
                      subscriptionLevel: bestRule.rewardSubLevel || 'BASIC',
                      subscriptionEndDate: endDate,
                      grantedByAdmin: true,
                      isPremium: true
                  };
                  setAlertConfig({isOpen: true, title: "Reward Unlocked!", message: `🏆 ${bestRule.label}\n\nYou earned free subscription!`});
              }
          }
      }
      
      // 4.1 Topic Strength Tracking
      if (!updatedUser.topicStrength) updatedUser.topicStrength = {};

      // A) Update overall Subject Strength
      const currentStrength = updatedUser.topicStrength[subject.name] || { correct: 0, total: 0 };
      updatedUser.topicStrength[subject.name] = {
          correct: currentStrength.correct + score,
          total: currentStrength.total + attemptsCount
      };

      // B) Update Granular Topic Strength (if topics exist in questions)
      submittedQuestions.forEach((q, idx) => {
          const topicKey = (q.topic || 'General').trim();
          const topicStats = updatedUser.topicStrength![topicKey] || { correct: 0, total: 0 };

          const isCorrect = remappedAnswers[idx] === q.correctAnswer;

          updatedUser.topicStrength![topicKey] = {
              correct: topicStats.correct + (isCorrect ? 1 : 0),
              total: topicStats.total + 1
          };
      });

      // 4.1.b Revision Hub V2 — record per-page topic stats for the new revision tracker.
      try {
        recordRevisionAttempt({
          subjectId: subject.id,
          subjectName: subject.name,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          pageKey: (chapter as any).pageNo ? `pg-${(chapter as any).pageNo}` : chapter.id,
          pageLabel: (chapter as any).pageNo ? `Page ${(chapter as any).pageNo}` : undefined,
          questions: submittedQuestions,
          userAnswers: remappedAnswers,
        });
      } catch (e) { /* non-blocking */ }

      // 4.2 Add to History
      const newHistory = [result, ...(updatedUser.mcqHistory || [])];
      updatedUser.mcqHistory = newHistory;

      // 4.3 Progress Logic
      if (!updatedUser.progress) updatedUser.progress = {};
      const subjectId = subject.id;
      let progress = updatedUser.progress[subjectId] || { currentChapterIndex: 0, totalMCQsSolved: 0 };
      progress.totalMCQsSolved += attemptsCount;

      const threshold = settings?.mcqUnlockThreshold || 100;
      let leveledUp = false;

      if (progress.totalMCQsSolved >= threshold) {
          progress.currentChapterIndex += 1;
          progress.totalMCQsSolved = progress.totalMCQsSolved - threshold;
          leveledUp = true;
      }
      updatedUser.progress[subjectId] = progress;

      // 5. Save & Sync
      onUpdateUser(updatedUser); 
      localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
      saveUserToLive(updatedUser);
      
      // 6. Save detailed attempt to Legacy Local History & Firebase (Only attempted questions)
      const resultDataToSet = result; // Keep reference
      
      const newHistoryItem = {
          ...lessonContent,
          mcqData: submittedQuestions, // Save only subset
          id: result.id,
          date: result.date,
          score: score,
          totalQuestions: submittedQuestions.length,
          userAnswers: remappedAnswers, // Save remapped answers
          analytics: result 
      };
      
      storage.getItem<any[]>('nst_user_history').then(existing => {
          let history = existing || [];
          history.push(newHistoryItem);
          storage.setItem('nst_user_history', history);
      }).catch(e => console.error("Error saving history locally", e));

      // Sync to Firebase (with Offline Fallback)
      try {
          if (navigator.onLine) {
              saveUserHistory(user.id, newHistoryItem);
          } else {
              throw new Error("Offline");
          }
      } catch (e) {
          console.log("Offline or Error saving history. Queuing for sync.");
          const pending = JSON.parse(localStorage.getItem('nst_pending_sync_results') || '[]');
          pending.push({ userId: user.id, data: newHistoryItem, type: 'HISTORY' });
          localStorage.setItem('nst_pending_sync_results', JSON.stringify(pending));
      }

      if (leveledUp) {
          setAlertConfig({isOpen: true, title: "Level Up!", message: `🎉 Congratulations! You cleared ${threshold} MCQs.\n\n🔓 Next Chapter Unlocked!`});
      }
      
      // Store data for analysis view (Fallback to usedData if filtered set is empty to ensure AI Analysis has data)
      if (submittedQuestions.length > 0) {
          setCompletedMcqData(submittedQuestions);
      } else {
          setCompletedMcqData(usedData);
      }

      // SAVE DIRECTLY TO OFFLINE AND SAVED NOTES ON SUBMIT
      const timestamp = Date.now();
      saveOfflineItem({
          id: `analysis_${result.id}_${timestamp}`,
          type: 'ANALYSIS',
          title: result.chapterTitle || 'Analysis Report',
          subtitle: `${result.score} / ${result.totalQuestions}`,
          data: {
              result,
              questions: submittedQuestions.length > 0 ? submittedQuestions : usedData
          }
      });
      saveOfflineItem({
          id: `rev_${result.id}_${timestamp}`,
          type: 'REVISION_NOTES',
          title: result.chapterTitle || 'MCQ Notes',
          subtitle: `${subject.name} - MCQ Session`,
          data: {
              result,
              questions: submittedQuestions.length > 0 ? submittedQuestions : usedData
          }
      });

      // Show Marksheet and exit MCQ view
      setResultData(null);
      setViewMode('SELECTION');
  };

  const handleViewAnalysis = () => {
      setShowAnalysisModal(true);
  };

  const handleFreeAnalysis = () => {
      // NEW COST LOGIC FOR FREE ANALYSIS controlled by App Soul (MCQ_FREE cost)
      if (mcqMode === 'FREE') {
          const access = checkFeatureAccess('MCQ_FREE', user, settings || {});
          // If a cost is configured in Soul for MCQ_FREE, use it for analysis unlock
          const cost = access.cost > 0 ? access.cost : 20; // Default to 20 if 0 (backward compat) OR assume 0 means free?
          // User request: "analysis jo free hai ushka cradit lagega 20".
          // If App Soul sets it to 0, maybe it should be free?
          // But strict reading implies manual control. Let's trust App Soul cost if > 0.

          if (cost > 0) {
              if (user.credits < cost) {
                  setAlertConfig({isOpen: true, title: "Low Balance", message: `Analysis costs ${cost} Coins!`});
                  return;
              }

              setConfirmConfig({
                  isOpen: true,
                  title: "Unlock Analysis",
                  message: `Unlock answers & mistakes for ${cost} Coins?`,
                  onConfirm: () => {
                      const updatedUser = { ...user, credits: user.credits - cost };
                      localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
                      saveUserToLive(updatedUser);
                      onUpdateUser(updatedUser);
                      setConfirmConfig(prev => ({...prev, isOpen: false}));
                      proceedToAnalysis('FREE');
                  }
              });
          } else {
             proceedToAnalysis('FREE');
          }
      } else {
          // Premium users (Premium Mode) already paid or have access
          proceedToAnalysis('FREE');
      }
  };

  const proceedToAnalysis = (type: 'FREE' | 'PREMIUM', aiText?: string) => {
      const userAnswers = resultData?.omrData?.reduce((acc: any, curr) => {
          acc[curr.qIndex] = curr.selected;
          return acc;
      }, {}) || {};

      const currentResult = resultData; // Capture current result

      setShowAnalysisModal(false);

      const analysisContent = {
          ...lessonContent,
          id: `analysis-${Date.now()}`,
          type: 'MCQ_ANALYSIS',
          mcqData: completedMcqData,
          userAnswers: userAnswers,
          analysisType: type,
          aiAnalysisText: aiText,
          topic: topicFilter || selectedTopic, // Pass Topic
          analytics: currentResult // PASS RESULT OBJECT
      };
      
      setResultData(null);
      setLessonContent(analysisContent);
      setViewMode('TEST');
  }

  const handlePremiumAnalysis = () => {
      const cost = settings?.mcqAnalysisCostUltra ?? 20;
      
      if (user.credits < cost) {
          setAlertConfig({isOpen: true, title: "Low Balance", message: `Insufficient Credits! You need ${cost} coins.`});
          return;
      }

      setConfirmConfig({
          isOpen: true,
          title: "Unlock Premium Analysis",
          message: `Pay ${cost} Coins to unlock detailed AI Analysis & Premium Notes?`,
          onConfirm: () => {
              // Deduct Credits
              const updatedUser = { ...user, credits: user.credits - cost };
              localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
              saveUserToLive(updatedUser);
              onUpdateUser(updatedUser);

              // Generate Analysis
              const userAnswers = resultData?.omrData?.reduce((acc: any, curr) => {
                  acc[curr.qIndex] = curr.selected;
                  return acc;
              }, {}) || {};

              const analysisText = generateLocalAnalysis(
                  completedMcqData,
                  userAnswers,
                  resultData?.score || 0,
                  resultData?.totalQuestions || 0,
                  chapter.title,
                  subject.name
              );

              setConfirmConfig(prev => ({...prev, isOpen: false}));
              proceedToAnalysis('PREMIUM', analysisText);
          }
      });
  };

  const handlePublishResult = () => {
      if (!resultData) return;
      const percentage = Math.round((resultData.score / resultData.totalQuestions) * 100);
      const activity = {
          id: resultData.id,
          userId: user.id,
          userName: user.name,
          testName: resultData.chapterTitle,
          score: resultData.score,
          total: resultData.totalQuestions,
          percentage: percentage,
          timestamp: new Date().toISOString()
      };
      savePublicActivity(activity);
      setAlertConfig({isOpen: true, title: "Success", message: "Result published!"});
  };

  return (
    <>
       {resultData && (
           <div className="fixed inset-0 z-[200]">
               <MarksheetCard
                   result={resultData}
                   user={user}
                   settings={settings}
                   onClose={() => {
                       setResultData(null);
                       setViewMode('SELECTION');
                   }}
                   onViewAnalysis={handleViewAnalysis}
                   onPublish={handlePublishResult}
                   questions={completedMcqData}
                   onUpdateUser={onUpdateUser}
                   mcqMode={mcqMode}
               />
           </div>
       )}

       <CustomAlert 
           isOpen={alertConfig.isOpen} 
           title={alertConfig.title} 
           message={alertConfig.message} 
           onClose={() => setAlertConfig({...alertConfig, isOpen: false})} 
       />
       <CustomConfirm
           isOpen={confirmConfig.isOpen}
           title={confirmConfig.title}
           message={confirmConfig.message}
           onConfirm={confirmConfig.onConfirm}
           onCancel={() => setConfirmConfig({...confirmConfig, isOpen: false})}
       />

       {viewMode === 'FLASHCARD' && flashcardData ? (
          <FlashcardMcqView
              questions={flashcardData as any}
              title={chapter.title}
              subtitle={`${subject.name} • Flashcard Mode`}
              subject={subject.name}
              onBack={() => { setViewMode('SELECTION'); setFlashcardData(null); }}
          />
       ) : viewMode === 'INTERACTIVE_LIST' && listData ? (
          /* === LUCENT-STYLE INTERACTIVE LIST (matches the reference screenshot) ===
             Single view that supports MCQ mode (tap option → instant feedback)
             and Q&A mode (tap to reveal correct answer). Top has READ ALL +
             3-pill mode switcher (📝 MCQ · 💬 Q&A · 🃏 Flashcard).
             TTS rules:
              • MCQ mode → speakers read ONLY the question until ALL questions
                are answered. After that, answers also get played.
              • Q&A mode → speakers always read Question + Correct Answer.
          */
          (() => {
              const norm = listData.map((q: any) => ({
                  question: q.question || q.q || '',
                  options: Array.isArray(q.options) ? q.options : [],
                  correctAnswer: typeof q.correctAnswerIndex === 'number'
                      ? q.correctAnswerIndex
                      : (typeof q.answerIndex === 'number'
                          ? q.answerIndex
                          : (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0)),
                  explanation: q.explanation || '',
                  topic: q.topic || '',
                  difficulty: q.difficulty || '',
              }));
              const totalAnswered = Object.keys(listAnswers).length;
              const allAnswered = totalAnswered === norm.length && norm.length > 0;
              // TTS reveal rule (per user spec):
              //  - MCQ mode: only reveal answer once user answered everything.
              //  - Q&A mode: always reveal answer in TTS.
              const ttsRevealAnswer = listMode === 'qa' || allAnswered;
              const correctCount = norm.reduce((acc, q, i) =>
                  acc + (listAnswers[i] === q.correctAnswer ? 1 : 0), 0);
              const wrongCount = totalAnswered - correctCount;
              const persistSaved = (next: Record<number, boolean>) => {
                  const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
                  const savedKey = `mcq_saved_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
                  try { localStorage.setItem(savedKey, JSON.stringify(next)); } catch {}
              };

              return (
                  <div className="bg-slate-50 min-h-screen pb-24 animate-in fade-in slide-in-from-right-8">
                      {/* Sticky Header: back · title · READ ALL */}
                      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
                          <div className="p-3 flex items-center gap-2">
                              <button
                                  onClick={() => {
                                      // Auto-record this attempt so wrong questions
                                      // flow into the Schedule page (Revision Hub V2).
                                      // We pass user answers as a parallel array; if a
                                      // question wasn't attempted we record it as null
                                      // (treated as "not correct" → goes to wrongQuestions).
                                      try {
                                          const answersArr = norm.map((_, i) =>
                                              listAnswers[i] === undefined ? null : listAnswers[i]
                                          );
                                          recordRevisionAttempt({
                                              subjectId: subject.id || subject.name,
                                              subjectName: subject.name,
                                              chapterId: chapter.id,
                                              chapterTitle: chapter.title,
                                              pageKey: chapter.id, // chapter-level bucket
                                              pageLabel: chapter.title,
                                              questions: norm as any,
                                              userAnswers: answersArr as any,
                                          });
                                      } catch {}
                                      setViewMode('SELECTION');
                                      setListData(null);
                                      setListAnswers({});
                                      setListRevealed({});
                                  }}
                                  className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
                              >
                                  <ArrowLeft size={20} />
                              </button>
                              <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider">{listMode === 'qa' ? 'Q&A Mode' : 'MCQ Practice'}</p>
                                  <h3 className="font-black text-slate-800 leading-tight line-clamp-1 text-base">{chapter.title}</h3>
                              </div>
                              {/* READ ALL — chain reader; respects ttsRevealAnswer */}
                              {norm.length > 0 && (
                                  <McqSpeakButtons
                                      question={norm[0].question}
                                      options={norm[0].options}
                                      correctAnswer={norm[0].correctAnswer}
                                      allQuestions={norm as any}
                                      index={0}
                                      revealAnswer={ttsRevealAnswer}
                                      iconSize={14}
                                      className=""
                                  />
                              )}
                          </div>
                          {/* Counter row + 3-pill mode switcher */}
                          <div className="px-3 pb-3 flex items-center gap-2">
                              <div className="text-[11px] font-bold text-slate-600 shrink-0">
                                  <span className="text-slate-800 font-black">{Math.min(totalAnswered + 1, norm.length)} / {norm.length}</span>
                                  <span className="ml-1 text-slate-500">{norm.length} MCQs</span>
                              </div>
                              <div className="flex-1 flex bg-slate-100 p-0.5 rounded-full ml-2">
                                  <button
                                      onClick={() => setListMode('mcq')}
                                      className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-black transition-all flex items-center justify-center gap-1 ${listMode === 'mcq' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                                  >
                                      📝 MCQ
                                  </button>
                                  <button
                                      onClick={() => setListMode('qa')}
                                      className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-black transition-all flex items-center justify-center gap-1 ${listMode === 'qa' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500'}`}
                                  >
                                      💬 Q&A
                                  </button>
                                  <button
                                      onClick={() => {
                                          // Hand off to the existing Flashcard overlay.
                                          setFlashcardData(listData);
                                          setViewMode('FLASHCARD');
                                      }}
                                      className="flex-1 py-1.5 px-2 rounded-full text-[11px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all flex items-center justify-center gap-1"
                                  >
                                      🃏 FLASHCARD
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Q&A mode: top "Show All Answers" button (only when not all revealed) */}
                      {listMode === 'qa' && Object.keys(listRevealed).length < norm.length && (
                          <div className="px-4 pt-3">
                              <button
                                  onClick={() => {
                                      const all: Record<number, boolean> = {};
                                      norm.forEach((_, i) => { all[i] = true; });
                                      setListRevealed(all);
                                  }}
                                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 active:scale-95"
                              >
                                  <Eye size={14}/> Show All Answers
                              </button>
                          </div>
                      )}

                      {/* MCQ mode hint when not all answered */}
                      {listMode === 'mcq' && !allAnswered && (
                          <div className="px-4 pt-3">
                              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-3 py-2 text-[11px] font-bold text-blue-700 text-center">
                                  👆 Pick an answer for every question. Once you finish, the speaker will read out the answers too.
                              </div>
                          </div>
                      )}

                      {/* Cards */}
                      <div className="p-4 space-y-3">
                          {norm.map((q, qi) => {
                              const selected = listAnswers[qi];
                              const revealed = !!listRevealed[qi];
                              const isMcq = listMode === 'mcq';
                              const answeredHere = isMcq ? selected !== undefined : revealed;
                              const showAnswerColors = answeredHere;
                              const isSaved = !!savedQuestions[qi];

                              return (
                                  <div key={qi} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                      {/* Top row: Q-chip + topic + speaker + save (+) */}
                                      <div className="flex items-start gap-2 mb-2">
                                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">Q {qi + 1}</span>
                                          {q.topic && (
                                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate min-w-0">{q.topic}</span>
                                          )}
                                          <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                              {/* Per-card speaker — single icon, respects revealAnswer rule */}
                                              <McqSpeakButtons
                                                  question={q.question}
                                                  options={q.options}
                                                  correctAnswer={q.correctAnswer}
                                                  revealAnswer={ttsRevealAnswer}
                                                  compact
                                              />
                                              {/* Save / Bookmark "+" toggle */}
                                              <button
                                                  type="button"
                                                  onClick={() => {
                                                      const next = { ...savedQuestions, [qi]: !isSaved };
                                                      if (!next[qi]) delete next[qi];
                                                      setSavedQuestions(next);
                                                      persistSaved(next);
                                                  }}
                                                  title={isSaved ? 'Saved — tap to remove' : 'Save this question for review'}
                                                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 ${isSaved ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                              >
                                                  <span className="text-lg leading-none font-black">{isSaved ? '✓' : '+'}</span>
                                              </button>
                                              {/* Community share button */}
                                              {onShareToCommunity && (
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          const opts = q.options.length === 4
                                                              ? q.options as [string,string,string,string]
                                                              : ([...q.options, '', '', '', ''].slice(0, 4) as [string,string,string,string]);
                                                          onShareToCommunity({ question: q.question, options: opts, correctAnswer: q.correctAnswer, explanation: q.explanation || '' });
                                                      }}
                                                      title="Community MCQ tab mein share karo"
                                                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 bg-violet-50 text-violet-600 hover:bg-violet-100"
                                                  >
                                                      <Send size={14} />
                                                  </button>
                                              )}
                                          </div>
                                      </div>

                                      {/* Question text */}
                                      <p className="font-black text-slate-800 text-sm leading-snug mb-3">{q.question}</p>

                                      {/* Options */}
                                      <div className="space-y-1.5 mb-2">
                                          {q.options.map((opt: string, oi: number) => {
                                              const isCorrect = oi === q.correctAnswer;
                                              const isSelected = selected === oi;
                                              let cls = 'w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-2';
                                              if (showAnswerColors) {
                                                  if (isCorrect) cls += ' bg-emerald-50 border-emerald-300 text-emerald-800';
                                                  else if (isSelected) cls += ' bg-rose-50 border-rose-300 text-rose-800';
                                                  else cls += ' bg-slate-50 border-slate-200 text-slate-500 opacity-70';
                                              } else {
                                                  cls += ' bg-white border-slate-200 text-slate-700' + (isMcq ? ' hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer' : '');
                                              }
                                              return (
                                                  <button
                                                      type="button"
                                                      key={oi}
                                                      onClick={() => {
                                                          if (!isMcq) return;
                                                          if (selected !== undefined) return;
                                                          setListAnswers(prev => ({ ...prev, [qi]: oi }));
                                                      }}
                                                      disabled={!isMcq || selected !== undefined}
                                                      className={cls}
                                                  >
                                                      <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${showAnswerColors && isCorrect ? 'bg-emerald-500 text-white border-emerald-500' : showAnswerColors && isSelected ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-300 text-slate-500'}`}>
                                                          {String.fromCharCode(65 + oi)}
                                                      </span>
                                                      <span className="flex-1">{opt}</span>
                                                      {showAnswerColors && isCorrect && <CheckCircle size={16} className="text-emerald-600" />}
                                                  </button>
                                              );
                                          })}
                                      </div>

                                      {/* Q&A mode: tap-to-reveal trigger when not yet revealed */}
                                      {!isMcq && !revealed && (
                                          <button
                                              onClick={() => setListRevealed(p => ({ ...p, [qi]: true }))}
                                              className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:from-blue-100 hover:to-purple-100 transition-all"
                                          >
                                              <Eye size={12}/> Tap to Reveal Answer
                                          </button>
                                      )}

                                      {/* MCQ mode: hint when not yet answered */}
                                      {isMcq && selected === undefined && (
                                          <p className="text-[10px] font-bold text-slate-400 text-center py-1">👆 Pick an answer</p>
                                      )}

                                      {/* Reset (MCQ mode only) */}
                                      {isMcq && selected !== undefined && (
                                          <button
                                              onClick={() => setListAnswers(prev => { const n = { ...prev }; delete n[qi]; return n; })}
                                              className="w-full mt-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] active:scale-95 transition flex items-center justify-center gap-1"
                                          >
                                              <RefreshCw size={11}/> Try again
                                          </button>
                                      )}

                                      {/* Explanation block (visible after answer/reveal) */}
                                      {answeredHere && q.explanation && (
                                          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                              <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">Explanation</p>
                                              <p className="text-xs text-slate-800 leading-relaxed">{q.explanation}</p>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}

                          {/* Score Summary (MCQ mode, all answered) */}
                          {listMode === 'mcq' && allAnswered && (
                              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-lg">
                                  <p className="text-[10px] font-black uppercase tracking-wider opacity-90 mb-1">Final Score</p>
                                  <p className="text-3xl font-black mb-3">{Math.round((correctCount / norm.length) * 100)}%</p>
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                      <div className="bg-white/15 rounded-xl py-2"><div className="text-[10px] opacity-80">Attempted</div><div className="text-base">{totalAnswered}</div></div>
                                      <div className="bg-white/15 rounded-xl py-2"><div className="text-[10px] opacity-80">Correct</div><div className="text-base">{correctCount}</div></div>
                                      <div className="bg-white/15 rounded-xl py-2"><div className="text-[10px] opacity-80">Wrong</div><div className="text-base">{wrongCount}</div></div>
                                  </div>
                                  <button
                                      onClick={() => { setListAnswers({}); }}
                                      className="mt-4 w-full py-2.5 rounded-xl bg-white text-indigo-700 font-black text-xs flex items-center justify-center gap-2 active:scale-95"
                                  >
                                      <RefreshCw size={14}/> Phir se Try Karo
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              );
          })()
       ) : viewMode !== 'SELECTION' && lessonContent ? (
          <LessonView
              content={lessonContent}
              subject={subject}
              classLevel={classLevel as any}
              chapter={chapter}
              loading={false}
              onBack={() => setViewMode('SELECTION')}
              onMCQComplete={handleMCQComplete}
              user={user}
              onUpdateUser={onUpdateUser}
              settings={settings}
              instantExplanation={mcqMode === 'PREMIUM'}
              onShowMarksheet={(result) => {
                  if (result) {
                      setResultData(result);
                      // Don't change viewMode, let MarksheetCard overlay handle it
                  }
              }}
          />
       ) : (
        <div className="bg-white min-h-screen pb-20 animate-in fade-in slide-in-from-right-8">
           {/* HEADER */}
           <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm p-4 flex items-center gap-3">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
               <ArrowLeft size={20} />
           </button>
           <div className="flex-1">
               <h3 className="font-bold text-slate-800 leading-tight line-clamp-1">
                   {topicFilter ? `${topicFilter} (Topic)` : chapter.title}
               </h3>
               <p className="text-xs text-slate-600">{subject.name} • MCQ Center</p>
           </div>
           
           <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
               <Crown size={14} className="text-blue-600" />
               <span className="font-black text-blue-800 text-xs">{user.credits} CR</span>
           </div>
       </div>

       {/* === LUCENT-STYLE NOTES ↔ MCQ TAB SWITCH === */}
       {onSwitchToNotes && (
           <div className="px-4 pt-3">
               <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                   <button
                       onClick={onSwitchToNotes}
                       className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-slate-600 hover:bg-white/60 transition-all"
                   >
                       <BookOpen size={14}/> 📚 Notes
                   </button>
                   <button
                       disabled
                       className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-white text-blue-600 shadow-sm"
                   >
                       <HelpCircle size={14}/> 📝 MCQ
                   </button>
               </div>
           </div>
       )}

       {/* === LUCENT-STYLE PRIMARY ENTRY (Start Practice + Flashcard) ===
            The previous 3-pill chooser (MCQ / Q&A / Flashcard) was removed
            because Q&A and the standalone MCQ pill were causing a crash for
            class 6–12. Free Practice from "Advanced Test Mode" still launches
            the same Lucent-style interactive list — and you can flip to Q&A
            mode from inside that list using the in-view pills. */}
       <div className="px-4 pt-3">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2 ml-1">Start Practice</label>
           <div className="grid grid-cols-2 gap-2">
               <button
                   onClick={() => handleStartList('mcq')}
                   disabled={loading}
                   className="py-4 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1 transition-all border-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600 shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
               >
                   <span className="text-2xl leading-none">📝</span>
                   <span>Practice MCQs</span>
               </button>
               <button
                   onClick={() => handleStartFlashcard()}
                   disabled={loading}
                   className="py-4 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1 transition-all border-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-600 shadow-lg shadow-amber-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
               >
                   <span className="text-2xl leading-none">🃏</span>
                   <span>Flashcard</span>
               </button>
           </div>
           <p className="text-[10px] text-slate-500 text-center mt-2">Tap to start. You can switch to Q&amp;A view inside the practice screen.</p>
       </div>

       <div className="p-6 space-y-4">
           {/* TOPIC SELECTOR (NEW) */}
           {availableTopics.length > 0 && !topicFilter && (
               <div className="mb-4">
                   <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Practice Specific Topic</label>
                   <select
                       value={selectedTopic}
                       onChange={(e) => setSelectedTopic(e.target.value)}
                       className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                   >
                       <option value="">All Topics (Mixed)</option>
                       {availableTopics.map(t => (
                           <option key={t} value={t}>{t}</option>
                       ))}
                   </select>
               </div>
           )}

           {/* === ADVANCED TEST MODE (collapsible) ===
                Holds the legacy Free Practice + Premium (Timed) Test cards.
                For class 6–12 we hide this entire section — the new "Practice
                MCQs" button above is the unified entry point (it already
                launches the same Lucent-style interactive list as Free
                Practice, but without daily limits). Higher classes /
                competition still see the full advanced flow. */}
           {!['6','7','8','9','10','11','12'].includes(String(classLevel)) && (
           <button
               onClick={() => setShowAdvancedTest(v => !v)}
               className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
           >
               <span className="flex items-center gap-2"><Trophy size={14}/> Advanced Test Mode (Timed + Coins)</span>
               {showAdvancedTest ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
           </button>
           )}

           {/* FREE PRACTICE — gated by advanced disclosure (class 6-12 me hidden) */}
           {showAdvancedTest && !['6','7','8','9','10','11','12'].includes(String(classLevel)) && (() => {
               const access = checkFeatureAccess('MCQ_FREE', user, settings || {});
               const isLocked = false; // Unlocked for all per user request

               return (
                   <button
                       onClick={() => {
                           if (isLocked) {
                               setAlertConfig({isOpen: true, title: "Locked", message: "Free Practice is currently disabled by Admin."});
                               return;
                           }
                           handleStart('PRACTICE');
                       }}
                       disabled={loading}
                       className={`w-full p-6 rounded-3xl border-2 transition-all group text-left relative overflow-hidden ${
                           isLocked
                           ? 'bg-slate-100 border-slate-200 opacity-60 grayscale cursor-not-allowed'
                           : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                       }`}
                   >
                       <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <HelpCircle size={80} className="text-blue-600" />
                       </div>
                       <div className="relative z-10">
                           <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 relative">
                               <CheckCircle size={24} />
                               {isLocked && <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><Lock size={12}/></div>}
                           </div>
                           <h4 className="text-xl font-black text-slate-800 mb-1">Free Practice</h4>
                           <p className="text-sm text-slate-600 mb-4">
                               {user.subscriptionTier !== 'FREE' ? 'Unlimited Standard Practice' : 'Basic practice mode. Analysis costs 20 Coins.'}
                           </p>
                           <span className={`px-4 py-2 rounded-lg text-xs font-bold shadow-lg ${isLocked ? 'bg-slate-400 text-white' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                               {isLocked ? 'LOCKED' : 'START NOW'}
                           </span>
                       </div>
                   </button>
               );
           })()}

           {/* PREMIUM TEST — gated by advanced disclosure
                User request: hide Premium Test entirely for class 6–12.
                We still keep the card for higher classes / non-school streams. */}
           {showAdvancedTest && !['6','7','8','9','10','11','12'].includes(String(classLevel)) && (() => {
               const access = checkFeatureAccess('MCQ_PREMIUM', user, settings || {});
               // If strict feed lock, hide or lock visually. If pay-per-view, show cost.
               const isLocked = false; // Unlocked for all per user request
               const cost = access.cost > 0 ? access.cost : (settings?.mcqTestCost || 0);
               const isDifficultyEnabled = settings?.featureConfig?.['MCQ_DIFFICULTY_FILTER']?.enabled ?? true;

               return (
                   <div className={`w-full p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${
                           isLocked
                           ? 'bg-slate-100 border-slate-200 grayscale'
                           : 'bg-white border-slate-200'
                       }`}>
                       <div className="absolute right-0 top-0 p-4 opacity-10 pointer-events-none">
                           <Trophy size={80} className="text-purple-600" />
                       </div>
                       <div className="relative z-10">
                           <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 relative">
                               <PlayCircle size={24} />
                               {isLocked && <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><Lock size={12}/></div>}
                           </div>
                           <h4 className="text-xl font-black text-slate-800 mb-1">Premium Test</h4>
                           <p className="text-sm text-slate-600 mb-4">
                               Instant Explanations + Auto-Read + Full Analysis.
                           </p>

                           {isDifficultyEnabled && !isLocked && (
                               <div className="mb-4">
                                   <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Select Difficulty</label>
                                   <div className="flex bg-slate-100 p-1 rounded-xl">
                                       <button
                                           onClick={() => setSelectedDifficulty('EASY')}
                                           className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDifficulty === 'EASY' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
                                       >
                                           Easy
                                       </button>
                                       <button
                                           onClick={() => setSelectedDifficulty('MEDIUM')}
                                           className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDifficulty === 'MEDIUM' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                                       >
                                           Medium
                                       </button>
                                       <button
                                           onClick={() => setSelectedDifficulty('HARD')}
                                           className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDifficulty === 'HARD' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                                       >
                                           Hard
                                       </button>
                                       <button
                                           onClick={() => setSelectedDifficulty('MIXED')}
                                           className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedDifficulty === 'MIXED' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
                                       >
                                           Mixed
                                       </button>
                                   </div>
                               </div>
                           )}

                           <div className="flex items-center gap-2">
                               <button
                                   onClick={() => handleStart('TEST')}
                                   disabled={loading || isLocked}
                                   className={`px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95 ${isLocked ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-purple-600 text-white shadow-purple-200'}`}
                               >
                                   {isLocked ? 'LOCKED' : 'START TEST'}
                               </button>
                               {cost > 0 && user.subscriptionTier === 'FREE' && !isLocked && (
                                   <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">{cost} CR</span>
                               )}
                           </div>
                       </div>
                   </div>
               );
           })()}
           
           {/* Old standalone Flashcard card removed — now lives in the
               Lucent-style 3-mode selector strip at the top of this view. */}

           {loading && <div className="text-center py-4 text-slate-600 font-bold animate-pulse">Loading Questions...</div>}
       </div>

       {/* HISTORY & DASHBOARD */}
       <div className="px-6 pb-6 space-y-4">
           {user.mcqHistory && user.mcqHistory.filter(h => h.chapterId === chapter.id).length > 0 && (
               <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                   <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                       <Clock size={16} /> History & Unlocked
                   </h4>
                   <div className="space-y-2">
                       {(showMoreHistory ? user.mcqHistory.filter(h => h.chapterId === chapter.id) : user.mcqHistory.filter(h => h.chapterId === chapter.id).slice(0, 5)).map((attempt, idx) => (
                           <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                               <div>
                                   <div className="flex items-center gap-2">
                                       <span className={`text-xs font-bold px-2 py-0.5 rounded ${attempt.score/attempt.totalQuestions >= 0.8 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                           {Math.round((attempt.score/attempt.totalQuestions)*100)}%
                                       </span>
                                       <span className="text-xs text-slate-600">{new Date(attempt.date).toLocaleDateString()}</span>
                                   </div>
                               </div>
                               <button
                                   onClick={() => {
                                       setResultData(attempt);
                                       setMcqMode('FREE'); // Default to restricted view for history
                                       // History logic...
                                   }}
                                   className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                               >
                                   View
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
           )}
       </div>
       
       {/* AI INTERSTITIAL */}
       {showInterstitial && (
           <AiInterstitial 
               user={user}
               onComplete={handleInterstitialComplete}
               customImage={pendingStart?.data?.chapterAiImage || settings?.aiLoadingImage}
               contentType="MCQ"
           />
       )}
    </div>
    )}
    </>
  );
};
