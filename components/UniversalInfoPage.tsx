import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bell, Trash2, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { ref, query, limitToLast, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

interface Props {
    onBack: () => void;
    userId?: string;
}

type Item = {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'ERROR';
    timestamp: number;
    source: 'cloud' | 'local';
};

export const UniversalInfoPage: React.FC<Props> = ({ onBack, userId }) => {
    const [cloudUpdates, setCloudUpdates] = useState<any[]>([]);
    const [localNotifs, setLocalNotifs] = useState<any[]>([]);

    const localKey = userId ? `nst_app_notifications_${userId}` : '';

    const loadLocal = useCallback(() => {
        if (!localKey) { setLocalNotifs([]); return; }
        try {
            const arr = JSON.parse(localStorage.getItem(localKey) || '[]');
            setLocalNotifs(Array.isArray(arr) ? arr : []);
        } catch {
            setLocalNotifs([]);
        }
    }, [localKey]);

    useEffect(() => {
        // Mark as read
        localStorage.setItem('nst_last_read_update', Date.now().toString());

        const q = query(ref(rtdb, 'universal_updates'), limitToLast(50));
        const unsubscribe = onValue(q, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([k, v]: any) => ({
                    id: k,
                    ...v
                })).reverse(); // Newest first
                setCloudUpdates(list);
            } else {
                setCloudUpdates([]);
            }
        });

        loadLocal();
        const handler = () => loadLocal();
        window.addEventListener('nst_notification_added', handler);
        window.addEventListener('storage', handler);
        return () => {
            unsubscribe();
            window.removeEventListener('nst_notification_added', handler);
            window.removeEventListener('storage', handler);
        };
    }, [loadLocal]);

    const clearAll = () => {
        if (!localKey) return;
        if (!window.confirm('Clear all notifications?')) return;
        localStorage.setItem(localKey, '[]');
        setLocalNotifs([]);
    };

    const removeOne = (id: string) => {
        if (!localKey) return;
        const updated = localNotifs.filter((n: any) => n.id !== id);
        localStorage.setItem(localKey, JSON.stringify(updated));
        setLocalNotifs(updated);
    };

    const items: Item[] = [
        ...cloudUpdates.map((u: any): Item => ({
            id: `cloud_${u.id}`,
            title: u.title || 'Update',
            message: u.text || '',
            type: 'INFO',
            timestamp: typeof u.timestamp === 'string' ? new Date(u.timestamp).getTime() : Number(u.timestamp || 0),
            source: 'cloud',
        })),
        ...localNotifs.map((n: any): Item => ({
            id: n.id,
            title: n.title || 'Notice',
            message: n.message || '',
            type: (n.type as 'INFO' | 'SUCCESS' | 'ERROR') || 'INFO',
            timestamp: Number(n.timestamp || 0),
            source: 'local',
        })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    const iconFor = (type: Item['type']) => {
        if (type === 'SUCCESS') return { Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (type === 'ERROR') return { Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' };
        return { Icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' };
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in slide-in-from-right">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm p-4 flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <h3 className="font-bold text-slate-800 flex-1">Notifications</h3>
                {localNotifs.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                )}
            </div>

            <div className="p-4 space-y-3">
                {items.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        <Bell size={48} className="mx-auto mb-2 opacity-40" />
                        <p>No notifications yet.</p>
                    </div>
                )}

                {items.map(item => {
                    const { Icon, color, bg } = iconFor(item.type);
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                            <div className={`${bg} p-2 rounded-full ${color} shrink-0`}>
                                <Icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm mb-1">{item.title}</p>
                                <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap break-words">{item.message}</p>
                                <p className="text-[10px] text-slate-400">
                                    {new Date(item.timestamp).toLocaleString()}
                                </p>
                            </div>
                            {item.source === 'local' && (
                                <button
                                    onClick={() => removeOne(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md shrink-0"
                                    aria-label="Remove notification"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
