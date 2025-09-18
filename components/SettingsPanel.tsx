import React, { useState, useEffect, useCallback } from 'react';
import { RahYabSettings, SourceType, KnowledgeBaseSource, KnowledgeBaseIndexConfig } from '../types';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { TrashIcon, GithubIcon, WebsiteIcon } from './common/Icons';
import ModelParameters from './settings/ModelParameters';
import DefaultSettings from './settings/DefaultSettings';

const SettingSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="border-t border-slate-700 pt-6 mt-6">
        <h3 className="text-lg font-bold mb-4 text-slate-200">{title}</h3>
        {children}
    </div>
);

const AddSourceForm: React.FC<{ onAddSource: (url: string, config: KnowledgeBaseIndexConfig) => void }> = ({ onAddSource }) => {
    const [url, setUrl] = useState('');
    const [config, setConfig] = useState<KnowledgeBaseIndexConfig>({
        sourceCode: true, issues: true, pullRequests: false, discussions: false, wiki: false,
    });
    const [error, setError] = useState('');
    const [isGithubUrl, setIsGithubUrl] = useState(false);

    useEffect(() => {
        setIsGithubUrl(url.trim().startsWith('https://github.com/'));
    }, [url]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            new URL(url); // Validate URL format
            onAddSource(url, config);
            setUrl('');
        } catch (_) {
            setError('لطفاً یک آدرس URL معتبر وارد کنید.');
        }
    };
    
    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig(prev => ({...prev, [e.target.name]: e.target.checked }));
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-800/50 rounded-lg space-y-4">
            <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="آدرس ریپازیتوری گیت‌هاب یا وب‌سایت..."
                className="w-full p-2 bg-slate-900/70 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm text-slate-200"
                required
            />
             {error && <p className="text-xs text-red-400">{error}</p>}
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 text-sm transition-opacity ${isGithubUrl ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                 {Object.keys(config).map(key => (
                     <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name={key} checked={config[key as keyof KnowledgeBaseIndexConfig]} onChange={handleConfigChange} className="form-checkbox bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-600" disabled={!isGithubUrl} />
                        <span className="text-slate-300">{key}</span>
                     </label>
                 ))}
            </div>
            {!isGithubUrl && url.trim() && <p className="text-xs text-slate-400">گزینه‌های ایندکس برای وب‌سایت‌ها به صورت خودکار تنظیم می‌شوند.</p>}
            <button type="submit" className="w-full py-2 px-4 bg-cyan-600 text-white font-bold text-sm rounded-lg hover:bg-cyan-500 transition-colors">افزودن منبع</button>
        </form>
    );
};

const SourceTypeIcon: React.FC<{ type: SourceType }> = ({ type }) => {
    if (type === SourceType.GITHUB_REPOSITORY) {
        return <GithubIcon className="w-5 h-5 text-slate-400" />;
    }
    return <WebsiteIcon className="w-5 h-5 text-slate-400" />;
};


