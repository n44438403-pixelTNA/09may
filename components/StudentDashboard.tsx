import React, { useState, useEffect, useRef, useCallback } from "react";
import { TopBarEffectsLayer } from "../utils/topBarEffects";
import {
  User,
  Subject,
  StudentTab,
  SystemSettings,
  CreditPackage,
  WeeklyTest,
  Chapter,
  MCQItem,
  Challenge20,
  MCQResult,
  LucentNoteEntry,
  AppNotification,
} from "../types";
import {
  updateUserStatus,
  db,
  saveUserToLive,
  getChapterData,
  rtdb,
  saveAiInteraction,
  saveDemandRequest,
  saveCompareAnalytic,
} from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, query, limitToLast, onValue, set } from "firebase/database";
import {
  getSubjectsList,
  DEFAULT_APP_FEATURES,
  ALL_APP_FEATURES,
  LEVEL_UNLOCKABLE_FEATURES,
  LEVEL_UP_CONFIG,
  APP_VERSION,
} from "../constants";
import { ALL_FEATURES } from "../utils/featureRegistry";
import { useAppLang, tApp } from "../utils/appLang";
import { isHomeSectionVisible } from "../utils/homeSections";
import { checkFeatureAccess } from "../utils/permissionUtils";
import { downloadAsMHTML } from "../utils/downloadUtils";
import { saveRecentHomework, getRecentHomeworks, removeRecentHomework, getRecentChapters, removeRecentChapter, saveRecentLucent, getRecentLucent, removeRecentLucent, markNoteFullyRead, getFullyReadMap, markReadToday, getReadingStreak, getReadDates, getBestReadingDay, getTodayItemCount, type RecentChapterEntry, type RecentHwEntry, type RecentLucentEntry, type StreakInfo, type BestDay } from "../utils/recentReads";
import { SubscriptionEngine } from "../utils/engines/subscriptionEngine";
import { RewardEngine } from "../utils/engines/rewardEngine";
import { Button } from "./ui/Button"; // Design System
import { getActiveChallenges } from "../services/questionBank";
import { generateDailyChallengeQuestions } from "../utils/challengeGenerator";
import { searchNotesByWords, searchNotesByTitle, type NoteSearchResult } from "../utils/noteSearcher";
import { generateMorningInsight } from "../services/morningInsight";
import { LessonActionModal } from "./LessonActionModal";
import { PullToRefresh } from "./PullToRefresh";
import pLimit from "p-limit";
import { RedeemSection } from "./RedeemSection";
import { Store } from "./Store";
import { AppStore } from "./AppStore";
import {
  Globe,
  Layout,
  Gift,
  Cloud,
  CloudOff,
  Sparkles,
  Megaphone,
  Lock,
  BookOpen,
  AlertCircle,
  Edit,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  MessageCircle,
  Gamepad2,
  Timer,
  CreditCard,
  Send,
  CheckCircle,
  Mail,
  X,
  Check,
  Ban,
  Smartphone,
  Monitor,
  Trophy,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Video,
  Youtube,
  Home,
  User as UserIcon,
  Book,
  BookOpenText,
  List,
  BarChart3,
  Award,
  Bell,
  Headphones,
  LifeBuoy,
  WifiOff,
  Zap,
  Star,
  Crown,
  History,
  ListChecks,
  Rocket,
  Ticket,
  TrendingUp,
  BrainCircuit,
  FileText,
  CheckSquare,
  Menu,
  LayoutGrid,
  Compass,
  User as UserIconOutline,
  MessageSquare,
  Bot,
  HelpCircle,
  Database,
  Activity,
  Download,
  Calendar,
  LogOut,
  Clock,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Square,
  GraduationCap,
  Newspaper,
  PlusCircle,
  Search,
  Users,
  Target,
  History as HistoryIcon,
  GitCompare,
} from "lucide-react";
import { speakText, stopSpeech } from "../utils/textToSpeech";
import { getMistakeBankSync, addMistakes, removeMistakeByQuestion } from "../utils/mistakeBank";
import { rotateScreen } from "../utils/displayPrefs";
import { hapticLight, hapticMedium, hapticStrong } from "../utils/haptic";
import { splitIntoTopics } from "../utils/notesSplitter";
import { SubjectSelection } from "./SubjectSelection";
import { BannerCarousel } from "./BannerCarousel";
import { ChapterSelection } from "./ChapterSelection"; // Imported for Video Flow
import { VideoPlaylistView } from "./VideoPlaylistView"; // Imported for Video Flow
import { AudioPlaylistView } from "./AudioPlaylistView"; // Imported for Audio Flow
import { PdfView } from "./PdfView"; // Imported for PDF Flow
import { McqView } from "./McqView"; // Imported for MCQ Flow
import { MiniPlayer } from "./MiniPlayer"; // Imported for Audio Flow
import { HistoryPage } from "./HistoryPage";
import TeacherStore from "./TeacherStore";
import { ErrorBoundary } from "./ErrorBoundary";
import { Leaderboard } from "./Leaderboard";
import { SpinWheel } from "./SpinWheel";
import { fetchChapters, generateCustomNotes } from "../services/groq"; // Needed for Video Flow
import { LoadingOverlay } from "./LoadingOverlay";
import { CreditConfirmationModal } from "./CreditConfirmationModal";
import { UserGuide } from "./UserGuide";
import { CustomAlert } from "./CustomDialogs";
import { LiveResultsFeed } from "./LiveResultsFeed";
// import { ChatHub } from './ChatHub';
import { UniversalInfoPage } from "./UniversalInfoPage";
import { UniversalChat } from "./UniversalChat";
import { ExpiryPopup } from "./ExpiryPopup";
import { SubscriptionHistory } from "./SubscriptionHistory";
import { SearchResult } from "../utils/syllabusSearch";
import { RevisionHub } from "./RevisionHub"; // NEW
import { AiHub } from "./AiHub"; // NEW: AI Hub
import { McqReviewHub } from "./McqReviewHub"; // NEW
import { UniversalVideoView } from "./UniversalVideoView"; // NEW
import { RevisionHubV2 } from "./RevisionHubV2"; // NEW: Revision Hub V2 with auto-note search
import { CustomBloggerPage } from "./CustomBloggerPage";
import { ReferralPopup } from "./ReferralPopup";
import { SpeakButton } from "./SpeakButton";
import { McqSpeakButtons } from "./McqSpeakButtons";
import { FlashcardMcqView } from "./FlashcardMcqView";
import { ChunkedNotesReader } from "./ChunkedNotesReader";
import { CompareView } from "./CompareView";
import { McqSearchView } from "./McqSearchView";
import { TopicDirectoryView } from "./TopicDirectoryView";
import { recordNoteStar, recordNoteUnstar, subscribeToTopNoteStars, hashTopic, NoteStarEntry } from "../services/noteStars";
import { PerformanceGraph } from "./PerformanceGraph";
import { StudentSidebar } from "./StudentSidebar";
import { StudyGoalTimer } from "./StudyGoalTimer";
import { ExplorePage } from "./ExplorePage";
import { StudentHistoryModal } from "./StudentHistoryModal";
import { generateDailyRoutine } from "../utils/routineGenerator";
import { OfflineDownloads } from "./OfflineDownloads";
import { ThemeAnimationBuilder } from "./ThemeAnimationBuilder";
import { saveOfflineItem } from "../utils/offlineStorage";
import { NotificationPrompt } from "./NotificationPrompt";
import { EngagementRewardPopup } from "./EngagementRewardPopup";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";

/**
 * Lightweight swipe-to-dismiss wrapper for "Continue Reading" cards.
 * - Swipe LEFT > 80px → calls onDismiss().
 * - Anything less → smoothly snaps back.
 * Uses direct DOM transform during the gesture so we don't trigger React
 * re-renders on every touchmove. Touch only — desktop click stays normal.
 *
 * Safe note: cards inside this wrapper must not contain `position: fixed`
 * descendants (transforms break fixed positioning). The Continue Reading
 * cards never contain fixed elements, so this is safe here.
 */
const SwipeToDismiss: React.FC<{
  onDismiss: () => void;
  className?: string;
  threshold?: number;
  children: React.ReactNode;
}> = ({ onDismiss, className, threshold = 80, children }) => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef<number | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const lockedRef = React.useRef<'horizontal' | 'vertical' | null>(null);
  const draggingRef = React.useRef(false);

  const reset = (animate: boolean) => {
    const el = wrapRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease' : 'none';
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    lockedRef.current = null;
    draggingRef.current = true;
    if (wrapRef.current) wrapRef.current.style.transition = 'none';
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current || startXRef.current === null || startYRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    if (lockedRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        lockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
    }
    if (lockedRef.current !== 'horizontal') return;
    // Only allow leftward dismiss; rightward gets a slight rubber-band.
    const tx = dx < 0 ? dx : dx * 0.25;
    const el = wrapRef.current;
    if (el) {
      el.style.transform = `translateX(${tx}px)`;
      el.style.opacity = String(Math.max(0.4, 1 - Math.min(1, Math.abs(tx) / 220)));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const startX = startXRef.current;
    startXRef.current = null;
    startYRef.current = null;
    if (lockedRef.current !== 'horizontal' || startX === null) {
      reset(true);
      lockedRef.current = null;
      return;
    }
    lockedRef.current = null;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if (dx <= -threshold) {
      const el = wrapRef.current;
      if (el) {
        el.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
        el.style.transform = `translateX(-${(el.offsetWidth || 320) + 20}px)`;
        el.style.opacity = '0';
      }
      window.setTimeout(() => onDismiss(), 200);
      return;
    }
    reset(true);
  };

  const onTouchCancel = () => {
    draggingRef.current = false;
    startXRef.current = null;
    startYRef.current = null;
    lockedRef.current = null;
    reset(true);
  };

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ touchAction: 'pan-y', willChange: 'transform' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {children}
    </div>
  );
};

interface Props {
  user: User;
  dailyStudySeconds: number; // Received from Global App
  onSubjectSelect: (subject: Subject) => void;
  onRedeemSuccess: (user: User) => void;
  settings?: SystemSettings; // New prop
  onStartWeeklyTest?: (test: WeeklyTest) => void;
  activeTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
  setFullScreen: (full: boolean) => void; // Passed from App
  onNavigate?: (view: "ADMIN_DASHBOARD") => void; // Added for Admin Switch
  isImpersonating?: boolean;
  onNavigateToChapter?: (
    chapterId: string,
    chapterTitle: string,
    subjectName: string,
    classLevel?: string,
  ) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: (v: boolean) => void;
  onLogout?: () => void;
  onRecoverData?: () => void;
}

const DashboardSectionWrapper = ({
  id,
  children,
  label,
  settings,
  isLayoutEditing,
  onToggleVisibility,
}: {
  id: string;
  children: React.ReactNode;
  label: string;
  settings?: SystemSettings;
  isLayoutEditing: boolean;
  onToggleVisibility: (id: string) => void;
}) => {
  const isVisible = settings?.dashboardLayout?.[id]?.visible !== false;

  if (!isVisible && !isLayoutEditing) return null;

  return (
    <div
      className={`relative ${isLayoutEditing ? "border-2 border-dashed border-yellow-400 p-2 rounded-xl mb-4 bg-yellow-50/10" : ""}`}
    >
      {isLayoutEditing && (
        <div className="absolute -top-3 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow z-50 flex items-center gap-2">
          <span>{label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(id);
            }}
            className={`px-2 py-0.5 rounded text-xs ${isVisible ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
          >
            {isVisible ? "ON" : "OFF"}
          </button>
        </div>
      )}
      <div
        className={!isVisible ? "opacity-50 grayscale pointer-events-none" : ""}
      >
        {children}
      </div>
    </div>
  );
};

function formatDriveLink(url: string): string {
  if (!url) return url;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview?rm=minimal`;
  return url;
}

function formatVideoEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return url;
}

export const StudentDashboard: React.FC<Props> = ({
  user,
  dailyStudySeconds,
  onSubjectSelect,
  onRedeemSuccess,
  settings,
  onStartWeeklyTest,
  activeTab,
  onTabChange,
  setFullScreen,
  onNavigate,
  isImpersonating,
  onNavigateToChapter,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
  onRecoverData,
}) => {
  const analysisLogs = JSON.parse(
    localStorage.getItem("nst_universal_analysis_logs") || "[]",
  );
  const isGameEnabled = settings?.isGameEnabled !== false;

  const handleTabChangeWrapper = (tab: any) => {
    if (
      tab === "OPEN_CATALOG_PREMIUM_NOTES" ||
      tab === "OPEN_CATALOG_DEEP_DIVE" ||
      tab === "OPEN_CATALOG_VIDEO" ||
      tab === "OPEN_CATALOG_AUDIO"
    ) {
      setShowAllNotesCatalog(false);
      onTabChange("AI_HUB");
      return;
    }
    onTabChange(tab);
  };

  const formatTimeGlobal = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getFeatureAccess = (featureId: string) => {
    if (!settings) return { hasAccess: true, isHidden: false };
    return checkFeatureAccess(featureId, user, settings);
  };

  const hasPermission = (featureId: string) => {
    return getFeatureAccess(featureId).hasAccess;
  };

  // === DISCOUNT EVENT LIVE / COOLDOWN STATE ===
  // Discount sirf "active window" (startsAt → endsAt) ke beech hi LIVE manaa
  // jayega. Cooldown phase (endsAt → resetAt) me prices wapas normal ho jate
  // hain aur ek "Coming Soon" banner dikhna chahiye. Ye dono flags hum yahaan
  // ek hi jagah derive karte hain taaki nav swap, banner, popup sab consistent
  // rahe.
  const { isDiscountLive, isDiscountCooldown, discountEvent } = React.useMemo(() => {
    const event = settings?.specialDiscountEvent;
    if (!event?.enabled) return { isDiscountLive: false, isDiscountCooldown: false, discountEvent: null };
    const now = Date.now();
    const start = event.startsAt ? new Date(event.startsAt).getTime() : 0;
    const end = event.endsAt ? new Date(event.endsAt).getTime() : 0;
    const reset = (event as any).resetAt ? new Date((event as any).resetAt).getTime() : 0;
    let live = false;
    let cooldown = false;
    if (start && end) {
      if (start === end) {
        live = now >= start;
      } else {
        live = now >= start && now < end;
        if (!live && now >= end && reset && now < reset) cooldown = true;
      }
    } else {
      live = true; // legacy events with no dates → treat as live
    }
    return { isDiscountLive: live, isDiscountCooldown: cooldown, discountEvent: event };
  }, [settings?.specialDiscountEvent]);
  const [topBarCreditFlip, setTopBarCreditFlip] = useState(true);
  React.useEffect(() => {
    if (!settings?.specialDiscountEvent?.enabled || (!isDiscountLive && !isDiscountCooldown)) return;
    const id = window.setInterval(() => setTopBarCreditFlip(v => !v), 2000);
    return () => window.clearInterval(id);
  }, [settings?.specialDiscountEvent?.enabled, isDiscountLive, isDiscountCooldown]);

  // Auto-swap: jab discount LIVE ho, profile slot ko Universal Video se replace
  // karna hai, chaahe admin ne `universalVideoInTopBar` set kiya ho ya nahi.
  const universalVideoInTopBarEffective = isDiscountLive ? true : !!settings?.universalVideoInTopBar;

  const [activeSessionClass, setActiveSessionClass] = useState<string | null>(
    null,
  );
  // Persisted board choice — once the student manually picks CBSE/BSEB, that
  // choice becomes their default on the next visit (per device).
  const BOARD_CHOICE_KEY = "nst_board_choice_v1";
  const [activeSessionBoard, _setActiveSessionBoardRaw] = useState<
    "CBSE" | "BSEB" | null
  >(() => {
    try {
      const v = localStorage.getItem(BOARD_CHOICE_KEY);
      if (v === "CBSE" || v === "BSEB") return v;
    } catch {}
    return null;
  });
  const setActiveSessionBoard = (v: "CBSE" | "BSEB" | null) => {
    _setActiveSessionBoardRaw(v);
    try {
      if (v === "CBSE" || v === "BSEB") {
        localStorage.setItem(BOARD_CHOICE_KEY, v);
      } else {
        localStorage.removeItem(BOARD_CHOICE_KEY);
      }
    } catch {}
  };
  const [showBoardPromptForClass, setShowBoardPromptForClass] = useState<
    string | null
  >(null);

  // --- TEACHER EXPIRY CHECK ---
  const [isTeacherLocked, setIsTeacherLocked] = useState(false);
  const [teacherUnlockCode, setTeacherUnlockCode] = useState("");

  useEffect(() => {
    if (user.role === "TEACHER" && user.teacherExpiryDate) {
      if (new Date(user.teacherExpiryDate).getTime() < Date.now()) {
        setIsTeacherLocked(true);
      } else {
        setIsTeacherLocked(false);
      }
    }
  }, [user.role, user.teacherExpiryDate]);

  // --- EXPIRY CHECK & AUTO DOWNGRADE ---
  useEffect(() => {
    if (user.isPremium && !SubscriptionEngine.isPremium(user)) {
      const updatedUser: User = {
        ...user,
        isPremium: false,
        subscriptionTier: "FREE",
        subscriptionLevel: undefined,
        subscriptionEndDate: undefined,
      };
      handleUserUpdate(updatedUser);
      showAlert(
        "Your subscription has expired. You are now on the Free Plan.",
        "ERROR",
        "Plan Expired",
      );
    }
  }, [user.isPremium, user.subscriptionEndDate]);

  // --- POPUP LOGIC (EXPIRY WARNING, UPSELL, AND EVENT) ---
  useEffect(() => {
    const checkPopups = () => {
      const now = Date.now();

      // 1. Expiry Warning
      if (
        settings?.popupConfigs?.isExpiryWarningEnabled &&
        user.isPremium &&
        user.subscriptionEndDate
      ) {
        const end = new Date(user.subscriptionEndDate).getTime();
        const diffHours = (end - now) / (1000 * 60 * 60);
        const threshold = settings.popupConfigs.expiryWarningHours || 24;
        if (diffHours > 0 && diffHours <= threshold) {
          const lastShown = parseInt(
            localStorage.getItem(`last_expiry_warn_${user.id}`) || "0",
          );
          const interval =
            (settings.popupConfigs.expiryWarningIntervalMinutes || 60) *
            60 *
            1000;
          if (now - lastShown > interval) {
            addAppNotification(
              "Expiry Warning",
              `⚠️ Your subscription expires in ${Math.ceil(diffHours)} hours! Renew now to keep uninterrupted access.`,
              "INFO",
            );
            localStorage.setItem(`last_expiry_warn_${user.id}`, now.toString());
            return; // Show one at a time
          }
        }
      }

      // 2. Upsell Promotion
      if (
        settings?.popupConfigs?.isUpsellEnabled &&
        user.subscriptionLevel !== "ULTRA"
      ) {
        const lastShown = parseInt(
          localStorage.getItem(`last_upsell_${user.id}`) || "0",
        );
        const interval =
          (settings.popupConfigs.upsellPopupIntervalMinutes || 120) * 60 * 1000;
        if (now - lastShown > interval) {
          const isFree = !user.isPremium;
          const msg = isFree
            ? "🚀 Upgrade to Premium to unlock Full Subject Notes, Ad-Free Videos, and AI tools!"
            : "💎 Go Ultra! Get unlimited access to Competition Mode, Deep Dive Notes, and AI Chat.";
          addAppNotification("Upgrade Available", msg, "INFO");
          localStorage.setItem(`last_upsell_${user.id}`, now.toString());
          return; // Show one at a time
        }
      }

      // 3. Discount Event Notification
      // Cooldown bug fix: pehle yahaan default `true` tha jisse cooldown phase
      // me bhi popup chala jaata tha. Ab strictly active window check karte hain
      // (start <= now < end) so cooldown me promo silent rahega.
      if (settings?.specialDiscountEvent?.enabled) {
        const event = settings.specialDiscountEvent;
        let isEventActive = false;
        if (event.startsAt && event.endsAt) {
          const startTime = new Date(event.startsAt).getTime();
          const endTime = new Date(event.endsAt).getTime();
          if (startTime === endTime) {
            isEventActive = now >= startTime;
          } else {
            isEventActive = now >= startTime && now < endTime;
          }
        } else {
          // Legacy events with no dates → assume active (old behaviour preserved)
          isEventActive = true;
        }

        if (isEventActive) {
          const isSubscribed =
            user.isPremium &&
            user.subscriptionEndDate &&
            new Date(user.subscriptionEndDate) > new Date(now);
          const shouldShow =
            (isSubscribed && event.showToPremiumUsers) ||
            (!isSubscribed && event.showToFreeUsers);

          if (shouldShow) {
            const lastShown = parseInt(
              localStorage.getItem(
                `last_event_promo_${user.id}_${event.eventName}`,
              ) || "0",
            );
            // Show every 2 hours if not specified differently, just to ensure they know about the sale
            const interval = 2 * 60 * 60 * 1000;
            if (now - lastShown > interval) {
              addAppNotification(
                "Special Event",
                `🎉 ${event.eventName} is LIVE! Get ${event.discountPercent}% OFF on subscriptions right now!`,
                "SUCCESS",
              );
              localStorage.setItem(
                `last_event_promo_${user.id}_${event.eventName}`,
                now.toString(),
              );
              return;
            }
          }
        }
      }

      // 4. Global Free Access & Credit Free Event Popups
      if (settings?.isGlobalFreeMode) {
        const lastShown = parseInt(
          localStorage.getItem(`last_global_free_${user.id}`) || "0",
        );
        const interval = 4 * 60 * 60 * 1000; // Every 4 hours
        if (now - lastShown > interval) {
          addAppNotification(
            "Special Event",
            "🌟 GLOBAL FREE ACCESS IS LIVE! Enjoy everything for free!",
            "SUCCESS",
          );
          localStorage.setItem(`last_global_free_${user.id}`, now.toString());
          return;
        }
      }

      if (settings?.creditFreeEvent?.enabled) {
        const lastShown = parseInt(
          localStorage.getItem(`last_credit_free_${user.id}`) || "0",
        );
        const interval = 4 * 60 * 60 * 1000; // Every 4 hours
        if (now - lastShown > interval) {
          addAppNotification(
            "Special Event",
            "⚡ CREDIT FREE EVENT IS LIVE! Unlock content without using your coins!",
            "SUCCESS",
          );
          localStorage.setItem(`last_credit_free_${user.id}`, now.toString());
          return;
        }
      }

      // 5. Admin Custom Popups
      if (settings?.adminCustomPopups) {
        for (const popup of settings.adminCustomPopups) {
          if (popup.enabled) {
            // Check audience
            if (popup.showTo === "FREE" && user.isPremium) continue;
            if (popup.showTo === "PREMIUM" && !user.isPremium) continue;

            const popupId = `custom_popup_${popup.title ? popup.title.replace(/\s+/g, "_") : "unnamed"}`;
            const lastShown = parseInt(
              localStorage.getItem(`${popupId}_${user.id}`) || "0",
            );
            const interval = 4 * 60 * 60 * 1000; // 4 hours by default for custom popups

            if (now - lastShown > interval) {
              let popupMsg = popup.message;
              if (popup.copyableText) {
                popupMsg += `\n\nCode: ${popup.copyableText}`;
              }
              addAppNotification(popup.title || "Notice", popupMsg, "INFO");
              localStorage.setItem(`${popupId}_${user.id}`, now.toString());
              return; // Show one at a time
            }
          }
        }
      }
    };

    checkPopups(); // Check immediately on mount/update
    const timer = setInterval(checkPopups, 60000); // And every minute
    return () => clearInterval(timer);
  }, [
    user.isPremium,
    user.subscriptionEndDate,
    settings?.popupConfigs,
    settings?.specialDiscountEvent,
  ]);

  // CUSTOM ALERT STATE
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "SUCCESS" | "ERROR" | "INFO";
    title?: string;
    message: string;
  }>({ isOpen: false, type: "INFO", message: "" });
  const showAlert = (
    msg: string,
    type: "SUCCESS" | "ERROR" | "INFO" = "INFO",
    title?: string,
  ) => {
    setAlertConfig({ isOpen: true, type, title, message: msg });
  };

  // IN-APP NOTIFICATION HELPER
  // Pushes a notification into local store (shown on the Notifications page)
  // instead of opening a modal popup. Auto-dedupes within 4 hours.
  const addAppNotification = (
    title: string,
    message: string,
    type: "SUCCESS" | "ERROR" | "INFO" = "INFO",
  ) => {
    try {
      const key = `nst_app_notifications_${user.id}`;
      const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
      const now = Date.now();
      const dup = existing.find(
        (n: any) =>
          n.title === title &&
          n.message === message &&
          now - (n.timestamp || 0) < 4 * 60 * 60 * 1000,
      );
      if (dup) return;
      const id = `n_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const updated = [{ id, title, message, type, timestamp: now }, ...existing].slice(0, 100);
      localStorage.setItem(key, JSON.stringify(updated));
      setHasNewUpdate(true);
      window.dispatchEvent(new CustomEvent("nst_notification_added"));
    } catch (e) {
      console.error("addAppNotification failed", e);
    }
  };

  // NEW NOTIFICATION LOGIC
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  useEffect(() => {
    const q = query(ref(rtdb, "universal_updates"), limitToLast(1));
    const unsub = onValue(q, (snap) => {
      const data = snap.val();
      if (data) {
        const latest = Object.values(data)[0] as any;
        const lastRead = localStorage.getItem("nst_last_read_update") || "0";
        if (new Date(latest.timestamp).getTime() > Number(lastRead)) {
          setHasNewUpdate(true);
          const alertKey = `nst_update_alert_shown_${latest.id || latest.timestamp}`;
          if (!localStorage.getItem(alertKey)) {
            addAppNotification(
              "New Update",
              `New Content Available: ${latest.text}`,
              "INFO",
            );
            localStorage.setItem(alertKey, "true");
          }
        } else {
          // Don't override badge state from local notifications check
          try {
            const arr = JSON.parse(
              localStorage.getItem(`nst_app_notifications_${user.id}`) || "[]",
            );
            const lastReadLocal = Number(
              localStorage.getItem("nst_last_read_update") || "0",
            );
            const hasUnread = arr.some(
              (n: any) => (n.timestamp || 0) > lastReadLocal,
            );
            setHasNewUpdate(hasUnread);
          } catch {
            setHasNewUpdate(false);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Listen for new global chat messages → red dot on community button
  useEffect(() => {
    const lastOpenKey = `nst_chat_last_open_${user.id}`;
    const q = query(ref(rtdb, 'chat/universal'), limitToLast(1));
    const unsub = onValue(q, (snap) => {
      const data = snap.val();
      if (!data) return;
      const msgs = Object.values(data) as any[];
      if (!msgs.length) return;
      const latest = msgs[0] as any;
      const lastOpen = localStorage.getItem(lastOpenKey) || '';
      if (latest.userId !== user.id && latest.timestamp > lastOpen) {
        setChatUnread(true);
      }
    });
    return () => unsub();
  }, [user.id]);

  const [testAttempts, setTestAttempts] = useState<Record<string, any>>(
    JSON.parse(localStorage.getItem(`nst_test_attempts_${user.id}`) || "{}"),
  );
  const globalMessage = localStorage.getItem("nst_global_message");
  const [activeExternalApp, setActiveExternalApp] = useState<string | null>(
    null,
  );
  const [contentTypePref, setContentTypePref] = useState<
    "ALL" | "PDF" | "AUDIO" | "VIDEO"
  >(() => {
    const v = localStorage.getItem(`nst_content_type_pref_${user.id}`);
    return v === "PDF" || v === "AUDIO" || v === "VIDEO" ? v : "ALL";
  });
  useEffect(() => {
    localStorage.setItem(`nst_content_type_pref_${user.id}`, contentTypePref);
  }, [contentTypePref, user.id]);
  const [pendingApp, setPendingApp] = useState<{
    app: any;
    cost: number;
  } | null>(null);
  const [contentViewStep, setContentViewStep] = useState<
    "SUBJECTS" | "CHAPTERS" | "PLAYER"
  >("SUBJECTS");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedLessonForModal, setSelectedLessonForModal] =
    useState<Chapter | null>(null);
  const [syllabusMode, setSyllabusMode] = useState<"SCHOOL" | "COMPETITION">(
    "SCHOOL",
  );
  const [currentAudioTrack, setCurrentAudioTrack] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [universalNotes, setUniversalNotes] = useState<any[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | undefined>(undefined);
  const [initialParentSubject, setInitialParentSubject] = useState<
    string | null
  >(null);

  useEffect(() => {
    getChapterData("nst_universal_notes").then((data) => {
      if (data && data.notesPlaylist) setUniversalNotes(data.notesPlaylist);
    });
  }, []);

  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState({
    mobile: user.mobile || "",
    password: user.password || "",
  });
  const [profileData, setProfileData] = useState({
    classLevel: activeSessionClass || user.classLevel || "10",
    board: activeSessionBoard || user.board || "CBSE",
    stream: user.stream || "Science",
    newPassword: "",
    mobile: user.mobile || "",
    dailyGoalHours: 3,
  });
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showNameChangeModal, setShowNameChangeModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatUnread, setChatUnread] = useState(false);
  const [showMcqCommunityPopup, setShowMcqCommunityPopup] = useState(false);
  const [mcqCommunityDraft, setMcqCommunityDraft] = useState<{question: string; options: [string,string,string,string]; correctAnswer: number; explanation: string} | null>(null);
  const [lucentLessonsPage, setLucentLessonsPage] = useState(8);
  const [lucentLessonCompare, setLucentLessonCompare] = useState<LucentNoteEntry | null>(null);
  const [lucentLessonCompareTab, setLucentLessonCompareTab] = useState<'full' | 'topics'>('topics');
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [showExpiryPopup, setShowExpiryPopup] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [marksheetType, setMarksheetType] = useState<"MONTHLY" | "ANNUAL">(
    "MONTHLY",
  );
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const rotateFullscreenRef = useRef(false);
  const topBarScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = () => {
      if (rotateFullscreenRef.current) return;
      setIsDocFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  const [showAllNotesCatalog, setShowAllNotesCatalog] = useState<
    "PREMIUM" | "DEEP_DIVE" | "VIDEO" | "AUDIO" | false
  >(false);
  const [catalogChapterCounts, setCatalogChapterCounts] = useState<
    Record<string, number>
  >({});
  const [directActionTarget, setDirectActionTarget] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (showAllNotesCatalog) {
      const classes = ["6", "7", "8", "9", "10", "11", "12", "COMPETITION"];
      const board = activeSessionBoard || user.board || "CBSE";
      const stream = user.stream || "Science";
      const lang = board === "BSEB" ? "Hindi" : "English";
      const limit = pLimit(5);

      const tasks: Promise<void>[] = [];

      classes.forEach((cls) => {
        const subs = getSubjectsList(cls, stream, board).filter(
          (s) => !(settings?.hiddenSubjects || []).includes(s.id),
        );
        subs.forEach((sub) => {
          const key = `${cls}_${sub.id}`;
          // Skip if already fetched
          if (catalogChapterCounts[key] === undefined) {
            tasks.push(
              limit(async () => {
                try {
                  const data = await fetchChapters(
                    board,
                    cls,
                    stream,
                    sub,
                    lang,
                  );
                  setCatalogChapterCounts((prev) => ({
                    ...prev,
                    [key]: data.length,
                  }));
                } catch (e) {
                  setCatalogChapterCounts((prev) => ({ ...prev, [key]: 0 }));
                }
              }),
            );
          }
        });
      });

      Promise.all(tasks);
    }
  }, [
    showAllNotesCatalog,
    activeSessionBoard,
    user.board,
    user.stream,
    settings?.hiddenSubjects,
  ]);

  // Daily greeting disabled as requested by user

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeatureMatrix, setShowFeatureMatrix] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isTopBarHidden, setIsTopBarHidden] = useState(false);

  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;
    let isTouchingTopBar = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;

      // Ensure swipe only activates if it starts within the top banner area (roughly top 100px)
      const target = e.target as HTMLElement;
      isTouchingTopBar = !!target.closest("#top-banner-container");
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchingTopBar) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = touchStartY - currentY;
      const diffX = touchStartX - currentX;

      // Check if vertical swipe is dominant
      if (Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY > 40) {
          // Swiping up -> Hide top bar
          setIsTopBarHidden(true);
        } else if (diffY < -40) {
          // Swiping down -> Show top bar
          setIsTopBarHidden(false);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    // Auto-hide the global IIC/credits/Hey-Nadim top bar whenever the student
    // enters the chapter content PLAYER (PDF/MCQ/VIDEO/AUDIO). This gives the
    // notes view a true edge-to-edge Lucent/Sar-Sangrah feel — back button +
    // lesson title + Read All sit at the very top of the viewport instead of
    // being pushed below ~150px of dashboard chrome. Reset to visible the
    // moment we navigate elsewhere (back to syllabus list, home, etc).
    const inPlayer =
      contentViewStep === 'PLAYER' &&
      (activeTab === 'PDF' || activeTab === 'MCQ' || activeTab === 'VIDEO' || (activeTab as any) === 'AUDIO');
    setIsTopBarHidden(inPlayer);
  }, [activeTab, contentViewStep]);

  useEffect(() => {
    setFullScreen(true); // Always true to hide global header
  }, [activeTab, setFullScreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // Rotation ke liye fullscreen request hoti hai — uss waqt top bar
      // hide nahi karna. rotateFullscreenRef true hai toh skip karo.
      if (rotateFullscreenRef.current) return;
      setIsFullscreenMode(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const isNew =
      Date.now() - new Date(user.createdAt).getTime() < 10 * 60 * 1000;
    if (
      isNew &&
      !user.redeemedReferralCode &&
      !localStorage.getItem(`referral_shown_${user.id}`)
    ) {
      setShowReferralPopup(true);
      localStorage.setItem(`referral_shown_${user.id}`, "true");
    }
  }, [user.id, user.createdAt, user.redeemedReferralCode]);

  const handleSupportEmail = () => {
    const email = settings?.supportEmail || "nadiman0636indo@gmail.com";
    const subject = encodeURIComponent(
      `Support Request: ${user.name} (ID: ${user.id})`,
    );
    const body = encodeURIComponent(
      `Student Details:\nName: ${user.name}\nUID: ${user.id}\nEmail: ${user.email}\n\nIssue Description:\n`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({
    subject: "",
    topic: "",
    pageNo: "",
    type: "PDF" as 'PDF' | 'VIDEO' | 'MCQ' | 'NOTES' | 'ANY',
    note: "",
  });
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHomeworkHistory, setShowHomeworkHistory] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [appLang, setAppLangState] = useAppLang();
  const [isRotateEnabled, setIsRotateEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('nst_rotate_toggle') === '1'; } catch { return false; }
  });
  // Track real orientation so rotate button can show correct state
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    try { return window.matchMedia('(orientation: landscape)').matches; } catch { return false; }
  });
  const [isLandscapeUiHidden, setIsLandscapeUiHidden] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia('(orientation: landscape)');
      const handler = (e: MediaQueryListEvent) => {
        setIsLandscape(e.matches);
        // Always show top bar when orientation changes
        setIsTopBarHidden(false);
        // Reset landscape UI hidden state on orientation change
        setIsLandscapeUiHidden(false);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch {}
  }, []);
  const [homeworkSubjectView, setHomeworkSubjectView] = useState<string | null>(null);
  const [lucentCategoryView, setLucentCategoryView] = useState(false);
  // Which book is selected inside the Lucent category view (null = book-selection screen)
  const [selectedLucentBook, setSelectedLucentBook] = useState<string | null>(null);
  // Page-wise notes viewer for admin-added Lucent lessons
  const [lucentNoteViewer, setLucentNoteViewer] = useState<LucentNoteEntry | null>(null);
  const [lucentPageIndex, setLucentPageIndex] = useState(0);
  // Live scroll % for the Lucent reader — drives the gradient progress bar at
  // the very top, mirroring Sar Sangrah / Speedy. Reset on page change.
  const [lucentScrollProgress, setLucentScrollProgress] = useState(0);
  const lucentScrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the top bar button strip when admin enables it
  useEffect(() => {
    if (!settings?.topBarAutoScroll) return;
    const el = topBarScrollRef.current;
    if (!el) return;
    const stepMs = Math.max(1, settings?.topBarAutoScrollInterval ?? 3) * 1000;
    let dir = 1;
    const timer = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      if (dir > 0 && el.scrollLeft >= maxScroll - 2) dir = -1;
      else if (dir < 0 && el.scrollLeft <= 2) dir = 1;
      el.scrollBy({ left: dir * (el.clientWidth * 0.6), behavior: 'smooth' });
    }, stepMs);
    return () => clearInterval(timer);
  }, [settings?.topBarAutoScroll, settings?.topBarAutoScrollInterval]);

  // Reset scroll % whenever the user moves to a different Lucent page or
  // closes the viewer entirely.
  useEffect(() => { setLucentScrollProgress(0); }, [lucentPageIndex, lucentNoteViewer?.id]);
  // Local Auto-Read & Sync state for the Lucent viewer (mirrors LessonView pattern).
  // Initialised from settings.isAutoTtsEnabled but stays local to this view.
  const [lucentAutoSync, setLucentAutoSync] = useState<boolean>(!!settings?.isAutoTtsEnabled);
  // Smart Search in Lucent Notes
  const [lucentSearchActive, setLucentSearchActive] = useState(false);
  const [lucentSearchQuery, setLucentSearchQuery] = useState('');
  // Volume/Arrow key navigation for Lucent viewer
  useEffect(() => {
    if (!lucentNoteViewer) return;
    const handleVolumeKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const totalPgs = lucentNoteViewer.pages.length;
      const safeIdx = Math.min(Math.max(0, lucentPageIndex), Math.max(0, totalPgs - 1));
      if (e.keyCode === 175 || e.key === 'ArrowRight') {
        e.preventDefault();
        if (safeIdx < totalPgs - 1) setLucentPageIndex(safeIdx + 1);
      } else if (e.keyCode === 174 || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (safeIdx > 0) setLucentPageIndex(safeIdx - 1);
      }
    };
    document.addEventListener('keydown', handleVolumeKey);
    return () => document.removeEventListener('keydown', handleVolumeKey);
  }, [lucentNoteViewer, lucentPageIndex]);
  const [hwAnswers, setHwAnswers] = useState<Record<string, number>>({});

  // ---- COMPETITION CUSTOM MCQ HUB (admin + student created practice MCQs) ----
  const [showCompMcqHub, setShowCompMcqHub] = useState(false);
  const [compMcqTab, setCompMcqTab] = useState<'PRACTICE' | 'CREATE'>('PRACTICE');
  const [compMcqDraft, setCompMcqDraft] = useState<{ question: string; options: string[]; correctAnswer: number }>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  });
  const [compMcqIndex, setCompMcqIndex] = useState(0);
  const [compMcqSelected, setCompMcqSelected] = useState<number | null>(null);
  // Practice MCQ display mode: 'mcq' (interactive single-question) | 'qa' (all
  // questions Q&A reveal-on-tap, jaisa Homework Q&A mode hota hai). Flashcard
  // mode FlashcardMcqView overlay launch karta hai (same shared component).
  const [compMcqMode, setCompMcqMode] = useState<'mcq' | 'qa'>('mcq');
  // Per-question reveal state for Q&A mode (key = question index).
  const [compQaRevealed, setCompQaRevealed] = useState<Record<number, boolean>>({});

  // ---- PER-TAB STATE PRESERVATION ----
  // Each bottom-nav tab keeps its own snapshot of overlays/positions so the
  // student returns to exactly where they were when they tap that tab again.
  // Eg: creating an MCQ on Home → tap Profile → tap Home → MCQ creator restores.
  // Reading a homework note → tap GK → tap Homework → same note reopens.
  type LogicalTab = 'HOME' | 'HOMEWORK' | 'REVISION_V2' | 'GK' | 'VIDEO' | 'PROFILE' | 'APP_STORE' | 'HISTORY';
  const [currentLogicalTab, setCurrentLogicalTab] = useState<LogicalTab>('HOME');

  // ── MY MISTAKE COUNT (lightweight: synced via storage event + 30s poll) ──
  const [mistakeCount, setMistakeCount] = useState<number>(() => getMistakeBankSync().length);
  useEffect(() => {
    const refresh = () => setMistakeCount(getMistakeBankSync().length);
    refresh();
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === 'nst_mistake_bank_v1') refresh(); };
    window.addEventListener('storage', onStorage);
    const t = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener('storage', onStorage); window.clearInterval(t); };
  }, []);
  const [tabSnapshots, setTabSnapshots] = useState<Record<string, any>>({});
  // Last-read line index per homework note id (for tap-to-resume after tab switch).
  const [hwNotePositions, setHwNotePositions] = useState<Record<string, number>>({});

  // ---- HOMEWORK HIERARCHY (Year → Month → Week → Day → Note) ----
  const [hwYear, setHwYear] = useState<number | null>(null);
  const [hwMonth, setHwMonth] = useState<number | null>(null);
  const [hwWeek, setHwWeek] = useState<number | null>(null);
  // For page-wise book subjects (Sar Sangrah / Speedy / Custom Books) student
  // can toggle between flat page-number list ("page") and date-based hierarchy
  // ("date"). Default = page (because home subject card opens the book view).
  const [hwBookViewMode, setHwBookViewMode] = useState<'page' | 'date'>('page');
  // Optional Year / Month filter on the page-wise list. null = show all.
  const [bookFilterYear, setBookFilterYear] = useState<number | null>(null);
  const [bookFilterMonth, setBookFilterMonth] = useState<number | null>(null);
  const [hwActiveHwId, setHwActiveHwId] = useState<string | null>(null);
  // Notes/MCQ split view: 'choose' shows a chooser overlay, 'notes' shows notes (with optional MCQ switch button),
  // 'mcq' shows MCQ-only view. Defaults to 'notes' when only notes exist, 'mcq' when only MCQ.
  const [hwViewMode, setHwViewMode] = useState<'notes' | 'mcq' | 'choose'>('notes');
  const [hwActivePdf, setHwActivePdf] = useState<string | null>(null);
  const [hwAudioVisible, setHwAudioVisible] = useState(false);
  const [hwVideoVisible, setHwVideoVisible] = useState(false);

  // --- NOTIFICATION STATE ---
  const [seenNotifIds, setSeenNotifIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nst_seen_notifs_v1') || '[]'); } catch { return []; }
  });
  const [claimedNotifIds, setClaimedNotifIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nst_claimed_notifs_v1') || '[]'); } catch { return []; }
  });
  const [notifToast, setNotifToast] = useState<AppNotification | null>(null);
  const [showNotifPage, setShowNotifPage] = useState(false);

  // --- SAVED/STARRED NOTES STATE ---
  // Note source metadata — used to power the "By Book" grouping view AND the
  // tap-to-open-full-notes flow. All fields are optional for backwards-compat
  // with older starred entries (which won't have any source).
  type StarredNoteSource = {
    kind?: 'lucent' | 'homework' | 'community';
    lucentId?: string;
    pageIndex?: number;
    pageNo?: string | number;
    lessonTitle?: string;
    subject?: string;
    hwId?: string;
  };
  type StarredNote = {
    id: string;
    noteKey: string;
    topicText: string;
    savedAt: string;
    source?: StarredNoteSource;
  };
  const [starredNotes, setStarredNotes] = useState<StarredNote[]>(() => {
    try { return JSON.parse(localStorage.getItem('nst_starred_notes_v1') || '[]'); } catch { return []; }
  });
  const [showStarredPage, setShowStarredPage] = useState(false);
  // 2-category view toggle for the Important Notes pages: 'list' = original
  // flat list, 'bybook' = grouped by source book / page.
  const [importantNotesView, setImportantNotesView] = useState<'list' | 'bybook'>('list');
  // Drill-down state for the "By Book / Page" view: select a book to see its
  // pages, then select a page to see only that page's important notes
  // arranged in order. Reset whenever view/tab changes.
  const [drillBookKey, setDrillBookKey] = useState<string | null>(null);
  const [drillPageKey, setDrillPageKey] = useState<string | null>(null);
  // Book filter chip selected in List View (null = All books)
  const [listViewBookFilter, setListViewBookFilter] = useState<string | null>(null);
  useEffect(() => { setDrillBookKey(null); setDrillPageKey(null); setListViewBookFilter(null); }, [importantNotesView]);
  // Confirmation popup before opening full notes from an Important-Note tap.
  const [openNotePrompt, setOpenNotePrompt] = useState<{
    topicText: string;
    source?: StarredNoteSource;
  } | null>(null);
  // -- Profile Starred Notes: search + TTS state (mirrors HistoryPage STARRED tab) --
  const [profileStarSearch, setProfileStarSearch] = useState('');
  // MCQ matches that ALSO contain the search term — surfaced below the
  // notes list so users can find a question they remember by a single word
  // even if it's not in any starred note.
  const [profileStarMcqHits, setProfileStarMcqHits] = useState<import('../utils/mcqSearcher').McqSearchHit[]>([]);
  const [profileStarMcqLoading, setProfileStarMcqLoading] = useState(false);
  const [isReadingProfileStars, setIsReadingProfileStars] = useState(false);
  const [readingProfileStarIdx, setReadingProfileStarIdx] = useState<number | null>(null);
  const isReadingProfileStarsRef = useRef(false);
  const playProfileStarFromRef = useRef<((notes: any[], idx: number) => void) | undefined>(undefined);
  playProfileStarFromRef.current = (notes: any[], idx: number) => {
    if (!isReadingProfileStarsRef.current || idx >= notes.length) {
      isReadingProfileStarsRef.current = false;
      setIsReadingProfileStars(false);
      setReadingProfileStarIdx(null);
      return;
    }
    setReadingProfileStarIdx(idx);
    speakText(
      notes[idx].topicText,
      undefined,
      1.0,
      'hi-IN',
      undefined,
      () => { if (isReadingProfileStarsRef.current) playProfileStarFromRef.current?.(notes, idx + 1); }
    );
  };
  const startProfileStarRead = (notes: any[]) => {
    if (notes.length === 0) return;
    stopSpeech();
    isReadingProfileStarsRef.current = true;
    setIsReadingProfileStars(true);
    setReadingProfileStarIdx(null);
    setTimeout(() => playProfileStarFromRef.current?.(notes, 0), 80);
  };
  const stopProfileStarRead = () => {
    isReadingProfileStarsRef.current = false;
    setIsReadingProfileStars(false);
    setReadingProfileStarIdx(null);
    stopSpeech();
  };
  // Stop profile star TTS if user closes the page
  useEffect(() => {
    if (!showStarredPage) stopProfileStarRead();
  }, [showStarredPage]);

  // -- Lucent Page-wise MCQ tab state --
  const [lucentActiveTab, setLucentActiveTab] = useState<'NOTES' | 'MCQS'>('NOTES');
  const [lucentMcqsByPage, setLucentMcqsByPage] = useState<Record<string, MCQItem[]>>({});
  const [lucentMcqLoading, setLucentMcqLoading] = useState(false);
  const [lucentMcqRevealed, setLucentMcqRevealed] = useState<Record<string, number>>({});
  // T2/T3: per-page Lucent + per-hw Sar Sangrah/Speedy MCQ display mode toggle.
  // 'reveal' = direct-answer "show answer" flow; 'interactive' = build-answer quiz flow.
  const [lucentMcqMode, setLucentMcqMode] = useState<Record<string, 'reveal' | 'interactive'>>({});
  // Flashcard launcher (Lucent + Homework MCQs share this single overlay)
  const [flashcardMcqs, setFlashcardMcqs] = useState<{ items: any[]; title: string; subtitle: string; subject?: string } | null>(null);
  const [hwMcqMode, setHwMcqMode] = useState<Record<string, 'interactive' | 'reveal'>>({});
  // Per-question selected option for Lucent interactive-mode MCQs (key = `${pageKey}_${qi}`)
  const [lucentMcqAnswers, setLucentMcqAnswers] = useState<Record<string, number>>({});
  // Reset MCQ tab when page or note changes
  useEffect(() => { setLucentActiveTab('NOTES'); }, [lucentPageIndex, lucentNoteViewer?.id]);
  const [hwScrollProgress, setHwScrollProgress] = useState(0);
  const hwScrollContainerRef = useRef<HTMLDivElement>(null);
  const hwScrollSaveTimerRef = useRef<number | null>(null);
  const hwScrollRestoredRef = useRef(false);
  // Resume reading lists
  const [recentChapters, setRecentChapters] = useState<RecentChapterEntry[]>([]);
  const [recentHw, setRecentHw] = useState<RecentHwEntry[]>([]);
  const [recentLucent, setRecentLucent] = useState<RecentLucentEntry[]>([]);
  const [homeResumeFilter, setHomeResumeFilter] = useState<'all' | 'chapter' | 'sarSangrah' | 'speedy' | 'mcq' | 'lucent'>('all');
  const [showHomeSearch, setShowHomeSearch] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [homeSearchMode, setHomeSearchMode] = useState<'search' | 'compare'>('search');
  const [showTopicDirectory, setShowTopicDirectory] = useState(false);
  const [compareQuery, setCompareQuery] = useState('');
  // Snapshot of hits frozen at the moment the user clicks "Compare" — avoids
  // the race where clearing homeSearchQuery empties chapterNoteHits BEFORE
  // CompareView mounts (which needs hits.length > 1 to render).
  const [compareHits, setCompareHits] = useState<NoteSearchResult[]>([]);
  // Max books per Compare session based on subscription tier.
  // 0 means unlimited. Admin can override via settings.compareLimitXxx.
  const compareMaxBooks: number = (() => {
    if (!user.isPremium) return settings?.compareLimitFree ?? 2;
    if (user.subscriptionLevel === 'ULTRA') return settings?.compareLimitUltra ?? 0;
    return settings?.compareLimitBasic ?? 5;
  })();
  // Chapter-notes search results — yeh Class 6-12 (aur Competition) ke
  // locally-cached chapter notes (Concept / Retention / Teaching Strategy /
  // deep dives) mein word-match karta hai. Pehle search bar sirf chapter
  // titles & subject names mein dhoondhta tha — ab agar koi word kisi bhi
  // padhe hue chapter ke notes ke andar bhi ho, woh bhi result mein aata hai.
  const [chapterNoteHits, setChapterNoteHits] = useState<NoteSearchResult[]>([]);
  const [chapterNoteHitsLoading, setChapterNoteHitsLoading] = useState(false);
  // Class 6-12 chapter title hits for "Title se Compare"
  const [chapterTitleHits, setChapterTitleHits] = useState<NoteSearchResult[]>([]);
  const [showCompareView, setShowCompareView] = useState(false);
  const [showMcqSearchView, setShowMcqSearchView] = useState(false);
  const [mcqSearchInitialQuery, setMcqSearchInitialQuery] = useState('');
  const [chapterMcqHits, setChapterMcqHits] = useState<import('../utils/mcqSearcher').McqSearchHit[]>([]);
  const [chapterMcqHitsLoading, setChapterMcqHitsLoading] = useState(false);
  // Debounced effect — 250ms wait so we don't thrash the indexedDB scan
  // while the user is still typing.
  useEffect(() => {
    const q = homeSearchQuery.trim();
    if (!q || q.length < 2) {
      setChapterNoteHits([]);
      setChapterNoteHitsLoading(false);
      setChapterMcqHits([]);
      setChapterMcqHitsLoading(false);
      return;
    }
    let cancelled = false;
    setChapterNoteHitsLoading(true);
    setChapterMcqHitsLoading(true);
    setChapterTitleHits([]);
    const t = setTimeout(async () => {
      try {
        const words = q.split(/\s+/).filter(w => w.length >= 2);
        const effectiveWords = words.length ? words : [q];
        const [noteResults, mcqResults, titleResults] = await Promise.all([
          searchNotesByWords(effectiveWords, 50),
          import('../utils/mcqSearcher').then(m => m.searchMcqsByWords(effectiveWords, 20)),
          searchNotesByTitle(effectiveWords, 30),
        ]);
        if (!cancelled) {
          setChapterNoteHits(noteResults);
          setChapterMcqHits(mcqResults);
          setChapterTitleHits(titleResults);
        }
      } catch {
        if (!cancelled) {
          setChapterNoteHits([]);
          setChapterMcqHits([]);
          setChapterTitleHits([]);
        }
      } finally {
        if (!cancelled) {
          setChapterNoteHitsLoading(false);
          setChapterMcqHitsLoading(false);
        }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [homeSearchQuery]);
  // Synchronous search over page-wise competition books (Sar Sangrah, Speedy
  // Science, Speedy Social Science, and any custom books) stored in
  // settings.homework. Returns NoteSearchResult[] so they can merge directly
  // into chapterNoteHits for the Compare view.
  const HW_BOOK_META: Record<string, { label: string; emoji: string; color: string; border: string; chip: string; chipText: string }> = {
    sarSangrah:          { label: 'Sar Sangrah',          emoji: '📕', color: 'bg-rose-100',   border: 'border-rose-200',   chip: 'bg-rose-100',   chipText: 'text-rose-700' },
    speedyScience:       { label: 'Speedy Science',       emoji: '🔬', color: 'bg-blue-100',   border: 'border-blue-200',   chip: 'bg-blue-100',   chipText: 'text-blue-700' },
    speedySocialScience: { label: 'Speedy Social Science', emoji: '🌏', color: 'bg-orange-100', border: 'border-orange-200', chip: 'bg-orange-100', chipText: 'text-orange-700' },
  };
  const hwBookHits = React.useMemo<import('../utils/noteSearcher').NoteSearchResult[]>(() => {
    const q = homeSearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    const effectiveWords = words.length ? words : [q];
    const allHw = (settings?.homework || []) as import('../types').HomeworkItem[];
    const customBooks = (settings?.customBooks || []) as Array<{ id: string; name: string }>;
    const customBookIds = customBooks.map(b => b.id);
    const allBookIds = Object.keys(HW_BOOK_META).concat(customBookIds);
    const results: import('../utils/noteSearcher').NoteSearchResult[] = [];
    allBookIds.forEach(bookId => {
      // Prefer the display name from settings.customBooks for custom books
      const customName = customBooks.find(b => b.id === bookId)?.name;
      const meta = HW_BOOK_META[bookId] || { label: customName || bookId, emoji: '📖', color: 'bg-slate-100', border: 'border-slate-200', chip: 'bg-slate-100', chipText: 'text-slate-700' };
      const displayLabel = HW_BOOK_META[bookId] ? meta.label : (customName || bookId);
      const bookItems = allHw.filter((hw: any) => hw.targetSubject === bookId && hw.notes?.trim());
      bookItems.forEach((hw: any) => {
        const plainText = stripHtml(hw.notes || '');
        const text = plainText.toLowerCase();
        const titleText = (hw.title || '').toLowerCase();
        const matchedWords = effectiveWords.filter(w => text.includes(w) || titleText.includes(w));
        if (matchedWords.length === 0) return;
        const idx = text.indexOf(effectiveWords[0]);
        const start = Math.max(0, idx - 30);
        const snippet = idx >= 0 ? plainText.substring(start, start + 150) : plainText.substring(0, 150);
        results.push({
          storageKey: `hw_${hw.id}`,
          chapterId: hw.id,
          subjectName: displayLabel,
          board: 'COMPETITION',
          classLevel: 'COMPETITION',
          noteTitle: hw.title || `Page ${hw.pageNo || '?'}`,
          noteContent: snippet,
          noteFullContent: plainText,
          matchCount: matchedWords.length,
          matchedWords,
          chapterTitleFromKey: hw.title || `Page ${hw.pageNo || '?'}`,
          bookName: displayLabel,
          pageNo: hw.pageNo,
          topicName: hw.topicName,
        });
      });
    });
    return results.sort((a, b) => b.matchCount - a.matchCount).slice(0, 30);
  }, [homeSearchQuery, settings?.homework, settings?.customBooks]);

  // Lucent page-wise notes → NoteSearchResult[] for Compare mode.
  // Deduplicates by lessonTitle + pageNo so the same lesson stored under
  // multiple subjects never appears twice.
  const lucentCompareHits = React.useMemo<import('../utils/noteSearcher').NoteSearchResult[]>(() => {
    const q = homeSearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    const effectiveWords = words.length ? words : [q];
    const seen = new Set<string>();
    const results: import('../utils/noteSearcher').NoteSearchResult[] = [];
    ((settings?.lucentNotes || []) as LucentNoteEntry[]).forEach(entry => {
      (entry.pages || []).forEach((pg, pi) => {
        const dedupeKey = `${(entry.lessonTitle || '').toLowerCase()}_${pg.pageNo}`;
        if (seen.has(dedupeKey)) return;
        const text = stripHtml(pg.content || '').toLowerCase();
        const titleHit = entry.lessonTitle?.toLowerCase().includes(q);
        if (!text.includes(q) && !titleHit) return;
        const matchedWords = effectiveWords.filter(w => text.includes(w) || entry.lessonTitle?.toLowerCase().includes(w));
        if (matchedWords.length === 0) return;
        seen.add(dedupeKey);
        const idx = text.indexOf(effectiveWords[0]);
        const start = Math.max(0, idx - 30);
        const snippet = idx >= 0 ? stripHtml(pg.content).substring(start, start + 150) : stripHtml(pg.content).substring(0, 150);
        results.push({
          storageKey: `lucent_${entry.id}_${pi}`,
          chapterId: entry.id,
          subjectName: entry.subject || 'lucent',
          board: 'COMPETITION',
          classLevel: 'COMPETITION',
          noteTitle: entry.lessonTitle,
          noteContent: snippet,
          noteFullContent: stripHtml(pg.content || ''),
          matchCount: matchedWords.length,
          matchedWords,
          chapterTitleFromKey: entry.lessonTitle,
          bookName: entry.bookName?.trim() || 'Lucent GK',
          pageNo: pg.pageNo,
          topicName: pg.topicName,
        });
      });
    });
    return results.sort((a, b) => b.matchCount - a.matchCount);
  }, [homeSearchQuery, settings?.lucentNotes]);

  // Title-based compare — finds notes from all books where the NOTE TITLE
  // matches the search query (not content). Lets students compare same-topic
  // notes across books even if the content words differ.
  const titleBasedHits = React.useMemo<import('../utils/noteSearcher').NoteSearchResult[]>(() => {
    const q = homeSearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    const effectiveWords = words.length ? words : [q];
    const results: import('../utils/noteSearcher').NoteSearchResult[] = [];

    // Homework book items — match by title
    const allHw = (settings?.homework || []) as import('../types').HomeworkItem[];
    const customBooks = (settings?.customBooks || []) as Array<{ id: string; name: string }>;
    const customBookIds = customBooks.map(b => b.id);
    const allBookIds = Object.keys(HW_BOOK_META).concat(customBookIds);

    allBookIds.forEach(bookId => {
      const meta = (HW_BOOK_META as Record<string, { label: string; emoji: string }>)[bookId];
      const customBook = customBooks.find(b => b.id === bookId);
      const displayLabel = meta ? `${meta.emoji} ${meta.label}` : (customBook?.name || bookId);

      const bookItems = allHw.filter((hw: any) => hw.targetSubject === bookId && hw.notes?.trim());
      bookItems.forEach((hw: any) => {
        const titleText = (hw.title || '').toLowerCase();
        const matchedWords = effectiveWords.filter(w => titleText.includes(w));
        if (matchedWords.length === 0) return;
        const plainText = stripHtml(hw.notes || '');
        results.push({
          storageKey: `hw_${hw.id}`,
          chapterId: hw.id,
          subjectName: displayLabel,
          board: 'COMPETITION',
          classLevel: 'COMPETITION',
          noteTitle: hw.title || `Page ${hw.pageNo || '?'}`,
          noteContent: plainText.substring(0, 150),
          noteFullContent: plainText,
          matchCount: matchedWords.length,
          matchedWords,
          chapterTitleFromKey: hw.title || `Page ${hw.pageNo || '?'}`,
          bookName: displayLabel,
          pageNo: hw.pageNo,
        });
      });
    });

    // Lucent notes — match by lessonTitle
    ((settings?.lucentNotes || []) as LucentNoteEntry[]).forEach(entry => {
      const titleText = (entry.lessonTitle || '').toLowerCase();
      const matchedWords = effectiveWords.filter(w => titleText.includes(w));
      if (matchedWords.length === 0) return;
      (entry.pages || []).forEach((pg: any, pi: number) => {
        const fullText = stripHtml(pg.content || '');
        results.push({
          storageKey: `lucent_${entry.id}_${pi}`,
          chapterId: entry.id,
          subjectName: entry.subject || 'lucent',
          board: 'COMPETITION',
          classLevel: 'COMPETITION',
          noteTitle: entry.lessonTitle,
          noteContent: fullText.substring(0, 150),
          noteFullContent: fullText,
          matchCount: matchedWords.length,
          matchedWords,
          chapterTitleFromKey: entry.lessonTitle,
          bookName: entry.bookName?.trim() || 'Lucent GK',
          pageNo: pg.pageNo,
          topicName: pg.topicName,
        });
      });
    });

    return results.sort((a, b) => b.matchCount - a.matchCount);
  }, [homeSearchQuery, settings?.homework, settings?.lucentNotes, settings?.customBooks]);

  // When the user clicks a search result, we stash the query here so the
  // ChunkedNotesReader on the next screen (Lucent / Homework notes) can find
  // the matching topic and auto-read from that exact line. Cleared shortly
  // after so re-visits don't keep auto-reading.
  const [pendingReadQuery, setPendingReadQuery] = useState<string>('');
  useEffect(() => {
    if (!pendingReadQuery) return;
    const t = setTimeout(() => setPendingReadQuery(''), 1500);
    return () => clearTimeout(t);
  }, [pendingReadQuery]);

  // Run an MCQ search whenever the Important Notes search input changes.
  // 250ms debounce to avoid hammering storage on every keystroke; tokenises
  // on whitespace so multi-word queries ("yamuna river") work.
  useEffect(() => {
    const q = profileStarSearch.trim();
    if (!q || q.length < 2) {
      setProfileStarMcqHits([]);
      setProfileStarMcqLoading(false);
      return;
    }
    let cancelled = false;
    setProfileStarMcqLoading(true);
    const handle = setTimeout(async () => {
      try {
        const { searchMcqsByWords } = await import('../utils/mcqSearcher');
        const words = q.split(/\s+/).filter(w => w.length >= 2);
        const hits = await searchMcqsByWords(words, 25);
        if (!cancelled) setProfileStarMcqHits(hits);
      } catch {
        if (!cancelled) setProfileStarMcqHits([]);
      } finally {
        if (!cancelled) setProfileStarMcqLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [profileStarSearch]);

  // Global "social proof" counts for Important Notes — top 200 most-saved
  // topics across all students. Backed by Firebase Realtime DB at
  // `note_stars/{topicHash}`. Used to show "⭐ N students saved this" badges
  // and to power the community "Most Saved" leaderboard.
  const [globalNoteStars, setGlobalNoteStars] = useState<Record<string, NoteStarEntry>>({});
  const [showCommunityStarsPage, setShowCommunityStarsPage] = useState(false);
  const [starredPageTab, setStarredPageTab] = useState<'mine' | 'global'>('mine');
  useEffect(() => { setListViewBookFilter(null); }, [starredPageTab]);
  const [globalNotesRange, setGlobalNotesRange] = useState<'all' | 'monthly' | 'weekly'>('all');
  useEffect(() => {
    const unsub = subscribeToTopNoteStars(200, setGlobalNoteStars);
    return () => { try { unsub(); } catch {} };
  }, []);
  // One-time backfill: pehle ek bug ki wajah se kuch starred notes RTDB me
  // register nahi ho paaye the (pehla `set('users/$uid', true)` rule fail kar
  // raha tha aur Global tab khaali dikhta tha). Ab login ke baad ek baar
  // saare local starred notes ko Firebase me re-record kar dete hain taaki
  // user ka existing data Global tab me show ho jaaye.
  const didBackfillStarsRef = useRef(false);
  useEffect(() => {
    if (!user?.id || didBackfillStarsRef.current) return;
    if (!Array.isArray(starredNotes) || starredNotes.length === 0) return;
    didBackfillStarsRef.current = true;
    (async () => {
      for (const n of starredNotes) {
        if (!n?.topicText) continue;
        try {
          await recordNoteStar(user.id, n.noteKey || `local_${n.id}`, n.topicText, n.source ? {
            lessonTitle: n.source.lessonTitle,
            subject: n.source.subject,
            pageNo: n.source.pageNo as any,
            pageIndex: n.source.pageIndex as any,
          } : undefined);
        } catch {}
      }
    })();
  }, [user?.id, starredNotes]);
  // Admin-controlled "social proof" inflation. When admin sets these in
  // System Settings, displayed ⭐ counts show actual+boost (and at least
  // `min`). Real DB values are unchanged — this is purely a display layer.
  // If max > min, each note gets a DIFFERENT boost in [min, max] seeded by
  // its own hash — stable across renders, but varied across notes (so it
  // doesn't look like every note magically got the same +N). 200, 500,
  // 11901... har note ka apna number.
  const fakeStarBoost = Math.max(0, Math.floor(Number(settings?.globalNotesFakeBoost) || 0));
  const fakeStarBoostMax = Math.max(0, Math.floor(Number(settings?.globalNotesFakeBoostMax) || 0));
  const fakeStarMin = Math.max(0, Math.floor(Number(settings?.globalNotesFakeMin) || 0));
  // djb2-style positive 32-bit hash → mapped to [0, 1) for deterministic per-note variation.
  const seedRand = useCallback((seed: string): number => {
    if (!seed) return 0;
    let h = 5381;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 33) ^ seed.charCodeAt(i);
    }
    return ((h >>> 0) % 1000003) / 1000003;
  }, []);
  const applyStarBoost = useCallback((rawCount: number, seed?: string): number => {
    const base = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (base <= 0 && fakeStarBoost <= 0 && fakeStarMin <= 0) return 0;
    let perNoteBoost = fakeStarBoost;
    // Vary per-note when admin set a wider range. We mix the per-note seed
    // with a slow-moving time bucket (changes every ~6 hours) so the same
    // note shows DIFFERENT counts at different times — kabhi 200, kabhi 500,
    // kabhi 11901 — making it look like organic activity instead of a
    // suspicious flat boost. Without a seed we still fall back to flat boost.
    if (fakeStarBoostMax > fakeStarBoost && seed) {
      const timeBucket = Math.floor(Date.now() / (6 * 60 * 60 * 1000)); // 6-hour window
      const r = seedRand(seed + ':' + timeBucket);
      perNoteBoost = fakeStarBoost + Math.floor(r * (fakeStarBoostMax - fakeStarBoost + 1));
    } else if (fakeStarBoostMax > fakeStarBoost) {
      perNoteBoost = fakeStarBoost; // no seed → use min end
    }
    const boosted = base + perNoteBoost;
    return Math.max(boosted, fakeStarMin);
  }, [fakeStarBoost, fakeStarBoostMax, fakeStarMin, seedRand]);
  const getNoteStarCount = useCallback((topicText: string): number => {
    if (!topicText) return 0;
    const h = hashTopic(topicText);
    const raw = globalNoteStars[h]?.count || 0;
    return applyStarBoost(raw, h);
  }, [globalNoteStars, applyStarBoost]);
  const [readingStreak, setReadingStreak] = useState<StreakInfo>({ current: 0, longest: 0, readToday: false });
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [streakHistoryView, setStreakHistoryView] = useState(false);
  const [showLifetimePopup, setShowLifetimePopup] = useState(false);
  const [lifetimeQuoteIdx, setLifetimeQuoteIdx] = useState(0);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const [premiumQuoteIdx, setPremiumQuoteIdx] = useState(0);
  // When the user taps a "Today" subject banner card with multiple items, this picker shows the list.
  const [hwTodayPickerSub, setHwTodayPickerSub] = useState<string | null>(null);
  // True when the active homework was opened directly from the Homework page (today banner / today picker).
  // In that case, Back should jump straight back to the Homework page (not into the Year/Month hierarchy).
  const [hwOpenedDirect, setHwOpenedDirect] = useState<boolean>(false);
  // Where to send the user when they press Back from a directly-opened homework note.
  // 'HOMEWORK' (default) returns to the Homework history page.
  // 'HOME' returns to the Home tab — used when the note was opened from a Continue Reading
  // card on Home, so empty/quick exits don't dump the user on the Homework tab.
  const [hwOpenedFrom, setHwOpenedFrom] = useState<'HOMEWORK' | 'HOME'>('HOMEWORK');
  // Same idea for chapter content (PDF / Video / Audio / MCQ players): if the chapter
  // was opened from a Continue Reading card on Home, Back from the player should return
  // straight to Home — not to the chapter list inside Courses.
  const [chapterOpenedFrom, setChapterOpenedFrom] = useState<'COURSES' | 'HOME'>('COURSES');
  // Per-tab ripple counter: incremented on tap of any non-HOME bottom-nav tab,
  // forces a remount of the ripple <span> so its CSS animation re-fires.
  // We deliberately skip HOME so the home tab feels clean and minimal.
  const [navTapKeys, setNavTapKeys] = useState<Record<string, number>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // ---- HOMEWORK MCQ FULL-SCREEN PLAYER STATE ----
  const [homeworkPlayerHwId, setHomeworkPlayerHwId] = useState<string | null>(null);
  const [playerCurrentIndex, setPlayerCurrentIndex] = useState<number>(0);
  const [playerIsReadingAll, setPlayerIsReadingAll] = useState<boolean>(false);
  const [playerRevealAll, setPlayerRevealAll] = useState<boolean>(true);
  // 3-mode selector for the Homework MCQ Player (📝 MCQ · 💬 Q&A · 🃏 Flashcard).
  // - 'mcq': all answers visible (current default)
  // - 'qa':  answers hidden, per-question tap-to-reveal
  // - 'flashcard' is not a persistent mode — it just launches the FlashcardMcqView overlay.
  const [playerMode, setPlayerMode] = useState<'mcq' | 'qa'>('mcq');
  const [playerQaRevealed, setPlayerQaRevealed] = useState<Record<number, boolean>>({});
  // Tracks the option index a student picked for each MCQ chunk in 'mcq'
  // (interactive) mode — same UX as Lucent / Speedy / Sar Sangrah MCQ tab.
  // Key = chunk index (idx) in playerChunks; value = chosen option index.
  const [playerMcqAnswers, setPlayerMcqAnswers] = useState<Record<number, number>>({});
  const playerScrollRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const playerIsReadingAllRef = React.useRef<boolean>(false);
  React.useEffect(() => { playerIsReadingAllRef.current = playerIsReadingAll; }, [playerIsReadingAll]);

  // Refresh "Resume reading" lists and streak when navigation context changes
  React.useEffect(() => {
    setRecentChapters(getRecentChapters());
    setRecentHw(getRecentHomeworks());
    setRecentLucent(getRecentLucent());
    setReadingStreak(getReadingStreak());
  }, [activeTab, showHomeworkHistory, hwActiveHwId, contentViewStep]);

  // Open a previously-read chapter (from "Resume reading" card on Home).
  // IMPORTANT: We MUST restore the class + board the chapter was originally
  // saved under, otherwise PdfView will fetch its content using the user's
  // *current* class/board and find nothing — i.e. the bug where Continue
  // Reading for a class-7 chapter showed "0 SECTIONS / No Deep Dive content
  // available" because PdfView re-keyed the fetch with class-10 (the user's
  // default). The saved entry already has both fields, we just weren't using
  // them.
  const openRecentChapter = (entry: RecentChapterEntry) => {
    // Restore the saved class/board context FIRST so the downstream PdfView
    // useEffect (which depends on classLevel + board) refetches with the
    // correct key as soon as it mounts.
    if (entry.classLevel) {
      setActiveSessionClass(entry.classLevel as any);
    }
    if (entry.board === 'CBSE' || entry.board === 'BSEB') {
      setActiveSessionBoard(entry.board);
    }
    // Seed PdfView's per-chapter scroll cache from the entry's saved scrollY
    // so the user lands back on the exact paragraph they stopped at — even
    // if localStorage was cleared on this device but the recent-reads list
    // is still intact (e.g. PWA cache wipe). PdfView's restore effect
    // reads this same key on mount and retries via ResizeObserver until the
    // content is tall enough to honour the saved position.
    try {
      if (entry.chapter?.id && typeof entry.scrollY === 'number' && entry.scrollY > 20) {
        const k = `nst_chapter_scroll_${entry.chapter.id}`;
        const existing = parseInt(localStorage.getItem(k) || '0', 10) || 0;
        // Only overwrite when the entry's saved position is more recent /
        // further than what's already cached, so we don't accidentally
        // rewind the user past a more-recent local read.
        if (entry.scrollY > existing) {
          localStorage.setItem(k, String(Math.round(entry.scrollY)));
        }
      }
    } catch {}
    setSelectedSubject(entry.subject as any);
    setSelectedChapter(entry.chapter);
    setContentViewStep('PLAYER');
    // Remember that this chapter came from Home so Back returns there.
    setChapterOpenedFrom(currentLogicalTab === 'HOME' ? 'HOME' : 'COURSES');
    onTabChange((entry.contentType || 'PDF') as any);
    setFullScreen(true);
  };

  // Open a chapter that came from a chapter-notes search hit. The hit only
  // gives us board/class/subjectName/chapterId — we need the full Subject
  // and Chapter objects to drive the player. We resolve the Subject from
  // the static syllabus list by name match (case-insensitive, also tries
  // hyphen-variants), then call fetchChapters to obtain the Chapter object,
  // and finally hand off to openRecentChapter so the existing resume +
  // navigation pipeline kicks in.
  const openChapterFromNoteHit = async (hit: NoteSearchResult) => {
    try {
      const board = (hit.board === 'BSEB' ? 'BSEB' : 'CBSE') as 'CBSE' | 'BSEB';
      const cls = hit.classLevel;
      const stream = (user.stream || 'Science') as any;
      // Resolve subject by name. Try exact (case-insensitive) match first,
      // then a normalised match that ignores hyphens / extra whitespace.
      const subs = getSubjectsList(cls, stream, board);
      const wanted = (hit.subjectName || '').toLowerCase().replace(/[-\s]+/g, ' ').trim();
      let subj = subs.find(s => s.name.toLowerCase() === hit.subjectName?.toLowerCase());
      if (!subj) {
        subj = subs.find(s => s.name.toLowerCase().replace(/[-\s]+/g, ' ').trim() === wanted);
      }
      if (!subj) {
        showAlert('Iss chapter ka subject is class mein available nahi hai.', 'ERROR');
        return;
      }
      const lang = (user.preferredLanguage || 'English') as any;
      const chapters = await fetchChapters(board, cls as any, stream, subj, lang);
      const chapter = chapters.find(c => c.id === hit.chapterId);
      if (!chapter) {
        showAlert('Chapter milana mushkil hai. Shayad syllabus update ho gaya hai.', 'ERROR');
        return;
      }
      // Stash the search query so the next reader auto-scrolls / highlights
      // the matching line, just like Lucent / Homework hits do.
      setPendingReadQuery(homeSearchQuery.trim());
      // Build a minimal RecentChapterEntry-shaped object so we reuse the
      // exact same open path (correct class context, scroll restore, tab
      // switch, fullscreen).
      openRecentChapter({
        id: `search_${chapter.id}`,
        chapter,
        subject: subj as any,
        classLevel: cls,
        board,
        contentType: 'PDF',
        scrollY: 0,
        timestamp: Date.now(),
      } as any);
    } catch (err) {
      console.error('[search] openChapterFromNoteHit failed', err);
      showAlert('Chapter kholne mein dikkat aayi.', 'ERROR');
    }
  };

  const openChapterFromMcqHit = async (hit: import('../utils/mcqSearcher').McqSearchHit) => {
    try {
      const board = (hit.board === 'BSEB' ? 'BSEB' : 'CBSE') as 'CBSE' | 'BSEB';
      const cls = hit.classLevel;
      const stream = (user.stream || 'Science') as any;
      const subs = getSubjectsList(cls, stream, board);
      const wanted = (hit.subjectName || '').toLowerCase().replace(/[-\s]+/g, ' ').trim();
      let subj = subs.find(s => s.name.toLowerCase() === hit.subjectName?.toLowerCase());
      if (!subj) subj = subs.find(s => s.name.toLowerCase().replace(/[-\s]+/g, ' ').trim() === wanted);
      if (!subj) { showAlert('Iss chapter ka subject is class mein available nahi hai.', 'ERROR'); return; }
      const lang = (user.preferredLanguage || 'English') as any;
      const chapters = await fetchChapters(board, cls as any, stream, subj, lang);
      const chapter = chapters.find(c => c.id === hit.chapterId);
      if (!chapter) { showAlert('Chapter milana mushkil hai.', 'ERROR'); return; }
      setPendingReadQuery(homeSearchQuery.trim());
      openRecentChapter({
        id: `mcqsearch_${chapter.id}`,
        chapter,
        subject: subj as any,
        classLevel: cls,
        board,
        contentType: 'PDF',
        scrollY: 0,
        timestamp: Date.now(),
      } as any);
    } catch (err) {
      console.error('[search] openChapterFromMcqHit failed', err);
      showAlert('Chapter kholne mein dikkat aayi.', 'ERROR');
    }
  };

  // Open a previously-read Lucent page (from History → Continue Reading).
  // Looks up the original LucentNoteEntry from settings and restores the page index.
  const openRecentLucent = (entry: RecentLucentEntry) => {
    const allLucent = (settings?.lucentNotes || []) as any[];
    const found = allLucent.find(l => l.id === entry.lucentId);
    if (!found) {
      showAlert('This Lucent page is no longer available.', 'ERROR');
      return;
    }
    setLucentNoteViewer(found);
    setLucentPageIndex(Math.min(entry.pageIndex, (found.pages?.length || 1) - 1));
  };

  // Closes any in-progress note reader BEFORE switching bottom-nav tabs.
  // Whatever the user was reading is saved to Continue Reading first so they
  // can resume later. Returns true if something was closed.
  // `targetTabId` is the bottom-nav tab the user is switching to — used so we
  // don't tear down the Homework overlay when they're going back to Homework.
  const closeReadersBeforeNavSwitch = (targetTabId?: string): boolean => {
    let closedSomething = false;
    // Lucent Book viewer — also save current page to Continue Reading.
    if (lucentNoteViewer) {
      try {
        const lv = lucentNoteViewer;
        const pageIdx = Math.min(Math.max(0, lucentPageIndex), Math.max(0, (lv.pages?.length || 1) - 1));
        const page = lv.pages?.[pageIdx];
        if (page) {
          const recId = `lucent_${lv.id}_${pageIdx}`;
          saveRecentLucent({
            id: recId,
            lucentId: lv.id,
            lessonTitle: lv.lessonTitle,
            subject: lv.subject,
            pageIndex: pageIdx,
            pageNo: page.pageNo,
            totalPages: lv.pages.length,
            scrollY: 0,
            scrollPct: 30, // partial — they were reading but didn't finish
          });
          markReadToday(recId);
        }
      } catch {}
      try { stopSpeech(); } catch {}
      setLucentAutoSync(false);
      setLucentNoteViewer(null);
      closedSomething = true;
    }
    // Homework MCQ player
    if (homeworkPlayerHwId) {
      try { closeHomeworkPlayer(); } catch {}
      closedSomething = true;
    }
    // Homework note reader (Sar Sangrah / Speedy / etc) — auto-save already
    // happens on scroll, so just close the active note. The scroll-position is
    // already persisted via the onScroll handler.
    if (showHomeworkHistory && hwActiveHwId) {
      setHwActiveHwId(null);
      closedSomething = true;
    }
    // If user is leaving the Homework area entirely, also tear down the
    // Homework history overlay so the new tab's content actually shows.
    if (showHomeworkHistory && targetTabId && targetTabId !== 'HOMEWORK') {
      setShowHomeworkHistory(false);
      closedSomething = true;
    }
    return closedSomething;
  };

  // Open a previously-read homework note (from "Resume reading" card on Homework page)
  const openRecentHw = (entry: RecentHwEntry) => {
    const subId = entry.targetSubject || (entry.hw && entry.hw.targetSubject) || 'sarSangrah';
    const SUBJECT_LABELS: Record<string, string> = {
      mcq: 'MCQ Practice',
      sarSangrah: 'Sar Sangrah',
      speedySocialScience: 'Speedy Social Science',
      speedyScience: 'Speedy Science',
    };
    const hw = entry.hw;
    const hasNotes = !!(hw && hw.notes && hw.notes.trim());
    const hasMcq = !!(hw && hw.parsedMcqs && hw.parsedMcqs.length > 0);
    if (hasNotes && hasMcq) setHwViewMode('notes'); // Resume into notes
    else if (hasMcq) setHwViewMode('mcq');
    else setHwViewMode('notes');

    // Restore the last-read topic index so ChunkedNotesReader scrolls to & resumes from there
    if (entry.id && typeof entry.topicIndex === 'number') {
      setHwNotePositions(prev => ({ ...prev, [entry.id]: entry.topicIndex as number }));
    }

    setShowHomeworkHistory(false);
    setHwTodayPickerSub(null);
    setHomeworkSubjectView(subId);
    setSelectedSubject({ id: subId, name: SUBJECT_LABELS[subId] || subId, icon: 'Book', color: 'bg-slate-100' } as any);
    setContentViewStep('SUBJECTS');
    setLucentCategoryView(false);
    setHwYear(null);
    setHwMonth(null);
    setHwWeek(null);
    setHwActiveHwId(entry.id);
    setHwOpenedDirect(true);
    // Remember where the user came from so Back returns there (not Homework by default).
    setHwOpenedFrom(currentLogicalTab === 'HOME' ? 'HOME' : 'HOMEWORK');
    onTabChange('COURSES');
  };

  const dismissRecentChapter = (id: string) => {
    removeRecentChapter(id);
    setRecentChapters(getRecentChapters());
  };

  const dismissRecentHw = (id: string) => {
    removeRecentHomework(id);
    setRecentHw(getRecentHomeworks());
  };

  // Restore last-read scroll position for the active homework note
  React.useEffect(() => {
    if (!hwActiveHwId || hwViewMode !== 'notes') return;
    hwScrollRestoredRef.current = false;
    let saved = 0;
    try {
      saved = parseInt(localStorage.getItem(`nst_hw_scroll_${hwActiveHwId}`) || '0', 10) || 0;
    } catch {}
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const node = hwScrollContainerRef.current;
        if (node && saved > 0 && node.scrollHeight > node.clientHeight) {
          node.scrollTop = Math.min(saved, node.scrollHeight - node.clientHeight);
          const max = node.scrollHeight - node.clientHeight;
          setHwScrollProgress(max > 0 ? Math.min(100, (node.scrollTop / max) * 100) : 0);
        }
        hwScrollRestoredRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (hwScrollSaveTimerRef.current) window.clearTimeout(hwScrollSaveTimerRef.current);
    };
  }, [hwActiveHwId, hwViewMode]);

  // Clear media state when switching homework
  React.useEffect(() => {
    setHwActivePdf(null);
    setHwAudioVisible(false);
    setHwVideoVisible(false);
  }, [hwActiveHwId]);

  // Track time spent reading homework notes (for History → Flashcards/Notes Read tab)
  React.useEffect(() => {
    if (!hwActiveHwId || hwViewMode !== 'notes') return;
    const startedAt = Date.now();
    const allHw = (settings?.homework || []) as any[];
    const hw = allHw.find(h => h.id === hwActiveHwId);
    const lessonTitle = hw?.title || 'Homework note';
    const subject = hw?.targetSubject || hw?.subject || hw?.subjectName || '—';
    return () => {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      // Lazy import so we don't churn module loads on every render.
      import('../utils/flashcardHistory').then(({ recordNotesReadSession }) => {
        recordNotesReadSession({ subject, lessonTitle, kind: 'homework', durationSec });
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwActiveHwId, hwViewMode]);

  // Track time spent reading Lucent book pages
  React.useEffect(() => {
    if (!lucentNoteViewer) return;
    const startedAt = Date.now();
    const lessonTitle = lucentNoteViewer.lessonTitle || 'Lucent page';
    const subject = (lucentNoteViewer as any).subject || 'Lucent';
    return () => {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      import('../utils/flashcardHistory').then(({ recordNotesReadSession }) => {
        recordNotesReadSession({ subject, lessonTitle, kind: 'lucent', durationSec });
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lucentNoteViewer?.id, lucentPageIndex]);

  // Show notification toast for first unseen notification
  React.useEffect(() => {
    if (!settings?.notifications?.length) return;
    const unseen = settings.notifications.filter(n => !seenNotifIds.includes(n.id));
    if (unseen.length === 0) return;
    const first = unseen[0];
    setNotifToast(first);
    const ids = [...seenNotifIds, ...unseen.map(n => n.id)];
    setSeenNotifIds(ids);
    try { localStorage.setItem('nst_seen_notifs_v1', JSON.stringify(ids)); } catch {}
    const t = setTimeout(() => setNotifToast(null), 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.notifications]);

  // Notifications: total count + unread count
  const allNotifications: AppNotification[] = settings?.notifications || [];
  const unreadNotifCount = allNotifications.filter(n => !seenNotifIds.includes(n.id)).length;

  // Star a note topic — ONE-WAY ONLY. Once saved, the user cannot un-save it
  // from the source location (lesson / homework / book viewer). Removal is
  // possible only from the dedicated "Saved Notes" page via swipe-to-delete.
  // This prevents accidental tap-to-unstar and double-saves of the same note.
  // Also syncs to Firebase so we can show global "X students saved this"
  // social-proof counts (Firebase de-dupes by userId so count won't inflate).
  const toggleStarNote = (noteKey: string, topicText: string, source?: StarredNoteSource) => {
    let didStar = false;
    setStarredNotes(prev => {
      const alreadySaved = prev.some(n => n.noteKey === noteKey && n.topicText === topicText);
      if (alreadySaved) {
        // Already saved → show a soft message and return prev unchanged.
        try { showAlert('Yeh note pehle se saved hai. Remove karne ke liye Saved Notes page me swipe karein.', 'INFO'); } catch {}
        return prev;
      }
      const updated = [
        ...prev,
        {
          id: Date.now().toString(),
          noteKey,
          topicText,
          savedAt: new Date().toISOString(),
          ...(source ? { source } : {}),
        },
      ];
      didStar = true;
      try { localStorage.setItem('nst_starred_notes_v1', JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (didStar) {
      try { if (navigator.vibrate) navigator.vibrate(30); } catch {}
      // Fire-and-forget global count sync so other students see it.
      try {
        if (user?.id) {
          recordNoteStar(user.id, noteKey, topicText, source ? {
            lessonTitle: source.lessonTitle,
            subject: source.subject,
            pageNo: source.pageNo as any,
            pageIndex: source.pageIndex as any,
          } : undefined);
        }
      } catch {}
    }
  };

  const isNoteTopicStarred = (noteKey: string, topicText: string) =>
    starredNotes.some(n => n.noteKey === noteKey && n.topicText === topicText);

  // === Important-Notes-page helpers ============================================
  // Try to find source metadata for a free-floating topic text — used by the
  // Global / Trending tabs (their entries only carry `label`, not `source`).
  // We return the first match from MY local starred notes.
  const findSourceForTopic = (topicText: string): StarredNoteSource | undefined => {
    const hit = starredNotes.find(n => n.topicText === topicText);
    return hit?.source;
  };

  // Open the full notes for a starred note's source. Currently supports
  // 'lucent' (jumps into the Lucent Book viewer at the right page) and
  // 'homework' (opens the homework overlay). Returns true if it opened.
  const openFullNotesForSource = (source?: StarredNoteSource): boolean => {
    if (!source) return false;
    try {
      if (source.kind === 'lucent' && source.lucentId) {
        const allLucent = (settings?.lucentNotes || []) as any[];
        const found = allLucent.find(l => l.id === source.lucentId);
        if (!found) {
          showAlert('This Lucent book is no longer available.', 'ERROR');
          return false;
        }
        // Close the Important-Notes overlays first so the reader is visible.
        stopProfileStarRead();
        setShowStarredPage(false);
        setShowCommunityStarsPage(false);
        setLucentNoteViewer(found);
        const totalPages = (found.pages?.length || 1);
        const idx = Number.isFinite(source.pageIndex) ? Math.min(Math.max(0, source.pageIndex!), totalPages - 1) : 0;
        setLucentPageIndex(idx);
        return true;
      }
      if (source.kind === 'homework' && source.hwId) {
        // Homework overlay opens via hwActiveHwId; jump there.
        stopProfileStarRead();
        setShowStarredPage(false);
        setShowCommunityStarsPage(false);
        setHwActiveHwId(source.hwId);
        return true;
      }
    } catch {}
    return false;
  };

  // Group an array of starred notes by book (lessonTitle), then by page.
  // Notes without source land in an "Untagged" bucket so they aren't lost.
  const groupStarredByBook = (notes: StarredNote[]) => {
    const buckets: Record<string, {
      lessonTitle: string;
      subject?: string;
      kind?: string;
      pages: Record<string, { pageNo?: string|number; pageIndex?: number; notes: StarredNote[] }>;
      total: number;
    }> = {};
    notes.forEach(n => {
      const s = n.source || {};
      const bookKey = s.lessonTitle || 'Untagged';
      if (!buckets[bookKey]) {
        buckets[bookKey] = {
          lessonTitle: bookKey,
          subject: s.subject,
          kind: s.kind,
          pages: {},
          total: 0,
        };
      }
      const pageKey = s.pageNo != null ? `p${s.pageNo}` : (s.pageIndex != null ? `i${s.pageIndex}` : 'nopage');
      if (!buckets[bookKey].pages[pageKey]) {
        buckets[bookKey].pages[pageKey] = { pageNo: s.pageNo, pageIndex: s.pageIndex, notes: [] };
      }
      buckets[bookKey].pages[pageKey].notes.push(n);
      buckets[bookKey].total += 1;
    });
    // Return as sorted array — Untagged last; pages sorted numerically.
    return Object.values(buckets)
      .sort((a, b) => {
        if (a.lessonTitle === 'Untagged') return 1;
        if (b.lessonTitle === 'Untagged') return -1;
        return b.total - a.total;
      })
      .map(b => ({
        ...b,
        pageList: Object.values(b.pages).sort((p1, p2) => {
          const n1 = Number(p1.pageNo ?? p1.pageIndex ?? 0);
          const n2 = Number(p2.pageNo ?? p2.pageIndex ?? 0);
          return n1 - n2;
        }),
      }));
  };

  // Active homework being played
  const activePlayerHw = React.useMemo(() => {
    if (!homeworkPlayerHwId) return null;
    return (settings?.homework || []).find((h, i) => (h.id || String(i)) === homeworkPlayerHwId) || null;
  }, [homeworkPlayerHwId, settings?.homework]);

  // Sibling homework list — sorted by date — for Prev/Next navigation in the
  // full-screen player. Filter to the same targetSubject so user stays within
  // Sar Sangrah / Speedy / etc. while flipping through.
  const playerSiblingHws = React.useMemo(() => {
    if (!activePlayerHw) return [] as any[];
    return (settings?.homework || [])
      .filter(h => h.targetSubject === activePlayerHw.targetSubject)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activePlayerHw, settings?.homework]);

  const playerSiblingIdx = React.useMemo(() => {
    if (!activePlayerHw) return -1;
    return playerSiblingHws.findIndex(h => (h.id || '') === (activePlayerHw.id || ''));
  }, [activePlayerHw, playerSiblingHws]);

  const playerPrevHw = playerSiblingIdx > 0 ? playerSiblingHws[playerSiblingIdx - 1] : null;
  const playerNextHw = playerSiblingIdx >= 0 && playerSiblingIdx + 1 < playerSiblingHws.length
    ? playerSiblingHws[playerSiblingIdx + 1] : null;

  const goToPlayerHw = React.useCallback((target: any) => {
    if (!target?.id) return;
    try { stopSpeech(); } catch {}
    playerIsReadingAllRef.current = false;
    setPlayerIsReadingAll(false);
    setPlayerCurrentIndex(0);
    setHomeworkPlayerHwId(target.id);
  }, []);

  // Build sequential player chunks (per-line notes + MCQs with answers + explanations)
  // Each chunk is one "row" of the player; reading READ ALL walks each row
  // sequentially with auto-scroll + highlight (line-wise sync).
  const buildPlayerChunks = React.useCallback((hw: any | null) => {
    type Chunk =
      | { kind: 'notes-line', index: number, text: string, isHeading: boolean }
      | { kind: 'mcq', index: number, text: string, mcq: any };
    if (!hw) return [] as Chunk[];
    const chunks: Chunk[] = [];

    if (hw.notes) {
      const topics = splitIntoTopics(hw.notes);
      topics.forEach((t, i) => {
        chunks.push({ kind: 'notes-line', index: i, text: t.text, isHeading: t.isHeading });
      });
    }

    if (Array.isArray(hw.parsedMcqs)) {
      hw.parsedMcqs.forEach((mcq: any, qi: number) => {
        const optsText = (mcq.options || []).map((o: string, oi: number) => `Option ${String.fromCharCode(65 + oi)}. ${o}`).join('. ');
        const correctLetter = String.fromCharCode(65 + (mcq.correctAnswer ?? 0));
        const correctText = (mcq.options || [])[mcq.correctAnswer ?? 0] || '';
        const parts: string[] = [];
        parts.push(`Question ${qi + 1}. ${mcq.question || ''}`);
        if (optsText) parts.push(optsText);
        parts.push(`Correct answer is option ${correctLetter}. ${correctText}.`);
        if (mcq.explanation) parts.push(`Explanation. ${mcq.explanation}`);
        if (mcq.concept) parts.push(`Concept. ${mcq.concept}`);
        if (mcq.examTip) parts.push(`Exam tip. ${mcq.examTip}`);
        if (mcq.commonMistake) parts.push(`Common mistake. ${mcq.commonMistake}`);
        if (mcq.mnemonic) parts.push(`Memory trick. ${mcq.mnemonic}`);
        chunks.push({ kind: 'mcq', index: qi, text: parts.join(' '), mcq });
      });
    }
    return chunks;
  }, []);

  const playerChunks = React.useMemo(() => buildPlayerChunks(activePlayerHw), [activePlayerHw, buildPlayerChunks]);

  const playPlayerFromIndex = React.useCallback((idx: number) => {
    if (!playerIsReadingAllRef.current) return;
    if (idx >= playerChunks.length) {
      playerIsReadingAllRef.current = false;
      setPlayerIsReadingAll(false);
      return;
    }
    setPlayerCurrentIndex(idx);
    setTimeout(() => {
      playerScrollRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    const chunk = playerChunks[idx];
    speakText(
      chunk.text,
      undefined,
      1.0,
      'hi-IN',
      undefined,
      () => {
        if (playerIsReadingAllRef.current) playPlayerFromIndex(idx + 1);
      }
    );
  }, [playerChunks]);

  const togglePlayerReadAll = React.useCallback(() => {
    if (playerIsReadingAll) {
      playerIsReadingAllRef.current = false;
      setPlayerIsReadingAll(false);
      stopSpeech();
      return;
    }
    if (playerChunks.length === 0) return;
    playerIsReadingAllRef.current = true;
    setPlayerIsReadingAll(true);
    playPlayerFromIndex(playerCurrentIndex || 0);
  }, [playerIsReadingAll, playerChunks.length, playPlayerFromIndex, playerCurrentIndex]);

  const closeHomeworkPlayer = React.useCallback(() => {
    playerIsReadingAllRef.current = false;
    setPlayerIsReadingAll(false);
    stopSpeech();
    setHomeworkPlayerHwId(null);
    setPlayerCurrentIndex(0);
  }, []);

  // ---- AUTO-SAVE HOMEWORK MCQ ATTEMPTS TO HISTORY (separate from regular MCQ) ----
  // When the student has answered all MCQs of a homework, persist a single
  // consolidated MCQResult to user.mcqHistory tagged with chapterId='homework_<id>'
  // so it shows up under the new "Homework MCQ History" section but stays
  // visually distinct from regular chapter MCQs.
  React.useEffect(() => {
    const allHw = settings?.homework || [];
    if (allHw.length === 0) return;

    const HOMEWORK_SUBJECT_LABELS: Record<string, string> = {
      mcq: 'MCQ Practice',
      sarSangrah: 'Sar Sangrah',
      speedySocialScience: 'Speedy Social Science',
      speedyScience: 'Speedy Science',
    };

    const existingHwResultIds = new Set(
      (user.mcqHistory || [])
        .filter((h) => (h.chapterId || '').startsWith('homework_'))
        .map((h) => h.chapterId)
    );

    const newResults: MCQResult[] = [];
    allHw.forEach((hw, idx) => {
      const hwKey = hw.id || String(idx);
      const histChapterId = `homework_${hwKey}`;
      if (existingHwResultIds.has(histChapterId)) return;
      const mcqs = hw.parsedMcqs || [];
      if (mcqs.length === 0) return;
      const allAnswered = mcqs.every((_, qi) => hwAnswers[`${hwKey}_${qi}`] !== undefined || hwAnswers[`hw_${hw.id}_${qi}`] !== undefined);
      if (!allAnswered) return;

      const omr = mcqs.map((mcq, qi) => {
        const sel = hwAnswers[`${hwKey}_${qi}`] ?? hwAnswers[`hw_${hw.id}_${qi}`] ?? -1;
        return {
          qIndex: qi,
          selected: typeof sel === 'number' ? sel : -1,
          correct: typeof mcq.correctAnswer === 'number' ? mcq.correctAnswer : -1,
        };
      });
      const correctCount = omr.filter((o) => o.selected === o.correct).length;
      const wrongCount = omr.length - correctCount;
      const score = Math.round((correctCount / omr.length) * 100);
      const subjectLabel = HOMEWORK_SUBJECT_LABELS[hw.targetSubject || ''] || 'General';
      const result: MCQResult = {
        id: `hw_${hwKey}_${Date.now()}`,
        userId: user.id,
        chapterId: histChapterId,
        subjectId: 'homework',
        subjectName: `Homework: ${subjectLabel}`,
        chapterTitle: hw.title || 'Homework',
        date: new Date().toISOString(),
        totalQuestions: omr.length,
        correctCount,
        wrongCount,
        score,
        totalTimeSeconds: 0,
        averageTimePerQuestion: 0,
        performanceTag:
          score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'BAD' : 'VERY_BAD',
        omrData: omr,
        topic: hw.title,
      };
      newResults.push(result);
    });

    if (newResults.length > 0) {
      handleUserUpdate({
        ...user,
        mcqHistory: [...newResults, ...(user.mcqHistory || [])],
      });
    }
    // We intentionally exclude `user` and `handleUserUpdate` from deps to avoid
    // re-saving loops; we only react to changes in answers and homework data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwAnswers, settings?.homework]);

  const [showDailyGkHistory, setShowDailyGkHistory] = useState(false);
  const [gkExpandedYear, setGkExpandedYear] = useState<string | null>(null);
  const [gkExpandedMonth, setGkExpandedMonth] = useState<string | null>(null);
  const [gkExpandedWeek, setGkExpandedWeek] = useState<string | null>(null);
  // GK page: today's banner is collapsed by default. Tap the banner to reveal today's Q&A.
  const [gkTodayExpanded, setGkTodayExpanded] = useState<boolean>(false);
  const [activeChallenges20, setActiveChallenges20] = useState<Challenge20[]>(
    [],
  );
  const [homeBannerIndex, setHomeBannerIndex] = useState(0);

  useEffect(() => {
    const currentClass = activeSessionClass || user.classLevel;
    if (currentClass) {
      getActiveChallenges(currentClass as any).then(setActiveChallenges20);
    }
  }, [activeSessionClass, user.classLevel]);

  // Handle Banner Rotation
  useEffect(() => {
    const filteredChallenges = activeChallenges20.filter(
      (c) => !testAttempts[c.id] || testAttempts[c.id].isCompleted !== true,
    );
    const bannerCount =
      (settings?.homework?.length ? 1 : 0) +
      (settings?.globalChallengeMcq?.length ? 1 : 0) +
      (settings?.dailyGk?.length ? 1 : 0) +
      filteredChallenges.length;
    if (bannerCount > 1) {
      const interval = setInterval(() => {
        setHomeBannerIndex((prev) => (prev + 1) % bannerCount);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [
    settings?.globalChallengeMcq,
    settings?.dailyGk,
    activeChallenges20,
    JSON.stringify(testAttempts),
  ]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [dailyTargetSeconds, setDailyTargetSeconds] = useState(3 * 3600);
  const REWARD_AMOUNT = settings?.dailyReward || 3;
  const adminPhones = settings?.adminPhones || [
    { id: "default", number: "8227070298", name: "Admin" },
  ];
  const defaultPhoneId =
    adminPhones.find((p) => p.isDefault)?.id || adminPhones[0]?.id || "default";

  if (!selectedPhoneId && adminPhones.length > 0) {
    setSelectedPhoneId(defaultPhoneId);
  }

  const [viewingUserHistory, setViewingUserHistory] = useState<User | null>(
    null,
  );

  useEffect(() => {
    const today = new Date().toDateString();
    if (user.dailyRoutine?.date !== today) {
      const newRoutine = generateDailyRoutine(user);
      const updatedUser = { ...user, dailyRoutine: newRoutine };
      if (!isImpersonating) {
        localStorage.setItem("nst_current_user", JSON.stringify(updatedUser));
        saveUserToLive(updatedUser);
      }
      onRedeemSuccess(updatedUser);
    }
  }, [user.dailyRoutine?.date, user.mcqHistory?.length]);

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleAiNotesGeneration = async () => {
    // 1. Feature Lock Check
    const access = checkFeatureAccess("AI_GENERATOR", user, settings || {});
    if (!access.hasAccess) {
      showAlert(
        access.reason === "FEED_LOCKED"
          ? "🔒 Locked by Admin"
          : "🔒 Upgrade to access AI Notes!",
        "ERROR",
        "Access Denied",
      );
      return;
    }

    if (!aiTopic.trim()) {
      showAlert("Please enter a topic!", "ERROR");
      return;
    }

    // 2. Limit Check (Use Feed Limit if available)
    const today = new Date().toDateString();
    const usageKey = `nst_ai_usage_${user.id}_${today}`;
    const currentUsage = parseInt(localStorage.getItem(usageKey) || "0");

    const limit = access.limit !== undefined ? access.limit : 5; // Default fallback

    if (currentUsage >= limit) {
      showAlert(
        `Daily Limit Reached! You have used ${currentUsage}/${limit} AI generations today.`,
        "ERROR",
        "Limit Exceeded",
      );
      return;
    }

    setAiGenerating(true);
    try {
      const notes = await generateCustomNotes(
        aiTopic,
        settings?.aiNotesPrompt || "",
        settings?.aiModel,
      );
      setAiResult(notes);
      localStorage.setItem(usageKey, (currentUsage + 1).toString());
      saveAiInteraction({
        id: `ai-note-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        type: "AI_NOTES",
        query: aiTopic,
        response: notes,
        timestamp: new Date().toISOString(),
      });
      showAlert("Notes Generated Successfully!", "SUCCESS");
    } catch (e) {
      console.error(e);
      showAlert("Failed to generate notes. Please try again.", "ERROR");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSwitchToAdmin = () => {
    if (onNavigate) onNavigate("ADMIN_DASHBOARD");
  };

  const toggleLayoutVisibility = (sectionId: string) => {
    if (!settings) return;
    const currentLayout = settings.dashboardLayout || {};
    const currentConfig = currentLayout[sectionId] || {
      id: sectionId,
      visible: true,
    };
    const newLayout = {
      ...currentLayout,
      [sectionId]: { ...currentConfig, visible: !currentConfig.visible },
    };
    const newSettings = { ...settings, dashboardLayout: newLayout };
    localStorage.setItem("nst_system_settings", JSON.stringify(newSettings));
    saveUserToLive(user);
    window.location.reload();
  };

  const getPhoneNumber = (phoneId?: string) => {
    const phone = adminPhones.find(
      (p) => p.id === (phoneId || selectedPhoneId),
    );
    return phone ? phone.number : "8227070298";
  };

  useEffect(() => {
    const checkCompetitionAccess = () => {
      if (syllabusMode === "COMPETITION") {
        const access = checkFeatureAccess(
          "COMPETITION_MODE",
          user,
          settings || {},
        );
        if (!access.hasAccess) {
          setSyllabusMode("SCHOOL");
          document.documentElement.style.setProperty(
            "--primary",
            settings?.themeColor || "#3b82f6",
          );
          showAlert(
            "⚠️ Competition Mode is locked! Please upgrade to an Ultra subscription to access competition content.",
            "ERROR",
            "Locked Feature",
          );
        }
      }
    };
    checkCompetitionAccess();
    const interval = setInterval(checkCompetitionAccess, 60000);
    return () => clearInterval(interval);
  }, [
    syllabusMode,
    user.isPremium,
    user.subscriptionEndDate,
    user.subscriptionTier,
    user.subscriptionLevel,
    settings?.themeColor,
  ]);

  useEffect(() => {
    const storedGoal = localStorage.getItem(`nst_goal_${user.id}`);
    if (storedGoal) {
      const hours = parseInt(storedGoal);
      setDailyTargetSeconds(hours * 3600);
      setProfileData((prev) => ({ ...prev, dailyGoalHours: hours }));
    }
  }, [user.id]);

  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDateStr = yesterday.toDateString();
    const yActivity = parseInt(
      localStorage.getItem(`activity_${user.id}_${yDateStr}`) || "0",
    );
    const yClaimed = localStorage.getItem(
      `reward_claimed_${user.id}_${yDateStr}`,
    );
    if (
      !yClaimed &&
      (!user.subscriptionTier || user.subscriptionTier === "FREE")
    ) {
      let reward = null;
      if (yActivity >= 10800)
        reward = { tier: "MONTHLY", level: "ULTRA", hours: 4 };
      else if (yActivity >= 3600)
        reward = { tier: "WEEKLY", level: "BASIC", hours: 4 };
      if (reward) {
        const expiresAt = new Date(
          new Date().setHours(new Date().getHours() + 24),
        ).toISOString();
        const newMsg: any = {
          id: `reward-${Date.now()}`,
          text: `🎁 Daily Reward! You studied enough yesterday. Claim your ${reward.hours} hours of ${reward.level} access now!`,
          date: new Date().toISOString(),
          read: false,
          type: "REWARD",
          reward: {
            tier: reward.tier as any,
            level: reward.level as any,
            durationHours: reward.hours,
          },
          expiresAt: expiresAt,
          isClaimed: false,
        };
        const updatedUser = { ...user, inbox: [newMsg, ...(user.inbox || [])] };
        handleUserUpdate(updatedUser);
        localStorage.setItem(`reward_claimed_${user.id}_${yDateStr}`, "true");
      }
    }
  }, [user.id]);

  const claimRewardMessage = (msgId: string, reward: any, gift?: any) => {
    const updatedInbox = user.inbox?.map((m) =>
      m.id === msgId ? { ...m, isClaimed: true, read: true } : m,
    );
    let updatedUser: User = { ...user, inbox: updatedInbox };
    let successMsg = "";

    const applySubscription = (
      tier: string,
      level: string,
      duration: number,
    ) => {
      const now = new Date();
      const currentEnd = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate)
        : now;
      const isActive =
        user.isPremium &&
        (currentEnd > now || user.subscriptionTier === "LIFETIME");

      // Prevent downgrading a higher tier plan
      const tierPriority: Record<string, number> = {
        LIFETIME: 5,
        YEARLY: 4,
        "3_MONTHLY": 3,
        MONTHLY: 2,
        WEEKLY: 1,
        FREE: 0,
        CUSTOM: 0,
      };
      const currentPriority =
        tierPriority[user.subscriptionTier || "FREE"] || 0;
      const newPriority = tierPriority[tier] || 0;

      if (isActive && currentPriority > newPriority) {
        // User already has a BETTER active plan, do NOT override tier, just extend date if not lifetime
        if (user.subscriptionTier !== "LIFETIME") {
          let newEndDate = new Date(
            currentEnd.getTime() + duration * 60 * 60 * 1000,
          );
          updatedUser.subscriptionEndDate = newEndDate.toISOString();
          successMsg = `🎁 Gift Claimed! Added ${duration} hours to your existing ${user.subscriptionTier} plan.`;
        } else {
          successMsg = `🎁 Gift Claimed! But you already have a Lifetime plan!`;
        }
      } else {
        // Upgrade or Apply New Plan
        let newEndDate = new Date(now.getTime() + duration * 60 * 60 * 1000);
        if (isActive && currentPriority === newPriority) {
          newEndDate = new Date(
            currentEnd.getTime() + duration * 60 * 60 * 1000,
          );
          successMsg = `🎁 Gift Claimed! Extended your ${tier} plan by ${duration} hours.`;
        } else {
          successMsg = `🎁 Gift Claimed! ${tier} ${level} unlocked for ${duration} hours.`;
        }
        updatedUser.subscriptionTier = tier as any;
        updatedUser.subscriptionLevel = level as any;
        updatedUser.subscriptionEndDate = newEndDate.toISOString();
        updatedUser.isPremium = true;
      }
    };

    if (gift) {
      if (gift.type === "CREDITS") {
        updatedUser.credits = (user.credits || 0) + Number(gift.value);
        successMsg = `🎁 Gift Claimed! Added ${gift.value} Credits.`;
      } else if (gift.type === "SUBSCRIPTION") {
        const [tier, level] = (gift.value as string).split("_");
        const duration = gift.durationHours || 24;
        applySubscription(tier, level, duration);
      }
    } else if (reward) {
      const duration = reward.durationHours || 4;
      applySubscription(reward.tier, reward.level, duration);
    }
    handleUserUpdate(updatedUser);
    showAlert(successMsg, "SUCCESS", "Rewards Claimed");
  };

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user.id) return;
    const unsub = onSnapshot(doc(db, "users", user.id), (doc) => {
      if (doc.exists()) {
        const cloudData = doc.data() as User;
        const currentUser = userRef.current;
        const needsUpdate =
          cloudData.credits !== currentUser.credits ||
          cloudData.subscriptionTier !== currentUser.subscriptionTier ||
          cloudData.isPremium !== currentUser.isPremium ||
          cloudData.isGameBanned !== currentUser.isGameBanned ||
          (cloudData.mcqHistory?.length || 0) >
            (currentUser.mcqHistory?.length || 0);
        if (needsUpdate) {
          // Handle expired subscriptions dynamically safely using getTime() to avoid string comparison bugs
          if (
            cloudData.isPremium &&
            cloudData.subscriptionEndDate &&
            cloudData.subscriptionTier !== "LIFETIME"
          ) {
            const expDate = new Date(cloudData.subscriptionEndDate).getTime();
            if (!isNaN(expDate) && expDate < Date.now()) {
              cloudData.isPremium = false;
              cloudData.subscriptionTier = "FREE";
              cloudData.subscriptionLevel = undefined;
            }
          }

          let protectedSub = {
            tier: cloudData.subscriptionTier,
            level: cloudData.subscriptionLevel,
            endDate: cloudData.subscriptionEndDate,
            isPremium: cloudData.isPremium,
          };
          const localTier = currentUser.subscriptionTier || "FREE";
          const cloudTier = cloudData.subscriptionTier || "FREE";
          const tierPriority: Record<string, number> = {
            LIFETIME: 5,
            YEARLY: 4,
            "3_MONTHLY": 3,
            MONTHLY: 2,
            WEEKLY: 1,
            FREE: 0,
            CUSTOM: 0,
          };
          if (tierPriority[localTier] > tierPriority[cloudTier]) {
            const localEnd = currentUser.subscriptionEndDate
              ? new Date(currentUser.subscriptionEndDate).getTime()
              : Date.now();
            if (
              localTier === "LIFETIME" ||
              (!isNaN(localEnd) && localEnd > Date.now())
            ) {
              console.warn(
                "⚠️ Prevented Cloud Downgrade! Keeping Local Subscription.",
                localTier,
              );
              protectedSub = {
                tier: currentUser.subscriptionTier,
                level: currentUser.subscriptionLevel,
                endDate: currentUser.subscriptionEndDate,
                isPremium: true,
              };
              saveUserToLive({ ...cloudData, ...protectedSub });
            }
          }
          const updated: User = {
            ...currentUser,
            ...cloudData,
            ...protectedSub,
          };

          // PRESERVE ADMIN OVERRIDES (Fix for Admin downgrading to Student)
          if (currentUser.role === "ADMIN" && cloudData.role !== "ADMIN") {
            updated.role = "ADMIN";
          }
          if (
            currentUser.role === "SUB_ADMIN" &&
            cloudData.role !== "SUB_ADMIN" &&
            cloudData.role !== "ADMIN"
          ) {
            updated.role = "SUB_ADMIN";
          }

          // CRITICAL FIX: The Firestore 'users/{uid}' document DOES NOT contain bulky data.
          // We must preserve the bulky data from the current state so it doesn't get wiped by the core sync.
          if (!cloudData.hasOwnProperty("mcqHistory"))
            updated.mcqHistory = currentUser.mcqHistory;
          if (!cloudData.hasOwnProperty("testResults"))
            updated.testResults = currentUser.testResults;
          if (!cloudData.hasOwnProperty("progress"))
            updated.progress = currentUser.progress;
          if (!cloudData.hasOwnProperty("usageHistory"))
            updated.usageHistory = currentUser.usageHistory;
          if (!cloudData.hasOwnProperty("inbox"))
            updated.inbox = currentUser.inbox;
          if (!cloudData.hasOwnProperty("topicStrength"))
            updated.topicStrength = currentUser.topicStrength;
          if (!cloudData.hasOwnProperty("subscriptionHistory"))
            updated.subscriptionHistory = currentUser.subscriptionHistory;
          if (!cloudData.hasOwnProperty("activeSubscriptions"))
            updated.activeSubscriptions = currentUser.activeSubscriptions;
          if (!cloudData.hasOwnProperty("pendingRewards"))
            updated.pendingRewards = currentUser.pendingRewards;
          if (!cloudData.hasOwnProperty("redeemedCodes"))
            updated.redeemedCodes = currentUser.redeemedCodes;
          if (!cloudData.hasOwnProperty("unlockedContent"))
            updated.unlockedContent = currentUser.unlockedContent;
          if (!cloudData.hasOwnProperty("dailyRoutine"))
            updated.dailyRoutine = currentUser.dailyRoutine;

          onRedeemSuccess(updated);
        }
      }
    });
    return () => unsub();
  }, [user.id]);

  useEffect(() => {
    if (isTeacherLocked && activeTab !== "STORE") return; // Pause updates if locked
    const interval = setInterval(() => {
      updateUserStatus(user.id, dailyStudySeconds);
      const todayStr = new Date().toDateString();
      localStorage.setItem(
        `activity_${user.id}_${todayStr}`,
        dailyStudySeconds.toString(),
      );
      const accountAgeHours =
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);
      const firstDayBonusClaimed = localStorage.getItem(
        `first_day_ultra_${user.id}`,
      );
      if (
        accountAgeHours < 24 &&
        dailyStudySeconds >= 3600 &&
        !firstDayBonusClaimed
      ) {
        // Only apply if user is NOT already on a better plan
        const tierPriority: Record<string, number> = {
          LIFETIME: 5,
          YEARLY: 4,
          "3_MONTHLY": 3,
          MONTHLY: 2,
          WEEKLY: 1,
          FREE: 0,
          CUSTOM: 0,
        };
        const currentPriority =
          tierPriority[user.subscriptionTier || "FREE"] || 0;

        if (currentPriority < 2) {
          // Less than MONTHLY
          const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
          const updatedUser: User = {
            ...user,
            subscriptionTier: "MONTHLY",
            subscriptionLevel: "ULTRA",
            subscriptionEndDate: endDate,
            isPremium: true,
          };
          const storedUsers = JSON.parse(
            localStorage.getItem("nst_users") || "[]",
          );
          const idx = storedUsers.findIndex((u: User) => u.id === user.id);
          if (idx !== -1) storedUsers[idx] = updatedUser;
          localStorage.setItem("nst_users", JSON.stringify(storedUsers));
          localStorage.setItem("nst_current_user", JSON.stringify(updatedUser));
          localStorage.setItem(`first_day_ultra_${user.id}`, "true");
          onRedeemSuccess(updatedUser);
          showAlert(
            "🎉 FIRST DAY BONUS: You unlocked 1 Hour Free ULTRA Subscription!",
            "SUCCESS",
          );
        } else {
          // Mark claimed anyway so it doesn't trigger again
          localStorage.setItem(`first_day_ultra_${user.id}`, "true");
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [dailyStudySeconds, user.id, user.createdAt, user.subscriptionTier]);

  const [showInbox, setShowInbox] = useState(false);
  const unreadCount = user.inbox?.filter((m) => !m.read).length || 0;

  useEffect(() => {
    setCanClaimReward(
      RewardEngine.canClaimDaily(user, dailyStudySeconds, dailyTargetSeconds),
    );
  }, [user.lastRewardClaimDate, dailyStudySeconds, dailyTargetSeconds]);

  // === HARDWARE / BROWSER BACK BUTTON HANDLER ===
  // Keeps an always-fresh snapshot of navigation state so the popstate
  // listener (registered once) can react without stale closures.
  const navStateRef = useRef({
    activeTab,
    contentViewStep,
    showLessonModal,
    showSidebar,
    showInbox,
    initialParentSubject,
    homeworkSubjectView,
    lucentCategoryView,
    activeSessionClass,
  });
  useEffect(() => {
    navStateRef.current = {
      activeTab,
      contentViewStep,
      showLessonModal,
      showSidebar,
      showInbox,
      initialParentSubject,
      homeworkSubjectView,
      lucentCategoryView,
      activeSessionClass,
    };
  });

  useEffect(() => {
    // Push an initial trap entry so the first back press is captured.
    try {
      window.history.pushState({ __nstTrap: true }, "");
    } catch {}

    const reTrap = () => {
      try {
        window.history.pushState({ __nstTrap: true }, "");
      } catch {}
    };

    const onPopState = () => {
      if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
      }
      const s = navStateRef.current;

      // 1. Close any open overlays first (one back press = one overlay close)
      if (s.showSidebar) { setShowSidebar(false); reTrap(); return; }
      if (s.showInbox) { setShowInbox(false); reTrap(); return; }
      if (s.showLessonModal) { setShowLessonModal(false); reTrap(); return; }

      // 2. PDF / VIDEO / AUDIO / MCQ tabs (content player tabs)
      if (
        s.activeTab === "PDF" ||
        s.activeTab === "VIDEO" ||
        s.activeTab === "AUDIO" ||
        s.activeTab === "MCQ"
      ) {
        if (s.contentViewStep === "PLAYER") {
          // Player → Chapter list (switch back to COURSES tab so list renders)
          setContentViewStep("CHAPTERS");
          setFullScreen(false);
          onTabChange("COURSES");
        } else {
          // Anything else → Subject list
          onTabChange("COURSES");
          setContentViewStep("SUBJECTS");
          setDirectActionTarget(null);
          setLucentCategoryView(false);
          setHomeworkSubjectView(null);
        }
        reTrap();
        return;
      }

      // 3. COURSES tab — step-by-step back through the content tree
      if (s.activeTab === "COURSES") {
        if (s.contentViewStep === "PLAYER") {
          setContentViewStep("CHAPTERS");
          setFullScreen(false);
        } else if (s.contentViewStep === "CHAPTERS") {
          setContentViewStep("SUBJECTS");
          setDirectActionTarget(null);
          setLucentCategoryView(false);
          setHomeworkSubjectView(null);
        } else if (s.initialParentSubject) {
          setInitialParentSubject(null);
        } else if (s.homeworkSubjectView) {
          setHomeworkSubjectView(null);
        } else if (s.lucentCategoryView) {
          setLucentCategoryView(false);
        } else {
          // SUBJECTS root → back to HOME (class selection)
          setActiveSessionClass(null);
          setActiveSessionBoard(null);
          onTabChange("HOME");
        }
        reTrap();
        return;
      }

      // 4. Any other non-home tab (HISTORY / PROFILE / UPDATES / etc.) → HOME
      if (s.activeTab !== "HOME") {
        onTabChange("HOME");
        reTrap();
        return;
      }

      // 5. Already at HOME root → re-trap so the app does NOT close on back.
      reTrap();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claimDailyReward = () => {
    if (!canClaimReward) return;
    const finalReward = RewardEngine.calculateDailyBonus(user, settings);
    const updatedUser = RewardEngine.processClaim(user, finalReward);
    handleUserUpdate(updatedUser);
    setCanClaimReward(false);
    showAlert(
      `Received: ${finalReward} Free Credits!`,
      "SUCCESS",
      "Daily Goal Met",
    );
  };

  const handleUserUpdate = (updatedUser: User) => {
    // Ignore nst_users if empty, just save to live and current user directly
    // since the system has moved away from 'nst_users' dependency.
    if (!isImpersonating) {
      localStorage.setItem("nst_current_user", JSON.stringify(updatedUser));
      saveUserToLive(updatedUser);
    }
    onRedeemSuccess(updatedUser);

    // Also keep legacy 'nst_users' updated just in case it's used elsewhere
    const storedUsersStr = localStorage.getItem("nst_users");
    if (storedUsersStr) {
      const storedUsers = JSON.parse(storedUsersStr);
      const userIdx = storedUsers.findIndex(
        (u: User) => u.id === updatedUser.id,
      );
      if (userIdx !== -1) {
        storedUsers[userIdx] = updatedUser;
        localStorage.setItem("nst_users", JSON.stringify(storedUsers));
      }
    }
  };

  const markInboxRead = () => {
    if (!user.inbox) return;
    const updatedInbox = user.inbox.map((m) => ({ ...m, read: true }));
    handleUserUpdate({ ...user, inbox: updatedInbox });
  };

  // Built-in subjects whose homework lives behind the "Subject view" (vs. dated history).
  const HOMEWORK_SUBJECTS_BASE = ['mcq', 'sarSangrah', 'speedySocialScience', 'speedyScience'];
  // Admin-added custom books (stored in settings.customBooks). They behave just like
  // Sar Sangrah / Speedy — page-wise list of notes/MCQs + same items also visible on
  // the date-wise Homework page (because every entry has a `date`).
  const customBooksFromSettings: { id: string; name: string }[] = ((settings as any)?.customBooks || [])
    .filter((b: any) => b && b.id && b.name);
  const HOMEWORK_SUBJECTS = [...HOMEWORK_SUBJECTS_BASE, ...customBooksFromSettings.map(b => b.id)];
  // Subjects that show a flat page-wise list (sorted by pageNo) in their book view,
  // skipping the Year / Month / Week date hierarchy used for MCQ/standard homework.
  const PAGE_WISE_SUBJECTS = new Set<string>(['sarSangrah', 'speedySocialScience', 'speedyScience', ...customBooksFromSettings.map(b => b.id)]);

  const handleContentSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setHomeworkSubjectView(null);
    setLucentCategoryView(false);
    if (HOMEWORK_SUBJECTS.includes(subject.id)) {
      setHomeworkSubjectView(subject.id);
      setHwYear(null);
      setHwMonth(null);
      setHwWeek(null);
      setHwActiveHwId(null);
      return;
    }
    if (subject.id === 'lucent') {
      setLucentCategoryView(true);
      return;
    }
    setContentViewStep("CHAPTERS");
    setSelectedChapter(null);
    setLoadingChapters(true);
    const lang =
      (activeSessionBoard || user.board) === "BSEB" ? "Hindi" : "English";
    const currentClass = (activeSessionClass as any) || user.classLevel || "10";
    // Inject admin-added Lucent books targeted to this class (page-wise notes/MCQ — Competition-style).
    // Lessons ko page number wise sort karte hain — jis lesson ka pehla page number
    // sabse chhota hai woh sabse upar (e.g. lesson covering Page 1 pehle, Page 5 wala baad me).
    const lessonMinPageNo = (n: LucentNoteEntry): number => {
      let min = Infinity;
      (n.pages || []).forEach(p => {
        const num = parseInt(p.pageNo || '', 10);
        if (!isNaN(num) && num < min) min = num;
      });
      return min === Infinity ? 99999 : min;
    };
    const adminLucentForClass: Chapter[] = ((settings?.lucentNotes || []) as LucentNoteEntry[])
      .filter(n => (n.classLevel || 'COMPETITION') === currentClass)
      .sort((a, b) => lessonMinPageNo(a) - lessonMinPageNo(b))
      .map(n => {
        const minPg = lessonMinPageNo(n);
        return {
          id: `lucent_admin_${n.id}`,
          title: `📘 ${n.bookName || n.lessonTitle} — ${n.lessonTitle}`,
          description: `Admin Notes • ${n.pages.length} page${n.pages.length === 1 ? '' : 's'}`,
          // Page badge instead of CH — yeh lesson page-wise organize hua hai.
          pageNo: minPg < 99999 ? String(minPg) : undefined,
        };
      });
    fetchChapters(
      activeSessionBoard || user.board || "CBSE",
      currentClass,
      user.stream || "Science",
      subject,
      lang,
    ).then((data) => {
      const sortedData = [...data].sort((a, b) => {
        const matchA = a.title.match(/(\d+)/);
        const matchB = b.title.match(/(\d+)/);
        if (matchA && matchB) {
          const numA = parseInt(matchA[1], 10);
          const numB = parseInt(matchB[1], 10);
          if (numA !== numB) {
            return numA - numB;
          }
        }
        return a.title.localeCompare(b.title);
      });
      setChapters([...adminLucentForClass, ...sortedData]);
      setLoadingChapters(false);
    });
  };

  const handleLessonOption = (
    type: "VIDEO" | "PDF" | "MCQ" | "AUDIO" | any,
  ) => {
    if (!selectedLessonForModal) return;
    setShowLessonModal(false);

    // Update Tab and State for Player
    onTabChange(type as any);
    setSelectedChapter(selectedLessonForModal);
    setContentViewStep("PLAYER");
    setFullScreen(true);
  };

  const handleExternalAppClick = (app: any) => {
    if (app.isLocked) {
      showAlert("🔒 This app is currently locked.", "ERROR");
      return;
    }

    if (app.creditCost > 0) {
      if (user.credits < app.creditCost) {
        showAlert(`Insufficient Credits! Need ${app.creditCost}.`, "ERROR");
        return;
      }
      const u = { ...user, credits: user.credits - app.creditCost };
      handleUserUpdate(u);
      setActiveExternalApp(app.url);
    } else {
      setActiveExternalApp(app.url);
    }
  };

  const LUCENT_CATEGORIES = [
    { id: 'biology', name: 'जीव विज्ञान (Biology)', icon: 'bio', color: 'bg-green-50 text-green-600' },
    { id: 'chemistry', name: 'रसायन शास्त्र (Chemistry)', icon: 'flask', color: 'bg-purple-50 text-purple-600' },
    { id: 'physics', name: 'भौतिकी (Physics)', icon: 'physics', color: 'bg-blue-50 text-blue-600' },
    { id: 'economics', name: 'अर्थशास्त्र (Economics)', icon: 'social', color: 'bg-cyan-50 text-cyan-600' },
    { id: 'geography', name: 'भूगोल (Geography)', icon: 'geo', color: 'bg-indigo-50 text-indigo-600' },
    { id: 'polity', name: 'राजनीति विज्ञान (Polity)', icon: 'gov', color: 'bg-amber-50 text-amber-600' },
    { id: 'history', name: 'इतिहास (History)', icon: 'history', color: 'bg-rose-50 text-rose-600' },
  ] as Subject[];

  const renderContentSection = (
    type: "VIDEO" | "PDF" | "MCQ" | "AUDIO" | "GENERIC",
  ) => {
    const goBack = () => {
      if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
      }
      if (contentViewStep === "PLAYER") {
        // If the chapter was opened from a Continue Reading card on Home,
        // Back should go straight back to Home — not to the chapter list inside Courses.
        if (chapterOpenedFrom === 'HOME') {
          setContentViewStep("SUBJECTS");
          setFullScreen(false);
          setSelectedChapter(null);
          setChapterOpenedFrom('COURSES');
          onTabChange("HOME");
          setCurrentLogicalTab('HOME');
          return;
        }
        setContentViewStep("CHAPTERS");
        setFullScreen(false);
        // If we entered the player via PDF/VIDEO/AUDIO/MCQ tab,
        // switch back to COURSES so the chapter list keeps rendering.
        if (
          activeTab === "PDF" ||
          activeTab === "VIDEO" ||
          activeTab === "AUDIO" ||
          activeTab === "MCQ"
        ) {
          onTabChange("COURSES");
        }
      } else if (contentViewStep === "CHAPTERS") {
        setContentViewStep("SUBJECTS");
        setDirectActionTarget(null);
        setLucentCategoryView(false);
        // Make sure subject list renders (only the COURSES tab does that)
        if (activeTab !== "COURSES") {
          onTabChange("COURSES");
        }
      }
    };

    // HOMEWORK SUBJECT VIEW (MCQ, Sar Sangrah, Speedy Social Science, Speedy Science, custom books)
    if (homeworkSubjectView && contentViewStep === "SUBJECTS") {
      const subjectLabel: Record<string, string> = {
        mcq: 'MCQ Practice',
        sarSangrah: 'Sar Sangrah',
        speedySocialScience: 'Speedy Social Science',
        speedyScience: 'Speedy Science',
        // Custom book labels — pulled live from admin settings.
        ...Object.fromEntries(customBooksFromSettings.map(b => [b.id, b.name])),
      };
      const SUBJECT_THEME: Record<string, { bg: string; bgSoft: string; text: string; textDeep: string; border: string; ring: string; btn: string; btnHover: string; chip: string; }> = {
        mcq: { bg: 'bg-green-50', bgSoft: 'bg-green-100', text: 'text-green-600', textDeep: 'text-green-800', border: 'border-green-200', ring: 'ring-green-300', btn: 'bg-green-600', btnHover: 'hover:bg-green-700', chip: 'bg-green-100 text-green-700' },
        sarSangrah: { bg: 'bg-rose-50', bgSoft: 'bg-rose-100', text: 'text-rose-600', textDeep: 'text-rose-800', border: 'border-rose-200', ring: 'ring-rose-300', btn: 'bg-rose-600', btnHover: 'hover:bg-rose-700', chip: 'bg-rose-100 text-rose-700' },
        speedySocialScience: { bg: 'bg-orange-50', bgSoft: 'bg-orange-100', text: 'text-orange-600', textDeep: 'text-orange-800', border: 'border-orange-200', ring: 'ring-orange-300', btn: 'bg-orange-600', btnHover: 'hover:bg-orange-700', chip: 'bg-orange-100 text-orange-700' },
        speedyScience: { bg: 'bg-blue-50', bgSoft: 'bg-blue-100', text: 'text-blue-600', textDeep: 'text-blue-800', border: 'border-blue-200', ring: 'ring-blue-300', btn: 'bg-blue-600', btnHover: 'hover:bg-blue-700', chip: 'bg-blue-100 text-blue-700' },
      };
      // Custom books fall back to an indigo theme if not pre-configured.
      const CUSTOM_BOOK_THEME = { bg: 'bg-indigo-50', bgSoft: 'bg-indigo-100', text: 'text-indigo-600', textDeep: 'text-indigo-800', border: 'border-indigo-200', ring: 'ring-indigo-300', btn: 'bg-indigo-600', btnHover: 'hover:bg-indigo-700', chip: 'bg-indigo-100 text-indigo-700' };
      const theme = SUBJECT_THEME[homeworkSubjectView] || CUSTOM_BOOK_THEME;
      const isPageWiseSubject = PAGE_WISE_SUBJECTS.has(homeworkSubjectView);

      const getWeekOfMonth = (d: Date) => Math.floor((d.getDate() - 1) / 7) + 1;
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      // Ascending order so "Next" goes oldest → newest naturally
      // For page-wise subjects (Sar Sangrah / Speedy / custom books) sort by pageNo
      // ascending so flat list and Prev/Next reading flow follow the printed book.
      // Fallback to date for entries missing a pageNo. MCQ etc. stay date-asc.
      const _toPage = (hw: any) => {
        const n = parseInt(String(hw.pageNo ?? ''), 10);
        return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
      };
      const filteredHw = (settings?.homework || [])
        .filter(hw => hw.targetSubject === homeworkSubjectView)
        .sort((a, b) => {
          if (isPageWiseSubject) {
            const pa = _toPage(a), pb = _toPage(b);
            if (pa !== pb) return pa - pb;
          }
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      const goBack = () => {
        if (hwActiveHwId) {
          // Before tearing down the active note, persist whatever the student
          // has read so it shows up under "Continue Reading" — even if they
          // opened the note and pressed Back without scrolling far.
          try {
            const cur = filteredHw.find(h => (h.id || '') === hwActiveHwId);
            if (cur && cur.id && cur.notes && cur.notes.trim()) {
              saveRecentHomework({
                id: cur.id,
                scrollY: 0,
                scrollPct: Math.max(2, Math.round(hwScrollProgress)),
                title: cur.title || 'Homework',
                date: cur.date,
                targetSubject: cur.targetSubject,
                hw: cur,
              });
              markReadToday(cur.id);
            }
          } catch {}
          // Stop any in-progress speech so it doesn't keep playing in the background.
          try { stopSpeech(); } catch {}
          // If the note was opened directly (today banner / today picker / Home Continue Reading),
          // Back should jump back to where the user came FROM — not into the Year/Month hierarchy.
          if (hwOpenedDirect) {
            const cameFromHome = hwOpenedFrom === 'HOME';
            setHwActiveHwId(null);
            setHwOpenedDirect(false);
            setHwOpenedFrom('HOMEWORK');
            setHomeworkSubjectView(null);
            setSelectedSubject(null);
            if (cameFromHome) {
              // Return to Home tab cleanly.
              setShowHomeworkHistory(false);
              onTabChange('HOME');
              setCurrentLogicalTab('HOME');
            } else {
              setShowHomeworkHistory(true);
            }
            return;
          }
          setHwActiveHwId(null);
          return;
        }
        if (hwWeek !== null) { setHwWeek(null); return; }
        if (hwMonth !== null) { setHwMonth(null); return; }
        if (hwYear !== null) { setHwYear(null); return; }
        setHomeworkSubjectView(null);
        setSelectedSubject(null);
        setShowHomeworkHistory(true);
      };

      // Breadcrumb title
      let crumb = subjectLabel[homeworkSubjectView] || homeworkSubjectView;
      if (hwYear !== null) crumb += ` › ${hwYear}`;
      if (hwMonth !== null) crumb += ` › ${monthNames[hwMonth]}`;
      if (hwWeek !== null) crumb += ` › Week ${hwWeek}`;

      // Lucent-style page-wise lessons that admin saved against THIS homework subject
      // (speedyScience / speedySocialScience / sarSangrah). Shown only at the root of the
      // subject view (no year/month/week/active-note drilled in) so it doesn't clash with
      // the year/month hierarchy below.
      const _subjLucentMinPg = (n: LucentNoteEntry): number => {
        let m = Infinity;
        (n.pages || []).forEach(p => {
          const x = parseInt(p.pageNo || '', 10);
          if (!isNaN(x) && x < m) m = x;
        });
        return m === Infinity ? 99999 : m;
      };
      const subjectLucentLessons = ((settings?.lucentNotes || []) as LucentNoteEntry[])
        .filter(n => n.subject === homeworkSubjectView)
        .sort((a, b) => _subjLucentMinPg(a) - _subjLucentMinPg(b));
      const showLucentSection = subjectLucentLessons.length > 0
        && hwYear === null && hwMonth === null && hwWeek === null && !hwActiveHwId;
      const lucentSectionEl = showLucentSection ? (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest`}>📘 Page-wise Lessons</p>
            <span className={`text-[10px] font-bold ${theme.chip} px-2 py-0.5 rounded-full`}>{subjectLucentLessons.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {subjectLucentLessons.slice(0, lucentLessonsPage).map(entry => {
              const topicNames = [...new Set((entry.pages || []).map(p => (p.topicName || '').trim()).filter(Boolean))];
              return (
                <div key={entry.id} className={`bg-white border-2 ${theme.border} rounded-2xl overflow-hidden hover:shadow-md transition-all`}>
                  {/* Main read area */}
                  <button
                    onClick={() => { setLucentNoteViewer(entry); setLucentPageIndex(0); }}
                    className="w-full p-3 text-left active:scale-[0.98] flex items-center gap-3"
                  >
                    <div className={`${theme.bgSoft} ${theme.textDeep} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
                      <BookOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black ${theme.textDeep} truncate`}>{entry.lessonTitle}</p>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                        {entry.pages.length} page{entry.pages.length === 1 ? '' : 's'}
                        {topicNames.length > 0 ? ` • ${topicNames.length} topic${topicNames.length > 1 ? 's' : ''}` : ''}
                        {entry.pages.some(p => p.mcqs && p.mcqs.length > 0) ? ' • MCQs' : ''}
                      </p>
                    </div>
                    <ChevronRight size={18} className={`${theme.text} shrink-0`} />
                  </button>
                  {/* Compare / Topics button — only if lesson has tagged topics */}
                  {topicNames.length > 0 && (
                    <button
                      onClick={() => { setLucentLessonCompare(entry); setLucentLessonCompareTab('topics'); }}
                      className={`w-full border-t ${theme.border} px-3 py-2 flex items-center gap-2 ${theme.bgSoft} active:scale-[0.99] transition-all`}
                    >
                      <GitCompare size={13} className={theme.text} />
                      <span className={`text-[11px] font-black ${theme.text}`}>📌 {topicNames.length} Topic{topicNames.length > 1 ? 's' : ''} — Compare karein</span>
                    </button>
                  )}
                </div>
              );
            })}
            {subjectLucentLessons.length > lucentLessonsPage && (
              <button
                onClick={() => setLucentLessonsPage(p => p + 6)}
                className={`w-full py-3 rounded-2xl border-2 border-dashed ${theme.border} ${theme.text} font-bold text-xs flex items-center justify-center gap-2 hover:opacity-80 active:scale-[0.98] transition-all`}
              >
                <ChevronDown size={14} /> Load More ({subjectLucentLessons.length - lucentLessonsPage} aur lessons)
              </button>
            )}
          </div>
        </div>
      ) : null;

      // EMPTY STATE
      if (filteredHw.length === 0) {
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <h2 className={`text-xl font-black ${theme.textDeep}`}>{crumb}</h2>
              </div>
              {lucentSectionEl}
              {!showLucentSection && (
                <div className="text-center py-16 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-slate-500">No content found</p>
                  <p className="text-sm text-slate-400 mt-1">The admin hasn't added any content yet.</p>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ============== ACTIVE NOTE VIEW (single homework with Next button) ==============
      if (hwActiveHwId) {
        const activeHw = filteredHw.find(h => (h.id || '') === hwActiveHwId);
        if (!activeHw) {
          // fallback: clear and re-render hierarchy
          setHwActiveHwId(null);
          return null;
        }
        const flatIdx = filteredHw.findIndex(h => (h.id || '') === hwActiveHwId);
        const prevHw = flatIdx > 0 ? filteredHw[flatIdx - 1] : null;
        const hwKey = activeHw.id || String(flatIdx);

        // ── Topic Continuation: merge consecutive pages with same topicName ──
        // If multiple saved pages share the same topicName, stitch their notes
        // into one seamless reading so the student never sees a mid-topic cutoff.
        const currentTopicName = ((activeHw as any).topicName || '').trim();
        const continuationPages: typeof filteredHw = [];
        if (currentTopicName && isPageWiseSubject) {
          let ci = flatIdx + 1;
          while (ci < filteredHw.length) {
            const cand = filteredHw[ci];
            if (((cand as any).topicName || '').trim() === currentTopicName) {
              continuationPages.push(cand);
              ci++;
            } else {
              break;
            }
          }
        }
        // Combined notes: current page + all continuation pages
        const combinedNotes = [activeHw.notes, ...continuationPages.map(p => p.notes)]
          .filter(Boolean)
          .join('\n\n');
        // Next topic = first page AFTER all continuation pages (skips mid-topic pages)
        const lastContIdx = flatIdx + continuationPages.length;
        const effectiveNextHw = lastContIdx + 1 < filteredHw.length
          ? filteredHw[lastContIdx + 1]
          : null;
        // Compatibility alias — only used in MCQ mode where continuation doesn't apply
        const nextHw = flatIdx >= 0 && flatIdx + 1 < filteredHw.length ? filteredHw[flatIdx + 1] : null;
        // ─────────────────────────────────────────────────────────────────────

        const hasNotes = !!(combinedNotes && combinedNotes.trim());
        const hasMcq = !!(activeHw.parsedMcqs && activeHw.parsedMcqs.length > 0);
        const hasMedia = !!(activeHw.audioUrl || activeHw.videoUrl);
        // Effective view mode — guard against stale state if content lacks the requested mode.
        const effectiveMode: 'notes' | 'mcq' | 'choose' =
          hwViewMode === 'choose' && (!hasNotes || !hasMcq)
            ? (hasMcq && !hasNotes ? 'mcq' : 'notes')
            : (hwViewMode === 'mcq' && !hasMcq ? 'notes'
              : hwViewMode === 'notes' && !hasNotes && hasMcq ? 'mcq'
              : hwViewMode);

        const goToHw = (target: typeof activeHw) => {
          const d = new Date(target.date);
          setHwYear(d.getFullYear());
          setHwMonth(d.getMonth());
          setHwWeek(getWeekOfMonth(d));
          setHwActiveHwId(target.id || '');
          setHwScrollProgress(0);
          hwScrollRestoredRef.current = false;
          // Reset view mode for the new item.
          const tNotes = !!(target.notes && target.notes.trim());
          const tMcq = !!(target.parsedMcqs && target.parsedMcqs.length > 0);
          if (tNotes && tMcq) setHwViewMode('choose');
          else if (tMcq) setHwViewMode('mcq');
          else setHwViewMode('notes');
        };

        return (
          <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in fade-in">
            {/* Reading progress bar (notes mode only) */}
            {effectiveMode === 'notes' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/60 z-[60] pointer-events-none">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-[width] duration-150 ease-out"
                  style={{ width: `${hwScrollProgress}%` }}
                />
              </div>
            )}
            {/* Back to top FAB (notes mode, after scrolling 30%) */}
            {effectiveMode === 'notes' && hwScrollProgress > 30 && (
              <button
                onClick={() => {
                  const node = hwScrollContainerRef.current;
                  if (node) node.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Back to top"
                title="Back to top"
                className="fixed bottom-5 right-5 z-[200] w-11 h-11 rounded-full bg-slate-800/85 hover:bg-slate-900 text-white shadow-xl backdrop-blur-md flex items-center justify-center active:scale-90 transition-all animate-in fade-in slide-in-from-bottom-2"
              >
                <ChevronRight size={22} className="-rotate-90" />
              </button>
            )}
            {/* Sticky header */}
            <div className={`${theme.btn} text-white px-4 py-3 flex items-center gap-2 shrink-0`}>
              <button onClick={goBack} className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold opacity-75 uppercase tracking-widest truncate flex items-center gap-1.5">
                  <span className="truncate">{crumb}</span>
                  {activeHw.date && (
                    <span className="bg-white/25 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide whitespace-nowrap shrink-0">
                      📅 {new Date(activeHw.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </p>
                <p className="font-black text-sm leading-tight truncate">{activeHw.title}</p>
              </div>
              {/* Save offline (HTML) — works for notes + MCQs in any mode incl. Competition */}
              <button
                onClick={async () => {
                  try {
                    const safeTitle = (activeHw.title || 'Homework').replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 60);
                    await downloadAsMHTML('hw-note-printable', `${safeTitle}_${new Date().toISOString().slice(0,10)}`, {
                      appName: settings?.appShortName || settings?.appName || 'IIC',
                      pageTitle: activeHw.title || 'Homework',
                      subtitle: 'Homework Notes',
                    });
                    showAlert('📥 Saved offline!', 'SUCCESS');
                  } catch (e) {
                    showAlert('Download failed. Please try again.', 'ERROR');
                  }
                }}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors"
                aria-label="Save this lesson offline"
                title="Save offline (HTML)"
              >
                <Download size={16} />
              </button>
              <span className="bg-white/20 text-white text-[11px] font-black px-2.5 py-1 rounded-full shrink-0">
                {flatIdx + 1}/{filteredHw.length}
              </span>
            </div>

            {/* CHOOSER OVERLAY — appears when both notes and MCQ exist and user hasn't picked yet */}
            {effectiveMode === 'choose' && (
              <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50">
                <div className="w-full max-w-md">
                  {/* App logo + name + developer + version */}
                  <div className="flex flex-col items-center mb-8">
                    {settings?.appLogo ? (
                      <img
                        src={settings.appLogo}
                        alt="App logo"
                        className="w-24 h-24 rounded-3xl object-cover shadow-md"
                      />
                    ) : (
                      <img
                        src="/pwa-192x192.png"
                        alt="App logo"
                        className="w-24 h-24 rounded-3xl object-cover shadow-md"
                      />
                    )}
                    <h2 className="mt-4 text-xl font-black text-slate-800 tracking-tight text-center">
                      {settings?.appName || 'IIC'}
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500 font-semibold">
                      Developed by {settings?.developerName?.trim() || 'Nadim Anwar'}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      v{APP_VERSION}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setHwViewMode('notes')}
                      className={`bg-white border-2 ${theme.border} rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md active:scale-[0.98] transition-all`}
                    >
                      <div className={`w-14 h-14 rounded-2xl ${theme.bgSoft} ${theme.text} flex items-center justify-center`}>
                        <BookOpen size={26} />
                      </div>
                      <p className={`font-black text-base ${theme.textDeep}`}>Notes</p>
                    </button>
                    <button
                      onClick={() => setHwViewMode('mcq')}
                      className="bg-white border-2 border-emerald-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md active:scale-[0.98] transition-all"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CheckSquare size={26} />
                      </div>
                      <p className="font-black text-base text-emerald-800">MCQ</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable content */}
            {effectiveMode !== 'choose' && (
            <div
              ref={hwScrollContainerRef}
              className="flex-1 overflow-y-auto"
              onScroll={(e) => {
                const t = e.currentTarget;
                const max = t.scrollHeight - t.clientHeight;
                const pct = max > 0 ? Math.min(100, Math.max(0, (t.scrollTop / max) * 100)) : 0;
                setHwScrollProgress(pct);
                if (hwScrollRestoredRef.current && activeHw.id && effectiveMode === 'notes') {
                  if (hwScrollSaveTimerRef.current) window.clearTimeout(hwScrollSaveTimerRef.current);
                  const yNow = t.scrollTop;
                  const pctNow = pct;
                  const key = `nst_hw_scroll_${activeHw.id}`;
                  hwScrollSaveTimerRef.current = window.setTimeout(() => {
                    try {
                      if (yNow > 20) {
                        localStorage.setItem(key, String(Math.round(yNow)));
                        saveRecentHomework({
                          id: activeHw.id!,
                          scrollY: Math.round(yNow),
                          scrollPct: Math.round(pctNow),
                          title: activeHw.title || 'Homework',
                          date: activeHw.date,
                          targetSubject: activeHw.targetSubject,
                          hw: activeHw,
                        });
                        markReadToday(activeHw.id!);
                      } else {
                        localStorage.removeItem(key);
                      }
                    } catch {}
                  }, 400);
                }
              }}
            >
              {/* NOTES MODE */}
              {effectiveMode === 'notes' && (
                <>
                  {/* Top header row with switch-to-MCQ button (mirrors MCQ mode's top row) */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest flex items-center gap-1`}>
                      <BookOpen size={11} /> Notes
                    </p>
                    {hasMcq && (
                      <button
                        onClick={() => setHwViewMode('mcq')}
                        className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all"
                      >
                        MCQ ({activeHw.parsedMcqs!.length}) <ChevronRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Topic continuation banner */}
                  {continuationPages.length > 0 && (
                    <div className="mx-4 mb-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <span className="text-base shrink-0">📌</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-indigo-800 leading-tight">
                          Yeh topic {continuationPages.length + 1} pages mein hai
                        </p>
                        <p className="text-[10px] text-indigo-600 leading-tight">
                          Saare pages ke notes mila ke ek saath dikh rahe hain — topic poora hone tak
                        </p>
                      </div>
                    </div>
                  )}

                  {hasNotes && (
                    <div className="px-4 pb-2">
                      <ChunkedNotesReader
                        content={combinedNotes}
                        topBarLabel={activeHw.title}
                        searchQuery={pendingReadQuery}
                        getStarCount={getNoteStarCount}
                        initialIndex={activeHw.id ? hwNotePositions[activeHw.id] ?? null : null}
                        onPositionChange={(idx) => {
                          if (!activeHw.id) return;
                          setHwNotePositions(prev =>
                            prev[activeHw.id!] === idx ? prev : { ...prev, [activeHw.id!]: idx }
                          );
                          // Persist topicIndex so Continue Reading can resume from here
                          try {
                            saveRecentHomework({
                              id: activeHw.id,
                              scrollY: 0,
                              scrollPct: Math.max(2, Math.round(hwScrollProgress)),
                              title: activeHw.title || 'Homework',
                              date: activeHw.date,
                              targetSubject: activeHw.targetSubject,
                              hw: activeHw,
                              topicIndex: idx,
                            });
                          } catch {}
                        }}
                        // The moment Read All / tap-to-read starts, save this note to
                        // Continue Reading so it survives a tab switch (see nav handler).
                        onReadingStart={() => {
                          if (!activeHw.id) return;
                          try {
                            saveRecentHomework({
                              id: activeHw.id,
                              scrollY: 0,
                              scrollPct: Math.max(2, Math.round(hwScrollProgress)),
                              title: activeHw.title || 'Homework',
                              date: activeHw.date,
                              targetSubject: activeHw.targetSubject,
                              hw: activeHw,
                              topicIndex: hwNotePositions[activeHw.id] ?? 0,
                            });
                            markReadToday(activeHw.id);
                          } catch {}
                        }}
                        // When TTS finishes the LAST topic, mark this note as fully read
                        // so the History page can show a green Done badge.
                        onComplete={() => {
                          if (!activeHw.id) return;
                          try {
                            markNoteFullyRead({
                              id: activeHw.id,
                              kind: 'hw',
                              title: activeHw.title || 'Homework',
                              subtitle: activeHw.targetSubject || 'Homework',
                            });
                          } catch {}
                        }}
                        noteKey={activeHw.id ? `hw_${activeHw.id}` : undefined}
                        isStarred={activeHw.id ? (text) => isNoteTopicStarred(`hw_${activeHw.id}`, text) : undefined}
                        onStarToggle={activeHw.id ? (text) => toggleStarNote(
                          `hw_${activeHw.id}`,
                          text,
                          {
                            kind: 'homework',
                            hwId: activeHw.id,
                            lessonTitle: activeHw.title,
                            subject: activeHw.targetSubject,
                          }
                        ) : undefined}
                      />
                    </div>
                  )}

                  {/* Media Tiles: Audio / Video / PDF */}
                  {(activeHw.audioUrl || activeHw.videoUrl || activeHw.pdfUrl) && (
                    <div className="mx-4 mb-3">
                      <div className={`grid gap-2 ${[activeHw.audioUrl, activeHw.videoUrl, activeHw.pdfUrl].filter(Boolean).length === 1 ? 'grid-cols-1' : [activeHw.audioUrl, activeHw.videoUrl, activeHw.pdfUrl].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {activeHw.audioUrl && (
                          <button onClick={() => setHwAudioVisible(v => !v)}
                            className={`aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-95 transition-all border-2 ${hwAudioVisible ? 'bg-purple-100 border-purple-400' : 'bg-purple-50 border-purple-200'}`}>
                            <Headphones size={22} className="text-purple-600" />
                            <span className="text-[10px] font-black text-purple-700 uppercase tracking-wide">Audio</span>
                          </button>
                        )}
                        {activeHw.videoUrl && (
                          <button onClick={() => setHwVideoVisible(v => !v)}
                            className={`aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl active:scale-95 transition-all border-2 ${hwVideoVisible ? 'bg-rose-100 border-rose-400' : 'bg-rose-50 border-rose-200'}`}>
                            <Play size={22} className="text-rose-600" />
                            <span className="text-[10px] font-black text-rose-700 uppercase tracking-wide">Video</span>
                          </button>
                        )}
                        {activeHw.pdfUrl && (
                          <button onClick={() => setHwActivePdf(activeHw.pdfUrl!)}
                            className="aspect-square flex flex-col items-center justify-center gap-1.5 bg-amber-50 border-2 border-amber-200 rounded-2xl active:scale-95 transition-all">
                            <FileText size={22} className="text-amber-600" />
                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wide">PDF</span>
                          </button>
                        )}
                      </div>
                      {hwAudioVisible && activeHw.audioUrl && (
                        <div className="mt-2 bg-purple-50 border border-purple-100 rounded-2xl p-3">
                          <audio controls src={activeHw.audioUrl} className="w-full h-8" controlsList="nodownload noremoteplayback" />
                        </div>
                      )}
                      {hwVideoVisible && activeHw.videoUrl && (
                        <div className="mt-2 bg-black rounded-2xl overflow-hidden">
                          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe src={formatVideoEmbed(activeHw.videoUrl)} className="absolute inset-0 w-full h-full border-none" allow="autoplay; encrypted-media; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" title="Video" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full-screen in-app PDF viewer */}
                  {hwActivePdf && (
                    <div className="fixed inset-0 z-[300] bg-black flex flex-col" style={{ top: -14, left: 0, right: 0, bottom: 0 }}>
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 shrink-0">
                        <span className="text-white font-bold text-sm truncate pr-4">PDF</span>
                        <button onClick={() => setHwActivePdf(null)} className="text-white p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all shrink-0">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <iframe src={formatDriveLink(hwActivePdf)} className="w-full h-full border-none" title="PDF" sandbox="allow-scripts allow-same-origin allow-forms" allow="autoplay" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MCQ MODE */}
              {effectiveMode === 'mcq' && hasMcq && (
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest flex items-center gap-1`}>
                      <CheckSquare size={11} /> MCQ Practice · {activeHw.parsedMcqs!.length} questions
                    </p>
                    {hasNotes && (
                      <button
                        onClick={() => setHwViewMode('notes')}
                        className={`text-[11px] font-black ${theme.text} ${theme.bgSoft} px-3 py-1.5 rounded-full flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all`}
                      >
                        <ChevronRight size={12} className="rotate-180" /> Notes
                      </button>
                    )}
                  </div>
                  {/* T3/T4: Mode selector — Khud Banao · Sidha Answer · Flashcard.
                      All three modes share the same parsedMcqs source. */}
                  {(() => {
                    const hwModeKey = hwKey;
                    const hwMode = hwMcqMode[hwModeKey] || 'interactive';
                    return (
                      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 grid grid-cols-3 gap-1 shadow-sm mb-3">
                        <button
                          onClick={() => setHwMcqMode(prev => ({ ...prev, [hwModeKey]: 'interactive' }))}
                          className={`text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all ${
                            hwMode === 'interactive'
                              ? `${theme.btn} text-white shadow-sm`
                              : 'bg-transparent text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          📝 MCQ
                        </button>
                        <button
                          onClick={() => setHwMcqMode(prev => ({ ...prev, [hwModeKey]: 'reveal' }))}
                          className={`text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all ${
                            hwMode === 'reveal'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-transparent text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          💬 Q&amp;A
                        </button>
                        <button
                          onClick={() => {
                            setFlashcardMcqs({
                              items: (activeHw.parsedMcqs || []) as any,
                              title: activeHw.title || 'Homework MCQs',
                              subtitle: 'Flashcard Mode',
                              subject: activeHw.targetSubject || activeHw.subject || activeHw.subjectName || '—',
                            });
                          }}
                          className="text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95"
                        >
                          🃏 Flashcard
                        </button>
                      </div>
                    );
                  })()}
                  {/* TTS mode is now AUTO-tied to the practice mode chosen above:
                      • MCQ (Khud Banao)  → 'all' so the speaker reads question +
                        every option (answer hidden — student gets to attempt).
                      • Q&A (Sidha Answer) → 'qa' so the speaker reads question +
                        sahi jawab directly.
                      Flashcard mode launches FlashcardMcqView where tap-to-read
                      lives on the cards themselves. No manual toggle needed. */}
                  <div className="space-y-3">
                    {activeHw.parsedMcqs!.map((mcq, qi) => {
                      const ansKey = `${hwKey}_${qi}`;
                      const hwMode = hwMcqMode[hwKey] || 'interactive';
                      const selected = hwAnswers[ansKey];
                      // In reveal mode, treat all questions as "answered correctly" so the
                      // correct option is highlighted and the explanation is visible without
                      // any tap. The student can flip to Khud Banao any time to actually quiz.
                      const isRevealMode = hwMode === 'reveal';
                      const showResult = isRevealMode || selected !== undefined;
                      // Per-question speaker mode is derived from practice mode.
                      const cardTtsMode: 'qa' | 'all' = isRevealMode ? 'qa' : 'all';
                      return (
                        <div key={qi} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <p className="text-sm font-bold text-slate-800 leading-snug flex-1">{qi + 1}. {mcq.question}</p>
                            <McqSpeakButtons
                              question={mcq.question}
                              options={mcq.options}
                              correctAnswer={mcq.correctAnswer}
                              className="shrink-0"
                              mode={cardTtsMode}
                            />
                          </div>
                          <div className="space-y-2">
                            {mcq.options.map((opt, oi) => {
                              const isSelected = selected === oi;
                              const isCorrect = mcq.correctAnswer === oi;
                              return (
                                <button
                                  key={oi}
                                  disabled={isRevealMode}
                                  onClick={() => {
                                    if (isRevealMode || selected !== undefined) return;
                                    setHwAnswers(prev => ({ ...prev, [ansKey]: oi }));
                                    // Voice feedback on a wrong choice — speaks the
                                    // correct answer in Hinglish so the student gets
                                    // immediate audible confirmation. Right answer stays
                                    // silent (the green tick + colour change is enough).
                                    if (!isCorrect) {
                                      const correctLetter = String.fromCharCode(65 + mcq.correctAnswer);
                                      const correctText = (mcq.options[mcq.correctAnswer] || '')
                                        .replace(/<[^>]+>/g, ' ')
                                        .replace(/\s+/g, ' ')
                                        .trim();
                                      stopSpeech();
                                      speakText(
                                        `Galat answer. Sahi answer ye hai: Option ${correctLetter}, ${correctText}.`,
                                        null,
                                        1.0,
                                        'hi-IN',
                                      ).catch(() => {});
                                    }
                                  }}
                                  className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border-2 transition-all font-medium ${showResult
                                    ? (isCorrect ? 'bg-green-50 border-green-400 text-green-800 font-bold'
                                      : isSelected ? 'bg-red-50 border-red-400 text-red-800'
                                      : 'bg-slate-50 border-slate-200 text-slate-500')
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                                  <span className="font-black mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                                  {showResult && isCorrect && <span className="ml-2 text-green-700">✅</span>}
                                </button>
                              );
                            })}
                          </div>
                          {(isRevealMode || selected !== undefined) && mcq.explanation && (
                            <p className="text-xs text-slate-600 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                              <span className="font-black text-amber-700">💡 Explanation:</span> {mcq.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Score Summary — appears at the bottom of the MCQ list. Updates live as the
                      student answers; hides while nothing is attempted to avoid a "0/0" empty state. */}
                  {(() => {
                    const total = activeHw.parsedMcqs!.length;
                    let attempted = 0, correct = 0;
                    activeHw.parsedMcqs!.forEach((mcq, qi) => {
                      const sel = hwAnswers[`${hwKey}_${qi}`];
                      if (sel !== undefined) {
                        attempted++;
                        if (sel === mcq.correctAnswer) correct++;
                      }
                    });
                    if (attempted === 0) return null;
                    const wrong = attempted - correct;
                    const pct = Math.round((correct / total) * 100);
                    const allDone = attempted === total;
                    const grade = pct >= 80 ? { label: 'Excellent! 🌟', color: 'from-emerald-500 to-green-500', text: 'text-emerald-700', ring: 'ring-emerald-200' }
                                : pct >= 60 ? { label: 'Good 👍', color: 'from-blue-500 to-indigo-500', text: 'text-blue-700', ring: 'ring-blue-200' }
                                : pct >= 40 ? { label: 'Keep practising 💪', color: 'from-amber-500 to-orange-500', text: 'text-amber-700', ring: 'ring-amber-200' }
                                : { label: 'Need more practice 📚', color: 'from-rose-500 to-red-500', text: 'text-rose-700', ring: 'ring-rose-200' };
                    return (
                      <div className={`mt-5 bg-white rounded-3xl border-2 ring-4 ${grade.ring} ${theme.border} shadow-lg overflow-hidden`}>
                        <div className={`bg-gradient-to-r ${grade.color} px-5 py-3 text-white`}>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-90">📊 Score Summary</p>
                            {allDone && <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full">Complete</span>}
                          </div>
                          <div className="flex items-end gap-2 mt-1">
                            <span className="text-4xl font-black leading-none">{pct}%</span>
                            <span className="text-sm font-bold opacity-90 mb-1">({correct}/{total})</span>
                          </div>
                          <p className="text-xs font-bold opacity-90 mt-1">{grade.label}</p>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-100">
                          <div className="px-3 py-3 text-center">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Attempted</p>
                            <p className="text-lg font-black text-slate-800 mt-0.5">{attempted}<span className="text-xs text-slate-400">/{total}</span></p>
                          </div>
                          <div className="px-3 py-3 text-center">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">✓ Sahi</p>
                            <p className="text-lg font-black text-emerald-700 mt-0.5">{correct}</p>
                          </div>
                          <div className="px-3 py-3 text-center">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">✗ Galat</p>
                            <p className="text-lg font-black text-rose-700 mt-0.5">{wrong}</p>
                          </div>
                        </div>
                        {!allDone && (
                          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                            <p className="text-[11px] font-bold text-slate-500 text-center">{total - attempted} question{total - attempted === 1 ? '' : 's'} left — try them all!</p>
                          </div>
                        )}
                        {allDone && (
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                            <button
                              onClick={() => {
                                setHwAnswers(prev => {
                                  const next = { ...prev };
                                  activeHw.parsedMcqs!.forEach((_m, qi) => { delete next[`${hwKey}_${qi}`]; });
                                  return next;
                                });
                              }}
                              className={`flex-1 text-[12px] font-black ${theme.text} ${theme.bgSoft} py-2 rounded-xl active:scale-95 transition-all`}
                            >
                              🔄 Phir se Try Karo
                            </button>
                            {effectiveNextHw && (
                              <button
                                onClick={() => goToHw(effectiveNextHw)}
                                className={`flex-1 text-[12px] font-black text-white ${theme.btn} ${theme.btnHover} py-2 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1`}
                              >
                                Next Topic <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {!effectiveNextHw && (
                <p className="text-center text-xs text-slate-400 font-bold py-6">🎉 All notes complete!</p>
              )}
            </div>
            )}

            {/* Fixed bottom nav (hidden in chooser mode) */}
            {effectiveMode !== 'choose' && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 flex items-center gap-3">
              <button
                disabled={!prevHw}
                onClick={() => prevHw && goToHw(prevHw)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${prevHw ? `border-2 ${theme.border} ${theme.text} hover:${theme.bgSoft} active:scale-95` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <ChevronRight size={16} className="rotate-180" /> Prev
              </button>
              <button
                disabled={!effectiveNextHw}
                onClick={() => effectiveNextHw && goToHw(effectiveNextHw)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${effectiveNextHw ? `${theme.btn} ${theme.btnHover} text-white shadow-md active:scale-95` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                Next Topic <ChevronRight size={16} />
              </button>
            </div>
            )}
          </div>
        );
      }

      // ============== WEEK VIEW (7-day list inside selected week) ==============
      if (hwYear !== null && hwMonth !== null && hwWeek !== null) {
        const weekHw = filteredHw.filter(hw => {
          const d = new Date(hw.date);
          return d.getFullYear() === hwYear && d.getMonth() === hwMonth && getWeekOfMonth(d) === hwWeek;
        });
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{crumb}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>Week {hwWeek}</h2>
                </div>
              </div>
              <div className="space-y-3">
                {weekHw.map((hw, idx) => {
                  const d = new Date(hw.date);
                  const dayName = d.toLocaleDateString('default', { weekday: 'long' });
                  const openHw = () => {
                    // For MCQ subject, jump directly into the full-screen player
                    if (homeworkSubjectView === 'mcq' && ((hw.parsedMcqs && hw.parsedMcqs.length > 0) || hw.notes)) {
                      setHomeworkPlayerHwId(hw.id || String(idx));
                      setPlayerCurrentIndex(0);
                      setPlayerIsReadingAll(false);
                      setPlayerRevealAll(true);
                    } else {
                      setHwActiveHwId(hw.id || '');
                    }
                  };
                  return (
                    <button
                      key={hw.id || idx}
                      onClick={openHw}
                      className={`w-full text-left bg-white border-2 ${theme.border} rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]`}
                    >
                      <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0`}>
                        <span className="text-xl font-black leading-none">{d.getDate()}</span>
                        <span className="text-[9px] font-bold uppercase mt-0.5">{dayName.slice(0,3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{dayName}</p>
                        <p className="font-black text-slate-800 text-sm leading-snug truncate">{hw.title}</p>
                        <div className="flex gap-1 mt-1">
                          {hw.notes && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>NOTES</span>}
                          {hw.parsedMcqs && hw.parsedMcqs.length > 0 && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>{hw.parsedMcqs.length} MCQ</span>}
                          {hw.audioUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>AUDIO</span>}
                          {hw.videoUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>VIDEO</span>}
                          {hw.pdfUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>PDF</span>}
                        </div>
                      </div>
                      <ChevronRight size={18} className={`${theme.text} shrink-0`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // ============== MONTH VIEW (date-wise notes inside selected month) ==============
      // Note: We skip the intermediate "Week" step entirely — the user goes
      // Year → Month → Date directly. Each date with a note is shown as its own card.
      if (hwYear !== null && hwMonth !== null) {
        const monthHw = filteredHw
          .filter(hw => {
            const d = new Date(hw.date);
            return d.getFullYear() === hwYear && d.getMonth() === hwMonth;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{crumb}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>{monthNames[hwMonth]} {hwYear}</h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{monthHw.length} {monthHw.length === 1 ? 'note' : 'notes'} added</p>
                </div>
              </div>
              {monthHw.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-12">No notes for this month.</div>
              ) : (
                <div className="space-y-3">
                  {monthHw.map((hw, idx) => {
                    const d = new Date(hw.date);
                    const dayName = d.toLocaleDateString('default', { weekday: 'long' });
                    const openHw = () => {
                      if (homeworkSubjectView === 'mcq' && ((hw.parsedMcqs && hw.parsedMcqs.length > 0) || hw.notes)) {
                        setHomeworkPlayerHwId(hw.id || String(idx));
                        setPlayerCurrentIndex(0);
                        setPlayerIsReadingAll(false);
                        setPlayerRevealAll(true);
                      } else {
                        setHwActiveHwId(hw.id || '');
                      }
                    };
                    return (
                      <button
                        key={hw.id || idx}
                        onClick={openHw}
                        className={`w-full text-left bg-white border-2 ${theme.border} rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]`}
                      >
                        <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0`}>
                          <span className="text-xl font-black leading-none">{d.getDate()}</span>
                          <span className="text-[9px] font-bold uppercase mt-0.5">{dayName.slice(0,3)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{dayName}</p>
                          <p className="font-black text-slate-800 text-sm leading-snug truncate">{hw.title}</p>
                          <div className="flex gap-1 mt-1">
                            {hw.notes && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>NOTES</span>}
                            {hw.parsedMcqs && hw.parsedMcqs.length > 0 && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>{hw.parsedMcqs.length} MCQ</span>}
                            {hw.audioUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>AUDIO</span>}
                            {hw.videoUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>VIDEO</span>}
                            {hw.pdfUrl && <span className={`text-[9px] font-bold ${theme.chip} px-1.5 py-0.5 rounded`}>PDF</span>}
                          </div>
                        </div>
                        <ChevronRight size={18} className={`${theme.text} shrink-0`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }

      // ============== YEAR VIEW (months inside selected year) ==============
      if (hwYear !== null) {
        const yearHw = filteredHw.filter(hw => new Date(hw.date).getFullYear() === hwYear);
        const monthsMap = new Map<number, number>();
        yearHw.forEach(hw => {
          const m = new Date(hw.date).getMonth();
          monthsMap.set(m, (monthsMap.get(m) || 0) + 1);
        });
        const months = Array.from(monthsMap.entries()).sort((a,b) => a[0]-b[0]);
        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{subjectLabel[homeworkSubjectView] || homeworkSubjectView}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>{hwYear}</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {months.map(([m, count]) => (
                  <button
                    key={m}
                    onClick={() => setHwMonth(m)}
                    className={`bg-white border-2 ${theme.border} rounded-2xl p-4 text-center hover:shadow-md transition-all active:scale-[0.98]`}
                  >
                    <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-2`}>
                      {monthNames[m].slice(0,3)}
                    </div>
                    <p className={`text-sm font-black ${theme.textDeep}`}>{monthNames[m]}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{count} {count === 1 ? 'note' : 'notes'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ============== ROOT FLAT PAGE-WISE LIST (Sar Sangrah / Speedy / Custom Books) ==============
      // For book subjects students expect a flat list ordered by page number — like
      // flipping through the printed book — instead of date-based Year/Month/Week
      // navigation used for MCQ and standard homework. Items without a pageNo are
      // appended at the end in date order so legacy entries are still reachable.
      // A top toggle lets the student switch to "By Date" (Year → Month → notes
      // sorted by date) — useful when reading the same notes through the
      // Homework page mental model.
      const renderBookViewToggle = () => (
        <div className={`bg-white border-2 ${theme.border} rounded-2xl p-1 flex gap-1 mb-4 shadow-sm`}>
          <button
            onClick={() => setHwBookViewMode('page')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${hwBookViewMode === 'page' ? `${theme.btn} text-white shadow` : `${theme.text} hover:${theme.bgSoft}`}`}
          >
            <BookOpen size={14} /> By Page
          </button>
          <button
            onClick={() => setHwBookViewMode('date')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${hwBookViewMode === 'date' ? `${theme.btn} text-white shadow` : `${theme.text} hover:${theme.bgSoft}`}`}
          >
            <Calendar size={14} /> By Date
          </button>
        </div>
      );

      if (isPageWiseSubject && hwBookViewMode === 'page' && hwYear === null && hwMonth === null) {
        // BY PAGE shows ALL pages of the book sorted by pageNo. Year/Month
        // filter lives in BY DATE mode (where it makes contextual sense).
        const withPage = filteredHw.filter(hw => {
          const n = parseInt(String((hw as any).pageNo ?? ''), 10);
          return Number.isFinite(n);
        });
        const withoutPage = filteredHw.filter(hw => {
          const n = parseInt(String((hw as any).pageNo ?? ''), 10);
          return !Number.isFinite(n);
        });

        return (
          <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`} aria-label="Back">
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-xl font-black ${theme.textDeep} truncate`}>{subjectLabel[homeworkSubjectView] || homeworkSubjectView}</h2>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                    📖 Page-wise · {filteredHw.length} {filteredHw.length === 1 ? 'note' : 'notes'}
                  </p>
                </div>
              </div>
              {renderBookViewToggle()}

              {filteredHw.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <BookOpen size={36} className={`${theme.text} mx-auto mb-2 opacity-60`} />
                  <p className="text-sm font-bold text-slate-600">Abhi koi note add nahi hua</p>
                  <p className="text-[11px] text-slate-400 mt-1">Admin jab is book me page add karega, yahaan dikhega.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {withPage.map((hw) => {
                    const pageNum = parseInt(String((hw as any).pageNo ?? ''), 10);
                    const mcqCount = Array.isArray((hw as any).mcqs) ? (hw as any).mcqs.length : 0;
                    const d = new Date(hw.date);
                    const monthYear = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                    return (
                      <button
                        key={hw.id}
                        onClick={() => setHwActiveHwId(hw.id || null)}
                        className={`w-full bg-white border-2 ${theme.border} rounded-2xl p-3 text-left hover:shadow-md transition-all active:scale-[0.99] flex items-center gap-3`}
                      >
                        <div className={`${theme.bgSoft} ${theme.textDeep} w-14 h-14 rounded-xl shrink-0 flex flex-col items-center justify-center`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">Page</span>
                          <span className="text-lg font-black leading-none">{pageNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black ${theme.textDeep} truncate`}>{hw.title || `Page ${pageNum}`}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {mcqCount > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.chip}`}>{mcqCount} MCQ</span>
                            )}
                            <span className={`text-[10px] font-bold ${theme.text} bg-slate-50 px-1.5 py-0.5 rounded`}>{monthYear}</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className={theme.text} />
                      </button>
                    );
                  })}

                  {withoutPage.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1 px-1">Without page number</p>
                      {withoutPage.map((hw) => {
                        const mcqCount = Array.isArray((hw as any).mcqs) ? (hw as any).mcqs.length : 0;
                        const d = new Date(hw.date);
                        const monthYear = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                        return (
                          <button
                            key={hw.id}
                            onClick={() => setHwActiveHwId(hw.id || null)}
                            className={`w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-left hover:shadow-md transition-all active:scale-[0.99] flex items-center gap-3`}
                          >
                            <div className="bg-slate-100 text-slate-600 w-14 h-14 rounded-xl shrink-0 flex items-center justify-center">
                              <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-700 truncate">{hw.title || 'Untitled'}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {mcqCount > 0 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.chip}`}>{mcqCount} MCQ</span>
                                )}
                                <span className={`text-[10px] font-bold ${theme.text} bg-slate-50 px-1.5 py-0.5 rounded`}>{monthYear}</span>
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400" />
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      // ============== ROOT MONTH-YEAR LIST (flat — skips standalone Year step) ==============
      // Earlier the BY DATE root showed a Year card → Month list → Notes. The Year
      // step added little value when most books only have one or two years of
      // entries. Now we render a single flat list of "Month YYYY" cards (e.g.
      // "May 2026 — 5 notes"). Tapping a card sets BOTH hwYear and hwMonth and
      // jumps straight to the existing month → date-sorted notes view.
      const monthYearAvailable = (() => {
        // Years that actually have notes (used to populate the Year filter dropdown).
        const yearsSet = new Set<number>();
        filteredHw.forEach(hw => yearsSet.add(new Date(hw.date).getFullYear()));
        return Array.from(yearsSet).sort((a, b) => b - a);
      })();
      const monthsForFilterYear = bookFilterYear === null
        ? Array.from(new Set(filteredHw.map(hw => new Date(hw.date).getMonth()))).sort((a, b) => a - b)
        : Array.from(new Set(
            filteredHw
              .filter(hw => new Date(hw.date).getFullYear() === bookFilterYear)
              .map(hw => new Date(hw.date).getMonth())
          )).sort((a, b) => a - b);

      const passesDateFilter = (hw: any) => {
        const d = new Date(hw.date);
        if (bookFilterYear !== null && d.getFullYear() !== bookFilterYear) return false;
        if (bookFilterMonth !== null && d.getMonth() !== bookFilterMonth) return false;
        return true;
      };

      // Build "yyyy-mm" → { year, month, count } map of all distinct month-year
      // buckets present in the filtered data.
      const monthYearMap = new Map<string, { year: number; month: number; count: number }>();
      filteredHw.filter(passesDateFilter).forEach(hw => {
        const d = new Date(hw.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        const cur = monthYearMap.get(key);
        if (cur) cur.count++;
        else monthYearMap.set(key, { year: d.getFullYear(), month: d.getMonth(), count: 1 });
      });
      // Newest first (descending year, then descending month).
      const monthYearList = Array.from(monthYearMap.values()).sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });
      const dateFilterActive = bookFilterYear !== null || bookFilterMonth !== null;

      return (
        <div className={`min-h-[100dvh] ${theme.bg} p-4 pt-2`}>
          <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <h2 className={`text-xl font-black ${theme.textDeep}`}>{subjectLabel[homeworkSubjectView] || homeworkSubjectView}</h2>
            </div>
            {/* Page-wise subjects also offer "By Page" mode here so the user can flip
                back to the flat page-number list without going to the home grid. */}
            {isPageWiseSubject && renderBookViewToggle()}

            {/* === Year / Month filter (BY DATE only) ===
                Lets the student narrow down the month list — useful when a book
                spans many months/years. Year filter populates Month filter. */}
            {isPageWiseSubject && filteredHw.length > 0 && (
              <div className={`bg-white border-2 ${theme.border} rounded-2xl p-2 mb-3 flex items-center gap-2`}>
                <span className={`text-[10px] font-black uppercase tracking-wider ${theme.text} pl-1 shrink-0`}>Filter</span>
                <select
                  value={bookFilterYear === null ? 'all' : String(bookFilterYear)}
                  onChange={e => {
                    const v = e.target.value;
                    const newYear = v === 'all' ? null : parseInt(v, 10);
                    setBookFilterYear(newYear);
                    // Reset month if it doesn't exist in the newly chosen year.
                    if (newYear !== null && bookFilterMonth !== null) {
                      const monthsInNewYear = new Set(
                        filteredHw.filter(hw => new Date(hw.date).getFullYear() === newYear).map(hw => new Date(hw.date).getMonth())
                      );
                      if (!monthsInNewYear.has(bookFilterMonth)) setBookFilterMonth(null);
                    }
                  }}
                  className={`flex-1 min-w-0 text-xs font-bold ${theme.textDeep} bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-slate-400`}
                >
                  <option value="all">All Years</option>
                  {monthYearAvailable.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={bookFilterMonth === null ? 'all' : String(bookFilterMonth)}
                  onChange={e => {
                    const v = e.target.value;
                    setBookFilterMonth(v === 'all' ? null : parseInt(v, 10));
                  }}
                  className={`flex-1 min-w-0 text-xs font-bold ${theme.textDeep} bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-slate-400`}
                >
                  <option value="all">All Months</option>
                  {monthsForFilterYear.map(m => (
                    <option key={m} value={m}>{monthNames[m]}</option>
                  ))}
                </select>
                {dateFilterActive && (
                  <button
                    type="button"
                    onClick={() => { setBookFilterYear(null); setBookFilterMonth(null); }}
                    className={`shrink-0 text-[10px] font-black uppercase tracking-wider ${theme.text} hover:${theme.bgSoft} rounded-lg px-2 py-1.5`}
                    aria-label="Clear filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {lucentSectionEl}

            {filteredHw.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Calendar size={36} className={`${theme.text} mx-auto mb-2 opacity-60`} />
                <p className="text-sm font-bold text-slate-600">Abhi koi note add nahi hua</p>
              </div>
            ) : monthYearList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Is filter ke liye koi note nahi mila</p>
                <p className="text-[11px] text-slate-400 mt-1">Year ya Month change karke try karein.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {monthYearList.map(({ year, month, count }) => (
                  <button
                    key={`${year}-${month}`}
                    onClick={() => { setHwYear(year); setHwMonth(month); }}
                    className={`bg-white border-2 ${theme.border} rounded-2xl p-4 text-left hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3`}
                  >
                    <div className={`${theme.bgSoft} ${theme.textDeep} w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{monthNames[month].slice(0, 3)}</span>
                      <span className="text-base font-black leading-none mt-0.5">{year}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-black ${theme.textDeep}`}>{monthNames[month]} {year}</p>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">{count} {count === 1 ? 'note' : 'notes'}</p>
                    </div>
                    <ChevronRight size={18} className={`${theme.text}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // LUCENT BOOK CATEGORY VIEW
    if (lucentCategoryView && contentViewStep === "SUBJECTS") {
      // Helper: min page number of an entry
      const _minPgBook = (n: LucentNoteEntry): number => {
        let m = Infinity;
        (n.pages || []).forEach(p => { const x = parseInt(p.pageNo || '', 10); if (!isNaN(x) && x < m) m = x; });
        return m === Infinity ? 99999 : m;
      };
      // All COMPETITION-level admin notes
      const competitionNotes = ((settings?.lucentNotes || []) as LucentNoteEntry[])
        .filter(n => !n.classLevel || n.classLevel === 'COMPETITION');
      // Unique book names — entries with no bookName fall under 'Lucent'
      const uniqueBooks: string[] = Array.from(
        new Set(competitionNotes.map(n => (n.bookName?.trim()) || 'Lucent'))
      ).sort((a, b) => a === 'Lucent' ? -1 : b === 'Lucent' ? 1 : a.localeCompare(b));

      const BOOK_THEME: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
        'Lucent':               { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', emoji: '📘' },
        'Speedy Science':       { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   emoji: '🔬' },
        'Speedy Social Science':{ bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', emoji: '🌏' },
        'Sar Sangrah':          { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   emoji: '📕' },
      };
      const defaultTheme = { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', emoji: '📗' };

      // STEP 1 — Book selection screen
      if (selectedLucentBook === null) {
        return (
          <div className="p-4 pt-2 max-w-3xl mx-auto pb-8 animate-in fade-in">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setLucentCategoryView(false); setSelectedSubject(null); }} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-700">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800">📚 Books</h2>
                <p className="text-xs text-slate-500">Ek book choose karo</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {uniqueBooks.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="font-bold text-slate-600">Abhi koi notes nahi hain</p>
                  <p className="text-xs mt-1">Admin ne notes add kiye baad mein yahan aayenge.</p>
                </div>
              ) : uniqueBooks.map(bookName => {
                const count = competitionNotes.filter(n => (n.bookName?.trim() || 'Lucent') === bookName).length;
                const theme = BOOK_THEME[bookName] || defaultTheme;
                return (
                  <button key={bookName} onClick={() => {
                    setSelectedLucentBook(bookName);
                    if (bookName !== 'Lucent') {
                      // Non-Lucent books: skip subject step, show all lessons directly
                      const bookNotes = competitionNotes
                        .filter(n => (n.bookName?.trim() || 'Lucent') === bookName)
                        .sort((a, b) => _minPgBook(a) - _minPgBook(b));
                      const directChapters: Chapter[] = bookNotes.map(n => {
                        const mp = _minPgBook(n);
                        return {
                          id: `lucent_admin_${n.id}`,
                          title: n.lessonTitle,
                          description: `${theme.emoji} ${bookName} • ${n.pages.length} page${n.pages.length === 1 ? '' : 's'}`,
                          pageNo: mp < 99999 ? String(mp) : undefined,
                        };
                      });
                      setChapters(directChapters);
                      setLoadingChapters(false);
                      setSelectedSubject({ id: bookName.toLowerCase().replace(/\s+/g, '_'), name: bookName, icon: 'book', color: `${theme.bg} ${theme.text}` });
                      setContentViewStep("CHAPTERS");
                    }
                    // For 'Lucent': stay on SUBJECTS — LUCENT_CATEGORIES grid will render next
                  }} className={`${theme.bg} border-2 ${theme.border} p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all active:scale-95 text-left`}>
                    <div className={`w-12 h-12 rounded-xl ${theme.bg} ${theme.border} border flex items-center justify-center text-2xl`}>
                      {theme.emoji}
                    </div>
                    <div className="flex-1">
                      <p className={`font-black text-base ${theme.text}`}>{bookName}</p>
                      <p className="text-xs text-slate-500">{count} lesson{count !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // STEP 2 — Subject categories (only for 'Lucent' book)
      return (
        <div className="p-4 pt-2 max-w-3xl mx-auto pb-8 animate-in fade-in">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setSelectedLucentBook(null); setSelectedSubject(null); }} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-700">
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800">{selectedLucentBook}</h2>
              <p className="text-xs text-slate-500">Subject chuniye</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {LUCENT_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => {
                setLucentCategoryView(false);
                setSelectedLucentBook(null);
                setSelectedSubject(cat);
                setContentViewStep("CHAPTERS");
                setSelectedChapter(null);
                setLoadingChapters(true);
                const lang = (activeSessionBoard || user.board) === "BSEB" ? "Hindi" : "English";
                const _minPg = (n: LucentNoteEntry): number => {
                  let m = Infinity;
                  (n.pages || []).forEach(p => {
                    const x = parseInt(p.pageNo || '', 10);
                    if (!isNaN(x) && x < m) m = x;
                  });
                  return m === Infinity ? 99999 : m;
                };
                // Only include entries belonging to 'Lucent' book
                const adminLucentLessons: Chapter[] = ((settings?.lucentNotes || []) as LucentNoteEntry[])
                  .filter(n => n.subject === cat.id && (n.bookName?.trim() || 'Lucent') === 'Lucent')
                  .sort((a, b) => _minPg(a) - _minPg(b))
                  .map(n => {
                    const mp = _minPg(n);
                    return {
                      id: `lucent_admin_${n.id}`,
                      title: n.lessonTitle,
                      description: `📘 Admin Notes • ${n.pages.length} page${n.pages.length === 1 ? '' : 's'}`,
                      pageNo: mp < 99999 ? String(mp) : undefined,
                    };
                  });
                const hideSyllabus = settings?.hideLucentSyllabus !== false;
                if (hideSyllabus) {
                  setChapters(adminLucentLessons);
                  setLoadingChapters(false);
                } else {
                  fetchChapters(activeSessionBoard || user.board || "CBSE", 'COMPETITION', user.stream || "Science", cat, lang).then((data) => {
                    const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title));
                    setChapters([...adminLucentLessons, ...sorted]);
                    setLoadingChapters(false);
                  });
                }
              }} className={`${cat.color.split(' ')[0]} border-2 ${cat.color.split(' ')[0].replace('bg-', 'border-').replace('50', '200')} p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all active:scale-95 text-left`}>
                <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center text-xl font-black`}>
                  {cat.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className={`font-black text-base ${cat.color.split(' ')[1]}`}>{cat.name.split('(')[1]?.replace(')', '') || cat.name}</p>
                  <p className="text-xs text-slate-500">{cat.name.split('(')[0].trim()}</p>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (contentViewStep === "CHAPTERS") {
      return (
        <ChapterSelection
          chapters={chapters}
          subject={
            selectedSubject || {
              id: "all",
              name: "All Subjects",
              icon: "Book",
              color: "bg-slate-100",
            }
          }
          classLevel={activeSessionClass || user.classLevel || "10"}
          loading={loadingChapters}
          user={user}
          settings={settings}
          onSelect={(chapter) => {
            // Admin-added Lucent lessons → open page-wise notes viewer
            if (chapter.id && chapter.id.startsWith('lucent_admin_')) {
              const noteId = chapter.id.replace('lucent_admin_', '');
              const entry = (settings?.lucentNotes || []).find(n => n.id === noteId);
              if (entry) {
                setLucentNoteViewer(entry);
                setLucentPageIndex(0);
                return;
              }
            }
            if (directActionTarget) {
              // Bypass popup and directly open target
              let targetTab = directActionTarget;
              if (
                directActionTarget === "DEEP_DIVE" ||
                directActionTarget === "PREMIUM"
              ) {
                targetTab = "PDF";
              }
              setSelectedChapter(chapter);
              setContentViewStep("PLAYER");
              onTabChange(targetTab as any);
            } else if (contentTypePref !== "ALL") {
              // BYPASS MODAL - user picked a specific content type on home page
              setSelectedChapter(chapter);
              setContentViewStep("PLAYER");
              onTabChange(contentTypePref as any);
              setFullScreen(true);
            } else {
              // OPEN MODAL INSTEAD OF PLAYER
              setSelectedLessonForModal(chapter);
              setShowLessonModal(true);
            }
          }}
          onBack={goBack}
        />
      );
    }

    if (contentViewStep === "PLAYER" && selectedChapter) {
      const contentProps = {
        subject: selectedSubject || {
          id: "all",
          name: "All Subjects",
          icon: "Book",
          color: "bg-slate-100",
        },
        board: activeSessionBoard || user.board || "CBSE",
        classLevel: activeSessionClass || user.classLevel || "10",
        stream: user.stream || "Science",
        onUpdateUser: handleUserUpdate,
      };

      if (type === "VIDEO")
        return (
          <VideoPlaylistView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            {...contentProps}
          />
        );
      if (type === "PDF")
        return (
          <PdfView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            hideHeader={isLandscapeUiHidden}
            // Lucent-style cross-tab switching: lets the student jump from
            // Notes (PdfView) → MCQ (McqView) without going back to the modal.
            onSwitchToMcq={() => handleLessonOption('MCQ')}
            onSwitchToFlashcard={() => handleLessonOption('FLASHCARD')}
            {...contentProps}
          />
        );
      if (type === "MCQ")
        return (
          <McqView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            // Lucent-style cross-tab switching: from MCQ → Notes (PdfView).
            onSwitchToNotes={() => handleLessonOption('PDF')}
            onShareToCommunity={(mcq) => { setMcqCommunityDraft(mcq); setShowMcqCommunityPopup(true); }}
            {...contentProps}
          />
        );
      if (type === "AUDIO")
        return (
          <AudioPlaylistView
            chapter={selectedChapter}
            onBack={goBack}
            user={user}
            settings={settings}
            onPlayAudio={setCurrentAudioTrack}
            {...contentProps}
          />
        );
    }

    return null;
  };

  // --- MENU ITEM GENERATOR WITH LOCKS ---
  const renderSidebarMenuItems = () => {
    const groupedItems = [
      {
        category: "Essential",
        items: [
          {
            id: "INBOX",
            label: "Inbox",
            icon: Mail,
            color: "indigo",
            action: () => {
              setShowInbox(true);
              setShowSidebar(false);
            },
            featureId: "INBOX",
          },
          {
            id: "UPDATES",
            label: "Notifications",
            icon: Bell,
            color: "red",
            action: () => {
              onTabChange("UPDATES");
              setHasNewUpdate(false);
              localStorage.setItem(
                "nst_last_read_update",
                Date.now().toString(),
              );
              setShowSidebar(false);
            },
            featureId: "UPDATES",
          },
        ],
      },
      {
        category: "Premium & Rewards",
        items: [
          {
            id: "PLAN",
            label: "My Plan",
            icon: CreditCard,
            color: "purple",
            action: () => {
              onTabChange("SUB_HISTORY" as any);
              setShowSidebar(false);
            },
            featureId: "MY_PLAN",
          },
          {
            id: "REDEEM",
            label: "Redeem",
            icon: Gift,
            color: "pink",
            action: () => {
              onTabChange("REDEEM");
              setShowSidebar(false);
            },
            featureId: "REDEEM_CODE",
          },
        ],
      },
      {
        category: "Fun & Utilities",
        items: [
          ...(isGameEnabled
            ? [
                {
                  id: "GAME",
                  label: "Play Game",
                  icon: Gamepad2,
                  color: "orange",
                  action: () => {
                    onTabChange("GAME");
                    setShowSidebar(false);
                  },
                  featureId: "GAMES",
                },
              ]
            : []),
          {
            id: "REQUEST",
            label: "Content Demand",
            icon: Megaphone,
            color: "purple",
            action: () => {
              setShowRequestModal(true);
              setShowSidebar(false);
            },
            featureId: "REQUEST_CONTENT",
          },
          ...((settings?.hiddenBottomNavButtons || []).includes('CHAT') ? [] : [{
            id: "CHAT",
            label: "Community Chat",
            icon: MessageSquare,
            color: "blue",
            action: () => {
              setShowChat(true);
              setShowSidebar(false);
            },
            featureId: "CHAT",
          }]),
          ...(universalVideoInTopBarEffective || (settings?.hiddenBottomNavButtons || []).includes('VIDEO')
            ? [{
                id: "VIDEO_MENU",
                label: "Video",
                icon: Video,
                color: "red",
                action: () => {
                  onTabChange("UNIVERSAL_VIDEO");
                  setCurrentLogicalTab("VIDEO");
                  setShowSidebar(false);
                },
                featureId: "VIDEO_ACCESS",
              }]
            : []),
        ],
      },
      // Profile — surfaces inside the menu drawer when admin moved it out of
      // the bottom nav (Revision Hub V2 enabled OR profileInMenuForced).
      ...((settings?.revisionHubV2Enabled !== false || settings?.profileInMenuForced)
        ? [{
            category: "Account",
            items: [
              {
                id: "PROFILE_MENU",
                label: "Profile",
                icon: UserIconOutline,
                color: "indigo",
                action: () => {
                  onTabChange("PROFILE");
                  setCurrentLogicalTab("PROFILE");
                  setShowSidebar(false);
                },
                featureId: "PROFILE_PAGE",
              },
            ],
          }]
        : []),
      {
        category: "Help & Support",
        items: [
          {
            id: "SUPPORT",
            label: "Admin Support",
            icon: MessageSquare,
            color: "rose",
            action: handleSupportEmail,
            featureId: "SUPPORT",
          }, // Optional featureId, fallback true if missing
        ],
      },
    ];

    return groupedItems.map((group, gIdx) => {
      // Filter items that are hidden
      const visibleItems = group.items.filter((item) => {
        if (item.featureId) {
          const access = getFeatureAccess(item.featureId);
          return !access.isHidden;
        }
        return true;
      });

      if (visibleItems.length === 0) return null;

      return (
        <div key={gIdx} className="mb-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">
            {group.category}
          </h4>
          <div className="space-y-1">
            {visibleItems.map((item) => {
              let isLocked = false;
              if (item.featureId) {
                const access = getFeatureAccess(item.featureId);
                if (!access.hasAccess) isLocked = true;
              }

              return (
                <Button
                  key={item.id}
                  onClick={() => {
                    if (isLocked) {
                      showAlert(
                        "🔒 Locked by Admin. Upgrade your plan to access.",
                        "ERROR",
                      );
                      return;
                    }
                    item.action();
                  }}
                  variant="ghost"
                  fullWidth
                  className={`justify-start gap-4 p-3 mx-2 hover:bg-slate-50 rounded-xl ${isLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`bg-${item.color}-100 text-${item.color}-600 p-2 rounded-lg relative`}
                  >
                    <item.icon size={18} />
                    {isLocked && (
                      <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                        <Lock size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      );
    });
  };

  // --- RENDER BASED ON ACTIVE TAB ---

  const renderMainContent = () => {
    // 1. HOME TAB
    if (activeTab === "HOME") {
      return (
        <PullToRefresh onRefresh={() => window.location.reload()}>
        <div className="flex flex-col gap-4 pb-4">
          {/* RESUME READING — page-wise (chapters + ALL homework notes), sorted by latest activity */}
          <div className="order-1">
          {isHomeSectionVisible('home_continue_reading', settings) && (() => {
            const HW_SUBJECT_META: Record<string, { label: string; chipBg: string; chipText: string; barFrom: string; barTo: string; btnBg: string; btnHover: string }> = {
              sarSangrah:           { label: 'Sar Sangrah',           chipBg: 'bg-rose-100',    chipText: 'text-rose-700',    barFrom: 'from-rose-500',    barTo: 'to-pink-500',     btnBg: 'bg-rose-600',    btnHover: 'hover:bg-rose-700' },
              speedySocialScience:  { label: 'Speedy SST',            chipBg: 'bg-amber-100',   chipText: 'text-amber-700',   barFrom: 'from-amber-500',   barTo: 'to-orange-500',   btnBg: 'bg-amber-600',   btnHover: 'hover:bg-amber-700' },
              speedyScience:        { label: 'Speedy Science',        chipBg: 'bg-emerald-100', chipText: 'text-emerald-700', barFrom: 'from-emerald-500', barTo: 'to-teal-500',     btnBg: 'bg-emerald-600', btnHover: 'hover:bg-emerald-700' },
              mcq:                  { label: 'MCQ',                   chipBg: 'bg-violet-100',  chipText: 'text-violet-700',  barFrom: 'from-violet-500',  barTo: 'to-fuchsia-500',  btnBg: 'bg-violet-600',  btnHover: 'hover:bg-violet-700' },
              other:                { label: 'Homework',              chipBg: 'bg-slate-100',   chipText: 'text-slate-700',   barFrom: 'from-slate-500',   barTo: 'to-slate-600',    btnBg: 'bg-slate-700',   btnHover: 'hover:bg-slate-800' },
            };
            type Merged =
              | { kind: 'chapter'; ts: number; entry: RecentChapterEntry }
              | { kind: 'hw';      ts: number; entry: RecentHwEntry }
              | { kind: 'lucent';  ts: number; entry: RecentLucentEntry };
            const allMerged: Merged[] = [
              ...recentChapters.map(e => ({ kind: 'chapter' as const, ts: e.ts, entry: e })),
              ...recentHw.map(e => ({ kind: 'hw' as const, ts: e.ts, entry: e })),
              ...recentLucent.map(e => ({ kind: 'lucent' as const, ts: e.ts, entry: e })),
            ];
            // Compute available filter counts (used to hide empty chips)
            const counts = {
              all: allMerged.length,
              chapter: allMerged.filter(m => m.kind === 'chapter').length,
              sarSangrah: allMerged.filter(m => m.kind === 'hw' && m.entry.targetSubject === 'sarSangrah').length,
              speedy: allMerged.filter(m => m.kind === 'hw' && (m.entry.targetSubject === 'speedyScience' || m.entry.targetSubject === 'speedySocialScience')).length,
              mcq: allMerged.filter(m => m.kind === 'hw' && m.entry.targetSubject === 'mcq').length,
              lucent: allMerged.filter(m => m.kind === 'lucent').length,
            };
            const showFilterChips = settings?.showHomeResumeFilter !== false && allMerged.length >= 3;
            const activeFilter = showFilterChips ? homeResumeFilter : 'all';
            const filtered: Merged[] = allMerged.filter(m => {
              if (activeFilter === 'all') return true;
              if (activeFilter === 'chapter') return m.kind === 'chapter';
              if (activeFilter === 'lucent') return m.kind === 'lucent';
              if (m.kind !== 'hw') return false;
              if (activeFilter === 'sarSangrah') return m.entry.targetSubject === 'sarSangrah';
              if (activeFilter === 'speedy') return m.entry.targetSubject === 'speedyScience' || m.entry.targetSubject === 'speedySocialScience';
              if (activeFilter === 'mcq') return m.entry.targetSubject === 'mcq';
              return true;
            });
            // Page-wise grouping: Sar Sangrah / Speedy ke notes hamesha
            // page number ASC me dikhne chahiye (Page 1 → 2 → 3), date-wise
            // NAHI. Even if a later-added note has Page 1, it stays at top.
            // Strategy: compute a "bucket timestamp" for each subject-with-pageNo
            // group (= latest activity in that group). All items of the same
            // subject share that bucket-ts so they cluster together; within the
            // bucket they sort by page ASC. Cross-bucket order = latest activity.
            const subjectMaxTs = new Map<string, number>();
            filtered.forEach(item => {
              if (item.kind === 'hw') {
                const pn = parseInt(item.entry.hw?.pageNo || '', 10);
                if (!isNaN(pn)) {
                  const sub = item.entry.targetSubject || '';
                  subjectMaxTs.set(sub, Math.max(subjectMaxTs.get(sub) || 0, item.ts));
                }
              }
            });
            const merged: Merged[] = filtered.sort((a, b) => {
              const pa = a.kind === 'hw' ? parseInt(a.entry.hw?.pageNo || '', 10) : NaN;
              const pb = b.kind === 'hw' ? parseInt(b.entry.hw?.pageNo || '', 10) : NaN;
              const aHasPage = !isNaN(pa);
              const bHasPage = !isNaN(pb);
              // Effective bucket-ts: items with pageNo inherit the subject's max ts
              // so they group together regardless of individual entry timestamps.
              const aBucketTs = aHasPage && a.kind === 'hw'
                ? (subjectMaxTs.get(a.entry.targetSubject || '') || a.ts)
                : a.ts;
              const bBucketTs = bHasPage && b.kind === 'hw'
                ? (subjectMaxTs.get(b.entry.targetSubject || '') || b.ts)
                : b.ts;
              if (aBucketTs !== bBucketTs) return bBucketTs - aBucketTs;
              // Same bucket — within same Sar Sangrah/Speedy subject, sort by page ASC
              if (aHasPage && bHasPage && a.kind === 'hw' && b.kind === 'hw'
                  && a.entry.targetSubject === b.entry.targetSubject) {
                return pa - pb;
              }
              return b.ts - a.ts;
            }).slice(0, 8);
            // Hide entire card only if there's nothing at all (filter empty states still show chips)
            if (allMerged.length === 0) return null;
            const FILTER_CHIPS: { key: typeof homeResumeFilter; label: string; emoji: string; count: number; activeBg: string; activeText: string }[] = [
              { key: 'all',         label: 'All',          emoji: '📚', count: counts.all,        activeBg: 'bg-indigo-600',   activeText: 'text-white' },
              { key: 'chapter',     label: 'Class Notes',  emoji: '📖', count: counts.chapter,    activeBg: 'bg-blue-600',     activeText: 'text-white' },
              { key: 'lucent',      label: 'Lucent',       emoji: '📗', count: counts.lucent,     activeBg: 'bg-teal-600',     activeText: 'text-white' },
              { key: 'sarSangrah',  label: 'Sar Sangrah',  emoji: '📕', count: counts.sarSangrah, activeBg: 'bg-rose-600',     activeText: 'text-white' },
              { key: 'speedy',      label: 'Speedy',       emoji: '⚡', count: counts.speedy,     activeBg: 'bg-emerald-600',  activeText: 'text-white' },
              { key: 'mcq',         label: 'MCQ',          emoji: '❓', count: counts.mcq,        activeBg: 'bg-violet-600',   activeText: 'text-white' },
            ].filter(c => c.count > 0);
            return (
              <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Continue Reading</p>
                      <p className="text-xs text-slate-500 font-medium truncate">Where you left off</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    {merged.length}{activeFilter !== 'all' ? `/${allMerged.length}` : ''}
                  </span>
                </div>
                {/* SUBJECT FILTER CHIP ROW (admin-toggleable, only if 3+ items) */}
                {showFilterChips && FILTER_CHIPS.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-3 snap-x">
                    {FILTER_CHIPS.map(c => {
                      const isActive = activeFilter === c.key;
                      return (
                        <button
                          key={c.key}
                          onClick={() => setHomeResumeFilter(c.key)}
                          className={`shrink-0 snap-start flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all active:scale-95 border ${
                            isActive
                              ? `${c.activeBg} ${c.activeText} border-transparent shadow-sm`
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <span className="text-[12px] leading-none">{c.emoji}</span>
                          <span className="leading-none">{c.label}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                            isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>{c.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {merged.length === 0 ? (
                  <div className="bg-white border border-dashed border-indigo-200 rounded-2xl p-4 text-center">
                    <p className="text-xs font-bold text-slate-500">Nothing matches this filter yet.</p>
                    <button
                      onClick={() => setHomeResumeFilter('all')}
                      className="mt-2 text-[11px] font-black text-indigo-600 underline"
                    >
                      Show all
                    </button>
                  </div>
                ) : (
                <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide snap-x">
                  {merged.map(item => {
                    if (item.kind === 'chapter') {
                      const entry = item.entry;
                      return (
                        <div
                          key={`ch_${entry.id}`}
                          className="relative shrink-0 w-56 snap-start bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col gap-2 active:scale-[0.98] transition-transform"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissRecentChapter(entry.id); }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                            aria-label="Remove"
                            title="Remove"
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => openRecentChapter(entry)}
                            className="text-left"
                          >
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest truncate pr-6">
                              Class {entry.classLevel} · {entry.subject?.name || 'Subject'}
                            </p>
                            <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 mt-1 pr-6">
                              {entry.chapter?.title || 'Chapter'}
                            </p>
                          </button>
                          <div className="mt-1">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                style={{ width: `${Math.max(2, entry.scrollPct)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-slate-500 font-semibold">{entry.scrollPct}% read</span>
                              <button
                                onClick={() => openRecentChapter(entry)}
                                className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                              >
                                Resume <ChevronRight size={10} />
                              </button>
                            </div>
                            {/* Action row — Save Offline + Download MHTML, parity with Competition section.
                                Standardized 28px tall buttons in a single row for clean alignment. */}
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await saveOfflineItem({
                                      id: `chapter_${entry.id}`,
                                      type: 'NOTE',
                                      title: entry.chapter?.title || 'Chapter',
                                      subtitle: `Class ${entry.classLevel} · ${entry.subject?.name || ''}`,
                                      data: {
                                        kind: 'CHAPTER_REF',
                                        classLevel: entry.classLevel,
                                        subject: entry.subject,
                                        chapter: entry.chapter,
                                        scrollPct: entry.scrollPct,
                                      },
                                    });
                                    try { (window as any).__toast?.({ type: 'success', message: 'Saved offline ✓' }); } catch {}
                                  } catch (err) { console.error(err); }
                                }}
                                className="h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-all border border-emerald-200"
                                title="Save Offline"
                              >
                                <CloudOff size={11} /> <span>Offline</span>
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const wrapper = document.createElement('div');
                                    wrapper.id = `ch-print-${entry.id}`;
                                    const safeTitle = (entry.chapter?.title || 'Chapter').replace(/</g,'&lt;');
                                    wrapper.innerHTML = `
                                      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;color:white;border-radius:18px 18px 0 0;font-family:Inter,system-ui,sans-serif;">
                                        <div style="font-size:11px;font-weight:900;letter-spacing:.18em;opacity:.9;text-transform:uppercase;">${(settings?.appName || 'IIC')} · Continue Reading</div>
                                        <div style="font-size:22px;font-weight:900;margin-top:6px;">${safeTitle}</div>
                                        <div style="font-size:12px;font-weight:700;opacity:.85;margin-top:4px;">Class ${entry.classLevel} · ${entry.subject?.name || ''}</div>
                                      </div>
                                      <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 18px 18px;font-family:Inter,system-ui,sans-serif;color:#0f172a;line-height:1.7;">
                                        <div style="font-size:13px;color:#475569;font-weight:600;">Reading progress: ${entry.scrollPct}%</div>
                                        <div style="margin-top:14px;font-size:11px;color:#6366f1;font-weight:800;">Resume this chapter inside the IIC app to continue from where you left off.</div>
                                      </div>`;
                                    wrapper.style.position = 'fixed';
                                    wrapper.style.left = '-9999px';
                                    document.body.appendChild(wrapper);
                                    const fname = (entry.chapter?.title || 'chapter').slice(0,40).replace(/[^a-z0-9]+/gi,'_');
                                    await downloadAsMHTML(wrapper.id, `${fname}_${new Date().toISOString().slice(0,10)}`, {
                                      appName: settings?.appShortName || settings?.appName || 'IIC',
                                      pageTitle: entry.chapter?.title || 'Chapter',
                                      subtitle: `Class ${entry.classLevel || ''} · ${entry.subject?.name || ''}`.trim(),
                                    });
                                    setTimeout(() => { try { document.body.removeChild(wrapper); } catch {} }, 500);
                                  } catch (err) { console.error(err); }
                                }}
                                className="h-7 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-all border border-blue-200"
                                title="Download (MHTML)"
                              >
                                <Download size={11} /> <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    // Lucent book page card
                    if (item.kind === 'lucent') {
                      const entry = item.entry;
                      return (
                        <div
                          key={`luc_${entry.id}`}
                          className="relative shrink-0 w-56 snap-start bg-white rounded-2xl border border-teal-200 shadow-sm p-3 flex flex-col gap-2 active:scale-[0.98] transition-transform"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); removeRecentLucent(entry.id); setRecentLucent(getRecentLucent()); }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                            aria-label="Remove"
                            title="Remove"
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => openRecentLucent(entry)}
                            className="text-left"
                          >
                            <div className="flex items-center gap-1 flex-wrap pr-6">
                              <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-teal-100 text-teal-700">
                                📗 Lucent
                              </span>
                              {entry.pageNo && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest bg-slate-800 text-white">
                                  P.{entry.pageNo}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 mt-1 pr-6">
                              {entry.lessonTitle}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{entry.subject}</p>
                          </button>
                          <div className="mt-1">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                                style={{ width: `${Math.max(2, entry.scrollPct)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-slate-500 font-semibold">{entry.scrollPct}% read</span>
                              <button
                                onClick={() => openRecentLucent(entry)}
                                className="text-[10px] font-black text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                              >
                                Resume <ChevronRight size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    // homework note (Sar Sangrah / Speedy) — page-wise card
                    const entry = item.entry;
                    const meta = HW_SUBJECT_META[entry.targetSubject || ''] || HW_SUBJECT_META.sarSangrah;
                    return (
                      <div
                        key={`hw_${entry.id}`}
                        className="relative shrink-0 w-56 snap-start bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col gap-2 active:scale-[0.98] transition-transform"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissRecentHw(entry.id); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                          aria-label="Remove"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                        <button
                          onClick={() => openRecentHw(entry)}
                          className="text-left"
                        >
                          <div className="flex items-center gap-1 flex-wrap pr-6">
                            <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${meta.chipBg} ${meta.chipText}`}>
                              {meta.label}
                            </span>
                            {entry.hw?.pageNo && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest bg-slate-800 text-white">
                                📖 P.{entry.hw.pageNo}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 mt-1 pr-6">
                            {entry.title}
                          </p>
                        </button>
                        <div className="mt-1">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${meta.barFrom} ${meta.barTo}`}
                              style={{ width: `${Math.max(2, entry.scrollPct)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold">{entry.scrollPct}% read</span>
                            <button
                              onClick={() => openRecentHw(entry)}
                              className={`text-[10px] font-black text-white ${meta.btnBg} ${meta.btnHover} px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all`}
                            >
                              Resume <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })()}
          </div>

          {/* SUBJECT-WISE PROGRESS */}
          <div className="order-3">
          {isHomeSectionVisible('home_subject_progress', settings) && (() => {
            // Group recentChapters by subject
            type SubjectStat = {
              subjectId: string;
              subjectName: string;
              chapters: RecentChapterEntry[];
            };
            const subjectMap: Record<string, SubjectStat> = {};
            recentChapters.forEach(entry => {
              const sid = entry.subject?.id || 'unknown';
              if (!subjectMap[sid]) {
                subjectMap[sid] = { subjectId: sid, subjectName: entry.subject?.name || sid, chapters: [] };
              }
              subjectMap[sid].chapters.push(entry);
            });
            const subjects = Object.values(subjectMap);
            if (subjects.length === 0) return null;
            const fullyReadMap = getFullyReadMap();
            const PALETTE = [
              'from-blue-500 to-indigo-500',
              'from-emerald-500 to-teal-500',
              'from-rose-500 to-pink-500',
              'from-amber-500 to-yellow-500',
              'from-violet-500 to-purple-500',
              'from-cyan-500 to-sky-500',
              'from-orange-500 to-red-500',
              'from-fuchsia-500 to-pink-500',
            ];
            return (
              <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-100 rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <BarChart3 size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Subject Progress</p>
                      <p className="text-xs text-slate-500 font-medium">Kitna padha gaya hai</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    {subjects.length} subject{subjects.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {subjects.map((sub, idx) => {
                    const chaptersRead = sub.chapters.length;
                    const avgPct = Math.round(
                      sub.chapters.reduce((sum, c) => sum + (c.scrollPct || 0), 0) / chaptersRead
                    );
                    const fullyReadCount = sub.chapters.filter(c => fullyReadMap[c.id]).length;
                    const mcqProgress = (user.progress || {})[sub.subjectId];
                    const barColor = PALETTE[idx % PALETTE.length];
                    return (
                      <div key={sub.subjectId} className="bg-white rounded-2xl px-3 py-2.5 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-black text-slate-800 truncate max-w-[55%]">{sub.subjectName}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {fullyReadCount > 0 && (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                ✓ {fullyReadCount} done
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-500">{chaptersRead} notes</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
                            style={{ width: `${Math.max(4, avgPct)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">{avgPct}% avg padha gaya</span>
                          {mcqProgress && (
                            <span className="text-[10px] font-black text-indigo-600">
                              MCQ: Ch. {mcqProgress.currentChapterIndex + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          </div>

          <div className="order-2">
          <DashboardSectionWrapper
            id="section_main_actions"
            label="Main Actions"
            settings={settings}
            isLayoutEditing={isLayoutEditing}
            onToggleVisibility={toggleLayoutVisibility}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* CLASS SELECTION */}
              <div className="col-span-2 bg-white rounded-3xl p-5 border border-slate-100 shadow-md transition-all">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 min-w-0">
                    <BookOpen className="text-blue-600 shrink-0" size={22} />
                    <span className="truncate">Select Class</span>
                    {/* BOARD SELECTION TOGGLE */}
                    {isHomeSectionVisible('home_board_toggle', settings) && (
                      <div className="flex items-center p-0.5 bg-slate-100 rounded-lg ml-2 shrink-0">
                        <button
                          onClick={() => setActiveSessionBoard("CBSE")}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${activeSessionBoard !== "BSEB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >CBSE</button>
                        <button
                          onClick={() => setActiveSessionBoard("BSEB")}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${activeSessionBoard === "BSEB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >BSEB</button>
                      </div>
                    )}
                  </h3>
                </div>

                {/* CHAPTER SEARCH BAR */}
                {showHomeSearch && (
                  <div className="mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Mode selector */}
                    <div className="flex bg-slate-100 p-1 gap-1 rounded-xl mb-2">
                      <button
                        onClick={() => setHomeSearchMode('search')}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${homeSearchMode === 'search' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Search size={12} /> Search
                      </button>
                      <button
                        onClick={() => setHomeSearchMode('compare')}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${homeSearchMode === 'compare' ? 'bg-white shadow text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <GitCompare size={12} /> Compare
                      </button>
                    </div>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                      <input
                        autoFocus
                        type="text"
                        value={homeSearchQuery}
                        onChange={e => setHomeSearchQuery(e.target.value)}
                        placeholder={homeSearchMode === 'compare' ? "Topic likhein — sab books mein compare karein..." : "Search chapters or subjects..."}
                        className="w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-blue-50 border border-blue-200 rounded-xl text-slate-700 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all"
                      />
                      {homeSearchQuery && (
                        <button
                          onClick={() => setHomeSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Compare mode — Browse All Topics shortcut (when no query yet) */}
                    {homeSearchMode === 'compare' && !homeSearchQuery.trim() && (
                      <button
                        onClick={() => setShowTopicDirectory(true)}
                        className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-black active:scale-95 transition-all shadow-lg mb-2"
                      >
                        <List size={18} />
                        📋 Saare Compare Topics Dekho
                        <span className="ml-auto text-violet-200 text-xs font-bold">
                          {(() => {
                            let count = 0;
                            const seen = new Set<string>();
                            ((settings?.lucentNotes || []) as any[]).forEach((e: any) =>
                              (e.pages || []).forEach((pg: any) => {
                                if (pg.topicName?.trim() && !seen.has(pg.topicName.trim().toLowerCase())) {
                                  seen.add(pg.topicName.trim().toLowerCase()); count++;
                                }
                              })
                            );
                            ((settings?.homework || []) as any[]).forEach((hw: any) => {
                              if (hw.topicName?.trim() && !seen.has(hw.topicName.trim().toLowerCase())) {
                                seen.add(hw.topicName.trim().toLowerCase()); count++;
                              }
                            });
                            return count > 0 ? `${count} topics →` : '→';
                          })()}
                        </span>
                      </button>
                    )}
                    {/* Compare mode — show Compare All button */}
                    {homeSearchMode === 'compare' && homeSearchQuery.trim() && (
                      <div className="mb-2">
                        {(chapterNoteHitsLoading) ? (
                          <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5">
                            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin shrink-0" />
                            <span className="text-xs text-violet-600 font-bold">Sab books mein dhundh raha hai...</span>
                          </div>
                        ) : (() => {
                              const contentHits = [...chapterNoteHits, ...hwBookHits, ...lucentCompareHits];
                              const seenKeys = new Set<string>();
                              const topicHits: NoteSearchResult[] = [];
                              [...contentHits, ...titleBasedHits, ...chapterTitleHits].forEach(h => {
                                if (!seenKeys.has(h.storageKey)) { seenKeys.add(h.storageKey); topicHits.push(h); }
                              });
                              if (topicHits.length === 0) return (
                                <p className="text-center text-xs text-slate-400 font-bold py-2">Koi result nahi mila. Koi aur topic likhein.</p>
                              );
                              return (
                                <div className="flex flex-col gap-2">
                                  {contentHits.length >= 2 && (
                                    <button
                                      onClick={() => {
                                        const q = homeSearchQuery;
                                        setCompareHits(contentHits);
                                        setCompareQuery(q);
                                        setShowCompareView(true);
                                        setShowHomeSearch(false);
                                        setHomeSearchQuery('');
                                        setHomeSearchMode('search');
                                        saveCompareAnalytic(q, contentHits.length).catch(() => {});
                                      }}
                                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-black active:scale-95 transition-all shadow-lg"
                                    >
                                      <GitCompare size={18} />
                                      ⚖️ Points se Compare — {contentHits.length} Book{contentHits.length !== 1 ? 's' : ''} · Common &amp; Extra Points
                                    </button>
                                  )}
                                  {topicHits.length >= 2 && (
                                    <button
                                      onClick={() => {
                                        const q = homeSearchQuery;
                                        setCompareHits(topicHits);
                                        setCompareQuery(q);
                                        setShowCompareView(true);
                                        setShowHomeSearch(false);
                                        setHomeSearchQuery('');
                                        setHomeSearchMode('search');
                                        saveCompareAnalytic(`topic:${q}`, topicHits.length).catch(() => {});
                                      }}
                                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl text-sm font-black active:scale-95 transition-all shadow-lg"
                                    >
                                      <GitCompare size={18} />
                                      📚 Topic se Compare — {topicHits.length} Book{topicHits.length !== 1 ? 's' : ''} · Pure Notes
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                      </div>
                    )}
                    {homeSearchMode === 'search' && homeSearchQuery.trim() && (() => {
                      const q = homeSearchQuery.trim().toLowerCase();
                      const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                      // 1) Match recent chapters (resume-able)
                      const recentResults = recentChapters.filter(e =>
                        e.chapter?.title?.toLowerCase().includes(q) ||
                        e.subject?.name?.toLowerCase().includes(q)
                      ).slice(0, 5);
                      // 2) Match ALL subjects across selectable classes (broad subject search)
                      const board = activeSessionBoard || user.board || 'CBSE';
                      const stream = user.stream || 'Science';
                      const classesToScan = ['6','7','8','9','10','11','12','COMPETITION'];
                      const hidden = settings?.hiddenSubjects || [];
                      const subjectMatches: Array<{ id: string; name: string; subj: any; cls: string }> = [];
                      const seen = new Set<string>();
                      classesToScan.forEach(cls => {
                        try {
                          const subs = getSubjectsList(cls, stream, board).filter(s => !hidden.includes(s.id));
                          subs.forEach(s => {
                            if (s.name?.toLowerCase().includes(q)) {
                              const key = `${cls}_${s.id}`;
                              if (!seen.has(key)) {
                                seen.add(key);
                                subjectMatches.push({ id: s.id, name: s.name, subj: s, cls });
                              }
                            }
                          });
                        } catch {}
                      });
                      const subjectResults = subjectMatches.slice(0, 8);
                      // 3) Match starred notes content
                      const starResults = starredNotes
                        .filter(n => n.topicText?.toLowerCase().includes(q))
                        .slice(0, 5);
                      // 4) Match inside admin page-wise notes (lucentNotes) — grouped by bookName
                      type LucentHit = { entry: LucentNoteEntry; pageIndex: number; pageNo: string; snippet: string };
                      const lucentHitsAll: LucentHit[] = [];
                      const lucentSeenKeys = new Set<string>();
                      ((settings?.lucentNotes || []) as LucentNoteEntry[]).forEach(entry => {
                        (entry.pages || []).forEach((pg, pi) => {
                          // Deduplicate by lessonTitle+pageNo — same lesson in multiple entries shows only once
                          const dedupeKey = `${(entry.lessonTitle || '').toLowerCase()}_${pg.pageNo}`;
                          if (lucentSeenKeys.has(dedupeKey)) return;
                          const text = stripHtml(pg.content || '').toLowerCase();
                          const titleHit = entry.lessonTitle?.toLowerCase().includes(q);
                          if (text.includes(q) || titleHit) {
                            lucentSeenKeys.add(dedupeKey);
                            const idx = text.indexOf(q);
                            const start = Math.max(0, idx - 30);
                            const snippet = idx >= 0
                              ? stripHtml(pg.content).substring(start, start + 120)
                              : stripHtml(pg.content).substring(0, 120);
                            lucentHitsAll.push({ entry, pageIndex: pi, pageNo: pg.pageNo, snippet });
                          }
                        });
                      });
                      // Group by book name, cap each book at 4 results
                      type LucentBookGroup = { bookName: string; hits: LucentHit[] };
                      const lucentByBook: Record<string, LucentBookGroup> = {};
                      lucentHitsAll.forEach(h => {
                        const bk = h.entry.bookName?.trim() || 'Lucent';
                        if (!lucentByBook[bk]) lucentByBook[bk] = { bookName: bk, hits: [] };
                        if (lucentByBook[bk].hits.length < 4) lucentByBook[bk].hits.push(h);
                      });
                      const lucentBookGroups = Object.values(lucentByBook).slice(0, 6);
                      // kept for totalCount
                      const lucentResults = lucentHitsAll.slice(0, 8);
                      // 5) Match inside any cached Class 6-12 / Competition chapter
                      //    notes (Concept / Retention / Teaching Strategy / deep
                      //    dives). Computed asynchronously by the debounced effect
                      //    above and stored in `chapterNoteHits`.
                      const noteResults = chapterNoteHits;
                      const mcqResults = chapterMcqHits;
                      const isSearching = chapterNoteHitsLoading || chapterMcqHitsLoading;
                      // Group hwBookHits by book for per-book display sections
                      const hwBooksGrouped: Record<string, { meta: typeof HW_BOOK_META[string]; hits: typeof hwBookHits }> = {};
                      hwBookHits.forEach(hit => {
                        const bk = hit.bookName || hit.subjectName;
                        if (!hwBooksGrouped[bk]) {
                          const bookId = Object.keys(HW_BOOK_META).find(k => HW_BOOK_META[k].label === bk) || bk;
                          hwBooksGrouped[bk] = { meta: HW_BOOK_META[bookId] || { label: bk, emoji: '📖', color: 'bg-slate-100', border: 'border-slate-200', chip: 'bg-slate-100', chipText: 'text-slate-700' }, hits: [] };
                        }
                        hwBooksGrouped[bk].hits.push(hit);
                      });
                      const totalCount = recentResults.length + subjectResults.length + starResults.length + lucentResults.length + chapterNoteHits.length + mcqResults.length + hwBookHits.length;
                      if (totalCount === 0) {
                        if (isSearching) {
                          return <p className="text-center text-xs text-slate-400 font-bold py-3">Notes aur MCQ mein dhundh raha hai…</p>;
                        }
                        return <p className="text-center text-xs text-slate-400 font-bold py-3">Kuch nahi mila. Notes ya MCQ mein jo word ho woh type karein.</p>;
                      }
                      return (
                        <>
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                          {subjectResults.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 px-1">Subjects</p>
                              {subjectResults.map(s => (
                                <button
                                  key={`sub_${s.cls}_${s.id}`}
                                  onClick={() => {
                                    setActiveSessionClass(s.cls as any);
                                    setSelectedSubject(s.subj);
                                    setContentViewStep('CHAPTERS');
                                    onTabChange('COURSES');
                                    setShowHomeSearch(false);
                                    setHomeSearchQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 bg-white border border-blue-100 hover:border-blue-300 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Book size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{s.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">Class {s.cls} · {board}</p>
                                  </div>
                                  <ChevronRight size={14} className="text-blue-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                          {(() => {
                            const schoolNoteHits = chapterNoteHits.filter(h => h.classLevel !== 'COMPETITION');
                            const competitionNoteHits = chapterNoteHits.filter(h => h.classLevel === 'COMPETITION');
                            return (
                              <>
                              {schoolNoteHits.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between px-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 flex items-center gap-1">
                                      Notes
                                      <span className="text-[9px] font-bold text-slate-400">· Class 6-12</span>
                                    </p>
                                    {schoolNoteHits.length > 1 && compareMaxBooks !== 1 && (
                                      <button
                                        onClick={() => {
                                          const limit = compareMaxBooks === 0 ? schoolNoteHits.length : compareMaxBooks;
                                          const snapshot = schoolNoteHits.slice(0, limit);
                                          const q = homeSearchQuery;
                                          setCompareHits(snapshot);
                                          setCompareQuery(q);
                                          setShowCompareView(true);
                                          setShowHomeSearch(false);
                                          setHomeSearchQuery('');
                                          saveCompareAnalytic(q, snapshot.length).catch(() => {});
                                        }}
                                        className="flex items-center gap-1 bg-violet-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black active:scale-95 transition-all shadow-sm"
                                      >
                                        ⚖️ Compare {compareMaxBooks === 0 ? schoolNoteHits.length : Math.min(schoolNoteHits.length, compareMaxBooks)} Books
                                      </button>
                                    )}
                                  </div>
                                  {schoolNoteHits.map((h, i) => (
                                    <button
                                      key={`note_${h.storageKey}_${i}`}
                                      onClick={() => {
                                        openChapterFromNoteHit(h);
                                        setShowHomeSearch(false);
                                        setHomeSearchQuery('');
                                      }}
                                      className="w-full flex items-start gap-3 bg-white border border-violet-100 hover:border-violet-300 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                                        <BookOpen size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800 truncate">{h.noteTitle || h.subjectName}</p>
                                        <p className="text-[10px] font-bold text-violet-500 truncate">
                                          Class {h.classLevel} · {h.subjectName.replace(/-/g, ' ')} · {h.board}
                                        </p>
                                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{h.noteContent}</p>
                                      </div>
                                      <ChevronRight size={14} className="text-violet-400 shrink-0 mt-1" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              {competitionNoteHits.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between px-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                                      Notes
                                      <span className="text-[9px] font-bold text-slate-400">· Competition Books</span>
                                    </p>
                                    {competitionNoteHits.length > 1 && compareMaxBooks !== 1 && (
                                      <button
                                        onClick={() => {
                                          const limit = compareMaxBooks === 0 ? competitionNoteHits.length : compareMaxBooks;
                                          const snapshot = competitionNoteHits.slice(0, limit);
                                          const q = homeSearchQuery;
                                          setCompareHits(snapshot);
                                          setCompareQuery(q);
                                          setShowCompareView(true);
                                          setShowHomeSearch(false);
                                          setHomeSearchQuery('');
                                          saveCompareAnalytic(q, snapshot.length).catch(() => {});
                                        }}
                                        className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black active:scale-95 transition-all shadow-sm"
                                      >
                                        ⚖️ Compare {compareMaxBooks === 0 ? competitionNoteHits.length : Math.min(competitionNoteHits.length, compareMaxBooks)} Books
                                      </button>
                                    )}
                                  </div>
                                  {competitionNoteHits.map((h, i) => (
                                    <button
                                      key={`cnote_${h.storageKey}_${i}`}
                                      onClick={() => {
                                        openChapterFromNoteHit(h);
                                        setShowHomeSearch(false);
                                        setHomeSearchQuery('');
                                      }}
                                      className="w-full flex items-start gap-3 bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <BookOpen size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800 truncate">{h.noteTitle || h.subjectName}</p>
                                        <p className="text-[10px] font-bold text-emerald-600 truncate">
                                          {h.bookName || h.subjectName.replace(/-/g, ' ')} · Competition · {h.board}
                                        </p>
                                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{h.noteContent}</p>
                                      </div>
                                      <ChevronRight size={14} className="text-emerald-400 shrink-0 mt-1" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              </>
                            );
                          })()}
                          {mcqResults.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 flex items-center gap-1">
                                  MCQ
                                  <span className="text-[9px] font-bold text-slate-400">· Class 6-12 + Competition</span>
                                </p>
                                <button
                                  onClick={() => { setMcqSearchInitialQuery(homeSearchQuery); setShowMcqSearchView(true); setShowHomeSearch(false); setHomeSearchQuery(''); }}
                                  className="flex items-center gap-1 bg-orange-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black active:scale-95 transition-all shadow-sm"
                                >
                                  🔍 Search All MCQs
                                </button>
                              </div>
                              {mcqResults.map((h, i) => (
                                <button
                                  key={`mcq_${h.storageKey}_${i}`}
                                  onClick={() => {
                                    openChapterFromMcqHit(h);
                                    setShowHomeSearch(false);
                                    setHomeSearchQuery('');
                                  }}
                                  className="w-full flex items-start gap-3 bg-white border border-orange-100 hover:border-orange-300 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-black text-[11px]">
                                    MCQ
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 line-clamp-2">{h.question}</p>
                                    <p className="text-[10px] font-bold text-orange-500 mt-0.5 truncate">
                                      {h.classLevel === 'COMPETITION' ? 'Competition' : `Class ${h.classLevel}`} · {h.subjectName.replace(/-/g, ' ')} · {h.board}
                                    </p>
                                    {h.options.length > 0 && (
                                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                        {h.options.slice(0, 2).map((o, oi) => `${String.fromCharCode(65+oi)}) ${o}`).join('  ')}
                                      </p>
                                    )}
                                  </div>
                                  <ChevronRight size={14} className="text-orange-400 shrink-0 mt-1" />
                                </button>
                              ))}
                            </div>
                          )}
                          {recentResults.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 px-1">Recent Chapters</p>
                              {recentResults.map(entry => (
                                <button
                                  key={entry.id}
                                  onClick={() => { openRecentChapter(entry); setShowHomeSearch(false); setHomeSearchQuery(''); }}
                                  className="w-full flex items-center gap-3 bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <BookOpen size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 truncate">{entry.chapter?.title}</p>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{entry.subject?.name} · {entry.classLevel} · {entry.board}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {starResults.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 px-1">Important Notes</p>
                              {starResults.map(n => (
                                <button
                                  key={n.id}
                                  onClick={() => { setShowStarredPage(true); setProfileStarSearch(homeSearchQuery); setShowHomeSearch(false); setHomeSearchQuery(''); }}
                                  className="w-full flex items-start gap-3 bg-white border border-amber-100 hover:border-amber-300 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                    <Star size={14} fill="currentColor" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 line-clamp-2">{n.topicText}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {lucentBookGroups.map(({ bookName, hits }) => {
                            const LUCENT_BOOK_COLORS: Record<string, { label: string; emoji: string; border: string; chipText: string; iconBg: string; iconText: string }> = {
                              'Lucent':                { label: 'Lucent GK', emoji: '📘', border: 'border-indigo-100', chipText: 'text-indigo-600', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
                              'Speedy Science':        { label: 'Speedy Science', emoji: '🔬', border: 'border-blue-100', chipText: 'text-blue-600', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
                              'Speedy Social Science': { label: 'Speedy Social Sci', emoji: '🌏', border: 'border-orange-100', chipText: 'text-orange-600', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
                              'Sar Sangrah':           { label: 'Sar Sangrah', emoji: '📕', border: 'border-rose-100', chipText: 'text-rose-600', iconBg: 'bg-rose-100', iconText: 'text-rose-600' },
                            };
                            const theme = LUCENT_BOOK_COLORS[bookName] || { label: bookName, emoji: '📗', border: 'border-emerald-100', chipText: 'text-emerald-600', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' };
                            return (
                              <div key={`lbk_${bookName}`} className="space-y-1.5">
                                <p className={`text-[10px] font-black uppercase tracking-wider px-1 ${theme.chipText}`}>{theme.emoji} {theme.label} (Page-wise)</p>
                                {hits.map((h, i) => (
                                  <button
                                    key={`lh_${h.entry.id}_${h.pageIndex}_${i}`}
                                    onClick={() => {
                                      setLucentNoteViewer(h.entry);
                                      setLucentPageIndex(h.pageIndex);
                                      setPendingReadQuery(homeSearchQuery.trim());
                                      setShowHomeSearch(false);
                                      setHomeSearchQuery('');
                                    }}
                                    className={`w-full flex items-start gap-3 bg-white border ${theme.border} hover:opacity-80 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg ${theme.iconBg} ${theme.iconText} flex items-center justify-center shrink-0 text-base`}>
                                      {theme.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-slate-800 truncate">{h.entry.lessonTitle}</p>
                                      <p className={`text-[10px] font-bold ${theme.chipText}`}>Page {h.pageNo} · {h.entry.subject}</p>
                                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">…{h.snippet}…</p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                          {/* Per-book sections: Sar Sangrah, Speedy Science, Speedy SST, custom books */}
                          {Object.entries(hwBooksGrouped).map(([bookName, { meta, hits: bHits }]) => (
                            <div key={`hwbook_${bookName}`} className="space-y-1.5">
                              <p className="text-[10px] font-black uppercase tracking-wider px-1" style={{ color: 'inherit' }}>
                                <span className={`${meta.chipText}`}>{meta.emoji} {meta.label}</span>
                              </p>
                              {bHits.slice(0, 6).map((h, i) => {
                                // find the raw HomeworkItem to open
                                const hwItem = (settings?.homework || []).find((hw: any) => hw.id === h.chapterId);
                                return (
                                  <button
                                    key={`hwbk_${h.chapterId}_${i}`}
                                    onClick={() => {
                                      if (hwItem) {
                                        openRecentHw({ id: hwItem.id, hw: hwItem, targetSubject: hwItem.targetSubject, title: hwItem.title } as any);
                                        setPendingReadQuery(homeSearchQuery.trim());
                                        setShowHomeSearch(false);
                                        setHomeSearchQuery('');
                                      }
                                    }}
                                    className={`w-full flex items-start gap-3 bg-white border ${meta.border} hover:opacity-80 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] shadow-sm`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0 text-base`}>
                                      {meta.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-slate-800 truncate">{h.noteTitle}</p>
                                      {h.pageNo && <p className={`text-[10px] font-bold ${meta.chipText}`}>Page {h.pageNo} · {meta.label}</p>}
                                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">…{h.noteContent}…</p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>


                        {/* COMPARE SHORTCUTS at bottom of search results */}
                        {homeSearchQuery.trim() && (() => {
                          const contentHitsShortcut = [...noteResults, ...hwBookHits, ...lucentCompareHits];
                          const seenSC = new Set<string>();
                          const topicHitsShortcut: NoteSearchResult[] = [];
                          [...contentHitsShortcut, ...titleBasedHits, ...chapterTitleHits].forEach(h => {
                            if (!seenSC.has(h.storageKey)) { seenSC.add(h.storageKey); topicHitsShortcut.push(h); }
                          });
                          if (topicHitsShortcut.length === 0) return null;
                          return (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                              {contentHitsShortcut.length >= 2 && (
                                <button
                                  onClick={() => setHomeSearchMode('compare')}
                                  className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-violet-50 hover:text-violet-700"
                                >
                                  <GitCompare size={14} />
                                  ⚖️ Points se Compare — {contentHitsShortcut.length} book{contentHitsShortcut.length !== 1 ? 's' : ''} · Common &amp; Extra Points
                                </button>
                              )}
                              {topicHitsShortcut.length >= 2 && (
                                <button
                                  onClick={() => {
                                    const q = homeSearchQuery;
                                    setCompareHits(topicHitsShortcut);
                                    setCompareQuery(q);
                                    setShowCompareView(true);
                                    setShowHomeSearch(false);
                                    setHomeSearchQuery('');
                                    setHomeSearchMode('search');
                                    saveCompareAnalytic(`topic:${q}`, topicHitsShortcut.length).catch(() => {});
                                  }}
                                  className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-emerald-100 border border-emerald-200"
                                >
                                  <GitCompare size={14} />
                                  📚 Topic se Compare — {topicHitsShortcut.length} book{topicHitsShortcut.length !== 1 ? 's' : ''} · Pure Notes
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* CONTENT TYPE PREFERENCE */}
                {isHomeSectionVisible('home_content_type_pref', settings) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Open Lesson As</span>
                    {contentTypePref !== "ALL" && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Direct mode
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 p-1 bg-slate-100 rounded-2xl">
                    {[
                      { id: "ALL", label: "All", icon: <List size={14} /> },
                      { id: "PDF", label: "Notes", icon: <FileText size={14} /> },
                      { id: "AUDIO", label: "Audio", icon: <Headphones size={14} /> },
                      { id: "VIDEO", label: "Video", icon: <Video size={14} /> },
                    ].map((opt) => {
                      const active = contentTypePref === (opt.id as any);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => { hapticLight(); setContentTypePref(opt.id as any); }}
                          className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            active
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* CLASS SELECTION — grouped categories */}
                {isHomeSectionVisible('home_class_picker', settings) && (() => {
                  type ClassTheme = {
                    label: string;
                    accent: string;
                    chip: string;
                    border: string;
                    hoverBorder: string;
                    hoverBg: string;
                    hoverText: string;
                    text: string;
                    iconBg: string;
                    iconText: string;
                  };
                  const themes: Record<"junior" | "secondary" | "senior", ClassTheme> = {
                    junior: {
                      label: "Junior • Foundation",
                      accent: "from-emerald-400 to-teal-500",
                      chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
                      border: "border-emerald-200",
                      hoverBorder: "hover:border-emerald-400",
                      hoverBg: "hover:bg-gradient-to-b hover:from-emerald-50 hover:to-teal-50",
                      hoverText: "hover:text-emerald-800",
                      text: "text-emerald-700",
                      iconBg: "bg-emerald-50",
                      iconText: "text-emerald-600",
                    },
                    secondary: {
                      label: "Secondary • Building Concepts",
                      accent: "from-blue-500 to-indigo-600",
                      chip: "bg-blue-100 text-blue-700 border-blue-200",
                      border: "border-blue-200",
                      hoverBorder: "hover:border-blue-400",
                      hoverBg: "hover:bg-gradient-to-b hover:from-blue-50 hover:to-indigo-50",
                      hoverText: "hover:text-blue-800",
                      text: "text-blue-700",
                      iconBg: "bg-blue-50",
                      iconText: "text-blue-600",
                    },
                    senior: {
                      label: "Senior • Boards & Beyond",
                      accent: "from-purple-500 to-fuchsia-600",
                      chip: "bg-purple-100 text-purple-700 border-purple-200",
                      border: "border-purple-200",
                      hoverBorder: "hover:border-purple-400",
                      hoverBg: "hover:bg-gradient-to-b hover:from-purple-50 hover:to-fuchsia-50",
                      hoverText: "hover:text-purple-800",
                      text: "text-purple-700",
                      iconBg: "bg-purple-50",
                      iconText: "text-purple-600",
                    },
                  };
                  const groups: Array<{
                    key: keyof typeof themes;
                    classes: string[];
                  }> = [
                    { key: "junior", classes: ["6", "7", "8"] },
                    { key: "secondary", classes: ["9", "10"] },
                    { key: "senior", classes: ["11", "12"] },
                  ];
                  const isBoardYear = (c: string) => c === "8" || c === "10" || c === "12";
                  const showBoardBadge = (c: string) => c === "10" || c === "12";

                  const goToClass = (c: string) => {
                    setActiveSessionClass(c);
                    setActiveSessionBoard(
                      activeSessionBoard || user.board || "CBSE",
                    );
                    setContentViewStep("SUBJECTS");
                    setInitialParentSubject(null);
                    onTabChange("COURSES");
                  };

                  return (
                    <div className="space-y-4">
                      {groups.map((g) => {
                        const t = themes[g.key];
                        return (
                          <div key={g.key}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-block h-2 w-2 rounded-full bg-gradient-to-r ${t.accent}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${t.text}`}>
                                {t.label}
                              </span>
                              <span className="flex-1 h-px bg-slate-100" />
                            </div>
                            <div className={`grid ${g.classes.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
                              {g.classes.map((c) => {
                                const board = isBoardYear(c);
                                return (
                                  <button
                                    key={c}
                                    onClick={() => { hapticStrong(); goToClass(c); }}
                                    className={`group relative w-full py-5 px-3 min-h-[110px] rounded-2xl bg-white border-2 ${t.border} text-slate-700 font-black ${t.hoverBorder} hover:scale-[1.03] active:scale-[1.05] transition-all duration-150 text-center text-base flex flex-col items-center justify-center gap-1 overflow-hidden shadow-md hover:shadow-lg${c === '10' ? ' class-glow-10' : c === '12' ? ' class-glow-12' : ''}`}
                                  >
                                    {/* Top accent bar — thicker & rounded */}
                                    <span className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${t.accent} rounded-t-2xl`} />
                                    {/* Subtle inner glow on hover */}
                                    <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${t.accent} opacity-5 transition-opacity`} style={{opacity: 0}} />

                                    {/* Board year crown badge */}
                                    {showBoardBadge(c) && (
                                      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[8px] font-black uppercase tracking-wider shadow-sm">
                                        <Crown size={9} className="text-amber-600" />
                                        Board
                                      </span>
                                    )}

                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Class</span>
                                    <span className={`text-3xl font-black leading-none ${board ? "text-amber-600" : t.text}`}>{c}</span>
                                    <span className={`text-[9px] font-bold ${t.text} opacity-60`}>Tap to open</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* GOVT EXAMS + AI SHORTCUT */}
                      {isHomeSectionVisible('home_govt_exams', settings) && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                            Competitive • Govt. Exams
                          </span>
                          <span className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => { hapticStrong(); goToClass("COMPETITION"); }}
                            className="group relative w-full py-5 px-5 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 text-slate-700 font-black hover:border-orange-400 hover:from-orange-100 hover:via-amber-100 hover:to-yellow-100 active:scale-[0.97] transition-all text-left flex items-center gap-4 overflow-hidden shadow-md hover:shadow-lg"
                          >
                            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-t-2xl" />
                            <span className="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-100/60 rounded-full blur-2xl group-hover:bg-orange-200/60 transition-colors" />
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shrink-0">
                              <Trophy size={26} className="text-white drop-shadow" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 block">Competitive Mode</span>
                              <span className="text-lg font-black text-slate-800 leading-tight block">Govt. Exams</span>
                              <span className="text-[10px] text-slate-500 font-medium">SSC, Railway, UPSC, Bihar</span>
                            </div>
                            <ChevronRight size={20} className="text-orange-500 shrink-0 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                      )}

                      {/* VIDEO shortcut on home page */}
                      {((!((settings?.hiddenBottomNavButtons || []).includes('VIDEO'))) || universalVideoInTopBarEffective || settings?.universalVideoInTopBar) && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Video Classes</span>
                            <span className="flex-1 h-px bg-slate-100" />
                          </div>
                          <button
                            onClick={() => { hapticStrong(); onTabChange("UNIVERSAL_VIDEO"); setCurrentLogicalTab("VIDEO"); }}
                            className="group relative w-full py-4 px-5 rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 border-2 border-blue-200 text-slate-700 font-black hover:border-blue-400 active:scale-[0.97] transition-all text-left flex items-center gap-4 overflow-hidden shadow-md hover:shadow-lg"
                          >
                            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-cyan-400 to-sky-400 rounded-t-2xl" />
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
                              <Video size={22} className="text-white drop-shadow" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">Live + Recorded</span>
                              <span className="text-base font-black text-slate-800 leading-tight block">Video Classes</span>
                              <span className="text-[10px] text-slate-500 font-medium">Dekho aur seekho</span>
                            </div>
                            <ChevronRight size={18} className="text-blue-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          </DashboardSectionWrapper>
          </div>
        </div>
        </PullToRefresh>
      );
    }

    // 2. AI FUTURE HUB (NEW)
    if (activeTab === "AI_HUB" || activeTab === "AI_STUDIO") {
      return (
        <AiHub
          user={user}
          onTabChange={handleTabChangeWrapper}
          settings={settings}
        />
      );
    }

    // 5. UNIVERSAL VIDEO
    if (activeTab === "UNIVERSAL_VIDEO") {
      return (
        <UniversalVideoView
          user={user}
          onBack={() => onTabChange("HOME")}
          settings={settings}
        />
      );
    }

    // 5b. REVISION HUB V2 (spaced-repetition: notes → MCQ cycle for weak topics)
    if (activeTab === "REVISION_V2") {
      return (
        <RevisionHubV2
          user={user}
          settings={settings}
          onBack={() => { onTabChange("HOME"); setCurrentLogicalTab("HOME"); }}
          onOpenChapter={(subjectId, chapterId, chapterTitle) => {
            try {
              handleChapterSelect({ id: chapterId, title: chapterTitle || 'Chapter' } as any);
            } catch {/* noop */}
          }}
          onOpenMcq={(subjectId, chapterId, chapterTitle, topic) => {
            try {
              // Navigate to MCQ view for this chapter
              const lang = (activeSessionBoard || user.board) === "BSEB" ? "Hindi" : "English";
              const subjects = getSubjectsList(
                (activeSessionClass as any) || user.classLevel || "10",
                user.stream || "Science",
                activeSessionBoard || user.board,
              ).filter(s => !(settings?.hiddenSubjects || []).includes(s.id));
              const targetSubject = subjects.find(s => s.id === subjectId) || subjects[0];
              if (targetSubject) {
                fetchChapters(
                  activeSessionBoard || user.board || "CBSE",
                  (activeSessionClass as any) || user.classLevel || "10",
                  user.stream || "Science",
                  targetSubject,
                  lang,
                ).then(allChapters => {
                  const ch = allChapters.find(c => c.id === chapterId) || { id: chapterId, title: chapterTitle || 'Chapter' };
                  onTabChange("MCQ");
                  setSelectedSubject(targetSubject);
                  setSelectedChapter(ch as any);
                  setCurrentLogicalTab("HOME");
                }).catch(() => {
                  handleChapterSelect({ id: chapterId, title: chapterTitle || 'Chapter' } as any);
                });
              } else {
                handleChapterSelect({ id: chapterId, title: chapterTitle || 'Chapter' } as any);
              }
            } catch {/* noop */}
          }}
        />
      );
    }

    // 4. MCQ REVIEW HUB
    if (activeTab === "MCQ_REVIEW") {
      return (
        <McqReviewHub
          user={user}
          onTabChange={onTabChange}
          settings={settings}
          onNavigateContent={(type, chapterId, topicName, subjectName) => {
            // Navigate to MCQ Player
            setLoadingChapters(true);
            const lang =
              (activeSessionBoard || user.board) === "BSEB"
                ? "Hindi"
                : "English";

            // Fix Subject Context FIRST
            const subjects = getSubjectsList(
              (activeSessionClass as any) || user.classLevel || "10",
              user.stream || "Science",
              activeSessionBoard || user.board,
            ).filter((s) => !(settings?.hiddenSubjects || []).includes(s.id));
            let targetSubject = selectedSubject;

            if (subjectName) {
              targetSubject =
                subjects.find((s) => s.name === subjectName) || subjects[0];
            } else if (!targetSubject) {
              targetSubject = subjects[0];
            }

            fetchChapters(
              activeSessionBoard || user.board || "CBSE",
              (activeSessionClass as any) || user.classLevel || "10",
              user.stream || "Science",
              targetSubject,
              lang,
            ).then((allChapters) => {
              const ch = allChapters.find((c) => c.id === chapterId);
              if (ch) {
                onTabChange("MCQ");
                setSelectedSubject(targetSubject);
                setSelectedChapter(ch);
                setContentViewStep("PLAYER");
                setFullScreen(true);
              } else {
                showAlert("Test not found.", "ERROR");
              }
              setLoadingChapters(false);
            });
          }}
        />
      );
    }

    // 3. COURSES TAB (Generic Chapter List for Study Mode)
    if (activeTab === "COURSES") {
      if (
        contentViewStep === "SUBJECTS" &&
        !lucentCategoryView &&
        !homeworkSubjectView
      ) {
        return (
          <div className="p-4 pt-2 max-w-6xl mx-auto pb-4">
            <SubjectSelection
              classLevel={(activeSessionClass as any) || "10"}
              stream={user.stream || "Science"}
              board={activeSessionBoard as any}
              settings={settings}
              initialParentSubject={initialParentSubject}
              onSelect={(subject) => {
                setSelectedSubject(subject);
                setHomeworkSubjectView(null);
                setLucentCategoryView(false);
                if (HOMEWORK_SUBJECTS.includes(subject.id)) {
                  setHomeworkSubjectView(subject.id);
                  return;
                }
                if (subject.id === 'lucent') {
                  setLucentCategoryView(true);
                  setSelectedLucentBook(null);
                  return;
                }
                setContentViewStep("CHAPTERS");
                setSelectedChapter(null);
                setLoadingChapters(true);
                const lang =
                  activeSessionBoard === "BSEB" ? "Hindi" : "English";
                fetchChapters(
                  activeSessionBoard || "CBSE",
                  activeSessionClass || "10",
                  user.stream || "Science",
                  subject,
                  lang,
                ).then((data) => {
                  const sortedData = [...data].sort((a, b) => {
                    const matchA = a.title.match(/(\d+)/);
                    const matchB = b.title.match(/(\d+)/);
                    if (matchA && matchB) {
                      const numA = parseInt(matchA[1], 10);
                      const numB = parseInt(matchB[1], 10);
                      if (numA !== numB) {
                        return numA - numB;
                      }
                    }
                    return a.title.localeCompare(b.title);
                  });
                  setChapters(sortedData);
                  setLoadingChapters(false);
                });
              }}
              onBack={() => {
                if (initialParentSubject) {
                  setInitialParentSubject(null);
                } else {
                  // If going back from root subject list, go back to HOME class selection
                  setActiveSessionClass(null);
                  setActiveSessionBoard(null);
                  onTabChange("HOME");
                }
              }}
            />
          </div>
        );
      }
      return renderContentSection("GENERIC");
    }

    // 4. LEGACY TABS (Mapped to new structure or kept as sub-views)
    if (activeTab === "CUSTOM_PAGE")
      return (
        <CustomBloggerPage
          onBack={() => onTabChange("HOME")}
          settings={settings}
        />
      );
    if (activeTab === "UPDATES")
      return <UniversalInfoPage onBack={() => onTabChange("HOME")} userId={user.id} />;
    if ((activeTab as string) === "SUB_HISTORY")
      return (
        <HistoryPage
          user={user}
          onUpdateUser={handleUserUpdate}
          settings={settings}
          initialTab="SUB_HISTORY"
        />
      );
    if (activeTab === "HISTORY")
      return (
        <HistoryPage
          user={user}
          onUpdateUser={handleUserUpdate}
          settings={settings}
          onResumeRecentChapter={(e) => openRecentChapter(e)}
          onResumeRecentHw={(e) => {
            // Open the homework history overlay then load the specific note.
            setShowHomeworkHistory(true);
            openRecentHw(e);
          }}
          onResumeRecentLucent={(e) => openRecentLucent(e)}
        />
      );
    // DOWNLOADS is handled in the main render flow so bottom nav shows
    if (activeTab === "LEADERBOARD")
      return <Leaderboard user={user} settings={settings} />;
    if (activeTab === "GAME")
      return isGameEnabled ? (
        user.isGameBanned ? (
          <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
            <Ban size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-red-700">Access Denied</h3>
            <p className="text-sm text-red-600">
              Admin has disabled the game for your account.
            </p>
          </div>
        ) : (
          <SpinWheel
            user={user}
            onUpdateUser={handleUserUpdate}
            settings={settings}
          />
        )
      ) : null;
    if (activeTab === "REDEEM")
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RedeemSection user={user} onSuccess={onRedeemSuccess} />
        </div>
      );
    // if (activeTab === 'REWARDS') return (...); // REMOVED TO PREVENT CRASH
    if (activeTab === "STORE") {
      return (
        <Store
          user={user}
          settings={settings}
          onUserUpdate={handleUserUpdate}
        />
      );
    }
    if ((activeTab as any) === "TEACHER_STORE") {
      return (
        <TeacherStore
          user={user}
          settings={settings}
          onRedeemSuccess={handleUserUpdate}
        />
      );
    }
    if ((activeTab as string) === "APP_STORE") {
      if (settings?.appStorePageHidden) {
        return (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-700">App Store unavailable</h3>
            <p className="text-sm text-slate-500 mt-1">This page has been hidden by admin.</p>
          </div>
        );
      }
      return <AppStore settings={settings} />;
    }
    if ((activeTab as string) === "THEME_BUILDER") {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ThemeAnimationBuilder
            user={user}
            onUpdateUser={handleUserUpdate}
            onBack={() => onTabChange("HOME")}
          />
        </div>
      );
    }
    if (activeTab === "PROFILE")
      return (
        <div className="animate-in fade-in zoom-in duration-300 pb-4">
          <div
            className={`rounded-3xl p-8 text-center mb-6 shadow-sm relative overflow-hidden transition-all duration-500 ${
              user.subscriptionLevel === "ULTRA" && user.isPremium
                ? "bg-slate-900 border border-slate-700 shadow-purple-500/10 ring-2 ring-purple-900/50 text-white"
                : user.subscriptionLevel === "BASIC" && user.isPremium
                  ? "bg-gradient-to-br from-sky-50 via-sky-100 to-cyan-50 shadow-sky-500/10 ring-2 ring-sky-200/50 text-sky-900 border border-slate-200"
                  : "bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 shadow-gray-500/10 text-slate-800 grayscale border border-slate-200"
            }`}
          >
            {/* ANIMATED BACKGROUND FOR ULTRA */}
            {user.subscriptionLevel === "ULTRA" && user.isPremium && (
              <>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-spin-slow invert"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
              </>
            )}

            {/* ANIMATED BACKGROUND FOR BASIC */}
            {user.subscriptionLevel === "BASIC" && user.isPremium && (<>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-10"></div>
              {/* White double shimmer */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.22) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 2.5s linear infinite' }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(75deg,transparent 30%,rgba(255,255,255,0.12) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep-reverse 3.8s linear infinite' }} />
              {/* Glow borders */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.7),rgba(147,197,253,0.9),rgba(255,255,255,0.7),transparent)', animation: 'topbar-glow-pulse 2s ease-in-out infinite' }} />
              <div className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)', animation: 'topbar-glow-pulse 2.5s ease-in-out infinite' }} />
              {/* Sparkle dots */}
              <div className="absolute top-3 left-[12%] w-1.5 h-1.5 rounded-full bg-white pointer-events-none" style={{ animation: 'sparkle-blink 2.1s ease-in-out infinite' }} />
              <div className="absolute top-5 left-[38%] w-1 h-1 rounded-full bg-white pointer-events-none" style={{ animation: 'sparkle-blink 1.7s ease-in-out infinite 0.4s' }} />
              <div className="absolute top-4 left-[62%] w-1.5 h-1.5 rounded-full bg-white pointer-events-none" style={{ animation: 'sparkle-blink 2.4s ease-in-out infinite 0.9s' }} />
              <div className="absolute top-3 left-[85%] w-1 h-1 rounded-full bg-white pointer-events-none" style={{ animation: 'sparkle-blink 1.9s ease-in-out infinite 0.2s' }} />
              <div className="absolute bottom-4 left-[25%] w-1 h-1 rounded-full bg-sky-300 pointer-events-none" style={{ animation: 'sparkle-blink 2.6s ease-in-out infinite 0.6s' }} />
              <div className="absolute bottom-3 left-[72%] w-1.5 h-1.5 rounded-full bg-sky-200 pointer-events-none" style={{ animation: 'sparkle-blink 2s ease-in-out infinite 1.1s' }} />
            </>)}

            {/* ADMIN EFFECTS — same as top bar (both apply simultaneously) */}
            {settings?.topBarEffects && settings.topBarEffects.length > 0 && (
              <TopBarEffectsLayer effects={settings.topBarEffects} />
            )}
            {/* USER CUSTOM EFFECT COLOR — gifted via redeem code */}
            {user.topBarEffectColor && (
              <TopBarEffectsLayer effects={[
                { id: 'shimmer-forward', enabled: true, color: user.topBarEffectColor, speed: 1.5 },
                { id: 'glow-both',       enabled: true, color: user.topBarEffectColor, speed: 1 },
                { id: 'sparkle-full',    enabled: true, color: user.topBarEffectColor, speed: 1 },
              ]} />
            )}

            {/* ANIMATED BACKGROUND FOR ULTRA — golden shimmer + sparkle on top of existing */}
            {user.subscriptionLevel === "ULTRA" && user.isPremium && (<>
              {/* Golden double shimmer */}
              <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'linear-gradient(105deg,transparent 30%,rgba(168,85,247,0.16) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 2.5s linear infinite' }} />
              <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'linear-gradient(75deg,transparent 30%,rgba(236,72,153,0.10) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep-reverse 3.8s linear infinite' }} />
              {/* Golden glow borders */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-[1]" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.8),rgba(236,72,153,1),rgba(168,85,247,0.8),transparent)', animation: 'topbar-glow-pulse 2s ease-in-out infinite' }} />
              <div className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none z-[1]" style={{ background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.5),transparent)', animation: 'topbar-glow-pulse 2.5s ease-in-out infinite' }} />
              {/* Golden sparkle dots */}
              <div className="absolute top-3 left-[10%] w-1.5 h-1.5 rounded-full pointer-events-none z-[1]" style={{ background: '#c084fc', animation: 'sparkle-blink 2.1s ease-in-out infinite' }} />
              <div className="absolute top-5 left-[35%] w-1 h-1 rounded-full pointer-events-none z-[1]" style={{ background: '#f472b6', animation: 'sparkle-blink 1.7s ease-in-out infinite 0.4s' }} />
              <div className="absolute top-4 left-[60%] w-1.5 h-1.5 rounded-full pointer-events-none z-[1]" style={{ background: '#c084fc', animation: 'sparkle-blink 2.4s ease-in-out infinite 0.9s' }} />
              <div className="absolute top-3 left-[82%] w-1 h-1 rounded-full pointer-events-none z-[1]" style={{ background: '#f472b6', animation: 'sparkle-blink 1.9s ease-in-out infinite 0.2s' }} />
              <div className="absolute bottom-4 left-[22%] w-1 h-1 rounded-full pointer-events-none z-[1]" style={{ background: '#e879f9', animation: 'sparkle-blink 2.6s ease-in-out infinite 0.6s' }} />
              <div className="absolute bottom-3 left-[70%] w-1.5 h-1.5 rounded-full pointer-events-none z-[1]" style={{ background: '#f9a8d4', animation: 'sparkle-blink 2s ease-in-out infinite 1.1s' }} />
            </>)}

            {/* FREE — subtle dark shimmer + sparkle */}
            {!user.isPremium && (<>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(105deg,transparent 30%,rgba(0,0,0,0.08) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 3s linear infinite' }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(75deg,transparent 30%,rgba(0,0,0,0.05) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep-reverse 4s linear infinite' }} />
              <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(148,163,184,0.5),rgba(203,213,225,0.7),rgba(148,163,184,0.5),transparent)', animation: 'topbar-glow-pulse 2s ease-in-out infinite' }} />
              <div className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(148,163,184,0.3),transparent)', animation: 'topbar-glow-pulse 2.5s ease-in-out infinite' }} />
              <div className="absolute top-3 left-[15%] w-1 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(148,163,184,0.6)', animation: 'sparkle-blink 2.1s ease-in-out infinite' }} />
              <div className="absolute top-5 left-[40%] w-1 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(148,163,184,0.6)', animation: 'sparkle-blink 1.7s ease-in-out infinite 0.4s' }} />
              <div className="absolute top-4 left-[65%] w-1 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(148,163,184,0.6)', animation: 'sparkle-blink 2.4s ease-in-out infinite 0.9s' }} />
              <div className="absolute top-3 left-[85%] w-1 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(148,163,184,0.6)', animation: 'sparkle-blink 1.9s ease-in-out infinite 0.2s' }} />
            </>)}

            {/* SPECIAL BANNER ANIMATION (7/30/365) */}
            {(user.subscriptionTier === "WEEKLY" ||
              user.subscriptionTier === "MONTHLY" ||
              user.subscriptionTier === "YEARLY" ||
              user.subscriptionTier === "LIFETIME") &&
              user.isPremium && (
                <div className="absolute top-2 right-2 animate-bounce">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/30">
                    {user.subscriptionTier === "WEEKLY"
                      ? "7 DAYS"
                      : user.subscriptionTier === "MONTHLY"
                        ? "30 DAYS"
                        : user.subscriptionTier === "LIFETIME"
                          ? "∞"
                          : "365 DAYS"}
                  </span>
                </div>
              )}

            <div
              className={`w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-3xl font-black shadow-2xl relative z-10 overflow-hidden ${
                user.subscriptionLevel === "ULTRA" && user.isPremium
                  ? "text-purple-700 ring-4 ring-purple-300 animate-bounce-slow"
                  : user.subscriptionLevel === "BASIC" && user.isPremium
                    ? "text-sky-600 ring-4 ring-sky-300"
                    : "text-slate-600 ring-4 ring-slate-200"
              }`}
            >
              {/* Show app logo if admin uploaded one, else fall back to first letter.
                  object-cover + w-full h-full so the logo fully fills the circle
                  (was previously object-contain p-2 which left a big white border). */}
              {settings?.appLogo ? (
                <img
                  src={settings.appLogo}
                  alt={settings.appName || 'App Logo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.name || "S").charAt(0)
              )}
              {user.subscriptionLevel === "ULTRA" && user.isPremium && (
                <div className="absolute -top-2 -right-2 text-2xl">👑</div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 relative z-10">
              <h2
                className={`text-2xl font-black tracking-tight ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-white" : "text-slate-800"}`}
              >
                {user.name}
              </h2>
              <button
                onClick={() => {
                  setNewNameInput(user.name);
                  setShowNameChangeModal(true);
                }}
                className="bg-black/10 p-1 rounded-full hover:bg-black/20 transition-colors"
              >
                <Edit
                  size={12}
                  className={
                    user.subscriptionLevel === "ULTRA" && user.isPremium
                      ? "text-white"
                      : "text-slate-600"
                  }
                />
              </button>
            </div>
            <p
              className={`text-sm font-mono relative z-10 flex justify-center items-center gap-2 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-300" : "text-slate-600"}`}
            >
              ID: {user.displayId || user.id}
            </p>
            {user.createdAt && !isNaN(new Date(user.createdAt).getTime()) && (
              <p
                className={`text-[10px] mt-1 font-medium relative z-10 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-400" : "text-slate-500"}`}
              >
                Joined:{" "}
                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}

            <p
              className={`text-[9px] mt-4 relative z-10 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-500" : "text-slate-400"}`}
            >
              App Version: {APP_VERSION}
            </p>
            <p
              className={`text-[9px] relative z-10 ${user.subscriptionLevel === "ULTRA" && user.isPremium ? "text-slate-500" : "text-slate-400"}`}
            >
              Developed by {settings?.developerName?.trim() || 'Nadim Anwar'}
            </p>

            <div className="mt-4 relative z-10">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-black/20 border-2 ${
                  user.subscriptionLevel === "ULTRA" && user.isPremium
                    ? "bg-purple-500 text-white border-purple-300 animate-pulse"
                    : user.subscriptionLevel === "BASIC" && user.isPremium
                      ? "bg-sky-500 text-white border-sky-300"
                      : "bg-slate-600 text-white border-slate-500"
                }`}
              >
                {user.isPremium
                  ? (() => {
                      const tier = user.subscriptionTier;
                      let displayTier = "PREMIUM";

                      if (tier === "WEEKLY") displayTier = "Weekly";
                      else if (tier === "MONTHLY") displayTier = "Monthly";
                      else if (tier === "YEARLY") displayTier = "Yearly";
                      else if (tier === "LIFETIME")
                        displayTier = "Yearly Plus";
                      else if (tier === "3_MONTHLY") displayTier = "Quarterly";
                      else if (tier === "CUSTOM") displayTier = "Custom Plan";

                      return (
                        <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                          {displayTier} {user.subscriptionLevel}
                        </span>
                      );
                    })()
                  : "Free User"}
              </span>
            </div>

            {/* STREAK BADGE — glowing, shows on profile */}
            {user.streak > 0 && (() => {
              const s = user.streak;
              const badgeColor = s >= 30 ? { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.5)', text: '#f87171', glow: 'rgba(239,68,68,0.5)' }
                               : s >= 14 ? { bg: 'rgba(249,115,22,0.18)', border: 'rgba(249,115,22,0.5)', text: '#fb923c', glow: 'rgba(249,115,22,0.5)' }
                               : s >= 7  ? { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.5)', text: '#fbbf24', glow: 'rgba(245,158,11,0.5)' }
                               : s >= 3  ? { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', text: '#fcd34d', glow: 'rgba(251,191,36,0.3)' }
                               :           { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', text: '#fde68a', glow: 'rgba(251,191,36,0.2)' };
              const fireSize = s >= 30 ? '1.5rem' : s >= 14 ? '1.3rem' : s >= 7 ? '1.1rem' : '1rem';
              const label = s >= 30 ? 'Legend' : s >= 14 ? 'Pro' : s >= 7 ? 'On Fire' : s >= 3 ? 'Streak' : 'Streak';
              return (
                <div className="mt-3 relative z-10 flex justify-center">
                  <div
                    className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full"
                    style={{
                      background: badgeColor.bg,
                      border: `1.5px solid ${badgeColor.border}`,
                      boxShadow: `0 0 16px ${badgeColor.glow}, 0 0 32px ${badgeColor.glow}55`,
                      animation: 'topbar-glow-pulse 2s ease-in-out infinite',
                    }}
                  >
                    {/* Shimmer */}
                    <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 2.5s linear infinite' }} />
                    </div>
                    <span style={{ fontSize: fireSize, filter: `drop-shadow(0 0 6px ${badgeColor.glow})`, animation: 'sparkle-blink 1.8s ease-in-out infinite' }}>🔥</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black leading-none" style={{ color: badgeColor.text, textShadow: `0 0 10px ${badgeColor.glow}` }}>{s}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: badgeColor.text, opacity: 0.7 }}>Day {label}</span>
                    </div>
                    {(user.longestStreak || 0) === s && s > 1 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(255,255,255,0.15)', color: badgeColor.text }}>BEST 🏆</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-3 mt-4">
            {/* SUBSCRIPTION CARD */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 shrink-0">
                <Crown size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subscription</p>
                <p className="text-sm font-black text-slate-800 truncate">
                  {user.subscriptionTier === "CUSTOM"
                    ? user.customSubscriptionName || "Basic Ultra"
                    : user.subscriptionTier || "FREE"}
                </p>
                {user.subscriptionEndDate &&
                  user.subscriptionTier !== "LIFETIME" &&
                  !isNaN(new Date(user.subscriptionEndDate).getTime()) && (
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                      Expires {new Date(user.subscriptionEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {(() => {
                        const diff = new Date(user.subscriptionEndDate).getTime() - Date.now();
                        if (diff <= 0) return ' • Expired';
                        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                        return ` • ${d}d left`;
                      })()}
                    </p>
                  )}
              </div>
            </div>

            {/* ACTION LIST */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {/* ADMIN PANEL — visible only to admin / sub-admin */}
              {(user.role === "ADMIN" || user.role === "SUB_ADMIN" || isImpersonating) && (
                <button
                  onClick={handleSwitchToAdmin}
                  className="w-full p-4 flex items-center gap-3 hover:bg-yellow-50 transition-colors active:bg-yellow-100"
                >
                  <div className="bg-yellow-100 w-10 h-10 rounded-xl flex items-center justify-center text-yellow-700 shrink-0">
                    <Layout size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-yellow-800">Admin Panel</p>
                    <p className="text-[11px] text-yellow-600">Manage content, users & settings</p>
                  </div>
                  <ChevronRight size={16} className="text-yellow-400 shrink-0" />
                </button>
              )}
              {/* HISTORY */}
              {(() => {
                const access = getFeatureAccess("HISTORY_PAGE");
                if (access.isHidden) return null;
                const isLocked = !access.hasAccess;
                return (
                  <button
                    onClick={() => {
                      if (isLocked) {
                        showAlert("🔒 Locked by Admin.", "ERROR");
                        return;
                      }
                      onTabChange("HISTORY");
                    }}
                    className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
                  >
                    <div className="bg-rose-100 w-10 h-10 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                      <History size={18} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        History
                        {isLocked && <Lock size={12} className="text-red-500" />}
                      </p>
                      <p className="text-[11px] text-slate-500">Tests, activity & past sessions</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  </button>
                );
              })()}

              {/* Important Notes shortcut moved to bottom-nav (⭐ Important tab). */}

              {/* SETTINGS */}
              <button
                onClick={() => setShowSettingsSheet(true)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
              >
                <div className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                  <Settings size={18} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-slate-800">Settings</p>
                  <p className="text-[11px] text-slate-500">Theme, marksheets, recovery & data</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>

              {/* TEACHER STORE */}
              <button
                onClick={() => onTabChange("TEACHER_STORE" as any)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
              >
                <div className="bg-purple-100 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                  <Crown size={18} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {user.role === "TEACHER" ? "Teacher Store" : "Upgrade to Teacher"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {user.role === "TEACHER" ? "Manage your store & content" : "Unlock premium creator tools"}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>

              {/* LOGOUT */}
              {(settings?.isLogoutEnabled !== false ||
                user.role === "ADMIN" ||
                isImpersonating) && (
                <button
                  onClick={onLogout}
                  className="w-full p-4 flex items-center gap-3 hover:bg-red-50 transition-colors active:bg-red-100"
                >
                  <div className="bg-red-100 w-10 h-10 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                    <LogOut size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-red-600">Logout Safely</p>
                    <p className="text-[11px] text-red-400">Sign out of your account</p>
                  </div>
                  <ChevronRight size={16} className="text-red-300 shrink-0" />
                </button>
              )}
            </div>

            {/* HIDDEN: MY DATA SECTION - kept for settings sheet reference */}
            <div className="hidden bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <Database size={18} className="text-slate-600" /> Data
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewingUserHistory(user)}
                  className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                >
                  <Activity size={14} className="text-blue-500" /> View Full
                  Activity
                </button>
                <button
                  onClick={async () => {
                    try {
                      showAlert("Generating Report...", "INFO");

                      // Create container
                      const element = document.createElement("div");
                      element.style.width = "210mm";
                      element.style.minHeight = "297mm";
                      element.style.padding = "40px";
                      element.style.background = "#ffffff";
                      element.style.fontFamily = "Helvetica, Arial, sans-serif";
                      element.style.position = "fixed";
                      element.style.top = "-9999px";
                      element.style.left = "-9999px";

                      // Calculate Stats
                      const totalTests = user.mcqHistory?.length || 0;
                      const avgScore =
                        totalTests > 0
                          ? Math.round(
                              ((user.mcqHistory?.reduce(
                                (a, b) => a + b.score / b.totalQuestions,
                                0,
                              ) || 0) /
                                totalTests) *
                                100,
                            )
                          : 0;
                      const bestSubject = "General"; // simplified logic for now

                      element.innerHTML = `
                                                <div style="border: 4px solid #1e293b; padding: 40px; height: 100%; box-sizing: border-box; position: relative;">

                                                    <!-- Header -->
                                                    <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                                                        <h1 style="color: #1e293b; font-size: 32px; margin: 0; font-weight: 900; letter-spacing: -1px;">STUDENT PROGRESS REPORT</h1>
                                                        <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">${settings?.appName || "NST AI"} Official Record</p>
                                                    </div>

                                                    <!-- Student Info Grid -->
                                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Student Name</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${user.name}</p>
                                                        </div>
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Student ID</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${user.displayId || user.id.slice(0, 8)}</p>
                                                        </div>
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Class & Stream</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${user.classLevel} - ${user.stream || "General"}</p>
                                                        </div>
                                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px;">
                                                            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Date Generated</p>
                                                            <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 18px; font-weight: bold;">${new Date().toLocaleDateString()}</p>
                                                        </div>
                                                    </div>

                                                    <!-- Performance Snapshot -->
                                                    <h3 style="color: #334155; font-size: 16px; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 20px;">PERFORMANCE SNAPSHOT</h3>
                                                    <div style="display: flex; gap: 20px; margin-bottom: 40px;">
                                                        <div style="flex: 1; text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                                                            <div style="font-size: 32px; font-weight: 900; color: #3b82f6;">${avgScore}%</div>
                                                            <div style="font-size: 12px; color: #64748b; font-weight: bold;">AVERAGE SCORE</div>
                                                        </div>
                                                        <div style="flex: 1; text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                                                            <div style="font-size: 32px; font-weight: 900; color: #10b981;">${totalTests}</div>
                                                            <div style="font-size: 12px; color: #64748b; font-weight: bold;">TESTS TAKEN</div>
                                                        </div>
                                                        <div style="flex: 1; text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                                                            <div style="font-size: 32px; font-weight: 900; color: #f59e0b;">${user.credits}</div>
                                                            <div style="font-size: 12px; color: #64748b; font-weight: bold;">CREDITS EARNED</div>
                                                        </div>
                                                    </div>

                                                    <!-- Recent Activity Table -->
                                                    <h3 style="color: #334155; font-size: 16px; border-left: 4px solid #ec4899; padding-left: 10px; margin-bottom: 20px;">RECENT TEST ACTIVITY</h3>
                                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                                        <thead>
                                                            <tr style="background: #f1f5f9; color: #475569;">
                                                                <th style="padding: 12px; text-align: left; border-radius: 8px 0 0 8px;">DATE</th>
                                                                <th style="padding: 12px; text-align: left;">TOPIC</th>
                                                                <th style="padding: 12px; text-align: right; border-radius: 0 8px 8px 0;">SCORE</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${(
                                                              user.mcqHistory ||
                                                              []
                                                            )
                                                              .slice(0, 15)
                                                              .map(
                                                                (h, i) => `
                                                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                                                    <td style="padding: 12px; color: #64748b;">${h.date && !isNaN(new Date(h.date).getTime()) ? new Date(h.date).toLocaleDateString() : "N/A"}</td>
                                                                    <td style="padding: 12px; font-weight: 600; color: #334155;">${h.chapterTitle.substring(0, 40)}</td>
                                                                    <td style="padding: 12px; text-align: right;">
                                                                        <span style="background: ${h.score / h.totalQuestions >= 0.8 ? "#dcfce7" : "#fee2e2"}; color: ${h.score / h.totalQuestions >= 0.8 ? "#166534" : "#991b1b"}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                                                                            ${h.score}/${h.totalQuestions}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            `,
                                                              )
                                                              .join("")}
                                                        </tbody>
                                                    </table>

                                                    <!-- Footer -->
                                                    <div style="position: absolute; bottom: 40px; left: 40px; right: 40px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                                        This report is system generated by ${settings?.appName || "NST AI"}. Verified & Valid.
                                                    </div>
                                                </div>
                                            `;

                      document.body.appendChild(element);

                      // Render
                      const canvas = await html2canvas(element, {
                        scale: 2,
                        useCORS: true,
                      });
                      const imgData = canvas.toDataURL("image/jpeg", 0.9);

                      const pdf = new jsPDF("p", "mm", "a4");
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight =
                        (canvas.height * pdfWidth) / canvas.width;

                      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                      const safeName = user.name
                        ? user.name.replace(/\s+/g, "_")
                        : "Student";
                      pdf.save(`Report_${safeName}_${Date.now()}.pdf`);

                      document.body.removeChild(element);
                      showAlert("✅ Report Downloaded!", "SUCCESS");
                    } catch (e) {
                      console.error("PDF Error", e);
                      showAlert(
                        "Failed to generate PDF. Please try again.",
                        "ERROR",
                      );
                    }
                  }}
                  className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                >
                  <Download size={14} className="text-red-500" /> Download
                  Optimized Report
                </button>
              </div>
            </div>

          </div>

          {/* SETTINGS SHEET MODAL */}
          {showSettingsSheet && (() => {
            // Read current dark theme type once per render so the labels stay in
            // sync without re-reading localStorage in five different places.
            const themeType = localStorage.getItem("nst_dark_theme_type"); // 'blue' | 'black' | null
            const isBlue = isDarkMode && themeType === "blue";
            const isBlack = isDarkMode && themeType !== "blue";
            // Sheet background needs an explicit dark colour because the global
            // `.dark-mode .bg-white` override turns plain `bg-white` to pure
            // black — that clashed with the blue theme. Pick a softer slate /
            // dark-blue here so the sheet itself feels native to each theme.
            const sheetBg = isBlue
              ? "bg-slate-900 border-t border-blue-900/60"
              : isBlack
                ? "bg-zinc-950 border-t border-zinc-800"
                : "bg-white";
            const sheetTextStrong = isDarkMode ? "text-slate-100" : "text-slate-800";
            const sheetTextMuted  = isDarkMode ? "text-slate-300" : "text-slate-600";
            const cardBg          = isBlue ? "bg-slate-800/70 border-blue-900/60" : isBlack ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200 hover:bg-slate-50";

            return (
            <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsSheet(false)}>
              <div className={`${sheetBg} w-full max-w-lg rounded-t-3xl p-6 shadow-2xl space-y-3 pb-8 animate-in slide-in-from-bottom duration-300`} onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-400/40 rounded-full mx-auto mb-4"></div>
                <h3 className={`text-lg font-black mb-4 flex items-center gap-2 ${sheetTextStrong}`}>
                  <Settings size={18} className={sheetTextMuted} /> {tApp(appLang, 'settings')}
                </h3>

                {/* LANGUAGE TOGGLE — switches app text (settings, rules, warnings) */}
                <div className={`w-full p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${cardBg}`}>
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-indigo-500/20" : "bg-indigo-50"}`}>
                    <Globe size={18} className={isDarkMode ? "text-indigo-300" : "text-indigo-600"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${sheetTextStrong}`}>{tApp(appLang, 'language')}</p>
                    <p className={`text-[11px] ${sheetTextMuted}`}>{tApp(appLang, 'language_hint')}</p>
                  </div>
                  <div className={`flex p-0.5 rounded-full ${isDarkMode ? "bg-black/30" : "bg-slate-100"}`}>
                    <button
                      onClick={() => setAppLangState('EN')}
                      className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${appLang === 'EN' ? (isDarkMode ? 'bg-indigo-500 text-white shadow' : 'bg-white text-indigo-700 shadow') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}
                    >EN</button>
                    <button
                      onClick={() => setAppLangState('HI')}
                      className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${appLang === 'HI' ? (isDarkMode ? 'bg-indigo-500 text-white shadow' : 'bg-white text-indigo-700 shadow') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}
                    >हिं</button>
                  </div>
                </div>

                {/* LIGHT/DARK MODE TOGGLE */}
                <button
                  onClick={() => {
                    if (!isDarkMode) {
                      localStorage.setItem("nst_dark_theme_type", "black");
                      document.documentElement.classList.remove('dark-mode-blue', 'dark-mode-black');
                      document.documentElement.classList.add('dark-mode', 'dark-mode-black');
                      onToggleDarkMode && onToggleDarkMode(true);
                    } else {
                      const currentType = localStorage.getItem("nst_dark_theme_type");
                      if (currentType === "black") {
                        localStorage.setItem("nst_dark_theme_type", "blue");
                        document.documentElement.classList.remove('dark-mode-black');
                        document.documentElement.classList.add('dark-mode', 'dark-mode-blue');
                        onToggleDarkMode && onToggleDarkMode(true);
                      } else {
                        document.documentElement.classList.remove('dark-mode', 'dark-mode-blue', 'dark-mode-black');
                        onToggleDarkMode && onToggleDarkMode(false);
                      }
                    }
                  }}
                  className={`w-full p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${cardBg}`}
                >
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-black/30" : "bg-slate-100"}`}>
                    {isDarkMode ? <Sparkles size={18} className={isBlue ? "text-blue-300" : "text-yellow-400"} /> : <Zap size={18} className="text-slate-600" />}
                  </div>
                  <span className={`text-sm font-bold flex-1 text-left ${sheetTextStrong}`}>
                    {isBlue ? tApp(appLang, 'blue_mode_active') : isBlack ? tApp(appLang, 'black_mode_active') : tApp(appLang, 'light_mode_active')}
                  </span>
                  <div className={`w-10 h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full flex items-center px-1 overflow-hidden`}>
                    <div className={`w-4 h-4 rounded-full transition-transform ${isDarkMode ? "translate-x-4 bg-indigo-500" : "bg-white shadow"}`}></div>
                  </div>
                </button>



                <button onClick={() => setShowSettingsSheet(false)} className={`w-full mt-2 text-sm font-bold py-3 ${sheetTextMuted}`}>
                  {tApp(appLang, 'close')}
                </button>
              </div>
            </div>
            );
          })()}
        </div>
      );

    // Handle Drill-Down Views (Video, PDF, MCQ, AUDIO)
    if (
      activeTab === "VIDEO" ||
      activeTab === "PDF" ||
      activeTab === "MCQ" ||
      (activeTab as any) === "AUDIO"
    ) {
      return renderContentSection(activeTab as any);
    }

    if ((activeTab as string) === "DOWNLOADS") {
      return (
        <div className="animate-in fade-in duration-300">
          <OfflineDownloads onBack={() => onTabChange("HOME")} />
        </div>
      );
    }

    return null;
  };

  if (showBoardPromptForClass) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900/50 p-4 z-[200] fixed inset-0 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-3xl p-6 w-full shadow-2xl relative text-center">
          <button
            onClick={() => setShowBoardPromptForClass(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            Select Board
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Choose your board for Class {showBoardPromptForClass}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setActiveSessionClass(showBoardPromptForClass);
                setActiveSessionBoard("CBSE");
                setShowBoardPromptForClass(null);
                setContentViewStep("SUBJECTS");
                setInitialParentSubject(null);
                onTabChange("COURSES");
              }}
              className="py-4 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              CBSE <br />
              <span className="text-[10px] font-medium text-slate-500">
                (English)
              </span>
            </button>
            <button
              onClick={() => {
                setActiveSessionClass(showBoardPromptForClass);
                setActiveSessionBoard("BSEB");
                setShowBoardPromptForClass(null);
                setContentViewStep("SUBJECTS");
                setInitialParentSubject(null);
                onTabChange("COURSES");
              }}
              className="py-4 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              BSEB <br />
              <span className="text-[10px] font-medium text-slate-500">
                (Hindi)
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- TEACHER LOCKED SCREEN MOVED TO RENDER ---
  if (isTeacherLocked && activeTab !== "STORE") {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <Lock size={64} className="text-purple-500 mb-6" />
        <h1 className="text-3xl font-black text-white mb-2">
          Teacher Access Expired
        </h1>
        <p className="text-slate-500 mb-8 w-full">
          Your Teacher Code has expired. Please enter a new access code or
          purchase a renewal plan to continue using the platform.
        </p>

        <div className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
          <h3 className="text-white font-bold mb-4 text-sm text-left">
            Enter New Teacher Code
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={teacherUnlockCode}
              onChange={(e) => setTeacherUnlockCode(e.target.value)}
              placeholder="e.g. TCH1234"
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-500 font-mono"
            />
            <button
              onClick={() => {
                const codes = settings?.teacherCodes || [];
                const validCode = codes.find(
                  (c) => c.code === teacherUnlockCode && c.isActive,
                );
                if (validCode) {
                  const durationDays = validCode.durationDays || 365;
                  const newExpiry = new Date();
                  newExpiry.setDate(newExpiry.getDate() + durationDays);
                  onRedeemSuccess({
                    ...user,
                    role: "TEACHER",
                    teacherCode: validCode.code,
                    isPremium: true,
                    subscriptionTier: "ULTRA",
                    subscriptionEndDate: newExpiry.toISOString(),
                    teacherExpiryDate: newExpiry.toISOString(),
                  });
                  setTeacherUnlockCode("");
                  setIsTeacherLocked(false);
                  setAlertConfig({
                    isOpen: true,
                    type: "SUCCESS",
                    message: `Success! Account renewed for ${durationDays} days.`,
                  });
                } else {
                  setAlertConfig({
                    isOpen: true,
                    type: "ERROR",
                    message: "Invalid or inactive code.",
                  });
                }
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => onTabChange("STORE")}
            className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
          >
            <ShoppingBag size={18} /> Visit Teacher Store
          </button>
          {(settings?.isLogoutEnabled !== false ||
            user.role === "ADMIN" ||
            isImpersonating) && (
            <button
              onClick={() => {
                if (onLogout) onLogout();
                else {
                  localStorage.removeItem("nst_current_user");
                  window.location.reload();
                }
              }}
              className="w-full text-slate-500 py-4 font-bold hover:text-white"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-0">
      <NotificationPrompt />
      {/* ADMIN SWITCH BUTTON */}
      {(user.role === "ADMIN" ||
        user.role === "SUB_ADMIN" ||
        isImpersonating) && (
        <div className="fixed bottom-36 right-4 z-50 flex flex-col gap-3 items-end">
          <button
            onClick={() => setIsLayoutEditing(!isLayoutEditing)}
            className={`p-4 rounded-full shadow-2xl border-2 hover:scale-110 transition-transform flex items-center gap-2 ${isLayoutEditing ? "bg-yellow-400 text-black border-yellow-500" : "bg-white text-slate-800 border-slate-200"}`}
          >
            <Edit size={20} />
            {isLayoutEditing && (
              <span className="font-bold text-xs">Editing Layout</span>
            )}
          </button>
          <button
            onClick={handleSwitchToAdmin}
            className="bg-slate-900 text-white p-4 rounded-full shadow-2xl border-2 border-slate-700 hover:scale-110 transition-transform flex items-center gap-2 animate-bounce-slow"
          >
            <Layout size={20} className="text-yellow-400" />
            <span className="font-bold text-xs">Admin Panel</span>
          </button>
        </div>
      )}

      {/* NEW GLOBAL TOP BAR */}
      <div
        id="top-banner-container"
        className={`relative sticky top-0 z-[100] w-full shadow-md flex flex-col justify-between px-4 py-3 transition-all duration-300 overflow-hidden ${
          user.isPremium
            ? user.subscriptionLevel === "ULTRA"
              ? "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700"
              : user.subscriptionLevel === "BASIC"
                ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white"
                : "bg-[var(--primary)] text-white"
            : "bg-gradient-to-r from-sky-500 to-cyan-600 text-white"
        } ${isFullscreenMode ? "hidden" : ""} transition-all duration-300 ease-in-out ${(isTopBarHidden || isLandscapeUiHidden) ? "-translate-y-full !h-0 overflow-hidden opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}
      >
        {/* User custom effect color (gifted via redeem code) — always rendered on top */}
        {user.topBarEffectColor && (
          <TopBarEffectsLayer effects={[
            { id: 'shimmer-forward', enabled: true, color: user.topBarEffectColor, speed: 1.5 },
            { id: 'glow-bottom',     enabled: true, color: user.topBarEffectColor, speed: 1 },
            { id: 'sparkle-top',     enabled: true, color: user.topBarEffectColor, speed: 1 },
          ]} />
        )}
        {/* Admin-configured top bar effects (if set), else tier defaults */}
        {settings?.topBarEffects && settings.topBarEffects.length > 0 ? (
          <TopBarEffectsLayer effects={settings.topBarEffects} />
        ) : (<>
          {/* ULTRA default — golden */}
          {user.isPremium && user.subscriptionLevel === 'ULTRA' && (
            <TopBarEffectsLayer effects={[
              { id: 'shimmer-forward', enabled: true, color: '#fbbf24' },
              { id: 'shimmer-reverse', enabled: true, color: '#fbbf24' },
              { id: 'glow-both',       enabled: true, color: '#fbbf24' },
              { id: 'sparkle-full',    enabled: true, color: '#fcd34d' },
            ]} />
          )}
          {/* BASIC default — white */}
          {user.isPremium && user.subscriptionLevel === 'BASIC' && (
            <TopBarEffectsLayer effects={[
              { id: 'shimmer-forward', enabled: true, color: '#ffffff' },
              { id: 'shimmer-reverse', enabled: true, color: '#ffffff' },
              { id: 'glow-both',       enabled: true, color: '#93c5fd' },
              { id: 'sparkle-full',    enabled: true, color: '#ffffff' },
            ]} />
          )}
          {/* FREE default — subtle dark */}
          {!user.isPremium && (
            <TopBarEffectsLayer effects={[
              { id: 'shimmer-forward', enabled: true, color: '#000000' },
              { id: 'shimmer-reverse', enabled: true, color: '#000000' },
              { id: 'glow-bottom',     enabled: true, color: '#bae6fd' },
              { id: 'sparkle-top',     enabled: true, color: '#ffffff' },
            ]} />
          )}
        </>)}
        {/* Main Header Row */}
        <div className="flex items-center justify-between w-full relative">
          <div
            className="flex items-center gap-2 shrink-0 cursor-pointer z-10"
            onClick={() => setShowSidebar(true)}
          >
            <button className="p-1 rounded-full transition-colors hover:bg-white/20 -ml-1 shrink-0">
              <Menu size={20} className="text-white" />
            </button>
            {settings?.appLogo ? (
              <img
                src={settings.appLogo}
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover border-2 border-white/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white shrink-0">
                <BrainCircuit size={16} />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              {/* App name ab waise hi dikhega jaise loading screen pe — short
                  uppercase brand mark (`appShortName`), heavy font, tight
                  tracking. Long name ko truncate hone se bachata hai. */}
              <span className="font-black text-xl leading-tight tracking-tight uppercase whitespace-nowrap truncate">
                {settings?.appShortName || settings?.appName || "IIC"}
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: Fixed action icons + Credits (no scroll) */}
          <div className="flex items-center gap-1 flex-1 min-w-0 ml-1 z-10 justify-end">

              {/* Universal Video is now moved to the home page, not top bar. */}
              {/* Search icon — opens home search from top bar */}
              {isHomeSectionVisible('home_search_button', settings) && (
                <button
                  onClick={() => { setShowHomeSearch(s => !s); setHomeSearchQuery(''); if (activeTab !== 'HOME') onTabChange('HOME'); }}
                  className={`keep-light-badge p-1.5 rounded-full transition-all shrink-0 border active:scale-95 ${showHomeSearch ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-[#FDFBF7] text-slate-800 border-amber-100 hover:bg-blue-50'}`}
                  title="Search"
                >
                  <Search size={15} />
                </button>
              )}

              {/* Streak 🔥 */}
              <button
                onClick={() => { setShowStreakPopup(v => !v); setStreakHistoryView(false); }}
                className={`relative overflow-hidden inline-flex items-center gap-0.5 px-1.5 py-1 rounded-full shadow-sm text-[8px] font-black border backdrop-blur-sm whitespace-nowrap shrink-0 active:scale-95 transition-all min-w-[42px] justify-center ${
                  user.streak > 0
                    ? 'bg-amber-500/25 text-amber-50 border-amber-400/50'
                    : 'bg-white/15 text-white/80 border-white/25'
                }`}
                title={`Login streak: ${user.streak} day${user.streak === 1 ? '' : 's'}`}
              >
                <div className="absolute inset-0 pointer-events-none rounded-full" style={{ boxShadow: user.streak > 0 ? 'inset 0 0 0 1px rgba(251,191,36,0.6)' : 'inset 0 0 0 1px rgba(251,191,36,0.2)', animation: 'topbar-glow-pulse 2s ease-in-out infinite' }} />
                <span className="relative z-10 text-[14px] leading-none">🔥</span>
                <span className="relative z-10">{user.streak}</span>
              </button>

              {/* Rotate screen (All users) */}
              <button
                onClick={async () => {
                  rotateFullscreenRef.current = true;
                  const result = await rotateScreen();
                  rotateFullscreenRef.current = false;
                  if (result === null) {
                    showAlert('Screen rotation is not supported on this device/browser.', 'WARNING');
                  }
                }}
                className={`keep-light-badge p-1.5 rounded-full transition-all shrink-0 border ${
                  isLandscape
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-[#FDFBF7] text-slate-600 border-amber-100'
                }`}
                title={isLandscape ? 'Landscape mode — tap to go portrait' : 'Tap to rotate landscape'}
              >
                <RotateCcw size={15} className={isLandscape ? 'animate-spin-slow' : ''} />
              </button>

              {/* Lightning ⚡ */}
              {!(settings?.hiddenTopBarButtons || []).includes('LIGHTNING') && (
                <button
                  onClick={() => onTabChange("CUSTOM_PAGE")}
                  className="keep-light-badge p-1.5 rounded-full transition-colors relative bg-[#FDFBF7] hover:bg-slate-50 text-slate-800 border border-amber-100 shrink-0"
                >
                  <Zap size={16} />
                  {hasNewUpdate && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              )}

              {/* Notification Bell 🔔 */}
              {!(settings?.hiddenTopBarButtons || []).includes('NOTIFICATION') && allNotifications.length > 0 && (
                <button
                  onClick={() => setShowNotifPage(true)}
                  className="keep-light-badge p-1.5 rounded-full transition-colors relative bg-[#FDFBF7] hover:bg-slate-50 text-slate-800 border border-amber-100 shrink-0"
                  title="Notifications"
                >
                  <Bell size={16} />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full text-[9px] text-white font-black flex items-center justify-center animate-bounce">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              )}

            {/* ── Credits button — always visible on the right ── */}
            {!(settings?.hiddenTopBarButtons || []).includes('CREDITS') && (
              <div className="shrink-0 ml-1">
                {((settings?.specialDiscountEvent?.enabled && (isDiscountLive || isDiscountCooldown)) ? topBarCreditFlip : false) ? (
                  <button
                    onClick={() => onTabChange("STORE")}
                    className={`keep-light-badge banner-premium-shimmer inline-flex items-center justify-center gap-1 min-w-[84px] h-6 px-1 rounded-full shadow-sm text-[8px] font-black hover:scale-105 transition-all duration-500 ease-out whitespace-nowrap shrink-0 border animate-in fade-in zoom-in ${
                      user.subscriptionLevel === 'ULTRA' && user.isPremium
                        ? 'bg-gradient-to-r from-sky-500/25 to-cyan-400/15 text-white border-sky-300/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                        : user.subscriptionLevel === 'BASIC' && user.isPremium
                          ? 'bg-gradient-to-r from-sky-500/20 to-cyan-400/10 text-white border-sky-300/35 shadow-[0_0_10px_rgba(56,189,248,0.18)]'
                          : 'bg-[#FDFBF7] text-slate-800 border-amber-100'
                    }`}
                    title="Discount"
                  >
                    <Ticket size={14} />
                    <span>{Number(settings?.specialDiscountEvent?.discountPercent ?? 20)}%</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onTabChange("STORE")}
                    className={`keep-light-badge banner-premium-shimmer inline-flex items-center justify-center gap-1 min-w-[84px] h-6 px-1 rounded-full shadow-sm text-[8px] font-black hover:scale-105 transition-all duration-500 ease-out whitespace-nowrap shrink-0 border animate-in fade-in zoom-in ${
                      user.subscriptionLevel === 'ULTRA' && user.isPremium
                        ? 'bg-gradient-to-r from-sky-500/25 to-cyan-400/15 text-white border-sky-300/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                        : user.subscriptionLevel === 'BASIC' && user.isPremium
                          ? 'bg-gradient-to-r from-sky-500/20 to-cyan-400/10 text-white border-sky-300/35 shadow-[0_0_10px_rgba(56,189,248,0.18)]'
                          : 'bg-[#FDFBF7] text-slate-800 border-amber-100'
                    }`}
                    title="Credits"
                  >
                    <Crown size={14} className={user.subscriptionLevel === 'ULTRA' && user.isPremium ? 'text-white' : 'fill-slate-800'} />
                    <span>{user.credits} CR</span>
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        {/* SECOND LINE: Subscription badge + expiry + credits scrolling */}
        <div className="flex items-center justify-between w-full mt-0.5 pt-0.5 border-t border-white/10">
          {/* Left: greeting */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[12px] font-bold text-white/90 truncate max-w-[100px]">
              Hey, {(user.name || "Student").split(" ")[0]} 👋
            </span>
          </div>

          {/* Right: subscription badge + expiry */}
          <div className="flex items-center gap-1.5 shrink-0 max-w-[62%] overflow-hidden">

            {/* Subscription level badge — tappable */}
            <button
              onClick={() => { setPremiumQuoteIdx(prev => (prev + 1) % 10); setShowPremiumPopup(true); }}
              className={`banner-premium-shimmer text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border shrink-0 hover:scale-105 transition-transform max-w-[92px] truncate ${
                user.isPremium
                  ? user.subscriptionLevel === 'ULTRA'
                    ? 'bg-gradient-to-r from-violet-500/30 to-purple-400/20 border-violet-300/50 text-white shadow-[0_0_10px_rgba(167,139,250,0.3)]'
                    : user.subscriptionLevel === 'BASIC'
                      ? 'bg-gradient-to-r from-blue-500/30 to-indigo-400/20 border-blue-300/50 text-white shadow-[0_0_10px_rgba(99,179,237,0.3)]'
                      : 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/10 border-white/20 text-white/70'
              }`}
            >
              {user.isPremium
                ? (user.subscriptionLevel || user.subscriptionTier || 'PREMIUM')
                : 'FREE'}
            </button>

            {/* LIFETIME tap badge */}
            {user.isPremium && user.subscriptionTier === 'LIFETIME' && (
              <button
                onClick={() => {
                  const quotes = [
                    "Knowledge is the only wealth that grows when shared.",
                    "A lifetime of learning is a life well lived.",
                    "You don't need deadlines — you have forever to grow.",
                    "Unlimited access, unlimited potential. That's you.",
                    "The best investment is in your own mind.",
                    "Learning never exhausts the mind — Leonardo da Vinci",
                    "Education is not preparation for life; it is life itself.",
                    "You chose forever. Keep going.",
                    "Stars don't expire. Neither does your membership.",
                    "Great minds are built one lesson at a time.",
                  ];
                  setLifetimeQuoteIdx(prev => (prev + 1) % quotes.length);
                  setShowLifetimePopup(true);
                }}
                className="banner-premium-shimmer text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full shrink-0 border bg-gradient-to-r from-amber-400/20 to-yellow-300/10 border-amber-300/40 text-amber-100 hover:scale-105 transition-transform max-w-[92px] truncate"
              >
                ♾ LIFETIME
              </button>
            )}

            {/* Expiry date — for premium with a valid date */}
            {user.isPremium &&
              user.subscriptionTier !== 'LIFETIME' &&
              user.subscriptionEndDate &&
              !isNaN(new Date(user.subscriptionEndDate).getTime()) && (() => {
                const expDate = new Date(user.subscriptionEndDate);
                const today = new Date();
                const diffMs = expDate.getTime() - today.getTime();
                const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
                const daysLeft = Math.floor(totalSeconds / 86400);
                const hoursLeft = Math.floor((totalSeconds % 86400) / 3600);
                const minutesLeft = Math.floor((totalSeconds % 3600) / 60);
                const secondsLeft = totalSeconds % 60;
                const isExpiringSoon = totalSeconds > 0 && totalSeconds <= 7 * 24 * 60 * 60;
                const isExpired = totalSeconds <= 0;
                return (
                  <span className={`banner-premium-shimmer text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full shrink-0 border max-w-[92px] truncate ${
                    isExpired
                      ? 'bg-red-500/40 border-red-300/50 text-red-100 animate-pulse'
                      : isExpiringSoon
                        ? 'bg-orange-500/40 border-orange-300/50 text-orange-100 animate-pulse'
                        : 'bg-black/20 border-white/15 text-white/80'
                  }`}>
                    {isExpired
                      ? '⚠ EXPIRED'
                      : isExpiringSoon
                        ? `⏳ ${daysLeft}d ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s left`
                        : `📅 ${expDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).toUpperCase()}`
                    }
                  </span>
                );
              })()}

          </div>
        </div>
      </div>

      {/* LIFETIME POPUP — enhanced with white shimmer */}
      {showLifetimePopup && !isFullscreenMode && (() => {
        const quotes = [
          { text: "A lifetime of learning is a life truly lived.", author: "IIC Wisdom" },
          { text: "You don't need deadlines — you have forever to grow.", author: "IIC Wisdom" },
          { text: "Unlimited access, unlimited potential. That's you.", author: "IIC Wisdom" },
          { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
          { text: "Education is not preparation for life; it is life itself.", author: "John Dewey" },
          { text: "Stars don't expire. Neither does your membership.", author: "IIC Wisdom" },
          { text: "The best investment you can ever make is in your own mind.", author: "Warren Buffett" },
          { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
          { text: "Great minds are built one lesson at a time.", author: "IIC Wisdom" },
          { text: "You chose forever. That says everything about you.", author: "IIC Wisdom" },
        ];
        const q = quotes[lifetimeQuoteIdx % quotes.length];
        return (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-6 px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowLifetimePopup(false)}>
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(160deg,#0d0d1a 0%,#1a0e2e 40%,#0f1a3d 100%)', border: '1px solid rgba(251,191,36,0.3)' }} onClick={e => e.stopPropagation()}>

              {/* Golden shimmer sweep overlay */}
              <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'linear-gradient(105deg,transparent 35%,rgba(251,191,36,0.18) 50%,transparent 65%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 2.5s linear infinite' }} />

              {/* Animated gold top strip */}
              <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#f59e0b,#fcd34d,#f59e0b,#fde68a,#f59e0b)', backgroundSize: '300% 100%', animation: 'shimmer-sweep 2s linear infinite' }} />

              {/* Star particles */}
              <div className="absolute top-6 left-4 text-amber-300/20 text-xs select-none pointer-events-none">✦ ✦ ✦</div>
              <div className="absolute top-8 right-5 text-amber-300/15 text-[10px] select-none pointer-events-none">★ ✦ ★</div>

              <div className="relative z-20 px-6 pt-6 pb-5 flex flex-col items-center gap-4">

                {/* Icon ring */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl" style={{ background: 'radial-gradient(circle,rgba(251,191,36,0.25) 0%,rgba(251,191,36,0.05) 70%)', border: '2px solid rgba(251,191,36,0.45)', boxShadow: '0 0 28px rgba(251,191,36,0.25),inset 0 0 16px rgba(251,191,36,0.1)' }}>♾</div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs shadow-lg">👑</div>
                </div>

                {/* Title */}
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/60 mb-1">Your Membership</p>
                  <h2 className="text-3xl font-black tracking-widest" style={{ background: 'linear-gradient(135deg,#fcd34d,#f59e0b,#fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LIFETIME</h2>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <div className="h-px w-8 bg-amber-400/30" />
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">No Expiry · Forever Access</p>
                    <div className="h-px w-8 bg-amber-400/30" />
                  </div>
                </div>

                {/* Member name card */}
                <div className="w-full px-4 py-2.5 rounded-xl text-center" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <p className="text-[10px] text-amber-300/50 uppercase tracking-widest mb-0.5">Member</p>
                  <p className="text-sm font-black text-white">{user.name || 'Student'}</p>
                </div>

                {/* Quote card */}
                <div className="w-full rounded-2xl px-4 py-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] text-amber-300/40 uppercase tracking-widest text-center mb-3">✦ Daily Wisdom ✦</p>
                  <p className="text-sm font-semibold text-white/90 leading-relaxed italic text-center">"{q.text}"</p>
                  <p className="text-[10px] text-amber-300/50 text-center mt-2 font-bold">— {q.author}</p>
                </div>

                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {quotes.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all ${i === lifetimeQuoteIdx % quotes.length ? 'w-4 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-white/20'}`} />
                  ))}
                </div>

                {/* Buttons */}
                <div className="w-full flex gap-2 mt-1">
                  <button onClick={() => setLifetimeQuoteIdx(p => (p + 1) % quotes.length)} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-amber-200 hover:scale-105 transition-transform" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>Next Quote ✦</button>
                  <button onClick={() => setShowLifetimePopup(false)} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white/60 hover:scale-105 transition-transform" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Close</button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ULTRA / BASIC / FREE POPUP */}
      {showPremiumPopup && !isFullscreenMode && (() => {
        const tier = user.isPremium ? (user.subscriptionLevel || user.subscriptionTier || 'PREMIUM') : 'FREE';
        const isUltra = tier === 'ULTRA';
        const isBasic = tier === 'BASIC';

        const ultraQuotes = [
          { text: "Excellence is not a destination; it's a continuous journey.", author: "IIC Wisdom" },
          { text: "Ultra minds think big, learn deep, and rise above.", author: "IIC Wisdom" },
          { text: "You didn't settle for average. That's why you're here.", author: "IIC Wisdom" },
          { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
          { text: "Push yourself, because no one else is going to do it for you.", author: "IIC Wisdom" },
          { text: "Success is the sum of small efforts, repeated daily.", author: "Robert Collier" },
          { text: "Dream big. Study hard. Make it happen.", author: "IIC Wisdom" },
          { text: "The harder you work, the luckier you get.", author: "Gary Player" },
          { text: "Champions keep going when they don't feel like it.", author: "IIC Wisdom" },
          { text: "Ultra access. Ultra effort. Ultra results.", author: "IIC Wisdom" },
        ];
        const basicQuotes = [
          { text: "Every expert was once a beginner.", author: "Helen Hayes" },
          { text: "Small steps every day lead to big results.", author: "IIC Wisdom" },
          { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
          { text: "Consistency beats intensity every single time.", author: "IIC Wisdom" },
          { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
          { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
          { text: "Progress, not perfection, is the goal.", author: "IIC Wisdom" },
          { text: "Your future self will thank you for studying today.", author: "IIC Wisdom" },
          { text: "The only bad workout is the one that didn't happen.", author: "IIC Wisdom" },
          { text: "You are one lesson away from a breakthrough.", author: "IIC Wisdom" },
        ];
        const freeQuotes = [
          { text: "Every journey begins with a single step.", author: "Lao Tzu" },
          { text: "Free access, infinite possibilities.", author: "IIC Wisdom" },
          { text: "Knowledge is free. The effort to get it is priceless.", author: "IIC Wisdom" },
          { text: "Start small. Think big. Keep learning.", author: "IIC Wisdom" },
          { text: "The more you learn, the more you earn.", author: "Warren Buffett" },
          { text: "Education is the most powerful weapon.", author: "Nelson Mandela" },
          { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
          { text: "Curiosity is the engine of achievement.", author: "Ken Robinson" },
          { text: "The capacity to learn is a gift. Use it.", author: "IIC Wisdom" },
          { text: "Great things start with great learning.", author: "IIC Wisdom" },
        ];

        const quotes = isUltra ? ultraQuotes : isBasic ? basicQuotes : freeQuotes;
        const q = quotes[premiumQuoteIdx % quotes.length];

        const colors = isUltra ? {
          grad: 'linear-gradient(160deg,#0d0920,#1a0e38,#0d1a30)',
          outerBorder: 'rgba(167,139,250,0.3)',
          strip: 'linear-gradient(90deg,#7c3aed,#a78bfa,#7c3aed,#c4b5fd,#7c3aed)',
          icon: '⚡', iconBg: 'rgba(124,58,237,0.25)', iconBgOuter: 'rgba(124,58,237,0.05)',
          iconBorder: 'rgba(167,139,250,0.5)', iconGlow: '0 0 28px rgba(167,139,250,0.3),inset 0 0 16px rgba(167,139,250,0.1)',
          badgePip: '#7c3aed', pipIcon: '⚡',
          titleGrad: 'linear-gradient(135deg,#c4b5fd,#a78bfa,#ede9fe)',
          labelColor: 'rgba(196,181,253,0.6)', dividerColor: 'rgba(167,139,250,0.3)',
          subtitle: 'Ultra Access · Full Power',
          nameBg: 'rgba(124,58,237,0.12)', nameBorder: 'rgba(167,139,250,0.2)', nameLabel: 'rgba(196,181,253,0.5)',
          cardBorder: '1px solid rgba(167,139,250,0.15)',
          quoteLabel: 'rgba(196,181,253,0.4)', quoteMeta: 'rgba(196,181,253,0.6)',
          dotColor: '#a78bfa', particleColor: 'rgba(196,181,253,0.2)',
          nextBtn: 'rgba(124,58,237,0.2)', nextBtnBorder: 'rgba(167,139,250,0.4)', nextBtnColor: '#c4b5fd',
        } : isBasic ? {
          grad: 'linear-gradient(160deg,#050d1a,#0d1e38,#091428)',
          outerBorder: 'rgba(96,165,250,0.3)',
          strip: 'linear-gradient(90deg,#2563eb,#60a5fa,#2563eb,#93c5fd,#2563eb)',
          icon: '🎓', iconBg: 'rgba(37,99,235,0.25)', iconBgOuter: 'rgba(37,99,235,0.05)',
          iconBorder: 'rgba(96,165,250,0.5)', iconGlow: '0 0 28px rgba(96,165,250,0.25),inset 0 0 16px rgba(96,165,250,0.1)',
          badgePip: '#2563eb', pipIcon: '🎓',
          titleGrad: 'linear-gradient(135deg,#93c5fd,#60a5fa,#dbeafe)',
          labelColor: 'rgba(147,197,253,0.6)', dividerColor: 'rgba(96,165,250,0.3)',
          subtitle: 'Basic Plan · Keep Growing',
          nameBg: 'rgba(37,99,235,0.12)', nameBorder: 'rgba(96,165,250,0.2)', nameLabel: 'rgba(147,197,253,0.5)',
          cardBorder: '1px solid rgba(96,165,250,0.15)',
          quoteLabel: 'rgba(147,197,253,0.4)', quoteMeta: 'rgba(147,197,253,0.6)',
          dotColor: '#60a5fa', particleColor: 'rgba(147,197,253,0.2)',
          nextBtn: 'rgba(37,99,235,0.2)', nextBtnBorder: 'rgba(96,165,250,0.4)', nextBtnColor: '#93c5fd',
        } : {
          grad: 'linear-gradient(160deg,#0a0a0a,#141414,#0a0f1a)',
          outerBorder: 'rgba(148,163,184,0.2)',
          strip: 'linear-gradient(90deg,#475569,#94a3b8,#475569,#cbd5e1,#475569)',
          icon: '🌱', iconBg: 'rgba(71,85,105,0.25)', iconBgOuter: 'rgba(71,85,105,0.05)',
          iconBorder: 'rgba(148,163,184,0.4)', iconGlow: '0 0 16px rgba(148,163,184,0.15)',
          badgePip: '#475569', pipIcon: '🌱',
          titleGrad: 'linear-gradient(135deg,#cbd5e1,#94a3b8,#e2e8f0)',
          labelColor: 'rgba(203,213,225,0.5)', dividerColor: 'rgba(148,163,184,0.25)',
          subtitle: 'Free Plan · Start Learning',
          nameBg: 'rgba(71,85,105,0.15)', nameBorder: 'rgba(148,163,184,0.2)', nameLabel: 'rgba(203,213,225,0.4)',
          cardBorder: '1px solid rgba(148,163,184,0.12)',
          quoteLabel: 'rgba(203,213,225,0.35)', quoteMeta: 'rgba(203,213,225,0.5)',
          dotColor: '#94a3b8', particleColor: 'rgba(203,213,225,0.15)',
          nextBtn: 'rgba(71,85,105,0.25)', nextBtnBorder: 'rgba(148,163,184,0.3)', nextBtnColor: '#cbd5e1',
        };

        return (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-6 px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowPremiumPopup(false)}>
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ background: colors.grad, border: `1px solid ${colors.outerBorder}` }} onClick={e => e.stopPropagation()}>

              {/* White shimmer sweep — ULTRA only */}
              {isUltra && (
                <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.12) 50%,transparent 65%)', backgroundSize: '200% 100%', animation: 'shimmer-sweep 2.5s linear infinite' }} />
              )}

              {/* Animated colour top strip */}
              <div className="h-1.5 w-full" style={{ background: colors.strip, backgroundSize: '300% 100%', animation: 'shimmer-sweep 2s linear infinite' }} />

              {/* Particle decoration */}
              <div className="absolute top-6 left-4 select-none pointer-events-none text-xs" style={{ color: colors.particleColor }}>✦ ✦ ✦</div>
              <div className="absolute top-8 right-5 select-none pointer-events-none text-[10px]" style={{ color: colors.particleColor }}>★ ✦ ★</div>

              <div className="relative z-20 px-6 pt-6 pb-5 flex flex-col items-center gap-4">

                {/* Icon ring with crown badge */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl" style={{ background: `radial-gradient(circle,${colors.iconBg} 0%,${colors.iconBgOuter} 70%)`, border: `2px solid ${colors.iconBorder}`, boxShadow: colors.iconGlow }}>
                    {colors.icon}
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg" style={{ background: colors.badgePip }}>{colors.pipIcon}</div>
                </div>

                {/* Title */}
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: colors.labelColor }}>Your Membership</p>
                  <h2 className="text-3xl font-black tracking-widest" style={{ background: colors.titleGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{tier}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <div className="h-px w-8" style={{ background: colors.dividerColor }} />
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{colors.subtitle}</p>
                    <div className="h-px w-8" style={{ background: colors.dividerColor }} />
                  </div>
                </div>

                {/* Member name card */}
                <div className="w-full px-4 py-2.5 rounded-xl text-center" style={{ background: colors.nameBg, border: `1px solid ${colors.nameBorder}` }}>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: colors.nameLabel }}>Member</p>
                  <p className="text-sm font-black text-white">{user.name || 'Student'}</p>
                </div>

                {/* Quote card */}
                <div className="w-full rounded-2xl px-4 py-4" style={{ background: 'rgba(255,255,255,0.04)', border: colors.cardBorder }}>
                  <p className="text-[10px] uppercase tracking-widest text-center mb-3" style={{ color: colors.quoteLabel }}>✦ Daily Wisdom ✦</p>
                  <p className="text-sm font-semibold text-white/90 leading-relaxed italic text-center">"{q.text}"</p>
                  <p className="text-[10px] text-center mt-2 font-bold" style={{ color: colors.quoteMeta }}>— {q.author}</p>
                </div>

                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {quotes.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all ${i === premiumQuoteIdx % quotes.length ? 'w-4 h-1.5' : 'w-1.5 h-1.5 bg-white/20'}`} style={i === premiumQuoteIdx % quotes.length ? { background: colors.dotColor } : {}} />
                  ))}
                </div>

                {/* Buttons */}
                <div className="w-full flex gap-2 mt-1">
                  <button onClick={() => setPremiumQuoteIdx(p => (p + 1) % quotes.length)} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-transform" style={{ background: colors.nextBtn, border: `1px solid ${colors.nextBtnBorder}`, color: colors.nextBtnColor }}>Next Quote ✦</button>
                  <button onClick={() => setShowPremiumPopup(false)} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white/50 hover:scale-105 transition-transform" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Close</button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* STREAK DETAIL POPUP — full bottom-sheet modal */}
      {showStreakPopup && !isFullscreenMode && !isTopBarHidden && (() => {
        // ── helpers ──────────────────────────────────────────────
        const fmtHours = (sec: number) => {
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          if (h === 0 && m === 0) return '0m';
          if (h === 0) return `${m}m`;
          if (m === 0) return `${h}h`;
          return `${h}h ${m}m`;
        };

        // ── 10-day study history from localStorage ───────────────
        const last10: { label: string; dayLabel: string; seconds: number; isToday: boolean }[] = [];
        for (let i = 9; i >= 0; i--) {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - i);
          const key = `activity_${user.id}_${d.toDateString()}`;
          const seconds = parseInt(localStorage.getItem(key) || '0');
          const shortLabels = ['S','M','T','W','T','F','S'];
          last10.push({
            label: i === 0 ? 'Today' : shortLabels[d.getDay()],
            dayLabel: shortLabels[d.getDay()],
            seconds,
            isToday: i === 0,
          });
        }
        const maxSec = Math.max(...last10.map(d => d.seconds), 1);
        const totalSec10d = last10.reduce((s, d) => s + d.seconds, 0);
        const bestDaySec = Math.max(...last10.map(d => d.seconds));

        const isMilestone = [1, 2, 3, 4, 5, 7, 14, 21, 30, 50, 100].includes(user.streak);
        const milestones = [1, 2, 3, 4, 5, 7, 14, 21, 30, 50, 100];
        const nextMilestone = milestones.find(m => m > user.streak) ?? 100;
        const prevMilestone = milestones.filter(m => m <= user.streak).pop() ?? 0;
        const daysToNext = nextMilestone - user.streak;

        // ── Study goal progress ──────────────────────────────────
        const studyPct = Math.min(100, Math.round((dailyStudySeconds / Math.max(dailyTargetSeconds, 1)) * 100));
        const goalMet = dailyStudySeconds >= dailyTargetSeconds;
        const todayItems = getTodayItemCount();
        const r = 15.9;
        const circumference = 2 * Math.PI * r;
        const dashOffset = circumference * (1 - studyPct / 100);

        // Day-based fire config: each day makes fire bigger & more premium

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
              onClick={() => { setShowStreakPopup(false); setStreakHistoryView(false); }}
            />

            {/* Confetti when study goal is met */}
            {goalMet && (
              <div className="fixed inset-0 z-[115] pointer-events-none overflow-hidden">
                {[...Array(18)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${3 + i * 5.5}%`,
                    top: '-12px',
                    width: i % 3 === 0 ? 9 : 6,
                    height: i % 3 === 0 ? 9 : 6,
                    borderRadius: i % 2 === 0 ? '50%' : '2px',
                    background: ['#fbbf24','#f87171','#34d399','#60a5fa','#c084fc','#fb923c'][i % 6],
                    animation: `${i % 2 === 0 ? 'confettiFall' : 'confettiWave'} ${1.1 + (i % 5) * 0.25}s ease-in forwards ${i * 0.07}s`,
                  }} />
                ))}
              </div>
            )}

            {/* Compact bottom-sheet modal */}
            <div className="fixed inset-x-0 bottom-16 z-[120] flex justify-center px-4 pointer-events-none">
            <div
              className="relative w-full max-w-sm rounded-3xl shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-300 pointer-events-auto overflow-hidden"
              style={{ background: 'linear-gradient(180deg,#171433 0%,#0b0d18 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Top accent bar */}
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl" style={{ background: 'linear-gradient(90deg,#f59e0b,#ff7a18,#fbbf24,#f59e0b)', backgroundSize: '200% 100%' }} />

              <button
                onClick={() => { setShowStreakPopup(false); setStreakHistoryView(false); }}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white z-10"
                style={{ background: 'rgba(255,255,255,0.07)', fontSize: '18px', lineHeight: 1 }}
              >×</button>

              <div className="relative px-5 pt-5 pb-4">

                {!streakHistoryView ? (
                  <>
                    {/* ══ COMPACT DEFAULT VIEW ══ */}
                    {/* Fire + streak  |  Progress circle */}
                    <div className="flex items-center gap-4 mb-3">
                      {/* Fire */}
                      <div className="flex flex-col items-center shrink-0">
                        <span style={{
                          fontSize: 46, lineHeight: 1,
                          filter: 'drop-shadow(0 0 10px rgba(251,146,60,0.7)) drop-shadow(0 0 22px rgba(249,115,22,0.4))',
                          display: 'block',
                          animation: user.streak >= 7 ? 'streak-live-fire 1.2s ease-in-out infinite alternate' : undefined,
                        }}>🔥</span>
                        <div className="font-black leading-none mt-0.5 text-center" style={{
                          fontSize: user.streak >= 100 ? '1.9rem' : '2.3rem',
                          color: '#fbbf24',
                          textShadow: '0 0 14px rgba(251,146,60,0.55)',
                        }}>{user.streak}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(251,191,36,0.45)' }}>days</div>
                      </div>

                      <div className="w-px h-16 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

                      {/* Study goal progress */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* SVG circle */}
                        <div className="relative w-[60px] h-[60px] shrink-0">
                          <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.8" />
                            <circle
                              cx="18" cy="18" r="15.9" fill="none"
                              stroke={goalMet ? '#34d399' : '#f59e0b'}
                              strokeWidth="2.8"
                              strokeLinecap="round"
                              strokeDasharray={`${circumference}`}
                              strokeDashoffset={`${dashOffset}`}
                              style={{ transition: 'stroke-dashoffset 1s ease', filter: goalMet ? 'drop-shadow(0 0 3px rgba(52,211,153,0.8))' : 'drop-shadow(0 0 3px rgba(251,191,36,0.7))' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-black text-white leading-none" style={{ fontSize: '12px' }}>{studyPct}%</span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>Aaj Ka Goal</p>
                          <p className="text-[13px] font-black text-white leading-tight">
                            {fmtHours(dailyStudySeconds)}
                            <span className="text-[10px] font-bold ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>/ {fmtHours(dailyTargetSeconds)}</span>
                          </p>
                          <p className="text-[11px] font-semibold mt-0.5" style={{ color: goalMet ? '#34d399' : 'rgba(251,191,36,0.75)' }}>
                            {goalMet ? '🎉 Goal poora! Shabash!' : `📖 ${todayItems} page${todayItems !== 1 ? 's' : ''} padhe aaj`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Milestone badge or next milestone chip */}
                    {isMilestone ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl mb-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <span className="text-sm">🏆</span>
                        <p className="text-[12px] font-black" style={{ color: '#fbbf24' }}>{user.streak} Day Milestone! Zabardast!</p>
                      </div>
                    ) : user.streak < 100 ? (
                      <div className="px-3 py-2.5 rounded-2xl mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex justify-between text-[9px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <span>🎯 Next milestone: {nextMilestone}d</span>
                          <span style={{ color: '#fbbf24' }}>{daysToNext}d left</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{
                            width: `${Math.min(100, ((user.streak - prevMilestone) / Math.max(nextMilestone - prevMilestone, 1)) * 100)}%`,
                            background: 'linear-gradient(90deg,#f59e0b,#fde68a)',
                            boxShadow: '0 0 5px rgba(251,191,36,0.45)',
                          }} />
                        </div>
                      </div>
                    ) : null}

                    {/* Study History toggle */}
                    <button
                      onClick={() => setStreakHistoryView(true)}
                      className="w-full py-2.5 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgba(196,181,253,0.82)' }}
                    >
                      <span>📊</span> Study History dekho
                    </button>
                  </>
                ) : (
                  <>
                    {/* ══ HISTORY VIEW (inline, compact) ══ */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-black text-white">10-Day Study History</p>
                      <button onClick={() => setStreakHistoryView(false)} className="text-[10px] font-bold px-2.5 py-1 rounded-xl" style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.07)' }}>← Back</button>
                    </div>

                    {/* Today highlight */}
                    <div className="rounded-2xl p-3 mb-3 flex items-center gap-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)' }}>
                      <span className="text-xl">⏱️</span>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#fbbf24' }}>Today</p>
                        <p className="text-xl font-black text-white leading-tight">{fmtHours(dailyStudySeconds)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Best Day</p>
                        <p className="text-base font-black text-white">{fmtHours(bestDaySec)}</p>
                      </div>
                    </div>

                    {/* Compact bar chart */}
                    <div className="flex items-end gap-1.5 mb-1" style={{ height: '80px' }}>
                      {last10.map((d, i) => {
                        const pct = maxSec > 0 ? (d.seconds / maxSec) * 100 : 0;
                        const hrs = d.seconds / 3600;
                        const barColor = d.isToday
                          ? 'linear-gradient(180deg,#fde68a,#f59e0b)'
                          : hrs >= 3 ? 'linear-gradient(180deg,#6ee7b7,#10b981)'
                          : hrs >= 1 ? 'linear-gradient(180deg,#a5b4fc,#6366f1)'
                          : 'rgba(255,255,255,0.1)';
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                              <div className="w-full rounded-t-md" style={{
                                height: `${Math.max(pct, d.seconds > 0 ? 10 : 4)}%`,
                                background: barColor,
                                minHeight: d.seconds > 0 ? '6px' : '2px',
                                boxShadow: d.isToday ? '0 0 8px rgba(251,191,36,0.55)' : 'none',
                                transition: 'height 0.5s ease',
                              }} />
                            </div>
                            <span className="text-[7px] font-black" style={{ color: d.isToday ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                              {d.isToday ? '●' : d.dayLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {[
                        { color: 'linear-gradient(90deg,#6ee7b7,#10b981)', label: '3h+' },
                        { color: 'linear-gradient(90deg,#a5b4fc,#6366f1)', label: '1–3h' },
                        { color: 'rgba(255,255,255,0.15)', label: '<1h' },
                        { color: 'linear-gradient(90deg,#fde68a,#f59e0b)', label: 'Today' },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                          <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </div>
            </div>
            </div>
          </>
        );
      })()}

      {/* NOTIFICATION BAR (Only on Home) (COMPACT VERSION) */}
      {activeTab === "HOME" && settings?.noticeText && isHomeSectionVisible('home_notice_bar', settings) && (
        <div className="bg-slate-900 text-white p-3 mb-4 rounded-xl shadow-md border border-slate-700 animate-in slide-in-from-top-4 relative mx-2 mt-2">
          <div className="flex items-center gap-3">
            <Megaphone size={16} className="text-yellow-400 shrink-0" />
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium truncate">
                {settings.noticeText}
              </p>
            </div>
            <SpeakButton
              text={settings.noticeText}
              className="text-white hover:bg-white/10"
              iconSize={14}
            />
          </div>
        </div>
      )}

      {/* DAILY GK & GLOBAL CHALLENGE (Only on Home) */}
      {activeTab === "HOME" && isHomeSectionVisible('home_promo_banners', settings) && (() => {
        const banners: React.ReactNode[] = [];

        // 1. GLOBAL CHALLENGE MCQ
        if (
          settings?.globalChallengeMcq &&
          settings.globalChallengeMcq.length > 0
        ) {
              banners.push(
                <div
                  key="global-challenge"
                  className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden h-full w-full absolute top-0 left-0 animate-in fade-in zoom-in duration-300"
                >
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 text-orange-200 opacity-50">
                    <Trophy size={64} />
                  </div>
                  <h4 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                    <Trophy size={14} className="text-orange-600" /> Challenge
                    of the Day
                  </h4>
                  <div className="relative z-10">
                    <p className="font-bold text-slate-800 text-sm mb-3 leading-snug">
                      {settings.globalChallengeMcq[0].question}
                    </p>
                    <div className="space-y-2">
                      {settings.globalChallengeMcq[0].options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const mcq = settings.globalChallengeMcq![0];
                            const isCorrect = i === mcq.correctAnswer;
                            // ── MY MISTAKE BANK ──────────────────────────
                            // Challenge of the Day auto-submits on tap (no
                            // Submit button) — user reported wrong answers
                            // here were never landing on the My Mistake
                            // page. So track them inline: wrong → add,
                            // right → remove (so a fixed mistake disappears).
                            try {
                              if (isCorrect) {
                                removeMistakeByQuestion(mcq.question, mcq.correctAnswer);
                              } else {
                                addMistakes([{
                                  question: mcq.question,
                                  options: mcq.options || [],
                                  correctAnswer: mcq.correctAnswer,
                                  explanation: (mcq as any).explanation,
                                  topic: (mcq as any).topic || 'Daily Challenge',
                                  chapterTitle: 'Challenge of the Day',
                                  subjectName: (mcq as any).subjectName || 'Challenge',
                                  classLevel: user.classLevel,
                                  board: user.board,
                                  source: 'CHALLENGE',
                                }]);
                              }
                            } catch (err) { console.warn('mistakeBank update failed:', err); }
                            if (isCorrect) {
                              showAlert(
                                "🎉 Correct Answer! Great job!",
                                "SUCCESS",
                              );
                            } else {
                              showAlert(
                                `❌ Incorrect. The right answer is: ${mcq.options[mcq.correctAnswer]}. Added to My Mistake page for revision.`,
                                "ERROR",
                              );
                            }
                          }}
                          className="w-full text-left p-2.5 rounded-lg border border-orange-200 bg-white hover:bg-orange-100 text-sm font-medium text-slate-700 transition-colors shadow-sm"
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
              );
            }

            // 3. CHALLENGE 2.0
            if (activeChallenges20.length > 0) {
              activeChallenges20
                .filter(
                  (c) =>
                    !testAttempts[c.id] ||
                    testAttempts[c.id].isCompleted !== true,
                )
                .forEach((challenge, idx) => {
                  banners.push(
                    <div
                      key={`challenge-20-${idx}`}
                      className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-200 shadow-sm relative overflow-hidden h-full w-full absolute top-0 left-0 animate-in fade-in zoom-in duration-300"
                    >
                      <div className="absolute top-0 right-0 -mr-4 -mt-4 text-violet-200 opacity-50">
                        <Rocket size={64} />
                      </div>
                      <h4 className="text-xs font-black text-violet-800 uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                        <Rocket size={14} className="text-violet-600" />{" "}
                        {challenge.type === "DAILY_CHALLENGE"
                          ? "Daily Challenge"
                          : "Weekly Test"}{" "}
                        2.0
                      </h4>
                      <div className="relative z-10">
                        <p className="font-bold text-slate-800 text-sm mb-1 leading-snug">
                          {challenge.title}
                        </p>
                        <p className="text-xs text-slate-600 mb-3">
                          {challenge.questions.length} Questions •{" "}
                          {challenge.durationMinutes} Mins
                        </p>
                        <button
                          onClick={() => {
                            if (onStartWeeklyTest) {
                              // Map Challenge20 to WeeklyTest structure to use WeeklyTestView
                              onStartWeeklyTest({
                                id: challenge.id,
                                title: challenge.title,
                                date: new Date().toISOString(),
                                durationMinutes: challenge.durationMinutes,
                                isCompleted: false,
                                score: 0,
                                totalQuestions: challenge.questions.length,
                                questions: challenge.questions,
                                classLevel: challenge.classLevel,
                              } as any);
                            }
                          }}
                          className="w-full text-center p-2 rounded-lg bg-violet-600 text-white text-sm font-bold shadow-md hover:bg-violet-700 transition-colors"
                        >
                          Start Challenge
                        </button>
                      </div>
                    </div>,
                  );
                });
            }

        if (banners.length === 0) return null;

        // Show only the current banner
        const currentIndex = homeBannerIndex % banners.length;

        return (
          <div className="mx-4 mt-4 mb-4 relative min-h-[82px]">
            {banners[currentIndex]}
          </div>
        );
      })()}

      {/* AI NOTES MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {settings?.aiName || "AI Notes"}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Instant Note Generator
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setAiResult(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {!aiResult ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                    What topic do you want notes for?
                  </label>
                  <textarea
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion, Photosynthesis process..."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-800 focus:ring-2 focus:ring-indigo-100 h-32 resize-none"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="text-blue-600 mt-0.5 shrink-0"
                  />
                  <div className="text-xs text-blue-800">
                    <span className="font-bold block mb-1">Usage Limit</span>
                    You can generate notes within your daily limit.
                    {user.isPremium
                      ? user.subscriptionLevel === "ULTRA"
                        ? " (Ultra Plan: High Limit)"
                        : " (Basic Plan: Medium Limit)"
                      : " (Free Plan: Low Limit)"}
                  </div>
                </div>

                <Button
                  onClick={handleAiNotesGeneration}
                  isLoading={aiGenerating}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<Sparkles />}
                >
                  {aiGenerating ? "Generating Magic..." : "Generate Notes"}
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{aiResult}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setAiResult(null)}
                    variant="ghost"
                    className="flex-1"
                  >
                    New Topic
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult);
                      showAlert("Notes Copied!", "SUCCESS");
                    }}
                    variant="primary"
                    className="flex-1"
                  >
                    Copy Text
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (Moved to root level of StudentDashboard to fix z-index and conditional rendering issues) */}
      {editMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Edit className="text-blue-600" /> Edit Profile
              </h3>
              <button
                onClick={() => setEditMode(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Class Level
                </label>
                <select
                  value={profileData.classLevel}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      classLevel: e.target.value as any,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  {(
                    settings?.allowedClasses || [
                      "6",
                      "7",
                      "8",
                      "9",
                      "10",
                      "11",
                      "12",
                      "COMPETITION",
                    ]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c === "COMPETITION" ? "Competition" : `Class ${c}`}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-slate-600">
                    Daily Limit:{" "}
                    {user.subscriptionLevel === "ULTRA"
                      ? "3"
                      : user.subscriptionLevel === "BASIC"
                        ? "2"
                        : "1"}{" "}
                    changes
                  </p>
                  <p className="text-[10px] text-blue-600 font-bold">
                    Remaining:{" "}
                    {(() => {
                      const limit =
                        user.subscriptionLevel === "ULTRA"
                          ? 3
                          : user.subscriptionLevel === "BASIC"
                            ? 2
                            : 1;
                      const used = parseInt(
                        localStorage.getItem(
                          `nst_class_changes_${user.id}_${new Date().toDateString()}`,
                        ) || "0",
                      );
                      return Math.max(0, limit - used);
                    })()}
                  </p>
                </div>
              </div>

              {(["11", "12"].includes(profileData.classLevel) ||
                profileData.classLevel === "COMPETITION") && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Stream
                  </label>
                  <select
                    value={profileData.stream}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        stream: e.target.value as any,
                      })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50"
                  >
                    <option value="Science">Science</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Board
                </label>
                <select
                  value={profileData.board}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      board: e.target.value as any,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  {(settings?.allowedBoards || ["CBSE", "BSEB"]).map((b) => (
                    <option key={b} value={b}>
                      {b}{" "}
                      {b === "CBSE"
                        ? "(English)"
                        : b === "BSEB"
                          ? "(Hindi)"
                          : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={profileData.mobile || user.mobile}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    } as any)
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold"
                  placeholder="10-digit number"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  New Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to keep current"
                  value={profileData.newPassword}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Check Class Change Limit (Exclude TEACHER)
                  if (
                    profileData.classLevel !== user.classLevel &&
                    user.role !== "TEACHER"
                  ) {
                    const limit =
                      user.subscriptionLevel === "ULTRA"
                        ? 3
                        : user.subscriptionLevel === "BASIC"
                          ? 2
                          : 1;
                    const todayKey = `nst_class_changes_${user.id}_${new Date().toDateString()}`;
                    const used = parseInt(
                      localStorage.getItem(todayKey) || "0",
                    );

                    if (used >= limit) {
                      showAlert(
                        `Daily class change limit reached (${limit})! Upgrade to increase.`,
                        "ERROR",
                      );
                      return;
                    }

                    // Increment Usage
                    localStorage.setItem(todayKey, (used + 1).toString());
                  }

                  // Update User
                  const updates: Partial<User> = {
                    classLevel: profileData.classLevel as any,
                    board: profileData.board as any,
                    stream: profileData.stream as any,
                  };
                  if (profileData.newPassword)
                    updates.password = profileData.newPassword;
                  if (profileData.mobile) updates.mobile = profileData.mobile;

                  handleUserUpdate({ ...user, ...updates });
                  setEditMode(false);
                  showAlert("Profile Updated Successfully!", "SUCCESS");
                }}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecoveryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl border-t-4 border-orange-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Lock className="text-orange-500" /> Setup Recovery
              </h3>
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs font-bold text-slate-600 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
              Set a Mobile Number and Password. If Google Auth fails, you can
              use these to login via the Recovery option.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={recoveryData.mobile}
                  onChange={(e) =>
                    setRecoveryData({
                      ...recoveryData,
                      mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Recovery Password
                </label>
                <input
                  type="text"
                  placeholder="Create a strong password"
                  value={recoveryData.password}
                  onChange={(e) =>
                    setRecoveryData({
                      ...recoveryData,
                      password: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (recoveryData.mobile.length !== 10) {
                    showAlert(
                      "Please enter a valid 10-digit mobile number.",
                      "ERROR",
                    );
                    return;
                  }
                  if (recoveryData.password.length < 6) {
                    showAlert(
                      "Password must be at least 6 characters.",
                      "ERROR",
                    );
                    return;
                  }
                  handleUserUpdate({
                    ...user,
                    mobile: recoveryData.mobile,
                    password: recoveryData.password,
                  });
                  setShowRecoveryModal(false);
                  showAlert("Recovery details saved successfully!", "SUCCESS");
                }}
                className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-lg hover:bg-orange-600"
              >
                Save Recovery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOMEWORK FULL PAGE (GK-style) */}
      {showHomeworkHistory && (() => {
        const SUBJECT_INFO: Record<string, { label: string; gradient: string; chipBg: string; chipText: string; ring: string; iconBg: string; iconText: string; }> = {
          mcq: { label: 'MCQ Practice', gradient: 'from-emerald-500 via-green-500 to-teal-500', chipBg: 'bg-emerald-100', chipText: 'text-emerald-700', ring: 'border-emerald-200', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700' },
          sarSangrah: { label: 'Sar Sangrah', gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', chipBg: 'bg-rose-100', chipText: 'text-rose-700', ring: 'border-rose-200', iconBg: 'bg-rose-100', iconText: 'text-rose-700' },
          speedySocialScience: { label: 'Speedy Social Science', gradient: 'from-orange-500 via-amber-500 to-yellow-500', chipBg: 'bg-orange-100', chipText: 'text-orange-700', ring: 'border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-700' },
          speedyScience: { label: 'Speedy Science', gradient: 'from-blue-500 via-sky-500 to-cyan-500', chipBg: 'bg-blue-100', chipText: 'text-blue-700', ring: 'border-blue-200', iconBg: 'bg-blue-100', iconText: 'text-blue-700' },
          other: { label: 'Other', gradient: 'from-slate-500 via-zinc-500 to-stone-500', chipBg: 'bg-slate-100', chipText: 'text-slate-700', ring: 'border-slate-200', iconBg: 'bg-slate-100', iconText: 'text-slate-700' },
        };
        const allHw = (settings?.homework || []).filter(hw => !isNaN(new Date(hw.date).getTime()));
        const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
        const todayKey = todayD.toISOString().split('T')[0];
        const todaysHw = allHw.filter(hw => {
          const d = new Date(hw.date); d.setHours(0, 0, 0, 0);
          return d.toISOString().split('T')[0] === todayKey;
        });
        const openSubject = (subId: string) => {
          setShowHomeworkHistory(false);
          setHomeworkSubjectView(subId);
          setSelectedSubject({ id: subId, name: SUBJECT_INFO[subId]?.label || subId, icon: 'Book', color: 'bg-slate-100' } as any);
          setContentViewStep('SUBJECTS');
          setLucentCategoryView(false);
          setHwYear(null);
          setHwMonth(null);
          setHwWeek(null);
          setHwActiveHwId(null);
          setHwOpenedDirect(false);
          onTabChange('COURSES');
        };

        // Open a single homework directly (skip year/month/date hierarchy entirely).
        // Used by today-banner taps and the today-picker modal so the student lands
        // straight on the notes/MCQ chooser screen.
        const openHomeworkDirect = (hw: typeof allHw[number], subId: string) => {
          const hasNotes = !!(hw.notes && hw.notes.trim());
          const hasMcq = !!(hw.parsedMcqs && hw.parsedMcqs.length > 0);
          // Pre-set the view mode so the chooser overlay (or single-mode view) shows correctly.
          if (hasNotes && hasMcq) setHwViewMode('choose');
          else if (hasMcq) setHwViewMode('mcq');
          else setHwViewMode('notes');

          setShowHomeworkHistory(false);
          setHwTodayPickerSub(null);
          setHomeworkSubjectView(subId);
          setSelectedSubject({ id: subId, name: SUBJECT_INFO[subId]?.label || subId, icon: 'Book', color: 'bg-slate-100' } as any);
          setContentViewStep('SUBJECTS');
          setLucentCategoryView(false);
          // Leave year/month/week null so "Back" goes straight back to the homework page,
          // not into the year/month hierarchy.
          setHwYear(null);
          setHwMonth(null);
          setHwWeek(null);
          setHwActiveHwId(hw.id || '');
          setHwOpenedDirect(true);
          onTabChange('COURSES');
        };

        // Tap on a today-banner subject card.
        const onTapTodaySubject = (subId: string, hws: typeof todaysHw) => {
          if (hws.length === 1) {
            openHomeworkDirect(hws[0], subId);
          } else {
            setHwTodayPickerSub(subId);
          }
        };

        return (
          <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    // Closing the Homework page should always return the
                    // student to the actual Home tab — both the underlying
                    // active page AND the bottom-nav highlight. Without this,
                    // the previous activeTab (e.g. COURSES from a sub-tap)
                    // would leak through and the wrong page would appear.
                    setShowHomeworkHistory(false);
                    setHomeworkSubjectView(null);
                    setHwActiveHwId(null);
                    setHwOpenedDirect(false);
                    onTabChange('HOME');
                    setCurrentLogicalTab('HOME');
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-colors"
                  aria-label="Back"
                >
                  <ChevronRight size={22} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <GraduationCap size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800">Homework</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Today's Homework
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
                {/* DAILY MY MISTAKE BANNER — always shows when student has
                    pending mistakes. Tapping opens History → My Mistake tab
                    where they can review or practice them. */}
                {mistakeCount > 0 && (
                  <button
                    onClick={() => {
                      setShowHomeworkHistory(false);
                      onTabChange('HISTORY');
                      setCurrentLogicalTab('HISTORY');
                    }}
                    className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white shadow-lg relative overflow-hidden active:scale-[0.99] transition-transform"
                  >
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 relative">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                        <Target size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-base font-black leading-tight">Daily My Mistake</h4>
                          <span className="bg-white/25 text-white text-[10px] font-black px-2 py-0.5 rounded-full leading-none">
                            {mistakeCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/90 leading-snug">
                          {mistakeCount} galt MCQ pending hain — tap karke practice karein
                        </p>
                      </div>
                      <ChevronRight size={20} className="opacity-90 shrink-0" />
                    </div>
                  </button>
                )}

                {/* FIXED GK CARD — Daily GK + GK History both accessible from here.
                    Replaces the tiny GK button that used to sit in the header.
                    When admin hides GK from bottom nav, this card stays so the
                    student can still access GK from inside the Homework page. */}
                {(() => {
                  const allGksForCard = (settings?.dailyGk || []).filter((gk: any) => {
                    if (!gk.targetClass || gk.targetClass === user.class) return true;
                    return false;
                  });
                  const todayStr = new Date().toISOString().split('T')[0];
                  const todaysGksForCard = allGksForCard.filter((gk: any) => {
                    const gkDate = (gk.date || '').split('T')[0];
                    return gkDate === todayStr;
                  });
                  return (
                    <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Sparkles size={18} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-black leading-tight">Daily GK Corner</h3>
                            <p className="text-[11px] font-bold text-white/85">
                              {todaysGksForCard.length > 0
                                ? `${todaysGksForCard.length} new GK question${todaysGksForCard.length === 1 ? '' : 's'} today`
                                : `${allGksForCard.length} GK questions ka archive`}
                            </p>
                          </div>
                          {todaysGksForCard.length > 0 && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-white text-emerald-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                              New
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setShowDailyGkHistory(true)}
                            className="bg-white/95 hover:bg-white text-emerald-700 rounded-xl py-2.5 px-3 font-black text-xs active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                            aria-label="Open Today's GK"
                          >
                            <Sparkles size={13} /> Today's GK
                          </button>
                          <button
                            onClick={() => setShowDailyGkHistory(true)}
                            className="bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl py-2.5 px-3 font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 backdrop-blur"
                            aria-label="Open GK History"
                          >
                            <Clock size={13} /> GK History
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* TODAY'S HOMEWORK BANNER */}
                {todaysHw.length > 0 && (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-100/60 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black bg-white text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                          Today's Homework
                        </span>
                        <span className="text-[11px] text-slate-600 font-semibold">
                          {todayD.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {/* Group today's homeworks by subject as chips so 4+ items don't stack tall */}
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const todayBySub: Record<string, typeof todaysHw> = {};
                          todaysHw.forEach(hw => {
                            const sub = hw.targetSubject && SUBJECT_INFO[hw.targetSubject] ? hw.targetSubject : 'other';
                            if (!todayBySub[sub]) todayBySub[sub] = [];
                            todayBySub[sub].push(hw);
                          });
                          return Object.entries(todayBySub).map(([sub, hws]) => (
                            <button
                              key={sub}
                              onClick={() => onTapTodaySubject(sub, hws)}
                              className="bg-white hover:bg-slate-50 rounded-xl p-3 border border-slate-200 text-left active:scale-95 transition-all shadow-sm"
                            >
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">
                                {SUBJECT_INFO[sub]?.label || sub}
                              </p>
                              <p className="text-sm font-bold text-slate-800 truncate">{hws[0].title}</p>
                              {hws.length > 1 && (
                                <p className="text-[10px] text-slate-500 mt-0.5">+{hws.length - 1} more</p>
                              )}
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {hws.some(h => h.notes) && (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">NOTES</span>
                                )}
                                {hws.some(h => (h.parsedMcqs?.length || 0) > 0) && (
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">MCQ</span>
                                )}
                                {hws.some(h => h.audioUrl) && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">AUDIO</span>
                                )}
                                {hws.some(h => h.videoUrl) && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">VIDEO</span>
                                )}
                                {hws.some(h => h.pdfUrl) && (
                                  <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">PDF</span>
                                )}
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* EMPTY STATE */}
                {todaysHw.length === 0 && (
                  <div className="text-center py-10 text-slate-500">
                    <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-bold text-sm">No homework today</p>
                    <p className="text-xs mt-1">Wait for the admin to add some</p>
                  </div>
                )}

                {/* CLASS NOTES (Class 6–12) — Continue Reading on Homework page */}
                {(() => {
                  if (recentChapters.length === 0) return null;
                  const items = [...recentChapters].sort((a, b) => b.ts - a.ts).slice(0, 8);
                  return (
                    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <BookOpen size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Class 6–12 · Continue Reading</p>
                            <p className="text-xs text-slate-500 font-medium truncate">Pick up your class notes right where you left off</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                          {items.length}
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide snap-x">
                        {items.map(entry => (
                          <div
                            key={`hw_ch_${entry.id}`}
                            className="relative shrink-0 w-56 snap-start bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col gap-2 active:scale-[0.98] transition-transform"
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissRecentChapter(entry.id); }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                              aria-label="Remove"
                              title="Remove"
                            >
                              <X size={12} />
                            </button>
                            <button onClick={() => openRecentChapter(entry)} className="text-left">
                              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest truncate pr-6">
                                Class {entry.classLevel} · {entry.subject?.name || 'Subject'}
                              </p>
                              <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 mt-1 pr-6">
                                {entry.chapter?.title || 'Chapter'}
                              </p>
                            </button>
                            <div className="mt-1">
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                  style={{ width: `${Math.max(2, entry.scrollPct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[10px] text-slate-500 font-semibold">{entry.scrollPct}% read</span>
                                <button
                                  onClick={() => openRecentChapter(entry)}
                                  className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                                >
                                  Resume <ChevronRight size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* RESUME READING — date-wise (all homework notes) */}
                {(() => {
                  const dateWiseHw = recentHw;
                  if (dateWiseHw.length === 0) return null;
                  return (
                  <div className="bg-gradient-to-br from-rose-50 via-white to-pink-50 border border-rose-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                          <BookOpen size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Continue Reading</p>
                          <p className="text-xs text-slate-500 font-medium truncate">Pick up where you left off</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                        {dateWiseHw.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dateWiseHw.slice(0, 5).map(entry => {
                        const subInfo = SUBJECT_INFO[entry.targetSubject || 'other'] || SUBJECT_INFO.other;
                        const dateLbl = (() => {
                          try {
                            return new Date(entry.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
                          } catch { return entry.date; }
                        })();
                        return (
                          <SwipeToDismiss
                            key={entry.id}
                            onDismiss={() => dismissRecentHw(entry.id)}
                            className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-3"
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissRecentHw(entry.id); }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                              aria-label="Remove"
                              title="Remove"
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={() => openRecentHw(entry)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center gap-2 mb-1.5 pr-6 flex-wrap">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${subInfo.chipBg} ${subInfo.chipText}`}>
                                  {subInfo.label}
                                </span>
                                {entry.hw?.pageNo && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest bg-slate-800 text-white">
                                    📖 P.{entry.hw.pageNo}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-semibold">{dateLbl}</span>
                              </div>
                              <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 pr-6">
                                {entry.title}
                              </p>
                              <div className="mt-2">
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                                    style={{ width: `${Math.max(2, entry.scrollPct)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">{entry.scrollPct}% read</span>
                                  <span className="text-[10px] font-black text-white bg-rose-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    Resume <ChevronRight size={10} />
                                  </span>
                                </div>
                              </div>
                            </button>
                          </SwipeToDismiss>
                        );
                      })}
                      <p className="text-[10px] text-slate-400 font-semibold text-center pt-1 italic">
                        Tip: Swipe a card left to remove it
                      </p>
                    </div>
                  </div>
                  );
                })()}

                {/* LUCENT CONTINUE READING — on homework page */}
                {(() => {
                  if (recentLucent.length === 0) return null;
                  return (
                    <div className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 border border-teal-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                            <BookOpen size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Lucent — Continue Reading</p>
                            <p className="text-xs text-slate-500 font-medium truncate">Pick up where you left off</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-teal-600 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                          {recentLucent.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {recentLucent.slice(0, 4).map(entry => (
                          <SwipeToDismiss
                            key={entry.id}
                            onDismiss={() => { removeRecentLucent(entry.id); setRecentLucent(getRecentLucent()); }}
                            className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-3"
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); removeRecentLucent(entry.id); setRecentLucent(getRecentLucent()); }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                              aria-label="Remove"
                              title="Remove"
                            >
                              <X size={12} />
                            </button>
                            <button onClick={() => openRecentLucent(entry)} className="w-full text-left">
                              <div className="flex items-center gap-2 mb-1.5 pr-6 flex-wrap">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-teal-100 text-teal-700">
                                  Lucent
                                </span>
                                {entry.chapter && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest bg-slate-800 text-white">
                                    {entry.chapter}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2 pr-6">
                                {entry.title}
                              </p>
                              <div className="mt-2">
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                                    style={{ width: `${Math.max(2, entry.scrollPct || 0)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">{entry.scrollPct || 0}% read</span>
                                  <span className="text-[10px] font-black text-white bg-teal-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    Resume <ChevronRight size={10} />
                                  </span>
                                </div>
                              </div>
                            </button>
                          </SwipeToDismiss>
                        ))}
                        <p className="text-[10px] text-slate-400 font-semibold text-center pt-1 italic">
                          Tip: Swipe a card left to remove it
                        </p>
                      </div>
                    </div>
                  );
                })()}


                {/* HOMEWORK MCQ HISTORY (separate from regular MCQ) */}
                {(() => {
                  const hwMcqHistory = (user.mcqHistory || []).filter(h => h.subjectId === 'homework' || (h.chapterId || '').startsWith('homework_'));
                  if (hwMcqHistory.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                        <CheckSquare size={12} /> Homework MCQ History
                      </h4>
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {hwMcqHistory.slice(0, 8).map((h) => (
                          <div key={h.id} className="p-3 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${h.score >= 80 ? 'bg-emerald-100 text-emerald-700' : h.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                              {h.score}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{h.chapterTitle}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {h.correctCount}/{h.totalQuestions} correct • {new Date(h.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* TODAY PICKER MODAL — shown when a today-banner subject has multiple items */}
            {hwTodayPickerSub && (() => {
              const pickHws = todaysHw.filter(hw => {
                const sub = hw.targetSubject && SUBJECT_INFO[hw.targetSubject] ? hw.targetSubject : 'other';
                return sub === hwTodayPickerSub;
              });
              const info = SUBJECT_INFO[hwTodayPickerSub] || SUBJECT_INFO.other;
              return (
                <div
                  className="fixed inset-0 z-[160] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in"
                  onClick={() => setHwTodayPickerSub(null)}
                >
                  <div
                    className="bg-white w-full sm:max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100">
                      <div className={`w-11 h-11 rounded-2xl ${info.iconBg} ${info.iconText} flex items-center justify-center shrink-0`}>
                        <GraduationCap size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Today's Homework</p>
                        <h3 className="text-base font-black text-slate-800 truncate">{info.label}</h3>
                      </div>
                      <button
                        onClick={() => setHwTodayPickerSub(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {pickHws.map((hw, idx) => {
                        const hasNotes = !!(hw.notes && hw.notes.trim());
                        const hasMcq = !!(hw.parsedMcqs && hw.parsedMcqs.length > 0);
                        return (
                          <button
                            key={hw.id || idx}
                            onClick={() => openHomeworkDirect(hw, hwTodayPickerSub)}
                            className={`w-full text-left bg-white border-2 ${info.ring} rounded-2xl p-3 flex items-center gap-3 hover:shadow-md active:scale-[0.98] transition-all`}
                          >
                            <div className={`w-10 h-10 rounded-xl ${info.iconBg} ${info.iconText} flex items-center justify-center shrink-0 font-black`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-800 text-sm leading-snug truncate">{hw.title}</p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {hasNotes && <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">NOTES</span>}
                                {hasMcq && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{hw.parsedMcqs!.length} MCQ</span>}
                                {hw.audioUrl && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">AUDIO</span>}
                                {hw.videoUrl && <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">VIDEO</span>}
                                {hw.pdfUrl && <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">PDF</span>}
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* COMPETITION CUSTOM MCQ HUB (Practice + Create) */}
      {showCompMcqHub && (() => {
        const adminMcqs = (settings?.competitionMcqs || []).map((m, i) => ({ ...m, _src: 'admin' as const, _key: `a_${i}` }));
        const userMcqs = (user.customMcqs || []).map((m, i) => ({ ...m, _src: 'user' as const, _key: `u_${i}` }));
        const allMcqs = [...adminMcqs, ...userMcqs];
        const safeIdx = Math.min(compMcqIndex, Math.max(0, allMcqs.length - 1));
        const current = allMcqs[safeIdx];

        const closeHub = () => {
          setShowCompMcqHub(false);
          setCompMcqSelected(null);
          setCompMcqIndex(0);
        };

        const saveDraft = () => {
          if (!compMcqDraft.question.trim()) {
            showAlert('Question khaali nahi ho sakta.', 'ERROR');
            return;
          }
          const filledOpts = compMcqDraft.options.map(o => o.trim());
          if (filledOpts.some(o => !o)) {
            showAlert('Please fill in all 4 options.', 'ERROR');
            return;
          }
          const newMcq: any = {
            question: compMcqDraft.question.trim(),
            options: filledOpts,
            correctAnswer: compMcqDraft.correctAnswer,
            explanation: '',
          };
          handleUserUpdate({ ...user, customMcqs: [...(user.customMcqs || []), newMcq] });
          setCompMcqDraft({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
          setCompMcqTab('PRACTICE');
          setCompMcqIndex((user.customMcqs?.length || 0) + adminMcqs.length);
          setCompMcqSelected(null);
        };

        const deleteUserMcq = (userMcqIndex: number) => {
          const updated = (user.customMcqs || []).filter((_, i) => i !== userMcqIndex);
          handleUserUpdate({ ...user, customMcqs: updated });
          setCompMcqSelected(null);
          setCompMcqIndex(prev => Math.max(0, prev - 1));
        };

        return (
          <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                  onClick={closeHub}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700"
                  aria-label="Back"
                >
                  <ChevronRight size={22} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-sm shrink-0">
                  <CheckSquare size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800">Practice MCQ Maker</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Build and practise your own MCQs for competitive exams</p>
                </div>
                {allMcqs.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await downloadAsMHTML('comp-mcq-printable', `Competition_MCQs_${new Date().toISOString().slice(0,10)}`, {
                          appName: settings?.appShortName || settings?.appName || 'IIC',
                          pageTitle: 'Competition MCQs',
                          subtitle: `Practice MCQ Maker · ${allMcqs.length} questions`,
                        });
                        showAlert(`📥 ${allMcqs.length} MCQs offline save ho gaye!`, 'SUCCESS');
                      } catch (e) {
                        showAlert('Download failed. Please try again.', 'ERROR');
                      }
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md active:scale-95 transition-all"
                    aria-label="Download all MCQs as HTML for offline use"
                  >
                    <Download size={14} />
                    <span>Save Offline</span>
                  </button>
                )}
              </div>
              {/* Tabs */}
              <div className="max-w-2xl mx-auto px-4 pb-3">
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => { setCompMcqTab('PRACTICE'); setCompMcqSelected(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${compMcqTab === 'PRACTICE' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    Practice ({allMcqs.length})
                  </button>
                  <button
                    onClick={() => setCompMcqTab('CREATE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${compMcqTab === 'CREATE' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    + Create New
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4">
                {/* PRACTICE TAB */}
                {compMcqTab === 'PRACTICE' && (
                  <>
                    {allMcqs.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <CheckSquare size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-slate-500">No MCQs yet</p>
                        <p className="text-sm text-slate-400 mt-1 mb-4">Use the "+ Create New" tab to add your first MCQ</p>
                        <button
                          onClick={() => setCompMcqTab('CREATE')}
                          className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                        >
                          Create First MCQ
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Mode selector — MCQ · Q&A · Flashcard (same pattern as
                            Homework MCQs / Lucent MCQs). Flashcard button overlay
                            launch karta hai, baaki dono inline render hote hain. */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 grid grid-cols-3 gap-1 shadow-sm">
                          <button
                            onClick={() => setCompMcqMode('mcq')}
                            className={`text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all ${
                              compMcqMode === 'mcq'
                                ? 'bg-orange-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            📝 MCQ
                          </button>
                          <button
                            onClick={() => { setCompMcqMode('qa'); setCompQaRevealed({}); }}
                            className={`text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all ${
                              compMcqMode === 'qa'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            💬 Q&amp;A
                          </button>
                          <button
                            onClick={() => {
                              setFlashcardMcqs({
                                items: allMcqs.map(m => ({
                                  question: m.question,
                                  options: m.options,
                                  correctAnswer: m.correctAnswer,
                                  explanation: (m as any).explanation || '',
                                })),
                                title: 'Practice MCQs',
                                subtitle: `Flashcard Mode · ${allMcqs.length} cards`,
                                subject: 'Competition',
                              });
                            }}
                            className="text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95"
                          >
                            🃏 Flashcard
                          </button>
                        </div>

                        {/* Q&A REVEAL MODE — saare questions ek scroll me, tap to reveal */}
                        {compMcqMode === 'qa' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                {allMcqs.length} Questions · Tap to reveal answer
                              </p>
                              <button
                                onClick={() => {
                                  const allRevealed = allMcqs.every((_, i) => compQaRevealed[i]);
                                  if (allRevealed) setCompQaRevealed({});
                                  else {
                                    const all: Record<number, boolean> = {};
                                    allMcqs.forEach((_, i) => { all[i] = true; });
                                    setCompQaRevealed(all);
                                  }
                                }}
                                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95 transition-all"
                              >
                                {allMcqs.every((_, i) => compQaRevealed[i]) ? 'Hide All' : 'Reveal All'}
                              </button>
                            </div>
                            {allMcqs.map((mcq, qi) => {
                              const revealed = !!compQaRevealed[qi];
                              const correctLetter = String.fromCharCode(65 + mcq.correctAnswer);
                              const correctText = mcq.options[mcq.correctAnswer] || '';
                              return (
                                <div
                                  key={mcq._key || qi}
                                  className={`bg-white border-2 rounded-2xl p-4 shadow-sm transition-all ${revealed ? 'border-purple-200' : 'border-slate-200'}`}
                                >
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 shrink-0">Q{qi + 1}</span>
                                    <p className="flex-1 text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{mcq.question}</p>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${mcq._src === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {mcq._src === 'admin' ? 'Official' : 'Mine'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setCompQaRevealed(prev => ({ ...prev, [qi]: !prev[qi] }))}
                                    className={`mt-2 w-full p-3 rounded-xl text-left text-sm font-bold transition-all ${revealed
                                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                      : 'bg-slate-50 border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    {revealed ? (
                                      <span className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span className="flex-1">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-0.5">Answer</span>
                                          <span className="font-black">{correctLetter}.</span> <span className="font-semibold whitespace-pre-wrap">{correctText}</span>
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                                        👁 Tap to reveal answer
                                      </span>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* MCQ INTERACTIVE MODE — original single-question flow */}
                        {compMcqMode === 'mcq' && current && (
                          <>
                        {/* Progress */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>Question {safeIdx + 1} / {allMcqs.length}</span>
                          <span className={`px-2 py-0.5 rounded-full ${current._src === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {current._src === 'admin' ? 'Official' : 'My MCQ'}
                          </span>
                        </div>

                        {/* Question Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                          <p className="text-base font-bold text-slate-800 leading-relaxed mb-5 whitespace-pre-wrap">{current.question}</p>
                          <div className="space-y-2.5">
                            {current.options.map((opt, oi) => {
                              const isSelected = compMcqSelected === oi;
                              const isCorrect = oi === current.correctAnswer;
                              const showResult = compMcqSelected !== null;
                              let cls = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                              if (showResult) {
                                if (isCorrect) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                                else if (isSelected) cls = 'border-rose-400 bg-rose-50 text-rose-800';
                                else cls = 'border-slate-200 bg-slate-50 text-slate-500';
                              }
                              return (
                                <button
                                  key={oi}
                                  disabled={showResult}
                                  onClick={() => setCompMcqSelected(oi)}
                                  className={`w-full text-left p-3.5 rounded-xl border-2 font-semibold text-sm transition-colors flex items-start gap-3 ${cls}`}
                                >
                                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                    showResult && isCorrect ? 'bg-emerald-500 text-white' :
                                    showResult && isSelected ? 'bg-rose-500 text-white' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  <span className="flex-1 whitespace-pre-wrap">{opt}</span>
                                  {showResult && isCorrect && <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Feedback */}
                          {compMcqSelected !== null && (
                            <>
                            <div className={`mt-4 p-3 rounded-xl text-sm font-bold ${
                              compMcqSelected === current.correctAnswer
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {compMcqSelected === current.correctAnswer
                                ? '✅ Sahi answer!'
                                : `❌ Galat. Sahi answer: Option ${String.fromCharCode(65 + current.correctAnswer)}`}
                            </div>
                            {/* Share this MCQ to community chat */}
                            <button
                              onClick={() => {
                                const opts = current.options.length === 4
                                  ? current.options as [string,string,string,string]
                                  : ([...current.options, '', '', '', ''].slice(0, 4) as [string,string,string,string]);
                                setMcqCommunityDraft({ question: current.question, options: opts, correctAnswer: current.correctAnswer, explanation: '' });
                                setShowMcqCommunityPopup(true);
                              }}
                              className="mt-2 w-full py-2.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-violet-100"
                            >
                              <Send size={14} /> Community Chat mein Share Karo
                            </button>
                            </>
                          )}
                        </div>

                        {/* Nav */}
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => { setCompMcqIndex(Math.max(0, safeIdx - 1)); setCompMcqSelected(null); }}
                            disabled={safeIdx === 0}
                            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-700 disabled:opacity-40 active:scale-95 transition-transform"
                          >
                            ← Previous
                          </button>
                          {current._src === 'user' && (
                            <button
                              onClick={() => {
                                const userIdx = safeIdx - adminMcqs.length;
                                if (userIdx >= 0 && confirm('Delete this MCQ?')) deleteUserMcq(userIdx);
                              }}
                              className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 font-bold text-sm text-rose-700 active:scale-95 transition-transform"
                              aria-label="Delete"
                            >
                              🗑
                            </button>
                          )}
                          <button
                            onClick={() => { setCompMcqIndex(Math.min(allMcqs.length - 1, safeIdx + 1)); setCompMcqSelected(null); }}
                            disabled={safeIdx >= allMcqs.length - 1}
                            className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                          >
                            Next →
                          </button>
                        </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* CREATE TAB */}
                {compMcqTab === 'CREATE' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800 font-medium">
                      📝 Type your question and four options, mark the correct one, and after you save it appears in the Practice tab.
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Question</label>
                        <textarea
                          value={compMcqDraft.question}
                          onChange={e => setCompMcqDraft({ ...compMcqDraft, question: e.target.value })}
                          placeholder="Type your question here..."
                          className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 h-24 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Options (use the radio to mark the correct one)</label>
                        <div className="space-y-2">
                          {compMcqDraft.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setCompMcqDraft({ ...compMcqDraft, correctAnswer: oi })}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 transition-colors ${
                                  compMcqDraft.correctAnswer === oi
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-white text-slate-500 border-slate-300'
                                }`}
                                aria-label={`Mark option ${String.fromCharCode(65 + oi)} as correct`}
                              >
                                {String.fromCharCode(65 + oi)}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...compMcqDraft.options];
                                  newOpts[oi] = e.target.value;
                                  setCompMcqDraft({ ...compMcqDraft, options: newOpts });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={saveDraft}
                        className="w-full py-3 bg-orange-600 text-white rounded-xl font-black text-sm shadow-md active:scale-95 transition-transform"
                      >
                        💾 Save MCQ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* HOMEWORK HISTORY MODAL (legacy - hidden, kept for reference) */}
      {false && showHomeworkHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Homework History
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Grouped by Month & Year
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHomeworkHistory(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {settings?.homework && settings.homework.length > 0 ? (
                (() => {
                  const grouped = settings.homework.reduce(
                    (acc, hw) => {
                      const d = new Date(hw.date);
                      if (isNaN(d.getTime())) return acc;
                      const monthYear = d.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      });
                      if (!acc[monthYear]) acc[monthYear] = [];
                      acc[monthYear].push(hw);
                      return acc;
                    },
                    {} as Record<string, typeof settings.homework>,
                  );
                  return Object.entries(grouped).map(([monthYear, hws]) => (
                    <div key={monthYear} className="space-y-3">
                      <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10 border-b border-slate-100">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                          {monthYear}
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {[...hws].reverse().map((hw, i) => (
                          <div
                            key={hw.id || i}
                            className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded uppercase tracking-widest">
                                {new Date(hw.date).toLocaleDateString(
                                  "default",
                                  { weekday: "short", day: "numeric" },
                                )}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 text-sm mb-2">
                              {hw.title}
                            </p>

                            {/* NEW HOMEWORK ASSETS UI */}
                            <div className="flex flex-col gap-2 mb-3">
                              {hw.notes && (
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-3">
                                  <BookOpen
                                    className="text-blue-600 shrink-0 mt-0.5"
                                    size={16}
                                  />
                                  <div className="w-full">
                                    <p className="text-xs font-bold text-blue-800 mb-1">
                                      Main Notes
                                    </p>
                                    <div className="flex flex-col gap-4">
                                      {(hw.notes || "")
                                        .split(/(?=SET\s*-\s*\d+)/i)
                                        .filter((c) => c.trim().length > 0)
                                        .map((chunk, chunkIdx) => (
                                          <div key={chunkIdx} className="relative">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                              <p className="whitespace-pre-wrap text-sm text-slate-700 flex-1">
                                                {chunk.trim()}
                                              </p>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const ttsId = `hw_notes_${hw.id}_${chunkIdx}`;
                                                  if (speakingId === ttsId) {
                                                    stopSpeech();
                                                    setSpeakingId(null);
                                                  } else {
                                                    speakText(
                                                      chunk,
                                                      null,
                                                      1.0,
                                                      "hi-IN",
                                                      () => setSpeakingId(ttsId),
                                                      () => setSpeakingId(null),
                                                    );
                                                  }
                                                }}
                                                title={`Play part ${chunkIdx + 1}`}
                                                className={`p-2 rounded-full shrink-0 transition-colors ${speakingId === `hw_notes_${hw.id}_${chunkIdx}` ? "bg-red-100 text-red-600" : "bg-blue-100/50 text-blue-600 hover:bg-blue-200"}`}
                                              >
                                                {speakingId === `hw_notes_${hw.id}_${chunkIdx}` ? (
                                                  <Square
                                                    size={14}
                                                    className="fill-current"
                                                  />
                                                ) : (
                                                  <Volume2 size={14} />
                                                )}
                                              </button>
                                            </div>
                                            {/* Add a subtle separator between chunks except for the last one */}
                                            {chunkIdx < ((hw.notes || "").split(/(?=SET\s*-\s*\d+)/i).filter((c) => c.trim().length > 0).length - 1) && (
                                              <hr className="border-blue-200 mt-2" />
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {hw.videoUrl && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl overflow-hidden">
                                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                    <iframe src={formatVideoEmbed(hw.videoUrl)} className="absolute inset-0 w-full h-full border-none" allow="autoplay; encrypted-media; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" title="Video" />
                                  </div>
                                </div>
                              )}
                              {hw.audioUrl && (
                                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Headphones className="text-purple-600 shrink-0" size={14} />
                                    <span className="text-xs font-bold text-purple-800">Audio</span>
                                  </div>
                                  <audio controls src={hw.audioUrl} className="w-full h-8" controlsList="nodownload noremoteplayback" />
                                </div>
                              )}
                              {hw.pdfUrl && (
                                <button onClick={() => setHwActivePdf(hw.pdfUrl!)}
                                  className="w-full bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 hover:bg-amber-100 active:scale-[0.98] transition-all">
                                  <FileText className="text-amber-600 shrink-0" size={16} />
                                  <span className="text-sm font-bold text-amber-800">Open PDF</span>
                                </button>
                              )}
                            </div>

                            {hw.parsedMcqs && hw.parsedMcqs.length > 0 && (
                              <div className="bg-white p-3 rounded-lg border border-slate-100 mb-2">
                                <p className="text-xs text-indigo-600 font-bold mb-2">
                                  Includes {hw.parsedMcqs.length} MCQ(s):
                                </p>
                                <div className="space-y-4">
                                  {hw.parsedMcqs.map((mcq, idx) => {
                                    const mcqKey = `hw_${hw.id}_${idx}`;
                                    const selectedOpt = hwAnswers[mcqKey];
                                    const hasAnswered =
                                      selectedOpt !== undefined;

                                    return (
                                      <div
                                        key={idx}
                                        className="border-b border-slate-100 pb-4 last:border-0 mb-4 last:mb-0"
                                      >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                          <p className="text-sm font-bold text-slate-800">
                                            {idx + 1}.{" "}
                                            <span
                                              dangerouslySetInnerHTML={{
                                                __html: mcq.question,
                                              }}
                                            />
                                          </p>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const ttsId = `hw_mcq_${hw.id}_${idx}`;
                                              if (speakingId === ttsId) {
                                                stopSpeech();
                                                setSpeakingId(null);
                                              } else {
                                                const textToSpeak = `${mcq.question} ${mcq.statements?.join(" ") || ""} ${mcq.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`).join(". ")}`;
                                                speakText(
                                                  textToSpeak,
                                                  null,
                                                  1.0,
                                                  "hi-IN",
                                                  () => setSpeakingId(ttsId),
                                                  () => setSpeakingId(null),
                                                );
                                              }
                                            }}
                                            className={`p-1.5 rounded-full transition-colors shrink-0 ${speakingId === `hw_mcq_${hw.id}_${idx}` ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600"}`}
                                          >
                                            {speakingId ===
                                            `hw_mcq_${hw.id}_${idx}` ? (
                                              <Square
                                                size={14}
                                                className="fill-current"
                                              />
                                            ) : (
                                              <Volume2 size={14} />
                                            )}
                                          </button>
                                        </div>
                                        {mcq.statements &&
                                          mcq.statements.length > 0 && (
                                            <div className="mb-4 space-y-2 pl-4 border-l-2 border-slate-200">
                                              {mcq.statements.map(
                                                (stmt, sIdx) => (
                                                  <p
                                                    key={sIdx}
                                                    className="text-sm text-slate-600"
                                                  >
                                                    <span
                                                      dangerouslySetInnerHTML={{
                                                        __html: stmt,
                                                      }}
                                                    />
                                                  </p>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        <div className="space-y-2">
                                          {mcq.options.map((opt, oIdx) => {
                                            const isThisCorrect =
                                              oIdx === mcq.correctAnswer;
                                            const isThisSelected =
                                              oIdx === selectedOpt;

                                            let optClass =
                                              "bg-slate-50 border-slate-200 text-slate-700 cursor-pointer hover:bg-slate-100";

                                            if (hasAnswered) {
                                              optClass =
                                                "bg-slate-50 border-slate-200 text-slate-500 opacity-60 cursor-default"; // Default answered state

                                              if (
                                                isThisCorrect &&
                                                isThisSelected
                                              ) {
                                                optClass =
                                                  "bg-green-100 border-green-500 text-green-900 cursor-default shadow-sm";
                                              } else if (
                                                isThisCorrect &&
                                                !isThisSelected
                                              ) {
                                                optClass =
                                                  "bg-green-50 border-green-300 text-green-800 cursor-default";
                                              } else if (
                                                isThisSelected &&
                                                !isThisCorrect
                                              ) {
                                                optClass =
                                                  "bg-red-50 border-red-300 text-red-900 cursor-default";
                                              }
                                            }

                                            return (
                                              <div
                                                key={oIdx}
                                                onClick={() => {
                                                  if (!hasAnswered) {
                                                    setHwAnswers((prev) => ({
                                                      ...prev,
                                                      [mcqKey]: oIdx,
                                                    }));
                                                  }
                                                }}
                                                className={`p-4 rounded-xl text-sm font-medium border transition-all ${optClass}`}
                                              >
                                                <div className="flex items-start gap-3">
                                                  <span className="mt-0.5">
                                                    {String.fromCharCode(
                                                      65 + oIdx,
                                                    )}
                                                    .
                                                  </span>
                                                  <div className="flex-1">
                                                    <span
                                                      dangerouslySetInnerHTML={{
                                                        __html: opt,
                                                      }}
                                                    />
                                                    {hasAnswered &&
                                                      isThisCorrect &&
                                                      isThisSelected && (
                                                        <p className="text-xs text-green-700 font-bold mt-1 flex items-center gap-1">
                                                          <Check size={14} />{" "}
                                                          That's right!
                                                        </p>
                                                      )}
                                                    {hasAnswered &&
                                                      isThisSelected &&
                                                      !isThisCorrect && (
                                                        <p className="text-xs text-red-700 font-bold mt-1 flex items-center gap-1">
                                                          <X size={14} /> Not
                                                          quite
                                                        </p>
                                                      )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        {hasAnswered && mcq.explanation && (
                                          <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                                            <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
                                              <BookOpen
                                                size={14}
                                                className="text-indigo-600"
                                              />{" "}
                                              Explanation
                                            </p>
                                            <p className="text-sm text-slate-600">
                                              <span
                                                dangerouslySetInnerHTML={{
                                                  __html: mcq.explanation,
                                                }}
                                              />
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No homework history found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DAILY GK FULL PAGE */}
      {showDailyGkHistory && (() => {
        const allGks = (settings?.dailyGk || []).filter((gk) => {
          const d = new Date(gk.date);
          return !isNaN(d.getTime());
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = today.toISOString().split("T")[0];

        const todaysGks = allGks.filter((gk) => {
          const d = new Date(gk.date);
          d.setHours(0, 0, 0, 0);
          return d.toISOString().split("T")[0] === todayKey;
        });

        // Monday-based week start
        const getWeekStart = (date: Date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          d.setDate(diff);
          return d;
        };

        // Build hierarchy: year -> monthKey -> weekKey -> gks[]
        type GkItem = (typeof allGks)[number];
        const tree: Record<
          string,
          Record<string, Record<string, GkItem[]>>
        > = {};
        allGks.forEach((gk) => {
          const d = new Date(gk.date);
          const year = String(d.getFullYear());
          const monthKey = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const ws = getWeekStart(d);
          const weekKey = ws.toISOString().split("T")[0];
          if (!tree[year]) tree[year] = {};
          if (!tree[year][monthKey]) tree[year][monthKey] = {};
          if (!tree[year][monthKey][weekKey])
            tree[year][monthKey][weekKey] = [];
          tree[year][monthKey][weekKey].push(gk);
        });

        const years = Object.keys(tree).sort((a, b) => b.localeCompare(a));

        const renderGkCard = (gk: GkItem, idx: number) => (
          <div
            key={gk.id || idx}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-teal-600 bg-teal-100 px-2 py-1 rounded uppercase tracking-widest">
                {new Date(gk.date).toLocaleDateString("default", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const ttsId = `gk_${gk.id || idx}`;
                  if (speakingId === ttsId) {
                    stopSpeech();
                    setSpeakingId(null);
                  } else {
                    const textToSpeak = `Question: ${gk.question}. Answer: ${gk.answer}`;
                    speakText(
                      textToSpeak,
                      null,
                      1.0,
                      "hi-IN",
                      () => setSpeakingId(ttsId),
                      () => setSpeakingId(null),
                    );
                  }
                }}
                className={`p-1.5 rounded-full transition-colors shrink-0 ${speakingId === `gk_${gk.id || idx}` ? "bg-red-100 text-red-600" : "bg-teal-100/50 text-teal-600 hover:bg-teal-200"}`}
              >
                {speakingId === `gk_${gk.id || idx}` ? (
                  <Square size={14} className="fill-current" />
                ) : (
                  <Volume2 size={14} />
                )}
              </button>
            </div>
            <p className="font-bold text-slate-800 text-sm mb-2">
              {gk.question}
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-700">
                <strong>Ans:</strong> {gk.answer}
              </p>
            </div>
          </div>
        );

        return (
          <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => { setShowDailyGkHistory(false); stopSpeech(); setSpeakingId(null); }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-colors"
                  aria-label="Back"
                >
                  <ChevronRight size={22} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 shadow-sm shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800">
                    Daily GK
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Today's GK + full history
                  </p>
                </div>
                {/* Read All GK button */}
                <button
                  onClick={() => {
                    const gksToRead = allGks.length > 0 ? allGks : [];
                    if (speakingId === 'gk_readall') {
                      stopSpeech();
                      setSpeakingId(null);
                    } else if (gksToRead.length > 0) {
                      const fullText = gksToRead.map((gk, i) => `Question ${i + 1}: ${gk.question}. Answer: ${gk.answer}`).join('. ');
                      speakText(fullText, null, 1.0, 'hi-IN', () => setSpeakingId('gk_readall'), () => setSpeakingId(null));
                    }
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition ${speakingId === 'gk_readall' ? 'bg-red-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                >
                  {speakingId === 'gk_readall' ? <><Square size={13} /> Stop</> : <><Volume2 size={13} /> Read All</>}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
                {/* TODAY'S GK BANNER — tappable card. Tap to reveal today's Q&A. */}
                {todaysGks.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-100/60 rounded-full blur-2xl pointer-events-none" />
                    <button
                      onClick={() => setGkTodayExpanded(v => !v)}
                      className="relative z-10 w-full p-4 flex items-center gap-3 hover:bg-white/30 active:scale-[0.99] transition-all text-left"
                      aria-expanded={gkTodayExpanded}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-white text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
                        <BookOpen size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black bg-white text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Today
                          </span>
                          <span className="text-[10px] text-slate-600 font-semibold">
                            {today.toLocaleDateString("default", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p className="font-black text-slate-800 text-sm truncate">
                          Today's GK · {todaysGks.length} {todaysGks.length === 1 ? "question" : "questions"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {gkTodayExpanded ? "Tap to hide" : "Tap to view"}
                        </p>
                      </div>
                      <ChevronRight
                        size={20}
                        className={`text-emerald-600 shrink-0 transition-transform ${gkTodayExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    {gkTodayExpanded && (
                      <div className="relative z-10 px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                        {todaysGks.map((gk, i) => (
                          <div
                            key={gk.id || `today-${i}`}
                            className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
                          >
                            <p className="font-bold text-slate-800 text-sm mb-2">
                              {gk.question}
                            </p>
                            <p className="text-sm text-slate-700">
                              <strong className="text-emerald-700">Ans:</strong> {gk.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* HIERARCHICAL HISTORY: YEAR -> MONTH -> WEEK -> DAYS */}
                {years.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                      Full History
                    </h4>

                    {years.map((year) => {
                      const yearOpen = gkExpandedYear === year;
                      const months = Object.keys(tree[year]).sort((a, b) =>
                        b.localeCompare(a),
                      );
                      return (
                        <div
                          key={year}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setGkExpandedYear(yearOpen ? null : year);
                              setGkExpandedMonth(null);
                              setGkExpandedWeek(null);
                            }}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-xs">
                                {year.slice(-2)}
                              </div>
                              <div className="text-left">
                                <p className="font-black text-slate-800 text-base">
                                  {year}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {months.length} month
                                  {months.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              size={18}
                              className={`text-slate-400 transition-transform ${yearOpen ? "rotate-90" : ""}`}
                            />
                          </button>

                          {yearOpen && (
                            <div className="border-t border-slate-100 bg-slate-50/60 p-3 space-y-2">
                              {months.map((monthKey) => {
                                const monthOpen = gkExpandedMonth === monthKey;
                                const monthName = new Date(
                                  `${monthKey}-01`,
                                ).toLocaleDateString("default", {
                                  month: "long",
                                });
                                const weekKeys = Object.keys(
                                  tree[year][monthKey],
                                ).sort((a, b) => a.localeCompare(b));
                                return (
                                  <div
                                    key={monthKey}
                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                                  >
                                    <button
                                      onClick={() => {
                                        setGkExpandedMonth(
                                          monthOpen ? null : monthKey,
                                        );
                                        setGkExpandedWeek(null);
                                      }}
                                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Calendar
                                          size={14}
                                          className="text-teal-600"
                                        />
                                        <span className="font-bold text-slate-800 text-sm">
                                          {monthName}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                          {weekKeys.length} week
                                          {weekKeys.length === 1 ? "" : "s"}
                                        </span>
                                      </div>
                                      <ChevronRight
                                        size={16}
                                        className={`text-slate-400 transition-transform ${monthOpen ? "rotate-90" : ""}`}
                                      />
                                    </button>

                                    {monthOpen && (
                                      <div className="border-t border-slate-100 p-3 space-y-2">
                                        {weekKeys.map((weekKey, wIdx) => {
                                          const weekOpen =
                                            gkExpandedWeek === weekKey;
                                          const weekStart = new Date(weekKey);
                                          const weekEnd = new Date(
                                            weekStart.getTime() +
                                              6 * 86400000,
                                          );
                                          const weekRange = `${weekStart.toLocaleDateString("default", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("default", { day: "numeric", month: "short" })}`;
                                          const weekGks = [
                                            ...tree[year][monthKey][weekKey],
                                          ].sort(
                                            (a, b) =>
                                              new Date(a.date).getTime() -
                                              new Date(b.date).getTime(),
                                          );
                                          return (
                                            <div
                                              key={weekKey}
                                              className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                                            >
                                              <button
                                                onClick={() =>
                                                  setGkExpandedWeek(
                                                    weekOpen ? null : weekKey,
                                                  )
                                                }
                                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black text-white bg-teal-600 px-2 py-1 rounded">
                                                    Week {wIdx + 1}
                                                  </span>
                                                  <span className="text-xs font-semibold text-slate-700">
                                                    {weekRange}
                                                  </span>
                                                  <span className="text-[10px] font-bold text-slate-500">
                                                    • {weekGks.length} day
                                                    {weekGks.length === 1
                                                      ? ""
                                                      : "s"}
                                                  </span>
                                                </div>
                                                <ChevronRight
                                                  size={14}
                                                  className={`text-slate-400 transition-transform ${weekOpen ? "rotate-90" : ""}`}
                                                />
                                              </button>

                                              {weekOpen && (
                                                <div className="bg-white border-t border-slate-200 p-3 space-y-3">
                                                  {weekGks.map((gk, i) =>
                                                    renderGkCard(gk, i),
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : todaysGks.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold">No GK available yet.</p>
                    <p className="text-xs mt-1">Check back tomorrow!</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* REQUEST CONTENT MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-500 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Content Request</h3>
                    <p className="text-[11px] text-pink-100">Admin ko demand bhejo</p>
                  </div>
                </div>
                <button onClick={() => setShowRequestModal(false)} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Subject */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Subject ka naam *</label>
                <input
                  type="text"
                  value={requestData.subject}
                  onChange={(e) => setRequestData({ ...requestData, subject: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  placeholder="e.g. Mathematics, Science, History..."
                />
              </div>

              {/* Chapter / Lesson */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Lesson / Chapter ka naam *</label>
                <input
                  type="text"
                  value={requestData.topic}
                  onChange={(e) => setRequestData({ ...requestData, topic: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  placeholder="e.g. Trigonometry, Chapter 5..."
                />
              </div>

              {/* Page Number */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Page Number (optional)</label>
                <input
                  type="text"
                  value={requestData.pageNo}
                  onChange={(e) => setRequestData({ ...requestData, pageNo: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-400 outline-none"
                  placeholder="e.g. 45, 100-120..."
                />
              </div>

              {/* Content Type */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Kya chahiye?</label>
                <div className="grid grid-cols-5 gap-1">
                  {(['PDF','VIDEO','MCQ','NOTES','ANY'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setRequestData({ ...requestData, type: t })}
                      className={`py-2 rounded-xl text-[10px] font-black border-2 transition-all ${requestData.type === t ? 'bg-pink-600 border-pink-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-pink-300'}`}
                    >
                      {t === 'ANY' ? 'Any' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Extra Note (optional)</label>
                <textarea
                  value={requestData.note}
                  onChange={(e) => setRequestData({ ...requestData, note: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-400 outline-none resize-none"
                  rows={2}
                  placeholder="Kuch aur batana ho toh likhein..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!requestData.subject.trim() || !requestData.topic.trim()) {
                      showAlert("Subject aur Lesson ka naam zaroori hai", "ERROR");
                      return;
                    }
                    const request = {
                      id: `dem_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                      userId: user.id,
                      userName: user.name,
                      displayId: user.displayId || '',
                      classLevel: activeSessionClass || user.classLevel || '',
                      board: activeSessionBoard || user.board || '',
                      subjectName: requestData.subject.trim(),
                      chapterName: requestData.topic.trim(),
                      pageNo: requestData.pageNo.trim(),
                      contentType: requestData.type,
                      note: requestData.note.trim(),
                      timestamp: new Date().toISOString(),
                      status: 'PENDING',
                    };
                    saveDemandRequest(request)
                      .then(() => {
                        setShowRequestModal(false);
                        setRequestData({ subject: '', topic: '', pageNo: '', type: 'PDF', note: '' });
                        showAlert("✅ Request bhej di gayi! Admin dekhega.", "SUCCESS");
                      })
                      .catch(() => showAlert("Request bhejne mein fail hua. Dobara try karo.", "ERROR"));
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold shadow-lg transition-all"
                >
                  Bhejo 🚀
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIVERSAL CHAT (Global + Support) */}
      {showChat && (
        <div
          className="fixed inset-0 z-[200]"
          onClick={() => setShowChat(false)}
        >
          <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
            <UniversalChat
              user={user}
              onClose={() => setShowChat(false)}
              isAdmin={false}
              allowStudentMcq={!!settings?.allowStudentCommunityMcq}
              hideGlobalTab={!!settings?.hideGlobalChat}
            />
          </div>
        </div>
      )}

      {/* COMPARE VIEW — opens when user clicks "Compare N Books" in search.
          Uses a frozen snapshot (compareHits) so clearing the search input
          does NOT destroy the data before CompareView can mount. */}
      {showCompareView && compareHits.length > 1 && (
        <CompareView
          hits={compareHits}
          query={compareQuery}
          onClose={() => { setShowCompareView(false); setCompareHits([]); }}
          user={{ subscriptionLevel: user.subscriptionLevel, isPremium: user.isPremium }}
          settings={settings as Record<string, any>}
        />
      )}

      {/* ── LESSON COMPARE MODAL ─────────────────────────────────────────────
          Opens when student taps "📌 Topics — Compare karein" on a lesson card.
          Shows all tagged topics in the lesson and lets user jump into CompareView
          for any individual topic across all books.
      ───────────────────────────────────────────────────────────────────────── */}
      {lucentLessonCompare && (() => {
        const lce = lucentLessonCompare;
        const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        // Collect unique topicNames from this lesson's pages (ordered by first appearance)
        const seenTopics = new Set<string>();
        const topicsInLesson: { topicName: string; pages: LucentPageNote[]; }[] = [];
        (lce.pages || []).forEach(pg => {
          const tn = (pg.topicName || '').trim();
          if (!tn) return;
          if (!seenTopics.has(tn)) {
            seenTopics.add(tn);
            topicsInLesson.push({ topicName: tn, pages: [] });
          }
          topicsInLesson.find(t => t.topicName === tn)!.pages.push(pg);
        });

        // Combined full text of all pages for "Full Lesson" tab
        const fullLessonText = (lce.pages || [])
          .map(p => `${p.topicName ? `📌 ${p.topicName}\n` : ''}${stripHtml(p.content || '')}`)
          .filter(Boolean)
          .join('\n\n');

        // Build compare hits for a given topicName — scans ALL lucentNotes
        const buildTopicHits = (topicName: string): NoteSearchResult[] => {
          const hits: NoteSearchResult[] = [];
          const seen = new Set<string>();
          ((settings?.lucentNotes || []) as LucentNoteEntry[]).forEach(entry => {
            (entry.pages || []).forEach((pg, pi) => {
              const tn = (pg.topicName || '').trim();
              if (tn !== topicName) return;
              const key = `lucent_${entry.id}_${pi}`;
              if (seen.has(key)) return;
              seen.add(key);
              const fullText = stripHtml(pg.content || '');
              hits.push({
                storageKey: key,
                chapterId: entry.id,
                subjectName: entry.subject || 'lucent',
                board: 'COMPETITION',
                classLevel: 'COMPETITION',
                noteTitle: `${entry.lessonTitle}${pg.pageNo ? ` — Pg ${pg.pageNo}` : ''}`,
                noteContent: fullText.substring(0, 160),
                noteFullContent: fullText,
                matchCount: 1,
                matchedWords: [topicName],
                chapterTitleFromKey: entry.lessonTitle,
                bookName: (entry.bookName || entry.lessonTitle || 'Lucent').trim(),
                pageNo: pg.pageNo,
                topicName: pg.topicName,
              });
            });
          });
          // Also scan homework entries for matching topicName
          ((settings?.homework || []) as import('../types').HomeworkItem[]).forEach(hw => {
            const tn = (hw.topicName || '').trim();
            if (tn !== topicName) return;
            const key = `hw_${hw.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            const fullText = stripHtml(hw.notes || '');
            hits.push({
              storageKey: key,
              chapterId: hw.id || '',
              subjectName: hw.subject || 'book',
              board: 'COMPETITION',
              classLevel: 'COMPETITION',
              noteTitle: hw.title || topicName,
              noteContent: fullText.substring(0, 160),
              noteFullContent: fullText,
              matchCount: 1,
              matchedWords: [topicName],
              chapterTitleFromKey: hw.title || topicName,
              bookName: hw.bookId || hw.subject || 'Notes',
              pageNo: hw.pageNo,
              topicName: hw.topicName,
            });
          });
          return hits;
        };

        const openTopicCompare = (topicName: string) => {
          const hits = buildTopicHits(topicName);
          if (hits.length === 0) {
            alert('Is topic ke notes kisi aur book mein nahi mile.');
            return;
          }
          setCompareHits(hits);
          setCompareQuery(topicName);
          setShowCompareView(true);
          setLucentLessonCompare(null);
          saveCompareAnalytic(`lesson-topic:${topicName}`, hits.length).catch(() => {});
        };

        return (
          <div className="fixed inset-0 z-[250] bg-white flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-violet-700 text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow-lg">
              <button
                onClick={() => setLucentLessonCompare(null)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors shrink-0"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">📘 Lesson</p>
                <h2 className="text-sm font-black truncate">{lce.lessonTitle}</h2>
                <p className="text-[10px] text-indigo-200">{lce.pages.length} pages · {topicsInLesson.length} topics</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 gap-1 shrink-0 mx-3 mt-3 rounded-xl">
              <button
                onClick={() => setLucentLessonCompareTab('topics')}
                className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${lucentLessonCompareTab === 'topics' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
              >
                <GitCompare size={12} /> 📌 Topics ({topicsInLesson.length})
              </button>
              <button
                onClick={() => setLucentLessonCompareTab('full')}
                className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${lucentLessonCompareTab === 'full' ? 'bg-white shadow text-violet-700' : 'text-slate-500'}`}
              >
                <BookOpen size={12} /> Pura Lesson
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-8">
              {/* Topics tab */}
              {lucentLessonCompareTab === 'topics' && (
                <div className="px-3 pt-3 space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold px-1">
                    Kisi bhi topic pe tap karein — us topic ke notes sab books se compare honge
                  </p>
                  {topicsInLesson.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="font-bold">Koi tagged topic nahi mila</p>
                      <p className="text-sm mt-1">Admin ko pages mein topicName tag karna hoga</p>
                    </div>
                  )}
                  {topicsInLesson.map(({ topicName, pages }) => {
                    const crossBookHits = buildTopicHits(topicName);
                    const crossBookCount = new Set(crossBookHits.map(h => h.bookName)).size;
                    return (
                      <div key={topicName} className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-sm">
                        {/* Topic header */}
                        <div className="px-4 py-3 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[11px] font-black text-indigo-600">📌</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 leading-snug">{topicName}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {pages.length} page{pages.length > 1 ? 's' : ''}
                              {pages[0]?.pageNo ? ` · Pg ${pages.map(p => p.pageNo).join(', ')}` : ''}
                            </p>
                          </div>
                        </div>
                        {/* Action row */}
                        <div className="border-t border-indigo-50 flex">
                          <button
                            onClick={() => {
                              // Open this lesson at the first page of this topic
                              const firstPgIdx = (lce.pages || []).findIndex(p => (p.topicName || '').trim() === topicName);
                              setLucentNoteViewer(lce);
                              setLucentPageIndex(Math.max(0, firstPgIdx));
                              setLucentLessonCompare(null);
                            }}
                            className="flex-1 py-2 text-[11px] font-black text-indigo-600 flex items-center justify-center gap-1 hover:bg-indigo-50 transition-colors"
                          >
                            <BookOpen size={12} /> Padho
                          </button>
                          <div className="w-px bg-indigo-50" />
                          <button
                            onClick={() => openTopicCompare(topicName)}
                            className={`flex-1 py-2 text-[11px] font-black flex items-center justify-center gap-1 transition-colors ${crossBookCount >= 2 ? 'text-violet-700 hover:bg-violet-50' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <GitCompare size={12} />
                            {crossBookCount >= 2 ? `Compare (${crossBookCount} books)` : 'Compare'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full Lesson tab */}
              {lucentLessonCompareTab === 'full' && (
                <div className="px-3 pt-3">
                  {fullLessonText ? (
                    <ChunkedNotesReader
                      key={`lesson-compare-full-${lce.id}`}
                      content={fullLessonText}
                      topBarLabel={lce.lessonTitle}
                      language="hi-IN"
                    />
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <p className="font-bold">Koi content nahi mila</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TOPIC DIRECTORY VIEW */}
      {showTopicDirectory && (
        <TopicDirectoryView
          settings={settings as Record<string, any>}
          globalNoteStars={globalNoteStars}
          onOpenCompare={(hits, query) => {
            setCompareHits(hits);
            setCompareQuery(query);
            setShowTopicDirectory(false);
            setShowHomeSearch(false);
            setHomeSearchQuery('');
            setHomeSearchMode('search');
            setShowCompareView(true);
            saveCompareAnalytic(`topic-dir:${query}`, hits.length).catch(() => {});
          }}
          onClose={() => setShowTopicDirectory(false)}
        />
      )}

      {/* MCQ SEARCH VIEW */}
      {showMcqSearchView && (
        <McqSearchView
          initialQuery={mcqSearchInitialQuery}
          initialHits={chapterMcqHits}
          onClose={() => setShowMcqSearchView(false)}
          user={{ subscriptionLevel: user.subscriptionLevel, isPremium: user.isPremium }}
          settings={settings as Record<string, any>}
        />
      )}

      {/* MCQ COMMUNITY POPUP — opens from "+" button on any MCQ card */}
      {showMcqCommunityPopup && mcqCommunityDraft && (
        <div
          className="fixed inset-0 z-[210]"
          onClick={() => { setShowMcqCommunityPopup(false); setMcqCommunityDraft(null); }}
        >
          <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
            <UniversalChat
              user={user}
              onClose={() => { setShowMcqCommunityPopup(false); setMcqCommunityDraft(null); }}
              isAdmin={false}
              defaultTab="MCQ"
              initialMcqDraft={mcqCommunityDraft}
            />
          </div>
        </div>
      )}

      {/* NAME CHANGE MODAL */}
      {showNameChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-slate-800">
              Change Display Name
            </h3>
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              className="w-full p-3 border rounded-xl mb-2"
              placeholder="Enter new name"
            />
            <p className="text-xs text-slate-600 mb-4">
              Cost:{" "}
              <span className="font-bold text-orange-600">
                {settings?.nameChangeCost || 10} Coins
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNameChangeModal(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const cost = settings?.nameChangeCost || 10;
                  if (newNameInput && newNameInput !== user.name) {
                    if (user.credits < cost) {
                      showAlert(`Insufficient Coins! Need ${cost}.`, "ERROR");
                      return;
                    }
                    const u = {
                      ...user,
                      name: newNameInput,
                      credits: user.credits - cost,
                    };
                    handleUserUpdate(u);
                    setShowNameChangeModal(false);
                    showAlert("Name Updated Successfully!", "SUCCESS");
                  }
                }}
                className="flex-1"
              >
                Pay & Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div
        className={`relative ${
          contentViewStep === "PLAYER" && selectedChapter
            ? "fixed inset-0 z-[150] bg-white overflow-hidden"
            : activeTab === "REVISION" || activeTab === "AI_HUB"
              ? ""
              : activeTab === "HOME"
                ? "px-4 pt-0 pb-20"
                : "p-4 pb-20"
        }`}
      >
        <div
          key={activeTab}
          className={`${contentViewStep === "PLAYER" && selectedChapter ? "h-full" : "animate-in fade-in duration-300 ease-out"}`}
        >
          {/* ErrorBoundary so a render-time crash inside one page (e.g. History
              or Teacher Store) never blanks the whole dashboard — the user can
              tap "Go to Home" and recover instead of seeing a white screen. */}
          <ErrorBoundary key={activeTab + '-eb'}>
            {renderMainContent()}
          </ErrorBoundary>
        </div>
      </div>

      {/* Hidden printable container used by the Competition MCQ Hub "Download" button.
          Rendered off-screen so html-to-MHTML can capture it without showing it on-screen. */}
      <div
        id="comp-mcq-printable"
        style={{ position: 'fixed', left: '-99999px', top: 0, width: '1100px', background: '#ffffff', padding: '32px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}
        aria-hidden="true"
      >
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>
          {settings?.appName || 'IIC'} — Competition MCQs
        </h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
          Downloaded: {new Date().toLocaleString()}
        </p>
        {(() => {
          const adminMcqs = (settings?.competitionMcqs || []);
          const userMcqs = (user.customMcqs || []);
          const all = [
            ...adminMcqs.map((m) => ({ m, src: 'Official' as const })),
            ...userMcqs.map((m) => ({ m, src: 'My MCQ' as const })),
          ];
          if (all.length === 0) return <p style={{ fontSize: '14px', color: '#64748b' }}>No MCQs available.</p>;
          return all.map(({ m, src }, i) => (
            <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '14px', background: '#f8fafc' }}>
              <div style={{ fontSize: '11px', color: src === 'Official' ? '#1d4ed8' : '#047857', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                Q{i + 1} · {src}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                {m.question}
              </div>
              <div>
                {(m.options || []).map((opt, oi) => (
                  <div
                    key={oi}
                    style={{
                      fontSize: '13px',
                      padding: '8px 12px',
                      marginBottom: '6px',
                      borderRadius: '8px',
                      background: oi === m.correctAnswer ? '#d1fae5' : '#ffffff',
                      border: oi === m.correctAnswer ? '1px solid #34d399' : '1px solid #e2e8f0',
                      fontWeight: oi === m.correctAnswer ? 700 : 500,
                    }}
                  >
                    <span style={{ fontWeight: 800, marginRight: '8px' }}>{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                    {oi === m.correctAnswer && <span style={{ marginLeft: '8px', color: '#047857', fontWeight: 700 }}>✓ Answer</span>}
                  </div>
                ))}
              </div>
              {(m as any).explanation && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', color: '#78350f' }}>
                  <strong>Explanation:</strong> {(m as any).explanation}
                </div>
              )}
            </div>
          ));
        })()}
      </div>

      {/* Hidden printable container for the currently-open homework note (notes + MCQs). */}
      <div
        id="hw-note-printable"
        style={{ position: 'fixed', left: '-99999px', top: 0, width: '1100px', background: '#ffffff', padding: '32px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}
        aria-hidden="true"
      >
        {(() => {
          const allHw = (settings?.homework || []);
          const hw = allHw.find(h => h.id === hwActiveHwId);
          if (!hw) return null;
          return (
            <>
              <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>{hw.title}</h1>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
                {new Date(hw.date).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {settings?.appName || 'IIC'}
              </p>
              {hw.notes && (
                <div style={{ fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
                  {hw.notes}
                </div>
              )}
              {hw.parsedMcqs && hw.parsedMcqs.length > 0 && (
                <>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '20px 0 12px', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                    MCQ Practice ({hw.parsedMcqs.length} questions)
                  </h2>
                  {hw.parsedMcqs.map((mcq, qi) => (
                    <div key={qi} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '12px', background: '#f8fafc' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                        {qi + 1}. {mcq.question}
                      </div>
                      {mcq.options.map((opt, oi) => (
                        <div
                          key={oi}
                          style={{
                            fontSize: '13px', padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                            background: oi === mcq.correctAnswer ? '#d1fae5' : '#ffffff',
                            border: oi === mcq.correctAnswer ? '1px solid #34d399' : '1px solid #e2e8f0',
                            fontWeight: oi === mcq.correctAnswer ? 700 : 500,
                          }}
                        >
                          <span style={{ fontWeight: 800, marginRight: '6px' }}>{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                          {oi === mcq.correctAnswer && <span style={{ marginLeft: '6px', color: '#047857', fontWeight: 700 }}>✓</span>}
                        </div>
                      ))}
                      {mcq.explanation && (
                        <div style={{ marginTop: '6px', padding: '8px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '12px' }}>
                          <strong>Explanation:</strong> {mcq.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* Hidden printable container for the currently-open Lucent page —
          used by the "Save Offline (HTML)" button in the Lucent header. */}
      <div
        id="lucent-note-printable"
        style={{ position: 'fixed', left: '-99999px', top: 0, width: '1100px', background: '#ffffff', padding: '32px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}
        aria-hidden="true"
      >
        {(() => {
          const lv = lucentNoteViewer;
          if (!lv) return null;
          const idx = Math.min(Math.max(0, lucentPageIndex), Math.max(0, (lv.pages?.length || 1) - 1));
          const pg = lv.pages?.[idx];
          if (!pg) return null;
          return (
            <>
              <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>
                {lv.lessonTitle} — Page {pg.pageNo}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
                {lv.subject} · Page {idx + 1} of {lv.pages.length} · {settings?.appName || 'IIC'} · Saved {new Date().toLocaleString()}
              </p>
              <div style={{ fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {pg.content || ''}
              </div>
            </>
          );
        })()}
      </div>

      {/* Hidden printable container for the currently-open Lucent page MCQs —
          used by the new "Save" button on the MCQs tab so class 6-12 students
          can take the same MHTML snapshot Competition mode already supports. */}
      <div
        id="lucent-mcq-printable"
        style={{ position: 'fixed', left: '-99999px', top: 0, width: '1100px', background: '#ffffff', padding: '32px', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}
        aria-hidden="true"
      >
        {(() => {
          const lv = lucentNoteViewer;
          if (!lv) return null;
          const idx = Math.min(Math.max(0, lucentPageIndex), Math.max(0, (lv.pages?.length || 1) - 1));
          const pg = lv.pages?.[idx];
          if (!pg) return null;
          const pageKey = `${lv.id}_${idx}`;
          const adminMcqs = (pg.mcqs || []) as MCQItem[];
          const mcqs: MCQItem[] = adminMcqs.length > 0 ? adminMcqs : (lucentMcqsByPage[pageKey] || []);
          return (
            <>
              <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>
                {lv.lessonTitle} — Page {pg.pageNo} · MCQs
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
                {lv.subject} · Page {idx + 1} of {lv.pages.length} · {mcqs.length} question{mcqs.length === 1 ? '' : 's'} · {settings?.appName || 'IIC'} · Saved {new Date().toLocaleString()}
              </p>
              {mcqs.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#64748b' }}>No MCQs available for this page.</p>
              ) : (
                mcqs.map((m, qi) => (
                  <div key={qi} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '12px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                      Q{qi + 1}{(m as any).topic ? ` · ${(m as any).topic}` : ''}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                      {m.question}
                    </div>
                    <div>
                      {(m.options || []).map((opt, oi) => (
                        <div
                          key={oi}
                          style={{
                            fontSize: '13px',
                            padding: '8px 12px',
                            marginBottom: '6px',
                            borderRadius: '8px',
                            background: oi === m.correctAnswer ? '#d1fae5' : '#ffffff',
                            border: oi === m.correctAnswer ? '1px solid #34d399' : '1px solid #e2e8f0',
                            fontWeight: oi === m.correctAnswer ? 700 : 500,
                          }}
                        >
                          <span style={{ fontWeight: 800, marginRight: '8px' }}>{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                          {oi === m.correctAnswer && <span style={{ marginLeft: '8px', color: '#047857', fontWeight: 700 }}>✓ Answer</span>}
                        </div>
                      ))}
                    </div>
                    {(m as any).explanation && (
                      <div style={{ marginTop: '10px', padding: '10px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', color: '#78350f' }}>
                        <strong>Explanation:</strong> {(m as any).explanation}
                      </div>
                    )}
                    {(m as any).examTip && (
                      <div style={{ marginTop: '6px', padding: '8px 10px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', fontSize: '12px', color: '#065f46' }}>
                        <strong>Exam Tip:</strong> {(m as any).examTip}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          );
        })()}
      </div>

      {/* MINI PLAYER */}
      <MiniPlayer
        track={currentAudioTrack}
        onClose={() => setCurrentAudioTrack(null)}
      />

      {/* FIXED BOTTOM NAVIGATION */}
      <nav
        className={`fixed bottom-0 left-0 right-0 w-full mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/70 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] z-[300] pb-safe ${activeExternalApp || isDocFullscreen || (contentViewStep === "PLAYER" && selectedChapter) || isLandscapeUiHidden ? "hidden" : ""}`}
        aria-label="Primary"
      >
        <div className="relative flex justify-around items-stretch h-[64px] max-w-3xl mx-auto px-1">
          {(() => {
            // ---- PER-TAB SNAPSHOT / RESTORE ----
            // Capture every overlay/position state for the tab the user is leaving,
            // and restore the snapshot for the tab they tap (or apply tab defaults
            // on first visit). TTS is stopped on every switch so audio doesn't bleed
            // between tabs, but ALL navigation/draft/scroll state is preserved.
            const captureSnapshot = () => ({
              activeTab,
              showHomeworkHistory,
              homeworkSubjectView,
              hwActiveHwId,
              hwYear,
              hwMonth,
              hwWeek,
              hwOpenedDirect,
              hwTodayPickerSub,
              hwViewMode,
              homeworkPlayerHwId,
              showDailyGkHistory,
              gkExpandedYear,
              gkExpandedMonth,
              gkExpandedWeek,
              showCompMcqHub,
              compMcqTab,
              compMcqIndex,
              compMcqSelected,
              activeExternalApp,
              showAllNotesCatalog,
              viewingUserHistory,
              selectedSubject,
              contentViewStep,
              lucentCategoryView,
            });

            const applySnapshot = (s: any) => {
              if (s.activeTab !== undefined) onTabChange(s.activeTab);
              setShowHomeworkHistory(!!s.showHomeworkHistory);
              setHomeworkSubjectView(s.homeworkSubjectView ?? null);
              setHwActiveHwId(s.hwActiveHwId ?? null);
              setHwYear(s.hwYear ?? null);
              setHwMonth(s.hwMonth ?? null);
              setHwWeek(s.hwWeek ?? null);
              setHwOpenedDirect(!!s.hwOpenedDirect);
              setHwTodayPickerSub(s.hwTodayPickerSub ?? null);
              setHwViewMode(s.hwViewMode ?? 'notes');
              setHomeworkPlayerHwId(s.homeworkPlayerHwId ?? null);
              setShowDailyGkHistory(!!s.showDailyGkHistory);
              setGkExpandedYear(s.gkExpandedYear ?? null);
              setGkExpandedMonth(s.gkExpandedMonth ?? null);
              setGkExpandedWeek(s.gkExpandedWeek ?? null);
              setShowCompMcqHub(!!s.showCompMcqHub);
              setCompMcqTab(s.compMcqTab ?? 'PRACTICE');
              setCompMcqIndex(s.compMcqIndex ?? 0);
              setCompMcqSelected(s.compMcqSelected ?? null);
              setActiveExternalApp(s.activeExternalApp ?? null);
              setShowAllNotesCatalog(false);
              setViewingUserHistory(s.viewingUserHistory ?? null);
              setSelectedSubject(s.selectedSubject ?? null);
              setContentViewStep(s.contentViewStep ?? 'SUBJECTS');
              setLucentCategoryView(!!s.lucentCategoryView);
            };

            // Default state for a tab the user is opening for the first time.
            const defaultSnapshotForTab = (tab: LogicalTab) => {
              const empty = {
                activeTab: 'HOME' as any,
                showHomeworkHistory: false,
                homeworkSubjectView: null,
                hwActiveHwId: null,
                hwYear: null,
                hwMonth: null,
                hwWeek: null,
                hwOpenedDirect: false,
                hwTodayPickerSub: null,
                hwViewMode: 'notes',
                homeworkPlayerHwId: null,
                showDailyGkHistory: false,
                gkExpandedYear: null,
                gkExpandedMonth: null,
                gkExpandedWeek: null,
                showCompMcqHub: false,
                compMcqTab: 'PRACTICE',
                compMcqIndex: 0,
                compMcqSelected: null,
                activeExternalApp: null,
                showAllNotesCatalog: null,
                viewingUserHistory: null,
                selectedSubject: null,
                contentViewStep: 'SUBJECTS',
                lucentCategoryView: false,
              };
              switch (tab) {
                case 'HOME':     return { ...empty, activeTab: 'HOME' };
                case 'HOMEWORK': return { ...empty, activeTab: 'HOME', showHomeworkHistory: true };
                case 'REVISION_V2': return { ...empty, activeTab: 'REVISION_V2' };
                case 'GK':       return { ...empty, activeTab: 'HOME', showDailyGkHistory: true };
                case 'VIDEO':    return { ...empty, activeTab: 'UNIVERSAL_VIDEO' };
                case 'PROFILE':  return { ...empty, activeTab: 'PROFILE' };
                case 'APP_STORE':return { ...empty, activeTab: 'APP_STORE' };
                case 'HISTORY':  return { ...empty, activeTab: 'HISTORY' };
                default:         return empty;
              }
            };

            // activeTab values that "belong" to a logical tab's own sub-navigation.
            // If the current activeTab is NOT in this set, it means the user
            // navigated to a "foreign" top-level page (e.g., STORE, PROFILE) via a
            // direct button tap — we should NOT save that as the logical tab's state.
            // Only chapter-reading sub-states that the user would want restored
            // when returning to a logical tab. "Side mode" pages like CUSTOM_PAGE,
            // STORE, PROFILE, GAME, AI_HUB etc. are treated as foreign so they
            // are NOT persisted into the snapshot, preventing them from showing
            // on the wrong tab after navigation.
            const LOGICAL_TAB_NATIVE_ACTIVE_TABS: Record<LogicalTab, string[]> = {
              HOME:      ['HOME', 'COURSES', 'PDF', 'VIDEO', 'AUDIO', 'MCQ', 'MCQ_REVIEW'],
              HOMEWORK:  ['HOME', 'COURSES', 'PDF', 'VIDEO', 'AUDIO', 'MCQ', 'MCQ_REVIEW'],
              REVISION_V2: ['REVISION_V2'],
              GK:        ['HOME'],
              VIDEO:     ['UNIVERSAL_VIDEO'],
              PROFILE:   ['PROFILE'],
              APP_STORE: ['APP_STORE'],
              HISTORY:   ['HISTORY'],
            };

            const switchToLogicalTab = (target: LogicalTab) => {
              hapticLight();
              try { stopSpeech(); } catch (_) {}
              setSpeakingId(null);
              // Close Community Support chat overlay if open — otherwise the
              // chat keeps covering the dashboard when user taps other nav tabs.
              setShowChat(false);
              // Close the Important Notes overlay if it's open — otherwise the
              // overlay (z-[200]) keeps covering the dashboard even after the
              // user taps Home / Homework / Profile / Revision in bottom nav.
              if (showStarredPage) {
                try { stopProfileStarRead(); } catch (_) {}
                setShowStarredPage(false);
              }
              if (target === currentLogicalTab) {
                // Re-tap of the same logical tab — always go to the default root state
                // for that tab (not the saved snapshot). This ensures that foreign
                // sub-pages like CUSTOM_PAGE, STORE, GAME, etc. are always dismissed
                // when the user taps the active nav icon, even if the snapshot was
                // previously contaminated.
                applySnapshot(defaultSnapshotForTab(target));
                return;
              }
              // Before saving the current snapshot, sanitize activeTab so a "foreign"
              // destination (e.g. user tapped Store from HOME) is not persisted as
              // HOME's state — it would corrupt the snapshot and show wrong content
              // on the next HOME visit.
              const nativeForCurrent = LOGICAL_TAB_NATIVE_ACTIVE_TABS[currentLogicalTab] || [];
              const sanitizedActiveTab = nativeForCurrent.includes(activeTab)
                ? activeTab
                : (defaultSnapshotForTab(currentLogicalTab) as any).activeTab;
              const snap = { ...captureSnapshot(), activeTab: sanitizedActiveTab };
              setTabSnapshots(prev => ({ ...prev, [currentLogicalTab]: snap }));
              const restore = tabSnapshots[target];
              applySnapshot(restore ?? defaultSnapshotForTab(target));
              setCurrentLogicalTab(target);
            };

            const tabs: Array<{
              id: LogicalTab;
              label: string;
              Icon: any;
              featureId?: string;
              filledOnActive?: boolean;
              isActive: boolean;
              onClick: () => void;
            }> = [
              {
                id: "HOME",
                label: "Home",
                Icon: Home,
                featureId: "NAV_HOME",
                filledOnActive: true,
                // When the Important Notes overlay is open, Home should NOT
                // appear active — only ONE bottom-nav tab can be active at a
                // time. Same rule applies to all sibling tabs below.
                isActive: !showStarredPage && currentLogicalTab === "HOME",
                onClick: () => switchToLogicalTab("HOME"),
              },
              // ── HOMEWORK: hideable via admin settings ────
              ...((settings?.hiddenBottomNavButtons || []).includes('HOMEWORK')
                ? []
                : [{ id: "HOMEWORK" as const, label: "Homework", Icon: GraduationCap,
                    isActive: !showStarredPage && currentLogicalTab === "HOMEWORK",
                    onClick: () => switchToLogicalTab("HOMEWORK") }]),

              // ── CASCADING SLOT SYSTEM ──────────────────────────────────────
              // Each item occupies its slot only if enabled.
              // When an item is disabled, the next item slides into that position.
              //
              //  Slot order:  GK (permanent) → RevHub → Video/Profile
              //
              //  GK is now PERMANENT in Slot A (replaces old Revision-Hub-first slot
              //  per user request). Revision Hub now lives in Slot B and remains
              //  admin-toggleable. Important Notes page is reachable from inside GK.

              // Slot A — COMMUNITY SUPPORT (or GK/hidden based on admin settings).
              // Admin can hide chat entirely via hiddenBottomNavButtons includes 'CHAT'.
              // Admin can opt into GK tab by adding 'HISTORY' to hiddenBottomNavButtons.
              ...((settings?.hiddenBottomNavButtons || []).includes('CHAT')
                ? []  // Chat completely hidden — slot A is empty
                : (settings?.hiddenBottomNavButtons || []).includes('HISTORY')
                  ? [{ id: "GK" as const, label: "GK", Icon: Sparkles,
                       filledOnActive: true,
                       isActive: !showStarredPage && currentLogicalTab === "GK",
                       onClick: () => switchToLogicalTab("GK") }]
                  : [{ id: "COMMUNITY_SUPPORT" as const, label: "Community Support", Icon: MessageSquare,
                       filledOnActive: false,
                       isActive: showChat,
                       badge: chatUnread && !showChat,
                       onClick: () => {
                         if (showChat) setShowChat(false);
                         else {
                           setChatUnread(false);
                           localStorage.setItem(`nst_chat_last_open_${user.id}`, new Date().toISOString());
                           setCurrentLogicalTab("HOME");
                           onTabChange("HOME");
                           setShowChat(true);
                         }
                       } }]),

              // Slot B — Revision Hub REMOVED from bottom nav per user request.
              // GK is now permanent in Slot A (taking Revision Hub's old place).
              // Revision Hub remains accessible from the sidebar / Home tile.

              // Slot B' — Important Notes (Star) — separate from GK now.
              ...(!settings?.starredPageHidden && !(settings?.hiddenBottomNavButtons || []).includes('IMPORTANT')
                ? [{ id: "IMPORTANT" as const, label: "Important", Icon: Star,
                     filledOnActive: true,
                     isActive: showStarredPage,
                     onClick: () => setShowStarredPage(true) }]
                : []),

              // Slot C — Video OR Profile (mutual exclusive)
              //   • Video in bottom nav → Video tab
              //   • Video moved to top bar → Profile takes this exact slot
              // Discount LIVE hone par `universalVideoInTopBarEffective` true
              // ho jata hai → Profile slot Video se replace ho jata hai
              // (admin setting ke upar override).
              ...(!universalVideoInTopBarEffective && !(settings?.hiddenBottomNavButtons || []).includes('VIDEO')
                ? [{ id: "VIDEO" as const, label: "Video", Icon: Video,
                     featureId: "VIDEO_ACCESS",
                     isActive: !showStarredPage && currentLogicalTab === "VIDEO",
                     onClick: () => switchToLogicalTab("VIDEO") }]
                : (universalVideoInTopBarEffective && !(settings?.hiddenBottomNavButtons || []).includes('PROFILE')
                ? [{ id: "PROFILE" as const, label: "Profile", Icon: UserIconOutline,
                     featureId: "PROFILE_PAGE", filledOnActive: true,
                     isActive: !showStarredPage && currentLogicalTab === "PROFILE",
                     onClick: () => switchToLogicalTab("PROFILE") }]
                : [])),
              ...(!settings?.appStorePageHidden && !(settings?.hiddenBottomNavButtons || []).includes('APP_STORE')
                ? [
                    {
                      id: "APP_STORE" as const,
                      label: "Apps",
                      Icon: ShoppingBag,
                      filledOnActive: true,
                      isActive: !showStarredPage && currentLogicalTab === "APP_STORE",
                      onClick: () => switchToLogicalTab("APP_STORE"),
                    },
                  ]
                : []),
            ];

            // Filter out hidden tabs first so the sliding indicator math
            // matches what's actually rendered.
            const visibleTabs = tabs.filter((t) => {
              const access = t.featureId
                ? getFeatureAccess(t.featureId)
                : { hasAccess: true, isHidden: false };
              return !access.isHidden;
            });
            const totalVisible = Math.max(visibleTabs.length, 1);
            const activeIndex = Math.max(0, visibleTabs.findIndex((t) => t.isActive));
            const tabWidthPct = 100 / totalVisible;

            return (
              <>
                {/* SLIDING TOP ACCENT — single pill that glides between tabs */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-0 h-[3px] rounded-b-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_2px_10px_-2px_rgba(79,70,229,0.55)]"
                  style={{
                    left: `calc(${activeIndex * tabWidthPct}% + ${tabWidthPct / 2}% - 18px)`,
                    width: '36px',
                    transition: 'left 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
                {/* SLIDING SOFT GLOW behind the active tab icon */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1.5 h-9 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/80 ring-1 ring-blue-100/60"
                  style={{
                    left: `calc(${activeIndex * tabWidthPct}% + ${tabWidthPct / 2}% - 24px)`,
                    width: '48px',
                    transition: 'left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
                {visibleTabs.map((tab) => {
                  const access = tab.featureId
                    ? getFeatureAccess(tab.featureId)
                    : { hasAccess: true, isHidden: false };
                  const isLocked = !access.hasAccess;
                  const { Icon } = tab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          showAlert("🔒 Locked by Admin.", "ERROR");
                          return;
                        }
                        hapticMedium();
                        // Trigger ripple burst on every tab EXCEPT Home (Home stays minimal)
                        if (tab.id !== 'HOME') {
                          setNavTapKeys(prev => ({ ...prev, [tab.id]: (prev[tab.id] || 0) + 1 }));
                        }
                        // If user is currently inside a notes/MCQ reader (Lucent / HW),
                        // save their progress to Continue Reading and close the reader
                        // BEFORE switching tabs. So nav-tap "exits cleanly" and the
                        // page they were reading shows up under Continue Reading next time.
                        try { closeReadersBeforeNavSwitch(tab.id); } catch {}
                        tab.onClick();
                      }}
                      aria-label={tab.label}
                      aria-current={tab.isActive ? "page" : undefined}
                      className={`group relative flex-1 flex flex-col items-center justify-center gap-1 pt-1.5 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 rounded-xl transition-[color,transform] duration-150 ease-out active:scale-[0.90] ${
                        isLocked ? "opacity-50" : ""
                      }`}
                    >
                      {/* Icon container — only the icon scales; background pill is the sliding glow above */}
                      <span
                        key={tab.isActive ? `${tab.id}-on` : `${tab.id}-off`}
                        className={`relative z-10 inline-flex items-center justify-center h-9 w-12 rounded-2xl transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-active:bg-slate-100/60 ${
                          tab.isActive ? "nav-icon-pop scale-110" : "scale-100"
                        }`}
                      >
                        {/* Tap ripple — only renders for non-HOME tabs. The key trick re-mounts
                            the span on every tap so the CSS animation re-fires from 0. */}
                        {tab.id !== 'HOME' && (navTapKeys[tab.id] || 0) > 0 && (
                          <span
                            key={`ripple-${tab.id}-${navTapKeys[tab.id]}`}
                            aria-hidden
                            className="nav-ripple-burst pointer-events-none absolute inset-0 m-auto rounded-full"
                          />
                        )}
                        <Icon
                          size={22}
                          strokeWidth={tab.isActive ? 2.4 : 2}
                          className={`transition-colors duration-300 ${
                            tab.isActive ? "text-blue-600" : "text-slate-500"
                          }`}
                          fill={
                            tab.filledOnActive && tab.isActive && !isLocked
                              ? "currentColor"
                              : "none"
                          }
                        />
                        {isLocked && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full p-[2px] border border-white shadow-sm">
                            <Lock size={8} className="text-white" />
                          </span>
                        )}
                        {!isLocked && (tab as any).badge && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
                        )}
                      </span>

                      <span
                        className={`relative z-10 text-[10.5px] leading-none tracking-wide transition-all duration-300 ${
                          tab.isActive
                            ? "text-blue-600 font-semibold translate-y-0 opacity-100"
                            : "text-slate-500 font-medium translate-y-0 opacity-90"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
      </nav>

      {/* SIDEBAR OVERLAY (INLINE) */}
      {showSidebar && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          ></div>

          <div className="w-60 bg-white h-full shadow-2xl relative z-10 flex flex-col slide-in-from-left duration-300">
            <div className="p-6 bg-slate-900 text-white rounded-br-3xl relative overflow-hidden">
              <div className="flex flex-col relative z-10">
                <h2 className="text-3xl font-black italic mb-0.5">
                  {settings?.appName || "App"}
                </h2>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white z-20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {renderSidebarMenuItems()}

              {/* EXTERNAL APPS */}
              {settings?.externalApps?.map((app) => (
                <Button
                  key={app.id}
                  onClick={() => {
                    handleExternalAppClick(app);
                    setShowSidebar(false);
                  }}
                  variant="ghost"
                  fullWidth
                  className="justify-start gap-4 p-4 hover:bg-slate-50"
                >
                  <div className="bg-cyan-100 text-cyan-600 p-2 rounded-lg">
                    {app.icon ? (
                      <img src={app.icon} alt="" className="w-5 h-5" />
                    ) : (
                      <Smartphone size={20} />
                    )}
                  </div>
                  <span className="flex-1 text-left">{app.name}</span>
                  {app.isLocked && <Lock size={14} className="text-red-500" />}
                </Button>
              ))}

              <Button
                onClick={() => {
                  onTabChange("CUSTOM_PAGE");
                  setShowSidebar(false);
                }}
                variant="ghost"
                fullWidth
                className="justify-start gap-4 p-4 hover:bg-slate-50 relative"
              >
                <div className="bg-teal-100 text-teal-600 p-2 rounded-lg">
                  <Zap size={20} />
                </div>
                What's New
                {hasNewUpdate && (
                  <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                )}
              </Button>
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                  {user.subscriptionLevel === "ULTRA" ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white">
                      👑
                    </div>
                  ) : (
                    (user.name || "S").charAt(0)
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm truncate text-slate-800">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">{user.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INBOX MODAL */}
      {showInbox && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowInbox(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full shadow-2xl flex flex-col h-[85vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Inbox</h3>
                  <p className="text-xs text-slate-500 font-bold">
                    {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInbox(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-6">
              {!user.inbox || user.inbox.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <Mail size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">No messages yet.</p>
                </div>
              ) : (
                user.inbox.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`p-4 rounded-2xl border ${msg.read ? "bg-white border-slate-200 opacity-70" : "bg-indigo-50 border-indigo-200 shadow-sm"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {msg.type === "GIFT" ? (
                          <Gift size={16} className="text-pink-500" />
                        ) : (
                          <MessageSquare size={16} className="text-blue-500" />
                        )}
                        <span className="text-xs font-bold text-slate-500">
                          {new Date(msg.date).toLocaleDateString()}
                        </span>
                      </div>
                      {!msg.read && (
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed mb-3">
                      {msg.text}
                    </p>

                    {msg.type === "GIFT" && msg.gift && !msg.isClaimed && (
                      <button
                        onClick={() =>
                          claimRewardMessage(msg.id, null, msg.gift)
                        }
                        className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Gift size={16} /> Claim Gift
                      </button>
                    )}
                    {msg.type === "GIFT" && msg.gift && msg.isClaimed && (
                      <div className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded-lg text-center flex items-center justify-center gap-1">
                        <CheckCircle size={14} /> Gift Claimed
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {unreadCount > 0 && (
              <div className="pt-4 border-t border-slate-100 mt-auto">
                <button
                  onClick={markInboxRead}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXTERNAL APP OVERLAY */}
      {activeExternalApp && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setActiveExternalApp(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
              aria-label="Back to IIC"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-slate-700">External App</span>
            <button
              onClick={() => setActiveExternalApp(null)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-50 relative">
            <iframe
              src={activeExternalApp}
              className="absolute inset-0 w-full h-full border-none"
              title="External App Viewer"
              allow="autoplay; camera; microphone; fullscreen; display-capture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-presentation"
            />
          </div>
        </div>
      )}

      {/* STUDENT HISTORY MODAL (FULL ACTIVITY) */}
      {viewingUserHistory && (
        <StudentHistoryModal
          user={viewingUserHistory}
          onClose={() => setViewingUserHistory(null)}
        />
      )}

      {/* LESSON ACTION MODAL */}
      {showLessonModal && selectedLessonForModal && (
        <LessonActionModal
          chapter={selectedLessonForModal}
          onClose={() => setShowLessonModal(false)}
          onSelect={handleLessonOption}
          logoUrl={settings?.appLogo} // Pass logo from settings
          appName={settings?.appName}
          // hideMcq removed: Class 6-12 students now also see the MCQ option
          // here. Once inside MCQ they get the Lucent-style 3-mode selector
          // (📝 MCQ · 💬 Q&A · 🃏 Flashcard) and a Notes ↔ MCQ tab switch.
        />
      )}

      {/* LUCENT PAGE-WISE NOTES VIEWER */}
      {lucentNoteViewer && (() => {
        const entry = lucentNoteViewer;
        const totalPages = entry.pages.length;
        const safeIndex = Math.min(Math.max(0, lucentPageIndex), Math.max(0, totalPages - 1));
        const currentPage = entry.pages[safeIndex];
        // Sibling Lucent lessons (same subject) sorted by lessonNumber/title — for
        // cross-lesson Prev/Next when at the very first / last page.
        const _siblingMinPg = (l: any): number => {
          let m = Infinity;
          (l.pages || []).forEach((p: any) => {
            const x = parseInt(p.pageNo || '', 10);
            if (!isNaN(x) && x < m) m = x;
          });
          return m === Infinity ? 99999 : m;
        };
        const lucentSiblings = ((settings?.lucentNotes || []) as any[])
          .filter(l => l.subject === entry.subject)
          .sort((a, b) => {
            // Page number wise sort: lesson covering lowest page first.
            const pa = _siblingMinPg(a);
            const pb = _siblingMinPg(b);
            if (pa !== pb) return pa - pb;
            // Tie-break: lessonNumber, then title.
            const an = Number(a.lessonNumber ?? 9999);
            const bn = Number(b.lessonNumber ?? 9999);
            if (an !== bn) return an - bn;
            return String(a.lessonTitle || '').localeCompare(String(b.lessonTitle || ''));
          });
        const lucentLessonIdx = lucentSiblings.findIndex(l => l.id === entry.id);
        const prevLesson = lucentLessonIdx > 0 ? lucentSiblings[lucentLessonIdx - 1] : null;
        const nextLesson = lucentLessonIdx >= 0 && lucentLessonIdx + 1 < lucentSiblings.length
          ? lucentSiblings[lucentLessonIdx + 1] : null;
        const goPrev = () => {
          if (safeIndex > 0) {
            setLucentPageIndex(safeIndex - 1);
          } else if (prevLesson) {
            // Hop to last page of previous lesson
            stopSpeech();
            setLucentNoteViewer(prevLesson);
            setLucentPageIndex(Math.max(0, (prevLesson.pages?.length || 1) - 1));
          }
        };
        const goNext = () => {
          if (safeIndex < totalPages - 1) {
            setLucentPageIndex(safeIndex + 1);
          } else if (nextLesson) {
            // Hop to first page of next lesson
            stopSpeech();
            setLucentNoteViewer(nextLesson);
            setLucentPageIndex(0);
          }
        };
        const canGoPrev = safeIndex > 0 || !!prevLesson;
        const canGoNext = safeIndex < totalPages - 1 || !!nextLesson;
        const autoSyncOn = lucentAutoSync;

        // ── Lucent Topic Continuation: merge consecutive pages with same topicName ──
        // If the admin tagged consecutive pages with the same topicName, stitch their
        // content so the student reads the full topic without hitting a page-break.
        const lucentCurrentTopicName = (currentPage?.topicName || '').trim();
        const lucentContinuationPages: LucentPageNote[] = [];
        if (lucentCurrentTopicName) {
          let ci = safeIndex + 1;
          while (ci < entry.pages.length) {
            const cand = entry.pages[ci];
            if ((cand?.topicName || '').trim() === lucentCurrentTopicName) {
              lucentContinuationPages.push(cand);
              ci++;
            } else {
              break;
            }
          }
        }
        // Combined speak text: current page + any same-topicName continuation pages
        const combinedContent = [
          currentPage?.content || '',
          ...lucentContinuationPages.map(p => p.content || ''),
        ].filter(Boolean).join('\n\n');
        // ────────────────────────────────────────────────────────────────────────────

        // Build a per-page text that includes the page number heading so TTS announces it.
        const pageSpeakText = currentPage
          ? `Page ${currentPage.pageNo}. ${combinedContent}`
          : '';
        // Next page index after merging (skip continuation pages)
        const lucentEffectiveNextIdx = safeIndex + 1 + lucentContinuationPages.length;
        const lucentNextPageAfterTopic = lucentEffectiveNextIdx < totalPages
          ? entry.pages[lucentEffectiveNextIdx]
          : null;

        // Save the current page to Continue Reading using the live scroll % so
        // History / Home picks up wherever the student stopped.
        const persistLucentProgress = (overridePct?: number) => {
          if (!currentPage) return;
          try {
            const recId = `lucent_${entry.id}_${safeIndex}`;
            saveRecentLucent({
              id: recId,
              lucentId: entry.id,
              lessonTitle: entry.lessonTitle,
              subject: entry.subject,
              pageIndex: safeIndex,
              pageNo: currentPage.pageNo,
              totalPages,
              scrollY: 0,
              scrollPct: Math.max(2, Math.round(overridePct ?? lucentScrollProgress ?? 5)),
            });
            markReadToday(recId);
          } catch {}
        };

        // Closes the Lucent viewer cleanly: saves partial progress so the page
        // shows up in Continue Reading, stops TTS, and tears down auto-sync.
        const closeLucentViewer = () => {
          persistLucentProgress();
          try { stopSpeech(); } catch {}
          setLucentAutoSync(false);
          setLucentNoteViewer(null);
          setIsLandscapeUiHidden(false);
        };

        return (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in">
            {/* Reading progress bar — same gradient style as Sar Sangrah / Speedy */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/60 z-[60] pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-[width] duration-150 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, lucentScrollProgress))}%` }}
              />
            </div>
            {/* Back-to-top FAB once the user has scrolled meaningfully */}
            {lucentScrollProgress > 30 && (
              <button
                onClick={() => {
                  const node = lucentScrollContainerRef.current;
                  if (node) node.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Back to top"
                title="Back to top"
                className="fixed bottom-24 right-5 z-[210] w-11 h-11 rounded-full bg-slate-800/85 hover:bg-slate-900 text-white shadow-xl backdrop-blur-md flex items-center justify-center active:scale-90 transition-all animate-in fade-in slide-in-from-bottom-2"
              >
                <ChevronRight size={22} className="-rotate-90" />
              </button>
            )}
            {/* Header */}
            <div className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center gap-3 shrink-0 ${isLandscapeUiHidden ? 'hidden' : ''}`}>
              <button onClick={closeLucentViewer} className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
                  📘 Lucent Book
                  {currentPage?.date && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide">
                      📅 {new Date(currentPage.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </p>
                <p className="font-black text-sm truncate">{entry.lessonTitle}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-[11px] font-black whitespace-nowrap">
                  {safeIndex + 1}/{totalPages}
                </span>
                {/* Save Offline (HTML) — works for current Lucent page */}
                <button
                  onClick={async () => {
                    try {
                      const safeTitle = `${entry.lessonTitle || 'Lucent'}_pg${currentPage?.pageNo || safeIndex + 1}`
                        .replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 60);
                      await downloadAsMHTML('lucent-note-printable', `${safeTitle}_${new Date().toISOString().slice(0,10)}`, {
                        appName: settings?.appShortName || settings?.appName || 'IIC',
                        pageTitle: `${entry.lessonTitle || 'Lucent'} · Page ${currentPage?.pageNo || safeIndex + 1}`,
                        subtitle: 'Lucent Notes',
                      });
                      showAlert('📥 Saved offline!', 'SUCCESS');
                    } catch (e) {
                      showAlert('Download failed. Please try again.', 'ERROR');
                    }
                  }}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors"
                  aria-label="Save this Lucent page offline"
                  title="Save offline (HTML)"
                >
                  <Download size={16} />
                </button>
                {/* Smart Search toggle */}
                <button
                  onClick={() => { setLucentSearchActive(v => !v); if (lucentSearchActive) setLucentSearchQuery(''); }}
                  className={`p-2 rounded-full shrink-0 transition-colors ${lucentSearchActive ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  title="Search across pages"
                  aria-label="Search pages"
                >
                  <Search size={15} />
                </button>
                {/* PDF Export (Ultra/Lifetime) */}
                {(user.subscriptionTier === 'LIFETIME' || user.subscriptionLevel === 'ULTRA') && (
                  <button
                    onClick={() => {
                      try {
                        const printWin = window.open('', '_blank', 'width=800,height=900');
                        if (!printWin) { showAlert('Pop-up blocked. Please allow pop-ups.', 'ERROR'); return; }
                        const el = document.getElementById('lucent-note-printable');
                        const bodyHtml = el ? el.innerHTML : (currentPage?.content || 'No content');
                        const appName = settings?.appShortName || settings?.appName || 'IIC';
                        printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${entry.lessonTitle} · Page ${currentPage?.pageNo || safeIndex+1}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:40px auto;color:#111;font-size:14px;line-height:1.7}.watermark{position:fixed;bottom:30px;right:30px;font-size:48px;font-weight:900;color:rgba(99,102,241,0.08);pointer-events:none;transform:rotate(-20deg)}h1{color:#4f46e5;font-size:18px;margin-bottom:4px}p.sub{color:#6b7280;font-size:11px;margin-bottom:24px;border-bottom:1px solid #e5e7eb;padding-bottom:12px}@media print{.watermark{display:block}}</style></head><body><h1>${entry.lessonTitle}</h1><p class="sub">${appName} · Lucent Book · Page ${currentPage?.pageNo || safeIndex+1} of ${totalPages}</p>${bodyHtml}<div class="watermark">${appName}</div></body></html>`);
                        printWin.document.close();
                        printWin.focus();
                        setTimeout(() => { try { printWin.print(); } catch {} }, 600);
                      } catch { showAlert('PDF export failed.', 'ERROR'); }
                    }}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full shrink-0 transition-colors"
                    title="Export as PDF (Ultra/Lifetime)"
                    aria-label="Export PDF"
                  >
                    <span style={{ fontSize: '13px', lineHeight: 1, fontWeight: 900 }}>PDF</span>
                  </button>
                )}
                <button
                  onClick={() => { const next = !autoSyncOn; setLucentAutoSync(next); if (!next) stopSpeech(); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${autoSyncOn ? 'bg-white text-indigo-700' : 'bg-white/20 text-white'}`}
                  title="Auto-Read & Sync: automatically read each page and move to the next"
                >
                  <Zap size={11} className={autoSyncOn ? 'fill-indigo-600' : ''} />
                  {autoSyncOn ? 'Auto ON' : 'Auto'}
                </button>
              </div>
            </div>
            {/* Smart Search bar */}
            {lucentSearchActive && (
              <div className="shrink-0 bg-white border-b border-slate-100 px-3 py-2">
                <div className="relative flex items-center gap-2">
                  <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={lucentSearchQuery}
                    onChange={e => setLucentSearchQuery(e.target.value)}
                    placeholder="Pages mein search karo..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {lucentSearchQuery && (
                    <button onClick={() => setLucentSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  )}
                </div>
                {lucentSearchQuery.trim() && (() => {
                  const q = lucentSearchQuery.trim().toLowerCase();
                  const results = entry.pages.reduce((acc: {pageIndex: number; pageNo: string; snippet: string}[], page: any, idx: number) => {
                    const text = (page.content || '');
                    const lower = text.toLowerCase();
                    if (lower.includes(q)) {
                      const mi = lower.indexOf(q);
                      const start = Math.max(0, mi - 28);
                      const end = Math.min(text.length, mi + 55);
                      acc.push({ pageIndex: idx, pageNo: page.pageNo || String(idx + 1), snippet: (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '') });
                    }
                    return acc;
                  }, []).slice(0, 6);
                  if (results.length === 0) return <p className="text-xs text-slate-400 px-1 pt-1">Koi result nahi mila</p>;
                  return (
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                      {results.map(r => (
                        <button
                          key={r.pageIndex}
                          onClick={() => { setLucentPageIndex(r.pageIndex); setLucentSearchActive(false); setLucentSearchQuery(''); }}
                          className="w-full text-left px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                        >
                          <span className="text-[10px] font-black text-indigo-700 mr-2">Pg {r.pageNo}</span>
                          <span className="text-[10px] text-slate-600 line-clamp-1">{r.snippet}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
            {/* NOTES / MCQ TAB SWITCHER */}
            <div className={`shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 ${isLandscapeUiHidden ? 'hidden' : ''}`}>
              <button
                onClick={() => { setLucentActiveTab('NOTES'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  lucentActiveTab === 'NOTES'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText size={13} /> Notes
              </button>
              <button
                onClick={() => { stopSpeech(); setLucentActiveTab('MCQS'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                  lucentActiveTab === 'MCQS'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BrainCircuit size={13} /> MCQs
                {(() => {
                  const k = `${entry.id}_${safeIndex}`;
                  const cnt = lucentMcqsByPage[k]?.length || 0;
                  return cnt > 0 ? <span className="ml-0.5 text-[10px] bg-white/30 px-1.5 py-0.5 rounded-full">{cnt}</span> : null;
                })()}
              </button>
            </div>
            {/* Notes scroll area */}
            <div
              ref={lucentScrollContainerRef}
              className={`flex-1 overflow-y-auto ${lucentActiveTab === 'NOTES' ? '' : 'hidden'}`}
              onScroll={(e) => {
                const t = e.currentTarget;
                const max = t.scrollHeight - t.clientHeight;
                const pct = max > 0 ? Math.min(100, Math.max(0, (t.scrollTop / max) * 100)) : 0;
                setLucentScrollProgress(pct);
                // Throttle persist via micro-debounce: only save once user has
                // scrolled past 5% so we don't spam writes on tiny movements.
                if (pct > 5) {
                  persistLucentProgress(pct);
                }
              }}
            >
              {currentPage ? (
                <div className="px-4 pb-2">
                  <ChunkedNotesReader
                    key={`lucent-reader-${entry.id}-${safeIndex}-${autoSyncOn ? 'auto' : 'manual'}`}
                    content={pageSpeakText}
                    topBarLabel={`Page ${currentPage.pageNo}`}
                    hideTopBar={isLandscapeUiHidden}
                    autoStart={autoSyncOn}
                    searchQuery={pendingReadQuery}
                    getStarCount={getNoteStarCount}
                    // Save this Lucent page to Continue Reading the moment TTS starts.
                    onReadingStart={() => {
                      try {
                        const recId = `lucent_${entry.id}_${safeIndex}`;
                        saveRecentLucent({
                          id: recId,
                          lucentId: entry.id,
                          lessonTitle: entry.lessonTitle,
                          subject: entry.subject,
                          pageIndex: safeIndex,
                          pageNo: currentPage.pageNo,
                          totalPages,
                          scrollY: 0,
                          scrollPct: 5,
                        });
                        markReadToday(recId);
                      } catch {}
                    }}
                    onComplete={() => {
                      // Mark this lucent page as fully read for the History badge.
                      try {
                        const recId = `lucent_${entry.id}_${safeIndex}`;
                        markNoteFullyRead({
                          id: recId,
                          kind: 'lucent',
                          title: `${entry.lessonTitle} — Page ${currentPage.pageNo}`,
                          subtitle: entry.subject,
                        });
                      } catch {}
                      // Auto-Sync: skip past same-topic continuation pages, land on next new topic.
                      if (autoSyncOn) {
                        const nextIdx = lucentEffectiveNextIdx < totalPages
                          ? lucentEffectiveNextIdx
                          : safeIndex + 1;
                        if (nextIdx < totalPages) {
                          setTimeout(() => setLucentPageIndex(nextIdx), 400);
                        } else if (nextLesson) {
                          setTimeout(() => { stopSpeech(); setLucentNoteViewer(nextLesson); setLucentPageIndex(0); }, 600);
                        }
                      }
                    }}
                    noteKey={`lucent_${entry.id}_p${safeIndex}`}
                    isStarred={(text) => isNoteTopicStarred(`lucent_${entry.id}_p${safeIndex}`, text)}
                    onStarToggle={(text) => toggleStarNote(
                      `lucent_${entry.id}_p${safeIndex}`,
                      text,
                      {
                        kind: 'lucent',
                        lucentId: entry.id,
                        pageIndex: safeIndex,
                        pageNo: currentPage?.pageNo,
                        lessonTitle: entry.lessonTitle,
                        subject: entry.subject,
                      }
                    )}
                  />

                  {/* ── Page Continuation Card ────────────────────────────────────── */}
                  {/* Shown at the END of notes when there are more pages/lessons to read.
                      Gives the student a clear CTA so they never miss that notes continue. */}
                  {canGoNext && !autoSyncOn && (
                    <div className="mt-4 mb-2">
                      {/* Same-topicName pages were already merged above — show "next topic" card */}
                      {lucentNextPageAfterTopic ? (
                        <button
                          onClick={() => { stopSpeech(); setLucentPageIndex(lucentEffectiveNextIdx); }}
                          className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                            <BookOpen size={18} className="text-indigo-600" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">📖 Aage bhi padhein</p>
                            <p className="text-sm font-black text-indigo-800 truncate">
                              Page {lucentNextPageAfterTopic.pageNo}
                              {lucentNextPageAfterTopic.topicName ? ` — ${lucentNextPageAfterTopic.topicName}` : ''}
                            </p>
                            <p className="text-[10px] text-indigo-500">Next topic continue ho raha hai →</p>
                          </div>
                          <ChevronRight size={20} className="text-indigo-400 shrink-0" />
                        </button>
                      ) : safeIndex < totalPages - 1 ? (
                        /* Within same lesson — next page */
                        <button
                          onClick={() => { stopSpeech(); setLucentPageIndex(safeIndex + 1); }}
                          className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                            <BookOpen size={18} className="text-indigo-600" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">📖 Page khatam — continue karein</p>
                            <p className="text-sm font-black text-indigo-800">
                              Page {entry.pages[safeIndex + 1]?.pageNo} ke notes →
                            </p>
                            <p className="text-[10px] text-indigo-500">Is page ke notes khatam, agle page pe jaayein</p>
                          </div>
                          <ChevronRight size={20} className="text-indigo-400 shrink-0" />
                        </button>
                      ) : nextLesson ? (
                        /* End of lesson — next lesson */
                        <button
                          onClick={() => { stopSpeech(); setLucentNoteViewer(nextLesson); setLucentPageIndex(0); }}
                          className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                            <BookOpen size={18} className="text-purple-600" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">📚 Agli Chapter</p>
                            <p className="text-sm font-black text-purple-800 truncate">{nextLesson.lessonTitle}</p>
                            <p className="text-[10px] text-purple-500">Is chapter ke notes khatam — agli chapter shuru karein</p>
                          </div>
                          <ChevronRight size={20} className="text-purple-400 shrink-0" />
                        </button>
                      ) : null}
                    </div>
                  )}
                  {/* ────────────────────────────────────────────────────────────────── */}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-16 text-sm">No pages available.</div>
              )}
            </div>
            {/* MCQ tab content */}
            {lucentActiveTab === 'MCQS' && (() => {
              const pageKey = `${entry.id}_${safeIndex}`;
              // Prefer admin-curated MCQs from this Lucent page if present;
              // otherwise fall back to AI-generated MCQs cached in state.
              const adminMcqs = (currentPage?.mcqs || []) as MCQItem[];
              const mcqs = adminMcqs.length > 0 ? adminMcqs : (lucentMcqsByPage[pageKey] || []);
              const usingAdminMcqs = adminMcqs.length > 0;
              const revealedCount = lucentMcqRevealed[pageKey] || 0;
              const pageText = (currentPage?.content || '').trim();

              const generateMcqs = async () => {
                if (!pageText || pageText.length < 30) {
                  showAlert('Is page mein MCQ banane ke liye text bahut kam hai.', 'ERROR');
                  return;
                }
                setLucentMcqLoading(true);
                try {
                  const { callGroqApi } = await import('../services/groq');
                  const prompt = `Aap ek expert teacher hain. Neeche diye gaye Hindi/Hinglish notes ke important points se 8 high-quality MCQs banaiye. STRICT JSON array format mein hi return kariye, koi extra text nahi.

NOTES:
"""
${pageText.slice(0, 4000)}
"""

OUTPUT FORMAT (sirf valid JSON array, no markdown):
[
  {
    "question": "❓ Question Hindi/Hinglish mein",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": 0,
    "topic": "📖 Topic name",
    "concept": "💡 Concept short mein",
    "explanation": "🔎 Explanation Hindi mein",
    "examTip": "🎯 Exam tip",
    "commonMistake": "⚠ Common mistake",
    "mnemonic": "🧠 Memory trick",
    "difficulty": "EASY"
  }
]

RULES:
- Exactly 8 questions.
- Questions notes ke FACTS aur points se hi banaiye.
- correctAnswer 0-3 index.
- Sab fields zaroor bhariye, Hindi/Hinglish mein.
- Markdown blocks (\`\`\`json) NAHI lagana.`;

                  const raw = await callGroqApi([
                    { role: 'system', content: 'You return ONLY valid JSON arrays. No markdown, no prose.' },
                    { role: 'user', content: prompt }
                  ]);
                  let jsonText = (raw || '').trim();
                  // Strip code fences
                  jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
                  // Try to extract first [...] block
                  const m = jsonText.match(/\[[\s\S]*\]/);
                  if (m) jsonText = m[0];
                  let parsed: any[] = [];
                  try { parsed = JSON.parse(jsonText); } catch (e) {
                    showAlert('Could not parse the MCQ. Please try again.', 'ERROR');
                    setLucentMcqLoading(false);
                    return;
                  }
                  const cleaned: MCQItem[] = (Array.isArray(parsed) ? parsed : []).map((q, i) => ({
                    id: `lucent_mcq_${pageKey}_${i}`,
                    question: q.question || '',
                    options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
                    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                    topic: q.topic || '',
                    concept: q.concept || '',
                    explanation: q.explanation || '',
                    examTip: q.examTip || '',
                    commonMistake: q.commonMistake || '',
                    mnemonic: q.mnemonic || '',
                    difficulty: q.difficulty || 'MEDIUM',
                  } as any)).filter(q => q.question && q.options.length === 4);
                  if (cleaned.length === 0) {
                    showAlert('AI ne valid MCQ nahi diye. Phir try kariye.', 'ERROR');
                  } else {
                    setLucentMcqsByPage(prev => ({ ...prev, [pageKey]: cleaned }));
                    setLucentMcqRevealed(prev => ({ ...prev, [pageKey]: 0 }));
                  }
                } catch (e) {
                  showAlert('MCQ generate karne mein error aa gaya.', 'ERROR');
                } finally {
                  setLucentMcqLoading(false);
                }
              };

              return (
                <div className="flex-1 overflow-y-auto bg-slate-50">
                  <div className="px-4 py-4 space-y-3">
                    {/* Header / actions */}
                    <div className="bg-white border border-purple-100 rounded-2xl p-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${usingAdminMcqs ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'}`}>
                        <BrainCircuit size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                          Page MCQs
                          {usingAdminMcqs && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">Admin</span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {usingAdminMcqs
                            ? `Page ${currentPage?.pageNo} ke admin-curated questions`
                            : `Page ${currentPage?.pageNo} ke points se AI banayega`}
                        </p>
                      </div>
                      {/* Download all MCQs of this Lucent page as a portable
                          MHTML/HTML file — same convenience the Competition
                          MCQ Hub already offers. */}
                      {mcqs.length > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              const safeTitle = `${entry.lessonTitle || 'Lucent'}_pg${currentPage?.pageNo || safeIndex + 1}_MCQs`
                                .replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 60);
                              await downloadAsMHTML('lucent-mcq-printable', `${safeTitle}_${new Date().toISOString().slice(0,10)}`, {
                                appName: settings?.appShortName || settings?.appName || 'IIC',
                                pageTitle: `${entry.lessonTitle || 'Lucent'} · Page ${currentPage?.pageNo || safeIndex + 1} MCQs`,
                                subtitle: `Lucent MCQs · ${mcqs.length} questions`,
                              });
                              showAlert(`📥 ${mcqs.length} MCQs saved offline!`, 'SUCCESS');
                            } catch (e) {
                              showAlert('Download failed. Please try again.', 'ERROR');
                            }
                          }}
                          className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition flex items-center gap-1"
                          title="Save these MCQs offline"
                        >
                          <Download size={12} /> Save
                        </button>
                      )}
                      {!usingAdminMcqs && mcqs.length > 0 && (
                        <button
                          onClick={generateMcqs}
                          disabled={lucentMcqLoading}
                          className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition disabled:opacity-50"
                          title="Re-generate"
                        >
                          {lucentMcqLoading ? '...' : '↻ Re-make'}
                        </button>
                      )}
                    </div>

                    {/* T2/T4: Mode selector — Sidha Answer · Khud Banao · Flashcard.
                        Same MCQ set, three different study experiences. */}
                    {mcqs.length > 0 && (() => {
                      const mode = lucentMcqMode[pageKey] || 'reveal';
                      return (
                        <div className="bg-white border border-purple-100 rounded-2xl p-1.5 grid grid-cols-3 gap-1 shadow-sm">
                          <button
                            onClick={() => setLucentMcqMode(prev => ({ ...prev, [pageKey]: 'reveal' }))}
                            className={`text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all ${
                              mode === 'reveal'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            💬 Q&amp;A
                          </button>
                          <button
                            onClick={() => setLucentMcqMode(prev => ({ ...prev, [pageKey]: 'interactive' }))}
                            className={`text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all ${
                              mode === 'interactive'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-transparent text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            📝 MCQ
                          </button>
                          <button
                            onClick={() => {
                              setFlashcardMcqs({
                                items: mcqs as any,
                                title: entry.lessonTitle || 'Lucent MCQs',
                                subtitle: `Page ${currentPage?.pageNo || ''} · Flashcards`,
                                subject: entry.subject || 'Lucent',
                              });
                            }}
                            className="text-[11px] font-black uppercase tracking-wider py-2 rounded-xl transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95"
                          >
                            🃏 Flashcard
                          </button>
                        </div>
                      );
                    })()}

                    {/* Empty / loading / generate state — only when no admin MCQs are present */}
                    {!usingAdminMcqs && mcqs.length === 0 && (
                      <div className="bg-white border border-purple-100 rounded-2xl p-6 text-center">
                        {lucentMcqLoading ? (
                          <>
                            <div className="w-12 h-12 mx-auto rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mb-3" />
                            <p className="font-black text-sm text-slate-700">MCQ ban rahe hain...</p>
                            <p className="text-[11px] text-slate-500 mt-1">AI is page ke points se questions bana raha hai</p>
                          </>
                        ) : (
                          <>
                            <BrainCircuit size={42} className="text-purple-300 mx-auto mb-3" />
                            <p className="font-black text-sm text-slate-700">Generate MCQs</p>
                            <p className="text-[11px] text-slate-500 mt-1 mb-4">Is page ke important points se 8 MCQs banenge</p>
                            <button
                              onClick={generateMcqs}
                              disabled={!pageText || pageText.length < 30}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs active:scale-95 transition shadow-md disabled:opacity-40"
                            >
                              <Sparkles size={13} /> Generate MCQs
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Q&A: "Show All Answers" lifted to TOP of the MCQ list
                        so users don't have to scroll down to find it. */}
                    {mcqs.length > 0 && (lucentMcqMode[pageKey] || 'reveal') === 'reveal' && revealedCount < mcqs.length && (
                      <button
                        onClick={() => setLucentMcqRevealed(prev => ({ ...prev, [pageKey]: mcqs.length }))}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs active:scale-95 transition shadow-md flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} /> Show All Answers
                      </button>
                    )}

                    {/* MCQ cards (Speedy-style inline) — supports both 'reveal' and 'interactive' modes */}
                    {(() => {
                      const mode = lucentMcqMode[pageKey] || 'reveal';
                      return mcqs.map((q, qi) => {
                        const isRevealed = qi < revealedCount;
                        const ansKey = `${pageKey}_${qi}`;
                        const selected = lucentMcqAnswers[ansKey];
                        const interactiveAnswered = mode === 'interactive' && selected !== undefined;
                        const showAnswerColors = mode === 'interactive' ? interactiveAnswered : isRevealed;
                        const showExplanations = mode === 'interactive' ? interactiveAnswered : isRevealed;

                        return (
                          <div key={(q as any).id || qi} className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">Q {qi + 1}</span>
                              {q.topic && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate">{q.topic}</span>}
                              {q.difficulty && (
                                <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  q.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-700' :
                                  q.difficulty === 'HARD' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>📊 {q.difficulty}</span>
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <p className="text-sm font-black text-slate-800 leading-snug flex-1">{q.question}</p>
                              <McqSpeakButtons
                                question={q.question}
                                options={q.options || []}
                                correctAnswer={q.correctAnswer}
                                className="shrink-0"
                                allQuestions={mcqs as any}
                                index={qi}
                              />
                            </div>
                            <div className="space-y-1.5 mb-3">
                              {(q.options || []).map((opt: string, oi: number) => {
                                const isCorrect = oi === q.correctAnswer;
                                const isSelected = mode === 'interactive' && selected === oi;
                                let cls = 'px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-start gap-2';
                                if (showAnswerColors) {
                                  if (isCorrect) cls += ' bg-emerald-50 border-emerald-300 text-emerald-800';
                                  else if (isSelected) cls += ' bg-rose-50 border-rose-300 text-rose-800';
                                  else cls += ' bg-slate-50 border-slate-200 text-slate-500 opacity-70';
                                } else {
                                  cls += mode === 'interactive'
                                    ? ' bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                                    : ' bg-slate-50 border-slate-200 text-slate-700';
                                }
                                const onClick = () => {
                                  if (mode !== 'interactive') return;
                                  if (selected !== undefined) return;
                                  setLucentMcqAnswers(prev => ({ ...prev, [ansKey]: oi }));
                                };
                                return (
                                  <button
                                    type="button"
                                    key={oi}
                                    onClick={onClick}
                                    disabled={mode !== 'interactive' || selected !== undefined}
                                    className={`${cls} w-full text-left`}
                                  >
                                    <span className="font-black mr-1">{String.fromCharCode(65 + oi)}.</span>
                                    <span className="flex-1">{opt}</span>
                                    {showAnswerColors && isCorrect && <span>✅</span>}
                                    {showAnswerColors && isSelected && !isCorrect && <span>❌</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Reveal mode trigger */}
                            {mode === 'reveal' && !isRevealed && (
                              <button
                                onClick={() => setLucentMcqRevealed(prev => ({ ...prev, [pageKey]: Math.max(prev[pageKey] || 0, qi + 1) }))}
                                className="w-full py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-black text-xs active:scale-95 transition"
                              >
                                Show Answer & Explanation
                              </button>
                            )}
                            {/* Interactive mode hint when not yet answered */}
                            {mode === 'interactive' && selected === undefined && (
                              <p className="text-[10px] font-bold text-slate-400 text-center py-1">Pick an option</p>
                            )}
                            {/* Reset for interactive */}
                            {mode === 'interactive' && selected !== undefined && (
                              <button
                                onClick={() => setLucentMcqAnswers(prev => { const n = { ...prev }; delete n[ansKey]; return n; })}
                                className="w-full mt-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] active:scale-95 transition"
                              >
                                🔄 Try again
                              </button>
                            )}
                            {showExplanations && (
                              <div className="space-y-1.5 text-[11px] leading-relaxed mt-2">
                                {q.concept && <p className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-slate-700"><span className="font-black text-blue-700">💡 Concept:</span> {q.concept}</p>}
                                {q.explanation && <p className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-slate-700"><span className="font-black text-slate-700">🔎 Explanation:</span> {q.explanation}</p>}
                                {q.examTip && <p className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-slate-700"><span className="font-black text-amber-700">🎯 Exam Tip:</span> {q.examTip}</p>}
                                {q.commonMistake && <p className="bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5 text-slate-700"><span className="font-black text-rose-700">⚠ Common Mistake:</span> {q.commonMistake}</p>}
                                {q.mnemonic && <p className="bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 text-slate-700"><span className="font-black text-purple-700">🧠 Memory Trick:</span> {q.mnemonic}</p>}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}

                  </div>
                </div>
              );
            })()}
            {/* Fixed bottom nav — at first/last page, Prev/Next jump to
                previous / next Lucent lesson automatically. */}
            <div className={`shrink-0 border-t border-slate-100 bg-white px-4 py-3 flex items-center gap-3 ${isLandscapeUiHidden ? 'hidden' : ''}`}>
              <button onClick={() => { stopSpeech(); goPrev(); }} disabled={!canGoPrev}
                title={safeIndex <= 0 && prevLesson ? `Previous lesson: ${prevLesson.lessonTitle}` : 'Previous page'}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} className="rotate-180" />
                {safeIndex <= 0 && prevLesson ? 'Prev Lesson' : 'Prev'}
              </button>
              <select value={safeIndex} onChange={e => { stopSpeech(); setLucentPageIndex(parseInt(e.target.value, 10)); }}
                className="px-3 py-3 border-2 border-slate-200 rounded-2xl text-sm font-bold bg-white outline-none focus:border-indigo-400">
                {entry.pages.map((p, idx) => (
                  <option key={p.id} value={idx}>Pg {p.pageNo}</option>
                ))}
              </select>
              <button onClick={() => { stopSpeech(); goNext(); }} disabled={!canGoNext}
                title={safeIndex >= totalPages - 1 && nextLesson ? `Next lesson: ${nextLesson.lessonTitle}` : 'Next page'}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {safeIndex >= totalPages - 1 && nextLesson ? 'Next Lesson' : 'Next'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      })()}


      {/* HOMEWORK MCQ FULL-SCREEN PLAYER */}
      {homeworkPlayerHwId && activePlayerHw && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col h-[100dvh] w-screen animate-in fade-in slide-in-from-bottom-4">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
            <button
              onClick={closeHomeworkPlayer}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition"
              title="Close"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate">
                {new Date(activePlayerHw.date).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h2 className="text-base sm:text-lg font-black text-slate-800 truncate">{activePlayerHw.title}</h2>
            </div>
            {/* Save Offline (HTML) — saves the full MCQ set + notes for this homework */}
            <button
              onClick={async () => {
                try {
                  const safeTitle = (activePlayerHw.title || 'Homework_MCQ').replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 60);
                  await downloadAsMHTML('hw-note-printable', `${safeTitle}_${new Date().toISOString().slice(0,10)}`, {
                    appName: settings?.appShortName || settings?.appName || 'IIC',
                    pageTitle: activePlayerHw.title || 'Homework MCQ',
                    subtitle: 'Homework MCQs',
                  });
                  showAlert('📥 Saved offline!', 'SUCCESS');
                } catch (e) {
                  showAlert('Download failed. Please try again.', 'ERROR');
                }
              }}
              className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full active:scale-95 transition"
              aria-label="Save MCQs offline"
              title="Save offline (HTML)"
            >
              <Download size={16} />
            </button>
            <button
              onClick={togglePlayerReadAll}
              disabled={playerChunks.length === 0}
              className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-transform ${
                playerIsReadingAll
                  ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                  : playerChunks.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              }`}
            >
              {playerIsReadingAll ? <><Square size={14} /> Stop</> : <><Volume2 size={14} /> Read All</>}
            </button>
          </div>

          {/* Progress + 3-Mode Selector — same pattern as Practice MCQ Hub /
              Lucent MCQ / Homework MCQ list (📝 MCQ · 💬 Q&A · 🃏 Flashcard).
              MCQ mode = answers shown; Q&A mode = per-question tap-to-reveal;
              Flashcard mode = launches FlashcardMcqView overlay. */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] font-bold text-slate-600 shrink-0">
              {playerChunks.length > 0 ? (
                <>
                  <span className="text-indigo-600">{Math.min(playerCurrentIndex + 1, playerChunks.length)}</span>
                  <span className="text-slate-400"> / {playerChunks.length}</span>
                  <span className="text-slate-400 ml-2">
                    {(activePlayerHw.parsedMcqs?.length || 0)} MCQs
                  </span>
                </>
              ) : (
                <span className="text-slate-400">No content</span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => { setPlayerMode('mcq'); setPlayerRevealAll(true); }}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                  playerMode === 'mcq'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
              >
                📝 MCQ
              </button>
              <button
                onClick={() => { setPlayerMode('qa'); setPlayerRevealAll(false); setPlayerQaRevealed({}); }}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                  playerMode === 'qa'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
              >
                💬 Q&amp;A
              </button>
              <button
                onClick={() => {
                  if (!activePlayerHw.parsedMcqs || activePlayerHw.parsedMcqs.length === 0) {
                    showAlert('No MCQs in this homework yet.', 'WARNING');
                    return;
                  }
                  setFlashcardMcqs({
                    items: (activePlayerHw.parsedMcqs || []).map(m => ({
                      question: m.question,
                      options: m.options,
                      correctAnswer: m.correctAnswer,
                      explanation: (m as any).explanation || '',
                    })),
                    title: activePlayerHw.title || 'Homework MCQs',
                    subtitle: `Flashcard Mode · ${activePlayerHw.parsedMcqs?.length || 0} cards`,
                    subject: activePlayerHw.targetSubject || 'mcq',
                  });
                }}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95"
              >
                🃏 Flashcard
              </button>
            </div>
            {/* Q&A mode quick toggle: Reveal All / Hide All */}
            {playerMode === 'qa' && playerChunks.some(c => c.kind === 'mcq') && (() => {
              const mcqIndices = playerChunks
                .map((c, i) => c.kind === 'mcq' ? i : -1)
                .filter(i => i >= 0);
              const allRevealed = mcqIndices.length > 0 && mcqIndices.every(i => playerQaRevealed[i]);
              return (
                <button
                  onClick={() => {
                    if (allRevealed) {
                      setPlayerQaRevealed({});
                    } else {
                      const all: Record<number, boolean> = {};
                      mcqIndices.forEach(i => { all[i] = true; });
                      setPlayerQaRevealed(all);
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95 transition-all"
                >
                  {allRevealed ? 'Hide All' : 'Reveal All'}
                </button>
              );
            })()}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 pb-32 overscroll-contain">
            <div className="max-w-3xl mx-auto space-y-5">
              {playerChunks.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-slate-500">Nothing in this homework yet</p>
                </div>
              )}
              {/* Q&A mode: "Show All Answers" lifted to top — same as Lucent.
                  Hidden once every MCQ has already been revealed. */}
              {playerMode === 'qa' && (() => {
                const mcqIdx = playerChunks
                  .map((c, i) => c.kind === 'mcq' ? i : -1)
                  .filter(i => i >= 0);
                if (mcqIdx.length === 0) return null;
                const allRevealed = mcqIdx.every(i => playerQaRevealed[i]);
                if (allRevealed) return null;
                return (
                  <button
                    onClick={() => {
                      const all: Record<number, boolean> = {};
                      mcqIdx.forEach(i => { all[i] = true; });
                      setPlayerQaRevealed(all);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs active:scale-95 transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} /> Show All Answers
                  </button>
                );
              })()}
              {playerChunks.map((chunk, idx) => {
                const isActive = idx === playerCurrentIndex && playerIsReadingAll;

                if (chunk.kind === 'notes-line') {
                  return (
                    <React.Fragment key={`pchunk-${idx}`}>
                      <div
                        ref={(el) => { playerScrollRefs.current[idx] = el; }}
                        className={`group relative rounded-xl transition-all ${
                          chunk.isHeading
                            ? 'mt-3 mb-1 px-3 py-2 bg-gradient-to-r from-indigo-50 to-transparent border-l-4 border-indigo-500'
                            : `pl-4 pr-12 py-2.5 ${
                                isActive
                                  ? 'bg-yellow-50 ring-2 ring-yellow-300 shadow-sm'
                                  : 'bg-white hover:bg-slate-50 border border-slate-100'
                              }`
                        }`}
                      >
                        {chunk.isHeading ? (
                          <p className="text-sm sm:text-base font-black text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                            <BookOpen size={14} className="opacity-60" />
                            {chunk.text}
                          </p>
                        ) : (
                          <p className={`text-sm sm:text-[15px] leading-relaxed ${
                            isActive ? 'text-yellow-900 font-semibold' : 'text-slate-800'
                          }`}>
                            <span className="text-indigo-400 font-bold mr-1.5">•</span>
                            {chunk.text}
                          </p>
                        )}
                        {!chunk.isHeading && (
                          <button
                            onClick={() => {
                              if (isActive) {
                                playerIsReadingAllRef.current = false;
                                setPlayerIsReadingAll(false);
                                stopSpeech();
                              } else {
                                stopSpeech();
                                setPlayerCurrentIndex(idx);
                                playerIsReadingAllRef.current = true;
                                setPlayerIsReadingAll(true);
                                setTimeout(() => playPlayerFromIndex(idx), 80);
                              }
                            }}
                            aria-label={isActive ? 'Stop' : 'Read this line'}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                              isActive
                                ? 'opacity-100 bg-red-100 text-red-600 animate-pulse'
                                : 'opacity-0 group-hover:opacity-100 bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                            }`}
                          >
                            {isActive ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                }

                // MCQ chunk — Lucent / Speedy / Sar Sangrah-style rendering:
                //   • mcq mode (interactive): student taps an option → correct/wrong shown,
                //     explanation revealed. Until tapped, answer hidden.
                //   • qa mode (reveal): student taps the card to reveal correct answer +
                //     explanation, OR uses "Show All Answers" at top.
                const isInteractive = playerMode === 'mcq';
                const userPicked = playerMcqAnswers[idx];
                const userAnswered = isInteractive && userPicked !== undefined;
                const showAnswer = isInteractive
                  ? userAnswered
                  : !!playerQaRevealed[idx];
                return (
                  <div
                    key={`pchunk-${idx}`}
                    ref={(el) => { playerScrollRefs.current[idx] = el; }}
                    className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-sm transition-all ${
                      isActive ? 'border-indigo-500 ring-4 ring-indigo-100 scale-[1.01]' : 'border-slate-200'
                    }`}
                  >
                    {(
                      <>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-md">
                              Q{chunk.index + 1}
                            </span>
                            {chunk.mcq?.topic && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{chunk.mcq.topic}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (speakingId === `player_mcq_${idx}`) { stopSpeech(); setSpeakingId(null); }
                                else {
                                  speakText(chunk.text, undefined, 1.0, 'hi-IN',
                                    () => setSpeakingId(`player_mcq_${idx}`),
                                    () => setSpeakingId(null));
                                }
                              }}
                              className={`shrink-0 p-2 rounded-full transition ${speakingId === `player_mcq_${idx}` ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                              title="Read this question"
                            >
                              {speakingId === `player_mcq_${idx}` ? <Square size={14} /> : <Volume2 size={14} />}
                            </button>
                            <button
                              onClick={() => { setShowCompMcqHub(true); setCompMcqTab('CREATE'); setCompMcqDraft({ question: chunk.mcq?.question || '', options: chunk.mcq?.options?.length === 4 ? [...chunk.mcq.options] : ['', '', '', ''], correctAnswer: chunk.mcq?.correctAnswer ?? 0 }); }}
                              className="shrink-0 p-2 rounded-full transition bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="Save this question to your MCQ bank"
                            >
                              <PlusCircle size={14} />
                            </button>
                            <button
                              onClick={() => {
                                const mcq = chunk.mcq;
                                if (!mcq?.question || !mcq?.options?.length) return;
                                const opts = mcq.options.length === 4
                                  ? mcq.options as [string,string,string,string]
                                  : ([...mcq.options, '', '', '', ''].slice(0, 4) as [string,string,string,string]);
                                setMcqCommunityDraft({ question: mcq.question, options: opts, correctAnswer: mcq.correctAnswer ?? 0, explanation: mcq.explanation || '' });
                                setShowMcqCommunityPopup(true);
                              }}
                              className="shrink-0 p-2 rounded-full transition bg-violet-50 text-violet-700 hover:bg-violet-100"
                              title="Community MCQ tab mein share karo"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-slate-800 mb-3 leading-snug">
                          {chunk.mcq?.question}
                        </p>
                        <div className="space-y-2 mb-4">
                          {(chunk.mcq?.options || []).map((opt: string, oi: number) => {
                            const isCorrect = chunk.mcq?.correctAnswer === oi;
                            const isPicked = isInteractive && userPicked === oi;
                            // Lucent-style colour rules:
                            //   showAnswer + isCorrect      → green
                            //   showAnswer + isPicked wrong → red
                            //   showAnswer + neither        → faded slate
                            //   !showAnswer + interactive   → tappable hover state
                            //   !showAnswer + qa            → plain
                            let cls = 'w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all';
                            if (showAnswer) {
                              if (isCorrect) cls += ' bg-green-50 border-green-300 text-green-900 font-bold';
                              else if (isPicked) cls += ' bg-red-50 border-red-300 text-red-800';
                              else cls += ' bg-slate-50 border-slate-200 text-slate-500 opacity-70';
                            } else if (isInteractive) {
                              cls += ' bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer active:scale-[0.99]';
                            } else {
                              cls += ' bg-slate-50 border-slate-200 text-slate-700';
                            }
                            const handleClick = () => {
                              if (!isInteractive) return;
                              if (userAnswered) return;
                              setPlayerMcqAnswers(prev => ({ ...prev, [idx]: oi }));
                            };
                            return (
                              <button
                                key={oi}
                                type="button"
                                onClick={handleClick}
                                disabled={!isInteractive || userAnswered}
                                className={cls}
                              >
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                  showAnswer && isCorrect
                                    ? 'bg-green-600 text-white'
                                    : showAnswer && isPicked
                                      ? 'bg-red-600 text-white'
                                      : 'bg-white border border-slate-300 text-slate-500'
                                }`}>
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {showAnswer && isCorrect && (
                                  <CheckSquare size={16} className="text-green-600 shrink-0 mt-0.5" />
                                )}
                                {showAnswer && isPicked && !isCorrect && (
                                  <span className="shrink-0 text-red-600 text-base leading-none mt-0.5">✗</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {/* MCQ (interactive) mode: helper hint before the student taps */}
                        {isInteractive && !userAnswered && (
                          <p className="text-[11px] font-bold text-indigo-600/80 mb-2 flex items-center gap-1">
                            👆 Pick an answer
                          </p>
                        )}
                        {/* MCQ (interactive) mode: small "Reset" pill after answering */}
                        {isInteractive && userAnswered && (
                          <button
                            onClick={() => setPlayerMcqAnswers(prev => { const n = { ...prev }; delete n[idx]; return n; })}
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 mb-2"
                          >
                            🔄 Reset
                          </button>
                        )}
                        {/* Q&A mode: per-card "Tap to Reveal" button when answer hidden */}
                        {playerMode === 'qa' && !showAnswer && (
                          <button
                            onClick={() => setPlayerQaRevealed(prev => ({ ...prev, [idx]: true }))}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-50 border-2 border-dashed border-purple-300 text-purple-700 font-black text-sm uppercase tracking-wider hover:bg-purple-100 active:scale-[0.98] transition-all"
                          >
                            👁️ Tap to Reveal Answer
                          </button>
                        )}
                        {/* Q&A mode: small "Hide" pill once revealed, so user can re-quiz themselves */}
                        {playerMode === 'qa' && showAnswer && (
                          <button
                            onClick={() => setPlayerQaRevealed(prev => { const n = { ...prev }; delete n[idx]; return n; })}
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 mb-2"
                          >
                            🙈 Hide Answer
                          </button>
                        )}
                        {showAnswer && (
                          <div className="space-y-2">
                            {chunk.mcq?.explanation && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-yellow-700 mb-1">Explanation</p>
                                <p className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.explanation}</p>
                              </div>
                            )}
                            {chunk.mcq?.concept && (
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1">Concept</p>
                                <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.concept}</p>
                              </div>
                            )}
                            {chunk.mcq?.examTip && (
                              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">Exam Tip</p>
                                <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.examTip}</p>
                              </div>
                            )}
                            {chunk.mcq?.commonMistake && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-red-700 mb-1">Common Mistake</p>
                                <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.commonMistake}</p>
                              </div>
                            )}
                            {chunk.mcq?.mnemonic && (
                              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-pink-700 mb-1">Memory Trick</p>
                                <p className="text-sm text-pink-900 leading-relaxed whitespace-pre-wrap">{chunk.mcq.mnemonic}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {/* Score Summary — only in 'mcq' (interactive) mode, only after
                  at least one MCQ has been attempted. Mirrors the Lucent /
                  Homework MCQ list summary card so the experience is identical. */}
              {playerMode === 'mcq' && (() => {
                const mcqChunks = playerChunks
                  .map((c, i) => c.kind === 'mcq' ? { chunk: c, idx: i } : null)
                  .filter((x): x is { chunk: typeof playerChunks[number]; idx: number } => x !== null);
                const total = mcqChunks.length;
                if (total === 0) return null;
                let attempted = 0, correct = 0;
                mcqChunks.forEach(({ chunk, idx }) => {
                  const sel = playerMcqAnswers[idx];
                  if (sel !== undefined) {
                    attempted++;
                    if (sel === (chunk as any).mcq?.correctAnswer) correct++;
                  }
                });
                if (attempted === 0) return null;
                const wrong = attempted - correct;
                const pct = Math.round((correct / total) * 100);
                const allDone = attempted === total;
                const grade = pct >= 80 ? { label: 'Excellent! 🌟', color: 'from-emerald-500 to-green-500', ring: 'ring-emerald-200' }
                            : pct >= 60 ? { label: 'Good 👍',       color: 'from-blue-500 to-indigo-500',    ring: 'ring-blue-200' }
                            : pct >= 40 ? { label: 'Keep practising 💪', color: 'from-amber-500 to-orange-500', ring: 'ring-amber-200' }
                            :              { label: 'Need more practice 📚', color: 'from-rose-500 to-red-500', ring: 'ring-rose-200' };
                return (
                  <div className={`mt-2 bg-white rounded-3xl border-2 ring-4 ${grade.ring} border-slate-200 shadow-lg overflow-hidden`}>
                    <div className={`bg-gradient-to-r ${grade.color} px-5 py-3 text-white`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-90">📊 Score Summary</p>
                        {allDone && <span className="text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full">Complete</span>}
                      </div>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-4xl font-black leading-none">{pct}%</span>
                        <span className="text-sm font-bold opacity-90 mb-1">({correct}/{total})</span>
                      </div>
                      <p className="text-xs font-bold opacity-90 mt-1">{grade.label}</p>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100">
                      <div className="px-3 py-3 text-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Attempted</p>
                        <p className="text-lg font-black text-slate-800 mt-0.5">{attempted}<span className="text-xs text-slate-400">/{total}</span></p>
                      </div>
                      <div className="px-3 py-3 text-center">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">✓ Sahi</p>
                        <p className="text-lg font-black text-emerald-700 mt-0.5">{correct}</p>
                      </div>
                      <div className="px-3 py-3 text-center">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-wider">✗ Galat</p>
                        <p className="text-lg font-black text-rose-700 mt-0.5">{wrong}</p>
                      </div>
                    </div>
                    {!allDone && (
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-500 text-center">{total - attempted} question{total - attempted === 1 ? '' : 's'} left — try them all!</p>
                      </div>
                    )}
                    {allDone && (
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                        <button
                          onClick={() => setPlayerMcqAnswers({})}
                          className="w-full text-[12px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl active:scale-95 transition-all"
                        >
                          🔄 Phir se Try Karo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bottom Prev / Next homework navigation — keeps the user moving
              through Sar Sangrah / Speedy / etc. without going Back to the
              week list every time. */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
            <button
              disabled={!playerPrevHw}
              onClick={() => playerPrevHw && goToPlayerHw(playerPrevHw)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                playerPrevHw
                  ? 'border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ChevronRight size={16} className="rotate-180" /> Prev Note
            </button>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1 text-center leading-tight">
              {playerSiblingIdx >= 0 ? `${playerSiblingIdx + 1}/${playerSiblingHws.length}` : ''}
            </div>
            <button
              disabled={!playerNextHw}
              onClick={() => playerNextHw && goToPlayerHw(playerNextHw)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                playerNextHw
                  ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Next Note <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ===================== NOTIFICATION TOAST ===================== */}

      {/* Engagement reward → full premium popup */}
      {notifToast && notifToast.type === 'reward' && (
        <EngagementRewardPopup
          notification={notifToast}
          isClaimed={claimedNotifIds.includes(notifToast.id)}
          onClaim={() => {
            const ids = [...claimedNotifIds, notifToast.id];
            setClaimedNotifIds(ids);
            try { localStorage.setItem('nst_claimed_notifs_v1', JSON.stringify(ids)); } catch {}
            setNotifToast(null);
          }}
          onDismiss={() => setNotifToast(null)}
        />
      )}

      {/* Regular info notification → small toast */}
      {notifToast && notifToast.type !== 'reward' && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] w-[92vw] max-w-sm pointer-events-auto"
          role="alert"
          aria-live="polite"
        >
          <div className="rounded-2xl shadow-2xl border p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300 bg-indigo-50 border-indigo-200 text-indigo-900">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-200 text-indigo-700">
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm leading-snug">{notifToast.title}</p>
              <p className="text-xs mt-0.5 opacity-80 leading-snug line-clamp-2">{notifToast.body}</p>
            </div>
            <button
              onClick={() => setNotifToast(null)}
              className="p-1 rounded-full hover:bg-black/10 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ===================== NOTIFICATION PAGE ===================== */}
      {showNotifPage && (
        <div className="fixed inset-0 z-[9000] bg-white flex flex-col animate-in slide-in-from-right-full duration-300">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
            <button onClick={() => setShowNotifPage(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-base text-slate-800">Notifications</h2>
              <p className="text-[11px] text-slate-500">{allNotifications.length} message{allNotifications.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {allNotifications.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Bell size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm">No notifications yet</p>
              </div>
            )}
            {allNotifications.map(n => {
              const isClaimed = claimedNotifIds.includes(n.id);
              return (
                <div key={n.id} className={`rounded-2xl border p-4 flex items-start gap-3 ${
                  n.type === 'reward'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-indigo-50 border-indigo-200'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'reward' ? 'bg-amber-200 text-amber-700' : 'bg-indigo-200 text-indigo-700'
                  }`}>
                    {n.type === 'reward' ? <Gift size={20} /> : <Bell size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
                    {n.type === 'reward' && n.rewardCredits && (
                      <div className="mt-2">
                        {isClaimed ? (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                            ✓ Claimed {n.rewardCredits} CR
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              const ids = [...claimedNotifIds, n.id];
                              setClaimedNotifIds(ids);
                              try { localStorage.setItem('nst_claimed_notifs_v1', JSON.stringify(ids)); } catch {}
                            }}
                            className="text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-full active:scale-95 transition-transform"
                          >
                            Claim {notifToast?.rewardCredits || n.rewardCredits} CR
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 mt-1.5 font-semibold">
                      {(() => { try { return new Date(n.createdAt).toLocaleString('default', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== FLASHCARD MCQ OVERLAY (shared by Lucent + Homework) ===================== */}
      {flashcardMcqs && (
        <FlashcardMcqView
          questions={flashcardMcqs.items}
          title={flashcardMcqs.title}
          subtitle={flashcardMcqs.subtitle}
          subject={flashcardMcqs.subject}
          onBack={() => setFlashcardMcqs(null)}
        />
      )}

      {/* ===================== STARRED NOTES PAGE (My Saved + Global tabs) ===================== */}
      {showStarredPage && (() => {
        const filtered = [...starredNotes].reverse().filter(n =>
          n.topicText?.toLowerCase().includes(profileStarSearch.toLowerCase())
        );
        // Build the global list. Includes EVERY note that has at least one save
        // (not just the top counts). Sorted by save count desc.
        const globalList = Object.values(globalNoteStars)
          .filter(e => e.count > 0 && e.label)
          .filter(e => !profileStarSearch || e.label.toLowerCase().includes(profileStarSearch.toLowerCase()))
          .map(e => ({ ...e, displayCount: applyStarBoost(e.count, e.hash) }))
          .sort((a, b) => b.displayCount - a.displayCount);
        const globalTopCount = globalList[0]?.displayCount || 0;
        return (
        // z-[200] (not z-[9000]) so the dashboard's fixed bottom navigation
        // (z-[300]) stays visible AND tappable while the Important Notes
        // page is open. The inner scroller below uses pb-24 so list items
        // don't get hidden behind the bottom nav bar.
        // bg-white (solid) — earlier `from-amber-50/40` was 40% transparent,
        // letting the Home page's streak ("6/8") bleed through. Solid bg
        // ensures the user sees only ONE page at a time.
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-right-full duration-300">
          {/* === PREMIUM HEADER (study-app gradient) === */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 sticky top-0 z-10 shadow-lg shadow-indigo-200/50">
            {/* Decorative pattern overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)`,
              backgroundSize: '40px 40px, 60px 60px',
            }} />
            <div className="relative flex items-center gap-3 px-4 pt-3 pb-3">
              <button
                onClick={() => { stopProfileStarRead(); setShowStarredPage(false); }}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-lg text-white tracking-tight">Important Notes</h2>
                  <span className="text-[8px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm">⭐ Premium</span>
                </div>
                <p className="text-[11px] text-indigo-50/90 font-semibold mt-0.5">
                  {starredPageTab === 'mine'
                    ? (starredNotes.length === 0
                        ? 'Notes save karein, yahan dikhenge'
                        : `${profileStarSearch ? `${filtered.length}/${starredNotes.length}` : starredNotes.length} saved · Tap to read`)
                    : `${globalList.length} popular notes · Live community picks`}
                </p>
              </div>
              {/* Icon-only button group — same visual footprint on both tabs
                  so the header stays the same height whether on Mine or Global. */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    stopProfileStarRead();
                    setStarredPageTab(starredPageTab === 'mine' ? 'global' : 'mine');
                  }}
                  className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 active:scale-95 transition-all"
                  title={starredPageTab === 'mine' ? 'Trending notes dekhein' : 'Apne saved notes par wapis jaayein'}
                >
                  {starredPageTab === 'mine'
                    ? <TrendingUp size={15} />
                    : <Star size={15} className="fill-white text-white" />
                  }
                </button>
                {starredPageTab === 'mine' && starredNotes.length > 0 && (
                  <button
                    onClick={() => {
                      const ok = window.confirm(
                        `${starredNotes.length} saved notes ko permanently delete karein?\n\nYe undo nahi ho sakta. Cancel karne ke liye No dabayein.`
                      );
                      if (!ok) return;
                      stopProfileStarRead();
                      setStarredNotes([]);
                      try { localStorage.removeItem('nst_starred_notes_v1'); } catch {}
                      showAlert(`Sab ${starredNotes.length} saved notes delete ho gayi.`, 'SUCCESS');
                    }}
                    className="p-1.5 rounded-xl bg-red-500/70 hover:bg-red-600 text-white backdrop-blur-sm border border-white/20 active:scale-95 transition-all"
                    title="Sab saved notes clear karein"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* === SECONDARY VIEW TOGGLE: List View vs Book-wise Grouping === */}
          <div className="px-4 pt-3 pb-2 bg-transparent">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setImportantNotesView('list')}
                className={`py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${
                  importantNotesView === 'list'
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-300'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List size={11} /> List View
              </button>
              <button
                onClick={() => setImportantNotesView('bybook')}
                className={`py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${
                  importantNotesView === 'bybook'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
                    : 'text-slate-500 hover:text-indigo-700'
                }`}
              >
                <BookOpen size={11} /> By Book / Page
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
          {starredPageTab === 'mine' && (<>
            {/* Read All toolbar */}
            {filtered.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => isReadingProfileStars ? stopProfileStarRead() : startProfileStarRead(filtered)}
                  className={`ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
                    isReadingProfileStars
                      ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200'
                      : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  }`}
                >
                  {isReadingProfileStars
                    ? <><Square size={12} fill="currentColor" /> Stop</>
                    : <><Volume2 size={13} /> Read All</>
                  }
                </button>
              </div>
            )}

            {/* Reading progress bar */}
            {isReadingProfileStars && readingProfileStarIdx !== null && filtered.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <Volume2 size={13} className="text-amber-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-black text-amber-700">Reading...</span>
                    <span className="text-[10px] font-bold text-amber-600">{readingProfileStarIdx + 1}/{filtered.length}</span>
                  </div>
                  <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${((readingProfileStarIdx + 1) / filtered.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Search bar */}
            {starredNotes.length > 0 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                <input
                  type="text"
                  value={profileStarSearch}
                  onChange={e => { setProfileStarSearch(e.target.value); stopProfileStarRead(); }}
                  placeholder="Search notes..."
                  className="w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-xl text-slate-700 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all"
                />
                {profileStarSearch && (
                  <button
                    onClick={() => { setProfileStarSearch(''); stopProfileStarRead(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* === SAVE/REMOVE RULES — always visible when on "mine" tab === */}
            {starredPageTab === 'mine' && starredNotes.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Star size={16} className="fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider mb-1">Save / Remove Rules</p>
                    <ul className="text-[11px] text-slate-700 leading-relaxed space-y-0.5">
                      <li>• Ek note sirf <b>ek baar</b> save hoti hai (duplicate save nahi hota).</li>
                      <li>• Remove karne ke liye note ko <b>left-swipe</b> karein 👈, ya <b>Clear</b> button se sab ek saath delete karein.</li>
                      <li>• Lesson / Book me dobara ⭐ tap karne se note delete <b>NAHI</b> hogi — accidental loss safe.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {starredNotes.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-dashed border-amber-200">
                <div className="relative inline-block mb-3">
                  <div className="absolute inset-0 bg-amber-300/40 blur-2xl rounded-full" />
                  <Star size={48} className="relative text-amber-400 mx-auto" />
                </div>
                <p className="font-black text-slate-700 text-base">Abhi koi note saved nahi hai</p>
                <p className="text-xs text-slate-500 mt-1 px-6">Lesson padhte waqt ⭐ tap karein, woh yahan aa jayegi.</p>
                {/* Quick shortcut to Trending tab so empty state is actionable */}
                <button
                  onClick={() => { stopProfileStarRead(); setStarredPageTab('global'); }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-black shadow-md active:scale-95 hover:shadow-lg transition-all"
                >
                  <TrendingUp size={14} />
                  Dekho Trending Notes
                </button>
                <p className="text-[10px] text-amber-700 mt-4 font-semibold">💡 Saved notes ko remove karne ke liye left-swipe 👈</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 bg-amber-50 rounded-2xl border border-amber-100">
                <Search size={32} className="text-amber-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">No match found.</p>
                <p className="text-xs text-slate-400 mt-1">Try a different keyword.</p>
              </div>
            ) : importantNotesView === 'list' ? (
              (() => {
                const _mb = groupStarredByBook(filtered).filter(b => b.total > 0);
                const _mab = listViewBookFilter ? (_mb.find(b => b.lessonTitle === listViewBookFilter) ?? null) : null;
                const _mChips = _mb.length > 1 ? (
                  <div key="mine-chips" className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                    <button onClick={() => setListViewBookFilter(null)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${!listViewBookFilter ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400'}`}>All</button>
                    {_mb.map(b => (
                      <button key={b.lessonTitle} onClick={() => setListViewBookFilter(b.lessonTitle === listViewBookFilter ? null : b.lessonTitle)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black border transition-all whitespace-nowrap ${listViewBookFilter === b.lessonTitle ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400'}`}>
                        📖 {b.lessonTitle.length > 14 ? b.lessonTitle.slice(0,14)+'…' : b.lessonTitle} ({b.total})
                      </button>
                    ))}
                  </div>
                ) : null;
                if (_mab) {
                  return <>{_mChips}{_mab.pageList.map(pg => {
                    const _pgLbl = pg.pageNo != null ? `Page ${pg.pageNo}` : pg.pageIndex != null ? `Page ${pg.pageIndex + 1}` : 'Untagged';
                    return <div key={String(pg.pageNo ?? pg.pageIndex ?? 'n')} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 pt-1">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">📄 {_pgLbl}</span>
                        <span className="flex-1 h-px bg-indigo-100" />
                        <span className="text-[10px] font-bold text-amber-600">{pg.notes.length} ⭐</span>
                      </div>
                      {pg.notes.map(note => (
                        <button key={note.id} type="button" onClick={() => setOpenNotePrompt({ topicText: note.topicText, source: note.source })} className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 active:scale-[0.99] transition-all flex items-start gap-2 shadow-sm">
                          <Star size={12} className="fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                          <span className="font-semibold text-[12px] text-slate-700 leading-snug flex-1">{note.topicText}</span>
                          {note.source && <ChevronRight size={12} className="text-indigo-400 shrink-0 mt-1" />}
                        </button>
                      ))}
                    </div>;
                  })}</>;
                }
                const _mList = filtered.map((note, idx) => {
                const isCurrentlyReading = isReadingProfileStars && readingProfileStarIdx === idx;
                const socialCount = getNoteStarCount(note.topicText);
                const src = note.source;
                return (
                  <div
                    key={note.id}
                    className={`rounded-2xl p-4 shadow-sm flex items-start gap-3 transition-all duration-300 ${
                      isCurrentlyReading
                        ? 'bg-amber-50 border-2 border-amber-400 shadow-amber-100'
                        : 'bg-white border border-amber-200'
                    }`}
                  >
                    <button
                      onClick={() => { if (isCurrentlyReading) stopProfileStarRead(); else startProfileStarRead(filtered.slice(idx)); }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isCurrentlyReading
                          ? 'bg-amber-400 text-white animate-pulse'
                          : 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                      }`}
                    >
                      {isCurrentlyReading
                        ? <Square size={14} fill="currentColor" />
                        : <Volume2 size={14} />
                      }
                    </button>
                    {/* Tap text area → professional confirm popup → open full notes */}
                    <button
                      type="button"
                      onClick={() => setOpenNotePrompt({ topicText: note.topicText, source: note.source })}
                      className="flex-1 min-w-0 text-left active:opacity-70"
                    >
                      <p className={`font-bold text-sm leading-snug ${isCurrentlyReading ? 'text-amber-800' : 'text-slate-800'}`}>{note.topicText}</p>
                      {src?.lessonTitle && (
                        <p className="mt-1 text-[10px] font-black text-indigo-600 inline-flex items-center gap-1">
                          <BookOpen size={10} />
                          {src.lessonTitle}
                          {src.pageNo != null && <span className="text-indigo-400">· Page {src.pageNo}</span>}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <p className="text-[10px] text-amber-500 font-bold">
                          {note.savedAt ? new Date(note.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </p>
                        {socialCount > 1 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-amber-800 text-[10px] font-black"
                            title={`${socialCount} students ne is note ko Important mark kiya hai`}
                          >
                            <Star size={9} className="fill-amber-500 text-amber-500" />
                            {socialCount.toLocaleString('en-IN')} students saved
                          </span>
                        )}
                      </div>
                    </button>
                    {/* ── Action cluster: Download · Save Offline · Remove ──
                        Standardized button sizes (w-9 h-9) and arranged in a
                        single column for a clean, professional look. */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Build a self-contained printable wrapper that
                            // mirrors the in-app Important Notes card so the
                            // downloaded MHTML preserves theme/background/header.
                            const wrapper = document.createElement('div');
                            wrapper.id = 'imp-note-printable';
                            wrapper.innerHTML = `
                              <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;color:white;border-radius:18px 18px 0 0;font-family:Inter,system-ui,sans-serif;">
                                <div style="font-size:11px;font-weight:900;letter-spacing:.18em;opacity:.9;text-transform:uppercase;">${(settings?.appName || 'IIC')} · Important Notes</div>
                                <div style="font-size:22px;font-weight:900;margin-top:6px;">${note.topicText.replace(/</g,'&lt;')}</div>
                                ${src?.lessonTitle ? `<div style="font-size:12px;font-weight:700;opacity:.85;margin-top:4px;">${src.lessonTitle}${src.pageNo!=null?` · Page ${src.pageNo}`:''}</div>` : ''}
                              </div>
                              <div style="background:#fff;border:1px solid #fde68a;border-top:0;padding:24px;border-radius:0 0 18px 18px;font-family:Inter,system-ui,sans-serif;color:#0f172a;line-height:1.7;">
                                <div style="font-size:15px;font-weight:600;">${note.topicText.replace(/</g,'&lt;')}</div>
                                <div style="margin-top:14px;font-size:11px;color:#92400e;font-weight:800;">Saved on ${note.savedAt ? new Date(note.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                              </div>`;
                            wrapper.style.position = 'fixed';
                            wrapper.style.left = '-9999px';
                            document.body.appendChild(wrapper);
                            const safeTitle = note.topicText.slice(0,40).replace(/[^a-z0-9]+/gi,'_');
                            await downloadAsMHTML('imp-note-printable', `Important_${safeTitle}_${new Date().toISOString().slice(0,10)}`, {
                              appName: settings?.appShortName || settings?.appName || 'IIC',
                              pageTitle: `Important · ${note.topicText.slice(0, 60)}`,
                              subtitle: 'Important Notes',
                            });
                            setTimeout(() => { try { document.body.removeChild(wrapper); } catch {} }, 500);
                          } catch (err) { console.error(err); }
                        }}
                        className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all flex items-center justify-center"
                        title="Download (MHTML / Webpage)"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const html = `
                              <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:18px;color:white;border-radius:14px 14px 0 0;font-family:Inter,system-ui,sans-serif;">
                                <div style="font-size:10px;font-weight:900;letter-spacing:.18em;opacity:.9;text-transform:uppercase;">Important Notes</div>
                                <div style="font-size:18px;font-weight:900;margin-top:4px;">${note.topicText.replace(/</g,'&lt;')}</div>
                              </div>
                              <div style="background:#fffbeb;padding:16px;border:1px solid #fde68a;border-top:0;border-radius:0 0 14px 14px;color:#0f172a;line-height:1.6;font-size:14px;">${note.topicText.replace(/</g,'&lt;')}</div>`;
                            await saveOfflineItem({
                              id: `imp_${note.id}`,
                              type: 'NOTE',
                              title: note.topicText.slice(0, 80),
                              subtitle: src?.lessonTitle || 'Important Notes',
                              data: { html, topicText: note.topicText, source: src },
                            });
                            try { (window as any).__toast?.({ type: 'success', message: 'Saved offline ✓' }); } catch {}
                          } catch (err) { console.error(err); }
                        }}
                        className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center"
                        title="Save Offline"
                      >
                        <CloudOff size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setStarredNotes(prev => {
                            const updated = prev.filter(n => n.id !== note.id);
                            try { localStorage.setItem('nst_starred_notes_v1', JSON.stringify(updated)); } catch {}
                            return updated;
                          });
                        }}
                        className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              });
              return <>{_mChips}{_mList}</>;
              })()
            ) : (
              // === BY BOOK / PAGE drill-down view ===
              (() => {
                const grouped = groupStarredByBook(filtered);
                const activeBook = drillBookKey ? grouped.find(b => b.lessonTitle === drillBookKey) : null;
                const activePage = activeBook && drillPageKey
                  ? activeBook.pageList.find(p => `${p.pageNo ?? p.pageIndex ?? 'n'}` === drillPageKey)
                  : null;

                // LEVEL 0 — Book picker
                if (!activeBook) {
                  return (
                    <>
                      <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider px-1">
                        📚 Pick a book to see its top important notes
                      </div>
                      {grouped.map(book => (
                        <button
                          key={book.lessonTitle}
                          type="button"
                          onClick={() => { setDrillBookKey(book.lessonTitle); setDrillPageKey(null); }}
                          className="w-full text-left rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm hover:border-indigo-400 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3 px-4 py-3"
                        >
                          <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <BookOpen size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-indigo-900 leading-tight truncate">{book.lessonTitle}</p>
                            <p className="text-[10px] text-indigo-600 font-bold tracking-wide mt-0.5">
                              {book.subject ? `${book.subject} · ` : ''}{book.total} note{book.total !== 1 ? 's' : ''} · {book.pageList.length} page{book.pageList.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-indigo-400 shrink-0" />
                        </button>
                      ))}
                    </>
                  );
                }

                // LEVEL 1 — All pages expanded with notes (no extra tap needed)
                return (
                  <>
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[11px] font-black text-indigo-700 px-1">
                      <button
                        onClick={() => { setDrillBookKey(null); setDrillPageKey(null); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 active:scale-95 transition-all"
                      >
                        <ChevronLeft size={12} /> Books
                      </button>
                      <span className="text-indigo-300">/</span>
                      <span className="truncate max-w-[55%]">{activeBook.lessonTitle}</span>
                    </div>
                    {/* Book header */}
                    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-indigo-500 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-white leading-tight truncate">{activeBook.lessonTitle}</p>
                          <p className="text-[10px] text-indigo-200 font-bold tracking-wide mt-0.5">
                            {activeBook.subject ? `${activeBook.subject} · ` : ''}{activeBook.total} note{activeBook.total !== 1 ? 's' : ''} · {activeBook.pageList.length} page{activeBook.pageList.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {/* Pages expanded inline */}
                      <div className="divide-y divide-indigo-50">
                        {activeBook.pageList.map(pg => {
                          const pgLabel = pg.pageNo != null ? `Page ${pg.pageNo}` :
                            pg.pageIndex != null ? `Page ${pg.pageIndex + 1}` : 'Untagged';
                          return (
                            <div key={String(pg.pageNo ?? pg.pageIndex ?? 'nopage')}>
                              {/* Page number header row */}
                              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/70">
                                <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                  <span className="text-[9px] font-black">P</span>
                                </div>
                                <span className="font-black text-[11px] text-indigo-800 uppercase tracking-wider flex-1">{pgLabel}</span>
                                <span className="text-[10px] font-bold text-amber-600 shrink-0">{pg.notes.length} ⭐</span>
                              </div>
                              {/* Notes under this page */}
                              <div className="px-3 py-2 space-y-1.5">
                                {pg.notes.map(note => (
                                  <button
                                    key={note.id}
                                    type="button"
                                    onClick={() => setOpenNotePrompt({ topicText: note.topicText, source: note.source })}
                                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/60 active:scale-[0.99] transition-all flex items-start gap-2 shadow-sm"
                                  >
                                    <Star size={11} className="fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-[12px] text-slate-700 leading-snug flex-1">{note.topicText}</span>
                                    <ChevronRight size={11} className="text-indigo-300 shrink-0 mt-0.5" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </>)}

          {starredPageTab === 'global' && (<>
            {/* Search bar (shared placeholder) */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
              <input
                type="text"
                value={profileStarSearch}
                onChange={e => setProfileStarSearch(e.target.value)}
                placeholder="Search global notes..."
                className="w-full pl-8 pr-8 py-2.5 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-xl text-slate-700 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all"
              />
              {profileStarSearch && (
                <button
                  onClick={() => setProfileStarSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold text-slate-500 px-1 flex items-center gap-1.5 flex-1 min-w-0">
                <Users size={11} className="text-amber-500 shrink-0" />
                <span className="truncate">What every student is saving</span>
              </div>
              {/* Read All TTS — reads every visible global note. We map
                  each entry.label → { topicText } so the existing
                  startProfileStarRead helper can play them in order. */}
              {globalList.length > 0 && (
                <button
                  onClick={() => {
                    if (isReadingProfileStars) {
                      stopProfileStarRead();
                    } else {
                      startProfileStarRead(globalList.map(e => ({ topicText: e.label })));
                    }
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 ${
                    isReadingProfileStars
                      ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200'
                      : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  }`}
                >
                  {isReadingProfileStars
                    ? <><Square size={11} fill="currentColor" /> Stop</>
                    : <><Volume2 size={12} /> Read All</>
                  }
                </button>
              )}
            </div>

            {/* Reading progress bar — shows "Padh raha hai N / Total" */}
            {isReadingProfileStars && readingProfileStarIdx !== null && globalList.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <Volume2 size={13} className="text-amber-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-black text-amber-700">Reading...</span>
                    <span className="text-[10px] font-bold text-amber-600">{readingProfileStarIdx + 1}/{globalList.length}</span>
                  </div>
                  <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${((readingProfileStarIdx + 1) / globalList.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {globalList.length === 0 ? (
              <div className="text-center py-14 bg-amber-50 rounded-2xl border border-amber-100">
                <Users size={40} className="text-amber-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">No global notes yet.</p>
                <p className="text-xs text-slate-400 mt-1">Be the first to tap ⭐ and start the trend.</p>
              </div>
            ) : importantNotesView === 'bybook' ? (
              // === BY BOOK / PAGE — Global notes ===
              // Source priority for each global entry:
              //   1. entry.source — written into RTDB by the first user who
              //      starred this topic. Best signal because it works even
              //      when the current user has zero local notes of this kind.
              //   2. Local starred-note match (full equality on topicText).
              //   3. Local starred-note match using a normalised prefix (the
              //      RTDB label is truncated at 160 chars, so a long topic
              //      never matches a full topicText with `===`).
              //   4. Otherwise "Untagged".
              (() => {
                const norm = (s: string) =>
                  (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const localByText = new Map<string, StarredNote>();
                const localByPrefix = new Map<string, StarredNote>();
                for (const n of starredNotes) {
                  const k = norm(n.topicText || '');
                  if (!k) continue;
                  if (!localByText.has(k)) localByText.set(k, n);
                  const pre = k.slice(0, 140);
                  if (!localByPrefix.has(pre)) localByPrefix.set(pre, n);
                }
                const synthetic: StarredNote[] = globalList.map((entry) => {
                  const labelNorm = norm(entry.label);
                  const mine = localByText.get(labelNorm)
                    || localByPrefix.get(labelNorm.slice(0, 140));
                  const src = entry.source || mine?.source;
                  return {
                    id: `global_${entry.hash || entry.label}`,
                    topicText: entry.label,
                    savedAt: mine?.savedAt || 0,
                    source: src,
                  } as StarredNote;
                });
                const grouped = groupStarredByBook(synthetic);
                const activeBook = drillBookKey ? grouped.find(b => b.lessonTitle === drillBookKey) : null;
                const activePage = activeBook && drillPageKey
                  ? activeBook.pageList.find(p => `${p.pageNo ?? p.pageIndex ?? 'n'}` === drillPageKey)
                  : null;

                if (!activeBook) {
                  return (
                    <>
                      <div className="text-[10px] font-black text-indigo-500 uppercase tracking-wider px-1">
                        📚 Pick a book to see its global notes
                      </div>
                      {grouped.map(book => (
                        <button
                          key={book.lessonTitle}
                          type="button"
                          onClick={() => { setDrillBookKey(book.lessonTitle); setDrillPageKey(null); }}
                          className="w-full text-left rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm hover:border-indigo-400 hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-3 px-4 py-3"
                        >
                          <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <BookOpen size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-indigo-900 leading-tight truncate">{book.lessonTitle}</p>
                            <p className="text-[10px] text-indigo-600 font-bold tracking-wide mt-0.5">
                              {book.subject ? `${book.subject} · ` : ''}{book.total} note{book.total !== 1 ? 's' : ''} · {book.pageList.length} page{book.pageList.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-indigo-400 shrink-0" />
                        </button>
                      ))}
                    </>
                  );
                }

                // All pages expanded inline — no extra tap needed
                return (
                  <>
                    <div className="flex items-center gap-2 text-[11px] font-black text-indigo-700 px-1">
                      <button
                        onClick={() => { setDrillBookKey(null); setDrillPageKey(null); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 active:scale-95 transition-all"
                      >
                        <ChevronLeft size={12} /> Books
                      </button>
                      <span className="text-indigo-300">/</span>
                      <span className="truncate max-w-[55%]">{activeBook.lessonTitle}</span>
                    </div>
                    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-indigo-500 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-white leading-tight truncate">{activeBook.lessonTitle}</p>
                          <p className="text-[10px] text-indigo-200 font-bold tracking-wide mt-0.5">
                            {activeBook.subject ? `${activeBook.subject} · ` : ''}{activeBook.total} global note{activeBook.total !== 1 ? 's' : ''} · {activeBook.pageList.length} page{activeBook.pageList.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="divide-y divide-indigo-50">
                        {activeBook.pageList.map(pg => {
                          const pgLabel = pg.pageNo != null ? `Page ${pg.pageNo}` :
                            pg.pageIndex != null ? `Page ${pg.pageIndex + 1}` : 'Untagged';
                          return (
                            <div key={String(pg.pageNo ?? pg.pageIndex ?? 'nopage')}>
                              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/70">
                                <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                  <span className="text-[9px] font-black">P</span>
                                </div>
                                <span className="font-black text-[11px] text-indigo-800 uppercase tracking-wider flex-1">{pgLabel}</span>
                                <span className="text-[10px] font-bold text-amber-600 shrink-0">{pg.notes.length} ⭐</span>
                              </div>
                              <div className="px-3 py-2 space-y-1.5">
                                {pg.notes.map(note => (
                                  <button
                                    key={note.id}
                                    type="button"
                                    onClick={() => note.source ? setOpenNotePrompt({ topicText: note.topicText, source: note.source }) : undefined}
                                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/60 active:scale-[0.99] transition-all flex items-start gap-2 shadow-sm"
                                  >
                                    <Star size={11} className="fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-[12px] text-slate-700 leading-snug flex-1">{note.topicText}</span>
                                    {note.source ? <ChevronRight size={11} className="text-indigo-300 shrink-0 mt-0.5" /> : null}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              (() => {
                const _gnorm = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const _glbt = new Map<string, StarredNote>();
                const _glbp = new Map<string, StarredNote>();
                for (const n of starredNotes) {
                  const k = _gnorm(n.topicText || '');
                  if (!k) continue;
                  if (!_glbt.has(k)) _glbt.set(k, n);
                  const pre = k.slice(0, 140);
                  if (!_glbp.has(pre)) _glbp.set(pre, n);
                }
                const _gsyn: StarredNote[] = globalList.map(entry => {
                  const ln = _gnorm(entry.label);
                  const mine = _glbt.get(ln) || _glbp.get(ln.slice(0, 140));
                  const src = entry.source || mine?.source;
                  return { id: `global_${entry.hash || entry.label}`, topicText: entry.label, savedAt: mine?.savedAt || 0, source: src } as StarredNote;
                });
                const _gb = groupStarredByBook(_gsyn).filter(b => b.total > 0);
                const _gab = listViewBookFilter ? (_gb.find(b => b.lessonTitle === listViewBookFilter) ?? null) : null;
                const _gChips = _gb.length > 1 ? (
                  <div key="global-chips" className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                    <button onClick={() => setListViewBookFilter(null)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${!listViewBookFilter ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-amber-600 border-amber-200 hover:border-amber-400'}`}>All</button>
                    {_gb.map(b => (
                      <button key={b.lessonTitle} onClick={() => setListViewBookFilter(b.lessonTitle === listViewBookFilter ? null : b.lessonTitle)} className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black border transition-all whitespace-nowrap ${listViewBookFilter === b.lessonTitle ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-amber-600 border-amber-200 hover:border-amber-400'}`}>
                        📖 {b.lessonTitle.length > 14 ? b.lessonTitle.slice(0,14)+'…' : b.lessonTitle} ({b.total})
                      </button>
                    ))}
                  </div>
                ) : null;
                if (_gab) {
                  return <>{_gChips}{_gab.pageList.map(pg => {
                    const _gpLbl = pg.pageNo != null ? `Page ${pg.pageNo}` : pg.pageIndex != null ? `Page ${pg.pageIndex + 1}` : 'Untagged';
                    return <div key={String(pg.pageNo ?? pg.pageIndex ?? 'n')} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 pt-1">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">📄 {_gpLbl}</span>
                        <span className="flex-1 h-px bg-amber-100" />
                        <span className="text-[10px] font-bold text-amber-600">{pg.notes.length} ⭐</span>
                      </div>
                      {pg.notes.map(note => (
                        <button key={note.id} type="button" onClick={() => setOpenNotePrompt({ topicText: note.topicText, source: note.source })} className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 active:scale-[0.99] transition-all flex items-start gap-2 shadow-sm">
                          <Star size={12} className="fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                          <span className="font-semibold text-[12px] text-slate-700 leading-snug flex-1">{note.topicText}</span>
                        </button>
                      ))}
                    </div>;
                  })}</>;
                }
                const _gList = globalList.map((entry, idx) => {
                const minePulled = starredNotes.find(n => n.topicText === entry.label);
                const isMine = !!minePulled;
                const pct = globalTopCount > 0 ? Math.max(6, Math.round((entry.displayCount / globalTopCount) * 100)) : 0;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                const isCurrentlyReading = isReadingProfileStars && readingProfileStarIdx === idx;
                return (
                  <div
                    key={entry.hash || idx}
                    className={`rounded-2xl p-3 shadow-sm border transition-all ${
                      isCurrentlyReading
                        ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200'
                        : isMine ? 'bg-amber-50 border-amber-300' : 'bg-white border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Per-card speaker — tap to read this note (and continue
                          chain from here onwards). Tap again to stop. */}
                      <button
                        onClick={() => {
                          if (isCurrentlyReading) {
                            stopProfileStarRead();
                          } else {
                            startProfileStarRead(globalList.slice(idx).map(e => ({ topicText: e.label })));
                          }
                        }}
                        title={isCurrentlyReading ? 'Stop reading' : 'Read from here'}
                        aria-label={isCurrentlyReading ? 'Stop reading' : 'Read this note'}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isCurrentlyReading
                            ? 'bg-amber-400 text-white animate-pulse'
                            : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        }`}
                      >
                        {isCurrentlyReading
                          ? <Square size={13} fill="currentColor" />
                          : <Volume2 size={13} />
                        }
                      </button>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 text-amber-700 font-black text-xs">
                        {medal || `#${idx + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-snug text-slate-800 line-clamp-2">{entry.label}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-amber-700 shrink-0">
                            {entry.displayCount.toLocaleString('en-IN')} ⭐
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isMine && minePulled) {
                            // Untap: remove from local + decrement global count
                            setStarredNotes(prev => {
                              const updated = prev.filter(n => n.id !== minePulled.id);
                              try { localStorage.setItem('nst_starred_notes_v1', JSON.stringify(updated)); } catch {}
                              return updated;
                            });
                            try {
                              if (user?.id) {
                                // Argument order MUST match service signature:
                                //   recordNoteUnstar(userId, topicText)
                                // Pehle yahaan args ulte ja rahe the (entry.label as userId,
                                // user.id as topicText) — isi wajah se RTDB note_stars me
                                // proper unstar register nahi ho raha tha aur Global tab khaali
                                // dikhta tha.
                                import('../services/noteStars').then(m => m.recordNoteUnstar(user.id, entry.label)).catch(()=>{});
                              }
                            } catch {}
                          } else {
                            // Tap to save → add to My Saved + increment global
                            const newEntry: any = {
                              id: `global_${entry.hash || Date.now()}_${Math.random().toString(36).slice(2,7)}`,
                              noteKey: `community_${entry.hash || ''}`,
                              topicText: entry.label,
                              savedAt: Date.now(),
                              // Inherit community-recorded source so this note
                              // shows up under the right book/page in the
                              // user's own By-Book view too.
                              ...(entry.source ? { source: entry.source } : {}),
                            };
                            setStarredNotes(prev => {
                              if (prev.some(n => n.topicText === entry.label)) return prev;
                              const updated = [...prev, newEntry];
                              try { localStorage.setItem('nst_starred_notes_v1', JSON.stringify(updated)); } catch {}
                              return updated;
                            });
                            try {
                              if (user?.id) {
                                // Argument order MUST match service signature:
                                //   recordNoteStar(userId, noteKey, topicText, source?)
                                import('../services/noteStars').then(m => m.recordNoteStar(user.id, newEntry.noteKey, entry.label, entry.source)).catch(()=>{});
                              }
                            } catch {}
                          }
                        }}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 ${
                          isMine
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                        }`}
                        title={isMine ? 'Saved — tap to remove' : 'Tap to save'}
                      >
                        <Star size={11} fill={isMine ? 'currentColor' : 'none'} />
                        {isMine ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                );
              });
              return <>{_gChips}{_gList}</>;
              })()
            )}
          </>)}

          {/* === MCQ MATCHES — shared across both tabs ===
              Whenever the user types in the search bar, also surface MCQs
              from any cached chapter whose question/options/explanation
              contain the typed word. Tapping opens the chapter and triggers
              the MCQs tab via pendingReadQuery. */}
          {profileStarSearch.trim().length >= 2 && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-100/70 border-b border-emerald-200 flex items-center gap-2">
                <BrainCircuit size={14} className="text-emerald-600" />
                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                  Matching MCQs
                </p>
                <span className="ml-auto text-[10px] font-black bg-emerald-500 text-white rounded-full px-2 py-0.5">
                  {profileStarMcqLoading ? '…' : profileStarMcqHits.length}
                </span>
              </div>
              {profileStarMcqLoading ? (
                <div className="p-6 text-center text-[11px] font-bold text-emerald-600">
                  Searching MCQs…
                </div>
              ) : profileStarMcqHits.length === 0 ? (
                <div className="p-6 text-center text-[11px] font-semibold text-slate-500">
                  No MCQs contain "{profileStarSearch.trim()}".
                </div>
              ) : (
                <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {profileStarMcqHits.map((h, i) => (
                    <button
                      key={`${h.storageKey}_${i}`}
                      type="button"
                      onClick={() => {
                        // Stash query so the chapter view can auto-jump to MCQ
                        // tab and highlight matches via pendingReadQuery flow.
                        setPendingReadQuery(profileStarSearch.trim());
                        setShowStarredPage(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
                          MCQ
                        </span>
                        <span className="text-[10px] font-black text-indigo-600 truncate flex-1">
                          {h.bookName}{h.pageNo ? ` · Page ${h.pageNo}` : ''}
                        </span>
                        <span className="text-[9px] font-bold text-amber-600 shrink-0">
                          {h.matchCount} match{h.matchCount !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      <p className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2">
                        {h.question}
                      </p>
                      {h.options[h.correctAnswer] && (
                        <p className="mt-1 text-[10px] font-bold text-emerald-700 leading-snug truncate">
                          ✓ {h.options[h.correctAnswer]}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
        );
      })()}

      {/* ===================== COMMUNITY "MOST SAVED" / TRENDING NOTES PAGE ===================== */}
      {showCommunityStarsPage && (() => {
        const now = Date.now();
        const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
        const cutoff =
          globalNotesRange === 'weekly' ? now - WEEK_MS :
          globalNotesRange === 'monthly' ? now - MONTH_MS :
          0;
        const ranked = Object.values(globalNoteStars)
          .filter(e => e.count > 0 && e.label)
          .filter(e => cutoff === 0 ? true : (e.lastUpdated || 0) >= cutoff)
          .map(e => ({ ...e, displayCount: applyStarBoost(e.count, e.hash) }))
          .sort((a, b) => b.displayCount - a.displayCount);
        const topCount = ranked[0]?.displayCount || 0;
        const rangeLabel =
          globalNotesRange === 'weekly' ? 'this week' :
          globalNotesRange === 'monthly' ? 'this month' :
          'all-time';
        return (
          <div className="fixed inset-0 z-[9100] bg-gradient-to-b from-amber-50 to-white flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-100 bg-white sticky top-0 z-10">
              <button
                onClick={() => { stopProfileStarRead(); setShowCommunityStarsPage(false); }}
                className="p-2 rounded-full hover:bg-amber-100 text-amber-700"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" fill="currentColor" />
                  Trending Important Notes
                </h2>
                <p className="text-[11px] text-slate-500 font-bold">
                  Sare students kya save kar rahe hain — {rangeLabel}
                </p>
              </div>
              {/* Read All TTS — reads every ranked note in order. Reuses
                  the same isReadingProfileStars state shared with the
                  Important Notes page, so going back stops cleanly. */}
              {ranked.length > 0 && (
                <button
                  onClick={() => {
                    if (isReadingProfileStars) {
                      stopProfileStarRead();
                    } else {
                      startProfileStarRead(ranked.map(e => ({ topicText: e.label })));
                    }
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 ${
                    isReadingProfileStars
                      ? 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200'
                      : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  }`}
                >
                  {isReadingProfileStars
                    ? <><Square size={11} fill="currentColor" /> Stop</>
                    : <><Volume2 size={12} /> Read All</>
                  }
                </button>
              )}
            </div>
            {/* Time-range filter chips */}
            <div className="px-4 pt-3 pb-2 bg-white/70 backdrop-blur border-b border-amber-100">
              <div className="grid grid-cols-3 gap-1 p-1 bg-amber-50 rounded-2xl border border-amber-100">
                {([
                  { key: 'all', label: 'All Time', icon: '🏆' },
                  { key: 'monthly', label: 'Monthly', icon: '📅' },
                  { key: 'weekly', label: 'Weekly', icon: '🔥' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setGlobalNotesRange(opt.key)}
                    className={`py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                      globalNotesRange === opt.key
                        ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                        : 'text-amber-600 hover:text-amber-800'
                    }`}
                  >
                    <span className="text-[12px]">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {ranked.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-amber-100 shadow-sm">
                  <Star size={40} className="text-amber-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-600 text-sm">
                    {globalNotesRange === 'all'
                      ? 'Abhi koi trending note nahi.'
                      : globalNotesRange === 'weekly'
                        ? 'No trending notes this week.'
                        : 'No trending notes this month.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {globalNotesRange === 'all'
                      ? <>Jaise hi students notes ko ⭐ karna shuru karenge,<br/>yahan top saved notes dikhne lagengi.</>
                      : <>"All Time" tab might have older trending notes —<br/>shayad purane trending notes mil jaaye.</>}
                  </p>
                </div>
              ) : (
                ranked.map((entry, idx) => {
                  const pct = topCount > 0 ? Math.max(8, Math.round((entry.displayCount / topCount) * 100)) : 0;
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const isCurrentlyReading = isReadingProfileStars && readingProfileStarIdx === idx;
                  return (
                    <div
                      key={entry.hash}
                      className={`rounded-2xl p-3.5 border shadow-sm flex items-start gap-3 transition-all ${
                        isCurrentlyReading
                          ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200'
                          : 'bg-white border-amber-200'
                      }`}
                    >
                      {/* Per-card speaker — tap reads from this note onwards */}
                      <button
                        onClick={() => {
                          if (isCurrentlyReading) {
                            stopProfileStarRead();
                          } else {
                            startProfileStarRead(ranked.slice(idx).map(e => ({ topicText: e.label })));
                          }
                        }}
                        title={isCurrentlyReading ? 'Stop reading' : 'Read from here'}
                        aria-label={isCurrentlyReading ? 'Stop reading' : 'Read this note'}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isCurrentlyReading
                            ? 'bg-amber-400 text-white animate-pulse'
                            : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        }`}
                      >
                        {isCurrentlyReading
                          ? <Square size={14} fill="currentColor" />
                          : <Volume2 size={14} />
                        }
                      </button>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                        idx < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {medal}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 leading-snug line-clamp-3">
                          {entry.label}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-black text-amber-700 shrink-0 inline-flex items-center gap-1">
                            <Star size={10} className="fill-amber-500 text-amber-500" />
                            {entry.displayCount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {ranked.length > 0 && (
                <p className="text-center text-[10px] font-bold text-amber-500 pt-3 pb-6">
                  Aap akele nahi padh rahe — poori community saath padh rahi hai 🌟
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* LANDSCAPE FLOATING BUTTON — App logo button shown when screen is in landscape mode.
          Tapping it hides/shows both the top bar and bottom navigation bar. */}
      {(isLandscape || !!lucentNoteViewer || (contentViewStep === "PLAYER" && !!selectedChapter)) && !isFullscreenMode && !activeExternalApp && (
        <button
          onClick={() => setIsLandscapeUiHidden(prev => !prev)}
          className="fixed z-[400] transition-all duration-300 ease-in-out shadow-2xl"
          style={{
            bottom: (isLandscapeUiHidden || (contentViewStep === "PLAYER" && !!selectedChapter)) ? '16px' : '80px',
            right: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: isLandscapeUiHidden ? '2px solid rgba(99,102,241,0.7)' : '2px solid rgba(255,255,255,0.4)',
            background: isLandscapeUiHidden ? 'rgba(30,27,75,0.95)' : 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isLandscapeUiHidden ? 'Show top bar & navigation' : 'Hide top bar & navigation'}
        >
          {settings?.appLogo ? (
            <img
              src={settings.appLogo}
              alt="App"
              style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%' }}
            />
          ) : (
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
              {(settings?.appShortName || settings?.appName || 'A').charAt(0)}
            </span>
          )}
          {/* Small indicator dot */}
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isLandscapeUiHidden ? '#6366f1' : '#22c55e',
              border: '2px solid #fff',
            }}
          />
        </button>
      )}
    </div>
  );
};
