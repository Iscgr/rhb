

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StrategicBriefing, ChatMessage, GraphNode, Source } from '../types';
import VisualGraph from './VisualGraph';
import { CopyIcon, CheckIcon, VerifiedIcon, ThumbsUpIcon, ThumbsDownIcon } from './common/Icons';


const useCopyToClipboard = (): [boolean, (text: string) => void] => {
    const [isCopied, setIsCopied] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const copy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = window.setTimeout(() => setIsCopied(false), 2000);
        });
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return [isCopied, copy];
};


const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
    const [isCopied, copy] = useCopyToClipboard();
    
    return (
        <div className="relative group my-4 text-left direction-ltr bg-slate-900/70 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center px-4 py-1.5 bg-slate-800/50 rounded-t-lg border-b border-slate-700">
                <span className="text-xs font-mono text-cyan-300">{language || 'code'}</span>
                <button
                    onClick={() => copy(code)}
                    aria-label={isCopied ? "کپی شد!" : "کپی کردن کد"}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                    {isCopied ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <CopyIcon className="w-5 h-5" />}
                </button>
            </div>
            <pre className="p-4 text-slate-200 text-sm overflow-x-auto font-mono">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    // FIX: The 'inline' property is not available on the props for the code component in this version of react-markdown.
    // The logic is updated to distinguish between inline and block code by checking for a language match in the className.
    code({ node, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        return match ? (
            <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
        ) : (
            <code className="bg-slate-700/80 text-cyan-300 font-mono text-[90%] px-1.5 py-0.5 rounded-md mx-0.5 direction-ltr inline-block" {...props}>
                {children}
            </code>
        );
    },
    p: ({ node, ...props }) => <p className="my-2 leading-relaxed" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-3 pl-4" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-3 pl-4" {...props} />,
    li: ({ node, ...props }) => <li className="my-1" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
    em: ({ node, ...props }) => <em className="italic" {...props} />,
    a: ({ node, ...props }) => <a className="text-cyan-400 hover:underline" {...props} />,
    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-4 mb-2" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-4 mb-2" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
    table: ({ node, ...props }) => <div className="overflow-x-auto"><table className="table-auto w-full my-4 border-collapse border border-slate-600" {...props} /></div>,
    thead: ({ node, ...props }) => <thead className="bg-slate-800" {...props} />,
    th: ({ node, ...props }) => <th className="border border-slate-600 px-4 py-2 text-slate-200" {...props} />,
    td: ({ node, ...props }) => <td className="border border-slate-600 px-4 py-2 text-slate-300" {...props} />,
};


const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xl p-4 rounded-2xl ${message.role === 'user' ? 'bg-cyan-800/70' : 'bg-slate-700/70'}`}>
            <div className="text-slate-200 whitespace-pre-wrap">
                 <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.text}
                </ReactMarkdown>
            </div>
        </div>
    </div>
);

const convertToMarkdown = (briefing: StrategicBriefing): string => {
    let md = `# گزارش استراتژیک: ${briefing.query}\n\n`;
    md += `## خلاصه اجرایی\n${briefing.executiveSummary}\n\n`;
    md += `## راه‌حل مهندسی شده: ${briefing.engineeredSolution?.title}\n`;
    briefing.engineeredSolution?.steps.forEach((step, i) => {
        md += `${i + 1}. ${step}\n`;
    });
    md += `\n`;
    md += `## تحلیل ریسک و تیم قرمز: ${briefing.redTeamAnalysis?.title}\n`;
    md += `### نقاط ضعف احتمالی\n`;
    briefing.redTeamAnalysis?.potentialFailures.forEach(failure => {
        md += `* ${failure}\n`;
    });
    md += `\n### استراتژی‌های کاهش ریسک\n`;
     briefing.redTeamAnalysis?.mitigationStrategies.forEach(strategy => {
        md += `* ${strategy}\n`;
    });
    md += `\n`;
    md += `## پرونده شواهد\n`;
    if (briefing.evidenceDossier?.sources && briefing.evidenceDossier.sources.length > 0) {
        briefing.evidenceDossier.sources.forEach(source => {
            md += `* **[${source.title}](${source.url})** (امتیاز ارتباط: ${source.relevanceScore}/10)${source.isVerified ? ' - [تایید شده]' : ''}\n`;
            if(source.summary) md += `  > ${source.summary}\n\n`;
        });
    } else {
        md += "هیچ منبع خارجی برای این تحلیل یافت نشد.\n\n";
    }
    return md;
};