const SourceListItem: React.FC<{
    source: KnowledgeBaseSource;
    onRemove: (id: string) => void;
    onReindex: (id: string) => void;
    onSync: (id: string) => void;
}> = ({ source, onRemove, onReindex, onSync }) => {
    const isActionable = !['indexing', 'syncing', 'queued'].includes(source.status);
    const isSyncable = source.type === SourceType.GITHUB_REPOSITORY && isActionable && !!source.lastIndexed;

    return (
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 space-y-2">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                         <SourceTypeIcon type={source.type} />
                         <p className="font-bold text-slate-200 truncate">{source.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 capitalize ml-7">{source.status}</p>
                </div>
                <button onClick={() => onRemove(source.id)} className="p-1 text-slate-500 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
            </div>
            {source.status !== 'indexed' && source.status !== 'error' && (
                 <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${source.progress}%` }}></div>
                </div>
            )}
            {source.log.length > 0 && <p className="text-xs text-slate-500 italic">...{source.log[source.log.length - 1]}</p>}
            {source.error && <p className="text-xs text-red-400">{source.error}</p>}
            <div className="flex gap-2 pt-1">
                <button onClick={() => onReindex(source.id)} disabled={!isActionable} className="text-xs py-1 px-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50">ایندکس مجدد</button>
                <button onClick={() => onSync(source.id)} disabled={!isSyncable} className="text-xs py-1 px-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50">همگام‌سازی</button>
            </div>
        </div>
    )
};


const SettingsPanel: React.FC<{
  currentSettings: RahYabSettings;
  onSave: (settings: RahYabSettings) => void;
  onClose: () => void;
}> = ({ currentSettings, onSave, onClose }) => {
  const [settings, setSettings] = useState(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleSave = () => {
    onSave(settings);
  };
  
  const handleSourcesChange = useCallback((newSources: KnowledgeBaseSource[]) => {
      setSettings(prev => ({ ...prev, knowledgeBaseSources: newSources }));
  }, []);

  const { knowledgeBaseSources, addSource, removeSource, reindexSource, syncSource } = useKnowledgeBase(
      settings.knowledgeBaseSources || [],
      handleSourcesChange
  );
  
  const handleSettingChange = useCallback((key: keyof RahYabSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <div className="w-full max-w-2xl glass-card rounded-2xl glow-border mx-4">
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-slate-100">تنظیمات RAH-YAB</h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                
                 <SettingSection title="اطلاعات مدل">
                    <div className="p-4 bg-slate-800/50 rounded-lg flex items-center justify-between">
                        <span className="font-medium text-slate-300">مدل هوش مصنوعی فعال</span>
                        <span className="font-bold font-mono text-cyan-300 bg-cyan-900/50 px-3 py-1 rounded-full text-sm">{settings.model}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        مدل <code className="font-mono bg-slate-700/50 text-cyan-400 text-[90%] px-1.5 py-0.5 rounded-md">gemini-2.5-flash</code> به عنوان جدیدترین و بهینه‌ترین مدل برای پروتکل RAH-YAB انتخاب شده است. این مدل تعادل فوق‌العاده‌ای بین سرعت بالا و توانایی استدلال پیشرفته ارائه می‌دهد و برای تحلیل‌های استراتژیک بلادرنگ، ثابت و غیرقابل تغییر است.
                    </p>
                </SettingSection>

                <div>
                    <label htmlFor="systemInstruction" className="block text-lg font-semibold mb-3 text-slate-300">دستورالعمل سیستمی</label>
                    <textarea 
                        id="systemInstruction"
                        name="systemInstruction"
                        rows={8}
                        value={settings.systemInstruction}
                        onChange={(e) => handleSettingChange('systemInstruction', e.target.value)}
                        className="w-full p-3 bg-slate-900/70 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm text-slate-200 font-mono leading-relaxed"
                    />
                </div>
                
                <SettingSection title="پارامترهای مدل">
                   <ModelParameters settings={settings} onSettingChange={handleSettingChange} />
                </SettingSection>

                <SettingSection title="پایگاه دانش مبتنی بر کد (اختیاری)">
                    <div className="space-y-4">
                        <label htmlFor="knowledgeBaseEnabled" className="flex items-center cursor-pointer justify-between">
                            <span className="text-slate-300 font-medium">فعال‌سازی پایگاه دانش</span>
                            <div className="relative">
                                <input id="knowledgeBaseEnabled" type="checkbox" className="sr-only" checked={settings.knowledgeBaseEnabled} onChange={() => handleSettingChange('knowledgeBaseEnabled', !settings.knowledgeBaseEnabled)} />
                                <div className={`block w-14 h-8 rounded-full transition-colors ${settings.knowledgeBaseEnabled ? 'bg-cyan-600' : 'bg-slate-700'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.knowledgeBaseEnabled ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </label>

                        {settings.knowledgeBaseEnabled && (
                            <div className="space-y-4 pt-4 border-t border-slate-700/50">
                                <h4 className="font-semibold text-slate-300">افزودن منبع جدید</h4>
                                <AddSourceForm onAddSource={addSource} />

                                <h4 className="font-semibold text-slate-300 pt-2">منابع ایندکس شده</h4>
                                {knowledgeBaseSources.length > 0 ? (
                                    <div className="space-y-3">
                                        {knowledgeBaseSources.map(source => (
                                            <SourceListItem key={source.id} source={source} onRemove={removeSource} onReindex={reindexSource} onSync={syncSource} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">هیچ منبعی اضافه نشده است.</p>
                                )}
                            </div>
                        )}
                    </div>
                </SettingSection>

                <SettingSection title="تنظیمات پیش‌فرض">
                     <DefaultSettings settings={settings} onSettingChange={handleSettingChange} />
                </SettingSection>

            </div>

             <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end gap-4">
                <button onClick={onClose} className="py-2 px-6 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-all duration-300">انصراف</button>
                 <button onClick={handleSave} className="py-2 px-6 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/30">ذخیره تغییرات</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;