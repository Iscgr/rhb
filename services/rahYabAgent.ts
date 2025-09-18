import { GoogleGenAI, GenerateContentResponse, GenerateContentConfig, Chat } from "@google/genai";
import { SearchLevel, ProtocolPhase, OperationStatus, StrategicBriefing, RahYabSettings, ChatSession, InputMode, SearchVector, Source } from '../types';
import { PHASE_DATA, PHASE_ORDER } from '../constants';

// FIX: Added exported function 'createChatSession' which was missing. This resolves the import error in App.tsx.
export const createChatSession = (settings: RahYabSettings): ChatSession => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat: Chat = ai.chats.create({
        model: settings.model,
        // The config is the same as the models.generateContent config.
        config: {
            systemInstruction: settings.systemInstruction,
            temperature: settings.temperature,
            topP: settings.topP,
        },
    });
    return {
        chat,
        history: [],
    };
};

const getReasoningCycles = (level: SearchLevel): number => {
    switch (level) {
        case SearchLevel.LEVEL_1: return 1;
        case SearchLevel.LEVEL_2: return 2;
        case SearchLevel.LEVEL_3: return 4;
        default: return 2;
    }
};

async function* runInitialAnalysis(
    query: string,
    level: SearchLevel,
    inputMode: InputMode,
    settings: RahYabSettings,
    knowledgeBaseContext: string,
): AsyncGenerator<OperationStatus | StrategicBriefing, void, undefined> {

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const baseConfig: Omit<GenerateContentConfig, 'tools'> = {
        temperature: settings.temperature,
        topP: settings.topP,
        systemInstruction: settings.systemInstruction,
    };

    const initialStatus: OperationStatus = {
        phase: ProtocolPhase.IDLE,
        message: 'مقداردهی اولیه عامل هوشمند...',
        progress: 2,
        operationsLog: ['عامل هوشمند مقداردهی اولیه شد. در انتظار شروع پروتکل...'],
        searchVectors: [],
        liveSearchResults: [],
    };
    yield initialStatus;

    let currentStatus = { ...initialStatus };
    
    // --- PHASE A: Vector Engineering ---
    let generatedVectors: string[] = [];
    if (settings.liveSearchEnabled) {
        try {
            currentStatus.phase = ProtocolPhase.SEARCH_VECTOR_GENERATION;
            currentStatus.message = PHASE_DATA[ProtocolPhase.SEARCH_VECTOR_GENERATION].description;
            currentStatus.progress = 15;
            yield { ...currentStatus };

            const vectorPrompt = `بر اساس پرس‌وجوی اولیه زیر، مجموعه‌ای از بردارهای جستجوی گوگل (Google Search Vectors) را برای تحقیق عمیق تولید کن. هر بردار باید در یک خط جداگانه و با فرمت [SEARCH_VECTOR: query] باشد.\n\nپرس‌وجو: "${query}"`;
            
            const vectorResponse = await ai.models.generateContent({
                model: settings.model,
                contents: vectorPrompt,
                config: baseConfig,
            });

            const vectorRegex = /\[SEARCH_VECTOR:\s*(.+)\]/g;
            generatedVectors = [...vectorResponse.text.matchAll(vectorRegex)].map(match => match[1].trim());

            if (generatedVectors.length > 0) {
                 currentStatus.searchVectors = generatedVectors.map(v => ({ query: v, status: 'pending' }));
                 yield { ...currentStatus };
            }

        } catch (error) {
            console.error("An error occurred during Vector Engineering phase:", error);
            const descriptiveError = error instanceof Error ? error.message : String(error);
            throw new Error(`فاز مهندسی بردار با خطا مواجه شد: ${descriptiveError}`);
        }
    }


    // --- PHASE B: Research & Synthesis ---
    let thinkingContent = '';
    try {
        currentStatus.phase = ProtocolPhase.PARALLELIZED_DATA_MINING;
        currentStatus.message = PHASE_DATA[ProtocolPhase.PARALLELIZED_DATA_MINING].description;
        currentStatus.progress = 30;
        yield { ...currentStatus };

        const researchPrompt = `
        با استفاده از بردارهای جستجوی زیر (در صورت وجود) و پایگاه دانش، یک تحلیل عمیق بر روی پرس‌وجوی اصلی انجام بده.
        کل فرآیند تحلیل و استدلال خود را در یک تگ <thinking> قرار بده.
        
        پرس‌وجوی اصلی: "${query}"
        
        پایگاه دانش:
        ${knowledgeBaseContext || 'غیرفعال'}
        
        بردارهای جستجو:
        ${generatedVectors.length > 0 ? generatedVectors.map(v => `- ${v}`).join('\n') : 'جستجوی زنده غیرفعال است.'}
        `;

        const researchConfig: GenerateContentConfig = { ...baseConfig };
        if (settings.liveSearchEnabled) {
            researchConfig.tools = [{ googleSearch: {} }];
        }

        const researchStream = await ai.models.generateContentStream({
            model: settings.model,
            contents: researchPrompt,
            config: researchConfig,
        });

        let buffer = '';
        let inThinkingBlock = false;
        let lastProcessedThinkingIndex = 0;
        
        const phaseRegex = /\[PHASE:\s*([A-Z_]+)\]/g;
        const sourceRegex = /<FOUND_SOURCE\s+url="([^"]+)"\s+title="([^"]+)"\s+summary="([^"]+)"\s*\/>/g;
        
        const foundSourceUrls = new Set<string>();

        for await (const chunk of researchStream) {
             if (chunk.promptFeedback?.blockReason) {
                const reason = chunk.promptFeedback.blockReason;
                throw new Error(`درخواست توسط مدل به دلیل "${reason}" مسدود شد. لطفاً درخواست را تغییر دهید.`);
            }

            buffer += chunk.text;
            
            const thinkingStartTag = '<thinking>';
            const thinkingEndTag = '</thinking>';

            if (!inThinkingBlock) {
                const startTagIndex = buffer.indexOf(thinkingStartTag);
                if (startTagIndex !== -1) {
                    inThinkingBlock = true;
                    buffer = buffer.substring(startTagIndex + thinkingStartTag.length);
                }
            }
            
            if(inThinkingBlock) {
                const endTagIndex = buffer.indexOf(thinkingEndTag);
                if (endTagIndex !== -1) {
                    thinkingContent += buffer.substring(0, endTagIndex);
                    break; // End of thinking block found
                } else {
                    thinkingContent = buffer;
                }
            }

            const newThinkingText = thinkingContent.substring(lastProcessedThinkingIndex);
            
            const phaseMatches = [...newThinkingText.matchAll(phaseRegex)];
            const latestPhaseMatch = phaseMatches.pop();
            if (latestPhaseMatch) {
                const newPhase = latestPhaseMatch[1].toUpperCase() as ProtocolPhase;
                if (PHASE_DATA[newPhase] && currentStatus.phase !== newPhase) {
                    currentStatus.phase = newPhase;
                    currentStatus.message = PHASE_DATA[newPhase].description;
                    const currentPhaseIndex = PHASE_ORDER.indexOf(newPhase);
                    currentStatus.progress = 30 + Math.floor(((currentPhaseIndex) / PHASE_ORDER.length) * 60);
                }
            }

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

            currentStatus.operationsLog = thinkingContent
                .replace(sourceRegex, '')
                .replace(/\[PHASE:\s*[A-Z_]+\]/g, (match) => `\n**${match}**\n`)
                .split('\n').map(line => line.trim()).filter(Boolean);

            lastProcessedThinkingIndex = thinkingContent.length;
            yield { ...currentStatus };
        }
    } catch (error) {
         console.error("An error occurred during RAH-YAB Research phase:", error);
         const descriptiveError = error instanceof Error ? error.message : String(error);
         throw new Error(`فاز تحقیق و سنتز با خطا مواجه شد: ${descriptiveError}`);
    }

    // --- PHASE C: Solution Engineering ---
    currentStatus.phase = ProtocolPhase.SOLUTION_ENGINEERING;
    currentStatus.message = PHASE_DATA[ProtocolPhase.SOLUTION_ENGINEERING].description;
    currentStatus.progress = 90;
    yield { ...currentStatus };
    
    let finalReport: StrategicBriefing | null = null;
    try {
        const engineeringPrompt = `
        بر اساس تحلیل عمیق زیر که توسط پروتکل Rah-Yab انجام شده است، گزارش استراتژیک نهایی را تولید کن.
        خروجی شما باید **فقط و فقط** یک آبجکت JSON معتبر باشد. هیچ متن یا توضیح اضافی خارج از آبجکت JSON قرار نده.
        
        --- تحلیل کامل ---
        ${thinkingContent}
        --- پایان تحلیل ---
        `;

        const finalReportResponse = await ai.models.generateContent({
            model: settings.model,
            contents: engineeringPrompt,
            config: baseConfig
        });
        
        const jsonBuffer = finalReportResponse.text;
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
    } catch(error) {
        console.error("An error occurred during RAH-YAB Solution Engineering phase:", error);
        const descriptiveError = error instanceof Error ? error.message : String(error);
        if (descriptiveError.includes("JSON")) {
            throw new Error(`گزارش نهایی تولید شده توسط مدل، ساختار JSON معتبری نداشت. ${descriptiveError}`);
        }
        throw new Error(`فاز مهندسی راه‌حل با خطا مواجه شد: ${descriptiveError}`);
    }


    if (finalReport) {
        currentStatus.phase = ProtocolPhase.COMPLETE;
        currentStatus.message = PHASE_DATA.COMPLETE.description;
        currentStatus.progress = 100;
        currentStatus.searchVectors = currentStatus.searchVectors?.map(v => ({...v, status: 'complete'}));
        yield { ...currentStatus };
        yield finalReport;
    } else {
        throw new Error("پروتکل به پایان رسید اما گزارش نهایی تولید نشد. ممکن است پاسخ مدل ناقص یا نامعتبر باشد.");
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
            // Increased total timeout to 10 minutes (600,000 ms) for the entire multi-phase process.
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("عملیات به دلیل زمان طولانی متوقف شد.")), 600000); 
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