
import { 
    db, 
    rtdb, 
    saveUserToLive, 
    saveSystemSettings, 
    saveChapterData, 
    saveUniversalAnalysis,
    saveAiInteraction,
    savePublicActivity,
    getApiUsage,
    subscribeToUsers
} from '../firebase';
import { 
    ref, 
    set, 
    get, 
    update, 
    remove, 
    push 
} from "firebase/database";
import { 
    doc, 
    deleteDoc, 
    getDocs, 
    collection,
    query,
    where,
    limitToLast,
    orderBy,
    setDoc
} from "firebase/firestore";
import { User, SystemSettings, WeeklyTest, MCQItem, InboxMessage, SubscriptionHistoryEntry, ClassLevel, Board, Challenge20 } from '../types';
import { fetchChapters, fetchLessonContent } from './groq';

// --- HELPER: GET ALL USERS (ONCE) ---
const getAllUsers = async (): Promise<User[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (e) {
        console.error("Error fetching users:", e);
        return [];
    }
};

// --- HELPER: GET SETTINGS (ONCE) ---
const getSettings = async (): Promise<SystemSettings | null> => {
    try {
        const snapshot = await get(ref(rtdb, 'system_settings'));
        if (snapshot.exists()) return snapshot.val();
        return null;
    } catch (e) { return null; }
};

// --- ACTION IMPLEMENTATIONS ---

const deleteUser = async (userId: string) => {
    try {
        await deleteDoc(doc(db, "users", userId));
        await remove(ref(rtdb, `users/${userId}`));
        return `User ${userId} deleted successfully from Firestore and RTDB.`;
    } catch (e: any) {
        throw new Error(`Failed to delete user ${userId}: ${e.message}`);
    }
};

const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
        const userRef = doc(db, "users", userId);
        // We need to fetch current user to ensure we don't overwrite with partial data incorrectly if using saveUserToLive
        // But saveUserToLive handles full object.
        // Let's use getDoc first
        const snapshot = await get(ref(rtdb, `users/${userId}`));
        if (!snapshot.exists()) throw new Error("User not found");
        
        const currentUser = snapshot.val();
        const updatedUser = { ...currentUser, ...updates };
        
        await saveUserToLive(updatedUser);
        return `User ${userId} updated.`;
    } catch (e: any) {
        throw new Error(`Failed to update user: ${e.message}`);
    }
};

const banUser = async (userId: string, reason: string) => {
    return await updateUser(userId, { isLocked: true });
};

const unbanUser = async (userId: string) => {
    return await updateUser(userId, { isLocked: false });
};

const grantSubscription = async (userId: string, plan: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'LIFETIME', level: 'BASIC' | 'ULTRA') => {
    const now = new Date();
    let endDate: Date | null = new Date();
    
    if (plan === 'WEEKLY') endDate.setDate(now.getDate() + 7);
    else if (plan === 'MONTHLY') endDate.setDate(now.getDate() + 30);
    else if (plan === 'YEARLY') endDate.setDate(now.getDate() + 365);
    else endDate = null;

    const historyEntry: SubscriptionHistoryEntry = {
        id: `grant-${Date.now()}`,
        tier: plan,
        level: level,
        startDate: now.toISOString(),
        endDate: endDate ? endDate.toISOString() : 'LIFETIME',
        durationHours: 0,
        price: 0,
        originalPrice: 0,
        isFree: true,
        grantSource: 'ADMIN',
        grantedBy: 'AI_AGENT'
    };

    // Fetch user to append history
    // UPDATED: Check RTDB first, then Firestore to avoid "User not found" if sync is delayed
    let user: User | null = null;
    const snapshot = await get(ref(rtdb, `users/${userId}`));
    
    if (snapshot.exists()) {
        user = snapshot.val();
    } else {
        // Fallback to Firestore
        try {
            const docSnap = await getDocs(query(collection(db, "users"), where("id", "==", userId)));
            if (!docSnap.empty) {
                user = docSnap.docs[0].data() as User;
            }
        } catch(e) {}
    }

    if (!user) throw new Error(`User not found with ID: ${userId}. Please use 'scanUsers' to find the correct ID.`);
    
    const newHistory = [historyEntry, ...(user.subscriptionHistory || [])];

    return await updateUser(userId, {
        subscriptionTier: plan,
        subscriptionLevel: level,
        subscriptionEndDate: endDate ? endDate.toISOString() : undefined,
        isPremium: true,
        subscriptionHistory: newHistory,
        grantedByAdmin: true
    });
};

