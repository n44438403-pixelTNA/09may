import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Edit3, Check } from 'lucide-react';

interface Props {
    dailyStudySeconds: number;
    targetSeconds: number;
    onSetTarget: (seconds: number) => void;
}

export const StudyGoalTimer: React.FC<Props> = ({ dailyStudySeconds, targetSeconds, onSetTarget }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [customHours, setCustomHours] = useState(targetSeconds / 3600);

    useEffect(() => {
        setCustomHours(targetSeconds / 3600);
    }, [targetSeconds]);

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = Math.min(100, (dailyStudySeconds / targetSeconds) * 100);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const handlePreset = (hours: number) => {
        onSetTarget(hours * 3600);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center">

            <div className="flex justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                    <Clock className="text-blue-600" size={16} />
                    <h3 className="font-black text-slate-800 text-xs uppercase">Study Goal</h3>
                </div>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded hover:bg-slate-100 flex items-center gap-1"
                >
                    <Edit3 size={10} /> {isEditing ? 'Close' : 'Edit'}
                </button>
            </div>

            {/* CIRCULAR TIMER - Compact Mobile */}
            <div className="relative w-32 h-32 mb-3">
                <svg className="w-full h-full transform -rotate-90">
                    {/* Track */}
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="10"
                    />
                    {/* Progress */}
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="none"
                        stroke={progress >= 100 ? "#22c55e" : "#3b82f6"}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-in-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-black ${progress >= 100 ? 'text-green-600' : 'text-slate-800'}`}>
                        {formatTime(dailyStudySeconds)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                        Target: {Math.round(targetSeconds / 3600)}h
                    </span>
                </div>
            </div>

            {/* CONTROLS */}
            {isEditing ? (
                <div className="w-full animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-slate-500 text-center uppercase mb-3">Set Daily Target</p>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <button onClick={() => handlePreset(0.5)} className="p-2 bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-600 hover:text-blue-600 rounded-lg border border-slate-100 transition-colors">30m</button>
                        <button onClick={() => handlePreset(1)} className="p-2 bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-600 hover:text-blue-600 rounded-lg border border-slate-100 transition-colors">1h</button>
                        <button onClick={() => handlePreset(2)} className="p-2 bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-600 hover:text-blue-600 rounded-lg border border-slate-100 transition-colors">2h</button>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="number"
                                value={customHours}
                                onChange={(e) => setCustomHours(Number(e.target.value))}
                                className="w-full p-2 pl-3 text-sm font-bold border border-slate-200 rounded-lg"
                                placeholder="Hours"
                                min={0.5}
                                max={12}
                                step={0.5}
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">Hr</span>
                        </div>
                        <button
                            onClick={() => handlePreset(customHours)}
                            className="bg-blue-600 text-white p-2 rounded-lg font-bold hover:bg-blue-700"
                        >
                            <Check size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => handlePreset(3)}
                        className="w-full mt-3 flex items-center justify-center gap-2 p-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-200 transition-colors"
                    >
                        <RotateCcw size={14} /> Reset to Default (3h)
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    {progress >= 100 ? (
                        <p className="text-xs font-black text-green-600 uppercase tracking-wide animate-pulse">
                            🎉 Daily Goal Achieved!
                        </p>
                    ) : (
                        <p className="text-xs font-bold text-slate-500">
                            {Math.round(100 - progress)}% remaining to reach goal.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
