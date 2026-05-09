import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Chapter, User, Subject, SystemSettings, HtmlModule, PremiumNoteSlot, DeepDiveEntry, AdditionalNoteEntry } from '../types';
import { FileText, Lock, ArrowLeft, Crown, Star, CheckCircle, AlertCircle, Globe, Maximize, Minimize, Layers, HelpCircle, Minus, Plus, Volume2, Square, Zap, Headphones, BookOpen, Music, Play, Pause, SkipForward, SkipBack, Book, List, Layout, ExternalLink, GraduationCap, ChevronRight, Sparkles, RotateCw, Palette, Type } from 'lucide-react';
import { ReadingStylePopover } from './ReadingStylePopover';
import { CustomAlert } from './CustomDialogs';
import { getChapterData, saveUserToLive } from '../firebase';
import { CreditConfirmationModal } from './CreditConfirmationModal';
import { AiInterstitial } from './AiInterstitial';
import { InfoPopup } from './InfoPopup';
import { SpeakButton } from './SpeakButton';
import { ChunkedNotesReader } from './ChunkedNotesReader';
import { ErrorBoundary } from './ErrorBoundary';
import { DEFAULT_CONTENT_INFO_CONFIG } from '../constants';
import { saveRecentChapter, markReadToday } from '../utils/recentReads';
import { checkFeatureAccess } from '../utils/permissionUtils';
import { speakText, stopSpeech, stripHtml } from '../utils/textToSpeech';
import { saveOfflineItem } from '../utils/offlineStorage';
import { Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Props {
  chapter: Chapter;
  subject: Subject;
  user: User;
  board: string;
  classLevel: string;
  stream: string | null;
  onBack: () => void;
  onUpdateUser: (user: User) => void;
  settings?: SystemSettings;
  initialSyllabusMode?: 'SCHOOL' | 'COMPETITION';
  directResource?: { url: string, access: string };
  // NEW: Lucent-style cross-tab switch from Notes (PdfView) → MCQ (McqView).
  onSwitchToMcq?: () => void;
  onSwitchToFlashcard?: () => void;
  /** When true, hides the sticky top header (used by landscape floating button). */
  hideHeader?: boolean;
}

// Helper to remove leading/trailing artifacts like quotes, HTML entities, emojis, and dashes from Quick Revision points
const cleanArtifacts = (text: string): string => {
    let cleanText = text;
    let prevText = "";

    // First, decode common HTML entities that might render as text
    cleanText = cleanText.replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ');

    while (cleanText !== prevText) {
        prevText = cleanText;
        // Leading symbols
        cleanText = cleanText.replace(/^['">\-\s🔁🔄📌💡📝⚡]+/, '').trim();
        // Leading HTML entities
        cleanText = cleanText.replace(/^(?:&gt;|&lt;|&amp;gt;|&quot;|&apos;)/i, '').trim();
        // Literal trigger words that might have bled through if tags were mismatched
        cleanText = cleanText.replace(/^(?:Quick Revision|Mini Revision|Recap|Summary|Key Points|महत्वपूर्ण बिंदु|सार|संशोधन|तथ्य|Topic Quick Recap)\s*:/i, '').trim();
        // Trailing empty HTML tags or breaks
        cleanText = cleanText.replace(/(?:<br\s*\/?>|\s)+$/i, '').trim();
        cleanText = cleanText.replace(/(?:<b>\s*<\/b>|<strong>\s*<\/strong>|<p>\s*<\/p>)$/i, '').trim();
        // Trailing dashes or dots if it's clearly a visual artifact and not a sentence end
        // Let's be careful with dots, but trailing dashes or quotes can go.
        cleanText = cleanText.replace(/['"\-\s🔁🔄📌💡📝⚡]+$/, '').trim();
    }

    return cleanText;
};

// Helper to format Google Drive links for embedding
const formatDriveLink = (link: string) => {
    if (!link) return '';
    // If it's a view link, convert to preview
    let formatted = link;
    if (link.includes('drive.google.com') && (link.includes('/view') || link.endsWith('/view'))) {
        formatted = link.replace(/\/view.*/, '/preview');
    }

    // Add parameters to suppress UI (Minimal Mode + Embedded)
    if (formatted.includes('drive.google.com')) {
        if (!formatted.includes('rm=minimal')) {
            formatted += formatted.includes('?') ? '&rm=minimal' : '?rm=minimal';
        }
        if (!formatted.includes('embedded=true')) {
            formatted += '&embedded=true';
        }
    }

    // NotebookLM (pass-through)
    if (formatted.includes('notebooklm.google.com')) {
        return formatted;
    }

    return formatted;
};

// Helper to split HTML content into topics (SAFE)
const extractTopicsFromHtml = (html: string): { title: string, content: string }[] => {
    if (!html) return [];

    try {
        // Create a temporary element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const topics: { title: string, content: string }[] = [];
        let currentTitle = "Introduction";
        let currentContent: string[] = [];

        // Check if there are ANY top-level h1 or h2 tags to split by
        const hasTopLevelHeader = Array.from(tempDiv.children).some(child =>
            child.tagName.toLowerCase() === 'h1' || child.tagName.toLowerCase() === 'h2'
        );

        // If no headers to split by, return the whole chunk to prevent data loss
        if (!hasTopLevelHeader && html.trim().length > 0) {
            return [{ title: "Notes", content: html }];
        }

        const childNodes = Array.from(tempDiv.childNodes);

        childNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                const tagName = element.tagName.toLowerCase();

                if (tagName === 'h1' || tagName === 'h2') {
                    // Push previous topic if exists
                    if (currentContent.length > 0 && currentContent.join("").trim().length > 0) {
                        topics.push({
                            title: currentTitle || "Untitled Topic",
                            content: currentContent.join(""),
                        });
                        currentContent = [];
                    }
                    currentTitle = element.textContent || "Untitled Topic";
                } else {
                    currentContent.push(element.outerHTML);
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                currentContent.push(node.textContent || "");
            }
        });

        // Push the last topic
        if (currentContent.length > 0 || topics.length === 0) {
            topics.push({
                title: currentTitle || "Untitled Topic",
                content: currentContent.join(""),
            });
        }

        return topics;
    } catch (e) {
        console.error("HTML Parsing Error (Safe Fallback):", e);
        // Fallback to single safe block
        return [{ title: "Content Error", content: "Error displaying formatted notes. Please contact admin." }];
    }
};

export const PdfView: React.FC<Props> = ({ 
  chapter, subject, user, board, classLevel, stream, onBack, onUpdateUser, settings, initialSyllabusMode, directResource, onSwitchToMcq, onSwitchToFlashcard, hideHeader
}) => {
  const [contentData, setContentData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syllabusMode, setSyllabusMode] = useState<'SCHOOL' | 'COMPETITION'>(initialSyllabusMode || 'SCHOOL');
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<{title: string, content: string, pdfUrl?: string, audioUrl?: string} | null>(null); // NEW: HTML Note Content + Optional PDF
  const [activeLang, setActiveLang] = useState<'ENGLISH' | 'HINDI'>('ENGLISH');
  const [pendingPdf, setPendingPdf] = useState<{type: string, price: number, link: string, tts?: string} | null>(null);
  
  // NEW: TAB STATE
  const [activeTab, setActiveTab] = useState<'DEEP_DIVE' | 'PREMIUM' | 'RESOURCES' | 'TEACHER'>('DEEP_DIVE');
  const [sessionUnlockedTabs, setSessionUnlockedTabs] = useState<string[]>([]);
  const [quickRevisionPoints, setQuickRevisionPoints] = useState<{title: string, points: string[]}[]>([]);
  const [currentPremiumEntryIdx, setCurrentPremiumEntryIdx] = useState(0);

  // INLINE EXPAND STATE: which Concept-card's "Read More" Additional Note is open
  // (rendered inline below the topic instead of opening a fullscreen overlay).
  const [expandedNoteIdx, setExpandedNoteIdx] = useState<number | null>(null);
  // RETENTION (PREMIUM) tab — let user toggle a "PDF only" mode that hides
  // the entire sticky header so the PDF gets the full screen height.
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  // RETENTION (PREMIUM) tab — manual 90° rotation. Ek tap = +90° clockwise
  // (0 → 90 → 180 → 270 → 0). User ne specifically request kiya tha kyunki
  // Drive-rendered PDFs ka vertical title left margin par hota hai aur
  // 90°/180°/270° me se koi orientation user ke device + content ke liye
  // best fit ho sakti hai. 4 tap me wapas original orientation aa jaati hai.
  const [pdfRotation, setPdfRotation] = useState(0);
  const rotatePdf = () => setPdfRotation(r => (r + 90) % 360);
  const [isTeacherReading, setIsTeacherReading] = useState(false);
  // INLINE READ MORE — color theme picker. ChunkedNotesReader apna khud
  // ka colour control deta hai but uska state library reference ke andar
  // re-mount par reset ho jata hai. Yahaan ek lightweight wrapper-level
  // tint maintain karte hain (default cream so reading easy ho).
  // Each theme carries an explicit `textHex` because ChunkedNotesReader
  // applies an inline `style.color` on every line — Tailwind text classes on
  // the wrapper alone get overridden. We pass `textHex` as
  // `textColorOverride` so wrapper bg + line-text always match as a coherent
  // preset (and the inner palette picker auto-hides in that mode).
  const READ_MORE_THEMES = [
      { id: 'cream', label: 'Cream', bg: 'bg-amber-50',    text: 'text-stone-900', textHex: '#1c1917', border: 'border-amber-200',   dot: 'bg-amber-200' },
      { id: 'white', label: 'White', bg: 'bg-white',       text: 'text-slate-900', textHex: '#0f172a', border: 'border-slate-200',   dot: 'bg-white border border-slate-300' },
      { id: 'sepia', label: 'Sepia', bg: 'bg-orange-50',   text: 'text-stone-900', textHex: '#44403c', border: 'border-orange-200',  dot: 'bg-orange-200' },
      { id: 'mint',  label: 'Mint',  bg: 'bg-emerald-50',  text: 'text-emerald-900', textHex: '#064e3b', border: 'border-emerald-200', dot: 'bg-emerald-200' },
      { id: 'dark',  label: 'Dark',  bg: 'bg-slate-900',   text: 'text-slate-50',  textHex: '#f1f5f9', border: 'border-slate-700',   dot: 'bg-slate-800' },
  ] as const;
  const [readMoreThemeId, setReadMoreThemeId] = useState<string>('cream');
  const readMoreTheme = READ_MORE_THEMES.find(t => t.id === readMoreThemeId) || READ_MORE_THEMES[0];

  // SCROLL TO HIDE HEADER STATE
  const [showHeader, setShowHeader] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  // Reading-style popover (font size + 686 font family picker) — opened via
  // the small "Aa" button in the header. Persists choices to the same
  // localStorage keys ChunkedNotesReader uses, so tabs/lessons stay in sync.
  const [showReadingStyle, setShowReadingStyle] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const scrollRestoredRef = useRef(false);
  const SCROLL_STORAGE_KEY = `nst_chapter_scroll_${chapter.id}`;

  // Swipe handling state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Scroll handling

  // Swipe handler logic
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (virtualListLength: number) => {
    if (touchStartX === null || touchEndX === null) return;

    const distance = touchEndX - touchStartX;
    const isLeftSwipe = distance < -50;
    const isRightSwipe = distance > 50;

    // Left-to-right swipe -> Next Page
    if (isRightSwipe && virtualListLength > 1) {
        if (currentPremiumEntryIdx < virtualListLength - 1) {
            setCurrentPremiumEntryIdx(currentPremiumEntryIdx + 1);
            stopSpeech();
        }
    }
    // Right-to-left swipe -> Previous Page
    else if (isLeftSwipe && virtualListLength > 1) {
        if (currentPremiumEntryIdx > 0) {
            setCurrentPremiumEntryIdx(currentPremiumEntryIdx - 1);
            stopSpeech();
        }
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const currentScrollY = target.scrollTop;
      // Sticky tabs: keep the Concept / Retention / Teaching Strategy strip
      // ALWAYS visible. Earlier the entire header (title row + tabs) auto-hid
      // on scroll-down, which left students stranded — they had to scroll all
      // the way back up to switch tabs. Now the header simply never collapses
      // so the tab card is permanently fixed at the top.
      setShowHeader(true);
      lastScrollY.current = currentScrollY;

      // Reading progress (0-100)
      const maxScroll = target.scrollHeight - target.clientHeight;
      const pct = maxScroll > 0 ? Math.min(100, Math.max(0, (currentScrollY / maxScroll) * 100)) : 0;
      setScrollProgress(pct);

      // Persist last-read scroll position (debounced) so reopening the chapter restores it
      if (scrollRestoredRef.current) {
          if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
          scrollSaveTimerRef.current = window.setTimeout(() => {
              try {
                  if (currentScrollY > 20) {
                      localStorage.setItem(SCROLL_STORAGE_KEY, String(Math.round(currentScrollY)));
                      // Also push into recent-reads list so Home tab can show "Resume reading"
                      const recentId = `${board}_${classLevel}_${subject?.name || ''}_${chapter.id}`;
                      saveRecentChapter({
                          id: recentId,
                          scrollY: Math.round(currentScrollY),
                          scrollPct: Math.round(pct),
                          contentType: 'PDF',
                          board: board || '',
                          classLevel: classLevel || '',
                          stream: stream || '',
                          subject: subject as any,
                          chapter,
                      });
                      markReadToday(recentId);
                  } else {
                      localStorage.removeItem(SCROLL_STORAGE_KEY);
                  }
              } catch {}
          }, 400);
      }
  };

  // Restore last-read scroll position when the chapter is reopened (Continue
  // Reading flow OR normal re-open). Earlier this only ran once on
  // [chapter.id, contentData] change, but the deep-dive cards / images / PDFs
  // keep rendering AFTER contentData is set — so scrollHeight at the moment
  // of restore was usually smaller than the saved position, and the clamp
  // `Math.min(saved, scrollHeight - clientHeight)` snapped the user to a
  // wrong (often partway) position. Now we keep retrying for ~3 seconds via
  // a ResizeObserver: every time content height grows, if the saved
  // position is now reachable AND the user hasn't manually scrolled, we
  // re-apply it. As soon as the user scrolls themselves (or 3s passes), we
  // stop touching scrollTop and switch to "save mode".
  useEffect(() => {
      scrollRestoredRef.current = false;
      const node = scrollContainerRef.current;
      if (!node) return;

      let saved = 0;
      try {
          saved = parseInt(localStorage.getItem(SCROLL_STORAGE_KEY) || '0', 10) || 0;
      } catch {}

      // Nothing saved -> we're at the top, no restore needed; just enable save mode.
      if (saved <= 0) {
          scrollRestoredRef.current = true;
          return;
      }

      let cancelled = false;
      let lastAppliedTarget = -1;
      // Mark restore "done" the moment the user scrolls themselves so we
      // don't fight their input. handleScroll already updates lastScrollY,
      // so we just compare the live scrollTop to our last applied target.
      const userScrolledAway = () => {
          const cur = node.scrollTop;
          // Only count as "user scrolled" once we've actually applied at least
          // once, AND the current position differs from what we set by > ~30px.
          if (lastAppliedTarget < 0) return false;
          return Math.abs(cur - lastAppliedTarget) > 30;
      };

      const tryApply = () => {
          if (cancelled || scrollRestoredRef.current) return;
          if (userScrolledAway()) {
              scrollRestoredRef.current = true;
              return;
          }
          const max = node.scrollHeight - node.clientHeight;
          // Wait until the page is at least tall enough to actually reach the
          // saved position — otherwise we'd land halfway and look broken.
          if (max <= 0) return;
          const target = Math.min(saved, max);
          // If we're still short of the saved spot, reapply at the current
          // best target so user isn't stuck at the very top while content loads.
          if (Math.abs(node.scrollTop - target) > 4) {
              node.scrollTop = target;
              lastAppliedTarget = target;
              lastScrollY.current = node.scrollTop;
              setScrollProgress(max > 0 ? Math.min(100, (node.scrollTop / max) * 100) : 0);
          }
          // Once the page is tall enough that `target === saved` (i.e. we
          // can fully honour the saved position), we're done.
          if (max >= saved) {
              scrollRestoredRef.current = true;
          }
      };

      // First attempt on next two animation frames (rendered tabs measurable).
      const raf1 = requestAnimationFrame(() => {
          requestAnimationFrame(tryApply);
      });

      // Re-apply every time the container's content size grows (e.g. as
      // deep-dive cards mount, images load, embedded PDFs settle).
      let resizeObs: ResizeObserver | null = null;
      try {
          if (typeof ResizeObserver !== 'undefined') {
              resizeObs = new ResizeObserver(() => tryApply());
              resizeObs.observe(node);
              // Also observe the immediate child wrapper if there's one,
              // since that's usually what actually grows.
              const child = node.firstElementChild as Element | null;
              if (child) resizeObs.observe(child);
          }
      } catch {}

      // Hard timeout — after 3s, give up and let the user scroll freely.
      const giveUpTimer = window.setTimeout(() => {
          scrollRestoredRef.current = true;
      }, 3000);

      return () => {
          cancelled = true;
          cancelAnimationFrame(raf1);
          window.clearTimeout(giveUpTimer);
          if (resizeObs) { try { resizeObs.disconnect(); } catch {} }
          if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
      };
  }, [chapter.id, contentData]);

  // PREMIUM TTS STATE
  const [premiumChunks, setPremiumChunks] = useState<string[]>([]);
  const [premiumChunkIndex, setPremiumChunkIndex] = useState(0);

  // DEEP DIVE STATE
  const [isDeepDiveMode, setIsDeepDiveMode] = useState(false);
  const [deepDiveTopics, setDeepDiveTopics] = useState<{ title: string, content: string, audioUrl?: string, pdfLink?: string }[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [topicSpeakingState, setTopicSpeakingState] = useState<number | null>(null); // Index of topic currently speaking

  // TEACHER STRATEGY STATE
  const [currentStrategyIndex, setCurrentStrategyIndex] = useState(0);
  // Topic change hone par teacher TTS band kar do
  useEffect(() => {
    stopSpeech();
    setIsTeacherReading(false);
  }, [currentStrategyIndex]);

  // CONTINUE READING POSITION TRACKING
  // Saves which topic card + which line was last being read, so:
  // 1. Opening from Continue Reading shows a "Last Read" badge on that card
  // 2. "Read All" resumes from that topic+line instead of always starting from topic 0
  const CR_TOPIC_KEY = `nst_cr_topic_${chapter.id}`;
  const CR_LINE_KEY  = `nst_cr_line_${chapter.id}`;
  const [lastReadTopicIdx, setLastReadTopicIdx] = useState<number>(() => {
      try { return parseInt(localStorage.getItem(CR_TOPIC_KEY) || '0', 10) || 0; } catch { return 0; }
  });
  const [lastReadLineMap, setLastReadLineMap] = useState<Record<number, number>>(() => {
      try { return JSON.parse(localStorage.getItem(CR_LINE_KEY) || '{}'); } catch { return {}; }
  });
  const saveReadPosition = (topicIdx: number, lineIdx: number) => {
      setLastReadTopicIdx(topicIdx);
      setLastReadLineMap(prev => {
          const next = { ...prev, [topicIdx]: lineIdx };
          try { localStorage.setItem(CR_LINE_KEY, JSON.stringify(next)); } catch {}
          return next;
      });
      try { localStorage.setItem(CR_TOPIC_KEY, String(topicIdx)); } catch {}
  };

  // When chapter opens from Continue Reading, scroll to the last read topic card
  useEffect(() => {
      if (lastReadTopicIdx <= 0) return;
      const t = setTimeout(() => {
          document.getElementById(`topic-card-${lastReadTopicIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 700);
      return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ZOOM STATE
  const [zoom, setZoom] = useState(1);
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  
  // INFO POPUP STATE
  const [infoPopup, setInfoPopup] = useState<{isOpen: boolean, config: any, type: 'FREE' | 'PREMIUM'}>({isOpen: false, config: {}, type: 'FREE'});

  // TTS STATE (Global)
  const [speechRate, setSpeechRate] = useState(1.0);

  const getFeatureIdForTab = (tab: string) => {
      switch(tab) {
          case 'DEEP_DIVE': return 'DEEP_DIVE';
          case 'PREMIUM': return 'PREMIUM_NOTES';
          case 'RESOURCES': return 'ADDITIONAL_NOTES';
          case 'TEACHER': return 'TEACHER_STRATEGY';
          default: return 'DEEP_DIVE';
      }
  };

  const getTabAccess = (tabId: string) => {
      // 1. Admin / Bypass
      if (user.role === 'ADMIN') return { hasAccess: true, cost: 0, reason: 'ADMIN' };
      if (user.unlockedContent && user.unlockedContent.includes(chapter.id)) return { hasAccess: true, cost: 0, reason: 'CHAPTER_UNLOCKED' };

      // 1.5. Teacher Bypass for Teacher Strategy
      if (tabId === 'TEACHER' && (user.role === 'TEACHER' || !!user.teacherCode)) {
          return { hasAccess: true, cost: 0, reason: 'TEACHER_ACCESS' };
      }

      // 2. Session Unlock
      if (sessionUnlockedTabs.includes(tabId)) return { hasAccess: true, cost: 0, reason: 'SESSION_UNLOCKED' };

      // Special handling for RESOURCES/Additional Notes to guarantee ULTRA and BASIC have access
      if (tabId === 'RESOURCES' && (user.subscriptionLevel === 'ULTRA' || user.subscriptionLevel === 'BASIC')) {
          return { hasAccess: true, cost: 0, reason: 'PREMIUM_OVERRIDE' };
      }

      // 3. Use NSTA Control (checkFeatureAccess) for all tabs
      const featureId = getFeatureIdForTab(tabId);
      const accessObj = checkFeatureAccess(featureId, user, settings || {});

      if (!accessObj.hasAccess) {
          return { hasAccess: false, cost: accessObj.cost || 0, reason: accessObj.reason || 'LOCKED' };
      }

      // 4. Require Credits if configured
      if (accessObj.cost > 0 && !sessionUnlockedTabs.includes(tabId)) {
          return { hasAccess: false, cost: accessObj.cost, reason: 'CREDITS_REQUIRED' };
      }

      return { hasAccess: true, cost: 0, reason: 'GRANTED' };
  };
  
  const formatAudioUrl = (url: string) => {
      if (!url) return '';
      if (url.includes('drive.google.com/file/d/')) {
          const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
              return `https://docs.google.com/uc?export=download&id=${match[1]}`;
          }
      }
      return url;
  };

  const playCustomAudio = (url: string) => {
      const formattedUrl = formatAudioUrl(url);
      stopAllSpeech(); // Stop TTS if running

      const existingAudio = document.getElementById('custom-audio-player') as HTMLAudioElement;
      if (existingAudio) {
          if (existingAudio.src === formattedUrl || existingAudio.src === url) {
              if (!existingAudio.paused) {
                  existingAudio.pause();
              } else {
                  existingAudio.play();
              }
              return;
          } else {
              existingAudio.pause();
              existingAudio.remove();
          }
      }

      const audio = new Audio(formattedUrl);
      audio.id = 'custom-audio-player';
      audio.play();
      document.body.appendChild(audio);
      audio.onended = () => audio.remove();
  };



  const stopAllSpeech = () => {
      stopSpeech();
      setIsAutoPlaying(false);
      setTopicSpeakingState(null);
      setPremiumChunks([]);
      setPremiumChunkIndex(0);
  };

  useEffect(() => {
    return () => stopAllSpeech();
  }, [activePdf, isDeepDiveMode, activeTab]);

  // PREMIUM AUTO-PLAY LOGIC (Chunked)
  useEffect(() => {
      if (isAutoPlaying && activeTab === 'PREMIUM' && premiumChunks.length > 0) {
          if (premiumChunkIndex < premiumChunks.length) {
              speakText(
                  premiumChunks[premiumChunkIndex],
                  null,
                  speechRate,
                  'hi-IN',
                  undefined,
                  () => {
                      // On Chunk End
                      if (isAutoPlaying) { // Ensure user hasn't stopped it
                          if (premiumChunkIndex + 1 < premiumChunks.length) {
                              setPremiumChunkIndex(prev => prev + 1);
                          } else {
                              setIsAutoPlaying(false);
                              setPremiumChunkIndex(0);
                          }
                      }
                  }
              );
          }
      }
  }, [isAutoPlaying, premiumChunkIndex, activeTab, premiumChunks]);

  // DEEP DIVE AUTO-PLAY LOGIC
  // ─────────────────────────────────────────────────────────────────────────
  // Earlier this effect spoke the WHOLE topic content as one big speakText
  // chunk, which meant the Concept page never showed the active line, never
  // auto-scrolled within a topic, and the per-line star/tap-to-read affordance
  // was wasted. Now the page-level "Read All" simply selects which topic is
  // currently active — each topic's <ChunkedNotesReader> picks that up via
  // its `autoStart` prop and runs its own line-by-line TTS with highlight +
  // auto-scroll. When ChunkedNotesReader fires `onComplete`, the parent
  // advances to the next topic (handled inline in the topic .map below).
  //
  // The only thing we still do here is keep the active topic CARD scrolled
  // into view whenever auto-play moves on, so the new active card is visible
  // while its lines start streaming.
  useEffect(() => {
      if (!isAutoPlaying || activeTab !== 'DEEP_DIVE') return;
      if (deepDiveTopics.length === 0) return;
      setTopicSpeakingState(activeTopicIndex);
      // Defer scroll so the autoStart-driven inner reader has time to mount.
      const t = setTimeout(() => {
          document.getElementById(`topic-card-${activeTopicIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(t);
  }, [isAutoPlaying, activeTopicIndex, activeTab, deepDiveTopics.length]);

  const handleTopicPlay = (index: number) => {
      if (topicSpeakingState === index) {
          // Pause/Stop
          stopSpeech();
          setTopicSpeakingState(null);
          setIsAutoPlaying(false);
      } else {
          // Play specific topic
          stopSpeech();
          setIsAutoPlaying(false); // Disable auto-sequence
          setTopicSpeakingState(index);
          const topic = deepDiveTopics[index];
          speakText(
              topic.content,
              null,
              speechRate,
              'hi-IN',
              undefined,
              () => setTopicSpeakingState(null)
          );
      }
  };

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.error(err));
      } else {
          document.exitFullscreen();
      }
  };

  // Interstitial State
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [pendingTts, setPendingTts] = useState<string | null>(null);

  // Alert
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});

  // DEEP DIVE AUTO-OPEN ZEN MODE LOGIC
  // Moved to top level to avoid React Hook Error #310
  const deepDiveAccess = getTabAccess('DEEP_DIVE');
  useEffect(() => {
      if (activeTab === 'DEEP_DIVE' && deepDiveAccess.hasAccess) {
          // Auto open first premium content
          handlePdfClick('PREMIUM');
      }
  }, [activeTab, deepDiveAccess.hasAccess]);

  // Data Fetching & Processing
  useEffect(() => {
    if (directResource) {
        setLoading(false);
        setActivePdf(directResource.url);
        return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
        const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
        let data = await getChapterData(key);
        if (!data) {
            const stored = localStorage.getItem(key);
            if (stored) data = JSON.parse(stored);
        }
        setContentData(data || {});

        // PROCESS NEW CONTENT STRUCTURE (SAFE)
        if (data) {
            console.log("PDFVIEW: Data loaded", data);
            // Determine Entries based on Mode
            let entries: DeepDiveEntry[] = [];
            if (syllabusMode === 'SCHOOL') {
                entries = data.schoolDeepDiveEntries || data.deepDiveEntries || [];
            } else {
                entries = data.competitionDeepDiveEntries || [];
            }
            console.log("PDFVIEW: Entries", entries, "Mode:", syllabusMode);
            let quickEntries: {id: string, title: string, content: string}[] = [];
            if (syllabusMode === 'SCHOOL') {
                quickEntries = data.schoolQuickNotes || data.quickNotes || [];
            } else {
                quickEntries = data.competitionQuickNotes || [];
            }

            // 1. QUICK REVISION EXTRACTION
            // Include legacy deep dive HTML and new entries
            const legacyDeepDiveHtml = syllabusMode === 'SCHOOL' ? data.deepDiveNotesHtml : data.competitionDeepDiveNotesHtml;
            const extractionSources = [...entries.map(e => ({ title: e.title, htmlContent: e.htmlContent }))];
            if (legacyDeepDiveHtml) {
                extractionSources.push({ title: "Deep Dive Notes", htmlContent: legacyDeepDiveHtml });
            }

            // Also add Quick Notes explicitly as their own group
            const quickGroups: {title: string, points: string[]}[] = [];

            if (quickEntries && quickEntries.length > 0) {
                quickEntries.forEach(entry => {
                    if (entry.content && entry.content.trim().length > 0) {
                        // For explicitly authored Quick Notes from the Admin Dashboard,
                        // we render the raw HTML content directly to give full formatting control
                        // just like Deep Dive or Additional Notes.
                        quickGroups.push({
                            title: entry.title || "Quick Notes",
                            points: [entry.content.trim()]
                        });
                    }
                });
            }

            // Also check the raw HTML arrays directly to be sure we get everything
            try {
                extractionSources.forEach((entry, index) => {
                    if (entry.htmlContent) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = entry.htmlContent;

                        // Look for a fallback title if entry.title is undefined.
                        // Many NCERT-style HTML files start with an <h2> or <h3>
                        let topicTitle = entry.title?.trim();
                        if (!topicTitle) {
                            const firstHeading = tempDiv.querySelector('h1, h2, h3, h4');
                            if (firstHeading && firstHeading.textContent) {
                                topicTitle = firstHeading.textContent.trim();
                            } else {
                                topicTitle = `Topic ${index + 1}`;
                            }
                        }

                        const currentTopicPoints: string[] = [];

                        // 0. High priority: Check for explicitly structured AI output like <div class="recap"><ul><li>
                        const structuredRecaps = tempDiv.querySelectorAll('.recap, .quick-revision, [data-type="recap"]');
                        if (structuredRecaps && structuredRecaps.length > 0) {
                            structuredRecaps.forEach(div => {
                                const listItems = div.querySelectorAll('li');
                                if (listItems.length > 0) {
                                    listItems.forEach(li => {
                                        const cleanHtml = li.innerHTML.trim();
                                        if (cleanHtml && !currentTopicPoints.some(qp => qp.includes(cleanHtml) || cleanHtml.includes(qp))) {
                                            currentTopicPoints.push(`<b>Recap:</b> ${cleanHtml}`);
                                        }
                                    });
                                } else {
                                    // Handle cases where it's a div with a title and <br> separator
                                    const clone = div.cloneNode(true) as HTMLElement;
                                    const titleElement = clone.querySelector('b, strong, h3, h4');
                                    let title = 'Recap';
                                    if (titleElement && titleElement.textContent) {
                                        let rawTitle = titleElement.textContent;
                                        title = cleanArtifacts(rawTitle) || 'Recap';
                                        titleElement.remove();
                                    }
                                    let cleanHtml = clone.innerHTML.trim();
                                    // Remove trailing or leading breaks
                                    cleanHtml = cleanHtml.replace(/^(?:<br\s*\/?>\s*)+/i, '').trim();
                                    cleanHtml = cleanHtml.replace(/(?:<br\s*\/?>\s*)+$/i, '').trim();


                                    cleanHtml = cleanArtifacts(cleanHtml);


                                    // Clean up AI conversational prefixes
                                    const aiPrefixes = /^(?:here is a|here's a|let's|let us)?\s*(?:quick revision|mini revision|recap|summary|brief recap)(?:\s+of (?:the )?(?:topic|lesson|chapter))?\s*:?\s*/i;
                                    cleanHtml = cleanHtml.replace(aiPrefixes, '').trim();

                                    cleanHtml = cleanArtifacts(cleanHtml);



                                    if (cleanHtml && cleanHtml.length > 5 && !currentTopicPoints.some(qp => qp.includes(cleanHtml) || cleanHtml.includes(qp))) {
                                        currentTopicPoints.push(`<b>${title}:</b> ${cleanHtml}`);
                                    }
                                }
                            });
                        }

                        // 1. DOM based extraction logic (handles headers + lists or direct paragraphs)
                        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_ELEMENT, {
                            acceptNode: (node: Element) => {
                                const tag = node.tagName.toLowerCase();
                                // Skip elements we already extracted via structured classes
                                if (node.closest('.recap') || node.closest('.quick-revision') || node.closest('[data-type="recap"]')) {
                                    return NodeFilter.FILTER_SKIP;
                                }
                                if (['p', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                                    return NodeFilter.FILTER_ACCEPT;
                                }
                                return NodeFilter.FILTER_SKIP;
                            }
                        });

                        let currentNode = walker.nextNode() as Element | null;
                        while (currentNode) {
                            const text = currentNode.textContent || '';
                            const lowerText = text.toLowerCase();

                            // Check if the current node contains a trigger word
                            const triggerRegex = /(quick revision|mini revision|recap|summary|key points|महत्वपूर्ण बिंदु|सार|संशोधन|तथ्य|topic quick recap)/i;
                            if (triggerRegex.test(lowerText)) {

                                // Avoid re-extracting the overall topic title if it contains the word "revision" by accident
                                if (currentNode.textContent?.trim().toLowerCase() === topicTitle.toLowerCase()) {
                                    currentNode = walker.nextNode() as Element | null;
                                    continue;
                                }

                                // Extract the matched text to prefix it
                                const match = lowerText.match(triggerRegex);
                                const prefix = match ? match[1].replace(/\b\w/g, c => c.toUpperCase()) : 'Revision';

                                if (/^h[1-6]$/.test(currentNode.tagName.toLowerCase())) {
                                    // Found a header (e.g., <h3>Recap</h3>) - grab the next structural element
                                    let nextSibling = currentNode.nextElementSibling;

                                    // Skip non-content tags
                                    while (nextSibling && !['p', 'ul', 'ol', 'div', 'blockquote'].includes(nextSibling.tagName.toLowerCase())) {
                                        nextSibling = nextSibling.nextElementSibling;
                                    }

                                    if (nextSibling) {
                                        if (['ul', 'ol'].includes(nextSibling.tagName.toLowerCase())) {
                                            // Extract all list items
                                            const listItems = Array.from(nextSibling.querySelectorAll('li'));
                                            listItems.forEach(li => {
                                                let cleanLiHtml = cleanArtifacts(li.innerHTML.trim());
                                                if (cleanLiHtml && !currentTopicPoints.some(qp => qp.includes(cleanLiHtml) || cleanLiHtml.includes(qp))) {
                                                    currentTopicPoints.push(`<b>${prefix}:</b> ${cleanLiHtml}`);
                                                }
                                            });
                                        } else {
                                            // Extract a block of text
                                            let cleanBlockHtml = cleanArtifacts(nextSibling.innerHTML.trim());
                                            if (cleanBlockHtml && !currentTopicPoints.some(qp => qp.includes(cleanBlockHtml) || cleanBlockHtml.includes(qp))) {
                                                currentTopicPoints.push(`<b>${prefix}:</b> ${cleanBlockHtml}`);
                                            }
                                        }
                                    }
                                } else {
                                    // Found the phrase inside a paragraph/div (e.g., <p><strong>Recap:</strong> The cell is...</p>)
                                    const cleanHtml = currentNode.innerHTML.trim();
                                    // Remove the trigger word and any leading symbols/emojis (like > 🔁) to prevent doubling up and artifacts
                                    const replaceRegex = new RegExp(`(?:<b>|<strong>)?\\s*[\\u2700-\\u27BF\\uE000-\\uF8FF\\u2011-\\u26FF\\>\\s]*(${triggerRegex.source})[\\u2700-\\u27BF\\uE000-\\uF8FF\\u2011-\\u26FF\\>\\s]*:?\\s*(?:<\\/b>|<\\/strong>)?`, 'gi');
                                    let strippedHtml = cleanHtml.replace(replaceRegex, '').trim();
                                    // Secondary clean up for leading non-alphanumeric chars (e.g., '> Recap' -> 'Recap')

                                    strippedHtml = cleanArtifacts(strippedHtml);


                                    strippedHtml = strippedHtml.replace(/^[>\s🔁🔄📌💡📝]+/, '').trim();
                                    // Handle HTML entities like &gt;
                                    strippedHtml = strippedHtml.replace(/^(?:&gt;|>)/, '').trim();
                                    // Clean up AI conversational garbage
                                    const aiPrefixesDOM = /^(?:here is a|here's a|let's|let us)?\s*(?:quick revision|mini revision|recap|summary|brief recap)(?:\s+of (?:the )?(?:topic|lesson|chapter))?\s*:?\s*/i;
                                    strippedHtml = strippedHtml.replace(aiPrefixesDOM, '').trim();

                                    strippedHtml = cleanArtifacts(strippedHtml);



                                    if (strippedHtml && strippedHtml.length > 5 && !currentTopicPoints.some(qp => qp.includes(strippedHtml) || strippedHtml.includes(qp.replace(/<(?:b|strong)>.*?(?:<\/b>|<\/strong>)/gi, '').trim()))) {
                                         currentTopicPoints.push(`<b>${prefix}:</b> ${strippedHtml}`);
                                    } else if (strippedHtml.length <= 5) {
                                        // The paragraph just acted as a header (e.g. <p>>🔁 Recap</p>)
                                        // We need to look at the next sibling to find the actual list or content!
                                        let nextSibling = currentNode.nextElementSibling;
                                        while (nextSibling && !['p', 'ul', 'ol', 'div', 'blockquote'].includes(nextSibling.tagName.toLowerCase())) {
                                            nextSibling = nextSibling.nextElementSibling;
                                        }
                                        if (nextSibling) {
                                            if (['ul', 'ol'].includes(nextSibling.tagName.toLowerCase())) {
                                                const listItems = Array.from(nextSibling.querySelectorAll('li'));
                                                listItems.forEach(li => {
                                                    let cleanLiHtml = cleanArtifacts(li.innerHTML.trim());
                                                    if (cleanLiHtml && !currentTopicPoints.some(qp => qp.includes(cleanLiHtml) || cleanLiHtml.includes(qp))) {
                                                        currentTopicPoints.push(`<b>${prefix}:</b> ${cleanLiHtml}`);
                                                    }
                                                });
                                            } else {
                                                let cleanBlockHtml = cleanArtifacts(nextSibling.innerHTML.trim());
                                                if (cleanBlockHtml && !currentTopicPoints.some(qp => qp.includes(cleanBlockHtml) || cleanBlockHtml.includes(qp))) {
                                                    currentTopicPoints.push(`<b>${prefix}:</b> ${cleanBlockHtml}`);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            currentNode = walker.nextNode() as Element | null;
                        }

                        // 2. Fallback regex approach (catches inline stuff the walker might miss)
                        // Note: added support for emojis and special chars in the prefix matching
                        const fallbackRegex = new RegExp(`(?:<b>|<strong>)?\\s*[\\u2700-\\u27BF\\uE000-\\uF8FF\\u2011-\\u26FF\\>\\s]*(Quick Revision|Mini Revision|Recap|Summary|Key Points|महत्वपूर्ण बिंदु|सार|संशोधन|तथ्य|Topic Quick Recap)[\\u2700-\\u27BF\\uE000-\\uF8FF\\u2011-\\u26FF\\>\\s]*:?\\s*(?:<\\/b>|<\\/strong>)?\\s*(?:<br\\s*\\/?>)?\\s*([\\s\\S]*?)(?:<br\\/?>|<\\/p>|<hr\\/?>|<\\/div>|$)`, 'gi');
                        let matchRegex;
                        while ((matchRegex = fallbackRegex.exec(entry.htmlContent)) !== null) {
                            if (matchRegex[2] && matchRegex[2].trim().length > 0) {
                                let cleanMatch = cleanArtifacts(matchRegex[2].trim());
                                // Ignore if it accidentally captured a huge block of HTML due to greedy matching
                                if (cleanMatch.length > 5 && cleanMatch.length < 500 && !currentTopicPoints.some(qp => qp.includes(cleanMatch) || cleanMatch.includes(qp.replace(/<(?:b|strong)>.*?(?:<\/b>|<\/strong>)/gi, '').trim()))) {
                                    currentTopicPoints.push(`<b>${matchRegex[1]}:</b> ${cleanMatch}`);
                                }
                            }
                        }

                        if (currentTopicPoints.length > 0) {
                            quickGroups.push({ title: topicTitle, points: currentTopicPoints });
                        }
                    }
                });
            } catch(e) {
                console.error("Quick Revision Extraction Error:", e);
            }
            setQuickRevisionPoints(quickGroups);

            // 2. DEEP DIVE TOPICS AGGREGATION
            // Combine all entries
            let allTopics: { title: string, content: string, audioUrl?: string, pdfLink?: string }[] = [];

            try {
                // If legacy Deep Dive HTML exists, include it first
                const legacyHtml = syllabusMode === 'SCHOOL' ? data.deepDiveNotesHtml : data.competitionDeepDiveNotesHtml;
                console.log("PDFVIEW: legacyHtml", legacyHtml);
                if (legacyHtml) {
                    allTopics = [...allTopics, ...extractTopicsFromHtml(legacyHtml)];
                }

                entries.forEach(entry => {
                    if (entry.htmlContent || entry.title || entry.audioUrl || entry.pdfLink) {
                        const htmlToParse = entry.htmlContent && entry.htmlContent.trim().length > 0 ? entry.htmlContent : '<p></p>';
                        const extracted = extractTopicsFromHtml(htmlToParse);

                        allTopics = [...allTopics, ...extracted.map((t, i) => ({
                            title: (i === 0 && entry.title) ? entry.title : t.title,
                            content: t.content,
                            audioUrl: entry.audioUrl,
                            pdfLink: (i === 0 && entry.pdfLink) ? entry.pdfLink : undefined
                        }))];
                    }
                });
            } catch(e) {
                console.error("Deep Dive Aggregation Error:", e);
            }
            console.log("PDFVIEW: Setting allTopics", allTopics);
            setDeepDiveTopics(allTopics);
        }

      } catch (error) {
        console.error("Error loading PDF data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chapter.id, board, classLevel, stream, subject.name, directResource, syllabusMode]);

  const handlePdfClick = (type: 'FREE' | 'PREMIUM' | 'ULTRA' | 'DEEP_DIVE' | 'AUDIO_SLIDE') => {
      // Reset Deep Dive State
      setIsDeepDiveMode(false);

      let link = '';
      let htmlContent = '';
      let price = 0;
      let ttsContent: string | undefined = undefined;

      if (type === 'FREE') {
          // ... (Existing Logic) ...
          const htmlKey = syllabusMode === 'SCHOOL' ? 'schoolFreeNotesHtml' : 'competitionFreeNotesHtml';
          if (syllabusMode === 'SCHOOL') {
              link = contentData?.schoolPdfLink || contentData?.freeLink;
              htmlContent = contentData?.[htmlKey] || contentData?.freeNotesHtml;
          } else {
              link = contentData?.competitionPdfLink;
              htmlContent = contentData?.[htmlKey];
          }
          price = 0;
      } else if (type === 'PREMIUM') { // Renamed visually to Auto TTS
          // ... (Existing Logic) ...
          const htmlKey = syllabusMode === 'SCHOOL' ? 'schoolPremiumNotesHtml' : 'competitionPremiumNotesHtml';
          if (syllabusMode === 'SCHOOL') {
             link = contentData?.schoolPdfPremiumLink || contentData?.premiumLink; 
             htmlContent = contentData?.[htmlKey] || contentData?.premiumNotesHtml; 
             price = contentData?.schoolPdfPrice || contentData?.price;
          } else {
             link = contentData?.competitionPdfPremiumLink;
             htmlContent = contentData?.[htmlKey];
             price = contentData?.competitionPdfPrice;
          }
          if (price === undefined) price = (settings?.defaultPdfCost ?? 5);
      } else if (type === 'ULTRA') {
          link = contentData?.ultraPdfLink;
          price = contentData?.ultraPdfPrice !== undefined ? contentData.ultraPdfPrice : 10;
      } else if (type === 'DEEP_DIVE') {
          // Do not overwrite deepDiveTopics state here. It is already aggregated in fetchData(),
          // which includes both legacy HTML and the new deepDiveEntries (with audioUrl).
          // We just need to mark htmlContent as truthy so the access check passes.
          htmlContent = 'DEEP_DIVE_ENABLED';

          // Access Check Handled Below
      } else if (type === 'AUDIO_SLIDE') {
          // Fallback links
          link = syllabusMode === 'SCHOOL' ? (contentData?.schoolPdfPremiumLink || contentData?.premiumLink) : contentData?.competitionPdfPremiumLink;

          // Use new unlimited array for TTS extraction (combine all HTML entries)
          const entries = syllabusMode === 'SCHOOL' ? (contentData?.schoolPremiumNotesList || []) : (contentData?.competitionPremiumNotesList || []);

          let rawTts = '';
          if (entries && entries.length > 0) {
              rawTts = entries.filter((e: any) => e.content).map((e: any) => e.content).join(' ');
              if (!link) {
                 const firstPdf = entries.find((e: any) => e.url);
                 if (firstPdf) link = firstPdf.url;
              }
          } else {
              // Legacy Fallback
              rawTts = syllabusMode === 'SCHOOL' ? (contentData?.schoolPremiumNotesHtml || contentData?.premiumNotesHtml || '') : (contentData?.competitionPremiumNotesHtml || '');
          }

          ttsContent = rawTts.replace(/<[^>]*>?/gm, ' ');
          if (rawTts && !link) htmlContent = rawTts; // Mark target content as available
      }

      // Prioritize Link, but allow HTML if link is missing
      // For Deep Dive, we handle specially
      const targetContent = type === 'DEEP_DIVE' ? 'DEEP_DIVE_MODE' : (link || htmlContent || ttsContent);

      if (!targetContent && type !== 'DEEP_DIVE') {
          // Coming Soon removed
          return;
      }

      if (type === 'DEEP_DIVE' && (!htmlContent || htmlContent.length < 10)) {
           // Coming Soon removed
           return;
      }

      // ... (Access Check Logic - mostly same) ...
      // Only change: If type === 'DEEP_DIVE', we activate the mode instead of setActivePdf link

      const proceed = () => {
          if (type === 'DEEP_DIVE') {
              triggerInterstitial('DEEP_DIVE_MODE');
          } else {
              triggerInterstitial(targetContent, ttsContent);
          }
      };

      // Check permissions... (Simplified for brevity, assuming same logic as before)
      // Access Check
      if (user.role === 'ADMIN') { proceed(); return; }
      if (user.unlockedContent && user.unlockedContent.includes(chapter.id)) { proceed(); return; }

      // Granular Feature Control
      if (type === 'DEEP_DIVE') {
          // Free for everyone via NSTA now, but keeping access check to honor potential admin override
          const access = checkFeatureAccess('DEEP_DIVE', user, settings || {});
          if (!access.hasAccess) {
              if (access.reason === 'FEED_LOCKED') {
                  setAlertConfig({isOpen: true, message: `🔒 Locked! This content is currently disabled by Admin.`});
                  return;
              }
              // If user is FREE, let them pay instead of blocking completely
              if (access.reason === 'TIER_RESTRICTED' && access.cost > 0) {
                   if (user.isAutoDeductEnabled) processPaymentAndOpen(targetContent, access.cost, false, ttsContent, true);
                   else setPendingPdf({ type, price: access.cost, link: targetContent, tts: ttsContent });
                   return;
              }
              // Otherwise (e.g., zero cost or other reason), default block
              if (access.cost > 0) {
                  if (user.isAutoDeductEnabled) processPaymentAndOpen(targetContent, access.cost, false, ttsContent, true);
                  else setPendingPdf({ type, price: access.cost, link: targetContent, tts: ttsContent });
              } else {
                  setAlertConfig({isOpen: true, message: `🔒 Locked! Upgrade your plan to access Deep Dive.`});
              }
              return;
          }
      }

      // Premium Notes (Audio Slide) - Now uses PREMIUM_NOTES feature
      if (type === 'AUDIO_SLIDE' || type === 'PREMIUM') {
          const access = checkFeatureAccess('PREMIUM_NOTES', user, settings || {});
          if (!access.hasAccess) {
              if (access.reason === 'FEED_LOCKED') {
                  setAlertConfig({isOpen: true, message: `🔒 Locked! This content is currently disabled by Admin.`});
                  return;
              }
              // If user is FREE, let them pay instead of blocking completely
              if (access.reason === 'TIER_RESTRICTED' && access.cost > 0) {
                   if (user.isAutoDeductEnabled) processPaymentAndOpen(targetContent, access.cost, false, ttsContent, false);
                   else setPendingPdf({ type, price: access.cost, link: targetContent, tts: ttsContent });
                   return;
              }
              // Otherwise block
              if (access.cost > 0) {
                  if (user.isAutoDeductEnabled) processPaymentAndOpen(targetContent, access.cost, false, ttsContent, false);
                  else setPendingPdf({ type, price: access.cost, link: targetContent, tts: ttsContent });
              } else {
                  setAlertConfig({isOpen: true, message: `🔒 Locked! Upgrade your plan to access Premium Notes.`});
              }
              return;
          }
      }

      if (price === 0) { proceed(); return; }

      const isSubscribed = user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
      if (isSubscribed) {
          // Tier Checks...
          if (user.subscriptionTier === 'YEARLY' || user.subscriptionTier === 'LIFETIME' || user.subscriptionLevel === 'ULTRA' || user.subscriptionLevel === 'BASIC') {
              proceed(); return;
          }
      }

      if (user.isAutoDeductEnabled) processPaymentAndOpen(targetContent, price, false, ttsContent, type === 'DEEP_DIVE');
      else setPendingPdf({ type, price, link: targetContent, tts: ttsContent });
  };

  const processPaymentAndOpen = (targetContent: string, price: number, enableAuto: boolean = false, ttsContent?: string, isDeepDive: boolean = false) => {
      if (user.credits < price) {
          setAlertConfig({isOpen: true, message: `Insufficient Credits! You need ${price} coins.`});
          return;
      }

      // Handle Tab Unlock
      if (targetContent.startsWith('UNLOCK_TAB_')) {
          const tabId = targetContent.replace('UNLOCK_TAB_', '');
          setSessionUnlockedTabs(prev => [...prev, tabId]);

          let updatedUser = { ...user, credits: user.credits - price };
          if (enableAuto) updatedUser.isAutoDeductEnabled = true;
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
          saveUserToLive(updatedUser);
          onUpdateUser(updatedUser);

          setActiveTab(tabId as any); // Actually switch the tab now that it's paid
          setPendingPdf(null);
          return;
      }

      let updatedUser = { ...user, credits: user.credits - price };
      if (enableAuto) updatedUser.isAutoDeductEnabled = true;
      
      localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
      saveUserToLive(updatedUser);
      onUpdateUser(updatedUser);
      
      if (isDeepDive) triggerInterstitial('DEEP_DIVE_MODE');
      else triggerInterstitial(targetContent, ttsContent);
      setPendingPdf(null);
  };

  const triggerInterstitial = (link: string, tts?: string) => {
      setPendingLink(link);
      setPendingTts(tts || null);
      setShowInterstitial(true);
  };

  const onInterstitialComplete = () => {
      setShowInterstitial(false);
      if (pendingLink) {
          if (pendingLink === 'DEEP_DIVE_MODE') {
              setIsDeepDiveMode(true);
              setActivePdf(null);
          } else {
              setActivePdf(pendingLink);
              // Auto-start TTS for Audio Slide is handled in useEffect or button
          }
          setPendingLink(null);
          setPendingTts(null);
      }
  };

  // ... (Render Helpers) ...

  // RENDER
  if (showInterstitial) {
      const isPremiumUser = user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
      const aiImage = contentData?.chapterAiImage || settings?.aiLoadingImage;
      return <AiInterstitial onComplete={onInterstitialComplete} userType={isPremiumUser ? 'PREMIUM' : 'FREE'} imageUrl={aiImage} contentType="PDF" />;
  }

  // PDF OVERLAY (Zen Mode for Premium/Additional)
  if (activePdf) {
      const formattedLink = formatDriveLink(activePdf);
      return (
          <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in zoom-in-95 h-screen w-screen overflow-hidden">
              {/* Floating Controls — Back + Save Offline. Save bookmarks the
                  PDF so the user can re-open it instantly from the History tab
                  even if they navigate away. (Remote Drive PDFs can't be saved
                  as a binary blob from the browser due to CORS, so we save the
                  link entry instead.) */}
              <div className="absolute top-4 left-4 right-4 z-50 flex flex-wrap gap-3 items-center">
                  <button onClick={() => { setActivePdf(null); stopAllSpeech(); }} className="bg-black/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/70 border border-white/20 shadow-lg">
                      <ArrowLeft size={24} />
                  </button>
                  <button
                      onClick={() => {
                          saveOfflineItem({
                              id: `pdf_${chapter.id}_${Date.now()}`,
                              type: 'NOTE',
                              title: chapter.title || 'Saved PDF',
                              subtitle: `${subject.name} · PDF Bookmark`,
                              data: {
                                  html: `<div style="padding:24px;font-family:system-ui;text-align:center;">
                                      <h2 style="font-size:20px;font-weight:900;margin-bottom:12px;">${chapter.title || 'PDF'}</h2>
                                      <p style="color:#64748b;margin-bottom:20px;">Bookmarked PDF resource</p>
                                      <a href="${activePdf}" target="_blank" rel="noopener" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Open PDF</a>
                                  </div>`,
                                  pdfLink: activePdf,
                              }
                          });
                          setAlertConfig({isOpen: true, message: 'PDF Bookmark Saved! Open it any time from the History tab.'});
                      }}
                      className="ml-auto flex items-center gap-2 bg-slate-800 backdrop-blur-md text-white px-4 py-2 rounded-full hover:bg-slate-900 border border-slate-700 shadow-xl font-bold text-sm"
                      title="Save bookmark for offline access"
                  >
                      <Download size={16} /> <span>Save</span>
                  </button>
              </div>

              <div className="flex-1 relative w-full h-full">
                  <iframe
                      src={formattedLink}
                      className="w-full h-full border-none"
                      title="PDF Viewer"
                      allow="autoplay"
                      /* Sandbox tightened: 'allow-popups-to-escape-sandbox' &
                         'allow-top-navigation' hata diye taaki Google Drive ka
                         "Open in new window" / pop-out square button user ko
                         Drive site pe na le ja sake. */
                      sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  {/* === TRANSPARENT BLOCKERS ===
                      Google Drive ka /preview embed top-right corner pe ek
                      square pop-out icon dikhata hai (aur kabhi kabhi bottom
                      par toolbar). Iss icon par tap karte hi user Drive site
                      pe chala jata tha. Inn invisible overlays se ab koi tap
                      iframe tak nahi pahunchti — pop-out button completely
                      blocked rahega, lekin baaki PDF body scroll/zoom karne
                      laayak rahegi (overlays sirf corner areas ko cover karte
                      hain). */}
                  {/* Top strip — cover full top toolbar */}
                  <div className="absolute top-0 left-0 w-full h-20 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
                  {/* Top-right square — Drive ka pop-out icon yahin sit karta hai */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
                  {/* Bottom-right square — kuch embeds me toolbar yahan dikhata hai */}
                  <div className="absolute bottom-0 right-0 w-24 h-16 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
              </div>
          </div>
      );
  }

  // RESOURCE OVERLAY (Handles Text-Only AND PDF+Text) - ZEN MODE
  if (activeNoteContent) {
      const hasPdf = !!activeNoteContent.pdfUrl;
      const formattedLink = hasPdf ? formatDriveLink(activeNoteContent.pdfUrl!) : '';

      // PDF view stays as the existing fullscreen iframe overlay — only the
      // text-only Additional Notes reader is restructured to match the
      // Teaching Strategy layout (sticky editorial header with always-visible
      // Save + Audio controls, ChunkedNotesReader inside an article card).
      if (hasPdf) {
          return (
              <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in zoom-in-95 h-screen w-screen overflow-hidden">
                  <div className="absolute top-4 left-4 z-50 flex flex-wrap gap-3 max-w-[calc(100%-2rem)]">
                      <button onClick={() => { setActiveNoteContent(null); stopAllSpeech(); }} className="bg-black/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/70 border border-white/20 shadow-lg">
                          <ArrowLeft size={24} />
                      </button>
                      {activeNoteContent.audioUrl && (
                          <button
                              onClick={() => playCustomAudio(activeNoteContent.audioUrl!)}
                              className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full hover:from-amber-500 hover:to-orange-600 shadow-lg flex items-center gap-2 font-bold text-sm transition-transform hover:scale-105"
                              title="Play Premium Audio"
                          >
                              <Music size={20} /> Premium Audio
                          </button>
                      )}
                      {activeNoteContent.content && activeNoteContent.content.length > 10 && (
                          <button
                              onClick={() => {
                                  if (isAutoPlaying) {
                                      stopAllSpeech();
                                  } else {
                                      setIsAutoPlaying(true);
                                      const plainText = activeNoteContent.content.replace(/<[^>]*>?/gm, ' ');
                                      speakText(plainText, null, speechRate, 'hi-IN', undefined, () => setIsAutoPlaying(false));
                                  }
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg border transition-all ${isAutoPlaying ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'}`}
                              title={isAutoPlaying ? 'Stop reading' : 'Read everything aloud'}
                          >
                              {isAutoPlaying ? <><Square size={14} /> Stop</> : <><Volume2 size={14} /> Read All</>}
                          </button>
                      )}
                      <button
                          onClick={() => {
                              saveOfflineItem({
                                  id: `note_${chapter.id}_${Date.now()}`,
                                  type: 'NOTE',
                                  title: activeNoteContent.title || 'Saved Note',
                                  subtitle: `${subject.name} - ${chapter.title}`,
                                  data: { html: activeNoteContent.content }
                              });
                              setAlertConfig({isOpen: true, message: 'Note Saved Offline!'});
                          }}
                          className="flex items-center gap-2 bg-slate-800 backdrop-blur-md text-white px-4 py-2 rounded-full hover:bg-slate-900 border border-slate-700 shadow-xl font-bold text-sm"
                          title="Save Offline"
                      >
                          <Download size={18} /> <span>Save</span>
                      </button>
                  </div>
                  <div className="flex-1 relative w-full h-full">
                      <iframe
                          src={formattedLink}
                          className="w-full h-full border-none"
                          title="PDF Viewer"
                          allow="autoplay"
                          /* Sandbox tightened (same reason as activePdf overlay) —
                             pop-out / new-window escapes blocked. */
                          sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                      {/* Transparent blockers covering Drive's pop-out icon
                          areas (top-right is the main one; top strip + bottom
                          right are added as belt-and-braces). PDF body scroll
                          unaffected. */}
                      <div className="absolute top-0 left-0 w-full h-20 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
                      <div className="absolute top-0 right-0 w-24 h-24 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
                      <div className="absolute bottom-0 right-0 w-24 h-16 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
                  </div>
              </div>
          );
      }

      // TEXT-ONLY ADDITIONAL NOTE — same layout shape as Teaching Strategy:
      // sticky top app bar (back + Save) so action controls never hide on
      // scroll, then an editorial article card whose header carries the
      // Audio chip + title. Content scrolls inside.
      return (
          <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col animate-in fade-in zoom-in-95 h-screen w-screen overflow-hidden">
              {/* Sticky app bar — always visible while scrolling */}
              <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-5 py-2.5 flex items-center gap-3 shadow-sm">
                  <button
                      onClick={() => { setActiveNoteContent(null); stopAllSpeech(); }}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors"
                      title="Back"
                  >
                      <ArrowLeft size={18} />
                  </button>
                  <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Library</p>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                          {activeNoteContent.title || 'Additional Note'}
                      </h3>
                  </div>
                  <button
                      onClick={() => {
                          saveOfflineItem({
                              id: `note_${chapter.id}_${Date.now()}`,
                              type: 'NOTE',
                              title: activeNoteContent.title || 'Saved Note',
                              subtitle: `${subject.name} - ${chapter.title}`,
                              data: { html: activeNoteContent.content }
                          });
                          setAlertConfig({isOpen: true, message: 'Note Saved Offline! Access it in the History tab.'});
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap shrink-0"
                      title="Save offline"
                  >
                      <Download size={11} /> Save
                  </button>
              </div>

              {/* Scrollable body — editorial article card identical in shape to
                  Teaching Strategy. */}
              <div className="flex-1 overflow-y-auto">
                  <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4">
                      <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                          <header className="relative px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-teal-600" />
                              <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-600 mb-1">
                                          <Book size={12} />
                                          <span>Extended Resource</span>
                                      </div>
                                      <h3 className="font-black text-slate-900 text-lg leading-tight">
                                          {activeNoteContent.title || 'Additional Note'}
                                      </h3>
                                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subject.name} · {chapter.title}</p>
                                  </div>
                                  {activeNoteContent.audioUrl && (
                                      <button
                                          onClick={() => playCustomAudio(activeNoteContent.audioUrl!)}
                                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-md flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider transition-transform hover:scale-105 shrink-0"
                                          title="Play Premium Audio"
                                      >
                                          <Music size={12} /> Audio
                                      </button>
                                  )}
                              </div>
                          </header>
                          <div className="p-2 sm:p-4">
                              <ChunkedNotesReader
                                  content={activeNoteContent.content}
                                  topBarLabel={activeNoteContent.title || 'Additional Note'}
                                  noteKey={`pdfview_${chapter.id}_addnote_${activeNoteContent.title || 'untitled'}`}
                                  hideTopBar={hideHeader}
                              />
                          </div>
                      </article>
                  </div>
              </div>
          </div>
      );
  }

  // --- NEW TABBED VIEW ---
  // Compute TTS html for floating chip group (PREMIUM tab)
  const _floatingPEntries: any[] = syllabusMode === 'SCHOOL'
    ? (contentData?.schoolPremiumNotesList || [])
    : (contentData?.competitionPremiumNotesList || []);
  const floatingTtsHtml: string = (_floatingPEntries[currentPremiumEntryIdx] as any)?.content || '';

  return (
    <div ref={scrollContainerRef} onScroll={handleScroll} className={`bg-slate-50 h-screen animate-in fade-in slide-in-from-right-8 m-0 p-0 ${activeTab === 'PREMIUM' && pdfFullscreen ? 'overflow-hidden' : 'overflow-y-auto pb-6'}`}>
       {/* Reading progress bar */}
       <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/60 z-[60] pointer-events-none">
           <div
               className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-[width] duration-150 ease-out"
               style={{ width: `${scrollProgress}%` }}
           />
       </div>
       <CustomAlert
           isOpen={alertConfig.isOpen}
           message={alertConfig.message}
           onClose={() => setAlertConfig({...alertConfig, isOpen: false})}
       />
       {/* Reading Style popover (font size + 686 font family) — opens from
           the "Aa" button in the header. Lives at the top of the tree so it
           floats above sticky tabs / pdf rotate buttons / etc. */}
       <ReadingStylePopover isOpen={showReadingStyle} onClose={() => setShowReadingStyle(false)} />

       {/* HEADER — Lucent/Sar-Sangrah style: edge-to-edge, no manual fullscreen toggle.
           Top row keeps only Back + Lesson title (Read All button is rendered by
           ChunkedNotesReader inside each tab's content). Below: Notes ↔ MCQ pill
           and the section tab strip (Concept / Retention / Extended / Teaching
           Strategy) — both ALWAYS visible so the student can switch from anywhere
           without hunting for a fullscreen toggle. */}
       {/* Compact header. On Retention with `pdfFullscreen` true, the entire
           bar hides so PDF gets the full screen. Otherwise:
           — On Concept (DEEP_DIVE): single-line top row (Back + truncated title
             + School/Competition pills inline + 📚/📝 MCQ pill) followed by the
             tab strip. The earlier 3-row layout (title row → Notes/MCQ row →
             tab strip ≈ 150px) reduced to ~90px so notes get more screen.
           — On Retention (PREMIUM): drop title/pills entirely (the lesson title
             is on the PDF cover anyway) — keep only Back + 📚/📝 MCQ pill + tab
             strip + a "Maximize" button. */}
       {!(activeTab === 'PREMIUM' && pdfFullscreen) && (
       /* Header: bg-slate-50 hata diya, padding reduce ki, aur Notes/MCQ pill
          ko title row mein inline kar diya — taaki URL bar ke neeche koi
          extra white gap na bache aur tabs upar aa jayein. Title row +
          tabs row sirf 2 thin rows hain ab. */
       <div className={`sticky top-0 z-30 bg-white shadow-sm flex flex-col transition-all duration-200 w-full m-0 rounded-none ${(!showHeader || hideHeader) ? '-translate-y-full absolute opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
           {activeTab !== 'PREMIUM' && (
               <div className="flex items-center gap-1.5 px-2 sm:px-3 py-0.5">
                   <button onClick={onBack} className="p-1 hover:bg-slate-100 rounded-full text-slate-600 shrink-0">
                       <ArrowLeft size={16} />
                   </button>
                   <h3 className="flex-1 min-w-0 font-bold text-slate-800 leading-tight line-clamp-1 text-[13px]">{chapter.title}</h3>
                   {onSwitchToMcq && (
                       <button
                           onClick={onSwitchToMcq}
                           className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-indigo-600 text-white hover:bg-indigo-700 shrink-0 flex items-center gap-1 shadow-sm"
                           title="Switch to MCQ"
                       >
                           <HelpCircle size={12} /> MCQ
                       </button>
                   )}
                   {onSwitchToFlashcard && (
                       <button
                           onClick={onSwitchToFlashcard}
                           className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-500 text-white hover:bg-amber-600 shrink-0 flex items-center gap-1 shadow-sm"
                           title="Switch to Flashcard"
                       >
                           <Zap size={12} /> Flash
                       </button>
                   )}
               </div>
           )}

           {/* Retention-only minimal top row: back + Notes/MCQ + Maximize */}
           {activeTab === 'PREMIUM' && (
               <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5">
                   <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 shrink-0">
                       <ArrowLeft size={18} />
                   </button>
                   {onSwitchToMcq && (
                       <div className="flex-1 flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                           <button
                               disabled
                               className="flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 bg-white text-blue-600 shadow-sm"
                           >
                               <BookOpen size={12}/> Notes
                           </button>
                           <button
                               onClick={onSwitchToMcq}
                               className="flex-1 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 text-slate-600 hover:bg-white/60 transition-all"
                           >
                               <HelpCircle size={12}/> MCQ
                           </button>
                       </div>
                   )}
                   {/* Aa font controls also available on Retention so students
                       padhte waqt kabhi bhi font/size badal sakein. */}
                   <button
                       onClick={() => setShowReadingStyle(true)}
                       className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 shrink-0"
                       title="Font & size badlein"
                       aria-label="Reading style"
                   >
                       <Type size={15} />
                   </button>
                   <button
                       onClick={rotatePdf}
                       className={`relative p-1.5 rounded-full shrink-0 transition-colors ${pdfRotation !== 0 ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                       title={`Rotate +90°  (current: ${pdfRotation}°)`}
                   >
                       <RotateCw size={16} />
                       {pdfRotation !== 0 && (
                           <span className="absolute -top-1 -right-1 bg-white text-purple-700 text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-purple-600">
                               {pdfRotation}
                           </span>
                       )}
                   </button>
                   {/* PDF Zoom controls */}
                   <div className="flex items-center gap-0.5 bg-slate-100 rounded-full px-1 py-0.5 border border-slate-200">
                       <button
                           onClick={handleZoomOut}
                           disabled={zoom <= 0.5}
                           className="p-1 rounded-full text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 transition-colors"
                           title="Zoom Out"
                       >
                           <Minus size={13} />
                       </button>
                       <span
                           className="text-[10px] font-black text-slate-700 w-8 text-center select-none cursor-pointer"
                           onClick={() => setZoom(1)}
                           title="Reset zoom"
                       >
                           {Math.round(zoom * 100)}%
                       </span>
                       <button
                           onClick={handleZoomIn}
                           disabled={zoom >= 3}
                           className="p-1 rounded-full text-slate-600 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30 transition-colors"
                           title="Zoom In"
                       >
                           <Plus size={13} />
                       </button>
                   </div>
                   <button
                       onClick={() => setPdfFullscreen(true)}
                       className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 shrink-0"
                       title="Maximize PDF"
                   >
                       <Maximize size={16} />
                   </button>
               </div>
           )}

           {/* TABS — always visible (no fullscreen gating) so Additional Notes /
               Teacher Strategy / Premium Notes / Concept switchers stay reachable. */}
           {(
               <div className="flex overflow-x-auto border-t border-slate-100 scrollbar-hide">
                   {[
                       /* "Extended" tab hata diya — ab Additional Notes Concept tab ke
                          andar "Read More" button ke through dikhenge taaki student ke liye
                          sirf 2 main pages rahe (Concept + Retention). */
                       { id: 'DEEP_DIVE', label: 'Concept', icon: BookOpen, show: true },
                       { id: 'PREMIUM', label: 'Retention', icon: Crown, show: true },
                       { id: 'TEACHER', label: 'Teaching Strategy', icon: BookOpen, show: user.role === 'TEACHER' || !!user.teacherCode || user.role === 'ADMIN' }
                           ].filter(t => t.show).map(tab => {
                               const { hasAccess, cost } = getTabAccess(tab.id);
                               const isLocked = !hasAccess;

                               return (
                                   <button
                                       key={tab.id}
                                       onClick={() => {
                                           if (isLocked) {
                                               if (cost > 0) {
                                                   setPendingPdf({ type: tab.id as any, price: cost, link: `UNLOCK_TAB_${tab.id}` });
                                               } else {
                                                   setAlertConfig({isOpen: true, message: `🔒 Locked! Upgrade your plan or wait for Admin access.`});
                                               }
                                               return;
                                           }
                                           setActiveTab(tab.id as any);
                                           stopAllSpeech();
                                           // Always keep the sticky header (back button + tab strip)
                                           // visible — even on Resources / Teaching Strategy. The
                                           // earlier "distraction-free" auto-hide left users stranded
                                           // because there was no way to navigate back, and the
                                           // collapsed header also created a large empty area at the
                                           // top of the page on mobile.
                                           setShowHeader(true);
                                           // Leaving Retention always exits PDF-fullscreen so
                                           // the user doesn't get stuck without controls.
                                           if (tab.id !== 'PREMIUM') setPdfFullscreen(false);
                                       }}
                                       className={`flex-1 min-w-[85px] py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-600 hover:bg-slate-50'} ${isLocked && cost === 0 ? 'grayscale' : ''}`}
                                   >
                                       <div className="relative">
                                           <tab.icon size={13} className="sm:w-3.5 sm:h-3.5" />
                                           {isLocked && <div className="absolute -top-1 -right-2 bg-red-500 rounded-full p-0.5 border border-white"><Lock size={8} className="text-white"/></div>}
                                       </div>
                                       {tab.label}
                                   </button>
                               );
                           })}
               </div>
           )}
       </div>
       )}

       {/* PDF FULLSCREEN restore button — small floating chips top-right when
           the entire header is hidden on Retention. Tap to bring header back
           or to flip the PDF orientation without leaving fullscreen. */}
       {activeTab === 'PREMIUM' && pdfFullscreen && (
           <div className="fixed top-3 right-3 z-40 flex gap-2">
               <button
                   onClick={onBack}
                   className="p-2 rounded-full bg-black/55 backdrop-blur text-white shadow-lg border border-white/20"
                   title="Back"
               >
                   <ArrowLeft size={16} />
               </button>
               <button
                   onClick={rotatePdf}
                   className={`relative p-2 rounded-full backdrop-blur shadow-lg border border-white/20 ${pdfRotation !== 0 ? 'bg-purple-600 text-white' : 'bg-black/55 text-white'}`}
                   title={`Rotate +90°  (current: ${pdfRotation}°)`}
               >
                   <RotateCw size={16} />
                   {pdfRotation !== 0 && (
                       <span className="absolute -top-1 -right-1 bg-white text-purple-700 text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-purple-600 shadow">
                           {pdfRotation}
                       </span>
                   )}
               </button>
               {(floatingTtsHtml && floatingTtsHtml.length > 10) && (
                   <button
                       onClick={() => {
                           if (isAutoPlaying) {
                               stopAllSpeech();
                           } else {
                               const topics = extractTopicsFromHtml(floatingTtsHtml);
                               let chunks: string[] = [];
                               if (topics.length > 0 && topics[0].title !== "Notes") {
                                   chunks = topics.map(t => `${t.title}. ${t.content}`);
                               } else {
                                   const rawText = topics[0]?.content || '';
                                   chunks = rawText.length > 4000
                                       ? (rawText.match(/[^.!?]+[.!?]+/g) || [rawText])
                                       : [rawText];
                               }
                               setPremiumChunks(chunks);
                               setPremiumChunkIndex(0);
                               setIsAutoPlaying(true);
                           }
                       }}
                       className={`p-2 rounded-full backdrop-blur shadow-lg border border-white/20 transition-all ${isAutoPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-black/55 text-white hover:bg-indigo-600'}`}
                       title={isAutoPlaying ? 'Stop TTS' : 'Read aloud'}
                   >
                       {isAutoPlaying ? <Pause size={16} /> : <Headphones size={16} />}
                   </button>
               )}
               <button
                   onClick={() => setPdfFullscreen(false)}
                   className="p-2 rounded-full bg-black/55 backdrop-blur text-white shadow-lg border border-white/20"
                   title="Show toolbar"
               >
                   <Minimize size={16} />
               </button>
           </div>
       )}

       {/* CONTENT BODY (WRAPPED IN ERROR BOUNDARY) */}
       <ErrorBoundary>
       <div className="flex-1 overflow-y-auto">

           {/* 2. DEEP DIVE (HTML + SCROLL) */}
           {activeTab === 'DEEP_DIVE' && (
               <div className="p-0 sm:p-4 space-y-6 w-full max-w-none mx-auto">
                   {(() => {
                        const access = getTabAccess('DEEP_DIVE');

                        if (!access.hasAccess) {
                            return (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-teal-100">
                                        <Lock size={32} className="text-teal-600" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 mb-2">Deep Dive Mode Locked</h2>
                                    <p className="text-sm text-slate-600 max-w-xs mb-8 leading-relaxed">
                                        {access.reason === 'FEED_LOCKED' ? 'This content is currently locked by admin.' : 'Unlock in-depth conceptual notes to master this chapter.'}
                                    </p>

                                    {access.reason !== 'FEED_LOCKED' && access.cost > 0 ? (
                                        <button
                                            onClick={() => setPendingPdf({ type: 'DEEP_DIVE', price: access.cost, link: 'UNLOCK_TAB_DEEP_DIVE' })}
                                            className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Zap size={18} /> Unlock for {access.cost} Credits
                                        </button>
                                    ) : access.reason !== 'FEED_LOCKED' ? (
                                        <div className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-wider">
                                            Upgrade Plan to Access
                                        </div>
                                    ) : null}
                                </div>
                            );
                        }

                        return (
                           <>
                               {/* Compact toolbar — earlier this was a tall row of two
                                   pill buttons that ate ~50px of screen above the notes
                                   AND duplicated the Read All inside ChunkedNotesReader.
                                   Now: single thin row with section count + tiny icon
                                   buttons (Save, Read All chain) so notes start higher. */}
                               <div className={`flex justify-between items-center px-3 sm:px-0 pt-1.5 pb-1 ${hideHeader ? 'hidden' : ''}`}>
                                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{deepDiveTopics.length} Sections</p>
                                   <div className="flex gap-1 items-center">
                                       {/* Aa font controls — yahaan ALWAYS visible hain (Concept ke
                                           main notes mein), Read More wrapper jaisa. Tap karne par
                                           ek centered popup khulta hai jismein font size (A−/A+) +
                                           686 fonts ka picker hai. */}
                                       <button
                                           onClick={() => setShowReadingStyle(true)}
                                           className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition-colors font-bold text-[10px] uppercase tracking-wider"
                                           title="Font & size badlein"
                                           aria-label="Reading style"
                                       >
                                           <Type size={11} />
                                           Aa
                                       </button>
                                       <button
                                           onClick={() => {
                                               const htmlContent = deepDiveTopics.map(t => `<h2>${t.title}</h2>${t.content}`).join('<hr/>');
                                               saveOfflineItem({
                                                   id: `deep_dive_${chapter.id}`,
                                                   type: 'NOTE',
                                                   title: 'Deep Dive Notes',
                                                   subtitle: `${subject.name} - ${chapter.title}`,
                                                   data: { html: htmlContent }
                                               });
                                               setAlertConfig({isOpen: true, message: 'Deep Dive Notes Saved Offline! Access them in the History tab.'});
                                           }}
                                           className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                                           title="Save offline"
                                           aria-label="Save offline"
                                       >
                                           <Download size={14} />
                                       </button>
                                       <button
                                          onClick={() => {
                                              if (isAutoPlaying) {
                                                  setIsAutoPlaying(false);
                                                  stopSpeech();
                                              } else {
                                                  const hasPos = lastReadTopicIdx > 0 || (lastReadLineMap[0] ?? 0) > 0;
                                                  setIsAutoPlaying(true);
                                                  setActiveTopicIndex(hasPos ? lastReadTopicIdx : 0);
                                              }
                                          }}
                                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all ${isAutoPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-600 text-white shadow-sm'}`}
                                          title={isAutoPlaying ? 'Stop reading' : (lastReadTopicIdx > 0 || (lastReadLineMap[0] ?? 0) > 0) ? 'Last padhi jagah se resume karein' : 'Read all topics in sequence'}
                                      >
                                          {isAutoPlaying ? <Pause size={11} /> : <Volume2 size={11} />}
                                          {isAutoPlaying ? 'Stop' : (lastReadTopicIdx > 0 || (lastReadLineMap[0] ?? 0) > 0) ? 'Resume' : 'Read All'}
                                      </button>
                                   </div>
                               </div>

                               {deepDiveTopics.length === 0 && (
                                   <div className="text-center py-12 text-slate-500">
                                       <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                                       <p className="text-sm font-bold">No Deep Dive content available.</p>
                                   </div>
                               )}

                               {/* === ADDITIONAL NOTES (PART-WISE PAIRING) ===
                                   Merge school + competition additional notes once,
                                   then pair index-wise with each Concept (Deep Dive)
                                   topic. Concept Part 1 ka "Read More" button →
                                   Additional Notes Part 1 kholega, Part 2 ka button →
                                   Part 2 kholega, etc. Pehle ye Additional Notes ek
                                   alag list me dikhte the — ab har Concept card ke
                                   andar hi same-index pe attach hain. */}
                               {deepDiveTopics.map((topic, idx) => {
                                  const isActive = topicSpeakingState === idx;
                                  // Same-index Additional Note compute karo (agar exist
                                  // kare). Dedup logic original Additional Notes section
                                  // jaisa hi rakha hai taaki count consistent rahe.
                                  const _schoolNotes: AdditionalNoteEntry[] = (contentData?.schoolAdditionalNotes || contentData?.additionalNotes || []) as any;
                                  const _compNotes: AdditionalNoteEntry[] = (contentData?.competitionAdditionalNotes || []) as any;
                                  const _seen = new Set<string>();
                                  const _mergedNotes: AdditionalNoteEntry[] = [..._schoolNotes, ..._compNotes].filter(n => {
                                      const k = `${(n.title || '').trim().toLowerCase()}|${(n.pdfLink || '').trim()}|${((n as any).noteContent || '').slice(0, 40)}`;
                                      if (_seen.has(k)) return false;
                                      _seen.add(k);
                                      return true;
                                  });
                                  const pairedNote: AdditionalNoteEntry | null = _mergedNotes[idx] || null;
                                  const pairedHasPdf = !!(pairedNote && pairedNote.pdfLink);
                                  const pairedHasContent = !!(pairedNote && (pairedNote as any).noteContent);
                                  const openPairedNote = () => {
                                      if (!pairedNote) return;
                                      const title = pairedNote.title || `Additional Note ${idx + 1}`;
                                      const audioUrl = (pairedNote as any).audioUrl;
                                      const noteContent = (pairedNote as any).noteContent;
                                      if (pairedNote.pdfLink && noteContent) {
                                          setActiveNoteContent({ title, content: noteContent, pdfUrl: pairedNote.pdfLink, audioUrl });
                                      } else if (pairedNote.pdfLink) {
                                          if (audioUrl) {
                                              setActiveNoteContent({ title, content: '', pdfUrl: pairedNote.pdfLink, audioUrl });
                                          } else {
                                              setActivePdf(pairedNote.pdfLink);
                                          }
                                      } else if (noteContent) {
                                          setActiveNoteContent({ title, content: noteContent, audioUrl });
                                      }
                                  };
                                  const isLastReadCard = idx === lastReadTopicIdx && ((lastReadLineMap[idx] ?? 0) > 0 || idx > 0);
                                 return (
                                      <div
                                          id={`topic-card-${idx}`}
                                          key={idx}
                                          className={`bg-white rounded-none sm:rounded-2xl p-3 sm:p-5 shadow-sm border-2 transition-all w-full ${isActive ? 'border-teal-400 ring-2 ring-teal-100 scale-[1.01] sm:scale-100' : isLastReadCard ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-transparent'}`}
                                      >
                                          {/* Compact card header — section badge + title + lightweight
                                              icon-only PDF/Audio buttons. Earlier the badge + Read All +
                                              View PDF + Premium Audio + ChunkedNotesReader's own bar
                                              stacked to ~120px above any actual notes. */}
                                          <div className="flex justify-between items-center mb-2 gap-2">
                                              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                                  {isLastReadCard && (
                                                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 border border-indigo-200">
                                                          ↩ Last Read
                                                      </span>
                                                  )}
                                                  {idx === 0 && topic.title !== "Introduction" && (
                                                      <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded shrink-0">
                                                          DEEP DIVE
                                                      </span>
                                                  )}
                                                  {idx > 0 && (
                                                      <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded shrink-0">
                                                          T{idx}
                                                      </span>
                                                  )}
                                                  <h4 className="text-base sm:text-lg font-black text-slate-800 leading-tight truncate">{topic.title}</h4>
                                              </div>
                                              <div className="flex gap-1 items-center shrink-0">
                                                  {topic.pdfLink && (
                                                      <button
                                                          onClick={() => {
                                                              stopSpeech();
                                                              setActivePdf(formatDriveLink(topic.pdfLink!));
                                                          }}
                                                          className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                          title="View PDF Document"
                                                          aria-label="View PDF"
                                                      >
                                                          <FileText size={14} />
                                                      </button>
                                                  )}
                                                  {topic.audioUrl && (
                                                      <button
                                                          onClick={() => playCustomAudio(topic.audioUrl!)}
                                                          className="p-1.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                                          title="Play Premium Audio"
                                                          aria-label="Play audio"
                                                      >
                                                          <Music size={14} />
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                          {topic.content && topic.content.trim() !== '<p></p>' && (
                                              // Competition-style chunked reader. We hide the inner top
                                              // bar (font/colour/Read All) because the outer "Read All"
                                              // pill already drives chained-topic playback, and tap-to-
                                              // read on each line still works without that bar — saving
                                              // a duplicate ~50px sticky strip on every card.
                                              //
                                              // AUTO-PLAY HOOK-UP: when the page-level Read All is on
                                              // and this card is the current topic, we set `autoStart`
                                              // so ChunkedNotesReader plays its own line-by-line TTS
                                              // (with highlight + auto-scroll). On `onComplete` we move
                                              // to the next topic — chaining all Concept sections in
                                              // sequence with proper per-line UX, not one giant blob.
                                              <div className="-mx-3 sm:-mx-5">
                                                  <ChunkedNotesReader
                                                      content={topic.content}
                                                      topBarLabel={topic.title}
                                                      noteKey={`pdfview_${chapter.id}_topic_${idx}`}
                                                      hideTopBar
                                                      autoStart={isAutoPlaying && activeTopicIndex === idx}
                                                      initialIndex={lastReadLineMap[idx] ?? null}
                                                      onPositionChange={(lineIdx) => saveReadPosition(idx, lineIdx)}
                                                      onComplete={() => {
                                                          if (!isAutoPlaying) return;
                                                          if (idx + 1 < deepDiveTopics.length) {
                                                              setActiveTopicIndex(idx + 1);
                                                          } else {
                                                              setIsAutoPlaying(false);
                                                              setTopicSpeakingState(null);
                                                          }
                                                      }}
                                                  />
                                              </div>
                                          )}

                                          {/* === PAIRED ADDITIONAL NOTE (inline Read More) ===
                                              Pehle yeh button ek fullscreen overlay kholta tha jisme
                                              "EXTENDED RESOURCE / Part 1" jaise tags + sirf 1 bullet ke
                                              andar pura blue text rendered hota tha — jo professional
                                              nahi lagta tha. Ab Read More tap karne par same-page par
                                              hi neeche cyan-tinted accordion expand hota hai jisme:
                                              — chunk-wise tappable TTS lines (har sentence alag),
                                              — agar PDF link ho to View PDF chip,
                                              — agar audio URL ho to Audio chip,
                                              — Save Offline icon, aur Collapse button.
                                              Visual differentiation (cyan tint + label "Library
                                              Reference") batati hai ki yeh main notes ka part nahi hai. */}
                                          {pairedNote && (() => {
                                              const isExpanded = expandedNoteIdx === idx;
                                              const noteContent = (pairedNote as any).noteContent as string | undefined;
                                              const audioUrl = (pairedNote as any).audioUrl as string | undefined;
                                              const onlyPdf = pairedHasPdf && !pairedHasContent;
                                              return (
                                                  <div className="mt-3 -mx-3 sm:-mx-5 px-3 sm:px-5 pt-2 border-t border-slate-100">
                                                      <button
                                                          onClick={() => {
                                                              // PDF-only paired note → open the existing
                                                              // fullscreen PDF viewer (no inline preview
                                                              // for raw PDFs since they need full screen).
                                                              if (onlyPdf) {
                                                                  stopSpeech();
                                                                  setActivePdf(formatDriveLink(pairedNote.pdfLink!));
                                                                  return;
                                                              }
                                                              setExpandedNoteIdx(isExpanded ? null : idx);
                                                              if (!isExpanded) {
                                                                  // Stop any running TTS so the inline
                                                                  // reader starts in a clean state.
                                                                  stopAllSpeech();
                                                              } else {
                                                                  stopAllSpeech();
                                                              }
                                                          }}
                                                          className={`w-full flex items-center gap-3 rounded-xl p-2.5 transition-colors ${isExpanded ? 'bg-cyan-100 border border-cyan-300' : 'bg-cyan-50/60 border border-cyan-200 hover:bg-cyan-50'}`}
                                                          aria-expanded={isExpanded}
                                                      >
                                                          <div className="w-8 h-8 rounded-lg bg-white text-cyan-700 flex items-center justify-center shrink-0 border border-cyan-200">
                                                              {pairedHasPdf ? <FileText size={14} /> : <Book size={14} />}
                                                          </div>
                                                          <span className="flex-1 text-left text-[12px] font-black text-cyan-800 truncate">
                                                              {isExpanded ? 'Hide reference' : 'Read More'}
                                                          </span>
                                                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 ${isExpanded ? 'bg-cyan-700 text-white' : 'bg-cyan-600 text-white shadow-sm'}`}>
                                                              {isExpanded ? <>Close</> : <>Open <ChevronRight size={11} /></>}
                                                          </span>
                                                      </button>

                                                      {/* INLINE EXPANDED REFERENCE
                                                          Pehle pure body pe cyan tint thi → Hindi + English text
                                                          ek bada blue blob lag raha tha. Ab sirf top banner cyan
                                                          rakha (visual marker that yeh main notes nahi hai); body
                                                          neutral cream/white hai taaki ChunkedNotesReader ke
                                                          chunks alag-alag tappable lines ki tarah saaf dikhe.
                                                          User-pickable theme (cream/white/sepia/mint/dark) bhi
                                                          add ki — eye-strain control ke liye. */}
                                                      {isExpanded && noteContent && (
                                                          <div className="mt-2 rounded-xl border border-cyan-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                                                              {/* Cyan banner — yeh batati hai ki yeh "Library Reference" hai */}
                                                              <div className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white">
                                                                  <Book size={12} className="shrink-0" />
                                                                  <span className="text-[10px] font-black uppercase tracking-wider truncate flex-1 min-w-0">
                                                                      Library Reference{pairedNote.title ? ` · ${pairedNote.title}` : ''}
                                                                  </span>
                                                                  {pairedHasPdf && (
                                                                      <button
                                                                          onClick={(e) => { e.stopPropagation(); stopSpeech(); setActivePdf(formatDriveLink(pairedNote.pdfLink!)); }}
                                                                          className="p-1 rounded-full bg-white/20 hover:bg-white/30 shrink-0"
                                                                          title="Open PDF in fullscreen"
                                                                          aria-label="Open PDF"
                                                                      >
                                                                          <FileText size={12} />
                                                                      </button>
                                                                  )}
                                                                  {audioUrl && (
                                                                      <button
                                                                          onClick={(e) => { e.stopPropagation(); playCustomAudio(audioUrl); }}
                                                                          className="p-1 rounded-full bg-white/20 hover:bg-white/30 shrink-0"
                                                                          title="Play premium audio"
                                                                          aria-label="Play audio"
                                                                      >
                                                                          <Music size={12} />
                                                                      </button>
                                                                  )}
                                                                  <button
                                                                      onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          saveOfflineItem({
                                                                              id: `note_${chapter.id}_${idx}_${Date.now()}`,
                                                                              type: 'NOTE',
                                                                              title: pairedNote.title || 'Saved Note',
                                                                              subtitle: `${subject.name} - ${chapter.title}`,
                                                                              data: { html: noteContent }
                                                                          });
                                                                          setAlertConfig({ isOpen: true, message: 'Reference saved offline.' });
                                                                      }}
                                                                      className="p-1 rounded-full bg-white/20 hover:bg-white/30 shrink-0"
                                                                      title="Save offline"
                                                                      aria-label="Save offline"
                                                                  >
                                                                      <Download size={12} />
                                                                  </button>
                                                              </div>

                                                              {/* Color theme picker — chhoti horizontal strip with
                                                                  5 swatches. Tap karke background change kar sakte
                                                                  hain. Default: Cream (warm + low eye strain). */}
                                                              <div className={`flex items-center gap-1.5 px-3 py-1.5 border-b ${readMoreTheme.border} ${readMoreTheme.bg} ${readMoreTheme.text === 'text-slate-50' ? 'bg-opacity-100' : ''}`}>
                                                                  <Palette size={11} className="opacity-60 shrink-0" />
                                                                  <span className={`text-[9px] font-bold uppercase tracking-wider opacity-60 mr-1`}>Theme</span>
                                                                  {READ_MORE_THEMES.map(t => (
                                                                      <button
                                                                          key={t.id}
                                                                          onClick={(e) => { e.stopPropagation(); setReadMoreThemeId(t.id); }}
                                                                          className={`w-5 h-5 rounded-full ${t.dot} ${readMoreThemeId === t.id ? 'ring-2 ring-offset-1 ring-cyan-600' : ''} transition-all`}
                                                                          title={t.label}
                                                                          aria-label={`Theme: ${t.label}`}
                                                                          aria-pressed={readMoreThemeId === t.id}
                                                                      />
                                                                  ))}
                                                              </div>

                                                              {/* CHUNKED CONTENT — each Hindi-danda sentence /
                                                                  bullet becomes its own tappable line. Tap → TTS
                                                                  highlights that chunk and reads it aloud. The
                                                                  reader's own top bar is shown so user gets font
                                                                  size + read-all + line color controls in addition
                                                                  to our wrapper theme. */}
                                                              <div className={`px-1 py-1 ${readMoreTheme.bg} ${readMoreTheme.text}`}>
                                                                  <ChunkedNotesReader
                                                                      content={noteContent}
                                                                      noteKey={`pdfview_${chapter.id}_addnote_inline_${idx}_${readMoreThemeId}`}
                                                                      textColorOverride={readMoreTheme.textHex}
                                                                      hideTopBar={hideHeader}
                                                                  />
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          })()}
                                      </div>
                                  );
                              })}
                           </>
                        );
                   })()}
               </div>
           )}

           {/* 3. PREMIUM NOTES (PDF + TTS) */}
           {activeTab === 'PREMIUM' && (
               <div className={`${pdfFullscreen ? 'h-screen' : 'h-[calc(100vh-140px)]'} flex flex-col premium-slides-container`}>
                   {(() => {
                        const access = getTabAccess('PREMIUM');

                        if (!access.hasAccess) {
                            return (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 bg-slate-50 h-full">
                                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-purple-100">
                                        <Lock size={32} className="text-purple-600" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 mb-2">Premium Audio Slides Locked</h2>
                                    <p className="text-sm text-slate-600 max-w-xs mb-8 leading-relaxed">
                                        {access.reason === 'FEED_LOCKED' ? 'Content locked by admin.' : 'Visual slides with synchronized audio narration.'}
                                    </p>

                                    {access.reason !== 'FEED_LOCKED' && access.cost > 0 ? (
                                        <button
                                            onClick={() => setPendingPdf({ type: 'PREMIUM', price: access.cost, link: 'UNLOCK_TAB_PREMIUM' })}
                                            className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Zap size={18} /> Unlock for {access.cost} Credits
                                        </button>
                                    ) : access.reason !== 'FEED_LOCKED' ? (
                                        <div className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-wider">
                                            Upgrade Plan to Access
                                        </div>
                                    ) : null}
                                </div>
                            );
                        }

                        return (
                           <div className="flex flex-row h-full w-full">
                               {/* ENTRY SELECTOR IF MULTIPLE */}
                               {(() => {
                                   let entries = syllabusMode === 'SCHOOL' ? (contentData?.schoolPremiumNotesList || []) : (contentData?.competitionPremiumNotesList || []);

                                   if (entries.length <= 1) return null;

                                   return (
                                       <div className="bg-slate-100 p-2 flex flex-col gap-2 overflow-y-auto border-r border-slate-200 min-w-[100px] h-full">
                                           {entries.map((_: any, i: number) => (
                                               <button
                                                   key={i}
                                                   onClick={() => {
                                                       setCurrentPremiumEntryIdx(i);
                                                       stopAllSpeech();
                                                   }}
                                                   className={`px-3 py-2 text-xs font-bold rounded-lg text-left transition-all ${currentPremiumEntryIdx === i ? 'bg-purple-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                               >
                                                   Part {i + 1}
                                               </button>
                                           ))}
                                       </div>
                                   );
                               })()}

                               <div className="flex-1 relative bg-slate-200">
                                   {(() => {
                                       // Determine Content
                                       let pdfLink = '';
                                       let ttsHtml = '';
                                       let entryTitle = '';

                                       let entries = syllabusMode === 'SCHOOL' ? (contentData?.schoolPremiumNotesList || []) : (contentData?.competitionPremiumNotesList || []);

                                       // Construct a virtual list for selection logic from Premium Notes List
                                       let virtualList: {title: string, pdf: string, html: string}[] = [];

                                       entries.forEach((e: any, i: number) => {
                                           virtualList.push({
                                               title: e.title || `Premium Note ${i + 1}`,
                                               pdf: e.url || '',
                                               html: e.content || ''
                                           });
                                       });

                                       // Safety check
                                       if (currentPremiumEntryIdx >= virtualList.length && virtualList.length > 0) {
                                           const item = virtualList[0];
                                           pdfLink = item.pdf;
                                           ttsHtml = item.html;
                                           entryTitle = item.title;
                                       } else if (virtualList.length > 0) {
                                           const item = virtualList[currentPremiumEntryIdx];
                                           pdfLink = item.pdf;
                                           ttsHtml = item.html;
                                           entryTitle = item.title;
                                       }

                                       const formattedLink = formatDriveLink(pdfLink);

                                       return (
                                           <div className="flex-1 flex flex-col w-full h-full relative">
                                               {/* Selection Header (Only if multiple items) */}
                                               {virtualList.length > 1 && (
                                                   <div className="absolute top-0 left-0 w-full z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200 p-2 overflow-x-auto flex gap-2">
                                                       {virtualList.map((item, i) => (
                                                           <button
                                                               key={i}
                                                               onClick={() => {
                                                                   setCurrentPremiumEntryIdx(i);
                                                                   stopAllSpeech();
                                                               }}
                                                               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex flex-col items-center border ${currentPremiumEntryIdx === i ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                           >
                                                               <span>{`NOTE ${i + 1}`}</span>
                                                               <span className="opacity-80 text-[9px] truncate max-w-[80px]">{item.title}</span>
                                                           </button>
                                                       ))}
                                                   </div>
                                               )}

                                               {/* Content Container (Adjust top padding if header exists) */}
                                               <div className={`relative w-full h-full ${virtualList.length > 1 ? 'pt-14' : ''}`}>
                                                   {pdfLink ? (
                                                       <div
                                                         className="relative w-full h-full flex items-center justify-center bg-slate-900"
                                                         style={{ overflow: 'auto' }}
                                                         onTouchStart={handleTouchStart}
                                                         onTouchMove={handleTouchMove}
                                                         onTouchEnd={() => handleTouchEnd(virtualList.length)}
                                                       >
                                                            <div
                                                                className="flex items-center justify-center"
                                                                style={{
                                                                    width: zoom !== 1 ? `${zoom * 100}%` : '100%',
                                                                    height: zoom !== 1 ? `${zoom * 100}%` : '100%',
                                                                    minWidth: '100%',
                                                                    minHeight: '100%',
                                                                    transition: 'width 0.2s, height 0.2s',
                                                                }}
                                                            >
                                                                <iframe
                                                                    src={formattedLink}
                                                                    className="border-none transition-transform duration-300"
                                                                    title="PDF Viewer"
                                                                    allow="autoplay"
                                                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"
                                                                    style={
                                                                        pdfRotation === 0 ? { width: '100%', height: '100%' }
                                                                        : pdfRotation === 180 ? { width: '100%', height: '100%', transform: 'rotate(180deg)', transformOrigin: 'center center' }
                                                                        : { width: 'var(--pdf-rot-w, 100%)', height: 'var(--pdf-rot-h, 100%)', transform: `rotate(${pdfRotation}deg)`, transformOrigin: 'center center' }
                                                                    }
                                                                    ref={(el) => {
                                                                        if (!el) return;
                                                                        if (pdfRotation === 90 || pdfRotation === 270) {
                                                                            const parent = el.parentElement;
                                                                            if (parent) {
                                                                                el.style.setProperty('--pdf-rot-w', `${parent.clientHeight}px`);
                                                                                el.style.setProperty('--pdf-rot-h', `${parent.clientWidth}px`);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            {/* Invisible Header Blocker */}
                                                            <div className="absolute top-0 left-0 w-full h-12 bg-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()} />
                                                       </div>
                                                   ) : (
                                                       <div className="flex items-center justify-center h-full text-slate-500 font-bold bg-slate-50">
                                                           <div className="text-center">
                                                               <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                                               <p>No PDF attached for this section.</p>
                                                               <p className="text-xs font-normal mt-1 text-slate-500">{entryTitle}</p>
                                                           </div>
                                                       </div>
                                                   )}

                                               </div>
                                           </div>
                                       );
                                   })()}
                               </div>
                           </div>
                        );
                   })()}
               </div>
           )}

           {/* 5. TEACHER GUIDE (TEACHING STRATEGY) */}
           {activeTab === 'TEACHER' && (
               <div className="p-0 sm:p-4 space-y-4 w-full max-w-none mx-auto">
                   {(() => {
                       const strategyHtml = contentData?.teachingStrategyHtml;
                       const strategyNotes = contentData?.teachingStrategyNotes || [];

                       if ((!strategyHtml || strategyHtml.trim().length === 0) && strategyNotes.length === 0) {
                           return (
                               <div className="flex flex-col items-center justify-center py-20 text-center text-slate-600">
                                   <BookOpen size={48} className="mb-4 text-purple-200" />
                                   <h3 className="font-bold text-lg text-slate-700">No Strategy Guide Added</h3>
                                   <p className="text-xs max-w-xs mt-2">The admin hasn't added a Teaching Strategy for this chapter yet.</p>
                               </div>
                           );
                       }

                       // Combine legacy html as the first note if no title provided, or just map them all
                       const allStrategyNotes = [];
                       if (strategyHtml && strategyHtml.trim().length > 0) {
                           allStrategyNotes.push({ id: 'legacy-1', title: 'Strategy Overview', content: strategyHtml });
                       }
                       if (strategyNotes.length > 0) {
                           allStrategyNotes.push(...strategyNotes);
                       }

                       if (allStrategyNotes.length === 0) return null;

                       const currentNote = allStrategyNotes[currentStrategyIndex];
                       if (!currentNote) return null;

                       return (
                           <div className="flex flex-col h-full max-w-3xl mx-auto px-3 sm:px-0 pt-3">
                               {/* Editorial section header — competition-mode-jaisa clean look */}
                               <div className="flex items-end justify-between border-b border-slate-200 pb-2 mb-4">
                                   <div>
                                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Educator's Guide</p>
                                       <h3 className="text-xl font-black text-slate-900 leading-tight">Teaching Strategy</h3>
                                   </div>
                                   <button
                                       onClick={() => {
                                           const htmlContent = allStrategyNotes.map(n => `<h2>${n.title || 'Teaching Strategy'}</h2>${n.content}`).join('<hr/>');
                                           saveOfflineItem({
                                               id: `strategy_${chapter.id}`,
                                               type: 'NOTE',
                                               title: 'Teaching Strategy',
                                               subtitle: `${subject.name} - ${chapter.title}`,
                                               data: { html: htmlContent }
                                           });
                                           setAlertConfig({isOpen: true, message: 'Teaching Strategy Saved Offline! Access them in the History tab.'});
                                       }}
                                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap shrink-0"
                                       title="Save offline"
                                   >
                                       <Download size={11} /> Save
                                   </button>
                               </div>

                               {/* Topic chip rail */}
                               {allStrategyNotes.length > 1 && (
                                   <div className="flex overflow-x-auto gap-2 pb-3 scrollbar-hide -mx-3 px-3 mb-1">
                                       {allStrategyNotes.map((note, idx) => (
                                           <button
                                               key={idx}
                                               onClick={() => { setCurrentStrategyIndex(idx); stopSpeech(); }}
                                               className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${currentStrategyIndex === idx ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700'}`}
                                           >
                                               {note.title || `Topic ${idx + 1}`}
                                           </button>
                                       ))}
                                   </div>
                               )}

                               {/* Article-style card — premium editorial feel */}
                               <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                   {/* Subtle gradient header strip with accent bar */}
                                   <header className="relative px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-indigo-600" />
                                       <div className="flex items-start justify-between gap-3">
                                           <div className="min-w-0">
                                               <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1">
                                                   <GraduationCap size={12} />
                                                   <span>Topic {currentStrategyIndex + 1}{allStrategyNotes.length > 1 ? ` of ${allStrategyNotes.length}` : ''}</span>
                                               </div>
                                               <h3 className="font-black text-slate-900 text-lg leading-tight">{currentNote.title || 'Teaching Strategy'}</h3>
                                               <p className="text-[11px] text-slate-500 font-medium mt-0.5">Exclusive guide for educators</p>
                                           </div>
                                           {currentNote.audioUrl && (
                                               <button
                                                   onClick={() => playCustomAudio(currentNote.audioUrl)}
                                                   className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-md flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider transition-transform hover:scale-105 shrink-0"
                                                   title="Play Premium Audio Strategy"
                                               >
                                                   <Music size={12} /> Audio
                                               </button>
                                           )}
                                       </div>
                                   </header>
                                   {/* Teacher Strategy — HTML renderer. Content seedha
                                       dangerouslySetInnerHTML se render hota hai taaki
                                       colored headings, tables, bold text sab dikhe.
                                       TTS ke liye HTML strip karke plain text padha jaata hai. */}
                                   <div className="overflow-y-auto teacher-guide-container">
                                       <div className="sticky top-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-3 py-2 shadow-sm">
                                           <span className="text-xs font-bold text-slate-600 truncate">{currentNote.title || 'Teaching Strategy'}</span>
                                           <button
                                               onClick={() => {
                                                   if (isTeacherReading) {
                                                       stopSpeech();
                                                       setIsTeacherReading(false);
                                                   } else {
                                                       const plainText = stripHtml(currentNote.content || '');
                                                       setIsTeacherReading(true);
                                                       speakText(plainText, undefined, 1.0, 'hi-IN', undefined, () => setIsTeacherReading(false));
                                                   }
                                               }}
                                               className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition ${isTeacherReading ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                           >
                                               {isTeacherReading ? <><Square size={13} /> Stop</> : <><Volume2 size={13} /> Read All</>}
                                           </button>
                                       </div>
                                       <div
                                           className="p-2 sm:p-4"
                                           dangerouslySetInnerHTML={{ __html: currentNote.content || '' }}
                                       />
                                   </div>
                               </article>

                               {/* Pagination Controls */}
                               {allStrategyNotes.length > 1 && (
                                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm mt-auto mb-4">
                                       <button
                                           onClick={() => { setCurrentStrategyIndex(Math.max(0, currentStrategyIndex - 1)); stopSpeech(); }}
                                           disabled={currentStrategyIndex === 0}
                                           className="px-4 py-2 rounded-lg font-bold text-xs bg-slate-100 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                                       >
                                           Previous Topic
                                       </button>
                                       <span className="text-xs font-bold text-slate-500">
                                           {currentStrategyIndex + 1} of {allStrategyNotes.length}
                                       </span>
                                       <button
                                           onClick={() => { setCurrentStrategyIndex(Math.min(allStrategyNotes.length - 1, currentStrategyIndex + 1)); stopSpeech(); }}
                                           disabled={currentStrategyIndex === allStrategyNotes.length - 1}
                                           className="px-4 py-2 rounded-lg font-bold text-xs bg-purple-100 text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-200 transition-colors"
                                       >
                                           Next Topic
                                       </button>
                                   </div>
                               )}
                           </div>
                       );
                   })()}
               </div>
           )}

           {/* 4. RESOURCES (ADDITIONAL NOTES) — REDESIGNED: editorial card grid,
               competition-mode-jaisa clean look. Class 6-12 (SCHOOL) me bhi
               COMPETITION wale notes merge karke dikhaye jaate hain taaki
               student ko same content milta hai. */}
           {activeTab === 'RESOURCES' && (
               <div className="p-0 sm:p-4 w-full max-w-3xl mx-auto">
                   {(() => {
                        const access = getTabAccess('RESOURCES');

                        if (!access.hasAccess) {
                            return (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                                    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-cyan-100">
                                        <Lock size={32} className="text-cyan-600" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 mb-2">Additional Resources Locked</h2>
                                    <p className="text-sm text-slate-600 max-w-xs mb-8 leading-relaxed">
                                        {access.reason === 'FEED_LOCKED' ? 'This section is disabled by admin.' : 'Extra reading material and reference documents.'}
                                    </p>

                                    {access.reason !== 'FEED_LOCKED' && access.cost > 0 ? (
                                        <button
                                            onClick={() => setPendingPdf({ type: 'RESOURCES', price: access.cost, link: 'UNLOCK_TAB_RESOURCES' })}
                                            className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-xl shadow-lg hover:bg-cyan-700 hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <Zap size={18} /> Unlock for {access.cost} Credits
                                        </button>
                                    ) : access.reason !== 'FEED_LOCKED' ? (
                                        <div className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-wider">
                                            Upgrade Plan to Access
                                        </div>
                                    ) : null}
                                </div>
                            );
                        }

                        // Merge SCHOOL + COMPETITION resources so Class 6-12 me bhi
                        // wahi notes dikhe jo Competition mode me dikhte hain.
                        const schoolFreeLink = contentData?.schoolPdfLink || contentData?.freeLink;
                        const compFreeLink = contentData?.competitionPdfLink;
                        const schoolFreeHtml = contentData?.schoolFreeNotesHtml || contentData?.freeNotesHtml;
                        const compFreeHtml = contentData?.competitionFreeNotesHtml;
                        // Pick whatever the active mode has, fallback to other mode so
                        // student kabhi blank na dekhe.
                        const freeLink = syllabusMode === 'SCHOOL'
                            ? (schoolFreeLink || compFreeLink)
                            : (compFreeLink || schoolFreeLink);
                        const freeHtml = syllabusMode === 'SCHOOL'
                            ? (schoolFreeHtml || compFreeHtml)
                            : (compFreeHtml || schoolFreeHtml);
                        const hasStandard = !!freeLink || (freeHtml && freeHtml.length >= 10);

                        const schoolNotes: AdditionalNoteEntry[] = contentData?.schoolAdditionalNotes || contentData?.additionalNotes || [];
                        const compNotes: AdditionalNoteEntry[] = contentData?.competitionAdditionalNotes || [];
                        // Dedupe by title+pdfLink so same resource ek hi baar dikhe.
                        const seen = new Set<string>();
                        const mergedNotes: AdditionalNoteEntry[] = [...schoolNotes, ...compNotes].filter(n => {
                            const k = `${(n.title || '').trim().toLowerCase()}|${(n.pdfLink || '').trim()}|${(n.noteContent || '').slice(0, 40)}`;
                            if (seen.has(k)) return false;
                            seen.add(k);
                            return true;
                        });

                        if (!hasStandard && mergedNotes.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                                    <Layers size={48} className="mb-4 text-cyan-200" />
                                    <h3 className="font-bold text-base text-slate-700">No Resources Yet</h3>
                                    <p className="text-xs max-w-xs mt-2">Admin ne abhi is chapter ke liye extended resources nahi daale hain.</p>
                                </div>
                            );
                        }

                        return (
                           <div className="px-3 sm:px-0 pt-3 pb-6 space-y-5">
                               {/* Section header — editorial */}
                               <div className="flex items-end justify-between border-b border-slate-200 pb-2">
                                   <div>
                                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Library</p>
                                       <h3 className="text-xl font-black text-slate-900 leading-tight">Extended Resources</h3>
                                   </div>
                                   <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                       {(hasStandard ? 1 : 0) + mergedNotes.length} item{((hasStandard ? 1 : 0) + mergedNotes.length) === 1 ? '' : 's'}
                                   </span>
                               </div>

                               {/* Standard Notes — featured card */}
                               {hasStandard && (
                                   <button
                                       onClick={() => handlePdfClick('FREE')}
                                       className="group w-full text-left bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
                                   >
                                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                                           <FileText size={22} />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                           <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Featured</p>
                                           <h4 className="font-black text-slate-800 text-base leading-tight">Standard Notes</h4>
                                           <p className="text-[11px] text-slate-500 mt-0.5">Chapter ka core reading material</p>
                                       </div>
                                       <ChevronRight size={20} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
                                   </button>
                               )}

                               {/* Additional Resources grid */}
                               {mergedNotes.length > 0 && (
                                   <div>
                                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 px-1">More Reading</p>
                                       <div className="grid grid-cols-1 gap-2.5">
                                           {mergedNotes.map((note: AdditionalNoteEntry, idx: number) => {
                                               const hasPdf = !!note.pdfLink;
                                               const hasContent = !!note.noteContent;
                                               const hasAudio = !!note.audioUrl;
                                               const typeLabel = hasPdf && hasContent ? 'PDF + Reader' : hasPdf ? 'PDF Document' : 'Text Reader';
                                               const typeBadgeColor = hasPdf && hasContent
                                                   ? 'bg-violet-50 text-violet-700 border-violet-200'
                                                   : hasPdf
                                                       ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                       : 'bg-cyan-50 text-cyan-700 border-cyan-200';
                                               return (
                                                   <button
                                                       key={idx}
                                                       onClick={() => {
                                                           if (note.pdfLink && note.noteContent) {
                                                               setActiveNoteContent({ title: note.title || `Note ${idx + 1}`, content: note.noteContent, pdfUrl: note.pdfLink, audioUrl: note.audioUrl });
                                                           } else if (note.pdfLink) {
                                                               if (note.audioUrl) {
                                                                   setActiveNoteContent({ title: note.title || `Note ${idx + 1}`, content: '', pdfUrl: note.pdfLink, audioUrl: note.audioUrl });
                                                               } else {
                                                                   setActivePdf(note.pdfLink);
                                                               }
                                                           } else if (note.noteContent) {
                                                               setActiveNoteContent({ title: note.title || `Note ${idx + 1}`, content: note.noteContent, audioUrl: note.audioUrl });
                                                           }
                                                       }}
                                                       className="group w-full text-left bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-cyan-300 hover:shadow-md transition-all flex items-center gap-3"
                                                   >
                                                       <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:from-cyan-50 group-hover:to-cyan-100 group-hover:text-cyan-700 transition-colors border border-slate-200">
                                                           {hasPdf ? <FileText size={18} /> : <Book size={18} />}
                                                       </div>
                                                       <div className="flex-1 min-w-0">
                                                           <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{note.title || `Resource ${idx + 1}`}</h4>
                                                           <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                               <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadgeColor}`}>
                                                                   {typeLabel}
                                                               </span>
                                                               {hasAudio && (
                                                                   <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-0.5">
                                                                       <Music size={9} /> Audio
                                                                   </span>
                                                               )}
                                                           </div>
                                                       </div>
                                                       <ChevronRight size={18} className="text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                   </button>
                                               );
                                           })}
                                       </div>
                                   </div>
                               )}
                           </div>
                        );
                   })()}
               </div>
           )}

       </div>
       </ErrorBoundary>

       {/* CONFIRMATION & INFO MODALS ... */}
       {pendingPdf && <CreditConfirmationModal title="Unlock Content" cost={pendingPdf.price} userCredits={user.credits} isAutoEnabledInitial={!!user.isAutoDeductEnabled} onCancel={() => setPendingPdf(null)} onConfirm={(auto) => processPaymentAndOpen(pendingPdf.link, pendingPdf.price, auto, pendingPdf.tts, pendingPdf.type === 'DEEP_DIVE')} />}
    </div>
  );
};
