
import React from 'react';
import { StrategicBriefing } from '../types';
import { BackIcon, TrashIcon } from './common/Icons';

interface HistoryPanelProps {
  history: StrategicBriefing[];
  onSelect: (briefing: StrategicBriefing) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onClearAll: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onDelete, onBack, onClearAll }) => {

  const handleClearAll = () => {
    if (window.confirm('آیا از حذف تمام موارد آرشیو مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) {
        onClearAll();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-fade-in-up">
       <div className="glass-card p-6 md:p-8 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-700">
            <h2 className="text-3xl font-bold text-slate-100">آرشیو پرونده‌ها</h2>
            <div className="flex items-center gap-2">
                {history.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-2 py-2 px-4 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-800/50 border border-red-700 transition-colors"
                        aria-label="پاکسازی آرشیو"
                    >
                        <TrashIcon />
                        <span>پاکسازی همه</span>
                    </button>
                )}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 py-2 px-4 bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 border border-slate-700 transition-colors"
                    aria-label="بازگشت"
                >
                    <BackIcon />
                    <span>بازگشت</span>
                </button>
            </div>
        </div>

        {history.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-lg">آرشیو شما خالی است.</p>
        ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                {history.map(briefing => (
                    <div key={briefing.id} className="glass-card p-4 rounded-lg flex items-center justify-between gap-4 hover:border-cyan-500 transition-all duration-300 group">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(briefing)}>
                            <p className="font-semibold text-lg text-slate-200 truncate group-hover:text-cyan-400" title={briefing.query}>
                                {briefing.query}
                            </p>
                            <p className="text-sm text-slate-400">
                                {new Date(briefing.timestamp).toLocaleString('fa-IR')}
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`آیا از حذف پرونده "${briefing.query}" مطمئن هستید؟`)) {
                                    onDelete(briefing.id);
                                }
                            }}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-full transition-colors"
                            aria-label="حذف پرونده"
                        >
                           <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>
        )}
       </div>
    </div>
  );
};

export default HistoryPanel;
