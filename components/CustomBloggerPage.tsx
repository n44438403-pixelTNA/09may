import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { APP_VERSION } from '../constants';
import { SystemSettings } from '../types';

interface Props {
  onBack: () => void;
  settings?: SystemSettings;
}

export const CustomBloggerPage: React.FC<Props> = ({ onBack, settings }) => {
  const [content, setContent] = useState<string>('');

  const extractDriveId = (url: string) => {
    try {
      if (!url) return null;
      const match = url.match(/\/d\/(.*?)\//) || url.match(/id=([^&]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const driveId = extractDriveId(settings?.customBloggerVideoUrl || '');

  useEffect(() => {
    // 1. Try Local First (Instant Load)
    const saved = localStorage.getItem('nst_custom_blogger_page');
    if (saved) {
      setContent(saved);
    }

    // 2. Sync with Firebase (Real-time)
    const contentRef = ref(rtdb, 'custom_blogger_page');
    const unsubscribe = onValue(contentRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setContent(data);
            localStorage.setItem('nst_custom_blogger_page', data);
        }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white dark-blue-mode-bg">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white dark-blue-mode-bg sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <h3 className="text-xl font-black text-slate-800 dark-mode-text blue-mode-text">Custom Page</h3>
            </div>
            <div className="flex flex-col items-end text-[10px] text-slate-600 font-medium leading-tight">
                <span>App Version: {APP_VERSION}</span>
                <span>Developed by Nadim Anwar</span>
            </div>
        </div>
        
        <div className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {driveId && (
                <div className="mb-6">
                    <div className="rounded-xl overflow-hidden shadow-md bg-black relative pt-[56.25%] group">
                        <iframe
                            src={`https://drive.google.com/file/d/${driveId}/preview`}
                            className="absolute top-0 left-0 w-full h-full border-0"
                            allowFullScreen
                        />
                        {/* Overlay to block external Drive links on the top right */}
                        <div
                            className="absolute top-0 right-0 w-24 h-16 z-[60] cursor-default bg-transparent"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        />
                        {/* Optional full top overlay like CustomPlayer for better masking */}
                        <div
                            className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent z-[50] pointer-events-auto cursor-default flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                             <span className="text-white/80 text-xs font-bold tracking-wider">VIDEO PLAYER</span>
                        </div>
                    </div>
                </div>
            )}

             {/* Render Custom HTML Content */}
             {content ? (
                 <div className="custom-html-content dark-mode-text blue-mode-text" dangerouslySetInnerHTML={{ __html: content }} />
             ) : (
                 <div className="text-center py-20 text-slate-500">
                     <p>No content available.</p>
                 </div>
             )}
        </div>
    </div>
  );
};
