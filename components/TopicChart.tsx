import React from 'react';
import { TopicItem } from '../types';

interface Props {
    topics: TopicItem[];
    type: 'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT';
}

export const TopicChart: React.FC<Props> = ({ topics, type }) => {
    // 1. Group by Subject
    const subjectCounts: Record<string, number> = {};
    topics.forEach(t => {
        const subject = t.subjectName || 'General';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    // 2. Prepare Data
    const data = Object.entries(subjectCounts).map(([subject, count]) => ({
        subject,
        count
    })).sort((a, b) => b.count - a.count); // Sort by count desc

    const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid div by 0

    // Color Logic
    let colorClass = 'bg-orange-500';
    let textColorClass = 'text-orange-600';
    let title = 'Progress Areas';

    if (type === 'WEAK') {
        colorClass = 'bg-red-500';
        textColorClass = 'text-red-600';
        title = 'Focus Areas (Weak)';
    } else if (type === 'STRONG') {
        colorClass = 'bg-blue-500';
        textColorClass = 'text-blue-600';
        title = 'Strength Areas';
    } else if (type === 'EXCELLENT') {
        colorClass = 'bg-green-500';
        textColorClass = 'text-green-600';
        title = 'Mastery Distribution (30-Day)';
    }

    if (topics.length === 0) return null;

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 pointer-events-none select-none animate-in fade-in slide-in-from-bottom-4">
            <h3 className={`text-sm font-black uppercase mb-4 ${textColorClass} flex items-center gap-2`}>
                <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                {title}
            </h3>

            <div className="space-y-3">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-24 text-xs font-bold text-slate-600 truncate text-right">
                            {item.subject}
                        </div>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
                                style={{ width: `${(item.count / maxCount) * 100}%` }}
                            ></div>
                        </div>
                        <div className="w-8 text-xs font-black text-slate-700">
                            {item.count}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