const broadcastMessage = async (message: string, type: 'TEXT' | 'GIFT' = 'TEXT', giftValue?: number) => {
    // This is heavy for all users. We might want to just set a global message in settings
    // OR fetch all users and update their inbox.
    // For safety, let's update system settings 'globalMessage' or similar if intended for banner.
    // Or if intended for Inbox, we limit to batch processing.
    // Let's assume the request implies "Send to everyone".
    // We will use 'push' to a 'broadcasts' node if app supports it, but based on types, users have 'inbox'.
    
    // Better approach: Create a System Notice in settings
    const settings = await getSettings();
    if (settings) {
        const newSettings = { ...settings, noticeText: message };
        await saveSystemSettings(newSettings);
        return "Broadcast banner updated successfully.";
    }
    return "Failed to fetch settings.";
};

const sendInboxMessage = async (userId: string, text: string) => {
    const snapshot = await get(ref(rtdb, `users/${userId}`));
    if (!snapshot.exists()) throw new Error("User not found");
    const user = snapshot.val();
    
    const newMsg: InboxMessage = {
        id: `msg-${Date.now()}`,
        text: text,
        date: new Date().toISOString(),
        read: false,
        type: 'TEXT'
    };
    
    const updatedInbox = [newMsg, ...(user.inbox || [])];
    await updateUser(userId, { inbox: updatedInbox });
    return `Message sent to ${user.name}.`;
};

// SUPER PILOT UPGRADE: Autonomous Question Generation
const createWeeklyTest = async (name: string, subject: string, questionCount: number, classLevel: ClassLevel = '10', board: Board = 'CBSE') => {
    const settings = await getSettings();
    if (!settings) throw new Error("Settings not found");
    
    // AUTO-ADJUST COUNT BASED ON SUBJECT
    let effectiveCount = questionCount;
    const sub = subject.toLowerCase();
    if (sub.includes('math')) effectiveCount = 20;
    else if (sub.includes('science') && !sub.includes('social')) effectiveCount = 30;
    else if (sub.includes('social')) effectiveCount = 50;

    // 1. Fetch Chapters for the subject to generate relevant content
    let generatedQuestions: MCQItem[] = [];
    
    try {
        const chapters = await fetchChapters(board, classLevel, null, { id: subject, name: subject, icon: '', color: '' }, 'English');
        
        if (chapters.length > 0) {
            // Select random chapters (max 3 for better diversity)
            const shuffled = chapters.sort(() => 0.5 - Math.random());
            const selectedChapters = shuffled.slice(0, 3);
            
            const countPerChapter = Math.ceil(effectiveCount / selectedChapters.length);
            
            // RETRY LOOP FOR ROBUSTNESS
            let retry = 0;
            const MAX_RETRIES = 2;

            while (generatedQuestions.length < effectiveCount && retry <= MAX_RETRIES) {
                for (const ch of selectedChapters) {
                    if (generatedQuestions.length >= effectiveCount) break;

                    // Generate Content
                    const content = await fetchLessonContent(
                        board,
                        classLevel,
                        null, 
                        { id: subject, name: subject, icon: '', color: '' }, 
                        ch,
                        'English',
                        'MCQ_SIMPLE',
                        0,
                        true,
                        countPerChapter,
                        "", 
                        true, 
                        'SCHOOL', 
                        true, // Force Regenerate
                        false,
                        'PILOT' 
                    );
                    
                    if (content && content.mcqData) {
                        // Deduplicate
                        const newQs = content.mcqData.filter(nq => !generatedQuestions.some(eq => eq.question === nq.question));
                        generatedQuestions = [...generatedQuestions, ...newQs];
                    }
                }
                retry++;
            }
        }
        
        // Trim to exact count
        if (generatedQuestions.length > effectiveCount) {
            generatedQuestions = generatedQuestions.slice(0, effectiveCount);
        }
        
    } catch (e) {
        console.error("Super Pilot Generation Failed:", e);
    }

    // STRICT CHECK: Ensure questions exist
    if (generatedQuestions.length === 0) {
        throw new Error("AI Generation Failed: No questions were generated. The test was NOT created.");
    }

    const newTest: WeeklyTest = {
        id: `test-${Date.now()}`,
        name: name,
        description: `Subject: ${subject} (${board} Class ${classLevel})`,
        isActive: true,
        classLevel: classLevel,
        questions: generatedQuestions,
        totalQuestions: generatedQuestions.length,
        passingScore: Math.floor(generatedQuestions.length * 0.4), // 40% passing
        createdAt: new Date().toISOString(),
        durationMinutes: 60,
        selectedSubjects: [subject]
    };
    
    const updatedTests = [...(settings.weeklyTests || []), newTest];
    await saveSystemSettings({ ...settings, weeklyTests: updatedTests });
    
    const statusMsg = generatedQuestions.length > 0 
        ? `Weekly Test "${name}" created with ${generatedQuestions.length} AI-generated questions.` 
        : `Weekly Test "${name}" created (Empty - Generation Failed).`;
        
    return statusMsg;
};