const ResultsDisplay: React.FC<{
  briefing: StrategicBriefing;
  onReset: () => void;
  onSave: (briefing: StrategicBriefing) => void;
  isSaved: boolean;
  chatHistory: ChatMessage[];
  onSendFollowUp: (message: string) => void;
  isFollowUpLoading: boolean;
  onBriefingFeedback: (url: string, feedback: 'useful' | 'not_useful') => void;
}> = ({ briefing, onReset, onSave, isSaved, chatHistory, onSendFollowUp, isFollowUpLoading, onBriefingFeedback }) => {
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'solution' | 'evidence' | 'redteam'>('summary');

  const [isSummaryCopied, copySummary] = useCopyToClipboard();
  const [isSolutionCopied, copySolution] = useCopyToClipboard();
  const [isEvidenceCopied, copyEvidence] = useCopyToClipboard();
  const [isRedTeamCopied, copyRedTeam] = useCopyToClipboard();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  useEffect(() => {
    if (briefing.visualData && briefing.visualData.nodes.length > 0) {
        const mostCentralNode = briefing.visualData.nodes.reduce((max, node) => (node.centrality > max.centrality ? node : max), briefing.visualData.nodes[0]);
        setSelectedNode(mostCentralNode);
    } else {
        setSelectedNode(null);
    }
  }, [briefing.visualData]);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuery.trim() && !isFollowUpLoading) {
        onSendFollowUp(followUpQuery);
        setFollowUpQuery('');
    }
  };
  
  const handleExportMarkdown = () => {
    const markdownContent = convertToMarkdown(briefing);
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAH-YAB-Report-${briefing.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const TabButton: React.FC<{tabId: typeof activeTab, text: string}> = ({tabId, text}) => (
      <button onClick={() => setActiveTab(tabId)} className={`px-4 py-2 text-lg font-semibold rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-slate-800/50 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}`}>
          {text}
      </button>
  )
  
  const EvidenceItem: React.FC<{source: Source}> = ({source}) => (
    <li className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-start gap-3">
        <div className="flex-1">
             <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-300 hover:text-cyan-400 break-all transition-colors">
                {source.title || source.url}
                {source.isVerified && <VerifiedIcon />}
            </a>
            <p className="text-sm text-slate-400 mt-1">{source.summary}</p>
            <div className="text-xs text-cyan-300 mt-2 font-mono">امتیاز ارتباط: {source.relevanceScore}/10</div>
        </div>
        <div className="flex gap-2 items-center pt-1">
            <button onClick={() => onBriefingFeedback(source.url, 'useful')} title="Useful" className="p-1 rounded-full transition-colors">
                <ThumbsUpIcon className={`w-5 h-5 ${source.feedback === 'useful' ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'}`} />
            </button>
            <button onClick={() => onBriefingFeedback(source.url, 'not_useful')} title="Not Useful" className="p-1 rounded-full transition-colors">
                <ThumbsDownIcon className={`w-5 h-5 ${source.feedback === 'not_useful' ? 'text-red-400' : 'text-slate-500 hover:text-red-400'}`} />
            </button>
        </div>
   </li>
  );

  const TabHeader: React.FC<{title: string; isCopied: boolean; onCopy: () => void}> = ({title, isCopied, onCopy}) => (
      <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-cyan-400">{title}</h3>
          <button onClick={onCopy} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-700/50">
              {isCopied ? <><CheckIcon className="w-4 h-4 text-emerald-400"/> کپی شد</> : <><CopyIcon className="w-4 h-4"/> کپی</>}
          </button>
      </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-slate-100">تحلیل استراتژیک تکمیل شد</h1>
        <p className="text-cyan-400 mt-2 text-lg">موضوع: {briefing.query}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-2xl p-4 md:p-6 min-h-[50vh] flex flex-col">
          <h2 className="text-2xl font-bold text-slate-100 mb-4 pb-2 border-b border-slate-700">نقشه مفهومی</h2>
          {briefing.visualData && briefing.visualData.nodes.length > 0 ? (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex-1 w-full h-[40vh] bg-slate-900/50 rounded-lg overflow-hidden relative">
                <VisualGraph data={briefing.visualData} onNodeClick={setSelectedNode} selectedNodeId={selectedNode?.id} />
              </div>
              <aside className="w-full p-4 bg-slate-800/30 rounded-lg h-[20vh] overflow-y-auto">
                {selectedNode ? (
                  <div className="animate-fade-in-up">
                    <h3 className="text-xl font-bold text-cyan-400">{selectedNode.label}</h3>
                    <div className="flex items-center gap-4 my-2">
                        <p className="text-sm bg-cyan-900/50 text-cyan-300 inline-block px-2 py-0.5 rounded-full capitalize">{selectedNode.type}</p>
                        <p className="text-sm font-mono text-slate-300">اهمیت: <span className="font-bold text-cyan-400">{(selectedNode.centrality * 100).toFixed(0)}%</span></p>
                    </div>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{selectedNode.details}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">برای مشاهده جزئیات، یک مورد را از نقشه انتخاب کنید.</p>
                )}
              </aside>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400 text-lg">نقشه بصری برای این تحلیل تولید نشد.</p>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4 md:p-6 min-h-[50vh] flex flex-col">
            <div className="border-b border-slate-700 mb-4">
                <nav className="-mb-px flex gap-4">
                    <TabButton tabId="summary" text="خلاصه اجرایی" />
                    <TabButton tabId="solution" text="راهکار مهندسی شده" />
                    <TabButton tabId="evidence" text="پرونده شواهد" />
                    <TabButton tabId="redteam" text="تحلیل ریسک" />
                </nav>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
                {activeTab === 'summary' && (
                    <div className="animate-fade-in-up">
                        <TabHeader title="خلاصه اجرایی" isCopied={isSummaryCopied} onCopy={() => copySummary(briefing.executiveSummary)} />
                        <div className="text-lg text-slate-300">
                           <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{briefing.executiveSummary}</ReactMarkdown>
                        </div>
                    </div>
                )}
                {activeTab === 'solution' && (
                    <div className="animate-fade-in-up">
                        <TabHeader title={briefing.engineeredSolution?.title || "راه‌حل مهندسی شده"} isCopied={isSolutionCopied} onCopy={() => copySolution(briefing.engineeredSolution?.steps.map((s,i) => `${i+1}. ${s}`).join('\n') || '')} />
                        <ol className="space-y-4">
                            {briefing.engineeredSolution?.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-700 text-cyan-400 font-bold rounded-full">{i + 1}</span>
                                    <div className="text-slate-300 pt-1">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{step}</ReactMarkdown>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
                {activeTab === 'evidence' && (
                    <div className="animate-fade-in-up">
                        <TabHeader title={briefing.evidenceDossier?.title || "پرونده شواهد"} isCopied={isEvidenceCopied} onCopy={() => copyEvidence(briefing.evidenceDossier?.sources.map(s => `* [${s.title}](${s.url})\n  > ${s.summary}`).join('\n\n') || '')} />
                        <ul className="space-y-3">
                            {briefing.evidenceDossier?.sources?.length > 0 ? (
                                briefing.evidenceDossier.sources.map((source, i) => (
                                    <EvidenceItem key={source.url + i} source={source} />
                                ))
                            ) : (
                                <p className="text-slate-400">هیچ منبعی برای این تحلیل یافت نشد.</p>
                            )}
                        </ul>
                    </div>
                )}
                {activeTab === 'redteam' && (
                     <div className="animate-fade-in-up space-y-6">
                        <TabHeader title={briefing.redTeamAnalysis?.title || "تحلیل ریسک"} isCopied={isRedTeamCopied} onCopy={() => copyRedTeam(`### نقاط ضعف احتمالی\n${briefing.redTeamAnalysis?.potentialFailures.join('\n* ')}\n\n### استراتژی‌های کاهش ریسک\n* ${briefing.redTeamAnalysis?.mitigationStrategies.join('\n* ')}`)} />
                         <div>
                             <h4 className="font-semibold text-red-400 mb-2">نقاط ضعف و ریسک‌های احتمالی</h4>
                             <ul className="space-y-3">
                                {briefing.redTeamAnalysis?.potentialFailures.map((failure, i) => (
                                   <li key={i} className="text-slate-300">
                                       <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{failure}</ReactMarkdown>
                                   </li>
                                ))}
                            </ul>
                         </div>
                         <div>
                             <h4 className="font-semibold text-emerald-400 mb-2">استراتژی‌های پیشنهادی برای کاهش ریسک</h4>
                             <ul className="space-y-3">
                                {briefing.redTeamAnalysis?.mitigationStrategies.map((strategy, i) => (
                                   <li key={i} className="text-slate-300">
                                       <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{strategy}</ReactMarkdown>
                                   </li>
                                ))}
                            </ul>
                         </div>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      <div className="mt-8 glass-card rounded-2xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-4 text-center">ادامه تحلیل (مکالمه)</h2>
        <div className="h-[40vh] overflow-y-auto p-4 space-y-4 bg-slate-900/50 rounded-lg border border-slate-700">
            {chatHistory.map((msg, index) => (
                <ChatBubble key={index} message={msg} />
            ))}
            {isFollowUpLoading && (
                <div className="flex justify-start">
                    <div className="max-w-xl p-4 rounded-2xl bg-slate-700/70">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleFollowUpSubmit} className="mt-4 flex gap-4">
            <input
                type="text"
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                placeholder="سوال بعدی خود را بپرسید..."
                className="flex-1 p-3 bg-slate-800/70 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-lg text-slate-200"
                disabled={isFollowUpLoading}
            />
            <button type="submit" disabled={isFollowUpLoading || !followUpQuery.trim()} className="py-3 px-6 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 disabled:bg-slate-600 transition-all">
                ارسال
            </button>
        </form>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button onClick={onReset} className="w-full sm:w-auto py-3 px-8 bg-cyan-600 text-white font-bold text-lg rounded-lg hover:bg-cyan-500 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/30">
          عملیات جدید
        </button>
        <button onClick={() => onSave(briefing)} disabled={isSaved} className="w-full sm:w-auto py-3 px-8 bg-slate-700 text-white font-bold text-lg rounded-lg hover:bg-slate-600 disabled:bg-emerald-800 disabled:text-emerald-300 transition-all duration-300">
          {isSaved ? '✓ ذخیره شد' : 'ذخیره در آرشیو'}
        </button>
        <button onClick={handleExportMarkdown} className="w-full sm:w-auto py-3 px-8 bg-slate-700 text-white font-bold text-lg rounded-lg hover:bg-slate-600 transition-all duration-300">
            خروجی Markdown
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;