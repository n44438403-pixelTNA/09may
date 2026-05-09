import React, { useState, useRef, useEffect } from 'react';
import { Youtube, Volume2 } from 'lucide-react';

interface CustomPlayerProps {
    videoUrl: string;
    brandingText?: string; 
    brandingLogo?: string;
    brandingLogoConfig?: any;
    onEnded?: () => void;
    blockShare?: boolean;
}

export const CustomPlayer: React.FC<CustomPlayerProps> = ({ 
    videoUrl, 
    brandingText, 
    brandingLogo, 
    brandingLogoConfig, 
    onEnded, 
    blockShare = true,
}) => {
    // Extract Video ID
    let videoId = '';
    let isDrive = false;
    let isNotebookLM = false;
    try {
        if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        else if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
        else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];
        
        if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
        
        if (videoUrl.includes('drive.google.com')) {
            isDrive = true;
        } else if (videoUrl.includes('notebooklm.google.com')) {
            isNotebookLM = true;
        }
    } catch(e) {}

    // Construct Native Embed URL
    const embedUrl = isDrive 
        ? videoUrl.replace('/view', '/preview')
        : isNotebookLM
        ? videoUrl
        : `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1&showinfo=0`;

    if (!videoId && !isDrive && !isNotebookLM) {
        return (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                        <Youtube size={32} className="text-white/40" />
                    </div>
                    <p className="text-white/60 font-medium">Invalid or unsupported video URL</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black w-full h-full flex flex-col items-center justify-center">
             <iframe 
                src={embedUrl} 
                className="w-full h-full border-none max-w-7xl max-h-screen aspect-video"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture" 
                allowFullScreen
                title="NSTA PLAYER"
             />
             
             {/* Drive Header & Share Button Blocker */}
             {isDrive && (
                 <div
                     className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/90 to-transparent z-[60] pointer-events-auto cursor-default flex items-center justify-between px-4"
                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                     onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                 >
                     <div className="flex items-center gap-3 w-full">
                         {brandingLogo ? (
                             <img src={brandingLogo} alt="Logo" className="h-8 w-auto object-contain" />
                         ) : (
                             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                 <Youtube size={16} className="text-white" />
                             </div>
                         )}
                         <span className="text-white text-sm font-bold truncate opacity-90">{brandingText || 'NSTA PLAYER'}</span>
                     </div>
                     <div className="w-32 h-full absolute right-0 top-0" /> {/* Transparent blocker for native pop-out buttons */}
                 </div>
             )}

             {/* Generic Share Button Blocker for Youtube/Other (Top Right) */}
             {blockShare && !isDrive && (
                 <div
                     className="absolute top-0 right-0 z-[60] pointer-events-auto cursor-default"
                     style={{
                         width: '180px',
                         height: '70px',
                         background: 'transparent'
                     }}
                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                     onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                 />
             )}

             {/* Bottom Right YouTube Logo Blocker */}
             {!isDrive && !isNotebookLM && (
                 <div 
                    className="absolute bottom-0 right-0 z-50 pointer-events-auto" 
                    style={{ 
                        width: '120px', 
                        height: '60px',
                        background: 'transparent'
                    }} 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                 />
             )}

             {/* UI Overlay Enhancement for Drive Audio */}
             {(isDrive || isNotebookLM) && (
                 <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center">
                 </div>
             )}

        </div>
    );
};
