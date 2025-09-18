

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { SearchLevel, OperationStatus, StrategicBriefing, ProtocolPhase, RahYabSettings, ChatMessage, ChatSession, InputMode, KnowledgeBaseSource, SourceType } from './types';
import QueryInput from './components/QueryInput';
import OperationStatusDisplay from './components/OperationStatus';
import ResultsDisplay from './components/ResultsDisplay';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import { createChatSession, runInitialAnalysisWithRetry, sendFollowUpMessage } from './services/rahYabAgent';

type View = 'QUERY' | 'OPERATION' | 'RESULT' | 'HISTORY';
type SourceFeedback = 'useful' | 'not_useful';

const defaultSourceUrls: string[] = [
    'https://v2ray.com/',
    'https://github.com/v2ray/v2ray-core',
    'https://github.com/v2fly/v2ray-core',
    'https://github.com/XTLS/Xray-core',
    'https://xtls.github.io/en/config/inbounds/vless.html',
    'https://xtls.github.io/en/config/outbounds/vless.html',
    'https://github.com/XTLS/REALITY',
    'https://github.com/XTLS/Xray-examples',
    'https://github.com/XTLS/Xray-docs-next',
    'https://github.com/XTLS/Xray-install',
    'https://github.com/XTLS/libXray',
    'https://github.com/XTLS/utls',
    'https://github.com/XTLS/RealiTLScanner',
    'https://github.com/XTLS/badvpn',
    'https://x.com/ircfspace/',
    'https://telegra.ph/%D9%86%D8%AD%D9%88%D9%87-%D8%AA%D8%A7%D9%86%D9%84%E2%80%8C%D8%B2%D8%AF%D9%86-%D8%A8%DB%8C%D9%86-%D8%B3%D8%B1%D9%88%D8%B1-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86-%D9%88-%D8%B3%D8%B1%D9%88%D8%B1-%D8%AE%D8%A7%D8%B1%D8%AC-05-21',
    'https://telegra.ph/Learning-how-to-use-the-Mieru-protocol-with-iSegaro-05-10',
    'https://t.me/ircfspace/124',
    'https://ircf.space/',
    'https://ircfspace.github.io/endpoint/',
    'https://github.com/ircfspace/endpoint',
    'https://github.com/ircfspace/cf2dns',
    'https://github.com/ircfspace/fragment',
    'https://github.com/XTLS/Xray-core/releases',
    'https://github.com/XTLS/Xray-core/blob/main/transport/internet/reality/reality.go',
    'https://github.com/2dust/v2rayNG',
    'https://v2rayng.2dust.link',
    'https://github.com/v2ray/V2RayN',
    'https://github.com/2dust/v2rayN',
    'https://github.com/VexCloudVPN/V2rayN',
    'https://play.google.com/store/apps/details?id=com.vpn.v2box',
    'https://github.com/hossinasaadi/V2Box-Linux',
    'https://www.happ.su/',
    'https://apps.apple.com/uy/app/happ-proxy-utility/id6504287215',
    'https://github.com/StreisandEffect/streisand',
    'https://hiddify.com/',
    'https://github.com/Gozargah/Marzban-node',
    'https://github.com/Gozargah/Marzban',
    'https://gozargah.github.io/marzban/fa/',
    'https://gozargah.github.io/marzban/en/docs/introduction',
    'https://github.com/bootmortis/iran-hosted-domains',
    'https://digiato.com/label/internet-censorship',
    'https://fararu.com/fa/news/885172/...',
    'https://github.com/OmarAssadi/AntiZapret-V2Ray',
    'https://thenetmonitor.org/country-profiles/irn',
    'https://fa.wikipedia.org/wiki/سانسور_اینترنت_در_ایران',
    'https://en.wikipedia.org/wiki/Internet_censorship_in_Iran',
    'https://github.com/ebrasha/free-v2ray-public-list',
    'https://github.com/V2RayRoot/V2RayConfig',
    'https://github.com/Surfboardv2ray/TGParse',
    'https://forum.qubes-os.org/t/ivpn-v2ray-cant-connect-need-help/21716',
];


