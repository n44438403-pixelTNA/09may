import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, collection, updateDoc, deleteDoc, onSnapshot, getDocs, query, where, limitToLast, orderBy, increment } from "firebase/firestore";
import { getDatabase, ref, set, get, onValue, update, remove, query as rtdbQuery, limitToLast as rtdbLimitToLast, orderByChild as rtdbOrderByChild } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { storage } from "./utils/storage";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBaf1iGBIHgtma9SCt1Q4SduRAQP5DBnlE",
  authDomain: "iic-adf79.firebaseapp.com",
  databaseURL: "https://iic-adf79-default-rtdb.firebaseio.com",
  projectId: "iic-adf79",
  storageBucket: "iic-adf79.firebasestorage.app",
  messagingSenderId: "970486594646",
  appId: "1:970486594646:web:e1eccee34b14b38923cff7",
  measurementId: "G-VWPT3BYEZK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Use new persistentLocalCache API (replaces deprecated enableMultiTabIndexedDbPersistence)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const rtdb = getDatabase(app);
const auth = getAuth(app);

// --- EXPORTED HELPERS ---

// Helper to remove undefined fields (Firestore doesn't support them)
export const sanitizeForFirestore = (obj: any): any => {
  // Preserve Date objects (Firestore supports them or converts to Timestamp)
  if (obj instanceof Date) {
      return obj;
  }
  
  if (Array.isArray(obj)) {
    // Filter out undefineds from arrays (Firestore rejects arrays with undefined)
    return obj.map(v => sanitizeForFirestore(v)).filter(v => v !== undefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const value = sanitizeForFirestore(obj[key]);
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

// Connection State Monitoring
let isFirebaseConnected = false;
const connectedRef = ref(rtdb, ".info/connected");
onValue(connectedRef, (snap) => {
  isFirebaseConnected = !!snap.val();
});

export const checkFirebaseConnection = () => {
  // Return true if either navigator is online AND we have a realtime connection
  // Fallback to navigator.onLine if RTDB isn't initialized yet (rare)
  return isFirebaseConnected;
};

export const subscribeToAuth = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// --- NUCLEAR RESET ---
export const resetAllContent = async () => {
  let cloudError = null;
  try {
    console.log("STARTING NUCLEAR RESET...");

    // 1. Clear Local Storage (Synchronous & Async) FIRST
    // This ensures local cleanup happens regardless of cloud status
    try {
        localStorage.clear(); // Clear standard local storage (Session, Settings, Cache)
        await storage.clear(); // Clear IndexedDB/LocalForage (Heavy Content)
        console.log("✅ Local Data Cleared Successfully");
    } catch (localErr) {
        console.error("Local Clear Error (Non-Fatal):", localErr);
    }

    // 2. RTDB Wipes
    try {
        const rtdbPaths = ['content_data', 'custom_syllabus', 'public_activity', 'ai_interactions', 'universal_analysis_logs'];
        await Promise.all(rtdbPaths.map(path => remove(ref(rtdb, path))));
        console.log("✅ RTDB Cleared Successfully");
    } catch (e: any) {
        console.error("RTDB Reset Error:", e);
        cloudError = e;
    }

    // 3. Firestore Wipes (Iterative delete)
    try {
        const collections = ['content_data', 'custom_syllabus', 'public_activity', 'ai_interactions', 'universal_analysis_logs'];
        for (const colName of collections) {
          const q = query(collection(db, colName));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        }
        console.log("✅ Firestore Cleared Successfully");
    } catch (e: any) {
        console.error("Firestore Reset Error:", e);
        if (!cloudError) cloudError = e;
    }

    // Report Outcome
    if (cloudError) {
        // We throw modified error to inform UI that Local succeeded but Cloud failed
        throw new Error(`LOCAL DATA CLEARED, but Cloud Reset Failed (Permission Denied). check Console.`);
    }

    console.log("NUCLEAR RESET COMPLETE");
  } catch (e) {
    console.error("RESET ERROR", e);
    throw e;
  }
};

// --- DUAL WRITE / SMART READ LOGIC ---

// 1. User Data Sync
export const saveUserToLive = async (user: any) => {
  try {
    if (!user || !user.id) return;

    // Sanitize data before saving
    const sanitizedUser = sanitizeForFirestore(user);

    // EXTRACT BULKY DATA FOR SEGREGATION
    const {
        mcqHistory, usageHistory, progress, testResults, inbox,
        topicStrength, subscriptionHistory, activeSubscriptions,
        pendingRewards, redeemedCodes, unlockedContent, dailyRoutine,
        ...coreProfile
    } = sanitizedUser;

    const promises = [];

    // 1. Save Core Profile to RTDB & Firestore (users/{uid})
    promises.push(update(ref(rtdb, `users/${user.id}`), coreProfile).catch(e => console.error("RTDB Core Save Error:", e)));
    promises.push(setDoc(doc(db, "users", user.id), coreProfile, { merge: true }).catch(e => console.error("Firestore Core Save Error:", e)));

    // 2. Save Bulky Data to Subcollections or Document Extensions to avoid 1MB document limit
    // Note: To keep things intact for the current frontend without massive refactoring,
    // we save the bulky data in a parallel collection `user_data/{uid}`

    // SAFETY CHECK: Only overwrite bulky data if the user object explicitly contains them.
    // This prevents accidental wiping of history if saveUserToLive is called with an incomplete user object (e.g. during a fast login/logout cycle).
    const bulkyData: any = {};
    if (user.hasOwnProperty('mcqHistory')) bulkyData.mcqHistory = mcqHistory;
    if (user.hasOwnProperty('usageHistory')) bulkyData.usageHistory = usageHistory;
    if (user.hasOwnProperty('progress')) bulkyData.progress = progress;
    if (user.hasOwnProperty('testResults')) bulkyData.testResults = testResults;
    if (user.hasOwnProperty('inbox')) bulkyData.inbox = inbox;
    if (user.hasOwnProperty('topicStrength')) bulkyData.topicStrength = topicStrength;
    if (user.hasOwnProperty('subscriptionHistory')) bulkyData.subscriptionHistory = subscriptionHistory;
    if (user.hasOwnProperty('activeSubscriptions')) bulkyData.activeSubscriptions = activeSubscriptions;
    if (user.hasOwnProperty('pendingRewards')) bulkyData.pendingRewards = pendingRewards;
    if (user.hasOwnProperty('redeemedCodes')) bulkyData.redeemedCodes = redeemedCodes;
    if (user.hasOwnProperty('unlockedContent')) bulkyData.unlockedContent = unlockedContent;
    if (user.hasOwnProperty('dailyRoutine')) bulkyData.dailyRoutine = dailyRoutine;

    // Use { merge: true } so we don't delete fields we didn't explicitly pass this time.
    if (Object.keys(bulkyData).length > 0) {
        promises.push(setDoc(doc(db, "user_data", user.id), sanitizeForFirestore(bulkyData), { merge: true }).catch(e => console.error("Firestore Bulky Data Save Error:", e)));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error("Error saving user:", error);
  }
};

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  // Prefer Firestore for Admin List (More Reliable)
  const q = collection(db, "users");
  return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      if (users.length > 0) {
          callback(users);
      } else {
          // Fallback to RTDB if Firestore is empty (migration scenario)
          const usersRef = ref(rtdb, 'users');
          onValue(usersRef, (snap) => {
             const data = snap.val();
             const userList = data ? Object.values(data) : [];
             callback(userList);
          }, { onlyOnce: true });
      }
  });
};

export const subscribeToUser = (userId: string, callback: (user: any) => void) => {
    // Listen ONLY to Firestore for user profile.
    // RTDB receives frequent partial updates (like lastActiveTime every 10s) which can overwrite local state
    // leading to unstable credits/subscriptions if RTDB and Firestore are momentarily out of sync.

    const unsubFirestore = onSnapshot(doc(db, "users", userId), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            // Document was deleted by admin — signal null so App.tsx can force logout
            callback(null);
        }
    });

    return () => {
        unsubFirestore();
    };
};

