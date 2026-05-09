import React from 'react';
import { ClassLevel, Subject, Stream } from '../types';
import { getSubjectsList } from '../constants';
import { Calculator, FlaskConical, Languages, Globe2, BookMarked, History, Binary, TrendingUp, Briefcase, Landmark, Palette, Feather, Home, HeartPulse, Activity, Cpu, ChevronRight } from 'lucide-react';

import { Board } from '../types';

import { SystemSettings } from '../types';

interface Props {
  classLevel: ClassLevel;
  stream: Stream | null;
  board?: Board;
  onSelect: (subject: Subject) => void;
  onBack: () => void;
  hideBack?: boolean; // New prop to hide back button when used in Dashboard
  initialParentSubject?: string | null;
  settings?: SystemSettings | null;
}

const SubjectIcon: React.FC<{ icon: string, className?: string }> = ({ icon, className }) => {
    switch(icon) {
        case 'math': return <Calculator className={className} />;
        case 'science': 
        case 'physics': return <FlaskConical className={className} />;
        case 'flask': return <FlaskConical className={className} />; 
        case 'bio': return <HeartPulse className={className} />;
        case 'english': 
        case 'hindi':
        case 'sanskrit':
        case 'book':
            return <Languages className={className} />;
        case 'social': return <Globe2 className={className} />;
        case 'geo': return <Globe2 className={className} />;
        case 'computer': return <Cpu className={className} />;
        case 'history': return <History className={className} />;
        case 'accounts': return <TrendingUp className={className} />;
        case 'business': return <Briefcase className={className} />;
        case 'gov': return <Landmark className={className} />;
        case 'ppl': return <BookMarked className={className} />;
        case 'mind': return <Feather className={className} />;
        case 'home': return <Home className={className} />;
        case 'active': return <Activity className={className} />;
        default: return <BookMarked className={className} />;
    }
}

export const SubjectSelection: React.FC<Props> = ({ classLevel, stream, board, onSelect, onBack, hideBack = false, initialParentSubject = null, settings }) => {
  const [selectedParentSubject, setSelectedParentSubject] = React.useState<string | null>(initialParentSubject);

  React.useEffect(() => {
      if (initialParentSubject) {
          setSelectedParentSubject(initialParentSubject);
      }
  }, [initialParentSubject]);

  const rawSubjects = getSubjectsList(classLevel, stream, board).filter(sub => !(settings?.hiddenSubjects || []).includes(sub.id));

  const isClass9to12 = ['9', '10', '11', '12'].includes(classLevel);
  const isClass6to8 = ['6', '7', '8'].includes(classLevel);

  // Create a display list of subjects based on grouping
  // By default, just use the raw list, unless we need to show groups.
  // The raw list already contains Physics, Chemistry, Biology, History, Geo etc. if we updated constants.ts
  // Wait, if constants.ts already returns Physics, Chemistry, Biology instead of Science for 9/10,
  // we just need to group them under "Science" and "Social Science" visually here.

  let displaySubjects: Subject[] = [];
  let subSubjects: Subject[] = [];

  const scienceGroup = ['Physics', 'Chemistry', 'Biology', 'भौतिकी', 'रसायन शास्त्र', 'जीव विज्ञान'];
  const sstGroup9to12 = ['History', 'Geography', 'Political Science', 'Economics', 'इतिहास', 'भूगोल', 'राजनीति विज्ञान', 'अर्थशास्त्र'];
  const sstGroup6to8 = ['History', 'Geography', 'Political Science', 'इतिहास', 'भूगोल', 'राजनीति विज्ञान'];

  if (selectedParentSubject === 'Science') {
      subSubjects = rawSubjects.filter(s => scienceGroup.includes(s.name));
  } else if (selectedParentSubject === 'Social Science') {
      subSubjects = rawSubjects.filter(s => isClass9to12 ? sstGroup9to12.includes(s.name) : sstGroup6to8.includes(s.name));
  } else {
      // Build parent level view
      rawSubjects.forEach(s => {
          if (scienceGroup.includes(s.name) && isClass9to12) {
              const parentName = board === 'BSEB' ? 'विज्ञान' : 'Science';
              if (!displaySubjects.find(ds => ds.name === parentName)) {
                  displaySubjects.push({ id: 'science', name: parentName, icon: 'science', color: 'bg-blue-50 text-blue-600' });
              }
          } else if ((sstGroup9to12.includes(s.name) && isClass9to12) || (sstGroup6to8.includes(s.name) && isClass6to8)) {
              const parentName = board === 'BSEB' ? 'सामाजिक विज्ञान' : 'Social Science';
              if (!displaySubjects.find(ds => ds.name === parentName)) {
                  displaySubjects.push({ id: 'sst', name: parentName, icon: 'geo', color: 'bg-orange-50 text-orange-600' });
              }
          } else {
              displaySubjects.push(s);
          }
      });
  }

  const handleSelect = (subject: Subject) => {
      if ((subject.name === 'Science' || subject.name === 'विज्ञान') && isClass9to12) {
          setSelectedParentSubject('Science');
      } else if (subject.name === 'Social Science' || subject.name === 'सामाजिक विज्ञान') {
          setSelectedParentSubject('Social Science');
      } else {
          onSelect(subject);
      }
  };

  const handleBack = () => {
      if (selectedParentSubject) {
          setSelectedParentSubject(null);
      } else {
          onBack();
      }
  };

  const activeList = selectedParentSubject ? subSubjects : displaySubjects;

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 mt-0 pt-0">
      {(!hideBack || selectedParentSubject) && (
        <div className="flex items-center mb-6">
            <button onClick={handleBack} className="text-slate-600 hover:text-slate-800 transition-colors mr-4">
            &larr; Back
            </button>
            <div>
            <h2 className="text-2xl font-bold text-slate-800">
                {selectedParentSubject ? (board === 'BSEB' ? (selectedParentSubject === 'Science' ? 'विज्ञान' : 'सामाजिक विज्ञान') : selectedParentSubject) : stream ? `${stream} Subjects` : `Class ${classLevel} Subjects`}
            </h2>
            <p className="text-slate-600 text-sm">Select a {selectedParentSubject ? 'sub-subject' : 'subject'} to view chapters</p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeList.map((subject) => {
          const colorParts = (subject.color || 'bg-slate-50 text-slate-600').split(' ');
          const bgClass = colorParts[0] || 'bg-slate-50';
          const textClass = colorParts[1] || 'text-slate-600';
          const borderClass = bgClass.replace('bg-', 'border-').replace('50', '200');
          const isGroup = subject.name === 'Science' || subject.name === 'विज्ञान' || subject.name === 'Social Science' || subject.name === 'सामाजिक विज्ञान';
          const subtitle = selectedParentSubject || isGroup ? 'Explore Sections' : 'Explore Syllabus';
          return (
            <button
              key={subject.id}
              onClick={() => handleSelect(subject)}
              className={`${bgClass} border-2 ${borderClass} p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-all active:scale-95 text-left group`}
            >
              <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <SubjectIcon icon={subject.icon} className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black text-base ${textClass} truncate`}>{subject.name}</h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">{subtitle}</p>
              </div>
              <ChevronRight size={18} className={`${textClass} opacity-60 shrink-0`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};