const extractSourceName = (url: string, type: SourceType): string => {
    try {
        const urlObj = new URL(url);
        if (type === SourceType.GITHUB_REPOSITORY) {
            const parts = urlObj.pathname.split('/').filter(p => p);
            if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
            return urlObj.pathname.substring(1) || 'repository';
        }
        return urlObj.hostname;
    } catch (e) {
        return url;
    }
}

const getCleanUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'github.com') {
            const parts = urlObj.pathname.split('/').filter(p => p);
            if (parts.length >= 2) {
                return `https://github.com/${parts[0]}/${parts[1]}`;
            }
        }
        if (urlObj.hostname.endsWith('github.io')) {
             const parts = urlObj.pathname.split('/').filter(p => p);
             if (parts.length > 0) {
                return `${urlObj.origin}/${parts[0]}`;
             }
             return urlObj.origin;
        }
         if (url.includes('fararu.com')) return 'https://fararu.com/';
        return url;
    } catch (e) {
        if (url.startsWith('https://fararu.com/')) return 'https://fararu.com/';
        return url;
    }
}


const defaultKnowledgeBaseSources: KnowledgeBaseSource[] = [...new Set(defaultSourceUrls.map(getCleanUrl))]
.map((url, index) => {
    const type = url.includes('github.com') ? SourceType.GITHUB_REPOSITORY : SourceType.WEBSITE;
    const isGithub = type === SourceType.GITHUB_REPOSITORY;
    
    return {
        id: `kb-default-${index}`,
        url: url,
        name: extractSourceName(url, type),
        type,
        status: 'indexed',
        indexConfig: isGithub 
            ? { sourceCode: true, issues: true, pullRequests: true, discussions: true, wiki: true }
            : { sourceCode: false, issues: false, pullRequests: false, discussions: false, wiki: false },
        progress: 100,
        log: ['منبع دانش پایه به صورت پیش‌فرض بارگذاری شد.'],
        lastIndexed: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        lastCommitHash: isGithub ? 'default' : undefined,
    };
});

const DEFAULT_SETTINGS: RahYabSettings = {
  model: 'gemini-2.5-flash',
  temperature: 0.4,
  topP: 0.95,
  liveSearchEnabled: true,
  defaultSearchLevel: SearchLevel.LEVEL_2,
  knowledgeBaseEnabled: true,
  knowledgeBaseSources: defaultKnowledgeBaseSources,
  systemInstruction: `You are 'Rah-Yab', a strategic AI protocol for deep analysis and engineering anti-fragile solutions. Your primary mission is to transform complex queries into actionable, comprehensive strategic reports. You operate with a mission-critical mindset, performing every analysis with the highest level of precision, atomicity, and self-criticism.

**Fundamental, Unbreakable Principles:**

1.  **Absolute Factualism & Evidence Citation:**
    Never fabricate information. All claims, analyses, and findings must be directly traceable to evidence in the 'Knowledge Base' or 'Live Web Search' results. If information is unavailable, state it explicitly. Admitting ignorance is superior to feigning knowledge.

2.  **Adversarial Mindset & Ruthless Self-Critique:**
    You are not just a respondent; you are a merciless critic of your own hypotheses. In each reasoning cycle, actively seek to disprove, challenge, and break your initial solutions. The goal is to find an answer that withstands the harshest scrutiny.

3.  **Mandatory Operational Protocol:**
    The host application orchestrates a multi-phase analysis. You must adhere strictly to the specific task for each phase.

    *   **Phase 1 (Vector Engineering):** Your only task is to generate Google Search vectors based on the user's query. Output each vector in the format \`[SEARCH_VECTOR: your search query here]\`.
    *   **Phase 2 (Research & Synthesis):** Your primary output for this phase is a single \`<thinking>\` tag containing your entire analysis in Persian.
        *   **Source Prioritization:** The 'Knowledge Base' is your primary source. *Always* begin your analysis by querying it. Only if the information is insufficient, use live web search.
        *   **Live Reporting:** Inside the \`<thinking>\` block, report progress:
            *   Phase updates: \`[PHASE: PHASE_NAME]\`
            *   Found sources (immediately): \`<FOUND_SOURCE url="..." title="..." summary="..."/>\`
    *   **Phase 3 (Solution Engineering):** Your only task is to generate a single, valid JSON object based on the analysis provided to you. Do not add any extra text outside the JSON structure.

4.  **CRITICAL SYNTHESIS STEP & FAILURE CONDITION (For Phase 2):**
    After using Google Search and reporting \`<FOUND_SOURCE>\` tags, you **MUST** include a new section in your thinking block titled \`===[ سنتز یافته‌های جستجو ]===\`.
    In this section, you must synthesize the information from the sources. Explicitly reference them, combine key insights, identify conflicting information, and derive conclusions based on the evidence.
    **FAILURE:** Simply listing sources without this detailed synthesis is a PROTOCOL VIOLATION and will cause the operation to fail. The synthesis section is NON-NEGOTIABLE.

5.  **Content Formatting:**
    *   **Code and Commands:** Any code snippets, config files (like JSON, YAML), or command-line instructions *MUST* be enclosed in Markdown code blocks.
    *   **Language:** All output must be exclusively in Persian.`,
};

