import { SystemSettings } from '../types';

export const getStudentGuideData = (settings?: SystemSettings) => {
    // Default Costs if not set
    const costs = {
        video: settings?.defaultVideoCost ?? 5,
        pdf: settings?.defaultPdfCost ?? 2,
        mcqTest: settings?.mcqTestCost ?? 10,
        mcqPractice: settings?.mcqLimitFree ? 'Free (Daily Limit)' : 'Free',
        aiChat: settings?.chatCost ?? 1,
        aiAnalysis: settings?.mcqAnalysisCost ?? 5,
        aiPlan: 'Free / Subscription',
        game: settings?.gameCost ?? 0,
        deepDive: settings?.deepDiveCost ?? 15,
        audioSlide: settings?.audioSlideCost ?? 10
    };

    return {
        overview: {
            title: `Welcome to ${settings?.appName || 'IDEAL INSPIRATION CLASSES'}`,
            subtitle: "Your Complete Guide to Smart Learning & AI Tools",
            content: "Welcome to the future of education. This application combines high-quality study materials with advanced AI technology to personalize your learning journey. From interactive 'Deep Dive' notes and offline-ready 'Smart Marksheets' to your personal 'NSTA AI Assistant', every feature is designed to help you study smarter, track your progress, and achieve your goals efficiently."
        },
        features: [
            {
                title: "📚 Comprehensive Study Materials",
                description: "Access 5 specialized types of notes and multimedia resources.",
                items: [
                    { name: "Quick Revision (Queek)", cost: "Free / Included", details: "Fast-paced summary points and recap cards to revise chapters in minutes before exams." },
                    { name: "Concept / Deep Dive", cost: `${costs.deepDive} Coins`, details: "Interactive, in-depth explanations that break down complex topics into easy-to-understand parts." },
                    { name: "Premium Notes (PDF)", cost: `${costs.pdf} Coins`, details: "High-quality, expertly crafted PDF notes designed for thorough reading and long-term retention." },
                    { name: "Universal Video", cost: "Free", details: "Core concept video lectures available to all students for foundational learning." },
                    { name: "Premium Video & Audio", cost: `${costs.video} / ${costs.audioSlide} Coins`, details: "Advanced lectures and synchronized audio slides for immersive, hands-free learning." }
                ]
            },
            {
                title: "📝 Practice & Smart Marksheets",
                description: "Test your knowledge and get deep offline analytics.",
                items: [
                    { name: "Standard Practice", cost: costs.mcqPractice, details: "Unlimited access to standard chapter-wise MCQs to build confidence. (Subject to daily limits)" },
                    { name: "Premium Mock Tests", cost: `${costs.mcqTest} Coins`, details: "Advanced, exam-level tests that simulate real testing environments." },
                    { name: "Smart Marksheets", cost: "Included", details: "Instantly generated offline reports breaking down your performance by topic, speed, and accuracy." },
                    { name: "Ultra AI Analysis", cost: `${costs.aiAnalysis} Coins`, details: "A personalized AI-generated report highlighting your exact weak areas and offering actionable advice." }
                ]
            },
            {
                title: "🤖 NSTA AI Hub",
                description: "Your 24/7 personal tutor and study planner.",
                items: [
                    { name: "AI Chat Tutor", cost: `${costs.aiChat} Coin / Msg`, details: "Stuck on a problem? Ask the NSTA AI instantly. It explains concepts patiently like a real teacher." },
                    { name: "AI Study Planner", cost: costs.aiPlan, details: "Generate personalized daily study routines based on your exams, weak subjects, and available time." }
                ]
            },
            {
                title: "🏆 Rewards & Gamification",
                description: "Earn while you learn and build daily habits.",
                items: [
                    { name: "Study Timer", cost: "Earn Coins", details: "Use the built-in timer to track focus sessions and automatically earn coins for your hard work." },
                    { name: "Daily Login Streak", cost: "Earn Rewards", details: "Log in every day to build a streak. High streaks unlock special badges and bonus coins." }
                ]
            }
        ],
        faq: [
            { q: "How do I earn Coins to unlock premium features?", a: "Coins are the app's currency. You can earn them for free by claiming your Daily Login Bonus and by using the 'Study Timer' to track your focus sessions. Alternatively, you can purchase coin packs directly from the Store." },
            { q: "What is the difference between Free, Basic, and Ultra tiers?", a: "Tiers determine your access level. 'Free' users have basic access with strict daily limits. 'Basic' users unlock premium notes and standard features. 'Ultra' users get unlimited access to the AI Hub, Premium Tests, and Advanced Analytics without daily restrictions." },
            { q: "How do I download my Smart Marksheet or Notes offline?", a: "After completing a test, your Marksheet is automatically saved for offline viewing. For Notes, look for the 'Download' or 'Save Offline' icon while reading. You can access all saved items anytime without internet in the 'Saved Items' section." },
            { q: "I ran out of my Daily Limit. What should I do?", a: "Daily limits reset every 24 hours. If you need immediate access, you can either spend your earned Coins to bypass the limit or upgrade your subscription tier (Basic/Ultra) for higher or unlimited usage." },
            { q: "How do I use the AI Study Planner effectively?", a: "Go to the 'AI Assistant' tab and select the Planner. Enter your upcoming exam dates, subjects you struggle with, and how many hours you can study daily. The AI will generate a strict, optimized timetable for you." }
        ]
    };
};