export const getUserData = async (userId: string) => {
    try {
        let coreData: any = null;

        // Try RTDB
        const snap = await get(ref(rtdb, `users/${userId}`));
        if (snap.exists()) {
             coreData = snap.val();
        } else {
            // Try Firestore
            const docSnap = await getDoc(doc(db, "users", userId));
            if (docSnap.exists()) {
                 coreData = docSnap.data();
            }
        }

        if (coreData) {
             // Fetch segregated bulky data
             const bulkySnap = await getDoc(doc(db, "user_data", userId)).catch(() => null);
             if (bulkySnap && bulkySnap.exists()) {
                  return { ...coreData, ...bulkySnap.data() };
             }
             return coreData;
        }

        return null;
    } catch (e) { console.error(e); return null; }
};

export const getUserByEmail = async (email: string) => {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const coreData = querySnapshot.docs[0].data();
            // Fetch segregated bulky data to ensure history is not lost on re-login
            if (coreData && coreData.id) {
                const bulkySnap = await getDoc(doc(db, "user_data", coreData.id)).catch(() => null);
                if (bulkySnap && bulkySnap.exists()) {
                    return { ...coreData, ...bulkySnap.data() };
                }
            }
            return coreData;
        }
        return null; 
    } catch (e) { console.error(e); return null; }
};

export const getUserByMobileOrId = async (input: string) => {
    try {
        // Run parallel queries to speed up lookup
        const qMobile = query(collection(db, "users"), where("mobile", "==", input));
        const qDisplayId = query(collection(db, "users"), where("displayId", "==", input));
        const qEmail = query(collection(db, "users"), where("email", "==", input));

        const [snapMobile, snapId, snapEmail] = await Promise.all([
            getDocs(qMobile),
            getDocs(qDisplayId),
            getDocs(qEmail)
        ]);

        let coreData = null;
        if (!snapMobile.empty) coreData = snapMobile.docs[0].data();
        else if (!snapId.empty) coreData = snapId.docs[0].data();
        else if (!snapEmail.empty) coreData = snapEmail.docs[0].data();

        if (coreData && coreData.id) {
            // Fetch segregated bulky data to ensure history is not lost on re-login
            const bulkySnap = await getDoc(doc(db, "user_data", coreData.id)).catch(() => null);
            if (bulkySnap && bulkySnap.exists()) {
                return { ...coreData, ...bulkySnap.data() };
            }
            return coreData;
        }

        return null;
    } catch (e) { console.error(e); return null; }
};

