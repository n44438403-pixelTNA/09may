import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

    console.log("Navigating to app...");
    await page.goto('http://localhost:5000/?mock=dashboard');

    await page.evaluate(() => {
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('nst_has_seen_welcome', 'true');
        localStorage.setItem('nst_ai_terms_accepted', 'true');
        localStorage.setItem('nst_terms_accepted', 'true');
        localStorage.setItem('nst_board_setup_complete', 'true');

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 3);

        const mockUser = {
            uid: '12345',
            name: 'John Doe',
            isPremium: true,
            subscriptionTier: 'PREMIUM',
            subscriptionLevel: 'PRO',
            classLevel: '10',
            board: 'CBSE',
            mcqHistory: [
                {
                    id: 'hist1',
                    userId: '12345',
                    chapterId: '1',
                    subjectId: 'Science',
                    subjectName: 'Science',
                    chapterTitle: 'Matter in Our Surroundings',
                    date: pastDate.toISOString(),
                    type: 'MCQ_TEST',
                    score: 40,
                    totalQuestions: 10,
                    correctCount: 4,
                    wrongCount: 6,
                    totalTimeSeconds: 60,
                    averageTimePerQuestion: 6,
                    performanceTag: 'NEEDS_WORK',
                    ultraAnalysisReport: JSON.stringify({
                        topics: [{ name: "States of Matter", status: "WEAK" }]
                    })
                }
            ]
        };
        localStorage.setItem('nst_user', JSON.stringify(mockUser));
        sessionStorage.setItem('nst_has_seen_intro_video', 'true');
        sessionStorage.setItem('nst_has_loaded', 'true');

        const demoContent = {
            metadata: { title: "Matter in Our Surroundings" },
            notes: [
                { id: "note1", title: "States of Matter", content: "Solid, liquid, gas." }
            ],
            mcqs: [
                { id: "mcq1", question: "Which is a state?", options: ["Solid", "Energy"], correctAnswer: "Solid", topic: "States of Matter" }
            ],
            videos: [],
            deepDive: []
        };
        localStorage.setItem('nst_content_CBSE_10_Science_1', JSON.stringify(demoContent));
    });

    await page.reload();
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        const revTab = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Revision'));
        if (revTab) revTab.click();
    });
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        window.scrollBy(0, 500);
    });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'revision_test_7.png' });

    await browser.close();
})();