const scanUsers = async (filter: 'ALL' | 'PREMIUM' | 'FREE' | 'INACTIVE') => {
    const users = await getAllUsers();
    let result = users;
    
    if (filter === 'PREMIUM') result = users.filter(u => u.isPremium);
    if (filter === 'FREE') result = users.filter(u => !u.isPremium);
    if (filter === 'INACTIVE') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        result = users.filter(u => !u.lastActiveTime || new Date(u.lastActiveTime) < monthAgo);
    }
    
    return result.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, credits: u.credits, tier: u.subscriptionTier }));
};

const getRecentLogs = async (limit: number = 20) => {
     try {
        const q = query(collection(db, "ai_interactions"), orderBy("timestamp", "desc"), limitToLast(limit));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
     } catch (e) { return []; }
};

const updateSystemSettings = async (updates: Partial<SystemSettings>) => {
    try {
        const current = await getSettings();
        if (!current) throw new Error("Settings not found");
        
        const updated = { ...current, ...updates };
        await saveSystemSettings(updated);
        return "System Settings updated successfully.";
    } catch (e: any) {
        throw new Error(`Failed to update settings: ${e.message}`);
    }
};

const generateDailyChallenge = async (board: Board, classLevel: ClassLevel): Promise<Challenge20> => {
    // 1. Determine Subjects
    const isScienceStream = classLevel === '11' || classLevel === '12';
    // Simplified subject selection for daily challenge
    const subject = isScienceStream ? { name: 'Physics', id: 'physics', icon: '', color: '' } : { name: 'Science', id: 'science', icon: '', color: '' };
    
    // 2. Fetch Chapters
    const chapters = await fetchChapters(board, classLevel, isScienceStream ? 'Science' : null, subject, 'English');
    if (chapters.length === 0) throw new Error("No chapters found");

    const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];

    // 3. Generate 10 Questions
    const content = await fetchLessonContent(
        board, 
        classLevel, 
        isScienceStream ? 'Science' : null, 
        subject, 
        randomChapter, 
        'English', 
        'MCQ_SIMPLE', 
        0, 
        true, 
        10, 
        "", 
        true, 
        'SCHOOL', 
        true, 
        false, 
        'PILOT'
    );

    if (!content || !content.mcqData || content.mcqData.length === 0) {
        throw new Error("Failed to generate Daily Challenge questions");
    }

    return {
        id: `daily-${board}-${classLevel}-${new Date().toISOString().split('T')[0]}`,
        title: `Daily Challenge: ${randomChapter.title}`,
        description: `Subject: ${subject.name}`,
        questions: content.mcqData,
        createdAt: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'DAILY_CHALLENGE',
        classLevel: classLevel,
        isAutoGenerated: true,
        isActive: true,
        durationMinutes: 15
    };
};

