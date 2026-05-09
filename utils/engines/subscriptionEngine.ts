import { User } from '../../types';

export const SubscriptionEngine = {
    isPremium: (user: User): boolean => {
        if (!user.isPremium) return false;
        if (!user.subscriptionEndDate) return false;
        return new Date(user.subscriptionEndDate) > new Date();
    },

    getTier: (user: User) => {
        if (!SubscriptionEngine.isPremium(user)) return 'FREE';
        return user.subscriptionTier || 'FREE';
    },

    getLevel: (user: User) => {
        if (!SubscriptionEngine.isPremium(user)) return undefined;
        return user.subscriptionLevel || 'BASIC';
    },

    checkAccess: (user: User, requiredTier: 'FREE' | 'BASIC' | 'ULTRA' = 'FREE'): boolean => {
        if (requiredTier === 'FREE') return true;
        if (!SubscriptionEngine.isPremium(user)) return false;

        const userLevel = user.subscriptionLevel || 'BASIC';

        if (requiredTier === 'ULTRA') {
            return userLevel === 'ULTRA';
        }

        // Basic Access (Basic or Ultra can access)
        return true;
    },

    getDaysRemaining: (user: User): number => {
        if (!user.subscriptionEndDate) return 0;
        const diff = new Date(user.subscriptionEndDate).getTime() - Date.now();
        if (diff <= 0) return 0;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
};
