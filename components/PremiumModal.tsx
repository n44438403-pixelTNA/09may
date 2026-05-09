import React, { useState, useEffect } from 'react';
import { Chapter, ContentType, User, Subject, Board, ClassLevel, Stream, SystemSettings } from '../types';
import { Crown, BookOpen, Lock, X, HelpCircle, FileText, Video, PlayCircle, ArrowLeft, Loader2, Sparkles, CheckCircle, Zap } from 'lucide-react';
import { getChapterData } from '../firebase';

interface Props {
  chapter: Chapter;
  user: User;
  credits: number;
  isAdmin: boolean;
  onSelect: (type: ContentType, count?: number, forcePay?: boolean, specificContent?: any) => void;
  onClose: () => void;
  settings?: SystemSettings;
  board: Board;
  classLevel: ClassLevel;
  stream: Stream | null;
  subject: Subject;
  isFlashSaleActive?: boolean; // New Prop
}

export const PremiumModal: React.FC<Props> = ({ chapter, user, credits, isAdmin, onSelect, onClose, settings, board, classLevel, stream, subject, isFlashSaleActive }) => {
  const [view, setView] = useState<'HOME' | 'NOTES_FREE' | 'NOTES_PREMIUM' | 'VIDEO_FREE' | 'VIDEO_PREMIUM'>('HOME');
  const [loading, setLoading] = useState(true);
  const [contentData, setContentData] = useState<any>(null);

  // Countdown Timer for Sale
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
      const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
      const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
      
      getChapterData(key).then(data => {
          setContentData(data || {});
          setLoading(false);
      });
  }, [chapter.id]);

  useEffect(() => {
      if (isFlashSaleActive) {
          const interval = setInterval(() => {
              const lastVisit = parseInt(localStorage.getItem('nst_store_last_visit') || '0');
              const expiry = lastVisit + (2 * 60 * 60 * 1000); // 2 Hours from visit
              const diff = expiry - Date.now();

              if (diff <= 0) {
                  setTimeLeft('Ended');
                  clearInterval(interval);
              } else {
                  const m = Math.floor((diff / 1000 / 60) % 60);
                  const s = Math.floor((diff / 1000) % 60);
                  setTimeLeft(`${m}m ${s}s`);
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [isFlashSaleActive]);

  const handleClose = () => {
      // Record timestamp if not subscribed, to trigger potential "Abandonment Discount" later
      if (!user.isPremium) {
          localStorage.setItem('nst_store_last_visit', Date.now().toString());
      }
      onClose();
  };

  const canAccess = (cost: number) => {
      if (isAdmin) return true;
      if (user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) return true;
      return credits >= cost;
  };

  const getDiscountedPrice = (price: number) => {
      if (!isFlashSaleActive) return price;
      return Math.ceil(price * 0.9); // 10% Discount
  };

  const filterContent = (list: any[], isPremium: boolean) => (list || []).filter((i: any) => !!i.isPremium === isPremium);

  const renderHome = () => (
      <div className="grid grid-cols-2 gap-3 p-4">
          <button onClick={() => setView('NOTES_FREE')} className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center gap-2 hover:bg-green-100">
              <FileText size={24} className="text-green-600" />
              <span className="text-xs font-bold text-green-800">Free Notes</span>
          </button>
          <button onClick={() => setView('NOTES_PREMIUM')} className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex flex-col items-center gap-2 hover:bg-yellow-100 relative overflow-hidden">
              <Crown size={24} className="text-yellow-600" />
              <span className="text-xs font-bold text-yellow-800">Premium Notes</span>
              {isFlashSaleActive && <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] px-1.5 font-bold rounded-bl">-10%</div>}
          </button>

          <button onClick={() => setView('VIDEO_FREE')} className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center gap-2 hover:bg-blue-100">
              <Video size={24} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-800">Free Videos</span>
          </button>
          <button onClick={() => setView('VIDEO_PREMIUM')} className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center gap-2 hover:bg-purple-100 relative overflow-hidden">
              <PlayCircle size={24} className="text-purple-600" />
              <span className="text-xs font-bold text-purple-800">Premium Videos</span>
              {isFlashSaleActive && <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] px-1.5 font-bold rounded-bl">-10%</div>}
          </button>

          <button onClick={() => onSelect('PDF_ULTRA')} className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-800 relative overflow-hidden">
              <Sparkles size={24} className="text-yellow-400" />
              <span className="text-xs font-bold">Ultra Content</span>
              {isFlashSaleActive && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] px-1.5 font-bold rounded-bl">-10%</div>}
          </button>
          <button onClick={() => onSelect('MCQ_ANALYSIS')} className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center gap-2 hover:bg-indigo-100">
              <CheckCircle size={24} className="text-indigo-600" />
              <span className="text-xs font-bold text-indigo-800">MCQ Test</span>
          </button>
      </div>
  );

  const renderList = (items: any[], type: 'NOTES' | 'VIDEO', isPremium: boolean) => (
      <div className="p-4 space-y-3">
          {items.length === 0 && <p className="text-center text-slate-500 text-sm">No content available.</p>}
          {items.map((item, idx) => {
              // Calculate item specific price if premium
              const basePrice = item.price || 5;
              const finalPrice = isPremium ? getDiscountedPrice(basePrice) : 0;

              return (
              <button
                  key={idx}
                  onClick={() => onSelect(type === 'NOTES' ? (isPremium ? 'NOTES_PREMIUM' : 'NOTES_HTML_FREE') : 'VIDEO_LECTURE', undefined, undefined, item)}
                  className="w-full bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:bg-slate-50 relative group"
              >
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPremium ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                          {type === 'NOTES' ? <FileText size={16} /> : <PlayCircle size={16} />}
                      </div>
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[140px] text-left">{item.title || item.topic}</span>
                  </div>

                  {isPremium && !canAccess(finalPrice) ? (
                      <div className="flex items-center gap-2">
                          {isFlashSaleActive && (
                              <span className="text-[10px] line-through text-slate-500">{basePrice}</span>
                          )}
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                              <span className={`text-xs font-bold ${isFlashSaleActive ? 'text-red-600' : 'text-slate-600'}`}>{finalPrice} CR</span>
                              <Lock size={12} className="text-slate-500" />
                          </div>
                      </div>
                  ) : (
                      <div className="bg-slate-100 p-1 rounded-full"><ArrowLeft size={16} className="rotate-180 text-slate-500" /></div>
                  )}
              </button>
          )})}
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden relative max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {view !== 'HOME' && <button onClick={() => setView('HOME')}><ArrowLeft size={20} className="text-slate-600" /></button>}
                    <h3 className="font-black text-slate-800 truncate max-w-[200px]">{chapter.title}</h3>
                </div>
                <button onClick={handleClose} className="bg-slate-100 p-1.5 rounded-full"><X size={20} className="text-slate-600" /></button>
            </div>

            
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="animate-spin text-slate-500" />
                    </div>
                ) : (
                    <>
                        {view === 'HOME' && renderHome()}
                        {view === 'NOTES_FREE' && renderList(filterContent(contentData?.topicNotes, false), 'NOTES', false)}
                        {view === 'NOTES_PREMIUM' && renderList(filterContent(contentData?.topicNotes, true), 'NOTES', true)}
                        {view === 'VIDEO_FREE' && renderList(filterContent(contentData?.topicVideos, false), 'VIDEO', false)}
                        {view === 'VIDEO_PREMIUM' && renderList(filterContent(contentData?.topicVideos, true), 'VIDEO', true)}
                    </>
                )}
            </div>
        </div>
    </div>
  );
};
