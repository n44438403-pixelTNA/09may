import React, { useState, useEffect, useRef } from 'react';
import { User, TopicItem } from '../types';
import { X, Play, BookOpen, CheckCircle, Loader2, Pause, Volume2, SkipForward } from 'lucide-react';
import { getChapterData } from '../firebase';
import { storage } from '../utils/storage';
import { DEFAULT_SUBJECTS } from '../constants';
import { SpeakButton } from './SpeakButton';
import { formatMcqNotes, findRelevantNote } from '../utils/noteFormatter';

interface Props {
    user: User;
    topics: TopicItem[];
    onClose: () => void;
    onComplete: (completedTopics: TopicItem[]) => void;
}

interface LoadedTopic extends TopicItem {
    content: string; // HTML Content
    plainText: string; // For TTS fallback or analysis
}

export const TodayRevisionView: React.FC<Props> = ({ user, topics, onClose, onComplete }) => {
    const [loading, setLoading] = useState(true);
    const [loadedTopics, setLoadedTopics] = useState<LoadedTopic[]>([]);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());

    const toggleTopicComplete = (id: string) => {
        const next = new Set(completedTopicIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setCompletedTopicIds(next);
    };


    // TTS State (Simplified)
    const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
    const [isPlayingAll, setIsPlayingAll] = useState(false);

    // Refs for scrolling and reading
    const topicRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Categorized Topics (for display)
    const [scienceTopics, setScienceTopics] = useState<LoadedTopic[]>([]);
    const [socialTopics, setSocialTopics] = useState<LoadedTopic[]>([]);
    const [otherTopics, setOtherTopics] = useState<LoadedTopic[]>([]);

    // Master Display List (to ensure TTS follows visual order)
    const [displayList, setDisplayList] = useState<LoadedTopic[]>([]);

    // Topics without Notes (Self Study)
    const [missingNoteTopics, setMissingNoteTopics] = useState<LoadedTopic[]>([]);


    const userBoard = user.board || 'CBSE';
    const userClass = user.classLevel || '10';
    const userStream = user.stream || null;

    // LOAD CONTENT
    useEffect(() => {
        let isMounted = true;
        const loadContent = async () => {
            if (loadedTopics.length > 0) return;
            setLoading(true);
            const loaded: LoadedTopic[] = [];

            for (const topic of topics) {
                if (!isMounted) return;
                try {
                    let content = '';
                    let plainText = '';

                    // Fetch Logic
                    const streamKey = (userClass === '11' || userClass === '12') && userStream ? `-${userStream}` : '';

                    let subject = topic.subjectName || 'Unknown';
                    const hindiMapReverse: Record<string, string> = {
                        'भौतिकी': 'Physics',
                        'रसायन शास्त्र': 'Chemistry',
                        'जीव विज्ञान': 'Biology',
                        'गणित': 'Mathematics',
                        'इतिहास': 'History',
                        'भूगोल': 'Geography',
                        'राजनीति विज्ञान': 'Political Science',
                        'अर्थशास्त्र': 'Economics',
                        'व्यवसाय अध्ययन': 'Business Studies',
                        'लेखाशास्त्र': 'Accountancy',
                        'विज्ञान': 'Science',
                        'सामाजिक विज्ञान': 'Social Science',
                        'अंग्रेजी': 'English',
                        'हिन्दी': 'Hindi',
                        'संस्कृत': 'Sanskrit',
                        'कंप्यूटर विज्ञान': 'Computer Science'
                    };
                    if (hindiMapReverse[subject]) {
                        subject = hindiMapReverse[subject];
                    }

                    const englishSubject = topic.subjectId && (DEFAULT_SUBJECTS as any)[topic.subjectId] ? (DEFAULT_SUBJECTS as any)[topic.subjectId].name : subject;
                    const strictKey = `nst_content_${userBoard}_${userClass}${streamKey}_${englishSubject}_${topic.chapterId}`;


                    let data = await storage.getItem(strictKey);

                    // 2. If Failed, Search by Chapter ID (Robust Search)
                    if (!data) {
                        try {
                            const allKeys = await storage.keys();
                            const matchKey = allKeys.find(k => k.endsWith(`_${topic.chapterId}`) && k.startsWith('nst_content_'));
                            if (matchKey) {
                                data = await storage.getItem(matchKey);
                            }
                        } catch(e) { console.warn("Storage Scan failed", e); }
                    }

                    if (!data) {
                        try { data = await getChapterData(strictKey); } catch (e) {}
                    }
                    if (!data) {
                         try { data = await getChapterData(topic.chapterId); } catch (e) {}
                    }

                    if (data) {
                        let relevantNote = null;
                        const combinedNotes = [...(data.topicNotes || []), ...(data.deepDiveEntries || []), ...(data.allTopics || [])];
                        if (combinedNotes.length > 0) {
                            relevantNote = findRelevantNote(combinedNotes, topic.name);
                        }

                        if (relevantNote && relevantNote.content) {
                            content = formatMcqNotes(relevantNote.content);
                        } else if (data.content && data.content.length > 5) {
                            // If a specific subtopic note wasn't found, default to main chapter content if it exists.
                            content = formatMcqNotes(data.content);
                        } else if (combinedNotes.length > 0) {
                            // Fallback to aggregating all topic notes if data.content is insufficient
                            content = combinedNotes.map((n: any) => formatMcqNotes(n.content)).join('<hr class="my-6 border-slate-200" />');
                        } else {
                            content = "<p>No specific notes found.</p>";
                        }
                    } else {
                        content = "<p>Content not available.</p>";
                    }

                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = content;
                    plainText = tempDiv.textContent || tempDiv.innerText || "";

                    loaded.push({ ...topic, content, plainText });

                } catch (e) {
                    console.error(`Failed to load content for ${topic.name}`, e);
                    loaded.push({ ...topic, content: "<p>Error loading content.</p>", plainText: "Error loading content." });
                }
            }

            if (!isMounted) return;
            setLoadedTopics(loaded);

            // Filter: Valid vs Missing
            const valid = loaded.filter(t => t.content && t.content.length > 5 && !t.content.includes("Content not available") && !t.content.includes("No specific notes found"));
            const missing = loaded.filter(t => !valid.includes(t));

            setMissingNoteTopics(missing);

            // Group Valid Topics Only
            const sci = valid.filter(t => (t.subjectName || '').toLowerCase().includes('science') && !(t.subjectName || '').toLowerCase().includes('social'));
            const soc = valid.filter(t => (t.subjectName || '').toLowerCase().includes('social') || (t.subjectName || '').toLowerCase().includes('history') || (t.subjectName || '').toLowerCase().includes('geography'));
            const oth = valid.filter(t => !sci.includes(t) && !soc.includes(t));

            setScienceTopics(sci);
            setSocialTopics(soc);
            setOtherTopics(oth);

            // Set the master display order (Only Valid Notes)
            setDisplayList([...sci, ...soc, ...oth]);

            setLoading(false);
        };

        loadContent();
        return () => { isMounted = false; };
    }, [topics, userBoard, userClass, userStream]);

    // Initialize refs array size
    useEffect(() => {
        topicRefs.current = topicRefs.current.slice(0, displayList.length);
    }, [displayList]);


    return (
        <div className="fixed inset-0 z-[50] bg-white flex flex-col h-[100dvh] w-screen animate-in slide-in-from-bottom-10 overflow-hidden">
            {/* EXIT CONFIRMATION MODAL */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full shadow-2xl p-6 flex flex-col max-h-[85dvh] overflow-hidden">
                         <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 shrink-0">
                            <CheckCircle size={24} />
                         </div>
                         <h3 className="text-lg font-black text-slate-800 mb-2 text-center">Revision Checklist</h3>
                         <p className="text-slate-600 mb-4 text-sm text-center">
                            Select the topics you have successfully revised:
                         </p>

                         <div className="flex-1 min-h-0 overflow-y-auto mb-6 pr-2 space-y-2 overscroll-contain">
                             {topics.map(topic => (
                                 <label
                                    key={topic.id}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${completedTopicIds.has(topic.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleTopicComplete(topic.id);
                                    }}
                                >
                                     <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors ${completedTopicIds.has(topic.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                         {completedTopicIds.has(topic.id) && <CheckCircle size={14} className="stroke-[3]" />}
                                     </div>
                                     <div className="flex-1">
                                         <p className={`text-sm font-bold ${completedTopicIds.has(topic.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{topic.name}</p>
                                         <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{topic.subjectName} • {topic.chapterName}</p>
                                     </div>
                                 </label>
                             ))}
                         </div>

                         <div className="flex flex-col gap-2 shrink-0">
                             <button
                                onClick={() => {
                                    const completed = topics.filter(t => completedTopicIds.has(t.id));
                                    onComplete(completed);
                                    onClose();
                                }}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                disabled={completedTopicIds.size === 0}
                             >
                                <CheckCircle size={20} />
                                Submit Completed ({completedTopicIds.size})
                             </button>
                             <button
                                onClick={() => onClose()}
                                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                             >
                                Exit Without Saving
                             </button>
                             <button
                                onClick={() => setShowExitConfirm(false)}
                                className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-600 text-center py-2"
                             >
                                Cancel (Go Back to Revision)
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" /> Today's Revision
                    </h2>
                    <p className="text-xs text-slate-600 font-bold">{topics.length} Topics to Cover</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if(isPlayingAll) {
                                setIsPlayingAll(false);
                                setCurrentPlayingIndex(null);
                            } else {
                                setIsPlayingAll(true);
                                setCurrentPlayingIndex(0);
                            }
                        }}
                        className={`p-2 rounded-full transition-all ${isPlayingAll ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}
                    >
                        {isPlayingAll ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={() => setShowExitConfirm(true)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-48 overscroll-contain">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Loader2 size={32} className="animate-spin mb-2" />
                        <p className="text-xs font-bold">Loading Revision Content...</p>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-8">
                        {displayList.map((topic, index) => {
                            const isCurrent = currentPlayingIndex === index;

                            // Determine Badge Color based on Category (Science/Social/Other)
                            let badgeClass = "bg-slate-100 text-slate-600";
                            const sub = (topic.subjectName || '').toLowerCase();

                            if (sub.includes('science') && !sub.includes('social')) {
                                badgeClass = "bg-indigo-100 text-indigo-700";
                            } else if (sub.includes('social') || sub.includes('history') || sub.includes('geography')) {
                                badgeClass = "bg-orange-100 text-orange-700";
                            } else if (sub.includes('math')) {
                                badgeClass = "bg-blue-100 text-blue-700";
                            }

                            return (
                                <div
                                    key={index}
                                    ref={el => topicRefs.current[index] = el}
                                    className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${
                                        isCurrent ? 'border-indigo-500 ring-4 ring-indigo-50 scale-[1.02]' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded mb-2 inline-block ${badgeClass}`}>
                                                {topic.subjectName || 'General'}
                                            </span>
                                            <h4 className="font-bold text-slate-800 text-lg leading-tight">
                                                {topic.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-bold mt-1 uppercase">{topic.chapterName}</p>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <SpeakButton
                                                text={topic.plainText}
                                                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                autoPlay={isPlayingAll && currentPlayingIndex === index}
                                                onEnd={() => {
                                                    if (isPlayingAll) {
                                                        const next = index + 1;
                                                        if (next < displayList.length) {
                                                            setCurrentPlayingIndex(next);
                                                            // Auto scroll
                                                            topicRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        } else {
                                                            setIsPlayingAll(false);
                                                            setCurrentPlayingIndex(null);
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => toggleTopicComplete(topic.id)}
                                                className={`p-2 rounded-full transition-all flex items-center gap-1 ${completedTopicIds.has(topic.id) ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                title={completedTopicIds.has(topic.id) ? "Marked as Completed" : "Mark as Complete"}
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* CONTENT CONTAINER FOR TTS */}
                                    <div
                                        className="prose prose-sm prose-slate max-w-none text-justify"
                                        dangerouslySetInnerHTML={{ __html: topic.content }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* SELF STUDY BOX (Topics without notes) */}
                {!loading && missingNoteTopics.length > 0 && (
                    <div className="max-w-7xl mx-auto mt-8 bg-orange-50 border-2 border-orange-100 rounded-2xl p-6">
                        <h4 className="font-black text-orange-800 flex items-center gap-2 mb-4">
                            <BookOpen size={20} /> Self Study Topics
                        </h4>
                        <p className="text-xs text-orange-700 mb-4">
                            No digital notes found for these topics. Please revise them from your textbooks.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {missingNoteTopics.map((t, i) => (
                                <div key={i} className="bg-white p-3 rounded-xl border border-orange-100 flex flex-col gap-3">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{t.name}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{t.subjectName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {/* Generate Notes button removed to show notes inline by default */}
                                            <button
                                                onClick={() => toggleTopicComplete(t.id)}
                                                className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-lg transition-colors active:scale-95 text-center ${completedTopicIds.has(t.id) ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                            >
                                                {completedTopicIds.has(t.id) ? "Done ✓" : "Mark as Done"}
                                            </button>
                                        </div>
                                    </div>
                                    {/* MODIFIED: Always show notes instead of hiding them behind expanded state */}
                                    <div className="mt-2 text-xs text-slate-700 leading-relaxed p-3 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {t.content && t.content.trim() && !t.content.includes("Content not available") && !t.content.includes("No specific notes found") ? (
                                            <div dangerouslySetInnerHTML={{ __html: t.content }} className="prose prose-sm prose-slate max-w-none text-justify" />
                                        ) : (
                                            <div className="italic text-slate-500 text-center py-2">Sorry, detailed notes could not be automatically generated for this specific sub-topic at this time. Please refer to the main chapter material.</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="fixed bottom-0 left-0 right-0 w-full mx-auto bg-white border-t border-slate-200 p-4 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-center z-30">
                <button
                    onClick={() => setShowExitConfirm(true)}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all"
                >
                    <CheckCircle size={20} />
                    Complete Revision
                </button>
            </div>
        </div>
    );
};
