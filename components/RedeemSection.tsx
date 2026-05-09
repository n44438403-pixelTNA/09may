import React, { useState } from 'react';
import { Gift, ArrowRight, AlertCircle, CheckCircle, Map, ExternalLink, X } from 'lucide-react';
import { User, SystemSettings, SubscriptionHistoryEntry } from '../types';
import { ref, get, update, runTransaction } from "firebase/database";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { rtdb, db, saveUserToLive } from "../firebase";

interface Props {
  user: User;
  onSuccess: (updatedUser: User) => void;
  settings?: SystemSettings;
}

export const RedeemSection: React.FC<Props> = ({ user, onSuccess }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [msg, setMsg] = useState('');
  const [showUnlockPopup, setShowUnlockPopup] = useState(false);
  const [unlockedDetails, setUnlockedDetails] = useState<any>(null);

  const handleRedeem = async () => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setStatus('LOADING');
    
    try {
        let targetCode: any = null;
        let source = 'NONE';

        // 1. Check RTDB
        const codeRef = ref(rtdb, `redeem_codes/${cleanCode}`);
        const snapshot = await get(codeRef);
        
        if (snapshot.exists()) {
            targetCode = snapshot.val();
            source = 'RTDB';
        } else {
            // 2. Check Firestore
            try {
                const docRef = doc(db, "redeem_codes", cleanCode);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    targetCode = docSnap.data();
                    source = 'FIRESTORE';
                }
            } catch(e) { console.error("Firestore Code Check Error", e); }
        }

        if (!targetCode) {
            setStatus('ERROR');
            setMsg('Invalid Code. Please check and try again.');
            return;
        }
        
        // CHECK IF REDEEMED / EXHAUSTED
        // Ensure strictly numerical comparison
        const maxUses = Number(targetCode.maxUses) || 1;
        const currentUses = Number(targetCode.usedCount) || 0;

        // If explicitly marked redeemed OR count exceeded
        // Fix: Don't trust isRedeemed flag alone if maxUses > 1, rely on count.
        if (currentUses >= maxUses) {
            setStatus('ERROR');
            setMsg('This code has reached its maximum usage limit.');
            return;
        }

        // CHECK IF ALREADY USED BY THIS USER (For Multi-Use Codes)
        // Handle various formats of redeemedBy (string, array, undefined)
        let redeemedList: string[] = [];
        if (Array.isArray(targetCode.redeemedBy)) {
            redeemedList = targetCode.redeemedBy;
        } else if (typeof targetCode.redeemedBy === 'string') {
            redeemedList = [targetCode.redeemedBy];
        } else if (targetCode.redeemedBy && typeof targetCode.redeemedBy === 'object') {
             // Handle RTDB object map {0: 'uid', 1: 'uid'}
             redeemedList = Object.values(targetCode.redeemedBy);
        }

        if (redeemedList.includes(user.id)) {
            setStatus('ERROR');
            setMsg('You have already used this code.');
            return;
        }

        // TRANSACTIONAL UPDATE (Prevention against Race Conditions)
        if (source === 'RTDB') {
            const result = await runTransaction(codeRef, (currentCode) => {
                if (currentCode) {
                    if (currentCode.usedCount >= currentCode.maxUses) {
                        return; // Abort if max reached
                    }
                    const currentRedeemedBy = Array.isArray(currentCode.redeemedBy)
                        ? currentCode.redeemedBy
                        : (currentCode.redeemedBy ? Object.values(currentCode.redeemedBy) : []);

                    if (currentRedeemedBy.includes(user.id)) {
                        return; // Abort if already used
                    }

                    currentCode.usedCount = (currentCode.usedCount || 0) + 1;
                    currentCode.isRedeemed = currentCode.usedCount >= currentCode.maxUses;

                    if (Array.isArray(currentCode.redeemedBy)) {
                        currentCode.redeemedBy.push(user.id);
                    } else {
                        currentCode.redeemedBy = [...currentRedeemedBy, user.id];
                    }
                    return currentCode;
                }
                return currentCode;
            });

            if (!result.committed) {
                setStatus('ERROR');
                setMsg('Code usage limit reached or collision detected. Please try again.');
                return;
            }
            // Sync to Firestore (Best Effort) — send ONLY the changed fields so it
            // passes the strict Firestore redeem rule (`affectedKeys().hasOnly(...)`).
            try {
                const committed = result.snapshot.val() || {};
                const patch: Record<string, any> = {
                    usedCount: committed.usedCount ?? (currentUses + 1),
                    isRedeemed: !!committed.isRedeemed,
                    redeemedBy: committed.redeemedBy ?? [...redeemedList, user.id],
                    lastRedeemedAt: new Date().toISOString(),
                };
                await updateDoc(doc(db, "redeem_codes", cleanCode), patch);
            } catch(e){ /* non-blocking */ }
        } else {
            // Firestore Transaction (Simulated via Pre-check, real transaction is harder here due to mix)
            // Since we prefer RTDB for codes, we will just use update but with a re-check or optimistic locking if possible.
            // For now, standard update is acceptable for Firestore-only codes (less traffic expected there).

            const newUsedCount = currentUses + 1;
            const isFullyRedeemed = newUsedCount >= maxUses;
            const newRedeemedBy = [...redeemedList, user.id];

            const updatePayload = {
                isRedeemed: isFullyRedeemed,
                usedCount: newUsedCount,
                redeemedBy: newRedeemedBy
            };

            await updateDoc(doc(db, "redeem_codes", cleanCode), updatePayload);
            try { await update(codeRef, updatePayload); } catch(e){}
        }

        // 3. APPLY REWARD TO USER
        let updatedUser = { 
            ...user, 
            redeemedCodes: [...(user.redeemedCodes || []), targetCode.code] 
        };
        let successMessage = '';

        if (targetCode.type === 'SUBSCRIPTION') {
            // Handle Subscription
            const now = new Date();
            let endDate: Date | null = null;
            const subTier = targetCode.subTier || 'WEEKLY';
            const subLevel = targetCode.subLevel || 'BASIC';

            if (subTier === 'WEEKLY') endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            else if (subTier === 'MONTHLY') endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            else if (subTier === '3_MONTHLY') endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
            else if (subTier === 'YEARLY') endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            else if (subTier === 'LIFETIME') endDate = new Date(now.getTime() + 365 * 10 * 24 * 60 * 60 * 1000); // 10 Years fallback
            
            const isoEndDate = endDate ? endDate.toISOString() : undefined;

            // Handle the new ActiveSubscription model to prevent random expiry overwrites
            const newSub = {
                id: `sub_${Date.now()}`,
                tier: subTier,
                level: subLevel,
                startDate: now.toISOString(),
                endDate: isoEndDate,
                source: 'REWARD'
            };

            updatedUser.activeSubscriptions = [...(updatedUser.activeSubscriptions || []), newSub as any];

            // Keep legacy fields updated for simple checks
            updatedUser.subscriptionTier = subTier;
            updatedUser.subscriptionLevel = subLevel;
            updatedUser.subscriptionEndDate = isoEndDate;
            updatedUser.isPremium = true;
            updatedUser.grantedByAdmin = false;

            // Add History Entry
            const historyEntry: SubscriptionHistoryEntry = {
                id: `hist-${Date.now()}`,
                tier: subTier,
                level: subLevel,
                startDate: now.toISOString(),
                endDate: isoEndDate || 'LIFETIME',
                durationHours: endDate ? Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : 999999,
                price: 0,
                originalPrice: 0,
                isFree: true,
                grantSource: 'REWARD' // Via Code
            };
            updatedUser.subscriptionHistory = [historyEntry, ...(updatedUser.subscriptionHistory || [])];
            
            successMessage = `Success! Unlocked ${subTier} ${subLevel} Plan!`;

        } else if (targetCode.type === 'DISCOUNT') {
            // Handle Discount Coupon
            const discount = targetCode.discountPercent || 10;
            updatedUser.storeDiscount = discount;
            successMessage = `Success! ${discount}% Discount applied to Store!`;
        } else if (targetCode.type === 'CONTENT_UNLOCK') {
            // Handle Content Unlock
            const contentId = targetCode.contentId;
            if (contentId) {
                const currentUnlocked = updatedUser.unlockedContent || [];
                if (!currentUnlocked.includes(contentId)) {
                    updatedUser.unlockedContent = [...currentUnlocked, contentId];
                    successMessage = `Success! Content Unlocked: ${targetCode.contentType || 'Item'}`;
                } else {
                    successMessage = `You already have access to this content.`;
                }
            } else {
                successMessage = "Error: Invalid Content Code.";
            }
        } else if (targetCode.type === 'TOPBAR_EFFECT_COLOR') {
            // Handle Top Bar Effect Color Gift
            const color = targetCode.effectColor || '#fbbf24';
            (updatedUser as any).topBarEffectColor = color;
            successMessage = `🎨 Top Bar Effect Color applied! Your app now glows with a custom shimmer.`;
        } else {
            // Handle Credits (Default)
            const amount = targetCode.amount || 0;
            updatedUser.credits = (updatedUser.credits || 0) + amount;
            successMessage = `Success! Added ${amount} Premium Notes.`;
        }
        
        // Save User immediately to local storage first (always succeeds)
        const allUsersStr = localStorage.getItem('nst_users');
        if (allUsersStr) {
            try {
                const allUsers: User[] = JSON.parse(allUsersStr);
                const userIdx = allUsers.findIndex(u => u.id === user.id);
                if (userIdx !== -1) {
                    allUsers[userIdx] = updatedUser;
                    localStorage.setItem('nst_users', JSON.stringify(allUsers));
                }
            } catch (_) {}
        }
        localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
        // Cloud sync (best-effort — doesn't block success if offline)
        try { await saveUserToLive(updatedUser); } catch (syncErr) {
            console.warn("Cloud sync after redeem failed (offline?), saved locally:", syncErr);
        }

        setStatus('SUCCESS');
        setMsg(successMessage);
        setCode('');

        if (targetCode.type === 'CONTENT_UNLOCK') {
            setUnlockedDetails({
                type: targetCode.contentType || 'Item',
                id: targetCode.contentId,
                duration: targetCode.duration || { days: 1, hours: 0 } // Assuming 24h fallback if not specified
            });
            setShowUnlockPopup(true);
        } else if (targetCode.type === 'SUBSCRIPTION') {
            setUnlockedDetails({
                type: 'Subscription Plan',
                tier: targetCode.subTier || 'Premium',
                level: targetCode.subLevel || 'Access',
                startDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                endDate: updatedUser.subscriptionEndDate ? new Date(updatedUser.subscriptionEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Lifetime',
                isSubscription: true
            });
            setShowUnlockPopup(true);
        }

        onSuccess(updatedUser);
        
        setTimeout(() => {
            setStatus('IDLE');
            setMsg('');
        }, 3000);

    } catch (e: any) {
        console.error("Redeem error:", e);
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
            setStatus('ERROR');
            setMsg('Permission Error. Please contact admin.');
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('offline') || msg.toLowerCase().includes('unavailable')) {
            setStatus('ERROR');
            setMsg('Network Error. Check your internet and try again.');
        } else {
            setStatus('ERROR');
            setMsg('Something went wrong. Please try again.');
        }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        {/* REDEEM CODE FORM */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                    <Gift size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Redeem Gift Code</h3>
                    <p className="text-xs text-slate-600">Have a code from Admin? Enter it here.</p>
                </div>
            </div>
            
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Enter 20-digit Code..." 
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border-2 border-slate-100 rounded-xl font-mono text-slate-700 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button 
                    onClick={handleRedeem}
                    disabled={status === 'LOADING' || !code}
                    className="absolute right-2 top-2 bottom-2 bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    <ArrowRight size={20} />
                </button>
            </div>

            {status === 'ERROR' && (
                <div className="mt-3 flex items-center gap-2 text-red-500 text-sm font-medium animate-in slide-in-from-top-1">
                    <AlertCircle size={16} /> {msg}
                </div>
            )}
            
            {status === 'SUCCESS' && (
                <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium animate-in slide-in-from-top-1">
                    <CheckCircle size={16} /> {msg}
                </div>
            )}
        </div>

        {/* ROADMAP POPUP */}
        {showUnlockPopup && unlockedDetails && (
            <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl w-full shadow-2xl overflow-hidden transform transition-all">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center relative">
                        <Gift size={48} className="mx-auto mb-3 opacity-90 drop-shadow-md" />
                        <h3 className="text-2xl font-black mb-1">Content Unlocked!</h3>
                        <p className="text-purple-100 text-sm font-medium">Your redeem code was successful.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Content Type</span>
                                <span className="text-sm font-black text-slate-800">{unlockedDetails.type}</span>
                            </div>
                            {unlockedDetails.isSubscription ? (
                                <>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Plan</span>
                                        <span className="text-sm font-bold text-slate-700">{unlockedDetails.tier} {unlockedDetails.level}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Valid From</span>
                                        <span className="text-sm font-bold text-slate-700">{unlockedDetails.startDate}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Valid Until</span>
                                        <span className="text-sm font-bold text-slate-700">{unlockedDetails.endDate}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Valid For</span>
                                        <span className="text-sm font-bold text-slate-700">
                                            {unlockedDetails.duration?.days ? `${unlockedDetails.duration.days} Days ` : ''}
                                            {unlockedDetails.duration?.hours ? `${unlockedDetails.duration.hours} Hours` : ''}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {!unlockedDetails.isSubscription && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                    <Map size={14} className="text-slate-500" /> How to Access
                                </h4>
                                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside pl-2">
                                    <li>Go to the <span className="font-bold text-slate-800">Library / Search</span> tab.</li>
                                    <li>Find the specific Subject and Chapter.</li>
                                    <li>Look for the <span className="font-bold text-purple-600">Premium {unlockedDetails.type}</span> section.</li>
                                    <li>Tap to open and start learning immediately!</li>
                                </ol>
                            </div>
                        )}

                        <button
                            onClick={() => setShowUnlockPopup(false)}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                        >
                            Got It, Thanks!
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
