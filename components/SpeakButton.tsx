import React, { useState, useEffect } from 'react';
import { Volume2, Square } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/textToSpeech';
import type { SystemSettings } from '../types';

interface Props {
    text: string;
    className?: string;
    iconSize?: number;
    color?: string;
    settings?: SystemSettings;
    onToggleAutoTts?: (enabled: boolean) => void;
    autoPlay?: boolean;
    onEnd?: () => void;
}

export const SpeakButton: React.FC<Props> = ({ text, className, iconSize = 18, color = 'text-slate-500', settings, onToggleAutoTts, autoPlay, onEnd }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const speed = 1.0;

    useEffect(() => {
        if (settings?.isAutoTtsEnabled || autoPlay) {
            const timer = setTimeout(() => {
                triggerSpeech();
            }, 500);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, settings?.isAutoTtsEnabled, autoPlay]);

    // Stop TTS when browser tab is hidden / user switches tabs
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden && isSpeaking) {
                stopSpeech();
                setIsSpeaking(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isSpeaking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isSpeaking) stopSpeech();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerSpeech = () => {
        if (!text) return;
        setIsSpeaking(true);
        speakText(
            text,
            null,
            speed,
            'hi-IN',
            () => setIsSpeaking(true),
            () => {
                setIsSpeaking(false);
                if (onEnd) onEnd();
            }
        ).catch(() => setIsSpeaking(false));
    };

    const handleSpeak = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSpeaking) {
            stopSpeech();
            setIsSpeaking(false);
        } else {
            triggerSpeech();
        }
    };

    return (
        <button
            onClick={handleSpeak}
            className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${className} ${isSpeaking ? 'text-blue-600 animate-pulse' : color}`}
            title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
        >
            {isSpeaking ? <Square size={iconSize} fill="currentColor" className="opacity-80"/> : <Volume2 size={iconSize} />}
        </button>
    );
};
