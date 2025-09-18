import React from 'react';
import { RahYabSettings, SearchLevel } from '../../types';
import { SEARCH_LEVELS } from '../../constants';

interface DefaultSettingsProps {
    settings: RahYabSettings;
    onSettingChange: (key: keyof RahYabSettings, value: any) => void;
}

const DefaultSettings: React.FC<DefaultSettingsProps> = ({ settings, onSettingChange }) => {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">سطح تحلیل پیش‌فرض</label>
                <div className="flex gap-2 rounded-lg bg-slate-800/50 p-1">
                    {SEARCH_LEVELS.map(l => (
                        <button 
                            key={l.id} 
                            onClick={() => onSettingChange('defaultSearchLevel', l.id)} 
                            className={`flex-1 py-2 px-3 text-sm font-bold rounded-md transition-colors duration-300 ${settings.defaultSearchLevel === l.id ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>
            <label htmlFor="liveSearchEnabled" className="flex items-center cursor-pointer justify-between">
                <span className="text-slate-300 font-medium">فعال‌سازی پیش‌فرض فید جستجوی زنده</span>
                <div className="relative">
                    <input 
                        id="liveSearchEnabled" 
                        type="checkbox" 
                        className="sr-only" 
                        checked={settings.liveSearchEnabled} 
                        onChange={() => onSettingChange('liveSearchEnabled', !settings.liveSearchEnabled)} 
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${settings.liveSearchEnabled ? 'bg-cyan-600' : 'bg-slate-700'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.liveSearchEnabled ? 'translate-x-6' : ''}`}></div>
                </div>
            </label>
        </div>
    );
};

export default DefaultSettings;
