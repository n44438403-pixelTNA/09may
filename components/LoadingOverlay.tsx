
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Cpu, FileText, Video, Headphones, CheckCircle, BookOpen, PenTool } from 'lucide-react';
import { ContentType } from '../types';

interface Props {
  dataReady: boolean;
  onComplete: () => void;
  customMessage?: string;
  type?: ContentType; // NEW: Context Aware
}

const LOADING_STAGES = [
    "AI is analyzing requirements...",
    "Optimizing content structure...",
    "Generating personalized learning material...",
    "Finalizing visual elements..."
];

export const LoadingOverlay: React.FC<Props> = ({ dataReady, onComplete, customMessage, type }) => {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    let interval: any;

    if (progress < 100) {
      const isFinishing = dataReady;
      const speed = 50;

      interval = setInterval(() => {
        setProgress((prev) => {
          if (!isFinishing && prev >= 95) return prev;
          
          const newStage = Math.floor((prev / 100) * (LOADING_STAGES.length));
          setStageIndex(Math.min(newStage, LOADING_STAGES.length - 1));
          
          return prev + 1;
        });
      }, speed);
    } else {
       const timeout = setTimeout(() => {
           onComplete();
       }, 500);
       return () => clearTimeout(timeout);
    }

    return () => clearInterval(interval);
  }, [progress, dataReady, onComplete]);

  // Determine Icon & Color based on Type
  let Icon = BrainCircuit;
  let colorClass = "text-blue-500";
  let bgClass = "bg-blue-500";
  let title = "AI Processing...";

  if (type) {
      if (type.includes('NOTES') || type.includes('PDF')) {
          Icon = FileText;
          colorClass = "text-yellow-500";
          bgClass = "bg-yellow-500";
          title = "Generating Notes...";
      } else if (type.includes('VIDEO')) {
          Icon = Video;
          colorClass = "text-red-500";
          bgClass = "bg-red-500";
          title = "Loading Studio...";
      } else if (type.includes('AUDIO')) {
          Icon = Headphones;
          colorClass = "text-pink-500";
          bgClass = "bg-pink-500";
          title = "Preparing Audio...";
      } else if (type.includes('MCQ') || type.includes('TEST')) {
          Icon = CheckCircle;
          colorClass = "text-purple-500";
          bgClass = "bg-purple-500";
          title = "Creating Quiz...";
      }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white">
      <div className="w-full px-8 text-center">
        
        <div className="relative mb-8 inline-block">
            <div className={`absolute inset-0 ${bgClass} blur-3xl opacity-20 animate-pulse`}></div>
            <div className="relative z-10 animate-bounce">
                <Icon size={80} className={colorClass} />
            </div>
        </div>

        <h2 className="text-3xl font-black mb-2 tracking-tight">{title}</h2>
        <p className="text-slate-500 text-sm mb-8 animate-pulse font-mono tracking-wide">
            {customMessage || (progress >= 100 ? "Finalizing..." : LOADING_STAGES[stageIndex])}
        </p>

        {/* Big Percentage Display */}
        <div className="text-7xl font-black font-mono text-white mb-8 tracking-tighter">
            {progress}%
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-8">
            <div 
                className={`h-full bg-gradient-to-r from-white/20 to-white/80 transition-all duration-75 ease-linear ${bgClass}`}
                style={{ width: `${progress}%` }}
            ></div>
        </div>

      </div>
    </div>
  );
};
