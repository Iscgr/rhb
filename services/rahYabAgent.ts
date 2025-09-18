import { GoogleGenAI, GenerateContentResponse, GenerateContentConfig } from "@google/genai";
import { SearchLevel, ProtocolPhase, OperationStatus, StrategicBriefing, RahYabSettings, ChatSession, InputMode, SearchVector, Source, StreamEvent } from '../types';
import { PHASE_DATA, PHASE_ORDER } from '../constants';

// Temporary debug function
function debugJSON(jsonStr: string): void {
  console.log("=== JSON DEBUG START ===");
  
  const lines = jsonStr.split('\n');
  lines.forEach((line, i) => {
    console.log(`Line ${i+1}: ${line}`);
  });
  
  try {
    JSON.parse(jsonStr);
    console.log("✓ JSON is valid");
  } catch (e) {
    const errorMsg = String(e);
    console.error(`✗ JSON parse error: ${errorMsg}`);
    
    const posMatch = errorMsg.match(/position (\d+)/i) || errorMsg.match(/column (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const context = 20;
      
      console.log(`Error near position ${pos}:`);
      console.log(`...${jsonStr.slice(Math.max(0, pos-context), pos)}【HERE→】${jsonStr.slice(pos, pos+context)}...`);
    }
  }
  
  console.log("=== JSON DEBUG END ===");
}


const sanitizeAndParseJSON = (jsonString: string): StreamEvent | null => {
    const trimmedLine = jsonString.trim();
    if (!trimmedLine) {
        return null;
    }
    
    let sanitizedStr = trimmedLine;

    try {
        return JSON.parse(sanitizedStr) as StreamEvent;
    } catch (e) {
        // First attempt: Fix common JSON syntax issues
        try {
            // Fix Persian concatenation
            let fixedStr = sanitizedStr.replace(/"([^"]*)"\s*و\s*"([^"]*)"/g, '"$1 $2"');
            // Fix trailing commas in objects/arrays
            fixedStr = fixedStr.replace(/,\s*([\]}])/g, '$1');
            // Fix missing values (e.g. "key":, or "key":})
            fixedStr = fixedStr.replace(/:(\s*[,\]}])/g, ':null$1');
            // Fix unquoted keys
            fixedStr = fixedStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

            return JSON.parse(fixedStr) as StreamEvent;
        } catch (e1) {
            // Second attempt: More aggressive repair for truncated JSON
            try {
                let fixedStr = sanitizedStr;
                
                // Attempt to fix unterminated strings, a common source of truncation errors
                if ((fixedStr.match(/"/g) || []).length % 2 !== 0) {
                    fixedStr += '"';
                }

                const openBraces = (fixedStr.match(/{/g) || []).length;
                const closeBraces = (fixedStr.match(/}/g) || []).length;
                if (openBraces > closeBraces) {
                    fixedStr = fixedStr + '}'.repeat(openBraces - closeBraces);
                }

                const openBrackets = (fixedStr.match(/\[/g) || []).length;
                const closeBrackets = (fixedStr.match(/\]/g) || []).length;
                if (openBrackets > closeBrackets) {
                    fixedStr = fixedStr + ']'.repeat(openBrackets - closeBrackets);
                }
                
                // After attempting to fix truncation, re-apply first-level fixes
                fixedStr = fixedStr.replace(/,\s*([\]}])/g, '$1');

                return JSON.parse(fixedStr) as StreamEvent;
            } catch (e2) {
                console.warn('Failed to parse stream line even after aggressive sanitization:', jsonString, e2 instanceof Error ? e2.message : String(e2));
                return null;
            }
        }
    }
};

/**
 * Adapts raw stream events to the expected structure.
 * This centralizes logic for handling inconsistencies in the model's output.
 */
