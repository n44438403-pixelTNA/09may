import React, { useMemo, useState } from 'react';
import type { User, SystemSettings, MCQResult } from '../types';
import { X, Download, Calendar, Trophy, Target, Award, Crown, Star, Folder, ChevronRight, ChevronLeft, CalendarDays, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DownloadOptionsModal } from './DownloadOptionsModal';
import { downloadAsMHTML } from '../utils/downloadUtils';

interface Props {
  user: User;
  settings?: SystemSettings;
  onClose: () => void;
  reportType?: 'MONTHLY' | 'ANNUAL';
}

type ViewMode = 'YEARS' | 'MONTHS' | 'WEEKS' | 'REPORT';

export const MonthlyMarksheet: React.FC<Props> = ({ user, settings, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('YEARS');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // 0-11
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null); // 1-4
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  // Extract all history
  const history = useMemo(() => user.mcqHistory || [], [user.mcqHistory]);

  // Derive available years
  const availableYears = useMemo(() => {
      const years = new Set<number>();
      history.forEach(h => years.add(new Date(h.date).getFullYear()));
      return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  // Derive tests for selected Year
  const yearTests = useMemo(() => {
      if (selectedYear === null) return [];
      return history.filter(h => new Date(h.date).getFullYear() === selectedYear);
  }, [history, selectedYear]);

  // Derive available months for the selected year
  const availableMonths = useMemo(() => {
      const months = new Set<number>();
      yearTests.forEach(h => months.add(new Date(h.date).getMonth()));
      return Array.from(months).sort((a, b) => a - b);
  }, [yearTests]);

  // Derive tests for selected Month
  const monthTests = useMemo(() => {
      if (selectedMonth === null) return yearTests;
      return yearTests.filter(h => new Date(h.date).getMonth() === selectedMonth);
  }, [yearTests, selectedMonth]);

  // Function to determine week of month (1-4)
  const getWeekOfMonth = (date: Date) => {
      const d = date.getDate();
      if (d <= 7) return 1;
      if (d <= 14) return 2;
      if (d <= 21) return 3;
      return 4;
  };

  // Derive available weeks for selected Month
  const availableWeeks = useMemo(() => {
      const weeks = new Set<number>();
      monthTests.forEach(h => weeks.add(getWeekOfMonth(new Date(h.date))));
      return Array.from(weeks).sort((a, b) => a - b);
  }, [monthTests]);

  // Derive tests for selected Week
  const weekTests = useMemo(() => {
      if (selectedWeek === null) return monthTests;
      return monthTests.filter(h => getWeekOfMonth(new Date(h.date)) === selectedWeek)
                       .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthTests, selectedWeek]);

  // Pagination
  const totalPages = Math.ceil(weekTests.length / ITEMS_PER_PAGE) || 1;
  const currentData = weekTests.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = useMemo(() => {
      const totalTests = currentData.length;
      const totalQuestions = currentData.reduce((acc, curr) => acc + curr.totalQuestions, 0);
      const totalScore = currentData.reduce((acc, curr) => acc + curr.score, 0);
      const percentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      
      return { totalTests, totalQuestions, totalScore, percentage };
  }, [currentData]);

  const reportTitle = useMemo(() => {
      if (selectedYear === null) return '';
      let title = `${selectedYear}`;
      if (selectedMonth !== null) {
          const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long' });
          title = `${monthName} ${title}`;
          if (selectedWeek !== null) {
              title = `Week ${selectedWeek}, ${title}`;
          }
      }
      return title;
  }, [selectedYear, selectedMonth, selectedWeek]);

  const isScholarshipWinner = stats.percentage >= 90 && stats.totalTests > 0;
  const isConsistencyKing = currentData.length >= 5; // simplified

  const handleDownloadPdf = async () => {
      const element = document.getElementById('marksheet-report');
      if (!element) return;
      try {
          // Temporarily hide pagination controls for the screenshot if needed
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          const imgData = canvas.toDataURL('image/png');

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Marksheet_${user.name}_${reportTitle.replace(/ /g, '_')}_Pg${currentPage}.pdf`);
      } catch (e) {
          console.error('Download failed', e);
      }
  };

  const handleBack = () => {
      if (viewMode === 'REPORT') {
          setViewMode('WEEKS');
          setSelectedWeek(null);
          setCurrentPage(1);
      } else if (viewMode === 'WEEKS') {
          setViewMode('MONTHS');
          setSelectedMonth(null);
      } else if (viewMode === 'MONTHS') {
          setViewMode('YEARS');
          setSelectedYear(null);
      }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in overflow-hidden">
        <div className="w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] bg-white sm:rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
            
            {/* Header - Sticky */}
            <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex justify-between items-center z-10 sticky top-0 shrink-0">
                <div className="flex items-center gap-3">
                    {viewMode !== 'YEARS' ? (
                        <button onClick={handleBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                    ) : (
                        <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-300">
                            <FileText size={20} />
                        </div>
                    )}
                    <div>
                        <h1 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                            My Marksheets
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400">
                            {viewMode === 'YEARS' ? 'Select Year' :
                             viewMode === 'MONTHS' ? `Select Month in ${selectedYear}` :
                             viewMode === 'WEEKS' ? `Select Week in ${monthNames[selectedMonth || 0]} ${selectedYear}` :
                             reportTitle}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {viewMode === 'REPORT' && (
                        <button onClick={() => setDownloadModalOpen(true)} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/30">
                            <Download size={20} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <DownloadOptionsModal
                isOpen={downloadModalOpen}
                onClose={() => setDownloadModalOpen(false)}
                title="Download Report"
                onDownloadPdf={handleDownloadPdf}
                onDownloadMhtml={() => downloadAsMHTML('marksheet-report', `Marksheet_${user.name}`, {
                    appName: settings?.appShortName || settings?.appName || 'IIC',
                    pageTitle: `Marksheet · ${user.name}`,
                    subtitle: 'Performance Report',
                })}
            />

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                
                {/* YEARS VIEW */}
                {viewMode === 'YEARS' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-in slide-in-from-right-4">
                        {availableYears.length > 0 ? availableYears.map(year => (
                            <button
                                key={year}
                                onClick={() => { setSelectedYear(year); setViewMode('MONTHS'); }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col items-center gap-3 group"
                            >
                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                    <Folder size={32} />
                                </div>
                                <span className="font-black text-xl text-slate-800">{year}</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">{history.filter(h => new Date(h.date).getFullYear() === year).length} Tests</span>
                            </button>
                        )) : (
                            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                <CalendarDays size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500 font-bold">No test history available yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* MONTHS VIEW */}
                {viewMode === 'MONTHS' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-in slide-in-from-right-4">
                        {availableMonths.map(month => (
                            <button
                                key={month}
                                onClick={() => { setSelectedMonth(month); setViewMode('WEEKS'); }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col items-center gap-3 group"
                            >
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <Calendar size={32} />
                                </div>
                                <span className="font-black text-lg text-slate-800">{monthNames[month]}</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">{yearTests.filter(h => new Date(h.date).getMonth() === month).length} Tests</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* WEEKS VIEW */}
                {viewMode === 'WEEKS' && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-4">
                        {[1, 2, 3, 4].map(week => {
                            const testsInWeek = monthTests.filter(h => getWeekOfMonth(new Date(h.date)) === week).length;
                            const isActive = testsInWeek > 0;
                            return (
                                <button
                                    key={week}
                                    disabled={!isActive}
                                    onClick={() => { setSelectedWeek(week); setViewMode('REPORT'); setCurrentPage(1); }}
                                    className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group
                                        ${isActive ? 'bg-white shadow-sm border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer' : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'}
                                    `}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform ${isActive ? 'bg-green-50 text-green-500 group-hover:scale-110' : 'bg-slate-200 text-slate-400'}`}>
                                        <CalendarDays size={28} />
                                    </div>
                                    <span className="font-black text-lg text-slate-800">Week {week}</span>
                                    <span className="text-xs font-bold text-slate-500 uppercase">{testsInWeek} Tests</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* REPORT VIEW */}
                {viewMode === 'REPORT' && (
                    <div className="animate-in slide-in-from-right-4">

                        {/* PAGINATION CONTROLS (Top) */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1 font-bold text-xs"
                                >
                                    <ChevronLeft size={16} /> Prev Marksheet
                                </button>
                                <span className="font-black text-indigo-600 text-sm">Marksheet {currentPage} of {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1 font-bold text-xs"
                                >
                                    Next Marksheet <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* REPORT CONTAINER */}
                        <div id="marksheet-report" className="bg-white p-6 sm:p-10 border-4 border-double border-slate-300 shadow-lg relative mx-auto text-slate-900 rounded-xl">

                            {/* Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                                {settings?.appLogo && <img src={settings.appLogo} alt="" className="w-96 h-96 object-contain grayscale" />}
                            </div>

                            <div className="relative z-10">
                                {/* Report Header */}
                                <div className="text-center mb-8 border-b-4 border-slate-900 pb-8 flex flex-col items-center">
                                    {settings?.appLogo ? (
                                        <img src={settings.appLogo} alt="Logo" className="w-32 h-32 mx-auto mb-4 object-contain shadow-sm p-2 bg-white rounded-2xl border border-slate-100" />
                                    ) : (
                                        <div className="w-32 h-32 mx-auto mb-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center shadow-sm">
                                            <Trophy size={48} className="text-indigo-300" />
                                        </div>
                                    )}
                                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-widest leading-none mb-2">{settings?.appName || 'INSTITUTE NAME'}</h1>
                                    <p className="text-xl font-bold text-indigo-600 uppercase tracking-[0.2em]">{settings?.aiName || 'AI Assessment Center'}</p>
                                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                                        <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-md">
                                            Weekly Performance Marksheet
                                        </div>
                                        <div className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-md">
                                            {reportTitle}
                                        </div>
                                    </div>
                                </div>

                                {/* STAMPS / BADGES */}
                                <div className="absolute top-0 right-0 flex flex-col gap-3 pointer-events-none origin-top-right scale-75 sm:scale-100">
                                    {isScholarshipWinner && (
                                        <div className="w-28 h-28 border-4 border-yellow-500 rounded-full flex items-center justify-center rotate-12 bg-yellow-50/90 backdrop-blur-md shadow-xl">
                                            <div className="text-center">
                                                <Star size={28} className="mx-auto text-yellow-500 mb-1 fill-yellow-500" />
                                                <p className="text-[9px] font-black text-yellow-700 uppercase leading-tight tracking-wider">Top<br/>Performer</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Student Details */}
                                <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-8 bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 shadow-inner gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center shadow-sm text-2xl font-black text-indigo-600">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Student Name</p>
                                            <p className="text-2xl font-black text-slate-800">{user.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right bg-white p-3 rounded-xl border border-slate-200 shadow-sm min-w-[120px]">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">UID</p>
                                        <p className="text-lg font-mono font-black text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block">{user.displayId || user.id}</p>
                                    </div>
                                </div>

                                {/* Stats Overview */}
                                <div className="grid grid-cols-2 gap-6 mb-10">
                                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-3xl text-center text-white shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                        <Trophy className="mx-auto text-indigo-200 mb-3 drop-shadow-md" size={32} />
                                        <p className="text-5xl font-black mb-1 drop-shadow-md">{stats.percentage}%</p>
                                        <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Aggregate Score</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 text-center shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                        <Target className="mx-auto text-slate-400 mb-3" size={32} />
                                        <p className="text-5xl font-black text-slate-800 mb-1">{stats.totalTests}</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tests Evaluated</p>
                                    </div>
                                </div>

                                {/* Test List Table */}
                                <div className="mb-4">
                                    <h3 className="font-black text-slate-900 uppercase text-sm mb-4 flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                                        <Award size={18} className="text-indigo-600" /> Subject-wise Test Evaluation
                                    </h3>
                                    {currentData.length > 0 ? (
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr className="border-b border-slate-200 text-slate-600">
                                                        <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-wider w-12">#</th>
                                                        <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-wider w-24">Date</th>
                                                        <th className="text-left py-3 px-4 font-black uppercase text-[10px] tracking-wider">Test Details</th>
                                                        <th className="text-right py-3 px-4 font-black uppercase text-[10px] tracking-wider">Marks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {currentData.map((test, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="py-4 px-4 font-bold text-slate-400">
                                                                {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                                                            </td>
                                                            <td className="py-4 px-4 font-bold text-slate-600">
                                                                {new Date(test.date).toLocaleDateString(undefined, {day: '2-digit', month: 'short'})}
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <p className="font-bold text-slate-800 line-clamp-1">{test.chapterTitle}</p>
                                                                {test.chapterId && <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">Subject Ref: {test.chapterId.split('_')[0] || 'General'}</p>}
                                                            </td>
                                                            <td className="py-4 px-4 font-black text-right">
                                                                <span className="text-slate-900 text-base">{test.score}</span>
                                                                <span className="text-slate-400 text-xs">/{test.totalQuestions}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                            <p className="text-slate-500 font-bold">No test records found for this period.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {settings?.appName} • Generated on {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* PAGINATION CONTROLS (Bottom) */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1 font-bold text-xs"
                                >
                                    <ChevronLeft size={16} /> Prev Marksheet
                                </button>
                                <span className="font-black text-indigo-600 text-sm">Marksheet {currentPage} of {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1 font-bold text-xs"
                                >
                                    Next Marksheet <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
