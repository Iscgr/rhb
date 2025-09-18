import { KnowledgeBaseSource, SourceType } from "../types";

// This is a MOCKED service that simulates a backend worker processing indexing jobs.
// In a real application, this would be replaced with API calls to a backend service.

const MOCK_DELAY = 250; // ms between progress updates

async function* simulateStep(
    logMessage: string, 
    duration: number, 
    startProgress: number,
    endProgress: number
): AsyncGenerator<Partial<KnowledgeBaseSource>, void, undefined> {
    
    const steps = duration / MOCK_DELAY;
    const progressIncrement = (endProgress - startProgress) / steps;

    for (let i = 0; i < steps; i++) {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        const currentProgress = Math.min(endProgress, startProgress + (progressIncrement * (i + 1)));
        yield { 
            progress: Math.round(currentProgress),
            log: [logMessage] 
        };
    }
}

async function* startIndexingGitHub(source: KnowledgeBaseSource): AsyncGenerator<Partial<KnowledgeBaseSource>, void, undefined> {
    yield { status: 'indexing', log: ['شروع فرآیند ایندکس گیت‌هاب...'] };
    
    yield* simulateStep('۱/۵: کلون کردن ریپازیتوری...', 2000, 0, 20);

    if (source.indexConfig.sourceCode) {
        yield* simulateStep('۲/۵: پردازش سورس کد...', 3000, 20, 40);
    }
    if (source.indexConfig.issues) {
        yield* simulateStep('۳/۵: استخراج و پردازش مسائل (Issues)...', 2500, 40, 60);
    }
    if (source.indexConfig.pullRequests) {
        yield* simulateStep('۴/۵: تحلیل درخواست‌های ادغام (PRs)...', 1500, 60, 80);
    }

    if (source.name.includes('fail')) {
        await new Promise(resolve => setTimeout(resolve, 500));
        throw new Error("دسترسی به ریپازیتوری امکان‌پذیر نیست (خطای 403).");
    }

    yield* simulateStep('۵/۵: ساخت Embeddings و نهایی‌سازی...', 2000, 80, 100);
    
    yield {
        status: 'indexed',
        progress: 100,
        lastIndexed: new Date().toISOString(),
        lastCommitHash: Math.random().toString(36).substring(2, 9),
        log: ['ایندکس گیت‌هاب با موفقیت کامل شد.'],
    };
}

async function* startIndexingWebsite(source: KnowledgeBaseSource): AsyncGenerator<Partial<KnowledgeBaseSource>, void, undefined> {
    yield { status: 'indexing', log: ['شروع فرآیند ایندکس وب‌سایت...'] };

    yield* simulateStep('۱/۴: اتصال به وب‌سایت...', 1000, 0, 25);
    yield* simulateStep('۲/۴: استخراج محتوای اصلی (Web Scraping)...', 3000, 25, 50);
    yield* simulateStep('۳/۴: پاکسازی و قطعه‌بندی متن...', 2000, 50, 75);
    yield* simulateStep('۴/۴: ساخت Embeddings و نهایی‌سازی...', 2000, 75, 100);

    yield {
        status: 'indexed',
        progress: 100,
        lastIndexed: new Date().toISOString(),
        lastCommitHash: undefined, // Not applicable for websites
        log: ['ایندکس وب‌سایت با موفقیت کامل شد.'],
    };
}


export const knowledgeBaseService = {
    async *startIndexing(source: KnowledgeBaseSource): AsyncGenerator<Partial<KnowledgeBaseSource>, void, undefined> {
        if (source.type === SourceType.GITHUB_REPOSITORY) {
            yield* startIndexingGitHub(source);
        } else {
            yield* startIndexingWebsite(source);
        }
    },

    async *startSyncing(source: KnowledgeBaseSource): AsyncGenerator<Partial<KnowledgeBaseSource>, void, undefined> {
        // Syncing is only meaningful for GitHub repositories for now
        if (source.type !== SourceType.GITHUB_REPOSITORY) {
            yield { status: 'indexed', progress: 100, log: ['همگام‌سازی برای این نوع منبع پشتیبانی نمی‌شود. لطفاً مجدداً ایندکس کنید.'] };
            return;
        }

        yield { status: 'syncing', progress: 0, log: ['در حال بررسی برای تغییرات جدید...'], error: undefined };
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency

        // 30% chance of being up-to-date
        if (Math.random() < 0.3 && source.lastCommitHash) {
            yield { status: 'indexed', progress: 100, log: ['ریپازیتوری در حال حاضر به‌روز است.'] };
            return;
        }

        const newCommitHash = Math.random().toString(36).substring(2, 9);
        yield { log: [`تغییرات جدید یافت شد. شروع همگام‌سازی به هش: ${newCommitHash}`] };
        
        // Syncing is simulated to be faster than full indexing
        yield* simulateStep('۱/۳: دریافت تغییرات جدید...', 1000, 0, 33);
        yield* simulateStep('۲/۳: ایندکس فایل‌های تغییریافته...', 1500, 33, 85);
        yield* simulateStep('۳/۳: نهایی‌سازی همگام‌سازی...', 500, 85, 100);

        yield {
            status: 'indexed',
            progress: 100,
            lastIndexed: new Date().toISOString(),
            lastCommitHash: newCommitHash,
            log: ['همگام‌سازی با موفقیت کامل شد.'],
        };
    }
};