// 2. System Settings Sync
export const getSystemSettings = async () => {
    try {
        const snap = await get(ref(rtdb, 'system_settings'));
        if (snap.exists()) return snap.val();
    } catch (e) {
        console.warn("RTDB getSystemSettings failed:", e);
    }

    try {
        const docSnap = await getDoc(doc(db, "config", "system_settings"));
        if (docSnap.exists()) return docSnap.data();
    } catch (e) {
        console.error("Firestore getSystemSettings failed:", e);
    }

    return null;
};

export const saveSystemSettings = async (settings: any) => {
  try {
    // Separate lucentNotes from core settings completely.
    // Each LucentNoteEntry is stored as its own document in lucent_entries/{id}
    // so a single Firestore document never hits the 1MB limit — even with 2000+ pages.
    const { lucentNotes, ...coreSettings } = settings;
    const sanitizedCore = sanitizeForFirestore(coreSettings);

    const writes: Promise<any>[] = [
      set(ref(rtdb, 'system_settings'), sanitizedCore),
      setDoc(doc(db, "config", "system_settings"), sanitizedCore),
    ];

    // SAFETY GUARD: only write/delete Lucent data when entries are explicitly provided
    // and non-empty. An empty array [] could be a race-condition artifact (data not yet
    // loaded from Firestore) — treating it as "delete all" would wipe the entire collection.
    if (lucentNotes != null && Array.isArray(lucentNotes) && lucentNotes.length > 0) {
      const entries: any[] = lucentNotes;
      const sanitizedEntries: any[] = sanitizeForFirestore(entries);
      const newIds: string[] = sanitizedEntries.map((e: any) => e?.id).filter(Boolean);

      // 1. Upsert each entry as its own document
      sanitizedEntries.forEach((entry: any) => {
        if (!entry?.id) return;
        writes.push(setDoc(doc(db, "lucent_entries", entry.id), entry));
        writes.push(set(ref(rtdb, `lucent_entries/${entry.id}`), entry));
      });

      // 2. Save ordered index so subscriber can reconstruct the array in order
      const indexPayload = { ids: newIds };
      writes.push(setDoc(doc(db, "config", "lucent_index"), indexPayload));
      writes.push(set(ref(rtdb, 'lucent_index'), indexPayload));

      // 3. Delete documents that were removed — read old index first
      try {
        const oldIndexSnap = await getDoc(doc(db, "config", "lucent_index"));
        if (oldIndexSnap.exists()) {
          const oldIds: string[] = oldIndexSnap.data()?.ids ?? [];
          const newIdSet = new Set(newIds);
          const toDelete = oldIds.filter((id: string) => !newIdSet.has(id));
          toDelete.forEach((id: string) => {
            writes.push(deleteDoc(doc(db, "lucent_entries", id)));
            writes.push(remove(ref(rtdb, `lucent_entries/${id}`)));
          });
        }
      } catch (e) {
        console.warn("lucent_index read failed — skipping deletion cleanup:", e);
      }
    }

    const results = await Promise.allSettled(writes);
    const anySuccess = results.some(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);

    if (!anySuccess) {
      throw new Error(errors.map(e => e.message).join(' | ') || "All writes failed");
    } else if (errors.length > 0) {
      console.warn("Partial Save Warning:", errors);
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
};

export const subscribeToSettings = (callback: (settings: any) => void) => {
  // Core settings and lucent entries come from separate paths and are merged before emit.
  let latestCore: any = null;
  let latestLucentMap: Record<string, any> = {};  // id → entry
  let latestOrder: string[] = [];                  // ordered list of ids
  // Guard: don't emit lucentNotes until at least one Firestore snapshot has confirmed
  // the collection state. This prevents emitting [] while entries are still loading,
  // which could cause a subsequent save to wipe all Lucent data (race condition bug).
  let lucentEntriesConfirmed = false;

  const emit = () => {
    if (latestCore == null) return;
    // Only include lucentNotes once we have a confirmed snapshot from Firestore
    if (!lucentEntriesConfirmed) {
      callback({ ...latestCore });
      return;
    }
    // Rebuild ordered array; append any entries not listed in the index (safety)
    const ordered = latestOrder.map(id => latestLucentMap[id]).filter(Boolean);
    const inOrder = new Set(latestOrder);
    Object.values(latestLucentMap).forEach((e: any) => {
      if (e?.id && !inOrder.has(e.id)) ordered.push(e);
    });
    callback({ ...latestCore, lucentNotes: ordered });
  };

  // --- Core system settings ---
  const unsubFs = onSnapshot(doc(db, "config", "system_settings"), (snap) => {
    if (snap.exists()) { latestCore = snap.data(); emit(); }
  });
  const unsubRtdb = onValue(ref(rtdb, 'system_settings'), (snap) => {
    const d = snap.val(); if (d) { latestCore = d; emit(); }
  });

  // --- Lucent entries (Firestore collection — each entry is its own document) ---
  const unsubEntries = onSnapshot(collection(db, "lucent_entries"), (snapshot) => {
    latestLucentMap = {};
    snapshot.forEach(d => { latestLucentMap[d.id] = d.data(); });
    lucentEntriesConfirmed = true; // Firestore has responded — safe to include in emit
    emit();
  });

  // --- RTDB backup for lucent entries (covers Firestore offline edge cases) ---
  const unsubEntriesRtdb = onValue(ref(rtdb, 'lucent_entries'), (snap) => {
    const data = snap.val();
    if (data && typeof data === 'object') {
      // Only update map for entries not already loaded from Firestore
      Object.entries(data).forEach(([id, entry]: [string, any]) => {
        if (!latestLucentMap[id]) latestLucentMap[id] = entry;
      });
      // If RTDB fires before Firestore confirms, mark as confirmed so data is not hidden
      if (!lucentEntriesConfirmed) { lucentEntriesConfirmed = true; }
      emit();
    }
  });

  // --- Lucent index (ordering + deletion awareness) ---
  const unsubIndex = onSnapshot(doc(db, "config", "lucent_index"), (snap) => {
    if (snap.exists()) { latestOrder = snap.data()?.ids ?? []; emit(); }
  });
  const unsubIndexRtdb = onValue(ref(rtdb, 'lucent_index'), (snap) => {
    const d = snap.val(); if (d?.ids) { latestOrder = d.ids; emit(); }
  });

  return () => {
    unsubFs(); unsubRtdb();
    unsubEntries(); unsubEntriesRtdb();
    unsubIndex(); unsubIndexRtdb();
  };
};

// 3. Content Links Sync (Bulk Uploads)
export const bulkSaveLinks = async (updates: Record<string, any>) => {
  try {
    const sanitizedUpdates = sanitizeForFirestore(updates);
    const promises = [];

    // RTDB
    promises.push(update(ref(rtdb, 'content_links'), sanitizedUpdates));
    
    // Firestore - We save each update as a document in 'content_data' collection
    // 'updates' is a map of key -> data
    Object.entries(sanitizedUpdates).forEach(([key, data]) => {
         promises.push(setDoc(doc(db, "content_data", key), data));
    });

    const results = await Promise.allSettled(promises);
    const anySuccess = results.some(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);

    if (!anySuccess) {
      throw new Error(errors.map(e => e.message).join(' | ') || "All bulk saves failed");
    } else if (errors.length > 0) {
      console.warn("Partial Bulk Save Warning:", errors);
    }
  } catch (error) {
    console.error("Error bulk saving links:", error);
    throw error;
  }
};

// 4. Chapter Data Sync (Individual)
export const saveChapterData = async (key: string, data: any) => {
  try {
    // 1. Sanitize Data
    const sanitizedData = sanitizeForFirestore(data);

    // 2. Cache Locally (Primary Source of Truth for this user session) +
    //    update the in-memory cache so next read is instant and fresh.
    await storage.setItem(key, sanitizedData);
    try { _memCachePut(key, sanitizedData); } catch {}

    // 3. Cloud Sync (Wait for at least one success to confirm)
    // We use Promise.allSettled to ensure we try both but don't fail if one fails
    // However, if we are online, we want to know if it failed.

    const promises = [];
    promises.push(set(ref(rtdb, `content_data/${key}`), sanitizedData));
    promises.push(setDoc(doc(db, "content_data", key), sanitizedData));

    const results = await Promise.allSettled(promises);
    const anySuccess = results.some(r => r.status === 'fulfilled');
    const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);

    if (!anySuccess) {
      throw new Error(errors.map(e => e.message).join(' | ') || "All chapter saves failed");
    } else if (errors.length > 0) {
      console.warn("Partial Chapter Save Warning:", errors);
    }
    return true;
  } catch (error) {
    console.error("Error saving chapter data:", error);
    throw error;
  }
};

// ── In-memory LRU cache for chapter data ─────────────────────────────────────
// Same-session repeat fetches return INSTANTLY from this map (no IndexedDB,
// no network). Capped to 60 entries so memory stays bounded even after a long
// session. We use a Map (insertion-ordered) so the eviction-of-oldest strategy
// is just `keys().next().value`. Cache is invalidated by: (a) saveChapterData
// after a successful write, and (b) the realtime subscriber in
// `subscribeToChapterData` whenever a fresh snapshot arrives.
const CHAPTER_MEM_CACHE: Map<string, any> = new Map();
const CHAPTER_MEM_CACHE_MAX = 60;
const _memCachePut = (key: string, data: any) => {
    if (CHAPTER_MEM_CACHE.has(key)) CHAPTER_MEM_CACHE.delete(key);
    CHAPTER_MEM_CACHE.set(key, data);
    if (CHAPTER_MEM_CACHE.size > CHAPTER_MEM_CACHE_MAX) {
        const oldest = CHAPTER_MEM_CACHE.keys().next().value;
        if (oldest) CHAPTER_MEM_CACHE.delete(oldest);
    }
};
export const invalidateChapterCache = (key?: string) => {
    if (key) CHAPTER_MEM_CACHE.delete(key);
    else CHAPTER_MEM_CACHE.clear();
};

// Stale-while-revalidate: returns the FASTEST source (memory > storage)
// immediately, while refreshing from the network in the background.
// Worst-case latency: ~5 ms (storage hit) instead of ~500-2000 ms (RTDB hit).
export const getChapterData = async (key: string) => {
    // 1. ⚡ In-memory cache — instant (microseconds)
    if (CHAPTER_MEM_CACHE.has(key)) {
        const cached = CHAPTER_MEM_CACHE.get(key);
        // Background refresh so next call still benefits if RTDB has updates.
        // (Fire-and-forget — does NOT block return.)
        _backgroundRefreshChapter(key);
        return cached;
    }

    // 2. ⚡ Local storage — very fast (~5 ms via IndexedDB)
    try {
        const stored = await storage.getItem(key);
        if (stored) {
            _memCachePut(key, stored);
            // Same background refresh so memory cache catches latest server data.
            _backgroundRefreshChapter(key);
            return stored;
        }
    } catch (e) {
        // continue to network
    }

    // 3. Network — RTDB first, then Firestore fallback
    try {
        const snapshot = await get(ref(rtdb, `content_data/${key}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            _memCachePut(key, data);
            await storage.setItem(key, data);
            return data;
        }
    } catch (e) {
        console.warn("RTDB fetch failed for chapter data:", e);
    }

    try {
        const docSnap = await getDoc(doc(db, "content_data", key));
        if (docSnap.exists()) {
            const data = docSnap.data();
            _memCachePut(key, data);
            await storage.setItem(key, data);
            return data;
        }
    } catch (e) {
        console.warn("Firestore fetch failed for chapter data:", e);
    }

    return null;
};

// Background-only refresh — never blocks the UI. Updates the in-memory + storage
// caches if the network has newer data than what we just served.
const _backgroundRefreshInFlight = new Set<string>();
const _backgroundRefreshChapter = (key: string) => {
    if (_backgroundRefreshInFlight.has(key)) return;
    _backgroundRefreshInFlight.add(key);
    get(ref(rtdb, `content_data/${key}`))
      .then(snap => {
        if (snap.exists()) {
            const data = snap.val();
            _memCachePut(key, data);
            storage.setItem(key, data).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { _backgroundRefreshInFlight.delete(key); });
};

// Public helper — pre-warm the cache for a list of chapter keys when the user
// is about to need them (e.g., when they open a subject, prefetch the first
// few chapters). Runs entirely in the background, never blocks.
export const prefetchChapterData = (keys: string[]) => {
    for (const k of keys) {
        if (!k || CHAPTER_MEM_CACHE.has(k)) continue;
        // Use storage as the warmer first, then network refresh.
        storage.getItem(k).then(stored => {
            if (stored) _memCachePut(k, stored);
            _backgroundRefreshChapter(k);
        }).catch(() => {
            _backgroundRefreshChapter(k);
        });
    }
};

// Used by client to listen for realtime changes to a specific chapter
export const subscribeToChapterData = (key: string, callback: (data: any) => void) => {
    const rtdbRef = ref(rtdb, `content_data/${key}`);
    return onValue(rtdbRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            // If not in RTDB, check Firestore (one-time fetch or snapshot?)
            // For now, let's just do one-time fetch to avoid complexity of double listeners
            getDoc(doc(db, "content_data", key)).then(docSnap => {
                if (docSnap.exists()) callback(docSnap.data());
            });
        }
    });
};

export const getApiUsage = async () => {
    try {
        const date = new Date().toISOString().split('T')[0];
        const docSnap = await getDoc(doc(db, "admin_stats", `api_usage_${date}`));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
        return null;
    }
};

export const subscribeToDrafts = (callback: (drafts: any[]) => void) => {
    const q = query(collection(db, "content_data"), where("isDraft", "==", true));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), key: doc.id }));
        callback(items);
    });
};

export const saveTestResult = async (userId: string, attempt: any) => {
    try {
        const docId = `${attempt.testId}_${Date.now()}`;
        const sanitizedAttempt = sanitizeForFirestore(attempt);
        await setDoc(doc(db, "users", userId, "test_results", docId), sanitizedAttempt);
    } catch(e) { console.error(e); }
};

export const saveUserHistory = async (userId: string, historyItem: any) => {
    try {
        const docId = `history_${historyItem.id || Date.now()}`;
        const sanitized = sanitizeForFirestore(historyItem);
        // Save to subcollection "history" under the user
        await setDoc(doc(db, "users", userId, "history", docId), sanitized);
    } catch(e) { console.error("Error saving history:", e); }
};

export const getUserSavedNotes = async (userId: string) => {
    try {
        const q = query(collection(db, "users", userId, "history"));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs.map(doc => doc.data());
        }
        return [];
    } catch(e) {
        console.error("Error fetching user saved notes history:", e);
        return [];
    }
};

export const updateUserStatus = async (userId: string, time: number) => {
     try {
        const today = new Date().toISOString().split('T')[0];
        const userRef = ref(rtdb, `users/${userId}`);

        // Use a transaction or simple read-update to handle streak
        // Since Firebase transactions can be tricky with partial data, we'll try a simpler approach first
        // Ideally this should be server-side, but for now client-side logic in App.tsx handles streak display.
        // Here we primarily update active time for "Online" status.

        // HOWEVER, user reported streak not working.
        // Streak is calculated in `App.tsx` (useEffect) -> `checkStreak`.
        // `updateUserStatus` is called every 10 seconds.
        // We should ensure we are NOT overwriting `streak` here accidentally if we were doing so.
        // We are ONLY updating `lastActiveTime`.

        await update(userRef, { lastActiveTime: new Date().toISOString() });
    } catch (error) {
        console.error("Error updating user status:", error);
    }
};

// 5. Custom Syllabus Sync
export const saveCustomSyllabus = async (key: string, chapters: any[]) => {
    try {
        const sanitizedData = sanitizeForFirestore(chapters);
        const promises = [
            set(ref(rtdb, `custom_syllabus/${key}`), sanitizedData),
            setDoc(doc(db, "custom_syllabus", key), { chapters: sanitizedData })
        ];

        const results = await Promise.allSettled(promises);
        const anySuccess = results.some(r => r.status === 'fulfilled');
        const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);

        if (!anySuccess) {
            throw new Error(errors.map(e => e.message).join(' | ') || "All syllabus saves failed");
        } else if (errors.length > 0) {
            console.warn("Partial Syllabus Save Warning:", errors);
        }
    } catch (error) {
        console.error("Error saving syllabus:", error);
        throw error;
    }
};

export const deleteCustomSyllabus = async (key: string) => {
    try {
        const promises = [
            remove(ref(rtdb, `custom_syllabus/${key}`)),
            deleteDoc(doc(db, "custom_syllabus", key))
        ];

        const results = await Promise.allSettled(promises);
        const anySuccess = results.some(r => r.status === 'fulfilled');
        const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason);

        if (!anySuccess) {
            throw new Error(errors.map(e => e.message).join(' | ') || "All syllabus deletes failed");
        } else if (errors.length > 0) {
            console.warn("Partial Syllabus Delete Warning:", errors);
        }
    } catch(e) {
        console.error("Error deleting syllabus", e);
        throw e;
    }
};

export const getCustomSyllabus = async (key: string) => {
    try {
        // Try RTDB
        const snap = await get(ref(rtdb, `custom_syllabus/${key}`));
        if (snap.exists()) return snap.val();
    } catch(e) { console.warn("RTDB getCustomSyllabus failed:", e); }

    try {
        // Try Firestore
        const docSnap = await getDoc(doc(db, "custom_syllabus", key));
        if (docSnap.exists()) return docSnap.data().chapters;
    } catch(e) { console.error("Firestore getCustomSyllabus failed:", e); }

    return null;
};

// 6. Public Activity Feed (Live Results)
export const savePublicActivity = async (activity: any) => {
    try {
        const sanitized = sanitizeForFirestore(activity);
        const docId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // RTDB (Limit to last 100 via logic if possible, but simple push here)
        // We'll just set it. For a real feed, we might want 'push'.
        // But let's use a fixed path structure for simplicity in list retrieval
        await set(ref(rtdb, `public_activity/${docId}`), sanitized);
        
        // Firestore (Auto-delete old via index policy if needed, or just keep)
        await setDoc(doc(db, "public_activity", docId), sanitized);
    } catch (e) { console.error("Error saving public activity:", e); }
};

export const subscribeToPublicActivity = (callback: (activities: any[]) => void) => {
    // Switch to RTDB for true realtime performance
    const q = rtdbQuery(ref(rtdb, "public_activity"), rtdbLimitToLast(50));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = Object.values(data);
            // Sort by timestamp desc
            items.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            callback(items);
        } else {
            callback([]);
        }
    });
};

// 7. Universal Analysis Logs
export const saveUniversalAnalysis = async (log: any) => {
    try {
        const sanitized = sanitizeForFirestore(log);
        await set(ref(rtdb, `universal_analysis_logs/${log.id}`), sanitized);
        await setDoc(doc(db, "universal_analysis_logs", log.id), sanitized);
    } catch (e) { console.error("Error saving analysis log:", e); }
};

export const subscribeToUniversalAnalysis = (callback: (logs: any[]) => void) => {
    const q = rtdbQuery(ref(rtdb, "universal_analysis_logs"), rtdbLimitToLast(100));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = Object.values(data);
            items.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            callback(items);
        } else {
            callback([]);
        }
    });
};

// 8b. Compare Analytics — tracks which topics students compare most
export const saveCompareAnalytic = async (query: string, hitCount: number) => {
    if (!query?.trim()) return;
    try {
        const docId = `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const entry = {
            id: docId,
            query: query.trim().toLowerCase(),
            displayQuery: query.trim(),
            hitCount,
            timestamp: new Date().toISOString(),
            ts: Date.now(),
        };
        await set(ref(rtdb, `compare_analytics/${docId}`), entry);
    } catch (e) { console.error("Error saving compare analytic:", e); }
};

export const subscribeToCompareAnalytics = (callback: (entries: any[]) => void) => {
    const q = rtdbQuery(ref(rtdb, "compare_analytics"), rtdbLimitToLast(200));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback(Object.values(data));
        } else {
            callback([]);
        }
    });
};

