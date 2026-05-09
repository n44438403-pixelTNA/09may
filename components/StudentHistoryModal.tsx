import React from 'react';
import { User } from '../types';
import { X, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
    user: User;
    onClose: () => void;
}

export const StudentHistoryModal: React.FC<Props> = ({ user, onClose }) => {
    const history = user.mcqHistory || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-3xl w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Activity History</h3>
                        <p className="text-xs text-slate-600">Total Tests: {history.length}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <Clock size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No activity recorded yet.</p>
                        </div>
                    ) : (
                        history.slice().reverse().map((item, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.chapterTitle}</h4>
                                        <p className="text-[10px] text-slate-600 flex items-center gap-1">
                                            <Calendar size={10} /> {new Date(item.date).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                                        (item.score / item.totalQuestions) >= 0.8 ? 'bg-green-100 text-green-700' :
                                        (item.score / item.totalQuestions) >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {Math.round((item.score / item.totalQuestions) * 100)}%
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle size={12} /> {item.score} Correct
                                    </span>
                                    <span className="flex items-center gap-1 text-red-500">
                                        <XCircle size={12} /> {item.totalQuestions - item.score} Wrong
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
