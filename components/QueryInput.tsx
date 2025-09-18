
import React, { useState, useMemo, useEffect } from 'react';
import { SearchLevel, StrategicBriefing, InputMode } from '../types';
import { SEARCH_LEVELS } from '../constants';
import ErrorDisplay from './common/ErrorDisplay';

interface QueryInputProps {
  onStart: (query: string, level: SearchLevel, inputMode: InputMode) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  history: StrategicBriefing[];
  defaultSearchLevel?: SearchLevel;
}

const LevelCard: React.FC<{
  level: typeof SEARCH_LEVELS[0];
  isSelected: boolean;
  onSelect: () => void;
}> = ({ level, isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    className={`
      p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 transform
      ${isSelected
        ? 'bg-cyan-900/50 border-cyan-500 scale-105 glow-border'
        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-cyan-700'}
    `}
  >
    <h3 className="text-lg font-bold text-cyan-300">{level.name}</h3>
    <p className="text-sm text-slate-400 mt-1">{level.description}</p>
  </div>
);

const ModeToggleButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-5 py-2 text-sm font-bold rounded-md transition-colors duration-300 w-1/2 ${isActive ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}
    >
        {label}
    </button>
);


const QueryInput: React.FC<QueryInputProps> = ({ onStart, isLoading, error, clearError, history, defaultSearchLevel }) => {
  const [query, setQuery] = useState<string>('');
  const [level, setLevel] = useState<SearchLevel>(defaultSearchLevel || SearchLevel.LEVEL_2);
  const [inputMode, setInputMode] = useState<InputMode>('TEXT');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultSearchLevel) {
      setLevel(defaultSearchLevel);
    }
  }, [defaultSearchLevel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (error) clearError();
    setJsonError(null);

    if (query.trim() && !isLoading) {
        if (inputMode === 'JSON') {
            try {
                JSON.parse(query);
            } catch (err) {
                setJsonError("ورودی JSON نامعتبر است. لطفاً ساختار آن را بررسی کنید.");
                return;
            }
        }
        
        onStart(query, level, inputMode);
    }
  };
  
  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (error) clearError();
    if (jsonError) setJsonError(null);
    setQuery(e.target.value);
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 animate-fade-in-up">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-slate-100 tracking-wider">RAH-YAB</h1>
        <p className="text-cyan-400 mt-2 text-lg">پروتکل هوشمند تحلیل استراتژیک</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 rounded-2xl space-y-8">
        
        {(error || jsonError) && (
          <ErrorDisplay 
            message={error || jsonError || ''} 
            onClear={() => {
              if (error) clearError();
              if (jsonError) setJsonError(null);
            }} 
          />
        )}

        <div>
          <label htmlFor="query" className="block text-lg font-semibold mb-3 text-slate-300">۱. تعریف ماموریت</label>
          <div className="flex p-1 bg-slate-800/70 rounded-lg mb-4">
              <ModeToggleButton label="تحلیل متنی" isActive={inputMode === 'TEXT'} onClick={() => setInputMode('TEXT')} />
              <ModeToggleButton label="تحلیل کانفیگ (JSON)" isActive={inputMode === 'JSON'} onClick={() => setInputMode('JSON')} />
          </div>
          <textarea
            id="query"
            value={query}
            onChange={handleQueryChange}
            placeholder={
                inputMode === 'TEXT'
                ? "مثال: بهترین و مقاوم‌ترین پیکربندی برای عبور از فیلترینگ با VLESS و Reality چیست؟"
                : "پیکربندی JSON خود را در اینجا جای‌گذاری کنید..."
            }
            className={`w-full h-36 p-4 bg-slate-900/70 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-lg text-slate-200 ${inputMode === 'JSON' ? 'font-mono text-left direction-ltr' : ''}`}
            required
          />
        </div>

        <div>
          <label className="block text-lg font-semibold mb-4 text-slate-300">۲. انتخاب عمق تحلیل</label>
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${inputMode === 'JSON' ? 'opacity-50 pointer-events-none' : ''}`}>
            {SEARCH_LEVELS.map((searchLevel) => (
              <LevelCard
                key={searchLevel.id}
                level={searchLevel}
                isSelected={level === searchLevel.id}
                onSelect={() => setLevel(searchLevel.id)}
              />
            ))}
          </div>
           {inputMode === 'JSON' && <p className="text-xs text-slate-500 mt-2">عمق تحلیل برای ورودی JSON به صورت خودکار تنظیم می‌شود.</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full flex items-center justify-center gap-3 py-4 bg-cyan-600 text-white font-bold text-xl rounded-lg hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/30"
        >
          {isLoading ? 'در حال پردازش...' : 'شروع عملیات'}
        </button>
      </form>
    </div>
  );
};

export default QueryInput;
