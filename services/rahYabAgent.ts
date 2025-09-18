import { GoogleGenAI, GenerateContentResponse, GenerateContentConfig } from "@google/genai";
import { SearchLevel, ProtocolPhase, OperationStatus, StrategicBriefing, RahYabSettings, ChatSession, InputMode, SearchVector, Source } from '../types';
import { PHASE_DATA, PHASE_ORDER } from '../constants';

const getReasoningCycles = (level: SearchLevel): number => {
    switch (level) {
        case SearchLevel.LEVEL_1: return 1;
        case SearchLevel.LEVEL_2: return 2;
        case SearchLevel.LEVEL_3: return 4;
        default: return 2;
    }
};

const getTaskPrompt = (
    query: string,
    level: SearchLevel,
    inputMode: InputMode,
    settings: RahYabSettings,
    knowledgeBaseContext: string,
): string => {
    const { liveSearchEnabled, knowledgeBaseEnabled } = settings;
    const cycles = getReasoningCycles(level);

    const coreTask = inputMode === 'JSON'
        ? `یک تحلیل جامع بر روی پیکربندی JSON زیر انجام بده و یک گزارش استراتژیک کامل تولید کن. JSON برای تحلیل:\n\`\`\`json\n${query}\n\`\`\``
        : `یک گزارش استراتژیک جامع برای پرس‌وجوی زیر تولید کن: "${query}"`;
    
    let knowledgeBaseInstruction = "پایگاه دانش غیرفعال است. تنها بر جمع‌آوری اطلاعات خارجی تکیه کن.";
    if (knowledgeBaseEnabled && knowledgeBaseContext) {
        knowledgeBaseInstruction = `ابتدا، از اطلاعات موجود در پایگاه دانش استفاده کن. متن پایگاه دانش:\n${knowledgeBaseContext}`;
    }

    const liveSearchInstruction = liveSearchEnabled
        ? "در فاز PARALLELIZED_DATA_MINING، از ابزار Google Search برای جمع‌آوری اطلاعات به‌روز استفاده کن."
        : "فرآیند کاوش داده را شبیه‌سازی کن و یافته‌های مورد انتظار را از دانش داخلی خود گزارش بده.";

    return `
وظیفه اصلی: ${coreTask}

پارامترهای عملیات:
- سطح تحلیل: ${level} (${cycles} چرخه استدلال)
- پایگاه دانش: ${knowledgeBaseInstruction}
- جستجوی زنده: ${liveSearchInstruction}

پروتکل را آغاز کن.
`;
};


export const createChatSession = (settings: RahYabSettings): ChatSession => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `${settings.systemInstruction || 'You are RAH-YAB, an AI Cyber Intelligence strategist.'} You will always respond in Persian.`;
    
    const config: GenerateContentConfig = {
        temperature: settings.temperature,
        topP: settings.topP,
        systemInstruction: systemInstruction,
    };

    const chat = ai.chats.create({
        model: settings.model,
        config: config,
    });
    return { chat, history: [] };
};


