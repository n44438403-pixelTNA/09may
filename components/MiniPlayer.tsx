
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, RotateCcw, RotateCw, Zap, Maximize2, Minimize2, ExternalLink, AlertTriangle, Headphones, Lock } from 'lucide-react';

interface Props {
  track: { url: string, title: string } | null;
  onClose: () => void;
}

export const MiniPlayer: React.FC<Props> = ({ track, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to get Google Drive ID
  const getDriveId = (url: string) => {
      const match = url.match(/\/d\/(.*?)\/|\/d\/(.*?)$|id=(.*?)(&|$)/);
      return match ? (match[1] || match[2] || match[3]) : null;
  };

  const isDrive = track ? track.url.includes('drive.google.com') : false;
  const isNotebookLM = track ? track.url.includes('notebooklm.google.com') : false;

  useEffect(() => {
    setLoadError(false); // Reset error on track change
    if (track) {
        // If it's a Drive link or NotebookLM link, we skip the native audio element
        if (isDrive || isNotebookLM) {
            return;
        }

        if (audioRef.current) {
            audioRef.current.src = track.url;
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(e => {
                console.error("Audio play error", e);
                setIsPlaying(false);
                setLoadError(true);
            });
        }
    }
  }, [track, isDrive]);

  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.playbackRate = playbackRate;
      }
  }, [playbackRate]);

  const togglePlay = () => {
      if (audioRef.current) {
          if (isPlaying) {
              audioRef.current.pause();
          } else {
              audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
      }
  };

  const handleTimeUpdate = () => {
      if (audioRef.current) {
          setProgress(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 0);
      }
  };

  const skip = (seconds: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime += seconds;
      }
  };

  const toggleSpeed = () => {
      const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
      const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
      setPlaybackRate(rates[nextIdx]);
  };

  const formatTime = (time: number) => {
      if (!time) return '0:00';
      const m = Math.floor(time / 60);
      const s = Math.floor(time % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <div className={`fixed left-2 right-2 z-40 transition-all duration-300 ease-in-out shadow-2xl bg-black border border-slate-700 rounded-2xl overflow-hidden ${(isDrive || isNotebookLM) ? 'bottom-20 h-64' : (isExpanded || loadError ? 'bottom-20 h-48' : 'bottom-20 h-16')}`}>
      {(isDrive || isNotebookLM) ? (
          <div className="w-full h-full flex flex-col">
               <div className="bg-black px-4 py-2 flex justify-between items-center border-b border-white/10">
                   <div className="flex items-center gap-2 text-white/70 overflow-hidden">
                       <Headphones size={16} className="shrink-0" />
                       <span className="text-xs font-bold uppercase truncate">{track.title || 'AUDIO PLAYER'}</span>
                   </div>
                   <button onClick={onClose} className="text-slate-600 hover:text-white shrink-0 ml-2"><X size={16} /></button>
               </div>

               <div className="flex-1 p-2 flex flex-col items-center justify-center gap-3">
                   {(isDrive && getDriveId(track.url)) || isNotebookLM ? (
                       <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-700 bg-black">
                           <iframe
                               src={isDrive ? `https://drive.google.com/file/d/${getDriveId(track.url)}/preview` : track.url}
                               className="w-full h-full"
                               title={track.title || 'AUDIO PLAYER'}
                               allow="autoplay"
                           />
                           {isDrive && (
                               <div
                                   className="absolute top-0 left-0 right-0 h-16 bg-black z-[1000] cursor-default flex items-center justify-between px-4"
                                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                   onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                               >
                                   <div className="flex items-center gap-2 overflow-hidden flex-1">
                                       <Headphones size={18} className="text-purple-500 shrink-0" />
                                       <span className="text-white text-sm font-bold truncate">{track.title || 'AUDIO PLAYER'}</span>
                                   </div>
                               </div>
                           )}
                       </div>
                   ) : (
                       <div className="text-center p-4">
                            <p className="text-slate-600 text-xs">Invalid Link.</p>
                       </div>
                   )}
               </div>
          </div>
      ) : !loadError ? (
          <>
            <audio 
                ref={audioRef} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        setDuration(audioRef.current.duration);
                        // Ensure auto-play triggers correctly on load
                        if (isPlaying) audioRef.current.play().catch(e => console.error("Auto-play blocked", e));
                    }
                }}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                    console.error("Audio Load Error:", e);
                    setLoadError(true);
                    // Don't alert immediately, switch UI first
                }}
            />
            
            {/* PROGRESS BAR */}
            <div className="h-1 bg-slate-800 w-full cursor-pointer group" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (audioRef.current) audioRef.current.currentTime = percent * duration;
            }}>
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 relative transition-all duration-100" style={{ width: `${(progress / duration) * 100}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 h-full">
                {/* INFO */}
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 ${isPlaying ? 'animate-pulse' : ''}`}>
                        <div className="flex items-end gap-0.5 h-4 mb-1">
                            {[1,2,3].map(i => (
                                <div key={i} className={`w-1 bg-white rounded-full ${isPlaying ? 'animate-bounce' : 'h-2'}`} style={{ animationDelay: `${i*0.1}s` }}></div>
                            ))}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-white text-xs font-bold truncate">{track.title}</h4>
                        <p className="text-slate-500 text-[10px] font-mono">{formatTime(progress)} / {formatTime(duration)}</p>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-3">
                    {isExpanded && (
                        <>
                          <button onClick={() => skip(-10)} className="text-slate-500 hover:text-white transition-colors"><RotateCcw size={18} /></button>
                          <button onClick={toggleSpeed} className="text-slate-500 hover:text-white transition-colors flex items-center text-[10px] font-bold gap-0.5 bg-white/10 px-1.5 py-0.5 rounded"><Zap size={10} /> {playbackRate}x</button>
                          <button onClick={() => skip(10)} className="text-slate-500 hover:text-white transition-colors"><RotateCw size={18} /></button>
                        </>
                    )}
                    
                    <button 
                        onClick={togglePlay} 
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 hover:scale-105 transition-transform shadow-lg shadow-white/10"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-500 hover:text-white">
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    
                    <button onClick={onClose} className="text-slate-600 hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>
          </>
      ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black p-4 text-center">
               <AlertTriangle size={24} className="text-red-500 mb-2" />
               <p className="text-white text-xs font-bold mb-1">Failed to load audio</p>
               <p className="text-slate-600 text-[10px]">The audio format might not be supported.</p>
               <button onClick={onClose} className="mt-4 px-4 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20">Close</button>
          </div>
      )}
    </div>
  );
};
