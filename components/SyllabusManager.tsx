import React, { useState, useEffect } from 'react';
import { Board, ClassLevel, Stream, Subject, Chapter } from '../types';
import { getSubjectsList } from '../constants';
import { fetchChapters } from '../services/groq';
import { getChapterData } from '../firebase';
import { storage } from '../utils/storage';
import pLimit from 'p-limit';
import { RefreshCw, FileText, CheckCircle, XCircle, Video, Music, Layers, BookOpen, Loader2, Search } from 'lucide-react';

interface Props {
    board: Board;
}

interface ChapterStatus {
    id: string;
    title: string;
    subjectName: string;
    hasNotes: boolean; // General fallback
    noteTypes: {
        PREMIUM: boolean;
        DEEP_DIVE: boolean;
        ADDITIONAL: boolean;
        TEACHER: boolean;
    };
    mcqCount: number;
    videoCount: number;
    audioCount: number;
    hasMcq: boolean;
    hasVideo: boolean;
    hasAudio: boolean;
    lastUpdated?: string;
    lastUpdatedTimestamp?: number;
}

export const SyllabusManager: React.FC<Props> = ({ board }) => {
    const [selectedClass, setSelectedClass] = useState<ClassLevel>('10');
    const [selectedStream, setSelectedStream] = useState<Stream>('Science');
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

    const [chapters, setChapters] = useState<ChapterStatus[]>([]);
    const [viewTab, setViewTab] = useState<'FULL_DETAILS' | 'PENDING' | 'RECENT_UPDATES'>('FULL_DETAILS');
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    const subjects = getSubjectsList(selectedClass, selectedStream, board);

    // Initial Load
    useEffect(() => {
        setChapters([]);
    }, [selectedClass, selectedStream]);

    const handleScanClass = async () => {
        setScanning(true);
        setScanProgress(0);
        setChapters([]);
        setLoading(true);

        const streamKey = (selectedClass === '11' || selectedClass === '12') && selectedStream ? `-${selectedStream}` : '';
        const lang = board === 'BSEB' ? 'Hindi' : 'English';

        let allChaptersToScan: ChapterStatus[] = [];

        try {
            // 1. Fetch chapters for ALL subjects
            for (const subject of subjects) {
                try {
                    const rawChapters = await fetchChapters(board, selectedClass, selectedStream, subject, lang);
                    const statusList: ChapterStatus[] = rawChapters.map(c => ({
                        id: c.id,
                        title: c.title,
                        subjectName: subject.name,
                        hasNotes: false,
                        noteTypes: { PREMIUM: false, DEEP_DIVE: false, ADDITIONAL: false, TEACHER: false },
                        mcqCount: 0,
                        videoCount: 0,
                        audioCount: 0,
                        hasMcq: false,
                        hasVideo: false,
                        hasAudio: false
                    }));
                    allChaptersToScan = [...allChaptersToScan, ...statusList];
                } catch (err) {
                    console.error(`Error fetching chapters for subject ${subject.name}:`, err);
                }
            }

            setChapters(allChaptersToScan);
            setLoading(false);

            if (allChaptersToScan.length === 0) {
                setScanning(false);
                return;
            }

            const limit = pLimit(5); // Concurrency limit
            let completedCount = 0;
            const updatedChapters = [...allChaptersToScan];

            // 2. Scan data for all chapters
            await Promise.all(updatedChapters.map((ch, index) => limit(async () => {
                const key = `nst_content_${board}_${selectedClass}${streamKey}_${ch.subjectName}_${ch.id}`;

                try {
                    let data: any = await storage.getItem(key);
                    if (!data) {
                        try {
                            data = await getChapterData(key);
                        } catch (e) { console.warn("Cloud fetch failed for", key); }
                    }

                    if (data) {
                        // Counts
                        const mcqCount = (data.manualMcqData?.length || 0) + (data.weeklyTestMcqData?.length || 0);
                        const videoCount = (data.videoPlaylist?.length || 0) +
                            (data.schoolVideoPlaylist?.length || 0) +
                            (data.competitionVideoPlaylist?.length || 0) +
                            (data.schoolPremiumVideoPlaylist?.length || 0) +
                            (data.competitionPremiumVideoPlaylist?.length || 0) +
                            (data.freeVideoLink ? 1 : 0) +
                            (data.premiumVideoLink ? 1 : 0);
                        const audioCount = (data.audioPlaylist?.length || 0) +
                            (data.schoolAudioPlaylist?.length || 0) +
                            (data.competitionAudioPlaylist?.length || 0);

                        // Note Types
                        const hasPremiumNotes = (data.schoolPremiumNotesList?.length > 0) || (data.competitionPremiumNotesList?.length > 0) || !!data.premiumNotesHtml;
                        const hasDeepDiveNotes = (data.deepDiveEntries?.length > 0);
                        const hasAdditionalNotes = (data.additionalNotes?.length > 0);
                        const hasTeacherNotes = (data.teachingStrategyNotes?.length > 0) || !!data.teachingStrategyHtml;

                        const updatedChapter = {
                            ...ch,
                            mcqCount,
                            videoCount,
                            audioCount,
                            hasMcq: mcqCount > 0,
                            hasVideo: videoCount > 0,
                            hasAudio: audioCount > 0,
                            hasNotes: hasPremiumNotes || hasDeepDiveNotes || hasAdditionalNotes || hasTeacherNotes || !!data.freeLink || !!data.premiumLink || !!data.freeNotesHtml || (data.topicNotes && data.topicNotes.length > 0),
                            noteTypes: {
                                PREMIUM: hasPremiumNotes,
                                DEEP_DIVE: hasDeepDiveNotes,
                                ADDITIONAL: hasAdditionalNotes,
                                TEACHER: hasTeacherNotes
                            },
                            lastUpdated: new Date().toLocaleTimeString(),
                            lastUpdatedTimestamp: Date.now()
                        };

                        updatedChapters[index] = updatedChapter;

                        setChapters(prev => {
                            const next = [...prev];
                            next[index] = updatedChapter;
                            return next;
                        });
                    }
                } catch (e) {
                    console.error(`Scan error for ${ch.title}:`, e);
                } finally {
                    completedCount++;
                    setScanProgress(Math.round((completedCount / updatedChapters.length) * 100));
                }
            })));

            setChapters(updatedChapters);

        } catch (e) {
            console.error("Critical error during class scan:", e);
        } finally {
            setScanning(false);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* CONTROLS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Class</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value as ClassLevel)}
                            className="p-2 border rounded-lg text-sm font-bold bg-slate-50"
                        >
                            {['6','7','8','9','10','11','12','COMPETITION'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {['11','12'].includes(selectedClass) && (
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stream</label>
                            <select
                                value={selectedStream}
                                onChange={e => setSelectedStream(e.target.value as Stream)}
                                className="p-2 border rounded-lg text-sm font-bold bg-slate-50"
                            >
                                {['Science','Commerce','Arts'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex-1 flex justify-end">
                        <button
                            onClick={handleScanClass}
                            disabled={scanning}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black shadow-sm transition-all ${
                                scanning
                                    ? 'bg-slate-100 text-slate-500 cursor-wait'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                            }`}
                        >
                            {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            {scanning ? `Scanning Class... ${scanProgress}%` : `Scan Class ${selectedClass}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                <button
                    onClick={() => setViewTab('FULL_DETAILS')}
                    className={`px-4 py-2 rounded-t-xl font-bold text-xs transition-all ${viewTab === 'FULL_DETAILS' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                    Full Detail Comparison
                </button>
                <button
                    onClick={() => setViewTab('PENDING')}
                    className={`px-4 py-2 rounded-t-xl font-bold text-xs transition-all ${viewTab === 'PENDING' ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                    Pending Content
                </button>
                <button
                    onClick={() => setViewTab('RECENT_UPDATES')}
                    className={`px-4 py-2 rounded-t-xl font-bold text-xs transition-all ${viewTab === 'RECENT_UPDATES' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                    Recently Scanned Updates
                </button>
            </div>

            {/* STATUS GRID */}
            {chapters.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">
                            <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                            <p className="text-xs font-bold">Fetching Content across all subjects...</p>
                        </div>
                    ) : (
                        <div className="max-h-[70vh] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 font-bold text-slate-600 uppercase sticky top-0 z-10 shadow-sm border-b">
                                    <tr>
                                        <th className="p-3 pl-4 whitespace-nowrap">Subject & Chapter Name</th>
                                        <th className="p-3 text-center" title="Premium Notes">Prem</th>
                                        <th className="p-3 text-center" title="Deep Dive Notes">Deep</th>
                                        <th className="p-3 text-center" title="Additional/Extra Notes">Addnl</th>
                                        <th className="p-3 text-center" title="Quick Revision Notes">Quick</th>
                                        <th className="p-3 text-center" title="Teacher Guide">Teach</th>
                                        <th className="p-3 text-center border-l">MCQ</th>
                                        <th className="p-3 text-center">Video</th>
                                        <th className="p-3 text-center">Audio</th>
                                        <th className="p-3 text-right pr-4 w-24">Last Scan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {viewTab === 'FULL_DETAILS' && chapters.map((ch, i) => (
                                        <tr key={`${ch.subjectName}-${ch.id}`} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-3 pl-4 border-r border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">{ch.subjectName}</span>
                                                    <span className="font-bold text-slate-800 line-clamp-2 max-w-[250px]" title={ch.title}>
                                                        {ch.title}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Note Types */}
                                            <td className="p-3 text-center bg-slate-50/50">
                                                {ch.noteTypes.PREMIUM ? <CheckCircle size={14} className="mx-auto text-green-500" /> : <XCircle size={14} className="mx-auto text-slate-200" />}
                                            </td>
                                            <td className="p-3 text-center bg-slate-50/50">
                                                {ch.noteTypes.DEEP_DIVE ? <CheckCircle size={14} className="mx-auto text-green-500" /> : <XCircle size={14} className="mx-auto text-slate-200" />}
                                            </td>
                                            <td className="p-3 text-center bg-slate-50/50">
                                                {ch.noteTypes.ADDITIONAL ? <CheckCircle size={14} className="mx-auto text-green-500" /> : <XCircle size={14} className="mx-auto text-slate-200" />}
                                            </td>
                                            <td className="p-3 text-center bg-slate-50/50">
                                                {ch.noteTypes.TEACHER ? <CheckCircle size={14} className="mx-auto text-green-500" /> : <XCircle size={14} className="mx-auto text-slate-200" />}
                                            </td>

                                            {/* Counts */}
                                            <td className="p-3 text-center border-l border-slate-100 font-mono font-bold">
                                                <span className={ch.mcqCount > 0 ? "text-blue-600 bg-blue-50 px-2 py-0.5 rounded" : "text-slate-300"}>{ch.mcqCount}</span>
                                            </td>
                                            <td className="p-3 text-center font-mono font-bold">
                                                <span className={ch.videoCount > 0 ? "text-purple-600 bg-purple-50 px-2 py-0.5 rounded" : "text-slate-300"}>{ch.videoCount}</span>
                                            </td>
                                            <td className="p-3 text-center font-mono font-bold">
                                                <span className={ch.audioCount > 0 ? "text-pink-600 bg-pink-50 px-2 py-0.5 rounded" : "text-slate-300"}>{ch.audioCount}</span>
                                            </td>

                                            <td className="p-3 text-right pr-4">
                                                <span className="text-[9px] font-mono text-slate-400">
                                                    {ch.lastUpdated || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {viewTab === 'PENDING' && chapters.filter(c =>
                                        !c.hasNotes || !c.hasMcq || !c.hasVideo ||
                                        !c.noteTypes.PREMIUM || !c.noteTypes.DEEP_DIVE || !c.noteTypes.ADDITIONAL || !c.noteTypes.TEACHER
                                    ).map((ch) => (
                                        <tr key={`pending-${ch.subjectName}-${ch.id}`} className="hover:bg-orange-50 transition-colors">
                                            <td className="p-3 pl-4 border-r border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-wider">{ch.subjectName}</span>
                                                    <span className="font-bold text-slate-800 line-clamp-1 max-w-[250px]" title={ch.title}>
                                                        {ch.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td colSpan={9} className="p-3 pl-4 text-xs font-bold text-slate-600">
                                                <div className="flex flex-wrap gap-2">
                                                    {!ch.noteTypes.PREMIUM && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">No Premium Notes</span>}
                                                    {!ch.noteTypes.DEEP_DIVE && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">No Deep Dive</span>}
                                                    {!ch.noteTypes.ADDITIONAL && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">No Addnl Notes</span>}
                                                    {!ch.noteTypes.TEACHER && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">No Teacher Guide</span>}
                                                    {ch.mcqCount === 0 && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">0 MCQs</span>}
                                                    {ch.videoCount === 0 && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">0 Videos</span>}
                                                    {ch.audioCount === 0 && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">0 Audios</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {viewTab === 'RECENT_UPDATES' && [...chapters].sort((a, b) => (b.lastUpdatedTimestamp || 0) - (a.lastUpdatedTimestamp || 0)).filter(c => c.lastUpdated).slice(0, 50).map((ch) => (
                                        <tr key={`recent-${ch.subjectName}-${ch.id}`} className="hover:bg-green-50 transition-colors">
                                             <td className="p-3 pl-4 border-r border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-green-600 uppercase tracking-wider">{ch.subjectName}</span>
                                                    <span className="font-bold text-slate-800 line-clamp-1 max-w-[250px]">
                                                        {ch.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td colSpan={8} className="p-3">
                                                 <div className="flex gap-4 text-[10px] font-bold text-slate-500">
                                                     <span>Notes: {ch.hasNotes ? 'Yes' : 'No'}</span>
                                                     <span>MCQs: {ch.mcqCount}</span>
                                                     <span>Videos: {ch.videoCount}</span>
                                                     <span>Audio: {ch.audioCount}</span>
                                                 </div>
                                            </td>
                                            <td className="p-3 text-right pr-4 font-mono text-[9px] text-green-700 font-bold">
                                                {ch.lastUpdated}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Layers size={48} className="mx-auto mb-4 text-slate-300" />
                    <h4 className="font-black text-slate-700 mb-2">No Content Scanned</h4>
                    <p className="text-sm">Click "Scan Class {selectedClass}" to view full content audit details across all subjects.</p>
                </div>
            )}
        </div>
    );
};
