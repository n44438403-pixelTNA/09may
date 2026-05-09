import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission, subscribeUserToPush } from './NotificationManager';

export const NotificationPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Wait a few seconds before prompting to not overwhelm the user on first load
        const timer = setTimeout(() => {
             if ('Notification' in window && Notification.permission === 'default' && !localStorage.getItem('nst_push_prompt_dismissed')) {
                 setShowPrompt(true);
             }
        }, 8000);
        return () => clearTimeout(timer);
    }, []);

    const handleEnable = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            await subscribeUserToPush();
            // In a real app, send the subscription to Firebase/backend here
            alert("Notifications Enabled!");
        }
        setShowPrompt(false);
        localStorage.setItem('nst_push_prompt_dismissed', 'true');
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('nst_push_prompt_dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
            <div className="bg-indigo-600 p-4 text-white flex gap-3 items-start relative">
                <div className="bg-indigo-500 p-2 rounded-full">
                    <Bell size={24} className="text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-tight">Enable Notifications</h3>
                    <p className="text-xs text-indigo-100 mt-1">Get alerts for new mock tests, syllabus updates, and daily study reminders.</p>
                </div>
                <button onClick={handleDismiss} className="absolute top-2 right-2 text-indigo-300 hover:text-white">
                    <X size={18} />
                </button>
            </div>
            <div className="p-3 bg-slate-50 flex gap-2">
                <button onClick={handleDismiss} className="flex-1 py-2 text-sm font-bold text-slate-500 bg-slate-200 rounded-xl hover:bg-slate-300 transition-colors">Not Now</button>
                <button onClick={handleEnable} className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">Enable</button>
            </div>
        </div>
    );
};
