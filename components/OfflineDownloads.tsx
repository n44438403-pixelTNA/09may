import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, FileText, BarChart2, CheckCircle2, FileQuestion, Download, Volume2, Square } from 'lucide-react';
import { getOfflineItems, removeOfflineItem, OfflineItem } from '../utils/offlineStorage';
import { MarksheetCard } from './MarksheetCard';
import { User, SystemSettings } from '../types';
import { speakText, stopSpeech } from '../utils/textToSpeech';

interface Props {
  onBack: () => void;
  hideHeader?: boolean;
  user?: User;
  settings?: SystemSettings;
}

export const OfflineDownloads: React.FC<Props> = ({ onBack, hideHeader = false, user, settings }) => {
  const [items, setItems] = useState<OfflineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<OfflineItem | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const data = await getOfflineItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this downloaded item?")) {
      await removeOfflineItem(id);
      fetchItems();
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const toggleSpeech = (htmlContent: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    // Use our robust text-to-speech utility instead of raw utterance to handle HTML stripping
    // and Android WebView quirks better.
    setIsSpeaking(true);
    speakText(
        htmlContent,
        null,
        1.0,
        'en-IN',
        undefined,
        () => setIsSpeaking(false) // onEnd
    ).then(utterance => {
        if (!utterance) {
            setIsSpeaking(false); // TTS failed or not supported
        }
    });
  };


  // Group items by type
  const notes = items.filter(i => i.type === 'NOTE');
  const mcqs = items.filter(i => i.type === 'MCQ');
  const analysis = items.filter(i => i.type === 'ANALYSIS');

  const renderItemViewer = (item: OfflineItem) => {
    if (item.type === 'ANALYSIS' && item.data?.result && user) {
        return (
            <MarksheetCard
                result={item.data.result}
                questions={item.data.questions}
                user={user}
                settings={settings}
                onClose={() => setSelectedItem(null)}
            />
        );
    }

    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col h-screen w-screen overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => {
              setSelectedItem(null);
              if (window.speechSynthesis) window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }} className="p-2 bg-slate-200 rounded-full text-slate-700 hover:bg-slate-300">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 line-clamp-1">{item.title}</h2>
              <p className="text-xs text-slate-600">{item.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.type === 'NOTE' && item.data?.html && (
               <button
                  onClick={() => toggleSpeech(item.data.html)}
                  className={`p-2 rounded-full ${isSpeaking ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  title={isSpeaking ? "Stop Reading" : "Read Aloud"}
               >
                  {isSpeaking ? <Square size={20} /> : <Volume2 size={20} />}
               </button>
            )}
            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {item.type === 'NOTE' && item.data?.html && (
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: item.data.html }} />
          )}

          {item.type === 'MCQ' && (
            <div className="space-y-6">
              {/* Legacy fallback for old array format or direct questions array */}
              {(() => {
                  const questions = Array.isArray(item.data) ? item.data : (item.data.questions || []);
                  const theory = item.data.theory;
                  const topicNotes = item.data.topicNotes;

                  return (
                      <>
                        {/* Display Theory/Notes if they exist */}
                        {theory && (
                            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                <h3 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-200 pb-2">Chapter Theory</h3>
                                <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: theory.replace(/\n/g, '<br/>') }} />
                            </div>
                        )}
                        {topicNotes && topicNotes.length > 0 && (
                            <div className="mb-8 space-y-4">
                                <h3 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-200 pb-2">Topic Notes</h3>
                                {topicNotes.map((note: any, idx: number) => (
                                    <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                        <h4 className="font-bold text-slate-700 mb-2">{note.title || note.topic}</h4>
                                        <div className="prose prose-slate max-w-none text-sm" dangerouslySetInnerHTML={{ __html: note.content }} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Display Questions */}
                        {questions.length > 0 && <h3 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-200 pb-2 mt-8">Practice Questions</h3>}
                        {questions.map((q: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="font-bold text-slate-800 mb-3">{idx + 1}. <span dangerouslySetInnerHTML={{ __html: q.question }} /></p>
                            <div className="space-y-2">
                              {q.options?.map((opt: string, oIdx: number) => (
                                <div key={oIdx} className={`p-3 rounded-lg border flex items-center ${oIdx === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                                  {oIdx === q.correctAnswer && <CheckCircle2 size={16} className="mr-2 text-green-600 flex-shrink-0" />}
                                  <span dangerouslySetInnerHTML={{ __html: opt }} />
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                <strong>Explanation:</strong> <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                  );
              })()}
            </div>
          )}

          {item.type === 'ANALYSIS' && item.data?.result && (
            <div className="space-y-6 w-full mx-auto">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white text-center shadow-lg">
                <h3 className="text-xl font-black mb-2">{item.data.result.chapterTitle}</h3>
                <div className="text-5xl font-black mb-2">{item.data.result.score} <span className="text-2xl opacity-70">/ {item.data.result.totalQuestions}</span></div>
                <p className="font-bold opacity-90">Total Time: {Math.floor((item.data.result.timeTaken || 0) / 60)}m {(item.data.result.timeTaken || 0) % 60}s</p>
              </div>

              <h4 className="font-bold text-slate-800 text-lg border-b pb-2">Questions Review</h4>
              <div className="space-y-4">
                {item.data.questions?.map((q: any, idx: number) => {
                  const userAnswer = item.data.result.answers[idx];
                  const isCorrect = userAnswer === q.correctAnswer;
                  const isSkipped = userAnswer === undefined || userAnswer === null || userAnswer === -1;

                  return (
                    <div key={idx} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-200 bg-green-50' : isSkipped ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <p className="font-bold text-slate-800 flex-1">{idx + 1}. <span dangerouslySetInnerHTML={{ __html: q.question }} /></p>
                        <span className={`text-xs font-black px-2 py-1 rounded-full whitespace-nowrap ${isCorrect ? 'bg-green-100 text-green-700' : isSkipped ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-700'}`}>
                          {isCorrect ? 'Correct' : isSkipped ? 'Skipped' : 'Wrong'}
                        </span>
                      </div>

                      <div className="space-y-1 mt-3">
                        {q.options?.map((opt: string, oIdx: number) => {
                          const isSelected = userAnswer === oIdx;
                          const isActuallyCorrect = q.correctAnswer === oIdx;

                          let bgClass = "bg-white border-slate-200 text-slate-600";
                          if (isActuallyCorrect) bgClass = "bg-green-100 border-green-300 text-green-800 font-bold";
                          else if (isSelected && !isActuallyCorrect) bgClass = "bg-red-100 border-red-300 text-red-800";

                          return (
                            <div key={oIdx} className={`p-2 rounded-lg border text-sm flex items-center ${bgClass}`}>
                               {isActuallyCorrect && <CheckCircle2 size={14} className="mr-2 flex-shrink-0" />}
                               <span dangerouslySetInnerHTML={{ __html: opt }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderList = (title: string, list: OfflineItem[], icon: React.ReactNode) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
          {icon} {title}
        </h3>
        <div className="space-y-3">
          {list.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItem(item)}>
              <div>
                <h4 className="font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{item.subtitle} • {new Date(item.timestamp).toLocaleDateString()}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (selectedItem) {
    return renderItemViewer(selectedItem);
  }

  return (
    <div className={`bg-slate-50 ${hideHeader ? 'pb-8' : 'min-h-screen pb-8'}`}>
      {!hideHeader && (
        <div className="bg-white p-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-40">
          <h1 className="text-xl font-black text-slate-800 px-2">Offline Downloads</h1>
        </div>
      )}

      <div className={`${hideHeader ? 'p-0' : 'p-4'} max-w-4xl mx-auto`}>
        {loading ? (
          <div className="flex justify-center py-10"><span className="animate-spin text-2xl">⏳</span></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
              <Download size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Downloads Yet</h3>
            <p className="text-slate-600 max-w-xs mx-auto">Items you save offline will appear here so you can access them without internet.</p>
          </div>
        ) : (
          <>
            {renderList("Saved Notes", notes, <FileText size={20} className="text-blue-500" />)}
            {renderList("Saved MCQs", mcqs, <FileQuestion size={20} className="text-purple-500" />)}
            {renderList("Analysis Reports", analysis, <BarChart2 size={20} className="text-indigo-500" />)}
          </>
        )}
      </div>
    </div>
  );
};
