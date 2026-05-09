import React from 'react';
import { Chapter, ContentType } from '../types';
import { FileText, CheckSquare, Video, Headphones, X } from 'lucide-react';

interface Props {
    chapter: Chapter;
    onClose: () => void;
    onSelect: (type: ContentType) => void;
    logoUrl?: string; // NEW
    appName?: string; // NEW
    hideMcq?: boolean;
}

export const LessonActionModal: React.FC<Props> = ({ chapter, onClose, onSelect, logoUrl, appName, hideMcq }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-xs rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 relative border border-white/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Branding */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 pb-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors backdrop-blur-sm"
                    >
                        <X size={16} />
                    </button>

                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto shadow-lg flex items-center justify-center mb-3 transform rotate-3 overflow-hidden">
                        <img
                            src={logoUrl || "/icon-192.png"}
                            alt="App"
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3426/3426653.png')}
                        />
                    </div>
                    <h2 className="text-white font-black text-lg tracking-tight leading-tight">{appName || 'IIC'}</h2>
                    <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest mt-1">Premium Learning</p>
                </div>

                {/* Content Body */}
                <div className="p-6 -mt-4 bg-white rounded-t-[32px] relative z-10">
                    <div className="text-center mb-6">
                        <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 line-clamp-2">{chapter.title}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Select Resource</p>
                    </div>

                    <div className={`grid gap-2 ${hideMcq ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        <button
                            onClick={() => onSelect('PDF')}
                            className="group relative flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-95"
                        >
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText size={16} />
                            </div>
                            <span className="font-bold text-slate-600 text-[11px] group-hover:text-blue-600">Notes</span>
                        </button>

                        {!hideMcq && (
                            <button
                                onClick={() => onSelect('MCQ')}
                                className="group relative flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-200 transition-all active:scale-95"
                            >
                                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <CheckSquare size={16} />
                                </div>
                                <span className="font-bold text-slate-600 text-[11px] group-hover:text-purple-600">Test</span>
                            </button>
                        )}

                        <button
                            onClick={() => onSelect('VIDEO')}
                            className="group relative flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-200 transition-all active:scale-95"
                        >
                            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                <Video size={16} />
                            </div>
                            <span className="font-bold text-slate-600 text-[11px] group-hover:text-rose-600">Video</span>
                        </button>

                        <button
                            onClick={() => onSelect('AUDIO')}
                            className="group relative flex flex-col items-center justify-center gap-1.5 p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all active:scale-95"
                        >
                            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <Headphones size={16} />
                            </div>
                            <span className="font-bold text-slate-600 text-[11px] group-hover:text-amber-600">Audio</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
