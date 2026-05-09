import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Send, MessageSquare, Shield, Users, X, Trash2, Crown, Zap, Lock, Megaphone, BookOpen, CheckCircle, ThumbsUp, ThumbsDown, Award, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { ref, onValue, query, limitToLast, remove, set, get } from 'firebase/database';
import { rtdb } from '../firebase';
import { TopBarEffectsLayer } from '../utils/topBarEffects';

interface Props {
    user: User;
    onClose: () => void;
    isAdmin?: boolean;
    targetUser?: User;
    roomId?: string;
    roomName?: string;
    allowStudentMcq?: boolean;
    initialMcqDraft?: { question: string; options: [string,string,string,string]; correctAnswer: number; explanation: string };
    defaultTab?: 'GLOBAL' | 'MCQ' | 'SUPPORT';
    hideGlobalTab?: boolean;
}

interface McqDraft {
    question: string;
    options: [string, string, string, string];
    correctAnswer: number;
    explanation: string;
}

const EMPTY_MCQ: McqDraft = { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' };

export const UniversalChat: React.FC<Props> = ({ user, onClose, isAdmin, targetUser, roomId, roomName, allowStudentMcq, initialMcqDraft, defaultTab, hideGlobalTab }) => {
    const [activeTab, setActiveTab] = useState<'GLOBAL' | 'SUPPORT' | 'MCQ'>(defaultTab || (hideGlobalTab ? 'MCQ' : 'GLOBAL'));
    const [mcqVotes, setMcqVotes] = useState<Record<string, Record<string, number>>>({});
    const [mcqDailyCount, setMcqDailyCount] = useState(0);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [showMcqBuilder, setShowMcqBuilder] = useState(!!initialMcqDraft);
    const [mcqDraft, setMcqDraft] = useState<McqDraft>(initialMcqDraft || EMPTY_MCQ);
    const [showMcqLeaderboard, setShowMcqLeaderboard] = useState(true);
    const [isAdminOnly, setIsAdminOnly] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState<{name: string; id: string; role: string} | null>(null);
    const [answerRevealed, setAnswerRevealed] = useState<Record<string, boolean>>({});
    const [replyTarget, setReplyTarget] = useState<any | null>(null);
    const [mcqUpvotes, setMcqUpvotes] = useState<Record<string, number>>({});
    const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
    const [msgLikes, setMsgLikes] = useState<Record<string, number>>({});
    const [msgDislikes, setMsgDislikes] = useState<Record<string, number>>({});
    const [myMsgReaction, setMyMsgReaction] = useState<Record<string, 'like' | 'dislike'>>({});
    const [showTopContribs, setShowTopContribs] = useState(true);
    const dummyRef = useRef<HTMLDivElement>(null);
    const upvotingRef = useRef<Set<string>>(new Set());
    const reactingRef = useRef<Set<string>>(new Set());
    const isAdminOrSub = user.role === 'ADMIN' || user.role === 'SUB_ADMIN';

    const chatPath = roomId
        ? `chat/rooms/${roomId}`
        : activeTab === 'SUPPORT'
            ? `chat/dm/${isAdmin ? targetUser?.id : user.id}`
            : 'chat/universal';
    const broadcastPath = 'chat/universal';

    useEffect(() => {
        if (activeTab === 'SUPPORT' && isAdmin && !targetUser && !roomId) return;
        const q = query(ref(rtdb, chatPath), limitToLast(80));
        const unsub = onValue(q, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.entries(data).map(([k, v]: any) => ({ id: k, ...v }));
                list.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setMessages(list);
            } else {
                setMessages([]);
            }
        });
        return () => unsub();
    }, [chatPath, activeTab, isAdmin, targetUser]);

    // Listen to MCQ upvotes from Firebase
    useEffect(() => {
        const upvotesRef = ref(rtdb, 'chat/mcq_upvotes');
        const unsub = onValue(upvotesRef, (snap) => {
            const data = snap.val() || {};
            const counts: Record<string, number> = {};
            const mine = new Set<string>();
            Object.entries(data).forEach(([msgId, voters]: any) => {
                if (typeof voters === 'object') {
                    counts[msgId] = Object.keys(voters).length;
                    if (voters[user.id]) mine.add(msgId);
                }
            });
            setMcqUpvotes(counts);
            setMyUpvotes(mine);
        });
        return () => unsub();
    }, [user.id]);

    // Listen to message reactions (like/dislike) for all messages
    useEffect(() => {
        const rRef = ref(rtdb, 'chat/msg_reactions');
        const unsub = onValue(rRef, (snap) => {
            const data = snap.val() || {};
            const likes: Record<string, number> = {};
            const dislikes: Record<string, number> = {};
            const mine: Record<string, 'like' | 'dislike'> = {};
            Object.entries(data).forEach(([msgId, voters]: any) => {
                if (typeof voters === 'object') {
                    Object.entries(voters).forEach(([uid, reaction]: any) => {
                        if (reaction === 'like') likes[msgId] = (likes[msgId] || 0) + 1;
                        else if (reaction === 'dislike') dislikes[msgId] = (dislikes[msgId] || 0) + 1;
                        if (uid === user.id) mine[msgId] = reaction;
                    });
                }
            });
            setMsgLikes(likes);
            setMsgDislikes(dislikes);
            setMyMsgReaction(mine);
        });
        return () => unsub();
    }, [user.id]);

    // Load MCQ answer votes from localStorage on mount
    useEffect(() => {
        const allVotes: Record<string, Record<string, number>> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('mcq_vote_')) {
                const msgId = k.replace('mcq_vote_', '');
                try { allVotes[msgId] = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
            }
        }
        setMcqVotes(allVotes);
    }, []);

    // Track daily MCQ send count — stored in localStorage (no Firebase rules needed)
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        const key = `mcq_daily_${today}_${user.id}`;
        const stored = parseInt(localStorage.getItem(key) || '0', 10);
        setMcqDailyCount(stored);
    }, [user.id]);

    const handleUpvote = async (msgId: string) => {
        if (upvotingRef.current.has(msgId)) return;
        upvotingRef.current.add(msgId);
        const vPath = `chat/mcq_upvotes/${msgId}/${user.id}`;
        const wasLiked = myUpvotes.has(msgId);
        try {
            if (wasLiked) {
                await remove(ref(rtdb, vPath));
            } else {
                await set(ref(rtdb, vPath), true);
            }
        } catch (e) { console.error('Upvote failed', e); }
        finally {
            setTimeout(() => upvotingRef.current.delete(msgId), 800);
        }
    };

    // Like / dislike any message (TEXT, BROADCAST, MCQ dislike)
    const handleMsgReact = async (msgId: string, type: 'like' | 'dislike') => {
        const key = `${msgId}_${type}`;
        if (reactingRef.current.has(key)) return;
        reactingRef.current.add(key);
        const vPath = `chat/msg_reactions/${msgId}/${user.id}`;
        const current = myMsgReaction[msgId];
        try {
            if (current === type) {
                await remove(ref(rtdb, vPath));
            } else {
                await set(ref(rtdb, vPath), type);
            }
        } catch (e) { console.error('React failed', e); }
        finally { setTimeout(() => reactingRef.current.delete(key), 800); }
    };

    useEffect(() => {
        dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const genId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const buildBase = (extra: any = {}) => ({
        id: genId(),
        userId: user.id || 'anon',
        userName: user.name || 'User',
        role: user.role || 'STUDENT',
        subscriptionLevel: user.subscriptionLevel || 'FREE',
        isPremium: !!user.isPremium,
        subscriptionTier: user.subscriptionTier || 'FREE',
        timestamp: new Date().toISOString(),
        ...extra,
    });

    const normalizeLevel = (msg: any) => {
        const raw = String(msg.subscriptionLevel || msg.subscriptionTier || (msg.isPremium ? 'PREMIUM' : 'FREE')).toUpperCase();
        if (raw === 'ULTRA') return 'ULTRA';
        if (raw === 'PREMIUM') return 'PREMIUM';
        if (raw === 'BASIC') return 'BASIC';
        return 'FREE';
    };

    const cleanMessage = (msg: any) => {
        const out: any = {};
        Object.entries(msg).forEach(([key, value]) => {
            if (value !== undefined) out[key] = value;
        });
        return out;
    };

    const handleSendText = async () => {
        const txt = input.trim();
        if (!txt) return;
        const replyPayload = replyTarget ? {
            id: replyTarget.id,
            userId: replyTarget.userId,
            userName: replyTarget.userName,
            role: replyTarget.role,
            text: replyTarget.text || '',
        } : null;
        const msg = buildBase({
            type: 'TEXT',
            text: txt,
            isAdminOnly: isAdminOrSub ? isAdminOnly : false,
            ...(replyPayload ? { replyTo: replyPayload } : {}),
        });
        try {
            await set(ref(rtdb, `${chatPath}/${msg.id}`), cleanMessage(msg));
            setInput('');
            setIsAdminOnly(false);
            setReplyTarget(null);
        } catch (e: any) { alert('Send failed: ' + e.message); }
    };

    const handleBroadcast = async () => {
        const txt = input.trim();
        if (!txt) return;
        const msg = buildBase({ type: 'ADMIN_BROADCAST', text: txt, isAdminOnly: false });
        try {
            await Promise.all([
                set(ref(rtdb, `${broadcastPath}/${msg.id}`), cleanMessage(msg)),
                set(ref(rtdb, `${chatPath}/${msg.id}`), cleanMessage(msg)),
            ]);
            setInput('');
        } catch (e: any) { alert('Failed: ' + e.message); }
    };

    const handleMcqVote = async (msgId: string, optionIndex: number) => {
        try {
            // Store vote in localStorage — no Firebase rules needed
            const key = `mcq_vote_${msgId}`;
            const existing = JSON.parse(localStorage.getItem(key) || '{}');
            existing[user.id] = optionIndex;
            localStorage.setItem(key, JSON.stringify(existing));
            // Refresh votes state from localStorage
            setMcqVotes(prev => ({
                ...prev,
                [msgId]: { ...(prev[msgId] || {}), [user.id]: optionIndex }
            }));
        } catch (e) { console.error('MCQ vote failed', e); }
    };

    const handleSendMcq = async () => {
        if (!isAdminOrSub && mcqDailyCount >= 10) {
            alert('Aap aaj ke 10 MCQ bhej chuke hain! Kal phir aa sakte hain. 😊'); return;
        }
        const { question, options, correctAnswer, explanation } = mcqDraft;
        if (!question.trim() || options.some(o => !o.trim())) {
            alert('Question aur sare 4 options fill karo'); return;
        }
        const msg = buildBase({
            type: 'MCQ',
            text: question,
            mcqData: { question, options, correctAnswer, explanation },
            isAdminOnly: isAdminOrSub ? isAdminOnly : false,
        });
        // MCQs go to chat/universal (allowed path), tagged with type:'MCQ' for tab filtering
        try {
            await set(ref(rtdb, `chat/universal/${msg.id}`), cleanMessage(msg));
            if (!isAdminOrSub) {
                const today = new Date().toISOString().slice(0, 10);
                const lsKey = `mcq_daily_${today}_${user.id}`;
                const newCount = mcqDailyCount + 1;
                localStorage.setItem(lsKey, String(newCount));
                setMcqDailyCount(newCount);
            }
            setMcqDraft(EMPTY_MCQ);
            setShowMcqBuilder(false);
            setIsAdminOnly(false);
        } catch (e: any) { alert('Send failed: ' + e.message); }
    };

    const handleDelete = async (msgId: string, msgUserId: string) => {
        if (!isAdminOrSub && user.id !== msgUserId) return;
        if (!confirm('Delete this message?')) return;
        try { await remove(ref(rtdb, `${chatPath}/${msgId}`)); }
        catch (e) { console.error(e); }
    };

    const getBubbleStyle = (msg: any, isMe: boolean) => {
        const level = normalizeLevel(msg);
        const corner = isMe ? 'rounded-tr-none' : 'rounded-tl-none';
        // Admin / SUB_ADMIN always show their role colour regardless of isMe
        if (msg.type === 'ADMIN_BROADCAST' || msg.role === 'ADMIN') return `bg-slate-950 text-white border border-blue-500 ${corner} shadow-[0_0_18px_rgba(30,64,175,0.45)]`;
        if (msg.role === 'SUB_ADMIN') return `bg-indigo-900 text-white border border-indigo-400 ${corner} shadow-md`;
        // Regular users — colour by subscription tier (same for isMe and others)
        if (level === 'ULTRA') return `bg-blue-900 text-white border border-blue-700 ${corner} shadow-sm`;
        if (level === 'BASIC') return `bg-sky-200 text-sky-900 border border-sky-300 ${corner}`;
        // FREE / default → gray
        return `bg-slate-200 text-slate-700 border border-slate-300 ${corner}`;
    };

    const getRoleBadge = (msg: any) => {
        const level = normalizeLevel(msg);
        if (msg.role === 'ADMIN') return <span className="bg-blue-950 text-white border border-blue-400 px-1.5 rounded text-[8px] font-black">ADMIN</span>;
        if (msg.role === 'SUB_ADMIN') return <span className="bg-indigo-500 text-white px-1.5 rounded text-[8px] font-bold">MOD</span>;
        if (level === 'ULTRA') return <span className="bg-sky-500 text-white px-1.5 rounded text-[8px] font-black">ULTRA</span>;
        if (level === 'PREMIUM') return <span className="bg-amber-500 text-white px-1.5 rounded text-[8px] font-black">PREMIUM</span>;
        if (level === 'BASIC') return <span className="bg-sky-400 text-white px-1.5 rounded text-[8px] font-black">BASIC</span>;
        if (level === 'FREE') return <span className="bg-slate-400 text-white px-1.5 rounded text-[8px] font-black">FREE</span>;
        return null;
    };

    const getNameColor = (msg: any) => {
        const level = normalizeLevel(msg);
        if (msg.role === 'ADMIN') return 'text-blue-300';
        if (msg.role === 'SUB_ADMIN') return 'text-indigo-300';
        if (level === 'ULTRA') return 'text-sky-500';
        if (msg.subscriptionLevel === 'PREMIUM') return 'text-amber-500';
        if (level === 'BASIC') return 'text-sky-400';
        return 'text-slate-400';
    };

    const getNameBadge = (msg: any) => {
        const level = normalizeLevel(msg);
        if (msg.role === 'ADMIN') return <span className="bg-blue-950 text-white border border-blue-400 px-1.5 py-0.5 rounded text-[8px] font-black">ADMIN</span>;
        if (msg.role === 'SUB_ADMIN') return <span className="bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">MOD</span>;
        if (level === 'ULTRA') return <span className="bg-sky-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">ULTRA</span>;
        if (level === 'PREMIUM') return <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">PREMIUM</span>;
        if (level === 'BASIC') return <span className="bg-sky-400 text-white px-1.5 py-0.5 rounded text-[8px] font-black">BASIC</span>;
        return <span className="bg-slate-400 text-white px-1.5 py-0.5 rounded text-[8px] font-black">FREE</span>;
    };

    const visibleMessages = activeTab === 'MCQ'
        ? messages.filter(msg => msg.type === 'MCQ')
        : activeTab === 'GLOBAL'
            ? messages.filter(msg => (!msg.isAdminOnly || isAdminOrSub) && msg.type !== 'MCQ')
            : messages.filter(msg => !msg.isAdminOnly || isAdminOrSub);
    const canReply = activeTab === 'MCQ' || activeTab === 'SUPPORT' || !!roomId || isAdminOrSub;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-stretch justify-stretch p-0">

            {/* Profile popup */}
            {selectedUserProfile && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUserProfile(null)}>
                    <div className="bg-white p-6 rounded-2xl shadow-2xl text-center animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-slate-600">
                            {selectedUserProfile.name.charAt(0)}
                        </div>
                        <h3 className="text-lg font-black text-slate-800">{selectedUserProfile.name}</h3>
                        <p className="text-xs text-slate-600 font-mono mb-2">ID: {selectedUserProfile.id}</p>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{selectedUserProfile.role}</span>
                    </div>
                </div>
            )}

            <div className="bg-white w-full h-full flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${roomId ? 'bg-indigo-600' : activeTab === 'GLOBAL' ? 'bg-blue-600' : activeTab === 'MCQ' ? 'bg-violet-600' : 'bg-green-600'}`}>
                            {roomId ? <MessageSquare size={18} /> : activeTab === 'GLOBAL' ? <Users size={18} /> : activeTab === 'MCQ' ? <BookOpen size={18} /> : <Shield size={18} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">
                                {roomId ? roomName : activeTab === 'GLOBAL' ? 'Global Chat' : activeTab === 'MCQ' ? 'MCQ Community' : isAdmin ? `Chat — ${targetUser?.name || 'User'}` : 'Admin Support'}
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                {activeTab === 'GLOBAL' ? 'Sabhi users dekh sakte hain' : activeTab === 'MCQ' ? `Aaj bheje: ${mcqDailyCount}/10 MCQ${!isAdminOrSub ? ` • ${Math.max(0, 10 - mcqDailyCount)} bache` : ''}` : 'Sirf Admin/Mod dekh sakta hai'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                {/* Tabs */}
                {!roomId && (
                    <div className="flex bg-slate-100 p-1 gap-1 shrink-0">
                        {!hideGlobalTab && (
                        <button
                            onClick={() => setActiveTab('GLOBAL')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'GLOBAL' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={12} /> Global
                        </button>
                        )}
                        <button
                            onClick={() => setActiveTab('MCQ')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 relative ${activeTab === 'MCQ' ? 'bg-white shadow text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BookOpen size={12} /> MCQs
                            {!isAdminOrSub && mcqDailyCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-violet-500 text-white text-[7px] font-black rounded-full px-1 leading-tight">{mcqDailyCount}/10</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('SUPPORT')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'SUPPORT' ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Shield size={12} /> {isAdmin ? 'DMs' : 'Help'}
                        </button>
                    </div>
                )}

                {/* Admin support with no target user */}
                {activeTab === 'SUPPORT' && isAdmin && !targetUser && !roomId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                        <Shield size={40} className="mb-3 opacity-40" />
                        <p className="font-bold text-sm">Koi user select nahi hua</p>
                        <p className="text-xs mt-1 text-slate-400">Admin panel → Users list se kisi user ka "Chat" button dabao</p>
                    </div>
                ) : (
                    <>
                        {/* MCQ LEADERBOARD — shown only in MCQ tab */}
                        {activeTab === 'MCQ' && !roomId && (() => {
                            const mcqMessages = messages.filter(m => m.type === 'MCQ');
                            if (mcqMessages.length === 0) return null;
                            const byUserDay: Record<string, { userId: string; userName: string; date: string; dateTs: number; count: number; responses: number; likes: number }> = {};
                            mcqMessages.forEach(m => {
                                const ts = new Date(m.timestamp);
                                const dateLabel = ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                                const dayTs = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).getTime();
                                const key = `${m.userId}_${dateLabel}`;
                                if (!byUserDay[key]) byUserDay[key] = { userId: m.userId, userName: m.userName, date: dateLabel, dateTs: dayTs, count: 0, responses: 0, likes: 0 };
                                byUserDay[key].count++;
                                byUserDay[key].responses += Object.keys(mcqVotes[m.id] || {}).length;
                                byUserDay[key].likes += (mcqUpvotes[m.id] || 0);
                            });
                            const rows = Object.values(byUserDay).sort((a, b) => b.dateTs - a.dateTs || b.count - a.count || b.likes - a.likes).slice(0, 10);
                            const medals = ['🥇','🥈','🥉'];
                            return (
                                <div className="mx-3 mt-3 mb-0 rounded-2xl overflow-hidden border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
                                    <button className="w-full flex items-center justify-between px-3 py-2" onClick={() => setShowMcqLeaderboard(v => !v)}>
                                        <div className="flex items-center gap-2">
                                            <Award size={14} className="text-violet-600" />
                                            <span className="text-[11px] font-black text-violet-800 uppercase tracking-wider">MCQ Leaderboard</span>
                                        </div>
                                        {showMcqLeaderboard ? <ChevronUp size={14} className="text-violet-600" /> : <ChevronDown size={14} className="text-violet-600" />}
                                    </button>
                                    {showMcqLeaderboard && (
                                        <div className="px-3 pb-3 space-y-1.5">
                                            <div className="grid grid-cols-5 text-[8px] font-black text-violet-500 uppercase tracking-wider px-1 pb-1 border-b border-violet-100">
                                                <span className="col-span-2">Name</span>
                                                <span className="text-center">Day</span>
                                                <span className="text-center">MCQs</span>
                                                <span className="text-center">👍</span>
                                            </div>
                                            {rows.map((row, i) => (
                                                <div key={`${row.userId}_${row.date}`} className={`grid grid-cols-5 items-center text-[10px] rounded-xl px-2 py-1.5 ${i === 0 ? 'bg-amber-50 border border-amber-200' : i === 1 ? 'bg-slate-50 border border-slate-200' : i === 2 ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-violet-100'}`}>
                                                    <div className="col-span-2 flex items-center gap-1 min-w-0">
                                                        <span className="text-sm leading-none">{medals[i] || '🔹'}</span>
                                                        <span className="font-black text-slate-800 truncate">{row.userName.split(' ')[0]}</span>
                                                    </div>
                                                    <span className="text-center font-bold text-slate-500">{row.date}</span>
                                                    <span className="text-center font-black text-violet-700">{row.count}</span>
                                                    <span className="text-center font-bold text-amber-600">{row.likes > 0 ? row.likes : '—'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* TOP CONTRIBUTORS BANNER — shown only in Global tab */}
                        {activeTab === 'GLOBAL' && !roomId && (() => {
                            const today = new Date().toDateString();
                            const todayMcqs = visibleMessages.filter(m => m.type === 'MCQ' && new Date(m.timestamp).toDateString() === today);
                            const contribMap: Record<string, {name: string; count: number; upvotes: number}> = {};
                            todayMcqs.forEach(m => {
                                if (!contribMap[m.userId]) contribMap[m.userId] = { name: m.userName, count: 0, upvotes: 0 };
                                contribMap[m.userId].count++;
                                contribMap[m.userId].upvotes += (mcqUpvotes[m.id] || 0);
                            });
                            const contribs = Object.entries(contribMap)
                                .map(([id, v]) => ({ id, ...v }))
                                .sort((a, b) => (b.count + b.upvotes) - (a.count + a.upvotes))
                                .slice(0, 3);
                            if (contribs.length === 0) return null;
                            const medals = ['🥇','🥈','🥉'];
                            return (
                                <div className="mx-3 mt-3 mb-0 rounded-2xl overflow-hidden border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                                    <button
                                        className="w-full flex items-center justify-between px-3 py-2"
                                        onClick={() => setShowTopContribs(v => !v)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Award size={14} className="text-amber-600" />
                                            <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Top Contributors Today</span>
                                        </div>
                                        {showTopContribs ? <ChevronUp size={14} className="text-amber-600" /> : <ChevronDown size={14} className="text-amber-600" />}
                                    </button>
                                    {showTopContribs && (
                                        <div className="px-3 pb-2.5 flex gap-2">
                                            {contribs.map((c, i) => (
                                                <div key={c.id} className="flex-1 bg-white rounded-xl px-2 py-2 text-center border border-amber-100 shadow-sm">
                                                    <p className="text-lg leading-none mb-0.5">{medals[i]}</p>
                                                    <p className="text-[10px] font-black text-slate-800 truncate">{c.name.split(' ')[0]}</p>
                                                    <p className="text-[9px] font-bold text-amber-600">{c.count} MCQ{c.count > 1 ? 's' : ''}</p>
                                                    {c.upvotes > 0 && <p className="text-[8px] text-slate-400">👍 {c.upvotes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                            {visibleMessages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                    <MessageSquare size={40} className="opacity-40" />
                                    <p className="text-xs">Koi message nahi. Pehla message bhejo!</p>
                                </div>
                            )}

                            {visibleMessages.map((msg) => {
                                const isMe = msg.userId === user.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>

                                        {msg.isAdminOnly && isAdminOrSub && (
                                            <div className="flex items-center gap-1 mb-0.5 px-1">
                                                <Lock size={9} className="text-amber-500" />
                                                <span className="text-[9px] font-bold text-amber-500">ADMIN ONLY</span>
                                            </div>
                                        )}

                                        <div className={`max-w-[92%] rounded-2xl px-4 py-3.5 text-sm relative overflow-hidden ${getBubbleStyle(msg, isMe)} ${msg.type === 'ADMIN_BROADCAST' || msg.role === 'ADMIN' ? 'admin-dark-bubble' : ''}`}>
                                            {/* TopBar animated effect on admin/broadcast messages */}
                                            {(msg.role === 'ADMIN' || msg.role === 'SUB_ADMIN') && (
                                                <TopBarEffectsLayer effects={[
                                                    { id: 'shimmer-gold', enabled: true, color: msg.role === 'ADMIN' ? '#a78bfa' : '#818cf8', speed: 1.2 },
                                                    { id: 'glow-both',    enabled: true, color: msg.role === 'ADMIN' ? '#a78bfa' : '#818cf8', speed: 1.5 },
                                                ]} />
                                            )}
                                            {msg.type === 'ADMIN_BROADCAST' && (
                                                <TopBarEffectsLayer effects={[
                                                    { id: 'shimmer-gold', enabled: true, color: '#fbbf24', speed: 1.0 },
                                                ]} />
                                            )}
                                            {/* Delete — admin sees on all, user sees only on own */}
                                            {(isAdminOrSub || isMe) && (
                                                <button
                                                    onClick={() => handleDelete(msg.id, msg.userId)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            )}
                                            {/* Reply — all users, on others' messages */}
                                            {canReply && !isMe && (
                                                <button
                                                    onClick={() => setReplyTarget(msg)}
                                                    className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full px-2 py-1 text-[9px] font-black shadow-md"
                                                >
                                                    Reply
                                                </button>
                                            )}

                                            {/* Sender name */}
                                            {!isMe && (
                                                <div
                                                    className="flex items-center gap-1 mb-1 cursor-pointer"
                                                    onClick={() => setSelectedUserProfile({ name: msg.userName, id: msg.userId, role: msg.role })}
                                                >
                                                    <p className={`text-[9px] font-bold ${getNameColor(msg)} ${msg.type === 'ADMIN_BROADCAST' || msg.role === 'ADMIN' ? 'admin-name' : ''}`}>
                                                        {msg.userName}
                                                    </p>
                                                    <div className={msg.type === 'ADMIN_BROADCAST' || msg.role === 'ADMIN' ? 'admin-badge' : ''}>
                                                        {getNameBadge(msg)}
                                                    </div>
                                                </div>
                                            )}
                                            {msg.replyTo && (
                                                <div className="mb-2 rounded-lg border-l-4 border-blue-300 bg-white/60 px-2 py-1 text-[10px] text-slate-600">
                                                    <div className="font-bold text-blue-600">{msg.replyTo.userName}</div>
                                                    <div className="truncate">{msg.replyTo.text}</div>
                                                </div>
                                            )}
                                            {msg.isPremium && (
                                                <div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-purple-600">
                                                    <Crown size={10} className="fill-purple-600" /> Premium
                                                </div>
                                            )}
                                            {(msg.role === 'ADMIN' || msg.role === 'SUB_ADMIN') && !msg.isPremium && (
                                                <div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-300">
                                                    <Shield size={10} className="text-blue-300" /> Admin
                                                </div>
                                            )}

                                            {/* TEXT */}
                                            {(msg.type === 'TEXT' || !msg.type) && (
                                                <>
                                                    <p className="leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <button
                                                            onClick={() => handleMsgReact(msg.id, 'like')}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${myMsgReaction[msg.id] === 'like' ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-green-100 hover:text-green-700 text-inherit'}`}
                                                        >
                                                            <ThumbsUp size={10} className={myMsgReaction[msg.id] === 'like' ? 'fill-white' : ''} />
                                                            <span>{msgLikes[msg.id] || 0}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleMsgReact(msg.id, 'dislike')}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${myMsgReaction[msg.id] === 'dislike' ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-red-100 hover:text-red-600 text-inherit'}`}
                                                        >
                                                            <ThumbsDown size={10} className={myMsgReaction[msg.id] === 'dislike' ? 'fill-white' : ''} />
                                                            <span>{msgDislikes[msg.id] || 0}</span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {/* ADMIN BROADCAST */}
                                            {msg.type === 'ADMIN_BROADCAST' && (
                                                <>
                                                    <div className="flex items-start gap-2">
                                                        <Megaphone size={14} className="text-blue-300 shrink-0 mt-0.5" />
                                                        <p className="leading-relaxed font-semibold text-white">{msg.text}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <button
                                                            onClick={() => handleMsgReact(msg.id, 'like')}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${myMsgReaction[msg.id] === 'like' ? 'bg-green-500 text-white' : 'bg-white/20 text-blue-200 hover:bg-green-900/40 hover:text-green-300'}`}
                                                        >
                                                            <ThumbsUp size={10} className={myMsgReaction[msg.id] === 'like' ? 'fill-white' : ''} />
                                                            <span>{msgLikes[msg.id] || 0}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleMsgReact(msg.id, 'dislike')}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${myMsgReaction[msg.id] === 'dislike' ? 'bg-red-500 text-white' : 'bg-white/20 text-blue-200 hover:bg-red-900/40 hover:text-red-300'}`}
                                                        >
                                                            <ThumbsDown size={10} className={myMsgReaction[msg.id] === 'dislike' ? 'fill-white' : ''} />
                                                            <span>{msgDislikes[msg.id] || 0}</span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {/* MCQ — Interactive Poll with Vote Distribution */}
                                            {msg.type === 'MCQ' && msg.mcqData && (() => {
                                                const voteData = mcqVotes[msg.id] || {};
                                                const myVote = voteData[user.id];
                                                const hasVoted = myVote !== undefined;
                                                const totalVotes = Object.values(voteData).length;
                                                const optionCounts = (msg.mcqData.options || []).map((_: any, i: number) =>
                                                    Object.values(voteData).filter((v: any) => v === i).length
                                                );
                                                return (
                                                    <div className="min-w-[220px] max-w-[295px]">
                                                        <div className="flex items-center gap-1 mb-2">
                                                            <BookOpen size={11} className={isMe ? 'text-violet-200' : 'text-violet-500'} />
                                                            <span className={`text-[10px] font-black uppercase tracking-wide ${isMe ? 'text-violet-200' : 'text-violet-600'}`}>MCQ</span>
                                                            {totalVotes > 0 && <span className={`text-[9px] font-bold ml-auto ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>{totalVotes} jawab</span>}
                                                        </div>
                                                        <p className="font-semibold text-[13px] leading-snug mb-3">{msg.mcqData.question}</p>
                                                        <div className="space-y-2">
                                                            {(msg.mcqData.options || []).map((opt: string, oi: number) => {
                                                                const isPicked = myVote === oi;
                                                                const correct = oi === msg.mcqData.correctAnswer;
                                                                const pct = totalVotes > 0 ? Math.round((optionCounts[oi] / totalVotes) * 100) : 0;
                                                                if (!hasVoted) {
                                                                    return (
                                                                        <button
                                                                            key={oi}
                                                                            onClick={() => handleMcqVote(msg.id, oi)}
                                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-[0.98] ${isMe ? 'bg-blue-400/20 border-blue-300/50 text-blue-50 hover:bg-blue-400/30' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-400 hover:bg-violet-50'}`}
                                                                        >
                                                                            <span className="font-bold mr-1.5 text-[10px]">{String.fromCharCode(65 + oi)}.</span>{opt}
                                                                        </button>
                                                                    );
                                                                }
                                                                return (
                                                                    <div key={oi} className={`rounded-xl border overflow-hidden ${correct ? 'border-green-400' : isPicked && !correct ? 'border-red-300' : 'border-slate-200'}`}>
                                                                        <div className={`relative px-3 py-2 text-xs font-medium ${correct ? 'bg-green-50 text-green-800' : isPicked && !correct ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}>
                                                                            <div className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: correct ? 'rgba(34,197,94,0.18)' : isPicked ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)' }} />
                                                                            <div className="relative flex items-center justify-between gap-2">
                                                                                <span className="flex items-center gap-1">
                                                                                    <span className="font-bold text-[10px]">{String.fromCharCode(65 + oi)}.</span>
                                                                                    {opt}
                                                                                    {correct && <CheckCircle size={10} className="text-green-600 shrink-0" />}
                                                                                    {isPicked && !correct && <span className="text-red-500 font-black text-sm leading-none">✗</span>}
                                                                                    {isPicked && correct && <span className="text-green-600 font-black text-sm leading-none">✓</span>}
                                                                                </span>
                                                                                <span className="font-black text-[11px] shrink-0">{pct}%</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {!hasVoted && <p className={`mt-1.5 text-[10px] font-bold ${isMe ? 'text-violet-200' : 'text-violet-600/70'}`}>👆 Apna jawab chunein</p>}
                                                        {hasVoted && msg.mcqData.explanation && (
                                                            <p className={`mt-2 text-[10px] italic leading-relaxed ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>💡 {msg.mcqData.explanation}</p>
                                                        )}
                                                        {/* Like / Dislike row */}
                                                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                                            <button
                                                                onClick={() => handleUpvote(msg.id)}
                                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${myUpvotes.has(msg.id) ? 'bg-violet-600 text-white' : isMe ? 'bg-blue-400/20 text-blue-200 hover:bg-blue-400/30' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-600'}`}
                                                            >
                                                                <ThumbsUp size={10} className={myUpvotes.has(msg.id) ? 'fill-white' : ''} />
                                                                <span>{mcqUpvotes[msg.id] || 0}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleMsgReact(msg.id, 'dislike')}
                                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${myMsgReaction[msg.id] === 'dislike' ? 'bg-red-500 text-white' : isMe ? 'bg-blue-400/20 text-blue-200 hover:bg-blue-400/30' : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500'}`}
                                                            >
                                                                <ThumbsDown size={10} className={myMsgReaction[msg.id] === 'dislike' ? 'fill-white' : ''} />
                                                                <span>{msgDislikes[msg.id] || 0}</span>
                                                            </button>
                                                            {(mcqUpvotes[msg.id] || 0) >= 5 && (
                                                                <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                                                    <Award size={9} className="text-amber-500" /> Highlighted
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={dummyRef} />
                        </div>

                        {/* MCQ quick action bar — only in MCQ tab */}
                        {activeTab === 'MCQ' && (
                        <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 shrink-0">
                            {!isAdminOrSub && (
                                <div className={`mb-1.5 flex items-center justify-between text-[10px] font-bold px-0.5 ${mcqDailyCount >= 10 ? 'text-red-500' : 'text-violet-500'}`}>
                                    <span>Aaj ke MCQ: {mcqDailyCount}/10</span>
                                    {mcqDailyCount >= 10 ? <span>Limit poori ⛔ Kal aana</span> : <span>{10 - mcqDailyCount} bache</span>}
                                </div>
                            )}
                            <button
                                onClick={() => setShowMcqBuilder(true)}
                                disabled={!isAdminOrSub && mcqDailyCount >= 10}
                                title="MCQ bhejo"
                                className={`w-full py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${!isAdminOrSub && mcqDailyCount >= 10 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 active:scale-95'}`}
                            >
                                <BookOpen size={16} /> MCQ Bhejo
                            </button>
                        </div>
                        )}

                        {/* MCQ Builder — bottom-sheet modal */}
                        {showMcqBuilder && (
                            <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{touchAction:'none'}}>
                                {/* Backdrop */}
                                <div
                                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                                    onClick={() => { setShowMcqBuilder(false); setMcqDraft(EMPTY_MCQ); }}
                                />
                                {/* Sheet */}
                                <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh]">
                                    {/* Handle bar */}
                                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                                        <div className="w-10 h-1 rounded-full bg-slate-200" />
                                    </div>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-slate-100 shrink-0">
                                        <div>
                                            <p className="text-sm font-black text-indigo-700 flex items-center gap-2"><BookOpen size={15} /> MCQ Banao &amp; Bhejo</p>
                                            {!isAdminOrSub && (
                                                <p className={`text-[10px] font-bold mt-0.5 ${mcqDailyCount >= 10 ? 'text-red-500' : 'text-slate-400'}`}>
                                                    Aaj ke {mcqDailyCount}/10 MCQ bheje gaye
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setShowMcqBuilder(false); setMcqDraft(EMPTY_MCQ); }}
                                            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                    {/* Scrollable form body */}
                                    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                                        {/* Question */}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wide">Question</label>
                                            <textarea
                                                rows={3}
                                                value={mcqDraft.question}
                                                onChange={e => setMcqDraft(p => ({ ...p, question: e.target.value }))}
                                                placeholder="Apna question yahan likhein..."
                                                className="w-full p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none leading-relaxed"
                                            />
                                        </div>
                                        {/* Options */}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wide">Options <span className="normal-case text-green-600 font-bold">(sahi jawab pe tap karo ✓)</span></label>
                                            <div className="space-y-2">
                                                {mcqDraft.options.map((opt, oi) => (
                                                    <div key={oi} className={`flex gap-2.5 items-center rounded-xl border-2 px-3 py-2 transition-all ${mcqDraft.correctAnswer === oi ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                                        <button
                                                            onClick={() => setMcqDraft(p => ({ ...p, correctAnswer: oi }))}
                                                            className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center text-[11px] font-black transition-all ${mcqDraft.correctAnswer === oi ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'border-slate-300 text-slate-400'}`}
                                                        >
                                                            {mcqDraft.correctAnswer === oi ? '✓' : String.fromCharCode(65 + oi)}
                                                        </button>
                                                        <input
                                                            value={opt}
                                                            onChange={e => {
                                                                const opts = [...mcqDraft.options] as [string, string, string, string];
                                                                opts[oi] = e.target.value;
                                                                setMcqDraft(p => ({ ...p, options: opts }));
                                                            }}
                                                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Explanation */}
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wide">Explanation <span className="normal-case text-slate-400 font-normal">(optional)</span></label>
                                            <input
                                                value={mcqDraft.explanation}
                                                onChange={e => setMcqDraft(p => ({ ...p, explanation: e.target.value }))}
                                                placeholder="Jawab ka reason ya explanation..."
                                                className="w-full p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
                                            />
                                        </div>
                                    </div>
                                    {/* Fixed send footer */}
                                    <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
                                        <button
                                            onClick={handleSendMcq}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                        >
                                            <Send size={15} /> MCQ Community Mein Bhejo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Input area — hidden in MCQ tab (no text messages allowed) */}
                        {activeTab !== 'MCQ' && (
                        <div className="p-3 pb-6 bg-white border-t border-slate-100 shrink-0 sticky bottom-16 sm:bottom-0">
                            {replyTarget && (
                                <div className="mb-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-black text-blue-700">Replying to {replyTarget.userName}</div>
                                        <div className="text-slate-600 truncate">{replyTarget.text}</div>
                                    </div>
                                    <button onClick={() => setReplyTarget(null)} className="text-slate-500 font-black">X</button>
                                </div>
                            )}
                            {/* Admin toggles */}
                            {isAdminOrSub && (
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <button
                                        onClick={() => setIsAdminOnly(v => !v)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${isAdminOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-amber-50'}`}
                                    >
                                        <Lock size={9} /> Admin Only
                                    </button>
                                    <button
                                        onClick={handleBroadcast}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-all"
                                        title="Input ka text broadcast karo"
                                    >
                                        <Megaphone size={9} /> Broadcast
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                                    placeholder="Message likhein..."
                                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button
                                    onClick={handleSendText}
                                    disabled={!input.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-40 shrink-0 self-end"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            {isAdminOnly && (
                                <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                                    <Lock size={9} /> Ye message sirf Admin/Mod dekhenge
                                </p>
                            )}
                        </div>
                        )}
                        {/* MCQ tab footer — Admin bulk delete */}
                        {activeTab === 'MCQ' && isAdminOrSub && (
                        <div className="p-3 pb-6 bg-white border-t border-slate-100 shrink-0 sticky bottom-16 sm:bottom-0">
                            <button
                                onClick={async () => {
                                    const mcqMsgs = messages.filter(m => m.type === 'MCQ');
                                    if (mcqMsgs.length === 0) { alert('Koi MCQ message nahi hai.'); return; }
                                    if (!confirm(`Kya aap pakka sab ${mcqMsgs.length} MCQ messages delete karna chahte hain? Yeh wapas nahi aayenge.`)) return;
                                    try {
                                        await Promise.all(mcqMsgs.map(m => remove(ref(rtdb, `chat/universal/${m.id}`))));
                                    } catch (e: any) { alert('Delete failed: ' + e.message); }
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-black active:scale-95 transition-all"
                            >
                                <Trash2 size={14} /> Sab MCQ Delete Karo ({messages.filter(m => m.type === 'MCQ').length})
                            </button>
                        </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
