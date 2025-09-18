import React, { useEffect, useRef } from 'react';
import { OperationStatus, ProtocolPhase, SearchVector, Source } from '../types';
import { PHASE_DATA, PHASE_ORDER } from '../constants';
import { CheckIcon, LoaderIcon, PendingIcon, SearchVectorIcon, GlobeIcon } from './common/Icons';

const PhaseTimelineItem: React.FC<{ phase: ProtocolPhase; currentPhase: ProtocolPhase; isComplete: boolean }> = ({ phase, currentPhase, isComplete }) => {
    const isActive = phase === currentPhase;
    const { description, Icon } = PHASE_DATA[phase] || {};
    
    if (!description || !Icon) return null;

    return (
        <li className="flex items-start gap-4 transition-all duration-300">
             <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shrink-0 border-2
                ${isComplete ? 'bg-green-500/20 border-green-500 text-green-400' : ''}
                ${isActive ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 ring-4 ring-cyan-500/30 animate-pulse' : ''}
                ${!isComplete && !isActive ? 'bg-slate-700/50 border-slate-600 text-slate-500' : ''}
                `}>
                <Icon className="w-7 h-7" />
            </div>
            <span className={`font-medium transition-colors duration-500 text-lg pt-2 ${isActive || isComplete ? 'text-slate-200' : 'text-slate-500'}`}>
                {description}
            </span>
        </li>
    )
}

const IntelligenceCard: React.FC<{title: string, icon: React.ReactNode, children: React.ReactNode}> = ({title, icon, children}) => (
    <div className="bg-slate-900/40 rounded-lg border border-slate-700/50 overflow-hidden h-1/2 flex flex-col">
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 border-b border-slate-700/50">
            {icon}
            <h3 className="text-lg font-bold text-slate-200">{title}</h3>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
            {children}
        </div>
    </div>
);

const SearchVectorPill: React.FC<{ vector: SearchVector, index: number }> = ({ vector, index }) => {
    const baseClasses = "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-300";
    const animationDelay = `${index * 100}ms`;

    let statusClasses = '';
    let icon = <PendingIcon className="w-4 h-4" />;
    if (vector.status === 'complete') {
        statusClasses = 'bg-emerald-500/20 text-emerald-300';
        icon = <CheckIcon className="w-4 h-4" />;
    } else if (vector.status === 'active') {
        statusClasses = 'bg-cyan-500/20 text-cyan-300 animate-pulse';
        icon = <LoaderIcon className="w-4 h-4" />;
    } else {
        statusClasses = 'bg-slate-700/50 text-slate-400';
    }
    
    return <div style={{animationDelay}} className={`${baseClasses} ${statusClasses} animate-fade-in-up`}>{icon} {vector.query}</div>;
};

const LiveSourceItem: React.FC<{ source: Source, index: number }> = ({ source, index }) => (
    <div style={{animationDelay: `${index * 100}ms`}} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 animate-fade-in-up">
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-400 hover:underline break-all text-sm">
            {source.title}
        </a>
        <p className="text-xs text-slate-400 mt-1">{source.summary}</p>
    </div>
);

const Terminal: React.FC<{ log: string[] }> = ({ log }) => {
    const endOfLogRef = useRef<HTMLDivElement>(null);
    const lastLog = log[log.length-1] || '';

    useEffect(() => {
        endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log.length]);

    return (
        <div className="w-full h-full bg-black/50 p-4 rounded-lg border border-slate-700 font-mono text-sm overflow-y-auto custom-scrollbar">
            {log.map((line, index) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={index} className="text-cyan-400 font-bold text-lg mt-4 mb-2 animate-fade-in-up">{line.replace(/\*\*/g, '')}</p>;
                }
                return (
                    <div key={index} className="flex animate-fade-in-up">
                        <span className="text-cyan-400 mr-3 select-none">$</span>
                        <p className="text-slate-300 break-words whitespace-pre-wrap flex-1">{line}</p>
                    </div>
                );
            })}
             <div className="flex">
                <span className="text-cyan-400 mr-3 select-none">$</span>
                <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse"></span>
             </div>
            <div ref={endOfLogRef} />
        </div>
    );
};


const OperationStatusDisplay: React.FC<{ status: OperationStatus; onFeedback: (url: string, feedback: 'useful' | 'not_useful') => void; }> = ({ status }) => {
  const currentPhaseIndex = PHASE_ORDER.indexOf(status.phase);
  const CurrentPhaseIcon = PHASE_DATA[status.phase]?.Icon || PHASE_DATA.IDLE.Icon;

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-4 animate-fade-in-up">
        <div className="glass-card p-4 md:p-6 rounded-2xl">
            {/* Header */}
            <header className="text-center mb-6">
                <div className="flex items-center justify-center gap-4">
                    <CurrentPhaseIcon className="w-12 h-12 text-cyan-400" />
                    <div>
                        <h2 className="text-3xl font-bold text-cyan-400">پروتکل RAH-YAB در حال اجرا...</h2>
                        <p className="text-slate-300 mt-1 text-lg">{status.message}</p>
                    </div>
                </div>
                 <div className="w-full bg-slate-700/50 rounded-full h-2.5 mt-4 max-w-4xl mx-auto overflow-hidden">
                    <div className="bg-cyan-600 h-2.5 rounded-full transition-all duration-500" style={{width: `${status.progress}%`}}></div>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[70vh]">
                
                {/* Left Panel: Protocol Timeline */}
                <aside className="w-full lg:col-span-3 p-4 bg-slate-900/30 rounded-lg">
                    <h3 className="text-xl font-bold text-slate-200 mb-4 pb-2 border-b border-slate-700">مراحل پروتکل</h3>
                    <ul className="space-y-6">
                        {PHASE_ORDER.map((phase, index) => (
                            <PhaseTimelineItem 
                                key={phase}
                                phase={phase}
                                currentPhase={status.phase}
                                isComplete={currentPhaseIndex > index || status.phase === ProtocolPhase.COMPLETE}
                            />
                        ))}
                    </ul>
                </aside>

                {/* Center Panel: Live Log */}
                <main className="w-full lg:col-span-6">
                    <Terminal log={status.operationsLog} />
                </main>

                 {/* Right Panel: Intelligence Feed */}
                <aside className="w-full lg:col-span-3 flex flex-col gap-6">
                    <IntelligenceCard title="بردارهای جستجو" icon={<SearchVectorIcon className="w-6 h-6 text-cyan-400" />}>
                        {status.searchVectors && status.searchVectors.length > 0 ? (
                           status.searchVectors.map((vector, i) => <SearchVectorPill key={i} vector={vector} index={i} />)
                        ) : <p className="text-slate-500 text-center text-sm pt-4">در انتظار تولید بردارهای جستجو...</p>}
                    </IntelligenceCard>
                     <IntelligenceCard title="منابع کشف‌شده" icon={<GlobeIcon className="w-6 h-6 text-cyan-400" />}>
                        {status.liveSearchResults && status.liveSearchResults.length > 0 ? (
                            status.liveSearchResults.map((source, i) => <LiveSourceItem key={i} source={source} index={i} />)
                        ) : <p className="text-slate-500 text-center text-sm pt-4">در انتظار کشف منابع اطلاعاتی...</p>}
                    </IntelligenceCard>
                </aside>
            </div>
        </div>
    </div>
  );
};

export default OperationStatusDisplay;