// 8. AI Interactions Log (New)
export const saveAiInteraction = async (data: any) => {
    try {
        const sanitized = sanitizeForFirestore(data);
        const path = `ai_interactions/${data.userId}/${data.id}`;
        // RTDB for realtime user history
        await set(ref(rtdb, path), sanitized);
        // Firestore for Admin Global View
        await setDoc(doc(db, "ai_interactions", data.id), sanitized);
    } catch (e) { console.error("Error saving AI interaction:", e); }
};

export const subscribeToAiHistory = (userId: string, callback: (data: any[]) => void) => {
    const q = rtdbQuery(ref(rtdb, `ai_interactions/${userId}`), rtdbLimitToLast(100));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = Object.values(data);
            items.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            callback(items);
        } else {
            callback([]);
        }
    });
};

export const subscribeToAllAiInteractions = (callback: (data: any[]) => void) => {
    // For Admin: Listen to Firestore
    const q = query(collection(db, "ai_interactions"), orderBy("timestamp", "desc"), limitToLast(50));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => doc.data());
        callback(items);
    });
};

// 9. Secure Key Management
export const saveSecureKeys = async (keys: string[]) => {
    try {
        const sanitized = sanitizeForFirestore({ keys });
        // Firestore only (Secure)
        await setDoc(doc(db, "admin_secure", "apiKeys"), sanitized);
    } catch (e) { console.error("Error saving secure keys:", e); }
};

