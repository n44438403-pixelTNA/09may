import { User } from '../types';

export interface StudyPlan {
    title: string;
    summary: string;
    weakAreas: string[];
    routine: {
        time: string;
        subject: string;
        topic: string;
        activity: string;
        duration: string;
    }[];
    motivation: string;
}

export const generateSmartStudyPlan = (user: User): StudyPlan => {
    // 1. Analyze History
    const history = user.mcqHistory || [];

    // Group scores by Chapter Title (Topic)
    const topicStats: Record<string, { totalScore: number, totalMax: number, subject: string }> = {};

    history.forEach(h => {
        const key = h.chapterTitle;
        if (!topicStats[key]) {
            topicStats[key] = { totalScore: 0, totalMax: 0, subject: h.subjectName || 'General' };
        }
        topicStats[key].totalScore += h.score;
        topicStats[key].totalMax += h.totalQuestions;
    });

    // Calculate Percentage & Find Weakest
    const weakTopics = Object.entries(topicStats)
        .map(([topic, stats]) => ({
            topic,
            subject: stats.subject,
            percentage: (stats.totalScore / stats.totalMax) * 100
        }))
        .filter(item => item.percentage < 60) // Threshold for weakness
        .sort((a, b) => a.percentage - b.percentage) // Ascending order (weakest first)
        .slice(0, 10); // Top 10 weakest

    // 2. Build Plan
    const routine = [];
    const motivationalQuotes = [
        "Mistakes are proof that you are trying.",
        "The expert in anything was once a beginner.",
        "Don't stop until you're proud.",
        "Your only limit is your mind."
    ];

    if (weakTopics.length > 0) {
        // Morning Slot
        if (weakTopics[0]) {
            routine.push({
                time: "Morning (Focus)",
                subject: weakTopics[0].subject,
                topic: `${weakTopics[0].topic} (Weakest: ${Math.round(weakTopics[0].percentage)}%)`,
                activity: "Read Notes & Watch Video Concept",
                duration: "45 mins"
            });
        }

        // Afternoon Slot
        if (weakTopics[1] || weakTopics[0]) {
            const t = weakTopics[1] || weakTopics[0];
            routine.push({
                time: "Afternoon (Practice)",
                subject: t.subject,
                topic: t.topic,
                activity: "Solve 20 MCQs & Analyze Mistakes",
                duration: "60 mins"
            });
        }

        // Evening Slot (Revision of others)
        if (weakTopics.length > 2) {
            routine.push({
                time: "Evening (Review)",
                subject: "Mixed",
                topic: "Review other weak areas",
                activity: "Quick Revision of Notes",
                duration: "30 mins"
            });
        }
    } else {
        // No weak topics found? Generic Plan
        routine.push({
            time: "Morning",
            subject: "Any",
            topic: "Start a New Chapter",
            activity: "Concept Learning",
            duration: "60 mins"
        });
    }

    return {
        title: "Smart Weakness Attack Plan",
        summary: `Identified ${weakTopics.length} weak areas based on your past performance. Focusing on the most critical ones today.`,
        weakAreas: weakTopics.map(w => `${w.topic} (${Math.round(w.percentage)}%)`),
        routine: routine,
        motivation: motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
    };
};
