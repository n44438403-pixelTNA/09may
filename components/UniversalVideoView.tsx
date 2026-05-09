import React, { useEffect, useState } from 'react';
import { getChapterData } from '../firebase';
import { ArrowLeft, Play, Lock } from 'lucide-react';
import { User, SystemSettings } from '../types';
import { CustomPlayer } from './CustomPlayer';

interface Props {
    user: User;
    onBack: () => void;
    settings?: SystemSettings;
}

export const UniversalVideoView: React.FC<Props> = ({ user, onBack, settings }) => {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVideo, setActiveVideo] = useState<any>(null);

    useEffect(() => {
        getChapterData('nst_universal_playlist').then(data => {
            if (data && data.videoPlaylist) {
                setVideos(data.videoPlaylist);
            }
            setLoading(false);
        });
    }, []);

    const handleVideoClick = (vid: any) => {
        let hasAccess = false;
        if (user.role === 'ADMIN') hasAccess = true;
        else if (vid.access === 'FREE') hasAccess = true;
        else if (user.isPremium) {
            if (user.subscriptionLevel === 'ULTRA') hasAccess = true;
            else if (user.subscriptionLevel === 'BASIC' && vid.access === 'BASIC') hasAccess = true;
        }

        if (hasAccess) {
            setActiveVideo(vid);
        } else {
            alert(`🔒 Locked! This video requires ${vid.access} subscription.`);
        }
    };

    if (activeVideo) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in">
                <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 left-0 right-0 z-10">
                    <button onClick={() => setActiveVideo(null)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                        <ArrowLeft size={24} />
                    </button>
                    <h3 className="text-white font-bold truncate px-4">{activeVideo.title}</h3>
                    <div className="w-10"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <CustomPlayer videoUrl={activeVideo.url} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 pb-24 animate-in slide-in-from-bottom-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-700 shadow-sm transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-black text-slate-800">
                        Universal Videos
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Exclusive Mystery Content</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400 font-medium">Loading videos...</div>
            ) : videos.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">No videos found. Check back later!</div>
            ) : (
                <div className="grid gap-3">
                    {videos.map((vid, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleVideoClick(vid)}
                            className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group shadow-sm"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                                <Play size={20} fill="white" className="text-white ml-0.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{vid.title}</h4>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mt-1 inline-block uppercase tracking-wider border ${
                                    vid.access === 'FREE'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : vid.access === 'BASIC'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                    {vid.access}
                                </span>
                            </div>
                            {vid.access !== 'FREE' && (!user.isPremium || (user.subscriptionLevel === 'BASIC' && vid.access === 'ULTRA')) && (
                                <Lock size={16} className="text-slate-400 shrink-0" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
