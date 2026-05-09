import { User, DailyRoutine, RoutineTask } from '../types';

export const generateDailyRoutine = (user: User): DailyRoutine => {
    const today = new Date().toDateString();

    // 1. Identify Weak Topics (from mcqHistory)
    const weakTopics: {name: string, accuracy: number}[] = [];
    const topicStats: Record<string, { correct: number, total: number }> = {};

    // Analyze last 20 tests for better data
    (user.mcqHistory || []).slice(0, 20).forEach(result => {
        const topic = result.topic || result.chapterTitle || 'General';
        if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
        topicStats[topic].correct += result.correctCount;
        topicStats[topic].total += result.totalQuestions;
    });

    Object.keys(topicStats).forEach(topic => {
        const stats = topicStats[topic];
        const acc = stats.total > 0 ? stats.correct / stats.total : 0;
        if (stats.total > 3 && acc < 0.65) {
            weakTopics.push({ name: topic, accuracy: acc });
        }
    });

    // Sort by weakness (lowest accuracy first)
    weakTopics.sort((a,b) => a.accuracy - b.accuracy);

    // 2. Determine Strategy based on User Level & Weakness
    const streak = user.streak || 0;
    const isPowerUser = streak > 10;

    const tasks: RoutineTask[] = [];
    let focusArea = "Balanced Growth";

    // --- PHASE 1: WARM UP (15 Mins) ---
    tasks.push({
        title: "Morning Brain Warm-up",
        duration: 15,
        type: 'REVISION',
        description: "Review yesterday's notes or flashcards. Prepare your mind for deep work.",
        subject: "General"
    });

    // --- PHASE 2: DEEP WORK (WEAKNESS ATTACK) ---
    if (weakTopics.length > 0) {
        focusArea = `Mastering ${weakTopics[0].name}`;

        // Slot 1: Concept Building
        tasks.push({
            title: `Concept Surgery: ${weakTopics[0].name}`,
            duration: 45,
            type: 'DEEP_DIVE',
            description: `Your accuracy is only ${Math.round(weakTopics[0].accuracy*100)}%. Read the Premium Notes line-by-line. Focus on 'Why' not just 'What'.`,
            subject: weakTopics[0].name
        });

        // Slot 2: Targeted Practice
        tasks.push({
            title: `Precision Practice: ${weakTopics[0].name}`,
            duration: 30,
            type: 'PRACTICE',
            description: "Solve 20 MCQs specifically for this topic. Do NOT guess. Verify every answer.",
            subject: weakTopics[0].name
        });
    } else {
        // No weakness? Advance Syllabus
        focusArea = "Syllabus Advancement";

        tasks.push({
            title: "New Chapter Acquisition",
            duration: 60,
            type: 'NEW_TOPIC',
            description: "Select the next chapter in Physics or Math. Watch the video lecture without distractions.",
            subject: "Core Subject"
        });
    }

    // --- PHASE 3: BREAK (Strategic) ---
    tasks.push({
        title: "Cognitive Recharge",
        duration: 15,
        type: 'BREAK',
        description: "Step away from screen. Drink water. No social media. Let the information sink in."
    });

    // --- PHASE 4: SECONDARY SUBJECT (Rotation) ---
    const secondaryTopic = weakTopics.length > 1 ? weakTopics[1].name : "Chemistry/Biology";
    tasks.push({
        title: `Secondary Focus: ${secondaryTopic}`,
        duration: 40,
        type: 'NEW_TOPIC',
        description: "Switch gears to keep the brain active. Read introduction or solve basic problems.",
        subject: secondaryTopic
    });

    // --- PHASE 5: ACTIVE RECALL (Revision) ---
    tasks.push({
        title: "Spaced Repetition (Active Recall)",
        duration: 20,
        type: 'REVISION',
        description: "Pick a random topic from last week. Write down everything you remember without looking at notes.",
        subject: "Revision"
    });

    // --- PHASE 6: DAILY CHALLENGE ---
    tasks.push({
        title: "Daily Challenge & Streak Maintenance",
        duration: 15,
        type: 'PRACTICE',
        description: "Complete today's Daily Challenge. Compete on the leaderboard.",
        subject: "Mixed"
    });

    // --- PHASE 7: CLOSING ---
    if (isPowerUser) {
        tasks.push({
            title: "Advanced Problem Solving",
            duration: 30,
            type: 'PRACTICE',
            description: "Attempt 5 'Hard' level questions. Push your limits.",
            subject: "Competitive"
        });
    }

    return {
        date: today,
        tasks: tasks,
        focusArea: focusArea
    };
};
