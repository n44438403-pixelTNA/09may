
export type FeatureGroup = 'CORE' | 'ANALYSIS' | 'AI' | 'GAME' | 'ADMIN' | 'ADVANCED' | 'CONTENT' | 'TOOLS' | 'REVISION' | 'SOUL' | 'NSTA_CONTROL' | 'REQUESTS';

export interface Feature {
    id: string;
    label: string;
    group: FeatureGroup;
    surfaceLevel: 1 | 2 | 3; // 1 = Dashboard, 2 = Tools/Expandable, 3 = Drawer/Hidden
    requiredSubscription?: 'FREE' | 'BASIC' | 'ULTRA';
    adminVisible: boolean;
    isExperimental?: boolean;
    description?: string;
    icon?: string; // Lucide icon name
    adminTab?: string; // Corresponds to AdminTab in AdminDashboard.tsx
    color?: string; // Tailwind color name (e.g., 'blue', 'red')
    path?: string; // Navigation path for Student Dashboard
    requiredPermission?: string; // Admin Permission ID
    requiresSuperAdmin?: boolean; // Only for Role === 'ADMIN'
    isDummy?: boolean; // NEW: Explicitly mark as Dummy/Placeholder
}

export const ALL_FEATURES: Feature[] = [
    // --- CORE (Layer 1: Daily Core Actions - Max 6) ---
    {
        id: 'START_STUDY',
        label: 'Start Study',
        group: 'CORE',
        surfaceLevel: 1,
        adminVisible: true,
        path: 'COURSES',
        icon: 'Book',
        description: 'Access your main courses and subjects.'
    },
    {
        id: 'MCQ_PRACTICE',
        label: 'MCQ Practice',
        group: 'CORE',
        surfaceLevel: 1,
        adminVisible: true,
        path: 'MCQ',
        icon: 'CheckSquare',
        description: 'Practice unlimited questions.'
    },
    {
        id: 'REVISION_HUB',
        label: 'Revision Hub',
        group: 'CORE',
        surfaceLevel: 1,
        requiredSubscription: 'FREE',
        adminVisible: true,
        path: 'REVISION',
        icon: 'BrainCircuit',
        description: 'Smart revision based on your weak topics.'
    },
    {
        id: 'MY_ANALYSIS',
        label: 'My Analysis',
        group: 'CORE',
        surfaceLevel: 1,
        adminVisible: true,
        path: 'ANALYTICS',
        icon: 'BarChart3',
        description: 'Track your progress and performance.'
    },
    {
        id: 'WEAK_TOPICS',
        label: 'Weak Topics',
        group: 'CORE',
        surfaceLevel: 1,
        requiredSubscription: 'BASIC',
        adminVisible: true,
        path: 'REVISION',
        icon: 'AlertCircle',
        description: 'Focus instantly on your weakest areas.',
        isDummy: true // Integrated in Revision Hub
    },
    {
        id: 'CONTINUE_LAST',
        label: 'Continue Last',
        group: 'CORE',
        surfaceLevel: 1,
        adminVisible: true,
        path: 'CONTINUE',
        icon: 'PlayCircle',
        description: 'Resume exactly where you left off.',
        isDummy: true // Not implemented
    },

    // --- NEW STUDENT UI ELEMENTS ---
    {
        id: 'INBOX',
        label: 'Inbox',
        group: 'CORE',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'Mail',
        description: 'Student messages and notifications.'
    },
    {
        id: 'UPDATES',
        label: 'Notifications',
        group: 'CORE',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'Bell',
        description: 'App updates and global alerts.'
    },
    {
        id: 'MARKSHEET',
        label: 'Marksheet',
        group: 'ANALYSIS',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'FileText',
        description: 'Monthly and annual performance report.'
    },
    {
        id: 'HISTORY_PAGE',
        label: 'History',
        group: 'CORE',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'History',
        description: 'View past test attempts and study history.'
    },
    {
        id: 'MY_PLAN',
        label: 'My Plan',
        group: 'CONTENT',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'CreditCard',
        description: 'View active subscription and history.'
    },
    {
        id: 'PRIZES',
        label: 'Prizes',
        group: 'GAME',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'Trophy',
        description: 'View available prizes and rewards.'
    },
    {
        id: 'GUIDE',
        label: 'App Guide',
        group: 'TOOLS',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'HelpCircle',
        description: 'Help and documentation for students.'
    },
    {
        id: 'PROFILE_PAGE',
        label: 'Profile',
        group: 'CORE',
        surfaceLevel: 2,
        adminVisible: true,
        icon: 'User',
        description: 'User profile and settings.'
    },

    // --- NEW TOP & BOTTOM NAV CONTROLS ---
    {
        id: 'NAV_LANGUAGE',
        label: 'Language Toggle',
        group: 'TOOLS',
        surfaceLevel: 1,
        adminVisible: true,
        icon: 'Globe',
        description: 'Toggle between Hindi and English.'
    },
    {
        id: 'NAV_STORE_CREDITS',
        label: 'Store & Credits',
        group: 'CONTENT',
        surfaceLevel: 1,
        adminVisible: true,
        icon: 'Crown',
        description: 'Access store and view credits.'
    },
    {
        id: 'NAV_SALE_BANNER',
        label: 'Sale Banner',
        group: 'TOOLS',
        surfaceLevel: 1,
        adminVisible: true,
        icon: 'Zap',
        description: 'Show active sale banners.'
    },

    {
        id: 'NAV_HOME',
        label: 'Home Tab',
        group: 'CORE',
        surfaceLevel: 1,
        adminVisible: true,
        icon: 'Home',
        description: 'Bottom navigation home tab.'
    },

    // --- SECONDARY (Layer 2: Tools & Exploration) ---
    {
        id: 'TOOLS',
        label: 'Tools',
        group: 'TOOLS',
        surfaceLevel: 2,
        adminVisible: true,
        path: 'TOOLS',
        icon: 'Wrench',
        description: 'Calculators, converters, and more.',
        isDummy: true // Placeholder
    },
    {
        id: 'GAMES',
        label: 'Game Zone',
        group: 'GAME',
        surfaceLevel: 2,
        adminVisible: true,
        path: 'GAME',
        icon: 'Gamepad2',
        description: 'Relax and earn rewards.'
    },
    {
        id: 'STORE_ACCESS',
        label: 'Store',
        group: 'CONTENT',
        surfaceLevel: 2,
        adminVisible: true,
        path: 'STORE',
        icon: 'ShoppingBag',
        description: 'Upgrade your plan and buy credits.'
    },
    {
        id: 'LEADERBOARD',
        label: 'Leaderboard',
        group: 'GAME',
        surfaceLevel: 2,
        adminVisible: true,
        path: 'LEADERBOARD',
        icon: 'Trophy',
        description: 'Compete with others globally.'
    },
    {
        id: 'PREMIUM_ACCESS',
        label: 'Premium',
        group: 'CONTENT',
        surfaceLevel: 2,
        adminVisible: true,
        path: 'SUB_HISTORY',
        icon: 'Crown',
        description: 'Manage your subscription.'
    },

    // --- DRAWER / HIDDEN (Layer 3) ---
    {
        id: 'ADMIN_PANEL',
        label: 'Admin Panel',
        group: 'ADMIN',
        surfaceLevel: 3,
        adminVisible: true,
        path: 'ADMIN_DASHBOARD',
        icon: 'Shield',
        requiresSuperAdmin: true
    },
    {
        id: 'REDEEM_CODE',
        label: 'Redeem Code',
        group: 'TOOLS',
        surfaceLevel: 3,
        adminVisible: true,
        path: 'REDEEM',
        icon: 'Gift'
    },
    {
        id: 'LOGS_DEBUG',
        label: 'Logs & Debug',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        path: 'LOGS',
        icon: 'Terminal',
        isDummy: true
    },

    // --- REVISION SUB-FEATURES (Internal to Revision Hub) ---
    {
        id: 'REVISION_AI_PLAN',
        label: 'AI Study Plan',
        group: 'REVISION',
        surfaceLevel: 2,
        requiredSubscription: 'ULTRA',
        adminVisible: true,
        description: 'Generate AI-based study plans.',
        isDummy: true // Integrated Logic (Non-Switchable)
    },
    {
        id: 'REVISION_MISTAKES',
        label: 'Mistakes Review',
        group: 'REVISION',
        surfaceLevel: 2,
        adminVisible: true,
        description: 'Review your past mistakes.',
        isDummy: true // Integrated Logic (Non-Switchable)
    },

    // --- AI SUB-FEATURES ---
    {
        id: 'AI_CHAT',
        label: 'AI Chat Tutor',
        group: 'AI',
        surfaceLevel: 2,
        requiredSubscription: 'ULTRA',
        adminVisible: true,
        icon: 'MessageSquare',
        description: 'Chat with AI for doubt solving.'
    },
    {
        id: 'AI_GENERATOR',
        label: 'AI Notes Gen',
        group: 'AI',
        surfaceLevel: 2,
        requiredSubscription: 'BASIC',
        adminVisible: true,
        icon: 'FileText',
        description: 'Generate custom notes.'
    },

    // --- CONTENT SUB-FEATURES ---
    {
        id: 'VIDEO_ACCESS',
        label: 'Video Lectures',
        group: 'CONTENT',
        surfaceLevel: 1,
        adminVisible: true,
        description: 'Access video content.'
    },
    {
        id: 'NOTES_ACCESS',
        label: 'Premium Notes',
        group: 'CONTENT',
        surfaceLevel: 1,
        adminVisible: true,
        description: 'Access PDF and HTML notes.'
    },
    {
        id: 'AUDIO_LIBRARY',
        label: 'Audio Library',
        group: 'CONTENT',
        surfaceLevel: 2,
        adminVisible: true,
        description: 'Listen to audio lessons.'
    },
    {
        id: 'COMPETITION_MODE',
        label: 'Competition Mode',
        group: 'CONTENT',
        surfaceLevel: 2,
        requiredSubscription: 'ULTRA',
        adminVisible: true,
        description: 'High-level content for exams.'
    },
    {
        id: 'DOWNLOAD_PDF',
        label: 'Download PDF',
        group: 'TOOLS',
        surfaceLevel: 2,
        requiredSubscription: 'BASIC',
        adminVisible: true,
        description: 'Save content offline.'
    },
    {
        id: 'DEEP_DIVE',
        label: 'Deep Dive',
        group: 'CONTENT',
        surfaceLevel: 2,
        requiredSubscription: 'FREE',
        creditCost: 1,
        adminVisible: true,
        description: 'Detailed HTML notes with audio (Costs 1 credit).'
    },
    {
        id: 'AUDIO_SLIDE',
        label: 'Audio Slides',
        group: 'CONTENT',
        surfaceLevel: 2,
        requiredSubscription: 'ULTRA',
        adminVisible: true,
        description: 'Synchronized audio and visual slides.'
    },
    {
        id: 'PREMIUM_NOTES',
        label: 'Premium Notes',
        group: 'CONTENT',
        surfaceLevel: 1,
        requiredSubscription: 'BASIC',
        adminVisible: true,
        description: 'Control access to Premium (PDF+TTS) notes.',
        // adminTab removed to hide from Admin Dashboard
    },
    {
        id: 'PREMIUM_VIDEO',
        label: 'Premium Video',
        group: 'CONTENT',
        surfaceLevel: 1,
        requiredSubscription: 'ULTRA',
        adminVisible: true,
        description: 'Control access to Premium Video Series (Google Drive).',
        // adminTab removed to hide from Admin Dashboard
    },
    {
        id: 'ADDITIONAL_NOTES',
        label: 'Additional Notes',
        group: 'CONTENT',
        surfaceLevel: 1,
        requiredSubscription: 'BASIC',
        adminVisible: true,
        description: 'Control access to Additional Resources tab.',
        // adminTab removed to hide from Admin Dashboard
    },

    // --- APP SOUL (RARE FEATURES) ---
    { id: 'QUICK_REVISION', label: 'Quick Revision', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Rapid revision mode control.' },
    { id: 'MCQ_FREE', label: 'Free Practice', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Control free MCQ access.' },
    { id: 'MCQ_PREMIUM', label: 'Premium Test', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Control premium MCQ access.' },
    { id: 'REVISION_HUB_FREE', label: 'Revision Hub (Free)', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Basic revision features.' },
    { id: 'REVISION_HUB_PREMIUM', label: 'Revision Hub (Premium)', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Advanced revision features.' },
    { id: 'TOPIC_CONTENT', label: 'Topic Content', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Control topic-specific content visibility.' },
    { id: 'REQUEST_CONTENT', label: 'Request Content', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Enable/Disable content requests.' },
    { id: 'AI_STUDIO', label: 'AI Studio', group: 'SOUL', surfaceLevel: 2, adminVisible: true, description: 'Control AI Studio features.' },

    // --- MARKSHEET FEATURES (App Soul Controlled) ---
    { id: 'MS_RECOMMEND', label: 'Recommend Notes', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true, description: 'Control Recommend Notes tab in Marksheet.' },
    { id: 'MS_OMR', label: 'OMR', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true, description: 'Control OMR tab in Marksheet.' },
    { id: 'MS_AI_INSIGHTS', label: 'AI Insights', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true, description: 'Control AI Insights tab in Marksheet.' },
    { id: 'MS_MISTAKES', label: 'Mistakes', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true, description: 'Control Mistakes tab in Marksheet.' },
    { id: 'MS_ANALYSIS', label: 'Analysis', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true, description: 'Control Analysis tab in Marksheet.' },
    { id: 'MS_OFFICIAL', label: 'Official Marksheet', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true, description: 'Control Official Marksheet tab.' },


    // --- ADMIN DASHBOARD FEATURES (Mapped to Admin Tabs) ---
    // GROUP: CORE ADMIN
    {
        id: 'ADMIN_USERS',
        label: 'Users',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'USERS',
        requiredPermission: 'VIEW_USERS',
        icon: 'Users',
        color: 'blue'
    },
    {
        id: 'ADMIN_SUB_ADMINS',
        label: 'Sub-Admins',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'SUB_ADMINS',
        requiredPermission: 'MANAGE_SUB_ADMINS',
        icon: 'ShieldCheck',
        color: 'indigo'
    },
    {
        id: 'ADMIN_TEACHERS',
        label: 'Teachers',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'TEACHERS',
        requiredPermission: 'VIEW_USERS', // Adjust as needed
        icon: 'GraduationCap',
        color: 'purple'
    },
    {
        id: 'ADMIN_SUBSCRIPTIONS',
        label: 'Subscriptions',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'SUBSCRIPTION_MANAGER',
        requiredPermission: 'MANAGE_SUBS',
        icon: 'CreditCard',
        color: 'purple'
    },
    {
        id: 'ADMIN_SUBJECTS',
        label: 'Subjects',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'SUBJECTS_MGR',
        requiredPermission: 'MANAGE_SYLLABUS',
        icon: 'Book',
        color: 'emerald'
    },
    {
        id: 'ADMIN_STORE',
        label: 'Store Manager',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'STORE_MANAGER',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'ShoppingBag',
        color: 'purple'
    },

    // --- NOTIFICATION & REQUESTS GROUP ---
    {
        id: 'ADMIN_NOTIFY',
        label: 'Notify Users',
        group: 'REQUESTS',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'NOTIFY_USERS',
        requiresSuperAdmin: true,
        icon: 'Megaphone',
        color: 'pink'
    },
    {
        id: 'ADMIN_DEMANDS',
        label: 'Demands',
        group: 'REQUESTS',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'DEMAND',
        requiredPermission: 'VIEW_DEMANDS',
        icon: 'Megaphone',
        color: 'orange'
    },
    {
        id: 'ADMIN_GLOBAL_CHAT',
        label: 'Chat Hub',
        group: 'REQUESTS',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'GLOBAL_CHAT',
        requiredPermission: 'VIEW_DEMANDS',
        icon: 'MessageSquare',
        color: 'blue'
    },
    {
        id: 'ADMIN_ACCESS',
        label: 'Login Requests',
        group: 'REQUESTS',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'ACCESS',
        requiredPermission: 'APPROVE_LOGIN_REQS',
        icon: 'Key',
        color: 'purple'
    },

    // GROUP: CONTENT / ANALYSIS
    {
        id: 'ADMIN_CONTENT_PDF',
        label: 'Main Notes',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONTENT_PDF',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'FileText',
        color: 'blue'
    },
    {
        id: 'ADMIN_CONTENT_VIDEO',
        label: 'Video Lectures',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONTENT_VIDEO',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'Video',
        color: 'red'
    },
    {
        id: 'ADMIN_CONTENT_AUDIO',
        label: 'Audio Series',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONTENT_AUDIO',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'Headphones',
        color: 'pink'
    },
    {
        id: 'ADMIN_CONTENT_MCQ',
        label: 'MCQ & Tests',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: false,
        adminTab: 'CONTENT_MCQ',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'CheckCircle',
        color: 'purple'
    },
    // ADMIN_PREMIUM_VIDEO REMOVED from visible list as requested ("Content & Analysis me admin dashbord me ek button hai Premium Video ye hatao")
    {
        id: 'ADMIN_TOPIC_NOTES',
        label: 'Topic Notes',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: false,
        adminTab: 'TOPIC_NOTES_MANAGER',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'BookOpen',
        color: 'cyan'
    },
    {
        id: 'ADMIN_BULK_UPLOAD',
        label: 'Bulk Import',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: false,
        adminTab: 'BULK_UPLOAD',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'Layers',
        color: 'orange'
    },
    {
        id: 'ADMIN_HOMEWORK',
        label: 'Homework',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'HOMEWORK_MANAGER',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'ClipboardList',
        color: 'indigo'
    },
    {
        id: 'ADMIN_BOOK_NOTES',
        label: 'Book Notes',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'BOOK_NOTES_MANAGER',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'BookMarked',
        color: 'amber'
    },
    {
        id: 'ADMIN_DAILY_GK',
        label: 'Daily GK',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'DAILY_GK_MANAGER',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'Book',
        color: 'teal'
    },
    {
        id: 'ADMIN_TRENDING_NOTES',
        label: 'Trending Notes',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'TRENDING_NOTES_MANAGER',
        requiredPermission: 'MANAGE_CONTENT',
        icon: 'TrendingUp',
        color: 'amber'
    },
    {
        id: 'ADMIN_SYLLABUS',
        label: 'Syllabus Manager',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'SYLLABUS_MANAGER',
        requiresSuperAdmin: true,
        icon: 'ListChecks',
        color: 'indigo'
    },
    {
        id: 'ADMIN_UNIVERSAL_PLAYLIST',
        label: 'Universal Playlist',
        group: 'CONTENT',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'UNIVERSAL_PLAYLIST',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Video',
        color: 'rose'
    },

    // GROUP: AI (Admin & Student)
    {
        id: 'ADMIN_CONFIG_AI',
        label: 'AI Configuration',
        group: 'AI',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_AI',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Bot',
        color: 'teal'
    },

    // GROUP: GAME
    {
        id: 'ADMIN_GAME_CONFIG',
        label: 'Game Config',
        group: 'GAME',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_GAME',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Gamepad2',
        color: 'orange'
    },
    {
        id: 'ADMIN_REWARDS',
        label: 'Engagement Rewards',
        group: 'GAME',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_REWARDS',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Gift',
        color: 'rose'
    },
    {
        id: 'ADMIN_PRIZES',
        label: 'Prize Settings',
        group: 'GAME',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_PRIZES',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Trophy',
        color: 'yellow'
    },
    {
        id: 'ADMIN_CHALLENGE',
        label: 'Challenge Config',
        group: 'GAME',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_CHALLENGE',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Trophy',
        color: 'red'
    },
    {
        id: 'ADMIN_CHALLENGE_20',
        label: 'Challenge 2.0',
        group: 'GAME',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CHALLENGE_CREATOR_20',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Rocket',
        color: 'violet'
    },

    // GROUP: ADVANCED / CONFIG
    {
        id: 'ADMIN_EVENT',
        label: 'Event Manager',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'EVENT_MANAGER',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Calendar',
        color: 'rose'
    },
    {
        id: 'ADMIN_EFFECTS',
        label: 'Animations',
        group: 'NSTA_CONTROL',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_EFFECTS',
        requiresSuperAdmin: true,
        icon: 'Sparkles',
        color: 'violet'
    },
    {
        id: 'ADMIN_GENERAL',
        label: 'General Settings',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_GENERAL',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Monitor',
        color: 'blue'
    },
    {
        id: 'ADMIN_SECURITY',
        label: 'Security',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_SECURITY',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'ShieldCheck',
        color: 'red'
    },
    {
        id: 'ADMIN_VISIBILITY',
        label: 'Visibility & Watermark',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_VISIBILITY',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Eye',
        color: 'amber'
    },
    {
        id: 'ADMIN_POWER',
        label: 'Advanced Settings',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'POWER_MANAGER',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Settings',
        color: 'slate'
    },
    {
        id: 'ADMIN_BLOGGER',
        label: 'Blogger Hub',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'BLOGGER_HUB',
        requiresSuperAdmin: true,
        icon: 'PenTool',
        color: 'orange'
    },
    {
        id: 'ADMIN_PAYMENT',
        label: 'Payment Config',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_PAYMENT',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Banknote',
        color: 'emerald'
    },
    {
        id: 'ADMIN_EXTERNAL',
        label: 'External Apps',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_EXTERNAL_APPS',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Globe',
        color: 'indigo'
    },
    {
        id: 'ADMIN_APP_STORE',
        label: 'App Store Page',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CONFIG_APP_STORE',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'ShoppingBag',
        color: 'purple'
    },
    /* ADMIN_POPUPS / Popup Config — removed (feature deprecated) */
    {
        id: 'ADMIN_CODES',
        label: 'Gift Codes',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'CODES',
        requiredPermission: 'MANAGE_GIFT_CODES',
        icon: 'Gift',
        color: 'pink'
    },
    {
        id: 'ADMIN_DEPLOY',
        label: 'App Update',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'DEPLOY',
        requiresSuperAdmin: true,
        icon: 'Cloud',
        color: 'sky'
    },
    {
        id: 'ADMIN_DATABASE',
        label: 'Database',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'DATABASE',
        requiresSuperAdmin: true,
        icon: 'Database',
        color: 'gray'
    },
    {
        id: 'ADMIN_RECYCLE',
        label: 'Recycle Bin',
        group: 'ADVANCED',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'RECYCLE',
        requiresSuperAdmin: true,
        icon: 'Trash2',
        color: 'red'
    },
    {
        id: 'ADMIN_NSTA_CONTROL',
        label: 'NSTA Control',
        group: 'NSTA_CONTROL',
        surfaceLevel: 3,
        adminVisible: true,
        adminTab: 'NSTA_CONTROL',
        requiredPermission: 'MANAGE_SETTINGS',
        icon: 'Sliders',
        color: 'violet'
    },

    // --- ANALYSIS DUMMIES (Not switchable individually) ---
    { id: 'ACCURACY_STAT', label: 'Accuracy Stat', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'SPEED_STAT', label: 'Speed Stat', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'PERF_TREND', label: 'Performance Trend', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'STRONG_AREA', label: 'Strong Areas', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'AREA_IMPROVING', label: 'Area Improving', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'FOCUS_NEEDED', label: 'Focus Needed', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'OFFICIAL_MARKSHEET', label: 'Official Marksheet', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'OMR_SHEET', label: 'OMR Sheet', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'PROGRESS_DELTA', label: 'Progress Delta', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'MISTAKE_PATTERN', label: 'Mistake Pattern', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'TOPIC_BREAKDOWN', label: 'Topic Breakdown', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'TOPIC_DIST', label: 'Topic Distribution', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'DOWNLOAD_ANALYSIS', label: 'Download Analysis', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'AI_INSIGHT_MAP', label: 'AI Insight Map', group: 'AI', surfaceLevel: 2, adminVisible: false, isDummy: true },
    { id: 'PREMIUM_ANALYSIS', label: 'Premium Analysis', group: 'ANALYSIS', surfaceLevel: 2, adminVisible: true },
    { id: 'TEACHER_STRATEGY', label: 'Teacher Strategy', group: 'CONTENT', surfaceLevel: 2, adminVisible: true, description: 'Access to teacher strategy notes.' },
    { id: 'UNIVERSAL_VIDEO', label: 'Universal Video', group: 'CONTENT', surfaceLevel: 2, adminVisible: true, description: 'Access to universal videos.' },
    { id: 'PREMIUM_AUDIO', label: 'Premium Audio', group: 'CONTENT', surfaceLevel: 2, adminVisible: true, description: 'Access to premium audio content.' },
    { id: 'AI_TUTOR', label: 'AI Tutor', group: 'AI', surfaceLevel: 2, adminVisible: true, description: 'Access to AI Tutor.' },
    {
        id: 'SETUP_RECOVERY',
        label: 'Recovery Set करें',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        icon: 'Lock',
        color: 'orange',
        description: 'Students ko apna recovery mobile/password set karne ki suvidha.'
    },
    {
        id: 'RECOVERY_LOGIN',
        label: 'Login via Recovery',
        group: 'CORE',
        surfaceLevel: 3,
        adminVisible: true,
        icon: 'KeyRound',
        color: 'orange',
        description: 'Login screen par Recovery se login karne ka option.'
    },
];

export const getFeaturesByGroup = (group: FeatureGroup, onlyAdmin: boolean = false) => {
    return ALL_FEATURES.filter(f => f.group === group && (!onlyAdmin || f.adminVisible));
};
