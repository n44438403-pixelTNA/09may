import React, { useState, useEffect } from "react";
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
} from "../types";
import {
  updateUserStatus,
  db,
  saveUserToLive,
  getChapterData,
  rtdb,
  saveAiInteraction,
  saveDemandRequest,
} from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, query, limitToLast, onValue } from "firebase/database";
import {
  getSubjectsList,
  DEFAULT_APP_FEATURES,
  ALL_APP_FEATURES,
  LEVEL_UNLOCKABLE_FEATURES,
  LEVEL_UP_CONFIG,
  APP_VERSION,
} from "../constants";
import { ALL_FEATURES } from "../utils/featureRegistry";
import { checkFeatureAccess } from "../utils/permissionUtils";
import { SubscriptionEngine } from "../utils/engines/subscriptionEngine";
import { RewardEngine } from "../utils/engines/rewardEngine";
import { Button } from "./ui/Button"; // Design System
import { getActiveChallenges } from "../services/questionBank";
import { generateDailyChallengeQuestions } from "../utils/challengeGenerator";
import { generateMorningInsight } from "../services/morningInsight";
import { LessonActionModal } from "./LessonActionModal";
import pLimit from "p-limit";
import { RedeemSection } from "./RedeemSection";
import { PrizeList } from "./PrizeList";
import { Store } from "./Store";
import {
  Globe,
  Layout,
  Gift,
  Cloud,
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
  Trophy,
  ShoppingBag,
  ArrowRight,
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
  Volume2,
  Square,
} from "lucide-react";
import { speakText, stopSpeech } from "../utils/textToSpeech";
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
import { Leaderboard } from "./Leaderboard";
import { SpinWheel } from "./SpinWheel";
import { fetchChapters, generateCustomNotes } from "../services/groq"; // Needed for Video Flow
import { LoadingOverlay } from "./LoadingOverlay";
import { CreditConfirmationModal } from "./CreditConfirmationModal";
import { UserGuide } from "./UserGuide";
import { StudentGuide } from "./student/StudentGuide"; // NEW
import { CustomAlert } from "./CustomDialogs";
import { AnalyticsPage } from "./AnalyticsPage";
import { LiveResultsFeed } from "./LiveResultsFeed";
// import { ChatHub } from './ChatHub';
import { UniversalInfoPage } from "./UniversalInfoPage";
import { UniversalChat } from "./UniversalChat";
import { ExpiryPopup } from "./ExpiryPopup";
import { SubscriptionHistory } from "./SubscriptionHistory";
import { MonthlyMarksheet } from "./MonthlyMarksheet";
import { SearchResult } from "../utils/syllabusSearch";
import { AiDeepAnalysis } from "./AiDeepAnalysis";
import { RevisionHub } from "./RevisionHub"; // NEW
import { AiHub } from "./AiHub"; // NEW: AI Hub
import { McqReviewHub } from "./McqReviewHub"; // NEW
import { UniversalVideoView } from "./UniversalVideoView"; // NEW
import { CustomBloggerPage } from "./CustomBloggerPage";
import { ReferralPopup } from "./ReferralPopup";
import { StudentAiAssistant } from "./StudentAiAssistant";
import { SpeakButton } from "./SpeakButton";
import { PerformanceGraph } from "./PerformanceGraph";
import { StudentSidebar } from "./StudentSidebar";
import { StudyGoalTimer } from "./StudyGoalTimer";
import { ExplorePage } from "./ExplorePage";
import { StudentHistoryModal } from "./StudentHistoryModal";
import { generateDailyRoutine } from "../utils/routineGenerator";
import { OfflineDownloads } from "./OfflineDownloads";
import { NotificationPrompt } from "./NotificationPrompt";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import html2canvas from "html2canvas";

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
    if (tab === "OPEN_CATALOG_PREMIUM_NOTES") {
      setShowAllNotesCatalog("PREMIUM");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_DEEP_DIVE") {
      setShowAllNotesCatalog("DEEP_DIVE");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_VIDEO") {
      setShowAllNotesCatalog("VIDEO");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_AUDIO") {
      setShowAllNotesCatalog("AUDIO");
      onTabChange("AI_HUB");
      return;
    }
    if (tab === "OPEN_CATALOG_MCQ") {
      setShowAllNotesCatalog("MCQ");
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

  const [activeSessionClass, setActiveSessionClass] = useState<string | null>(
    null,
  );
  const [activeSessionBoard, setActiveSessionBoard] = useState<
    "CBSE" | "BSEB" | null
  >(null);
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
            showAlert(
              `⚠️ Your subscription expires in ${Math.ceil(diffHours)} hours! Renew now to keep uninterrupted access.`,
              "INFO",
              "Expiry Warning",
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
          showAlert(msg, "INFO", "Upgrade Available");
          localStorage.setItem(`last_upsell_${user.id}`, now.toString());
          return; // Show one at a time
        }
      }

      // 3. Discount Event Notification
      if (settings?.specialDiscountEvent?.enabled) {
        const event = settings.specialDiscountEvent;
        let isEventActive = true; // Assume true if enabled and dates are missing
        if (event.startsAt && event.endsAt) {
          const startTime = new Date(event.startsAt).getTime();
          const endTime = new Date(event.endsAt).getTime();
          if (startTime === endTime) {
            isEventActive = now >= startTime;
          } else {
            isEventActive = now >= startTime && now < endTime;
          }
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
              showAlert(
                `🎉 ${event.eventName} is LIVE! Get ${event.discountPercent}% OFF on subscriptions right now!`,
                "SUCCESS",
                "Special Event",
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
          showAlert(
            "🌟 GLOBAL FREE ACCESS IS LIVE! Enjoy everything for free!",
            "SUCCESS",
            "Special Event",
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
          showAlert(
            "⚡ CREDIT FREE EVENT IS LIVE! Unlock content without using your coins!",
            "SUCCESS",
            "Special Event",
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
              showAlert(popupMsg, "INFO", popup.title);
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
          const alertKey = `nst_update_alert_shown_${latest.id}`;
          if (!localStorage.getItem(alertKey)) {
            showAlert(
              `New Content Available: ${latest.text}`,
              "INFO",
              "New Update",
            );
            localStorage.setItem(alertKey, "true");
          }
        } else {
          setHasNewUpdate(false);
        }
      }
    });
    return () => unsub();
  }, []);

  const [testAttempts, setTestAttempts] = useState<Record<string, any>>(
    JSON.parse(localStorage.getItem(`nst_test_attempts_${user.id}`) || "{}"),
  );
  const globalMessage = localStorage.getItem("nst_global_message");
  const [activeExternalApp, setActiveExternalApp] = useState<string | null>(
    null,
  );
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
  const [showStudentGuide, setShowStudentGuide] = useState(false); // NEW
  const [showNameChangeModal, setShowNameChangeModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [showExpiryPopup, setShowExpiryPopup] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [marksheetType, setMarksheetType] = useState<"MONTHLY" | "ANNUAL">(
    "MONTHLY",
  );
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAllNotesCatalog, setShowAllNotesCatalog] = useState<
    "PREMIUM" | "DEEP_DIVE" | "VIDEO" | "AUDIO" | "MCQ" | false
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
    // Reset top bar visibility when navigating
    setIsTopBarHidden(false);
  }, [activeTab, contentViewStep]);

  useEffect(() => {
    setFullScreen(true); // Always true to hide global header
  }, [activeTab, setFullScreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
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
    type: "PDF",
  });
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHomeworkHistory, setShowHomeworkHistory] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [homeworkSubjectView, setHomeworkSubjectView] = useState<string | null>(null);
  const [lucentCategoryView, setLucentCategoryView] = useState(false);
  const [hwAnswers, setHwAnswers] = useState<Record<string, number>>({});

  // ---- HOMEWORK HIERARCHY (Year → Month → Week → Day → Note) ----
  const [hwYear, setHwYear] = useState<number | null>(null);
  const [hwMonth, setHwMonth] = useState<number | null>(null);
  const [hwWeek, setHwWeek] = useState<number | null>(null);
  const [hwActiveHwId, setHwActiveHwId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // ---- HOMEWORK MCQ FULL-SCREEN PLAYER STATE ----
  const [homeworkPlayerHwId, setHomeworkPlayerHwId] = useState<string | null>(null);
  const [playerCurrentIndex, setPlayerCurrentIndex] = useState<number>(0);
  const [playerIsReadingAll, setPlayerIsReadingAll] = useState<boolean>(false);
  const [playerRevealAll, setPlayerRevealAll] = useState<boolean>(true);
  const playerScrollRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const playerIsReadingAllRef = React.useRef<boolean>(false);
  React.useEffect(() => { playerIsReadingAllRef.current = playerIsReadingAll; }, [playerIsReadingAll]);

  // Active homework being played
  const activePlayerHw = React.useMemo(() => {
    if (!homeworkPlayerHwId) return null;
    return (settings?.homework || []).find((h, i) => (h.id || String(i)) === homeworkPlayerHwId) || null;
  }, [homeworkPlayerHwId, settings?.homework]);

  // Build sequential player chunks (notes + MCQs with answers + explanations)
  const buildPlayerChunks = React.useCallback((hw: any | null) => {
    if (!hw) return [] as { kind: 'notes' | 'mcq', index: number, text: string, mcq?: any }[];
    const chunks: { kind: 'notes' | 'mcq', index: number, text: string, mcq?: any }[] = [];
    const stripped = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (hw.notes && stripped(hw.notes)) {
      chunks.push({ kind: 'notes', index: 0, text: `Notes. ${stripped(hw.notes)}` });
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

  const [showDailyGkHistory, setShowDailyGkHistory] = useState(false);
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

  const HOMEWORK_SUBJECTS = ['mcq', 'sarSangrah', 'speedySocialScience', 'speedyScience'];

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
    fetchChapters(
      activeSessionBoard || user.board || "CBSE",
      (activeSessionClass as any) || user.classLevel || "10",
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
      if (contentViewStep === "PLAYER") {
        setContentViewStep("CHAPTERS");
      } else if (contentViewStep === "CHAPTERS") {
        setContentViewStep("SUBJECTS");
        setDirectActionTarget(null);
        setLucentCategoryView(false);
      }
    };

    // HOMEWORK SUBJECT VIEW (MCQ, Sar Sangrah, Speedy Social Science, Speedy Science)
    if (homeworkSubjectView && contentViewStep === "SUBJECTS") {
      const subjectLabel: Record<string, string> = {
        mcq: 'MCQ Practice',
        sarSangrah: 'Sar Sangrah',
        speedySocialScience: 'Speedy Social Science',
        speedyScience: 'Speedy Science',
      };
      const SUBJECT_THEME: Record<string, { bg: string; bgSoft: string; text: string; textDeep: string; border: string; ring: string; btn: string; btnHover: string; chip: string; }> = {
        mcq: { bg: 'bg-green-50', bgSoft: 'bg-green-100', text: 'text-green-600', textDeep: 'text-green-800', border: 'border-green-200', ring: 'ring-green-300', btn: 'bg-green-600', btnHover: 'hover:bg-green-700', chip: 'bg-green-100 text-green-700' },
        sarSangrah: { bg: 'bg-rose-50', bgSoft: 'bg-rose-100', text: 'text-rose-600', textDeep: 'text-rose-800', border: 'border-rose-200', ring: 'ring-rose-300', btn: 'bg-rose-600', btnHover: 'hover:bg-rose-700', chip: 'bg-rose-100 text-rose-700' },
        speedySocialScience: { bg: 'bg-orange-50', bgSoft: 'bg-orange-100', text: 'text-orange-600', textDeep: 'text-orange-800', border: 'border-orange-200', ring: 'ring-orange-300', btn: 'bg-orange-600', btnHover: 'hover:bg-orange-700', chip: 'bg-orange-100 text-orange-700' },
        speedyScience: { bg: 'bg-blue-50', bgSoft: 'bg-blue-100', text: 'text-blue-600', textDeep: 'text-blue-800', border: 'border-blue-200', ring: 'ring-blue-300', btn: 'bg-blue-600', btnHover: 'hover:bg-blue-700', chip: 'bg-blue-100 text-blue-700' },
      };
      const theme = SUBJECT_THEME[homeworkSubjectView] || SUBJECT_THEME.mcq;

      const getWeekOfMonth = (d: Date) => Math.floor((d.getDate() - 1) / 7) + 1;
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      // Ascending order so "Next" goes oldest → newest naturally
      const filteredHw = (settings?.homework || [])
        .filter(hw => hw.targetSubject === homeworkSubjectView)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const goBack = () => {
        if (hwActiveHwId) { setHwActiveHwId(null); return; }
        if (hwWeek !== null) { setHwWeek(null); return; }
        if (hwMonth !== null) { setHwMonth(null); return; }
        if (hwYear !== null) { setHwYear(null); return; }
        setHomeworkSubjectView(null);
        setSelectedSubject(null);
      };

      // Breadcrumb title
      let crumb = subjectLabel[homeworkSubjectView] || homeworkSubjectView;
      if (hwYear !== null) crumb += ` › ${hwYear}`;
      if (hwMonth !== null) crumb += ` › ${monthNames[hwMonth]}`;
      if (hwWeek !== null) crumb += ` › Week ${hwWeek}`;

      // EMPTY STATE
      if (filteredHw.length === 0) {
        return (
          <div className={`min-h-screen ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <h2 className={`text-xl font-black ${theme.textDeep}`}>{crumb}</h2>
              </div>
              <div className="text-center py-16 text-slate-400">
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-slate-500">Koi content nahi mila</p>
                <p className="text-sm text-slate-400 mt-1">Admin ne abhi tak koi content nahi dala hai</p>
              </div>
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
        const nextHw = flatIdx >= 0 && flatIdx + 1 < filteredHw.length ? filteredHw[flatIdx + 1] : null;
        const prevHw = flatIdx > 0 ? filteredHw[flatIdx - 1] : null;
        const hwKey = activeHw.id || String(flatIdx);

        const goToHw = (target: typeof activeHw) => {
          const d = new Date(target.date);
          setHwYear(d.getFullYear());
          setHwMonth(d.getMonth());
          setHwWeek(getWeekOfMonth(d));
          setHwActiveHwId(target.id || '');
        };

        return (
          <div className={`min-h-screen ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest truncate`}>{crumb}</p>
                  <h2 className={`text-lg font-black ${theme.textDeep} truncate`}>{activeHw.title}</h2>
                </div>
                <span className={`text-[11px] font-bold ${theme.chip} px-2 py-1 rounded-full shrink-0`}>{flatIdx + 1}/{filteredHw.length}</span>
              </div>

              <div className={`bg-white rounded-2xl border-2 ${theme.border} shadow-sm overflow-hidden`}>
                <div className={`${theme.bgSoft} px-4 py-3 flex items-center justify-between gap-3 border-b ${theme.border}`}>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${theme.text} uppercase tracking-widest`}>{new Date(activeHw.date).toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className={`font-black ${theme.textDeep} text-base leading-snug`}>{activeHw.title}</p>
                  </div>
                  {(activeHw.parsedMcqs && activeHw.parsedMcqs.length > 0) || activeHw.notes ? (
                    <button
                      onClick={() => {
                        setHomeworkPlayerHwId(activeHw.id || hwKey);
                        setPlayerCurrentIndex(0);
                        setPlayerIsReadingAll(false);
                        setPlayerRevealAll(true);
                      }}
                      className={`shrink-0 ${theme.btn} ${theme.btnHover} text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 active:scale-95 transition-transform`}
                      title="Full Screen Player"
                    >
                      <Play size={12} /> Player
                    </button>
                  ) : null}
                </div>
                <div className="p-4 space-y-3">
                  {activeHw.notes && (
                    <div className={`${theme.bg} border ${theme.border} rounded-xl p-3`}>
                      <p className={`text-xs font-bold ${theme.text} mb-1 flex items-center gap-1`}><BookOpen size={12} /> Notes</p>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: activeHw.notes }} />
                    </div>
                  )}
                  {activeHw.audioUrl && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1"><Volume2 size={12} /> Audio</p>
                      <audio controls src={activeHw.audioUrl} className="w-full h-8" />
                    </div>
                  )}
                  {activeHw.videoUrl && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1"><Play size={12} /> Video</p>
                      <a href={activeHw.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-rose-700">
                        <Play size={12} /> Video Dekhen
                      </a>
                    </div>
                  )}
                  {activeHw.parsedMcqs && activeHw.parsedMcqs.length > 0 && (
                    <div className={`${theme.bg} border ${theme.border} rounded-xl p-3`}>
                      <p className={`text-xs font-bold ${theme.text} mb-2 flex items-center gap-1`}><CheckSquare size={12} /> MCQ ({activeHw.parsedMcqs.length} questions)</p>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {activeHw.parsedMcqs.map((mcq, qi) => {
                          const ansKey = `${hwKey}_${qi}`;
                          const selected = hwAnswers[ansKey];
                          return (
                            <div key={qi} className={`bg-white rounded-lg p-3 border ${theme.border}`}>
                              <p className="text-sm font-bold text-slate-800 mb-2">{qi + 1}. {mcq.question}</p>
                              <div className="space-y-1">
                                {mcq.options.map((opt, oi) => {
                                  const isSelected = selected === oi;
                                  const isCorrect = mcq.correctAnswer === oi;
                                  const showResult = selected !== undefined;
                                  return (
                                    <button key={oi} onClick={() => { if (selected === undefined) setHwAnswers(prev => ({ ...prev, [ansKey]: oi })); }}
                                      className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${showResult ? (isCorrect ? 'bg-green-100 border-green-400 text-green-800 font-bold' : isSelected ? 'bg-red-100 border-red-400 text-red-800' : 'bg-white border-slate-200 text-slate-500') : `bg-white border-slate-200 hover:${theme.border} hover:${theme.bg} text-slate-700`}`}>
                                      {String.fromCharCode(65 + oi)}. {opt}
                                    </button>
                                  );
                                })}
                              </div>
                              {selected !== undefined && mcq.explanation && (
                                <p className="text-xs text-slate-600 mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">{mcq.explanation}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Prev / Next navigation */}
              <div className="flex items-center justify-between gap-2 mt-4">
                <button
                  disabled={!prevHw}
                  onClick={() => prevHw && goToHw(prevHw)}
                  className={`flex-1 flex items-center justify-center gap-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${prevHw ? `bg-white ${theme.text} border-2 ${theme.border} hover:${theme.bgSoft}` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  <ChevronRight size={16} className="rotate-180" /> Previous
                </button>
                <button
                  disabled={!nextHw}
                  onClick={() => nextHw && goToHw(nextHw)}
                  className={`flex-1 flex items-center justify-center gap-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${nextHw ? `${theme.btn} ${theme.btnHover} text-white shadow-md active:scale-95` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
              {!nextHw && (
                <p className="text-center text-xs text-slate-500 font-bold mt-3">🎉 Aap ne saare notes complete kar liye!</p>
              )}
            </div>
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
          <div className={`min-h-screen ${theme.bg} p-4 pt-2`}>
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

      // ============== MONTH VIEW (weeks inside selected month) ==============
      if (hwYear !== null && hwMonth !== null) {
        const monthHw = filteredHw.filter(hw => {
          const d = new Date(hw.date);
          return d.getFullYear() === hwYear && d.getMonth() === hwMonth;
        });
        const weeksMap = new Map<number, number>();
        monthHw.forEach(hw => {
          const w = getWeekOfMonth(new Date(hw.date));
          weeksMap.set(w, (weeksMap.get(w) || 0) + 1);
        });
        const weeks = Array.from(weeksMap.entries()).sort((a,b) => a[0]-b[0]);
        return (
          <div className={`min-h-screen ${theme.bg} p-4 pt-2`}>
            <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
              <div className="flex items-center gap-3 mb-5">
                <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest`}>{crumb}</p>
                  <h2 className={`text-xl font-black ${theme.textDeep}`}>{monthNames[hwMonth]} {hwYear}</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {weeks.map(([w, count]) => (
                  <button
                    key={w}
                    onClick={() => setHwWeek(w)}
                    className={`bg-white border-2 ${theme.border} rounded-2xl p-5 text-left hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4`}
                  >
                    <div className={`${theme.bgSoft} ${theme.textDeep} w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0`}>
                      <span className="text-[10px] font-bold uppercase">Week</span>
                      <span className="text-2xl font-black leading-none">{w}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-black ${theme.textDeep}`}>Week {w}</p>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">{count} {count === 1 ? 'note' : 'notes'} added</p>
                    </div>
                    <ChevronRight size={18} className={`${theme.text}`} />
                  </button>
                ))}
              </div>
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
          <div className={`min-h-screen ${theme.bg} p-4 pt-2`}>
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

      // ============== ROOT YEAR LIST ==============
      const yearMap = new Map<number, number>();
      filteredHw.forEach(hw => {
        const y = new Date(hw.date).getFullYear();
        yearMap.set(y, (yearMap.get(y) || 0) + 1);
      });
      const years = Array.from(yearMap.entries()).sort((a,b) => b[0]-a[0]);

      return (
        <div className={`min-h-screen ${theme.bg} p-4 pt-2`}>
          <div className="max-w-3xl mx-auto pb-8 animate-in fade-in">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={goBack} className={`${theme.bgSoft} p-2 rounded-full ${theme.text}`}>
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <h2 className={`text-xl font-black ${theme.textDeep}`}>{subjectLabel[homeworkSubjectView] || homeworkSubjectView}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {years.map(([y, count]) => (
                <button
                  key={y}
                  onClick={() => setHwYear(y)}
                  className={`bg-white border-2 ${theme.border} rounded-2xl p-5 text-left hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4`}
                >
                  <div className={`${theme.bgSoft} ${theme.textDeep} w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0`}>
                    <span className="text-[10px] font-bold uppercase">Year</span>
                    <span className="text-2xl font-black leading-none">{y}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-black ${theme.textDeep}`}>{y}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">{count} {count === 1 ? 'note' : 'notes'} added</p>
                  </div>
                  <ChevronRight size={18} className={`${theme.text}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // LUCENT BOOK CATEGORY VIEW
    if (lucentCategoryView && contentViewStep === "SUBJECTS") {
      return (
        <div className="p-4 pt-2 max-w-3xl mx-auto pb-8 animate-in fade-in">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setLucentCategoryView(false); setSelectedSubject(null); }} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-700">
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-800">Lucent Book</h2>
              <p className="text-xs text-slate-500">Subject choose karein</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {LUCENT_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => {
                setLucentCategoryView(false);
                setSelectedSubject(cat);
                setContentViewStep("CHAPTERS");
                setSelectedChapter(null);
                setLoadingChapters(true);
                const lang = (activeSessionBoard || user.board) === "BSEB" ? "Hindi" : "English";
                fetchChapters(activeSessionBoard || user.board || "CBSE", 'COMPETITION', user.stream || "Science", cat, lang).then((data) => {
                  const sorted = [...data].sort((a, b) => a.title.localeCompare(b.title));
                  setChapters(sorted);
                  setLoadingChapters(false);
                });
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
        category: "Learning & Progress",
        items: [
          {
            id: "ANALYTICS",
            label: "Analytics",
            icon: BarChart3,
            color: "blue",
            action: () => {
              onTabChange("ANALYTICS");
              setShowSidebar(false);
            },
            featureId: "MY_ANALYSIS",
          },
          {
            id: "MARKSHEET",
            label: "Marksheet",
            icon: FileText,
            color: "green",
            action: () => {
              setShowMonthlyReport(true);
              setShowSidebar(false);
            },
            featureId: "MARKSHEET",
          },
          {
            id: "HISTORY",
            label: "History",
            icon: History,
            color: "slate",
            action: () => {
              onTabChange("HISTORY");
              setShowSidebar(false);
            },
            featureId: "HISTORY_PAGE",
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
          {
            id: "PRIZES",
            label: "Prizes",
            icon: Trophy,
            color: "yellow",
            action: () => {
              onTabChange("PRIZES");
              setShowSidebar(false);
            },
            featureId: "PRIZES",
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
            label: "Request Content",
            icon: Megaphone,
            color: "purple",
            action: () => {
              setShowRequestModal(true);
              setShowSidebar(false);
            },
            featureId: "REQUEST_CONTENT",
          },
        ],
      },
      {
        category: "Help & Support",
        items: [
          {
            id: "GUIDE",
            label: "App Guide",
            icon: HelpCircle,
            color: "cyan",
            action: () => {
              setShowStudentGuide(true);
              setShowSidebar(false);
            },
            featureId: "GUIDE",
          },
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
        <div className="space-y-4 pb-4">
          <DashboardSectionWrapper
            id="section_main_actions"
            label="Main Actions"
            settings={settings}
            isLayoutEditing={isLayoutEditing}
            onToggleVisibility={toggleLayoutVisibility}
          >
            <div className="grid grid-cols-2 gap-4">
              {/* CLASS SELECTION */}
              <div className="col-span-2 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm transition-all">
                <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="text-blue-600" size={24} /> Select Class
                </h3>

                {/* BOARD SELECTION TOGGLE */}
                <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl mb-4 max-w-[200px] mx-auto">
                  <button
                    onClick={() => setActiveSessionBoard("CBSE")}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeSessionBoard !== "BSEB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    CBSE
                  </button>
                  <button
                    onClick={() => setActiveSessionBoard("BSEB")}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeSessionBoard === "BSEB" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    BSEB
                  </button>
                </div>

                {/* CLASS SELECTION GRID */}
                <div className="grid grid-cols-2 gap-3">
                  {["6", "7", "8", "9", "10", "11", "12", "COMPETITION"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setActiveSessionClass(c);
                          setActiveSessionBoard(
                            activeSessionBoard || user.board || "CBSE",
                          );
                          setContentViewStep("SUBJECTS");
                          setInitialParentSubject(null);
                          onTabChange("COURSES");
                        }}
                        className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all text-center text-sm md:text-base flex items-center justify-center group"
                      >
                        <span>
                          {c === "COMPETITION" ? "Govt. Exams" : `Class ${c}`}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {(() => {
                const access = getFeatureAccess("MY_ANALYSIS");
                if (access.isHidden) return null;
                const isLocked = !access.hasAccess;

                return (
                  <button
                    onClick={() => {
                      if (isLocked) {
                        showAlert("🔒 Locked by Admin.", "ERROR");
                        return;
                      }
                      onTabChange("ANALYTICS");
                    }}
                    className={`bg-white border-2 border-slate-100 p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all hover:border-blue-200 h-32 relative overflow-hidden ${isLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                  >
                    <BarChart3 size={28} className="text-blue-600 mb-1" />
                    <span className="font-black text-slate-700 text-sm tracking-wide uppercase text-center">
                      My Analysis
                    </span>
                    {isLocked && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
                        <Lock size={12} />
                      </div>
                    )}
                  </button>
                );
              })()}

              {(() => {
                const access = getFeatureAccess("VIDEO_ACCESS");
                if (access.isHidden) return null;
                const isLocked = false;

                return (
                  <button
                    onClick={() => {
                      onTabChange("UNIVERSAL_VIDEO");
                    }}
                    className={`bg-white border-2 border-slate-100 p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-2 group active:scale-95 transition-all hover:border-rose-200 h-32 relative overflow-hidden ${isLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                  >
                    <div className="relative">
                      <Video size={28} className="text-rose-600 mb-1" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></div>
                    </div>
                    <span className="font-black text-slate-700 text-sm tracking-wide uppercase text-center">
                      Universal Video
                    </span>
                    {isLocked && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
                        <Lock size={12} />
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>
          </DashboardSectionWrapper>
        </div>
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
    if ((activeTab as string) === "DEEP_ANALYSIS")
      return (
        <AiDeepAnalysis
          user={user}
          settings={settings}
          onUpdateUser={handleUserUpdate}
          onBack={() => onTabChange("HOME")}
        />
      );
    if (activeTab === "UPDATES")
      return <UniversalInfoPage onBack={() => onTabChange("HOME")} />;
    if ((activeTab as string) === "ANALYTICS")
      return (
        <AnalyticsPage
          user={user}
          onBack={() => onTabChange("HOME")}
          settings={settings}
          onNavigateToChapter={onNavigateToChapter}
        />
      );
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
    if (activeTab === "PRIZES")
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PrizeList />
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
            {user.subscriptionLevel === "BASIC" && user.isPremium && (
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-10"></div>
            )}

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
              className={`w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-3xl font-black shadow-2xl relative z-10 ${
                user.subscriptionLevel === "ULTRA" && user.isPremium
                  ? "text-purple-700 ring-4 ring-purple-300 animate-bounce-slow"
                  : user.subscriptionLevel === "BASIC" && user.isPremium
                    ? "text-sky-600 ring-4 ring-sky-300"
                    : "text-slate-600 ring-4 ring-slate-200"
              }`}
            >
              {(user.name || "S").charAt(0)}
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
              Developed by Nadim Anwar
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
                        displayTier = "Yearly Plus"; // Mapped as per user request
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
          </div>

          <div className="space-y-3 mt-4">
            {/* QUICK STATS ROW */}
            <div className="grid grid-cols-3 gap-2">
              {(() => {
                const totalTests = user.mcqHistory?.length || 0;
                const avgScore = totalTests > 0 ? Math.round(((user.mcqHistory?.reduce((a, b) => a + b.score / b.totalQuestions, 0) || 0) / totalTests) * 100) : 0;
                const stats = [
                  { label: 'Tests', value: totalTests, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                  { label: 'Avg %', value: `${avgScore}%`, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Credits', value: user.credits ?? 0, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                ];
                return stats.map(s => (
                  <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-3 text-center`}>
                    <p className={`text-xl font-black ${s.color} leading-none`}>{s.value}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                ));
              })()}
            </div>

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
                <Database size={18} className="text-slate-600" /> My Data
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
          {showSettingsSheet && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsSheet(false)}>
              <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 shadow-2xl space-y-3 pb-8 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-slate-600" /> Settings
                </h3>

                {/* LIGHT/DARK MODE TOGGLE */}
                <button
                  onClick={() => {
                    if (!isDarkMode) {
                      localStorage.setItem("nst_dark_theme_type", "black");
                      onToggleDarkMode && onToggleDarkMode(true);
                    } else {
                      const currentType = localStorage.getItem("nst_dark_theme_type");
                      if (currentType === "black") {
                        localStorage.setItem("nst_dark_theme_type", "blue");
                        onToggleDarkMode && onToggleDarkMode(true);
                      } else {
                        onToggleDarkMode && onToggleDarkMode(false);
                      }
                    }
                  }}
                  className={`w-full p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${isDarkMode ? (localStorage.getItem("nst_dark_theme_type") === "blue" ? "bg-blue-900 border-blue-800" : "bg-slate-800 border-slate-700") : "bg-white border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-black/20" : "bg-slate-100"}`}>
                    {isDarkMode ? <Sparkles size={18} className={localStorage.getItem("nst_dark_theme_type") === "blue" ? "text-blue-300" : "text-yellow-400"} /> : <Zap size={18} className="text-slate-600" />}
                  </div>
                  <span className={`text-sm font-bold flex-1 text-left ${isDarkMode ? (localStorage.getItem("nst_dark_theme_type") === "blue" ? "text-blue-300" : "text-slate-300") : "text-slate-700"}`}>
                    {isDarkMode ? (localStorage.getItem("nst_dark_theme_type") === "blue" ? "Blue Mode Active" : "Black Mode Active") : "Light Mode Active"}
                  </span>
                  <div className="w-10 h-6 bg-slate-200 rounded-full flex items-center px-1 overflow-hidden">
                    <div className={`w-4 h-4 rounded-full transition-transform ${isDarkMode ? "translate-x-4 bg-indigo-500" : "bg-white shadow"}`}></div>
                  </div>
                </button>

                {/* MY MARKSHEETS */}
                <button
                  onClick={() => { setMarksheetType("MONTHLY"); setShowMonthlyReport(true); setShowSettingsSheet(false); }}
                  className="w-full bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-3 hover:bg-blue-50 transition-all"
                >
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><BarChart3 size={18} /></div>
                  <span className="text-sm font-bold text-slate-800 flex-1 text-left">My Marksheets</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                {/* SETUP RECOVERY */}
                <button
                  onClick={() => { setShowSidebar(false); setShowRecoveryModal(true); setShowSettingsSheet(false); }}
                  className="w-full bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center gap-3 hover:bg-orange-50 transition-all"
                >
                  <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Lock size={18} /></div>
                  <span className="text-sm font-bold text-slate-800 flex-1 text-left">Setup Recovery</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                {/* MY DATA */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><Database size={14} /> My Data</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setViewingUserHistory(user); setShowSettingsSheet(false); }}
                      className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                    >
                      <Activity size={14} className="text-blue-500" /> View Activity
                    </button>
                    <button
                      onClick={async () => {
                        setShowSettingsSheet(false);
                        try {
                          showAlert("Generating Report...", "INFO");
                          const element = document.createElement("div");
                          element.style.cssText = "width:210mm;min-height:297mm;padding:40px;background:#fff;font-family:Helvetica,Arial,sans-serif;position:fixed;top:-9999px;left:-9999px;";
                          const totalTests = user.mcqHistory?.length || 0;
                          const avgScore = totalTests > 0 ? Math.round(((user.mcqHistory?.reduce((a, b) => a + b.score / b.totalQuestions, 0) || 0) / totalTests) * 100) : 0;
                          element.innerHTML = `<div style="border:4px solid #1e293b;padding:40px;box-sizing:border-box;"><h1 style="color:#1e293b;font-size:28px;font-weight:900;text-align:center;">STUDENT PROGRESS REPORT</h1><p style="text-align:center;color:#64748b;">${settings?.appName || "App"}</p><hr style="margin:20px 0"><p><b>Name:</b> ${user.name}</p><p><b>ID:</b> ${user.displayId || user.id}</p><p><b>Class:</b> ${user.classLevel}</p><p><b>Tests:</b> ${totalTests} | <b>Avg Score:</b> ${avgScore}%</p></div>`;
                          document.body.appendChild(element);
                          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                          const pdf = new jsPDF("p", "mm", "a4");
                          const pdfWidth = pdf.internal.pageSize.getWidth();
                          pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
                          pdf.save(`Report_${(user.name || "Student").replace(/\s+/g, "_")}_${Date.now()}.pdf`);
                          document.body.removeChild(element);
                          showAlert("✅ Report Downloaded!", "SUCCESS");
                        } catch (e) { showAlert("Failed to generate PDF.", "ERROR"); }
                      }}
                      className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                    >
                      <Download size={14} className="text-red-500" /> Download Report
                    </button>
                  </div>
                </div>

                <button onClick={() => setShowSettingsSheet(false)} className="w-full mt-2 text-slate-500 text-sm font-bold py-3">
                  Close
                </button>
              </div>
            </div>
          )}
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50 p-4 z-[200] fixed inset-0 backdrop-blur-sm animate-in fade-in">
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

  // Check and render Marksheet modal first
  if (showMonthlyReport) {
    return (
      <MonthlyMarksheet
        user={user}
        settings={settings}
        onClose={() => setShowMonthlyReport(false)}
      />
    );
  }

  // --- TEACHER LOCKED SCREEN MOVED TO RENDER ---
  if (isTeacherLocked && activeTab !== "STORE") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
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
    <div className="min-h-screen bg-slate-50 pb-0">
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
        className={`sticky top-0 z-[100] w-full shadow-md flex flex-col justify-between px-4 py-3 transition-all duration-300 ${
          user.isPremium
            ? user.subscriptionLevel === "ULTRA"
              ? "bg-slate-900 text-white"
              : user.subscriptionLevel === "BASIC"
                ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white"
                : "bg-[var(--primary)] text-white"
            : "bg-gradient-to-r from-slate-600 to-slate-800 text-white grayscale border-b border-slate-700"
        } ${isFullscreenMode ? "hidden" : ""} transition-all duration-300 ease-in-out ${isTopBarHidden ? "-translate-y-full !h-0 overflow-hidden opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}
      >
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
              <span className="font-black text-xl leading-tight tracking-tight whitespace-nowrap truncate">
                {settings?.appName || "NST AI"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar justify-end pl-2 z-10 ml-auto">
            {/* Streak Badge */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full shadow-sm text-xs font-black bg-orange-500/20 text-orange-100 border border-orange-400/30 backdrop-blur-sm whitespace-nowrap shrink-0">
              🔥 {user.streak || 0}
            </div>

            {/* Credits */}
            <button
              onClick={() => onTabChange("STORE")}
              className="flex items-center gap-1 px-2 py-1 rounded-full shadow-sm text-xs font-black hover:scale-105 transition-transform bg-[#FDFBF7] text-slate-800 border border-amber-100 whitespace-nowrap shrink-0"
            >
              <Crown size={14} className="fill-slate-800" /> {user.credits} CR
            </button>

            {/* Custom Page / Lightning */}
            <button
              onClick={() => onTabChange("CUSTOM_PAGE")}
              className="p-1.5 rounded-full transition-colors relative bg-[#FDFBF7] hover:bg-slate-50 text-slate-800 border border-amber-100 shrink-0"
            >
              <Zap size={16} />
              {hasNewUpdate && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Sale Discount Mini Button */}
            {settings?.specialDiscountEvent?.enabled && (
              <button
                onClick={() => onTabChange("STORE")}
                className="p-1.5 rounded-full transition-colors relative bg-[#FDFBF7] hover:bg-slate-50 text-slate-800 border border-amber-100 shrink-0 flex items-center gap-1"
              >
                <Ticket size={16} />
                <span className="text-[10px] font-bold whitespace-nowrap">
                  {settings?.specialDiscountEvent?.discountPercent
                    ? `${settings.specialDiscountEvent.discountPercent}% OFF`
                    : "50% OFF"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SECOND LINE: Subscription, Expiry Date */}
        <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2 opacity-90 shrink-0">
            <span className="text-sm font-bold text-white/90 truncate">
              Hey, {(user.name || "Student").split(" ")[0]} 👋
            </span>
          </div>
          <div className="flex items-center gap-2 opacity-90 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">
              {user.isPremium ? user.subscriptionTier || "PREMIUM" : "FREE"}
            </span>
            {user.isPremium &&
              user.subscriptionEndDate &&
              user.subscriptionTier !== "LIFETIME" &&
              !isNaN(new Date(user.subscriptionEndDate).getTime()) && (
                <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/20 px-1.5 py-0.5 rounded-sm">
                  EXP:{" "}
                  {new Date(user.subscriptionEndDate)
                    .toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })
                    .replace(/ /g, " ")
                    .toUpperCase()}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* NOTIFICATION BAR (Only on Home) (COMPACT VERSION) */}
      {activeTab === "HOME" && settings?.noticeText && (
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
      {activeTab === "HOME" && (
        <div className="mx-2 mt-2 relative min-h-[120px]">
          {(() => {
            const banners: React.ReactNode[] = [];

            // HOMEWORK - only show today's homework
            {
              const todayStr = new Date().toISOString().split('T')[0];
              const todayHw = (settings?.homework || []).filter(hw => hw.date === todayStr);
              if (todayHw.length > 0) {
                const latestTodayHw = todayHw[todayHw.length - 1];
                banners.push(
                  <div
                    key="homework"
                    className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200 shadow-sm flex items-start gap-3 overflow-hidden h-full w-full absolute top-0 left-0 animate-in fade-in zoom-in duration-300 cursor-pointer"
                    onClick={() => setShowHomeworkHistory(true)}
                  >
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 text-indigo-200 opacity-50">
                      <BookOpen size={64} />
                    </div>
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0 relative z-10">
                      <BookOpen size={20} />
                    </div>
                    <div className="flex-1 relative z-10 pr-6">
                      <h4 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-1">
                        Aaj ka Homework • {latestTodayHw.date}
                      </h4>
                      <p className="font-bold text-slate-800 text-sm leading-snug mb-1">
                        {latestTodayHw.title}
                      </p>
                      {latestTodayHw.notes && (
                        <p className="text-indigo-700 text-xs font-medium truncate">
                          {latestTodayHw.notes}
                        </p>
                      )}
                    </div>
                    <span className="absolute top-3 right-3 text-[10px] font-bold bg-white text-indigo-600 px-2 py-1 rounded shadow-sm border border-indigo-200 uppercase z-10">
                      Dekhen
                    </span>
                  </div>,
                );
              }
            }

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
                            if (
                              i ===
                              settings.globalChallengeMcq![0].correctAnswer
                            ) {
                              showAlert(
                                "🎉 Correct Answer! Great job!",
                                "SUCCESS",
                              );
                            } else {
                              showAlert(
                                `❌ Incorrect. The right answer is: ${settings.globalChallengeMcq![0].options[settings.globalChallengeMcq![0].correctAnswer]}`,
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

            // 2. DAILY GK
            if (settings?.dailyGk && settings.dailyGk.length > 0) {
              banners.push(
                <div
                  key="daily-gk"
                  className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-200 shadow-sm flex items-start gap-3 overflow-hidden cursor-pointer h-full w-full absolute top-0 left-0 animate-in fade-in zoom-in duration-300"
                  onClick={() => setShowDailyGkHistory(true)}
                >
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 text-teal-200 opacity-50">
                    <BookOpen size={64} />
                  </div>
                  <div className="bg-teal-100 p-2 rounded-lg text-teal-600 shrink-0 relative z-10">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 relative z-10 pr-6">
                    <h4 className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1">
                      Daily GK •{" "}
                      {settings.dailyGk[settings.dailyGk.length - 1].date}
                    </h4>
                    <p className="font-bold text-slate-800 text-sm leading-snug mb-1">
                      {settings.dailyGk[settings.dailyGk.length - 1].question}
                    </p>
                    <p className="text-teal-700 text-xs font-medium bg-teal-100/50 p-2 rounded inline-block">
                      Ans:{" "}
                      {settings.dailyGk[settings.dailyGk.length - 1].answer}
                    </p>
                  </div>
                  <button
                    className="absolute top-3 right-3 text-[10px] font-bold bg-white text-teal-600 px-2 py-1 rounded shadow-sm border border-teal-200 uppercase"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDailyGkHistory(true);
                    }}
                  >
                    History
                  </button>
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
              <div className="relative min-h-[160px]">
                {banners[currentIndex]}
              </div>
            );
          })()}
        </div>
      )}

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

      {/* HOMEWORK HISTORY MODAL */}
      {showHomeworkHistory && (
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
                                <a
                                  href={hw.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-3 hover:bg-rose-100 transition-colors"
                                >
                                  <Youtube
                                    className="text-rose-600 shrink-0"
                                    size={16}
                                  />
                                  <span className="text-sm font-bold text-rose-800">
                                    Watch Video
                                  </span>
                                </a>
                              )}
                              {hw.audioUrl && (
                                <a
                                  href={hw.audioUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center gap-3 hover:bg-purple-100 transition-colors"
                                >
                                  <Headphones
                                    className="text-purple-600 shrink-0"
                                    size={16}
                                  />
                                  <span className="text-sm font-bold text-purple-800">
                                    Play Audio
                                  </span>
                                </a>
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

      {/* DAILY GK HISTORY MODAL */}
      {showDailyGkHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Daily GK History
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Grouped by Month & Year
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDailyGkHistory(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {settings?.dailyGk && settings.dailyGk.length > 0 ? (
                (() => {
                  // Group by Year-Month
                  const grouped = settings.dailyGk.reduce(
                    (acc, gk) => {
                      const d = new Date(gk.date);
                      if (isNaN(d.getTime())) return acc;
                      const monthYear = d.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      });
                      if (!acc[monthYear]) acc[monthYear] = [];
                      acc[monthYear].push(gk);
                      return acc;
                    },
                    {} as Record<string, typeof settings.dailyGk>,
                  );

                  return Object.entries(grouped).map(([monthYear, gks]) => (
                    <div key={monthYear} className="space-y-3">
                      <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10 border-b border-slate-100">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                          {monthYear}
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {[...gks].reverse().map((gk, i) => (
                          <div
                            key={gk.id || i}
                            className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-black text-teal-600 bg-teal-100 px-2 py-1 rounded uppercase tracking-widest">
                                {new Date(gk.date).toLocaleDateString(
                                  "default",
                                  { weekday: "short", day: "numeric" },
                                )}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ttsId = `gk_${gk.id || i}`;
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
                                className={`p-1.5 rounded-full transition-colors shrink-0 ${speakingId === `gk_${gk.id || i}` ? "bg-red-100 text-red-600" : "bg-teal-100/50 text-teal-600 hover:bg-teal-200"}`}
                              >
                                {speakingId === `gk_${gk.id || i}` ? (
                                  <Square size={14} className="fill-current" />
                                ) : (
                                  <Volume2 size={14} />
                                )}
                              </button>
                            </div>
                            <p className="font-bold text-slate-800 text-sm mb-2">
                              {gk.question}
                            </p>
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                              <p className="text-sm text-slate-700">
                                <strong>Ans:</strong> {gk.answer}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No GK History available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REQUEST CONTENT MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-pink-600">
              <Megaphone size={24} />
              <h3 className="text-lg font-black text-slate-800">
                Request Content
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Subject
                </label>
                <input
                  type="text"
                  value={requestData.subject}
                  onChange={(e) =>
                    setRequestData({ ...requestData, subject: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Topic / Chapter
                </label>
                <input
                  type="text"
                  value={requestData.topic}
                  onChange={(e) =>
                    setRequestData({ ...requestData, topic: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. Trigonometry"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Type
                </label>
                <select
                  value={requestData.type}
                  onChange={(e) =>
                    setRequestData({ ...requestData, type: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="PDF">PDF Notes</option>
                  <option value="VIDEO">Video Lecture</option>
                  <option value="MCQ">MCQ Test</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowRequestModal(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!requestData.subject || !requestData.topic) {
                    showAlert("Please fill all fields", "ERROR");
                    return;
                  }
                  const request = {
                    id: `req-${Date.now()}`,
                    userId: user.id,
                    userName: user.name,
                    details: `${activeSessionClass || user.classLevel || "10"} ${activeSessionBoard || user.board || "CBSE"} - ${requestData.subject} - ${requestData.topic} - ${requestData.type}`,
                    timestamp: new Date().toISOString(),
                  };
                  // Save to Firebase for Admin Visibility
                  saveDemandRequest(request)
                    .then(() => {
                      setShowRequestModal(false);
                      showAlert(
                        "✅ Request Sent! Admin will check it.",
                        "SUCCESS",
                      );
                      // Also save locally just in case
                      const existing = JSON.parse(
                        localStorage.getItem("nst_demand_requests") || "[]",
                      );
                      existing.push(request);
                      localStorage.setItem(
                        "nst_demand_requests",
                        JSON.stringify(existing),
                      );
                    })
                    .catch(() => showAlert("Failed to send request.", "ERROR"));
                }}
                className="flex-1 bg-pink-600 hover:bg-pink-700 shadow-lg"
              >
                Send Request
              </Button>
            </div>
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
        className={`relative ${activeTab !== "REVISION" && activeTab !== "AI_HUB" ? "p-4 pb-20" : ""}`}
      >
        {renderMainContent()}
      </div>

      {/* MINI PLAYER */}
      <MiniPlayer
        track={currentAudioTrack}
        onClose={() => setCurrentAudioTrack(null)}
      />

      {/* FIXED BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 w-full mx-auto bg-white border-t border-slate-200 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] z-50 pb-safe rounded-t-2xl">
        <div className="flex justify-around items-center h-14">
          {(() => {
            const access = getFeatureAccess("NAV_HOME");
            if (access.isHidden) return null;
            const isLocked = !access.hasAccess;
            return (
              <button
                onClick={() => {
                  if (isLocked) {
                    showAlert("🔒 Locked by Admin.", "ERROR");
                    return;
                  }
                  onTabChange("HOME");
                  setContentViewStep("SUBJECTS");
                }}
                className={`flex flex-col items-center justify-center w-full h-full relative ${activeTab === "HOME" ? "text-blue-600" : "text-slate-500"} ${isLocked ? "opacity-50 grayscale" : ""}`}
              >
                <div className="relative">
                  <Home
                    size={20}
                    fill={
                      activeTab === "HOME" && !isLocked
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                      <Lock size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1">Home</span>
              </button>
            );
          })()}

          {(() => {
            const access = getFeatureAccess("REVISION_HUB");
            if (access.isHidden) return null;
            const isLocked = !access.hasAccess;
            return (
              <button
                onClick={() => {
                  if (isLocked) {
                    showAlert("🔒 Locked by Admin.", "ERROR");
                    return;
                  }
                  onTabChange("REVISION" as any);
                }}
                className={`flex flex-col items-center justify-center w-full h-full relative ${activeTab === "REVISION" ? "text-blue-600" : "text-slate-500"} ${isLocked ? "opacity-50 grayscale" : ""}`}
              >
                <div className="relative">
                  <BrainCircuit
                    size={20}
                    fill={
                      activeTab === "REVISION" && !isLocked
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                      <Lock size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1">Revision</span>
              </button>
            );
          })()}

          {(() => {
            const access = getFeatureAccess("AI_CENTER");
            if (access.isHidden) return null;
            const isLocked = !access.hasAccess;
            return (
              <button
                onClick={() => {
                  if (isLocked) {
                    showAlert("🔒 Locked by Admin.", "ERROR");
                    return;
                  }
                  onTabChange("AI_HUB");
                }}
                className={`flex flex-col items-center justify-center w-full h-full relative ${activeTab === "AI_HUB" ? "text-blue-600" : "text-slate-500"} ${isLocked ? "opacity-50 grayscale" : ""}`}
              >
                <div className="relative">
                  <Sparkles
                    size={20}
                    fill={
                      activeTab === "AI_HUB" && !isLocked
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                      <Lock size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1">Study Goal</span>
              </button>
            );
          })()}

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
                className={`flex flex-col items-center justify-center w-full h-full relative ${activeTab === "HISTORY" ? "text-blue-600" : "text-slate-500"} ${isLocked ? "opacity-50 grayscale" : ""}`}
              >
                <div className="relative">
                  <History size={20} />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                      <Lock size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1">History</span>
              </button>
            );
          })()}

          {(() => {
            const access = getFeatureAccess("PROFILE_PAGE");
            if (access.isHidden) return null;
            const isLocked = !access.hasAccess;
            return (
              <button
                onClick={() => {
                  if (isLocked) {
                    showAlert("🔒 Locked by Admin.", "ERROR");
                    return;
                  }
                  onTabChange("PROFILE");
                }}
                className={`flex flex-col items-center justify-center w-full h-full relative ${activeTab === "PROFILE" ? "text-blue-600" : "text-slate-500"} ${isLocked ? "opacity-50 grayscale" : ""}`}
              >
                <div className="relative">
                  <UserIconOutline
                    size={20}
                    fill={
                      activeTab === "PROFILE" && !isLocked
                        ? "currentColor"
                        : "none"
                    }
                  />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-white">
                      <Lock size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1">Profile</span>
              </button>
            );
          })()}
        </div>
      </div>

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

      {/* STUDENT AI ASSISTANT (Chat Check) */}
      <StudentAiAssistant
        user={user}
        settings={settings}
        isOpen={activeTab === "AI_CHAT"}
        onClose={() => onTabChange("HOME")}
      />

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
          <div className="flex items-center justify-between p-4 bg-slate-900 text-white shadow-md">
            <div className="flex items-center gap-2">
              <Smartphone size={20} className="text-cyan-400" />
              <span className="font-bold text-sm tracking-wide">
                External App
              </span>
            </div>
            <button
              onClick={() => setActiveExternalApp(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 w-full bg-slate-50 relative">
            <iframe
              src={activeExternalApp}
              className="absolute inset-0 w-full h-full border-none"
              title="External App Viewer"
              allow="autoplay; camera; microphone; fullscreen; display-capture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox allow-downloads allow-presentation"
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

      {/* STUDENT GUIDE MODAL (NEW) */}

      {showStudentGuide && (
        <StudentGuide
          settings={settings}
          onClose={() => setShowStudentGuide(false)}
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
        />
      )}

      {/* ALL NOTES CATALOG MODAL */}
      {showAllNotesCatalog !== false && (
        <div className="fixed inset-0 bg-white z-[200] overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              {showAllNotesCatalog === "VIDEO" ? (
                <Youtube className="text-rose-600" />
              ) : showAllNotesCatalog === "AUDIO" ? (
                <Headphones className="text-purple-600" />
              ) : showAllNotesCatalog === "MCQ" ? (
                <CheckSquare className="text-emerald-600" />
              ) : (
                <BookOpen className="text-blue-600" />
              )}
              {showAllNotesCatalog === "PREMIUM"
                ? "Premium Notes Library"
                : showAllNotesCatalog === "DEEP_DIVE"
                  ? "Deep Dive Concept Notes"
                  : showAllNotesCatalog === "VIDEO"
                    ? "Video Lectures Library"
                    : showAllNotesCatalog === "AUDIO"
                      ? "Audio Podcasts Library"
                      : "MCQ Practice Hub"}
            </h2>
            <button
              onClick={() => setShowAllNotesCatalog(false)}
              className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X size={20} className="text-slate-600" />
            </button>
          </div>

          <div className="p-4 space-y-8 pb-24">
            {["6", "7", "8", "9", "10", "11", "12", "COMPETITION"].map(
              (cls) => {
                const classSubjects = getSubjectsList(
                  cls,
                  user.stream || "Science",
                  activeSessionBoard || user.board,
                ).filter(
                  (s) => !(settings?.hiddenSubjects || []).includes(s.id),
                );
                if (classSubjects.length === 0) return null;

                return (
                  <div key={cls} className="space-y-3">
                    <h3 className="font-bold text-lg text-slate-700 uppercase tracking-widest border-b-2 border-slate-100 pb-2">
                      {cls === "COMPETITION" ? "Govt. Exams" : `Class ${cls}`}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {classSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                              {sub.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">
                                {sub.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {catalogChapterCounts[`${cls}_${sub.id}`] !==
                                undefined
                                  ? catalogChapterCounts[`${cls}_${sub.id}`]
                                  : "..."}{" "}
                                Chapters
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (
                                showAllNotesCatalog !== "DEEP_DIVE" &&
                                !user.isPremium
                              ) {
                                onTabChange("STORE");
                                return;
                              }
                              setDirectActionTarget(showAllNotesCatalog);
                              setActiveSessionClass(cls);
                              setActiveSessionBoard(
                                activeSessionBoard || user.board || "CBSE",
                              );
                              setSelectedSubject(sub);
                              setContentViewStep("CHAPTERS");
                              setSelectedChapter(null);

                              // Trigger Chapter Fetch manually since handleContentSubjectSelect expects standard flow
                              setLoadingChapters(true);
                              const lang =
                                (activeSessionBoard || user.board) === "BSEB"
                                  ? "Hindi"
                                  : "English";
                              fetchChapters(
                                activeSessionBoard || user.board || "CBSE",
                                cls,
                                user.stream || "Science",
                                sub,
                                lang,
                              ).then((data) => {
                                const sortedData = [...data].sort((a, b) => {
                                  const matchA = a.title.match(/(\d+)/);
                                  const matchB = b.title.match(/(\d+)/);
                                  if (matchA && matchB) {
                                    return (
                                      parseInt(matchA[1], 10) -
                                      parseInt(matchB[1], 10)
                                    );
                                  }
                                  return a.title.localeCompare(b.title);
                                });
                                setChapters(sortedData);
                                setLoadingChapters(false);
                              });

                              setShowAllNotesCatalog(false);
                              onTabChange("COURSES");
                            }}
                            className={`font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors ${showAllNotesCatalog === "DEEP_DIVE" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-yellow-400 hover:bg-yellow-500 text-slate-900"}`}
                          >
                            {showAllNotesCatalog === "DEEP_DIVE" ? (
                              <BookOpen size={14} className="text-white" />
                            ) : (
                              <Crown size={14} className="text-slate-900" />
                            )}
                            {showAllNotesCatalog === "DEEP_DIVE"
                              ? "Deep Dive"
                              : showAllNotesCatalog === "VIDEO"
                                ? "Watch Videos"
                                : showAllNotesCatalog === "AUDIO"
                                  ? "Listen Audio"
                                  : showAllNotesCatalog === "MCQ"
                                    ? "Practice MCQ"
                                    : "Premium Notes"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* REVISION HUB CHECK */}
      {activeTab === "REVISION" &&
        (() => {
          // Bypass access checks entirely for Admin/Sub-Admin directly inside the dashboard wrapper
          const access = checkFeatureAccess(
            "REVISION_HUB",
            user,
            settings || {},
          );
          const isAdmin = user?.role === "ADMIN" || user?.isSubAdmin;
          if (!access.hasAccess && !isAdmin) {
            return (
              <div className="flex flex-col items-center justify-center h-[70vh] p-6 text-center animate-in fade-in">
                <div className="bg-slate-100 p-6 rounded-full mb-6 relative">
                  <BrainCircuit size={64} className="text-slate-500" />
                  <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-2 rounded-full border-4 border-white">
                    <Lock size={20} />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">
                  Revision Hub Locked
                </h2>
                <p className="text-slate-600 mb-6 max-w-xs">
                  {access.reason === "FEED_LOCKED"
                    ? "This feature is currently disabled by Admin."
                    : "Upgrade your plan to unlock smart revision tools."}
                </p>
                <Button onClick={() => onTabChange("STORE")} variant="primary">
                  View Plans
                </Button>
              </div>
            );
          }
          return (
            <RevisionHub
              user={user}
              onTabChange={onTabChange}
              settings={settings}
              onUpdateUser={handleUserUpdate}
              onNavigateContent={(type, chapterId, topicName, subjectName) => {
                setTopicFilter(topicName);
                // Handle Navigation based on Type
                if (type === "PDF" || type === "VIDEO" || type === "MCQ") {
                  setLoadingChapters(true);
                  const lang =
                    (activeSessionBoard || user.board) === "BSEB"
                      ? "Hindi"
                      : "English";
                  fetchChapters(
                    (activeSessionBoard as any) ||
                      (user.board as any) ||
                      "CBSE",
                    (activeSessionClass as any) ||
                      (user.classLevel as any) ||
                      "10",
                    (user.stream as any) || "Science",
                    null as any,
                    lang,
                  ).then((allChapters) => {
                    const ch = allChapters.find((c) => c.id === chapterId);
                    if (ch) {
                      // Switch Tab
                      onTabChange(type as any); // Type cast as StudentTab

                      // Resolve Subject
                      const subjects = getSubjectsList(
                        (activeSessionClass as any) || user.classLevel || "10",
                        user.stream || "Science",
                        activeSessionBoard || user.board,
                      ).filter(
                        (s) => !(settings?.hiddenSubjects || []).includes(s.id),
                      );
                      let targetSubject = selectedSubject;
                      if (subjectName) {
                        targetSubject =
                          subjects.find((s) => s.name === subjectName) ||
                          subjects[0];
                      } else if (!targetSubject) {
                        targetSubject = subjects[0];
                      }

                      // Set Context
                      setSelectedSubject(targetSubject);
                      setSelectedChapter(ch);
                      setContentViewStep("PLAYER");
                      setFullScreen(true);
                    } else {
                      showAlert("Content not found or not loaded.", "ERROR");
                    }
                    setLoadingChapters(false);
                  });
                }
              }}
            />
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

          {/* Progress + Reveal toggle bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold text-slate-600">
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
            <button
              onClick={() => setPlayerRevealAll(v => !v)}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-white"
            >
              {playerRevealAll ? 'Hide Answers' : 'Show Answers'}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 pb-32 overscroll-contain">
            <div className="max-w-3xl mx-auto space-y-5">
              {playerChunks.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-slate-500">Is homework mein abhi kuch nahi hai</p>
                </div>
              )}
              {playerChunks.map((chunk, idx) => {
                const isActive = idx === playerCurrentIndex && playerIsReadingAll;
                return (
                  <div
                    key={`pchunk-${idx}`}
                    ref={(el) => { playerScrollRefs.current[idx] = el; }}
                    className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-sm transition-all ${
                      isActive ? 'border-indigo-500 ring-4 ring-indigo-100 scale-[1.01]' : 'border-slate-200'
                    }`}
                  >
                    {chunk.kind === 'notes' ? (
                      <>
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <p className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen size={14} /> Notes
                          </p>
                          <button
                            onClick={() => {
                              if (speakingId === `player_notes_${idx}`) { stopSpeech(); setSpeakingId(null); }
                              else {
                                speakText(chunk.text, undefined, 1.0, 'hi-IN',
                                  () => setSpeakingId(`player_notes_${idx}`),
                                  () => setSpeakingId(null));
                              }
                            }}
                            className={`p-2 rounded-full transition ${speakingId === `player_notes_${idx}` ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                            title="Read this note"
                          >
                            {speakingId === `player_notes_${idx}` ? <Square size={14} /> : <Volume2 size={14} />}
                          </button>
                        </div>
                        <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {activePlayerHw.notes}
                        </div>
                      </>
                    ) : (
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
                        </div>
                        <p className="text-base sm:text-lg font-bold text-slate-800 mb-3 leading-snug">
                          {chunk.mcq?.question}
                        </p>
                        <div className="space-y-2 mb-4">
                          {(chunk.mcq?.options || []).map((opt: string, oi: number) => {
                            const isCorrect = chunk.mcq?.correctAnswer === oi;
                            return (
                              <div
                                key={oi}
                                className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-sm ${
                                  playerRevealAll && isCorrect
                                    ? 'bg-green-50 border-green-300 text-green-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                  playerRevealAll && isCorrect ? 'bg-green-600 text-white' : 'bg-white border border-slate-300 text-slate-500'
                                }`}>
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {playerRevealAll && isCorrect && (
                                  <CheckSquare size={16} className="text-green-600 shrink-0 mt-0.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {playerRevealAll && (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
