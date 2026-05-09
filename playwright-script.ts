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

    // Set bypass flags
    await page.evaluate(() => {
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('nst_has_seen_welcome', 'true');
        localStorage.setItem('nst_ai_terms_accepted', 'true');
        localStorage.setItem('nst_terms_accepted', 'true');
        localStorage.setItem('nst_board_setup_complete', 'true');

        localStorage.setItem('nst_user', JSON.stringify({
            uid: '12345',
            name: 'John Doe',
            isPremium: true,
            subscriptionTier: 'PREMIUM',
            subscriptionLevel: 'PRO',
            subscriptionEndDate: new Date(Date.now() + 86400000 * 30).toISOString(),
            profileCompleted: true
        }));
        sessionStorage.setItem('nst_has_loaded', 'true');
    });

    await page.reload();
    await page.waitForTimeout(3000);

    console.log("Taking screenshot...");
    await page.screenshot({ path: 'auth_page_verification.png' });

    await browser.close();
})();
