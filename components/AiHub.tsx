import React, { useState, useEffect } from "react";
import { User, SystemSettings, StudentTab } from "../types";
import {
  Bot,
  Sparkles,
  BrainCircuit,
  FileText,
  Zap,
  Calendar,
  X,
  AlertCircle,
} from "lucide-react";
import { CustomAlert } from "./CustomDialogs";
import { BannerCarousel } from "./BannerCarousel";
import { Button } from "./ui/Button";
import { generateSmartStudyPlan } from "../utils/studyPlanner";
import { PerformanceGraph } from "./PerformanceGraph";
import { StudyGoalTimer } from "./StudyGoalTimer";

interface Props {
  user: User;
  onTabChange: (tab: StudentTab) => void;
  settings?: SystemSettings;
}

export const AiHub: React.FC<Props> = ({ user, onTabChange, settings }) => {
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "SUCCESS" | "ERROR" | "INFO";
    title?: string;
    message: string;
  }>({ isOpen: false, type: "INFO", message: "" });
  const [discountStatus, setDiscountStatus] = useState<
    "WAITING" | "ACTIVE" | "NONE"
  >("NONE");
  const [showDiscountBanner, setShowDiscountBanner] = useState(false);
  const [discountTimer, setDiscountTimer] = useState<string | null>(null);

  // NEW STATE FOR STUDY PLANNER
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  // MANUAL ROUTINE CREATOR STATE
  const [routineSubject, setRoutineSubject] = useState("");
  const [routineTime, setRoutineTime] = useState("");

  useEffect(() => {
    const evt = settings?.specialDiscountEvent;
    const formatDiff = (diff: number) => {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return `${d > 0 ? d + "d " : ""}${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    };
    const checkStatus = () => {
      if (!evt?.enabled) {
        setShowDiscountBanner(false);
        setDiscountStatus("NONE");
        setDiscountTimer(null);
        return;
      }
      const now = Date.now();
      const startsAt = evt.startsAt ? new Date(evt.startsAt).getTime() : now;
      const endsAt = evt.endsAt ? new Date(evt.endsAt).getTime() : now;
      if (now < startsAt) {
        setDiscountStatus("WAITING");
        setShowDiscountBanner(true);
        setDiscountTimer(formatDiff(startsAt - now));
      } else if (now < endsAt) {
        setDiscountStatus("ACTIVE");
        setShowDiscountBanner(true);
        setDiscountTimer(formatDiff(endsAt - now));
      } else {
        setDiscountStatus("NONE");
        setShowDiscountBanner(false);
        setDiscountTimer(null);
      }
    };
    checkStatus();
    if (evt?.enabled) {
      const interval = setInterval(checkStatus, 1000);
      return () => clearInterval(interval);
    } else {
      setShowDiscountBanner(false);
      setDiscountStatus("NONE");
    }
  }, [settings?.specialDiscountEvent]);

  const handleGeneratePlan = async () => {
    if (!routineSubject || !routineTime) {
      setAlertConfig({
        isOpen: true,
        type: "ERROR",
        title: "Missing Info",
        message: "Please select a subject and time for your routine.",
      });
      return;
    }

    // Create manual routine based on user input
    const plan = {
      title: "My Custom Study Goal",
      summary: `Focused study session for ${routineSubject}.`,
      weakAreas: [],
      routine: [
        {
          time: routineTime,
          subject: routineSubject,
          topic: "Targeted Study",
          activity: "Focus on core concepts and practice questions.",
          duration: "1 Hour"
        }
      ],
      motivation: "Consistency is the key to mastering your subjects. Keep it up!"
    };

    setGeneratedPlan(plan);
  };


  const getEventSlides = () => {
    const slides: any[] = [];

    const featureBanners = [
      {
        id: "feat-sub",
        title: "Unlock Premium Subscription",
        subtitle: "Access everything with Ultra Plan.",
        image:
          "https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&q=80&w=800",
        link: "STORE",
      },
      {
        id: "feat-notes-deep",
        title: "Ultra Notes Deep Dive",
        subtitle: "Detailed notes with audio explanations.",
        image:
          "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800",
        link: "PDF",
      },
      {
        id: "feat-slide",
        title: "Ultra Slide",
        subtitle: "Visual learning with audio sync.",
        image:
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800",
        link: "PDF",
      },
      {
        id: "feat-video",
        title: "Ultra Video Lectures",
        subtitle: "High-quality video content.",
        image:
          "https://images.unsplash.com/photo-1492619879851-f42b0416955d?auto=format&fit=crop&q=80&w=800",
        link: "VIDEO",
      },
      {
        id: "feat-mcq",
        title: "Premium MCQ Practice",
        subtitle: "Unlimited tests and analysis.",
        image:
          "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=800",
        link: "MCQ",
      },
      {
        id: "feat-audio",
        title: "Premium Audio Library",
        subtitle: "Learn on the go with podcasts.",
        image:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
        link: "AUDIO",
      },
      {
        id: "feat-ai",
        title: "AI Hub Ultra Analysis",
        subtitle: "Deep insights powered by AI.",
        image:
          "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800",
        link: "AI_HUB",
      },
    ];

    slides.push(...featureBanners);

    if (settings?.activeEvents) {
      settings.activeEvents.forEach((evt) => {
        if (evt.enabled) {
          slides.push({
            id: `evt-${evt.title}`,
            image:
              evt.imageUrl ||
              "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800",
            title: evt.title,
            subtitle: evt.subtitle,
            link: evt.actionUrl,
          });
        }
      });
    }

    if (settings?.exploreBanners) {
      settings.exploreBanners.forEach((b) => {
        if (b.enabled && b.priority > 5) {
          slides.push({
            id: b.id,
            image:
              b.imageUrl ||
              "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800",
            title: b.title,
            subtitle: b.subtitle,
            link: b.actionUrl,
          });
        }
      });
    }

    if (slides.length === 0) {
      slides.push({
        id: "default-welcome",
        image:
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800",
        title: `Welcome, ${user.name}!`,
        subtitle: "Start your learning journey today.",
        link: "COURSES",
      });
    }

    return slides;
  };
  const eventSlides = getEventSlides();

  return (
    <div className="space-y-6 pb-24 p-4 animate-in fade-in">
      {/* EVENT BANNERS */}
      {eventSlides.length > 0 && (
        <div className="h-48 shadow-lg rounded-2xl overflow-hidden">
          <BannerCarousel
            slides={eventSlides}
            autoPlay={true}
            interval={4000}
            onBannerClick={(link) => {
              if (link === "NOTES") onTabChange("OPEN_CATALOG_PREMIUM_NOTES" as any);
              else if (link === "PDF") onTabChange("OPEN_CATALOG_DEEP_DIVE" as any);
              else if (link === "VIDEO") onTabChange("OPEN_CATALOG_VIDEO" as any);
              else if (link === "AUDIO") onTabChange("OPEN_CATALOG_AUDIO" as any);
              else if (link === "STORE") onTabChange("STORE");
              else if (link) window.open(link, "_blank");
            }}
          />
        </div>
      )}


      {/* DISCOUNT BANNER */}
      {showDiscountBanner && discountTimer && (
        <button
          onClick={() => onTabChange("STORE")}
          className={`w-full bg-gradient-to-r ${discountStatus === "ACTIVE" ? "from-yellow-400 to-amber-600" : "from-slate-700 to-slate-900"} p-4 rounded-xl text-slate-900 shadow-lg flex items-center justify-between animate-pulse`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {discountStatus === "ACTIVE" ? "🎉" : "⏳"}
            </span>
            <div className="text-left">
              <p className="font-black text-sm uppercase">
                {discountStatus === "ACTIVE"
                  ? `${settings?.specialDiscountEvent?.eventName || "Special Offer"} Ends In:`
                  : `${settings?.specialDiscountEvent?.eventName || "Special Offer"} Starts In:`}
              </p>
              <p className="text-lg font-mono font-bold">{discountTimer}</p>
            </div>
          </div>
          <div className="bg-slate-900 text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
            {discountStatus === "ACTIVE" ? "CLAIM NOW" : "WAIT FOR IT"}
          </div>
        </button>
      )}

      {/* PERFORMANCE GRAPH AND TIMER */}
      <div className="space-y-4 mb-6">
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
            <PerformanceGraph
                history={user.mcqHistory || []}
                user={user}
                onViewNotes={(topic) => {
                    onTabChange('PDF');
                }}
            />
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
            <StudyGoalTimer
                dailyStudySeconds={parseInt(localStorage.getItem(`nst_daily_study_${user.id}`) || '0') || 0}
                targetSeconds={parseInt(localStorage.getItem(`nst_goal_${user.id}`) || '3') * 3600 || 3 * 3600}
                onSetTarget={(s) => {
                    localStorage.setItem(`nst_goal_${user.id}`, (s / 3600).toString());
                }}
            />
        </div>
      </div>

      {/* AI TOOLS COMPRESSED VIEW */}
      <div className="grid grid-cols-1 gap-4">
        {/* 2. REPLACED: NOTES GENERATOR -> AI STUDY PLANNER */}
        <button
          onClick={() => setShowPlannerModal(true)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100">
            <Calendar size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-slate-800">Study Goal</h3>
            <p className="text-xs text-slate-600">
              Create your own daily study routine.
            </p>
          </div>
          <div className="text-slate-300">
            <Zap size={16} />
          </div>
        </button>
      </div>

      {/* AI PLANNER MODAL */}
      {showPlannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Custom Study Routine
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Personalized for {user.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlannerModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {!generatedPlan ? (
                <div className="py-6 px-4">
                  <div className="text-center mb-6">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-full inline-block mb-4 animate-pulse shadow-inner">
                      <Calendar size={32} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      Create Your Custom Routine
                    </h3>
                  </div>

                  <div className="space-y-4 w-full mx-auto mb-8">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Select Subject</label>
                      <input
                        type="text"
                        value={routineSubject}
                        onChange={(e) => setRoutineSubject(e.target.value)}
                        placeholder="e.g. Science, Math"
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Select Time</label>
                      <input
                        type="time"
                        value={routineTime}
                        onChange={(e) => setRoutineTime(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <Button
                      onClick={handleGeneratePlan}
                      variant="primary"
                      size="lg"
                      icon={<Zap size={18} />}
                      fullWidth
                    >
                      Generate My Routine
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-5 rounded-2xl text-white shadow-md">
                    <h3 className="font-black text-xl mb-1 flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-200" />{" "}
                      {generatedPlan.title}
                    </h3>
                    <p className="text-sm text-indigo-100 leading-relaxed">
                      {generatedPlan.summary}
                    </p>
                  </div>

                  {generatedPlan.weakAreas &&
                    generatedPlan.weakAreas.length > 0 && (
                      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                        <h4 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2 tracking-wide uppercase">
                          <AlertCircle size={16} strokeWidth={2.5} /> Core
                          Weaknesses
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {generatedPlan.weakAreas.map(
                            (area: string, i: number) => (
                              <span
                                key={i}
                                className="bg-white text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 shadow-sm"
                              >
                                {area}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-4 font-black text-slate-700 border-b border-slate-200 flex justify-between items-center">
                      <span className="tracking-widest uppercase text-xs">
                        Recommended Schedule
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded shadow-sm border border-indigo-200 uppercase tracking-wider">
                        High Impact
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {generatedPlan.routine?.map((slot: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="p-4 flex gap-4 items-start hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="text-[11px] font-black text-indigo-600 w-20 pt-1 shrink-0 bg-indigo-50 px-2 py-1 rounded text-center border border-indigo-100">
                            {slot.time}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 uppercase tracking-widest">
                                {slot.subject}
                              </span>
                              <h4 className="font-bold text-slate-800 text-sm">
                                {slot.topic}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {slot.activity}{" "}
                              <span className="mx-1 text-slate-300">•</span>{" "}
                              <span className="text-indigo-600 font-bold">
                                {slot.duration}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 text-blue-200 opacity-50">
                      <Zap size={64} />
                    </div>
                    <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2 relative z-10 tracking-wide">
                      <Zap size={16} className="text-blue-600" /> Note from AI
                      Tutor
                    </h4>
                    <p className="text-sm text-blue-900 italic relative z-10 leading-relaxed">
                      "{generatedPlan.motivation}"
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => setGeneratedPlan(null)}
                      variant="outline"
                      fullWidth
                    >
                      Generate New Plan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CustomAlert
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
