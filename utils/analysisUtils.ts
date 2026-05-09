import { MCQItem, MCQResult } from '../types';

export const generateLocalAnalysis = (
  questions: MCQItem[],
  userAnswers: Record<number, number>,
  score: number,
  total: number,
  chapterName: string,
  subjectName: string
): string => {
  const percentage = Math.round((score / total) * 100);

  // 1. TOPIC ANALYSIS
  const topicStats: Record<string, { total: number, correct: number }> = {};

  questions.forEach((q, idx) => {
    const topic = q.topic ? q.topic.trim() : 'General';
    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, correct: 0 };
    }

    topicStats[topic].total += 1;

    // Check correctness
    // userAnswers keys might be string or number, ensure safe access
    const selected = userAnswers[idx];
    if (selected === q.correctAnswer) {
      topicStats[topic].correct += 1;
    }
  });

  const strongTopics: string[] = [];
  const weakTopics: string[] = [];
  const averageTopics: string[] = [];

  Object.entries(topicStats).forEach(([topic, stats]) => {
    const p = (stats.correct / stats.total) * 100;
    if (p >= 80) strongTopics.push(topic);
    else if (p < 50) weakTopics.push(topic);
    else averageTopics.push(topic);
  });

  // 2. GENERATE MARKDOWN
  let report = `# AI Performance Analysis: ${chapterName}\n\n`;

  // Summary Section
  report += `## 📊 Performance Summary\n`;
  report += `**Score:** ${score}/${total} (${percentage}%)\n`;
  report += `**Subject:** ${subjectName}\n\n`;

  if (percentage >= 90) {
    report += `🌟 **Outstanding!** You have mastered this chapter. Keep up the excellent work!\n\n`;
  } else if (percentage >= 70) {
    report += `✅ **Good Job!** You have a solid understanding, but there are a few gaps to close.\n\n`;
  } else if (percentage >= 50) {
    report += `⚠️ **Needs Improvement.** You have grasped the basics, but need more practice on specific topics.\n\n`;
  } else {
    report += `🛑 **Critical Attention Needed.** Your core concepts need revision. Please review the recommended notes.\n\n`;
  }

  // Topics Section
  report += `## 🧠 Topic Breakdown\n\n`;

  if (strongTopics.length > 0) {
    report += `### ✅ Strong Topics (Keep it up!)\n`;
    strongTopics.forEach(t => report += `- **${t}**\n`);
    report += `\n`;
  }

  if (averageTopics.length > 0) {
    report += `### ⚖️ Average Topics (Review needed)\n`;
    averageTopics.forEach(t => report += `- ${t}\n`);
    report += `\n`;
  }

  if (weakTopics.length > 0) {
    report += `### ❌ Weak Topics (Immediate Focus)\n`;
    weakTopics.forEach(t => report += `- **${t}**\n`);
    report += `\n`;
  } else if (strongTopics.length === 0 && averageTopics.length === 0) {
    report += `No specific topic data available. Please review the entire chapter.\n\n`;
  } else if (weakTopics.length === 0) {
    report += `🎉 **No weak topics detected!** You are ready for the next level.\n\n`;
  }

  // Action Plan
  report += `## 🚀 Action Plan\n`;
  if (weakTopics.length > 0) {
    report += `1. **Revise Concepts:** Focus on ${weakTopics.slice(0, 3).join(', ')}.\n`;
    report += `2. **Read Notes:** Check the Premium Recommended Notes for these topics.\n`;
    report += `3. **Retake Test:** Attempt the test again after 2 days to consolidate memory.\n`;
  } else {
    report += `1. **Challenge Yourself:** Try a harder test or move to the next chapter.\n`;
    report += `2. **Teach Others:** Explaining concepts is the best way to master them.\n`;
  }

  // Motivation
  const quotes = [
    "Success is the sum of small efforts, repeated day in and day out.",
    "The expert in anything was once a beginner.",
    "Don't stop until you're proud.",
    "Your potential is endless. Go do what you were created to do."
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  report += `\n> *"${randomQuote}"*`;

  return report;
};

export const generateAnalysisJson = (
  questions: MCQItem[],
  userAnswers: Record<number, number>,
  userHistory?: MCQResult[],
  chapterId?: string
): string => {
  const topicStats: Record<string, { total: number, correct: number }> = {};

  questions.forEach((q, idx) => {
    const topic = q.topic ? q.topic.trim() : 'General';
    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, correct: 0 };
    }

    topicStats[topic].total += 1;

    // Check correctness
    // remappedAnswers are indexed 0,1,2... matching submittedQuestions
    const selected = userAnswers[idx];
    if (selected === q.correctAnswer) {
      topicStats[topic].correct += 1;
    }
  });

  const topics = Object.keys(topicStats).map(t => {
      const s = topicStats[t];
      const percent = Math.round((s.correct / s.total) * 100);
      let status = 'AVERAGE';
      if (percent >= 80) status = 'STRONG';
      else if (percent < 50) status = 'WEAK';

      let actionPlan = status === 'WEAK' ? 'Focus on basic concepts and practice more questions from this topic.' : 'Good job! Keep revising to maintain speed.';

      // Attempt to find historical performance for this topic
      if (userHistory && userHistory.length > 0) {
          // Sort history by date descending
          const sortedHistory = [...userHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          let previousTopicPercent: number | null = null;

          // Look for the most recent past test that has data for this specific topic
          for (const pastResult of sortedHistory) {
              if (pastResult.topicAnalysis && pastResult.topicAnalysis[t]) {
                  // We found a past attempt containing this topic!
                  previousTopicPercent = pastResult.topicAnalysis[t].percentage;
                  break;
              }
          }

          if (previousTopicPercent !== null) {
              const diff = percent - previousTopicPercent;
              if (diff > 0) {
                  actionPlan += ` Pichhli test me aapka score ${previousTopicPercent}% tha, abhi ${percent}% aaya hai. Achhi improvement hai, keep it up!`;
              } else if (diff < 0) {
                  actionPlan += ` Dhyan dein: Pichhli test me aapka score ${previousTopicPercent}% tha, abhi gir kar ${percent}% ho gaya hai. Aapko aur revision ki zaroorat hai.`;
              } else {
                  actionPlan += ` Pichhli test me bhi aapka score ${previousTopicPercent}% tha. Score consistent hai, par aage badhne ki koshish karein.`;
              }
          }
      }

      return {
          name: t,
          status,
          total: s.total,
          correct: s.correct,
          percent: percent,
          actionPlan: actionPlan,
          studyMode: status === 'WEAK' ? 'DEEP_STUDY' : 'QUICK_REVISION'
      };
  });

  // Calculate overall percentage for motivation
  const totalCorrect = Object.values(topicStats).reduce((acc, s) => acc + s.correct, 0);
  const totalQuestions = Object.values(topicStats).reduce((acc, s) => acc + s.total, 0);
  const overallPercent = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  return JSON.stringify({
      motivation: overallPercent > 80 ? "Excellent Performance! You are on track." : "Keep working hard. You can improve!",
      topics: topics,
  });
};