const adaptEvent = (event: StreamEvent): StreamEvent => {
    if (event.event === 'search_vectors_generated') {
        const data = event.data as { vectors?: string[], queries?: string[] };
        // If 'vectors' is missing but 'queries' exists, adapt the event.
        if (!data.vectors && data.queries) {
            // Create a deep copy to avoid mutating the original event stream object
            const adaptedEvent = JSON.parse(JSON.stringify(event));
            adaptedEvent.data.vectors = adaptedEvent.data.queries;
            delete adaptedEvent.data.queries;
            return adaptedEvent as StreamEvent;
        }
    }
    // Return the original event if no adaptation is needed
    return event;
};


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
شما «رهیاب» هستید، یک پروتکل هوش مصنوعی استراتژیک.
وظیفه اصلی: ${coreTask}

پارامترهای عملیات:
- سطح تحلیل: ${level} (${cycles} چرخه استدلال)
- پایگاه دانش: ${knowledgeBaseInstruction}
- جستجوی زنده: ${liveSearchInstruction}

پروتکل را آغاز کن و جریان رویدادهای JSON را شروع کن.
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
        
        const systemInstruction = `
You are 'Rah-Yab', a strategic AI protocol.
Your output *MUST* be a stream of event packets. Each packet must be enclosed in exact delimiters.
**No text or characters should ever be generated outside these delimiters.**

**ABSOLUTE PROTOCOL LAW:**
Every event must be in this exact format:
__RHYB_EV_B__{ "event": "EVENT_NAME", "data": {...} }__RHYB_EV_E__

**CRITICAL DELIMITER AND FORMATTING RULES:**
1.  **NEVER CONCATENATE EVENTS:** Always ensure one event ends with \`__RHYB_EV_E__\` before the next one begins with \`__RHYB_EV_B__\`.
2.  **NO MARKDOWN:** NEVER wrap your JSON event data in Markdown backticks (\`\`\`). The output must be raw JSON text within the delimiters.
3.  **CORRECT DELIMITERS:** Use the exact delimiters \`__RHYB_EV_B__\` and \`__RHYB_EV_E__\`. Pay close attention to spelling.

*   **Correct Example (Separate Events):**
    __RHYB_EV_B__{"event":"log_update","data":{"message":"Message one"}}__RHYB_EV_E__
    __RHYB_EV_B__{"event":"log_update","data":{"message":"Message two"}}__RHYB_EV_E__

*   **Incorrect Example (DO NOT DO THIS):**
    __RHYB_EV_B__{"event":"log_update","data":{"message":"Message one"}}__RHYB_EV_B__{"event":"log_update","data":{"message":"Message two"}}__RHYB_EV_E__

**CRITICAL JSON RULES:**
1.  Always use double quotes for keys and string values.
2.  Never use trailing commas.
3.  Always properly close all brackets and braces.

**EVENT STRUCTURES (STRICT):**
-   **Phase Update:** \`{"event":"phase_update","data":{"phase":"PHASE_NAME"}}\`
    -   **CRITICAL: \`PHASE_NAME\` MUST be one of these exact, uppercase, underscore-separated strings:**
        -   \`QUERY_DECONSTRUCTION\`
        -   \`KNOWLEDGE_BASE_QUERYING\`
        -   \`SEARCH_VECTOR_GENERATION\`
        -   \`PARALLELIZED_DATA_MINING\`
        -   \`INFORMATION_SYNTHESIS\`
        -   \`ITERATIVE_REASONING\`
        -   \`SOLUTION_ENGINEERING\`
        -   \`FINAL_REPORT_GENERATION\`
-   **Log Update:** \`{"event":"log_update","data":{"message":"Your detailed thinking process or log message here..."}}\`
-   **Search Vectors:** \`{"event":"search_vectors_generated","data":{"vectors":["query1", "query2"]}}\`
    -   **CRITICAL: The key for the array of search strings MUST be "vectors", not "queries". Using "queries" is a protocol violation.**
-   **Source Found:** \`{"event":"source_found","data":{"url":"...", "title":"...", "summary":"..."}}\`
-   **Final Report:** \`{"event":"final_report_generated","data":{"briefing":{...}}}\`

**EVENT SEQUENCE PROTOCOL (MANDATORY):**
1.  Stream your thought process continuously using 'log_update' events. This is your primary method of communication during the analysis.
2.  Send 'phase_update' events *only* when transitioning to a new, distinct phase.
3.  Generate 'search_vectors_generated' and 'source_found' events as you work, following the strict structures defined above.
4.  **MOST IMPORTANT RULE:** The final event in this stream *MUST* be a complete and valid 'final_report_generated' event.
5.  **NEVER terminate the stream before sending the complete 'final_report_generated' event.** This is your last and most critical task.

Now, begin the protocol for the given task and conclude by sending the complete final report.
`;

        const config: GenerateContentConfig = {
            temperature: settings.temperature,
            topP: settings.topP,
            systemInstruction: systemInstruction,
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
        let currentStatus = { ...initialStatus };
        let finalReport: StrategicBriefing | null = null;
        const totalReasoningCycles = getReasoningCycles(level);

        const processEvent = (event: StreamEvent) => {
            switch (event.event) {
                case 'phase_update': {
                    const phaseName = event.data.phase;
                    if (!phaseName) {
                        console.warn('Received phase_update event with no phase name.');
                        return; // Ignore invalid event
                    }
                    
                    let newPhase = phaseName.toUpperCase() as ProtocolPhase;

                    if (!PHASE_DATA[newPhase]) {
                        // Defensive mapping for common model deviations.
                        const phaseNameMapping: Record<string, ProtocolPhase> = {
                            'INITIAL ANALYSIS': ProtocolPhase.QUERY_DECONSTRUCTION,
                            'GENERATING SEARCH VECTORS': ProtocolPhase.SEARCH_VECTOR_GENERATION,
                            'DATA MINING & INFORMATION GATHERING': ProtocolPhase.PARALLELIZED_DATA_MINING,
                            'SYNTHESIS & PROBLEM IDENTIFICATION': ProtocolPhase.INFORMATION_SYNTHESIS,
                            'SOLUTION DESIGN & CONFIGURATION REWRITE': ProtocolPhase.SOLUTION_ENGINEERING,
                        };
                        
                        const mappedPhase = phaseNameMapping[newPhase];
                        if (mappedPhase) {
                            console.log(`Mapped unknown phase "${phaseName}" to "${mappedPhase}".`);
                            newPhase = mappedPhase;
                        } else {
                            console.warn(`Received unknown phase: ${phaseName}. Skipping update.`);
                            currentStatus.operationsLog = [...currentStatus.operationsLog, `**ورود به فاز ناشناخته: ${phaseName}**`];
                            return;
                        }
                    }

                    currentStatus.phase = newPhase;
                    currentStatus.message = PHASE_DATA[newPhase].description;
                    const currentPhaseIndex = PHASE_ORDER.indexOf(newPhase);
                    currentStatus.progress = 5 + Math.floor(((currentPhaseIndex + 1) / PHASE_ORDER.length) * 90);
                    currentStatus.operationsLog = [...currentStatus.operationsLog, `**ورود به فاز: ${PHASE_DATA[newPhase].description}**`];
                    break;
                }
                case 'log_update':
                    currentStatus.operationsLog = [...currentStatus.operationsLog, event.data.message];
                    break;
                case 'search_vectors_generated': {
                    const receivedVectors = event.data.vectors || [];
                    currentStatus.searchVectors = receivedVectors.map((q: string) => ({ query: q, status: 'pending' }));
                    break;
                }
                case 'source_found': {
                    const newSource: Source = { ...event.data, relevanceScore: 8, isVerified: true };
                    currentStatus.liveSearchResults = [...(currentStatus.liveSearchResults || []), newSource];
                    if (currentStatus.searchVectors?.some(v => v.status === 'pending')) {
                       currentStatus.searchVectors = currentStatus.searchVectors.map(v => v.status === 'pending' ? {...v, status: 'active'} : v);
                    }
                    break;
                }
                case 'reasoning_cycle_update':
                    currentStatus.reasoningCycle = { current: event.data.current, total: event.data.total || totalReasoningCycles };
                    break;
                case 'final_report_generated': {
                     const defaultBriefingStructure = {
                        executiveSummary: "خلاصه اجرایی تولید نشد.",
                        engineeredSolution: { title: "راه‌حل مهندسی شده تولید نشد", steps: [] },
                        evidenceDossier: { title: "پرونده شواهد تولید نشد", sources: [] },
                        redTeamAnalysis: { title: "تحلیل ریسک تولید نشد", potentialFailures: [], mitigationStrategies: [] },
                    };

                     finalReport = {
                         ...defaultBriefingStructure,
                         ...event.data.briefing,
                         // Ensure nested objects are also present to avoid downstream errors
                         engineeredSolution: { ...defaultBriefingStructure.engineeredSolution, ...(event.data.briefing.engineeredSolution || {}) },
                         evidenceDossier: { ...defaultBriefingStructure.evidenceDossier, ...(event.data.briefing.evidenceDossier || {}) },
                         redTeamAnalysis: { ...defaultBriefingStructure.redTeamAnalysis, ...(event.data.briefing.redTeamAnalysis || {}) },
                          query: query, 
                          searchLevel: level,
                          id: `briefing-${Date.now()}`,
                          timestamp: new Date().toISOString()
                     };
                    break;
                }
            }
        };

        for await (const chunk of stream) {
            if (chunk.promptFeedback?.blockReason) {
                const reason = chunk.promptFeedback.blockReason;
                throw new Error(`درخواست توسط مدل به دلیل "${reason}" مسدود شد. لطفاً درخواست را تغییر دهید.`);
            }

            buffer += chunk.text;

            // 1. Normalize common delimiter typos from the entire buffer.
            buffer = buffer.replace(/__RHRB_EV_E__/g, '__RHYB_EV_E__');
            
            // 2. Split buffer into completed event packets based on the END delimiter.
            const packets = buffer.split('__RHYB_EV_E__');
            
            // The last element in the array is an incomplete packet (or empty string), so we keep it in the buffer for the next chunk.
            buffer = packets.pop() || '';

            for (const packet of packets) {
                 if (!packet.trim()) continue;

                // Find the start marker in the packet. This handles concatenated events where one packet might contain `...}}__RHYB_EV_B__{...`
                const startMarkerIndex = packet.indexOf('__RHYB_EV_B__');
                if (startMarkerIndex === -1) {
                    // This part of the stream did not contain a valid start marker.
                    console.warn('RAH-YAB Protocol: Skipped a malformed packet without a start marker:', packet);
                    continue;
                }

                // Extract content *after* the start marker.
                let jsonContent = packet.substring(startMarkerIndex + '__RHYB_EV_B__'.length);

                // 3. Remove any markdown wrappers from the extracted JSON content.
                jsonContent = jsonContent.replace(/```json\s*|\s*```/g, '');

                const event = sanitizeAndParseJSON(jsonContent);

                if (event) {
                    const adaptedEvent = adaptEvent(event);
                    processEvent(adaptedEvent);
                    yield { ...currentStatus };
                } else {
                    console.warn('RAH-YAB Protocol: Skipped a malformed event. Raw content:', jsonContent);
                }
            }
        }
        
        if (!finalReport && buffer.includes('"event":"final_report_generated"')) {
            console.log("Attempting to recover final report from buffer...");
            try {
                const reportMatch = buffer.match(/"briefing"\s*:\s*({[\s\S]+})/);
                if (reportMatch && reportMatch[1]) {
                    let briefingStr = reportMatch[1];
                    const openBraces = (briefingStr.match(/{/g) || []).length;
                    const closeBraces = (briefingStr.match(/}/g) || []).length;
                    if (openBraces > closeBraces) {
                        briefingStr += '}'.repeat(openBraces - closeBraces);
                    }
                    briefingStr = briefingStr.replace(/,\s*}/g, '}');
                    
                    const briefingData = JSON.parse(briefingStr);

                    if (briefingData && briefingData.executiveSummary) {
                         finalReport = {
                             ...briefingData,
                              query: query, 
                              searchLevel: level,
                              id: `briefing-recovered-${Date.now()}`,
                              timestamp: new Date().toISOString()
                         };
                         console.log("Successfully recovered final report from buffer.");
                    }
                }
            } catch (e) {
                console.error("Failed to recover report through manual extraction:", e);
            }
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
            throw new Error("پروتکل به پایان رسید اما گزارش نهایی تولید نشد. ممکن است پاسخ مدل ناقص باشد.");
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