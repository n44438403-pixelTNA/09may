
import React from 'react';
import { Download, FileText, Globe, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onDownloadPdf?: () => void;
    onDownloadMhtml?: () => void;
    title?: string;
}

export const DownloadOptionsModal: React.FC<Props> = ({ isOpen, onClose, onDownloadPdf, onDownloadMhtml, title = "Download Options" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden scale-in-center">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Download size={18} className="text-blue-600"/> {title}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-3">
                    <p className="text-xs text-slate-600 mb-4 text-center">Select a format to save this document offline.</p>

                    {onDownloadPdf && (
                        <button
                            onClick={() => { onDownloadPdf(); onClose(); }}
                            className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 hover:border-red-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-red-600 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 text-sm">Download as PDF</p>
                                    <p className="text-[10px] text-slate-600">Best for printing & sharing</p>
                                </div>
                            </div>
                            <div className="bg-white px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-100">.pdf</div>
                        </button>
                    )}

                    {onDownloadMhtml && (
                        <button
                            onClick={() => { onDownloadMhtml(); onClose(); }}
                            className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 hover:border-blue-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                                    <Globe size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 text-sm">Save as Webpage (MHTML)</p>
                                    <p className="text-[10px] text-slate-600">Best for offline viewing</p>
                                </div>
                            </div>
                            <div className="bg-white px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-100">.html</div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