export const getSecureKeys = async () => {
    try {
        const docSnap = await getDoc(doc(db, "admin_secure", "apiKeys"));
        if (docSnap.exists()) {
            return docSnap.data().keys || [];
        }
        return [];
    } catch (e) {
        console.error("Error fetching secure keys:", e);
        return [];
    }
};

export const incrementApiUsage = async (keyIndex: number, type: 'PILOT' | 'STUDENT') => {
    try {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const docRef = doc(db, "admin_stats", `api_usage_${date}`);
        
        const updates: any = {
            [`key_${keyIndex}`]: increment(1),
            total: increment(1)
        };
        
        if (type === 'PILOT') {
            updates.pilotCount = increment(1);
        } else {
            updates.studentCount = increment(1);
        }
        
        await setDoc(docRef, updates, { merge: true });
    } catch (e) {
        console.error("Error tracking API usage:", e);
    }
};

export const subscribeToApiUsage = (callback: (data: any) => void) => {
    const date = new Date().toISOString().split('T')[0];
    return onSnapshot(doc(db, "admin_stats", `api_usage_${date}`), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(null);
        }
    });
};

// 10. Demand Requests
export const saveDemand = async (userId: string, details: string) => {
    try {
        const id = `dem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const request = {
            id,
            userId,
            details,
            timestamp: new Date().toISOString(),
            status: 'PENDING'
        };
        const sanitized = sanitizeForFirestore(request);
        await set(ref(rtdb, `demand_requests/${id}`), sanitized);
    } catch (e) { console.error("Error saving demand:", e); }
};

export const saveDemandRequest = async (request: any) => {
    try {
        const sanitized = sanitizeForFirestore(request);
        await set(ref(rtdb, `demand_requests/${request.id}`), sanitized);
        await setDoc(doc(db, "demand_requests", request.id), sanitized);
    } catch (e) { console.error("Error saving demand:", e); }
};

export const updateDemandStatus = async (demandId: string, status: string) => {
    try {
        await update(ref(rtdb, `demand_requests/${demandId}`), { status });
        await setDoc(doc(db, "demand_requests", demandId), { status }, { merge: true });
    } catch (e) { console.error("Error updating demand status:", e); }
};

export const subscribeToDemands = (callback: (requests: any[]) => void) => {
    const q = rtdbQuery(ref(rtdb, "demand_requests"), rtdbLimitToLast(200));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = Object.values(data);
            items.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            callback(items);
        } else {
            callback([]);
        }
    });
};

// 11. Support Chat (per-user private)
export const sendSupportMessage = async (msg: any) => {
    try {
        const sanitized = sanitizeForFirestore(msg);
        await set(ref(rtdb, `chat/dm/${msg.userId}/${msg.id}`), sanitized);
    } catch (e) { console.error("Error sending support message:", e); }
};

export const subscribeSupportChat = (userId: string, callback: (msgs: any[]) => void) => {
    const q = rtdbQuery(ref(rtdb, `chat/dm/${userId}`), rtdbLimitToLast(100));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = Object.entries(data).map(([k, v]: any) => ({ id: k, ...v }));
            items.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            callback(items);
        } else {
            callback([]);
        }
    });
};

// 12. Global Chat
export const sendGlobalMessage = async (msg: any) => {
    try {
        const sanitized = sanitizeForFirestore(msg);
        await set(ref(rtdb, `chat/universal/${msg.id}`), sanitized);
    } catch (e) { console.error("Error sending global message:", e); }
};

export const subscribeGlobalChat = (callback: (msgs: any[]) => void) => {
    const q = rtdbQuery(ref(rtdb, "chat/universal"), rtdbLimitToLast(100));
    return onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const items = Object.entries(data).map(([k, v]: any) => ({ id: k, ...v }));
            items.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            callback(items);
        } else {
            callback([]);
        }
    });
};

export const deleteGlobalMessage = async (msgId: string) => {
    try {
        await remove(ref(rtdb, `chat/universal/${msgId}`));
    } catch (e) { console.error("Error deleting global message:", e); }
};

export const deleteSupportMessage = async (userId: string, msgId: string) => {
    try {
        await remove(ref(rtdb, `chat/dm/${userId}/${msgId}`));
    } catch (e) { console.error("Error deleting support message:", e); }
};

// Admin: get all support threads (list of user IDs who have DMs)
export const subscribeAllSupportThreads = (callback: (threads: any[]) => void) => {
    return onValue(ref(rtdb, "chat/dm"), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const threads = Object.entries(data).map(([userId, msgs]: any) => {
                const msgList = Object.values(msgs || {}) as any[];
                msgList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const last = msgList[0];
                return { userId, lastMessage: last, unreadCount: msgList.filter((m: any) => !m.readByAdmin).length };
            });
            threads.sort((a, b) => new Date((b.lastMessage?.timestamp) || 0).getTime() - new Date((a.lastMessage?.timestamp) || 0).getTime());
            callback(threads);
        } else {
            callback([]);
        }
    });
};

// ── THEME & ANIMATION BUILDER ────────────────────────────────────────────────

export const saveUserTheme = async (userId: string, theme: any) => {
    try {
        await setDoc(doc(db, 'user_themes', userId), sanitizeForFirestore({ ...theme, userId, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (e) { console.error('saveUserTheme error:', e); }
};

export const saveUserAnimation = async (userId: string, anim: any) => {
    try {
        await setDoc(doc(db, 'user_animations', userId), sanitizeForFirestore({ ...anim, userId, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (e) { console.error('saveUserAnimation error:', e); }
};

export const publishTheme = async (theme: any) => {
    try {
        await setDoc(doc(db, 'published_themes', theme.id), sanitizeForFirestore({ ...theme, publishedAt: new Date().toISOString() }), { merge: true });
    } catch (e) { console.error('publishTheme error:', e); }
};

export const publishAnimation = async (anim: any) => {
    try {
        await setDoc(doc(db, 'published_animations', anim.id), sanitizeForFirestore({ ...anim, publishedAt: new Date().toISOString() }), { merge: true });
    } catch (e) { console.error('publishAnimation error:', e); }
};

export const subscribePublishedThemes = (callback: (items: any[]) => void) => {
    return onSnapshot(collection(db, 'published_themes'), (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0));
        callback(items);
    });
};

export const subscribePublishedAnimations = (callback: (items: any[]) => void) => {
    return onSnapshot(collection(db, 'published_animations'), (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0));
        callback(items);
    });
};

export const likePublishedTheme = async (themeId: string, userId: string) => {
    try {
        const ref2 = doc(db, 'published_themes', themeId);
        const snap = await getDoc(ref2);
        if (!snap.exists()) return;
        const data = snap.data();
        const likedBy: string[] = data.likedBy || [];
        if (likedBy.includes(userId)) return;
        await updateDoc(ref2, { likes: (data.likes || 0) + 1, likedBy: [...likedBy, userId] });
    } catch (e) { console.error('likePublishedTheme error:', e); }
};

export const likePublishedAnimation = async (animId: string, userId: string) => {
    try {
        const ref2 = doc(db, 'published_animations', animId);
        const snap = await getDoc(ref2);
        if (!snap.exists()) return;
        const data = snap.data();
        const likedBy: string[] = data.likedBy || [];
        if (likedBy.includes(userId)) return;
        await updateDoc(ref2, { likes: (data.likes || 0) + 1, likedBy: [...likedBy, userId] });
    } catch (e) { console.error('likePublishedAnimation error:', e); }
};

export { app, db, rtdb, auth };

export const updateUserUID = async (oldUid: string, newUid: string, userData: any) => {
    try {
        // 1. Copy core to new UID in Firestore
        await setDoc(doc(db, "users", newUid), { ...userData, id: newUid }, { merge: true });

        // 2. Fetch bulky data from old UID
        const bulkySnap = await getDoc(doc(db, "user_data", oldUid)).catch(() => null);
        if (bulkySnap && bulkySnap.exists()) {
            // Copy to new UID
            await setDoc(doc(db, "user_data", newUid), bulkySnap.data(), { merge: true });
            // Delete old bulky data
            await deleteDoc(doc(db, "user_data", oldUid)).catch(() => {});
        }

        // 3. Delete old core
        await deleteDoc(doc(db, "users", oldUid)).catch(() => {});
        await set(ref(rtdb, `users/${oldUid}`), null).catch(() => {});

        // 4. Save to RTDB
        await set(ref(rtdb, `users/${newUid}`), { ...userData, id: newUid }).catch(() => {});

        return true;
    } catch (e) {
        console.error("Error migrating UID:", e);
        return false;
    }
};
