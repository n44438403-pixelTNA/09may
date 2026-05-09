
import React from 'react';
import { ClassLevel, Board, SystemSettings, User } from '../types';
import { GraduationCap, School, Lock, Clock, Trophy, Landmark, Building2 } from 'lucide-react';

interface Props {
  selectedBoard: Board | null;
  allowedClasses?: ClassLevel[];
  syllabusMode?: 'SCHOOL' | 'COMPETITION' | 'BOTH';
  onSelect: (level: ClassLevel) => void;
  onBack: () => void;
  onBoardSwitch?: (board: Board) => void;
  settings?: SystemSettings;
  user?: User | null;
}

const all_classes: ClassLevel[] = ['6', '7', '8', '9', '10', '11', '12', 'COMPETITION'];

export const ClassSelection: React.FC<Props> = ({ selectedBoard, allowedClasses, onSelect, onBack, onBoardSwitch, settings, user }) => {
  
  const isPremium = user?.isPremium && user?.subscriptionEndDate && new Date(user?.subscriptionEndDate) > new Date();
  const allowedModes = isPremium 
      ? (settings?.appMode?.allowedModesForPremium || ['SCHOOL', 'COMPETITION'])
      : (settings?.appMode?.allowedModesForFree || ['SCHOOL']);

  const isAdminView = user?.role === 'ADMIN';
  const hiddenSet = new Set<string>(isAdminView ? [] : (settings?.hiddenClasses || []));

  const customClasses = (settings?.customClasses || []) as ClassLevel[];
  const baseList: ClassLevel[] = [...all_classes, ...customClasses];

  const classes = baseList.filter(c => {
      if (hiddenSet.has(c as string)) return false;
      if (c !== 'COMPETITION') return allowedModes.includes('SCHOOL');
      return true;
  });

  const allowedBoards: Board[] = settings?.allowedBoards?.length
    ? (settings.allowedBoards as Board[])
    : ['CBSE', 'BSEB'];
  const switchableBoards = allowedBoards.filter(b => b === 'CBSE' || b === 'BSEB');
  const showBoardSwitch = switchableBoards.length > 1 && onBoardSwitch && selectedBoard !== 'COMPETITION';

  React.useEffect(() => {
      if (selectedBoard === 'COMPETITION') {
          onSelect('COMPETITION');
      }
  }, [selectedBoard]);

  if (selectedBoard === 'COMPETITION') {
      return (
          <div className="h-[60vh] flex items-center justify-center">
              <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
      );
  }

  const handleClassClick = (cls: ClassLevel) => {
      if (allowedClasses && allowedClasses.length > 0 && !allowedClasses.includes(cls)) return;
      onSelect(cls);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center mb-4">
        <button onClick={onBack} className="text-slate-600 hover:text-slate-800 transition-colors mr-4 font-medium">
          &larr; Back
        </button>
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{selectedBoard} Board</span>
      </div>

      {/* CBSE / BSEB Board Switch — shown before class grid */}
      {showBoardSwitch && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Board Switch</p>
          <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
            {switchableBoards.map(board => {
              const isActive = selectedBoard === board;
              return (
                <button
                  key={board}
                  onClick={() => !isActive && onBoardSwitch!(board)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all active:scale-95 ${
                    isActive
                      ? board === 'CBSE'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-orange-500 text-white shadow'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {board === 'CBSE' ? <Landmark size={15} /> : <Building2 size={15} />}
                  {board}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center mb-8 px-4">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Select Your Class</h2>
        <p className="text-slate-600">Choose your grade to explore the syllabus</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto px-4">
        {classes.map((cls) => {
            let isLocked = allowedClasses && allowedClasses.length > 0 && !allowedClasses.includes(cls);

            if (cls === 'COMPETITION' && !allowedModes.includes('COMPETITION')) {
                isLocked = true;
            }

            return (
              <button
                key={cls}
                onClick={() => !isLocked && onSelect(cls)}
                disabled={isLocked}
                className={`group relative overflow-hidden p-6 rounded-2xl shadow-sm border transition-all duration-300 text-left ${
                    isLocked 
                    ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-80 grayscale-[0.5]' 
                    : 'bg-white border-slate-200 hover:shadow-xl hover:border-blue-500 hover:-translate-y-1'
                }`}
              >
                {isLocked && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-2 animate-in fade-in">
                        <div className="bg-slate-100 p-3 rounded-full shadow-inner mb-2 border border-slate-200">
                            <Lock size={20} className="text-slate-500" />
                        </div>
                        <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Coming Soon</span>
                        <span className="text-[9px] text-slate-500 mt-1 font-medium">{`Class ${cls} is currently closed.`}</span>
                    </div>
                )}

                {!isLocked && (
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <School size={64} className="text-blue-600" />
                    </div>
                )}
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${
                      isLocked ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  }`}>
                    {isLocked ? <Clock size={24} /> : (cls === 'COMPETITION' ? <Trophy size={24} /> : <GraduationCap size={24} />)}
                  </div>
                  <h3 className={`text-xl sm:text-2xl font-bold mb-1 break-words ${isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                      {cls === 'COMPETITION' ? 'Competition' : `Class ${cls}`}
                  </h3>
                  <p className={`text-xs sm:text-sm whitespace-nowrap ${isLocked ? 'text-slate-300' : 'text-slate-600 group-hover:text-slate-600'}`}>
                      {isLocked ? 'Unavailable' : 'View Syllabus →'}
                  </p>
                </div>
              </button>
            );
        })}
      </div>
    </div>
  );
};