const publishDailyChallenge = async (board: Board, classLevel: ClassLevel) => {
    const settings = await getSettings();
    if (!settings) throw new Error("Settings not found");

    const challenge = await generateDailyChallenge(board, classLevel);

    const updatedChallenges = [...(settings.dailyChallenges || []), challenge];
    // Keep only last 7 days? Or just append. Append for now.
    await saveSystemSettings({ ...settings, dailyChallenges: updatedChallenges });

    return `Daily Challenge published for ${board} Class ${classLevel}`;
};

const publishBulkDailyChallenges = async (challenges: Challenge20[]) => {
    if (challenges.length === 0) return "No challenges to publish.";

    const settings = await getSettings();
    if (!settings) throw new Error("Settings not found");

    const updatedChallenges = [...(settings.dailyChallenges || []), ...challenges];
    await saveSystemSettings({ ...settings, dailyChallenges: updatedChallenges });

    return `Successfully published ${challenges.length} daily challenges.`;
};

// --- REGISTRY MAP ---
export const ActionRegistry = {
    deleteUser,
    updateUser,
    banUser,
    unbanUser,
    grantSubscription,
    broadcastMessage,
    sendInboxMessage,
    createWeeklyTest,
    scanUsers,
    getRecentLogs,
    updateSystemSettings,
    generateDailyChallenge,
    publishDailyChallenge,
    publishBulkDailyChallenges
};

// --- TOOL DEFINITIONS (JSON SCHEMA) ---
export const adminTools = [
    {
        type: "function",
        function: {
            name: "deleteUser",
            description: "Delete a user permanently from the system.",
            parameters: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "The ID of the user to delete" }
                },
                required: ["userId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "updateUser",
            description: "Update user details like credits.",
            parameters: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "The ID of the user" },
                    updates: { 
                        type: "object", 
                        description: "JSON object of fields to update (e.g., { credits: 500 })" 
                    }
                },
                required: ["userId", "updates"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "grantSubscription",
            description: "Give a premium subscription to a user.",
            parameters: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "The ID of the user" },
                    plan: { type: "string", enum: ["WEEKLY", "MONTHLY", "YEARLY", "LIFETIME"] },
                    level: { type: "string", enum: ["BASIC", "ULTRA"] }
                },
                required: ["userId", "plan", "level"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "banUser",
            description: "Lock/Ban a user account.",
            parameters: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "The ID of the user" },
                    reason: { type: "string", description: "Reason for banning" }
                },
                required: ["userId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "unbanUser",
            description: "Unlock/Unban a user account.",
            parameters: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "The ID of the user" }
                },
                required: ["userId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "broadcastMessage",
            description: "Set a global notice/banner text for all users.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "The message text to display" }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sendInboxMessage",
            description: "Send a personal message to a specific user's inbox.",
            parameters: {
                type: "object",
                properties: {
                    userId: { type: "string", description: "The ID of the user" },
                    text: { type: "string", description: "The message content" }
                },
                required: ["userId", "text"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createWeeklyTest",
            description: "Create a new Weekly Test AND automatically generate questions using AI (Super Pilot).",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Name of the test" },
                    subject: { type: "string", description: "Subject of the test" },
                    questionCount: { type: "number", description: "Total questions" },
                    classLevel: { type: "string", enum: ["6","7","8","9","10","11","12","COMPETITION"], description: "Class Level" },
                    board: { type: "string", enum: ["CBSE", "BSEB"], description: "Board Name" }
                },
                required: ["name", "subject", "questionCount"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "scanUsers",
            description: "List users based on a filter.",
            parameters: {
                type: "object",
                properties: {
                    filter: { type: "string", enum: ["ALL", "PREMIUM", "FREE", "INACTIVE"] }
                },
                required: ["filter"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "updateSystemSettings",
            description: "Update global system settings (AI limits, theme, etc).",
            parameters: {
                type: "object",
                properties: {
                    updates: { 
                        type: "object", 
                        description: "JSON object of settings to update (e.g., { aiLimits: { free: 10 } })" 
                    }
                },
                required: ["updates"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "publishDailyChallenge",
            description: "Generate and publish a Daily Challenge for a specific class.",
            parameters: {
                type: "object",
                properties: {
                    board: { type: "string", enum: ["CBSE", "BSEB"] },
                    classLevel: { type: "string", enum: ["6","7","8","9","10","11","12"] }
                },
                required: ["board", "classLevel"]
            }
        }
    }
];