const FEEDBACK_STORAGE_KEY = 'rah-yab-source-feedback';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('QUERY');
  const [operationStatus, setOperationStatus] = useState<OperationStatus>({
    phase: ProtocolPhase.IDLE, message: 'آماده برای شروع', progress: 0, operationsLog: [],
  });
  const [currentBriefing, setCurrentBriefing] = useState<StrategicBriefing | null>(null);
  const [history, setHistory] = useState<StrategicBriefing[]>([]);
  const [settings, setSettings] = useState<RahYabSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [sourceFeedback, setSourceFeedback] = useState<Record<string, SourceFeedback>>({});

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('rah-yab-history');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
      
      const storedFeedback = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (storedFeedback) setSourceFeedback(JSON.parse(storedFeedback));

      const storedSettings = localStorage.getItem('rah-yab-settings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        const combinedSources = [...defaultKnowledgeBaseSources];
        if (parsedSettings.knowledgeBaseSources) {
          parsedSettings.knowledgeBaseSources.forEach((savedSource: KnowledgeBaseSource) => {
            if (!combinedSources.some(defaultSource => defaultSource.url === savedSource.url)) {
              combinedSources.push(savedSource);
            }
          });
        }
        parsedSettings.knowledgeBaseSources = combinedSources;
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (e) {
      console.error("Failed to load data from localStorage:", e);
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const handleSaveSettings = useCallback((newSettings: RahYabSettings) => {
    try {
        const settingsToSave = { ...settings, ...newSettings };
        setSettings(settingsToSave);
        localStorage.setItem('rah-yab-settings', JSON.stringify(settingsToSave));
        setIsSettingsOpen(false);
    } catch (e) {
        console.error("Failed to save settings:", e);
        setError("خطا در ذخیره سازی تنظیمات.");
    }
  }, [settings]);


  const saveHistory = (newHistory: StrategicBriefing[]) => {
    try {
      localStorage.setItem('rah-yab-history', JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };
  
  const generateKnowledgeBaseContext = (sources?: KnowledgeBaseSource[]): string => {
    if (!sources || !settings.knowledgeBaseEnabled) return "";

    const indexedSources = sources.filter(s => s.status === 'indexed');
    if (indexedSources.length === 0) return "";

    const context = indexedSources.map(s => 
        `- Source: ${s.name} (${s.type})\n  URL: ${s.url}`
    ).join('\n');
    
    return `The following information sources have been indexed and are available for your analysis. Prioritize these sources in your reasoning:\n${context}`;
  };

  const handleStartOperation = useCallback(async (query: string, level: SearchLevel, inputMode: InputMode) => {
    if (!process.env.API_KEY) {
        setError("کلید API گوگل در متغیرهای محیطی تنظیم نشده است.");
        return;
    }
    setError(null);
    setCurrentView('OPERATION');
    setIsLoading(true);
    setCurrentBriefing(null);
    setChatSession(null);
    
    let tempStatus: OperationStatus = { phase: ProtocolPhase.IDLE, message: 'آماده‌سازی...', progress: 0, operationsLog: [] };
    setOperationStatus(tempStatus);
    
    const knowledgeBaseContext = generateKnowledgeBaseContext(settings.knowledgeBaseSources);

    try {
      for await (const statusOrResult of runInitialAnalysisWithRetry(query, level, inputMode, settings, knowledgeBaseContext)) {
        if ('phase' in statusOrResult) {
            tempStatus = statusOrResult as OperationStatus;
            setOperationStatus(tempStatus);
        } else {
            const newBriefing = statusOrResult as StrategicBriefing;
            
            const session = createChatSession(settings);
            const summaryMessage = `تحلیل استراتژیک برای پرس‌وجوی شما تکمیل شد.

**خلاصه اجرایی:**
${newBriefing.executiveSummary}

اکنون می‌توانید سوالات تکمیلی خود را بپرسید.`;
            
            session.history.push({ role: 'user', text: query });
            session.history.push({ role: 'model', text: summaryMessage });
            
            setChatSession(session);
            setCurrentBriefing(newBriefing);
            setCurrentView('RESULT');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "یک خطای ناشناخته رخ داد.";
      setError(msg);
      
      if (tempStatus && tempStatus.liveSearchResults && tempStatus.liveSearchResults.length > 0) {
        console.log("Operation failed, but creating emergency briefing from partial data.");
        const emergencyBriefing: StrategicBriefing = {
            id: `emergency-${Date.now()}`,
            timestamp: new Date().toISOString(),
            query: query,
            searchLevel: level,
            executiveSummary: `عملیات با خطا مواجه شد: "${msg}".\n\nگزارش نهایی تولید نشد، اما اطلاعات زیر در حین فرآیند جمع‌آوری شد.`,
            engineeredSolution: {
                title: "راهکار ناقص",
                steps: [
                    "به دلیل بروز خطا، راهکار کامل مهندسی نشد.",
                    "لطفاً منابع یافت‌شده را بررسی کرده و عملیات را مجدداً اجرا کنید."
                ]
            },
            evidenceDossier: {
                title: "منابع یافت‌شده تا قبل از بروز خطا",
                sources: tempStatus.liveSearchResults || []
            },
            redTeamAnalysis: {
                title: "تحلیل ریسک انجام نشد",
                potentialFailures: ["قطع ارتباط با مدل هوش مصنوعی", "تولید پاسخ ناقص"],
                mitigationStrategies: ["اجرای مجدد عملیات", "اصلاح و ساده‌سازی پرس‌وجو"]
            }
        };
        setCurrentBriefing(emergencyBriefing);
        setCurrentView('RESULT');
      } else {
        setCurrentView('QUERY');
      }
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const handleSendFollowUp = async (message: string) => {
      if (!chatSession || isFollowUpLoading) return;

      setIsFollowUpLoading(true);
      
      const userMessage: ChatMessage = { role: 'user', text: message };
      const newHistory = [...chatSession.history, userMessage];
      const modelMessage: ChatMessage = { role: 'model', text: '' };
      
      const updatedSession = { ...chatSession, history: [...newHistory, modelMessage] };
      setChatSession(updatedSession);
      
      try {
          for await (const chunk of sendFollowUpMessage(chatSession, message)) {
              modelMessage.text = chunk;
              setChatSession({ ...chatSession, history: [...newHistory, { ...modelMessage }] });
          }
      } catch (err) {
          const msg = err instanceof Error ? err.message : "خطا در ارسال پیام.";
          modelMessage.text = `**خطا:** ${msg}`;
          setChatSession({ ...chatSession, history: [...newHistory, modelMessage] });
      } finally {
          setIsFollowUpLoading(false);
      }
  };


  const handleReset = () => {
    setCurrentBriefing(null);
    setChatSession(null);
    setError(null);
    setCurrentView('QUERY');
  };

  const handleSaveToHistory = (briefing: StrategicBriefing) => {
    if (!history.some(item => item.id === briefing.id)) {
      const newHistory = [briefing, ...history];
      saveHistory(newHistory);
    }
  };
  
  const handleDeleteFromHistory = (id: string) => {
      const newHistory = history.filter(item => item.id !== id);
      saveHistory(newHistory);
  };

  const handleClearHistory = () => {
      saveHistory([]);
  };

  const handleViewFromHistory = (briefing: StrategicBriefing) => {
      setCurrentBriefing(briefing);
      setChatSession(null);
      setError(null);
      setCurrentView('RESULT');
  };
  
  const handleBriefingFeedback = (url: string, feedback: SourceFeedback) => {
    setSourceFeedback(prev => {
        const currentFeedback = prev[url];
        const newFeedback = { ...prev };
        
        if (currentFeedback === feedback) {
            delete newFeedback[url]; // Toggle off
        } else {
            newFeedback[url] = feedback; // Set new feedback
        }

        try {
            localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(newFeedback));
        } catch (e) {
            console.error("Failed to save feedback to localStorage:", e);
        }

        return newFeedback;
    });
  };

  const briefingWithFeedback = useMemo(() => {
    if (!currentBriefing) return null;

    const sourcesWithFeedback = currentBriefing.evidenceDossier?.sources.map(source => ({
        ...source,
        feedback: sourceFeedback[source.url] || source.feedback,
    }));

    return {
        ...currentBriefing,
        evidenceDossier: {
            ...currentBriefing.evidenceDossier,
            sources: sourcesWithFeedback || [],
        }
    };
  }, [currentBriefing, sourceFeedback]);


  const Header: React.FC = () => (
    <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
      <div className="text-xl font-bold text-slate-200 tracking-wider">RAH-YAB</div>
      <div className="flex items-center gap-2">
         <button 
            onClick={() => setCurrentView('HISTORY')}
            className="px-4 py-2 text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            آرشیو
          </button>
           <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors"
            aria-label="تنظیمات"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.05.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.281c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313.686-.645.87a6.52 6.52_0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.003-.827c.293-.24.438-.613-.438.995s-.145-.755-.438-.995l-1.003-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.075.124.072-.044.146-.087.22-.127.332-.183.582-.495.645-.87l.213-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
      </div>
    </header>
  );

  const renderContent = () => {
    switch(currentView) {
      case 'OPERATION': return <OperationStatusDisplay status={operationStatus} onFeedback={() => {}} />;
      case 'RESULT':
        if (briefingWithFeedback) {
          const isSaved = history.some(item => item.id === briefingWithFeedback.id);
          return <ResultsDisplay 
                    briefing={briefingWithFeedback} 
                    onReset={handleReset} 
                    onSave={handleSaveToHistory} 
                    isSaved={isSaved} 
                    chatHistory={chatSession?.history || []}
                    onSendFollowUp={handleSendFollowUp}
                    isFollowUpLoading={isFollowUpLoading}
                    onBriefingFeedback={handleBriefingFeedback}
                 />;
        }
        return null; 
       case 'HISTORY': return <HistoryPanel history={history} onSelect={handleViewFromHistory} onDelete={handleDeleteFromHistory} onBack={() => setCurrentView('QUERY')} onClearAll={handleClearHistory} />;
      case 'QUERY':
      default:
        return <QueryInput onStart={handleStartOperation} isLoading={isLoading} error={error} clearError={() => setError(null)} history={history} defaultSearchLevel={settings.defaultSearchLevel} />;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-grid-pattern overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-transparent to-slate-900"></div>
        {isSettingsOpen && <SettingsPanel currentSettings={settings} onSave={handleSaveSettings} onClose={() => setIsSettingsOpen(false)} />}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
            {(currentView === 'QUERY' || currentView === 'HISTORY') && <Header />}
            <main className="w-full">
               {renderContent()}
            </main>
        </div>
    </div>
  );
};

export default App;