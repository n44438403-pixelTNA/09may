import { User, ActiveSubscription, SystemSettings } from '../types';

export const recalculateSubscriptionStatus = (user: User, settings?: SystemSettings): User => {
    const now = new Date();
    let updatedUser = { ...user };

    // 0. Check Free Access Override (Admin Config)
    if (settings?.freeAccessConfig) {
        const { validUntil, classes } = settings.freeAccessConfig;
        if (validUntil && new Date(validUntil) > now) {
            // Check Class Match
            const userClass = user.classLevel || '';
            // Handle comma separated list cleaning if needed, but config assumes array
            if (classes && classes.length > 0 && (classes.includes(userClass) || classes.includes('ALL'))) {
                // Override as ULTRA
                updatedUser.isPremium = true;
                updatedUser.subscriptionTier = 'CUSTOM'; // Special Tier
                updatedUser.subscriptionLevel = 'ULTRA';
                updatedUser.subscriptionEndDate = validUntil;
                updatedUser.customSubscriptionName = 'Admin Free Access';
                return updatedUser;
            }
        }
    }

    // 1. Migration: If no activeSubscriptions but legacy fields exist, migrate them.
    if ((!updatedUser.activeSubscriptions || updatedUser.activeSubscriptions.length === 0) && updatedUser.subscriptionEndDate) {
        const legacyEndDate = new Date(updatedUser.subscriptionEndDate);
        if (legacyEndDate > now) {
            const currentTier = updatedUser.subscriptionTier === 'FREE' ? 'MONTHLY' : (updatedUser.subscriptionTier || 'MONTHLY');
            const legacySub: ActiveSubscription = {
                id: `legacy_${Date.now()}`,
                tier: currentTier,
                level: updatedUser.subscriptionLevel || 'BASIC',
                startDate: new Date().toISOString(), // Approximation
                endDate: updatedUser.subscriptionEndDate,
                source: updatedUser.grantedByAdmin ? 'ADMIN' : 'PURCHASE'
            };
            updatedUser.activeSubscriptions = [legacySub];
        }
    }

    const resetToFree = () => {
        updatedUser.isPremium = false;
        updatedUser.subscriptionTier = 'FREE';
        updatedUser.subscriptionLevel = undefined;
        updatedUser.subscriptionEndDate = undefined;
        updatedUser.activeSubscriptions = [];
        return updatedUser;
    };

    // If still no active subs or empty array
    if (!updatedUser.activeSubscriptions || updatedUser.activeSubscriptions.length === 0) {
        return resetToFree();
    }

    // 2. Filter Active Subscriptions (We only consider those not expired for the status)
    const activeSubs = updatedUser.activeSubscriptions.filter(sub => {
        const expDate = new Date(sub.endDate).getTime();
        return !isNaN(expDate) && expDate > now.getTime();
    });

    if (activeSubs.length === 0) {
        return resetToFree();
    }

    // 3. Find Best Subscription
    // Priority: Tier Value (LIFETIME > YEARLY > ...) -> Level (ULTRA > BASIC) -> Expiry (Later > Earlier)

    let bestSub = activeSubs[0];

    // Helper to score Tier Value
    const getTierScore = (tier: string) => {
        if (tier === 'LIFETIME') return 10;
        if (tier === 'YEARLY') return 5;
        if (tier === '3_MONTHLY') return 4;
        if (tier === 'MONTHLY') return 3;
        if (tier === 'WEEKLY') return 2;
        return 1;
    };

    // Helper to score Level
    const getLevelScore = (level: string) => {
        if (level === 'ULTRA') return 2;
        if (level === 'BASIC') return 1;
        return 0;
    };

    for (const sub of activeSubs) {
        // PRIORITY LOGIC:
        // 1. Highest Level wins (ULTRA > BASIC)
        // 2. If Levels Equal, Highest Tier Value wins (LIFETIME > YEARLY > ...)
        // 3. If Tiers Equal, Longest Duration wins (Later Expiry > Earlier)

        const bestLevelScore = getLevelScore(bestSub.level);
        const currentLevelScore = getLevelScore(sub.level);

        if (currentLevelScore > bestLevelScore) {
            bestSub = sub; // Upgrade Level takes precedence for ACCESS
        } else if (currentLevelScore === bestLevelScore) {
            // Level Tie-Breaker: Check Tier Value
            const bestTierScore = getTierScore(bestSub.tier);
            const currentTierScore = getTierScore(sub.tier);

            if (currentTierScore > bestTierScore) {
                bestSub = sub; // Higher Tier wins (e.g., Lifetime vs Weekly)
            } else if (currentTierScore === bestTierScore) {
                // Tier Tie-Breaker: Check Expiry
                // Note: Lifetime usually has very distant expiry, so this covers it too.
                const subExp = new Date(sub.endDate).getTime();
                const bestExp = new Date(bestSub.endDate).getTime();
                if (!isNaN(subExp) && !isNaN(bestExp) && subExp > bestExp) {
                    bestSub = sub;
                }
            }
        }
    }

    // Find the subscription with the absolute longest duration (to prevent display panic)
    let longestSub = activeSubs[0];
    for (const sub of activeSubs) {
        const subExp = new Date(sub.endDate).getTime();
        const longestExp = new Date(longestSub.endDate).getTime();
        if (!isNaN(subExp) && !isNaN(longestExp) && subExp > longestExp) {
            longestSub = sub;
        }
    }

    // 4. Update User Fields with the Best Subscription details
    updatedUser.isPremium = true;

    // DISPLAY FIX:
    // If we have a short-term ULTRA and a long-term BASIC (like Lifetime Basic),
    // the user might panic if their tier changes to "Weekly" and expiry looks short.
    // So we will grant them the `bestSub.level` (e.g. ULTRA) for access,
    // but the displayed Tier and Expiry will correspond to their longest active subscription.

    updatedUser.subscriptionTier = longestSub.tier;
    updatedUser.subscriptionLevel = bestSub.level;
    updatedUser.subscriptionEndDate = longestSub.endDate;

    return updatedUser;
};

export const addSubscription = (user: User, newSub: ActiveSubscription, settings?: SystemSettings): User => {
    const updatedUser = { ...user };
    if (!updatedUser.activeSubscriptions) updatedUser.activeSubscriptions = [];

    // User requested concurrent subscriptions ("Basic saath me rahega")
    // So we simply add it to the list.
    updatedUser.activeSubscriptions.push(newSub);

    // Recalculate the effective status
    return recalculateSubscriptionStatus(updatedUser, settings);
};