async function* runInitialAnalysis(
    query: string,
    level: SearchLevel,
    inputMode: InputMode,
    settings: RahYabSettings,
    knowledgeBaseContext: string,
): AsyncGenerator<OperationStatus | StrategicBriefing, void, undefined> {

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const taskPrompt = getTaskPrompt(query, level, inputMode, settings, knowledgeBaseContext);
        
        const config: GenerateContentConfig = {
            temperature: settings.temperature,
            topP: settings.topP,
            systemInstruction: settings.systemInstruction,
        };

        if (settings.liveSearchEnabled) {
            config.tools = [{ googleSearch: {} }];
        }

        const initialStatus: OperationStatus = {
            phase: ProtocolPhase.IDLE,
            message: 'مقداردهی اولیه عامل هوشمند...',
            progress: 2,
            operationsLog: ['عامل هوشمند مقداردهی اولیه شد. در انتظار شروع پروتکل...'],
            searchVectors: [],
            liveSearchResults: [],
        };
        yield initialStatus;

        const stream = await ai.models.generateContentStream({
            model: settings.model,
            contents: taskPrompt,
            config,
        });

        let buffer = '';
        let thinkingContent = '';
        let jsonBuffer = '';
        let inThinkingBlock = true;
        let lastProcessedThinkingIndex = 0;
        let finalReport: StrategicBriefing | null = null;
        
        let currentStatus = { ...initialStatus };
        
        const phaseRegex = /\[PHASE:\s*([A-Z_]+)\]/g;
        const sourceRegex = /<FOUND_SOURCE\s+url="([^"]+)"\s+title="([^"]+)"\s+summary="([^"]+)"\s*\/>/g;
        const vectorRegex = /\[SEARCH_VECTOR:\s*(.+)\]/g;
        
        const foundSourceUrls = new Set<string>();
        const foundVectors = new Set<string>();

        for await (const chunk of stream) {
            if (chunk.promptFeedback?.blockReason) {
                const reason = chunk.promptFeedback.blockReason;
                throw new Error(`درخواست توسط مدل به دلیل "${reason}" مسدود شد. لطفاً درخواست را تغییر دهید.`);
            }

            buffer += chunk.text;

            const thinkingStartTag = '<thinking>';
            const thinkingEndTag = '</thinking>';
            
            if (inThinkingBlock) {
                const endTagIndex = buffer.indexOf(thinkingEndTag);
                if (endTagIndex !== -1) {
                    const startTagIndex = buffer.indexOf(thinkingStartTag);
                    if (startTagIndex !== -1) {
                         thinkingContent = buffer.substring(startTagIndex + thinkingStartTag.length, endTagIndex);
                    }
                    jsonBuffer = buffer.substring(endTagIndex + thinkingEndTag.length);
                    inThinkingBlock = false;
                } else {
                    const startTagIndex = buffer.indexOf(thinkingStartTag);
                     if (startTagIndex !== -1) {
                        thinkingContent = buffer.substring(startTagIndex + thinkingStartTag.length);
                     }
                }
            } else {
                 const endTagIndex = buffer.indexOf(thinkingEndTag);
                 if (endTagIndex !== -1) {
                    jsonBuffer = buffer.substring(endTagIndex + thinkingEndTag.length);
                 }
            }

            const newThinkingText = thinkingContent.substring(lastProcessedThinkingIndex);
            
            // --- Process thinking block for live updates ---
            
            // Update Phase
            const phaseMatches = [...newThinkingText.matchAll(phaseRegex)];
            const latestPhaseMatch = phaseMatches.pop();
            if (latestPhaseMatch) {
                const newPhase = latestPhaseMatch[1].toUpperCase() as ProtocolPhase;
                if (PHASE_DATA[newPhase] && currentStatus.phase !== newPhase) {
                    currentStatus.phase = newPhase;
                    currentStatus.message = PHASE_DATA[newPhase].description;
                    const currentPhaseIndex = PHASE_ORDER.indexOf(newPhase);
                    currentStatus.progress = 5 + Math.floor(((currentPhaseIndex + 1) / PHASE_ORDER.length) * 90);
                }
            }

            // Update Search Vectors
             const vectorMatches = [...newThinkingText.matchAll(vectorRegex)];
             if (vectorMatches.length > 0) {
                const currentVectors = currentStatus.searchVectors || [];
                vectorMatches.forEach(match => {
                    const newQuery = match[1].trim();
                    if (newQuery && !foundVectors.has(newQuery)) {
                        foundVectors.add(newQuery);
                        currentVectors.push({ query: newQuery, status: 'pending' });
                    }
                });
                currentStatus.searchVectors = currentVectors;
            }

            // Update Found Sources
            const sourceMatches = [...newThinkingText.matchAll(sourceRegex)];
            if (sourceMatches.length > 0) {
                 const currentSources = currentStatus.liveSearchResults || [];
                 sourceMatches.forEach(match => {
                    const url = match[1];
                    if (!foundSourceUrls.has(url)) {
                        foundSourceUrls.add(url);
                        currentSources.push({
                            url,
                            title: match[2],
                            summary: match[3],
                            relevanceScore: 8,
                            isVerified: true,
                        });
                    }
                 });
                 currentStatus.liveSearchResults = currentSources;
            }

            // Update Operations Log
            currentStatus.operationsLog = thinkingContent
                .replace(sourceRegex, '') // Clean source tags from log display
                .replace(vectorRegex, '')
                .replace(/\[PHASE:\s*[A-Z_]+\]/g, (match) => `\n**${match}**\n`)
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);

            lastProcessedThinkingIndex = thinkingContent.length;

            yield { ...currentStatus };
        }
        
        // --- After stream ends, parse the final JSON ---
        try {
            // Clean up potential markdown wrappers
            const cleanedJsonBuffer = jsonBuffer.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
            if (cleanedJsonBuffer) {
                const reportData = JSON.parse(cleanedJsonBuffer);
                finalReport = {
                    ...reportData,
                    query: query, 
                    searchLevel: level,
                    id: `briefing-${Date.now()}`,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (e) {
            console.error("Failed to parse final JSON report:", e, "Buffer:", jsonBuffer);
            // Dont throw error yet, allow final status update before throwing
        }

        if (finalReport) {
            currentStatus.phase = ProtocolPhase.COMPLETE;
            currentStatus.message = PHASE_DATA.COMPLETE.description;
            currentStatus.progress = 100;
            currentStatus.searchVectors = currentStatus.searchVectors?.map(v => ({...v, status: 'complete'}));
            yield { ...currentStatus };
            yield finalReport;
        } else {
            console.error("Final buffer content:", buffer);
            throw new Error("پروتکل به پایان رسید اما گزارش نهایی تولید نشد. ممکن است پاسخ مدل ناقص یا نامعتبر باشد.");
        }

    } catch (error) {
        console.error("An error occurred during the RAH-YAB protocol:", error);
        const descriptiveError = error instanceof Error ? error.message : String(error);
        throw new Error(`فرایند تحلیل با خطا مواجه شد: ${descriptiveError}`);
    }
}

export async function* runInitialAnalysisWithRetry(
    query: string,
    level: SearchLevel,
    inputMode: InputMode,
    settings: RahYabSettings,
    knowledgeBaseContext: string,
    maxRetries = 2
): AsyncGenerator<OperationStatus | StrategicBriefing, void, undefined> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const generator = runInitialAnalysis(query, level, inputMode, settings, knowledgeBaseContext);
            const timeoutPromise = new Promise<never>((_, reject) => {
                // Increased timeout to 5 minutes (300,000 ms) to allow for complex analyses
                // This is the primary fix for timeout errors and resulting truncated JSON.
                setTimeout(() => reject(new Error("عملیات به دلیل زمان طولانی متوقف شد.")), 300000); 
            });

            const generatorWithTimeout = async function*() {
                const iterator = generator[Symbol.asyncIterator]();
                while (true) {
                    const nextPromise = iterator.next();
                    const result: IteratorResult<OperationStatus | StrategicBriefing> = await Promise.race([nextPromise, timeoutPromise]);
                    if (result.done) return;
                    yield result.value;
                }
            };
            
            for await (const result of generatorWithTimeout()) {
                yield result;
            }
            
            return; // Success
        } catch (error) {
            console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                // Yield a status update about retry
                yield {
                    phase: ProtocolPhase.RETRYING,
                    message: `تلاش ${attempt + 1} با خطا مواجه شد. در حال تلاش مجدد...`,
                    progress: 0,
                    operationsLog: [`**تلاش ${attempt + 1} ناموفق بود:** ${lastError.message}`, `**تلاش مجدد (${attempt + 2}/${maxRetries + 1})...**`],
                    searchVectors: [],
                    liveSearchResults: []
                };
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // If we get here, all retries failed
    throw lastError || new Error("عملیات پس از چند تلاش ناموفق بود.");
}


export async function* sendFollowUpMessage(
    chatSession: ChatSession,
    message: string,
): AsyncGenerator<string, void, undefined> {
     try {
        const stream = await chatSession.chat.sendMessageStream({ message });
        let fullResponse = "";
        for await (const chunk of stream) {
            if (chunk.promptFeedback?.blockReason) {
                const reason = chunk.promptFeedback.blockReason;
                throw new Error(`پاسخ به این پیام به دلیل "${reason}" مسدود شد.`);
            }
            const chunkText = chunk.text;
            fullResponse += chunkText;
            yield fullResponse;
        }
    } catch(error) {
        console.error("Error sending follow-up message:", error);
        const errorMessage = error instanceof Error ? error.message : "یک خطای ناشناخته در ارسال پیام رخ داد.";
        throw new Error(errorMessage);
    }
}
