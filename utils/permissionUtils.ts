import { SystemSettings, User } from '../types';
import { ALL_FEATURES } from './featureRegistry';

export type UserTier = 'FREE' | 'BASIC' | 'ULTRA';

export interface FeatureAccessResult {
    hasAccess: boolean;
    isHidden: boolean; // Indicates if the feature is completely hidden (e.g. from UI)
    cost: number;
    limit?: number; // Limit for current tier
    allowedTiers: UserTier[];
    userTier: UserTier;
    isDummy: boolean;
    reason?: 'TIER_RESTRICTED' | 'CREDIT_LOCKED' | 'DUMMY_FEATURE' | 'GRANTED' | 'FEED_LOCKED';
}

/**
 * Determines the effective tier of a user.
 */
export const getUserTier = (user: User | null): UserTier => {
    if (!user) return 'FREE';

    // Check if subscription is active
    const isSubscribed = user.subscriptionTier && user.subscriptionTier !== 'FREE';

    // Also check legacy isPremium flag if needed, or rely on subscriptionTier
    const isPremium = user.isPremium || isSubscribed;

    if (!isPremium) return 'FREE';

    // If premium, check level
    if (user.subscriptionLevel === 'ULTRA') return 'ULTRA';

    // Default to BASIC for any other premium status
    return 'BASIC';
};

/**
 * Checks if a user has access to a specific feature based on dynamic settings and static registry.
 */
export const checkFeatureAccess = (
    featureId: string,
    user: User | null,
    settings: SystemSettings
): FeatureAccessResult => {
    // 0. Admin / Sub-Admin Bypass
    if (user?.role === 'ADMIN' || user?.isSubAdmin) {
        return {
            hasAccess: true,
            isHidden: false,
            cost: 0,
            allowedTiers: ['FREE', 'BASIC', 'ULTRA'],
            userTier: 'ULTRA',
            isDummy: false,
            reason: 'GRANTED'
        };
    }

    const userTier = getUserTier(user);

    // 1. Get Dynamic Config from Settings (FEED)
    // Supports both old Array format (featureAccess) and new Map format (featureConfig)
    let dynamicConfig = settings.featureConfig?.[featureId];

    if (!dynamicConfig && settings.featureAccess) {
        dynamicConfig = settings.featureAccess.find(c => c.featureId === featureId);
    }

    // 2. Get Static Config from Registry
    const staticConfig = ALL_FEATURES.find(f => f.id === featureId);

    // 3. Determine Allowed Tiers
    let allowedTiers: UserTier[] = [];
    let isFeedControl = false;

    // --- STRICT FEED CONTROL LOGIC ---
    // If a configuration exists in Feature Access (Feed), it overrides EVERYTHING.
    if (dynamicConfig) {
        isFeedControl = true;

        // If visible is explicitly FALSE, it's locked for everyone (unless overridden by tiers?)
        // The previous logic said "if visible is FALSE, fallback to Matrix".
        // User requested: "plan Matrix nahibkarega Future lock unlock... sab control karega Future access page".
        // This implies if it's in Feed, Feed rules apply 100%.

        if (dynamicConfig.visible === false) {
            // STRICT FEED CONTROL: User explicitly requested App Soul to control all access.
            // If visible is FALSE, it means "LOCKED" (No Access), NOT "Use Matrix".
            allowedTiers = []; // Explicitly Deny Access
            // Keep isFeedControl = true to prevent Matrix fallback
        } else {
            // FEED MODE IS ACTIVE
            if (dynamicConfig.allowedTiers && dynamicConfig.allowedTiers.length > 0) {
                allowedTiers = dynamicConfig.allowedTiers;
            } else if (dynamicConfig.minTier) {
                // Legacy support
                if (dynamicConfig.minTier === 'ULTRA') allowedTiers = ['ULTRA'];
                else if (dynamicConfig.minTier === 'BASIC') allowedTiers = ['BASIC', 'ULTRA'];
                else allowedTiers = ['FREE', 'BASIC', 'ULTRA'];
            } else {
                // If config exists but no tiers specified, assume NO ACCESS (Strict) or FULL ACCESS?
                // Admin UI defaults to all selected. If empty, it means none selected.
                allowedTiers = [];
            }
        }
    }

    // --- MATRIX FALLBACK (Only if Feed is NOT active) ---
    if (!isFeedControl) {
        if (settings.tierPermissions) {
            if (settings.tierPermissions.FREE?.includes(featureId)) allowedTiers.push('FREE');
            if (settings.tierPermissions.BASIC?.includes(featureId)) allowedTiers.push('BASIC');
            if (settings.tierPermissions.ULTRA?.includes(featureId)) allowedTiers.push('ULTRA');
        }

        // Final Fallback to Static Registry if Matrix is empty/missing
        if (allowedTiers.length === 0) {
             if (staticConfig?.requiredSubscription) {
                if (staticConfig.requiredSubscription === 'ULTRA') allowedTiers = ['ULTRA'];
                else if (staticConfig.requiredSubscription === 'BASIC') allowedTiers = ['BASIC', 'ULTRA'];
                else allowedTiers = ['FREE', 'BASIC', 'ULTRA'];
             } else {
                allowedTiers = ['FREE', 'BASIC', 'ULTRA'];
             }
        }
    }

    // 4. Determine Cost (Feed Only)
    const cost = (isFeedControl && dynamicConfig?.creditCost !== undefined) ? dynamicConfig.creditCost : 0;

    // 5. Determine Dummy Status (Feed overrides)
    const isDummy = (isFeedControl && dynamicConfig?.isDummy !== undefined) ? dynamicConfig.isDummy : (staticConfig?.isDummy || false);

    // 6. Determine Limit (Feed Only)
    let limit: number | undefined;
    if (isFeedControl && dynamicConfig?.limits) {
        if (userTier === 'FREE') limit = dynamicConfig.limits.free;
        else if (userTier === 'BASIC') limit = dynamicConfig.limits.basic;
        else if (userTier === 'ULTRA') limit = dynamicConfig.limits.ultra;
    }

    // 7. Check Access
    const hasAccess = allowedTiers.includes(userTier);

    // 8. Determine Hidden Status
    // A feature is considered "hidden" if the dynamic config explicitly sets `visible` to false.
    // The prompt requested: "hide kiya hua chijhe wo logo ko na dikhega".
    const isHidden = dynamicConfig?.visible === false;

    let reason: FeatureAccessResult['reason'] = hasAccess ? 'GRANTED' : 'TIER_RESTRICTED';

    if (!hasAccess && isFeedControl) {
        reason = 'FEED_LOCKED'; // Explicitly blocked by Feed
    }

    if (isDummy) {
        reason = 'DUMMY_FEATURE';
    }

    return {
        hasAccess,
        isHidden,
        cost,
        limit,
        allowedTiers,
        userTier,
        isDummy,
        reason
    };
};
