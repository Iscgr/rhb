import React from 'react';
import { RahYabSettings } from '../../types';

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="relative flex items-center group">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-500 cursor-pointer">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <div className="absolute bottom-full mb-2 w-64 p-2 bg-slate-900 text-slate-300 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 text-center right-1/2 translate-x-1/2">
            {text}
        </div>
    </div>
);


interface ModelParametersProps {
    settings: RahYabSettings;
    onSettingChange: (key: keyof RahYabSettings, value: any) => void;
}

const ModelParameters: React.FC<ModelParametersProps> = ({ settings, onSettingChange }) => {
    
    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSettingChange(e.target.name as keyof RahYabSettings, parseFloat(e.target.value));
    };
    
    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="temperature" className="flex justify-between items-center text-sm font-medium text-slate-300 mb-2">
                    <span className="flex items-center gap-2">
                        دما (Temperature)
                        <InfoTooltip text="مقادیر بالاتر (نزدیک به ۱.۰) خلاقیت و تنوع پاسخ‌ها را افزایش می‌دهد، در حالی که مقادیر پایین‌تر پاسخ‌ها را متمرکزتر و قابل پیش‌بینی‌تر می‌کند." />
                    </span>
                    <span className="font-mono text-cyan-400">{settings.temperature?.toFixed(2)}</span>
                </label>
                <input 
                    type="range" 
                    id="temperature" 
                    name="temperature" 
                    min={0} max={1} 
                    step={0.01} 
                    value={settings.temperature} 
                    onChange={handleRangeChange} 
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer custom-range" 
                />
            </div>
            <div>
                <label htmlFor="topP" className="flex justify-between items-center text-sm font-medium text-slate-300 mb-2">
                     <span className="flex items-center gap-2">
                        Top-P
                        <InfoTooltip text="این پارامتر به مدل اجازه می‌دهد تا از بین محتمل‌ترین کلمات بعدی انتخاب کند. مقدار بالا دامنه انتخاب را گسترده‌تر می‌کند. معمولاً توصیه می‌شود فقط یکی از پارامترهای دما یا Top-P تغییر داده شود." />
                    </span>
                    <span className="font-mono text-cyan-400">{settings.topP?.toFixed(2)}</span>
                </label>
                <input 
                    type="range" 
                    id="topP" 
                    name="topP" 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    value={settings.topP} 
                    onChange={handleRangeChange} 
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer custom-range" 
                />
            </div>
        </div>
    );
};

export default ModelParameters;
