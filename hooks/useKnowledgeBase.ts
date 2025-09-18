import { useState, useCallback, useEffect } from 'react';
import { KnowledgeBaseSource, KnowledgeBaseIndexConfig, SourceType } from '../types';
import { knowledgeBaseService } from '../services/knowledgeBaseService';

const extractSourceName = (url: string, type: SourceType): string => {
    try {
        const urlObj = new URL(url);
        if (type === SourceType.GITHUB_REPOSITORY) {
            const parts = urlObj.pathname.split('/').filter(p => p);
            if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
            return urlObj.pathname || 'مسیر نامعتبر';
        }
        return urlObj.hostname;
    } catch (e) {
        return 'آدرس نامعتبر';
    }
}

export const useKnowledgeBase = (
    initialSources: KnowledgeBaseSource[],
    onSourcesChange: (sources: KnowledgeBaseSource[]) => void
) => {
    const [sources, setSources] = useState<KnowledgeBaseSource[]>(initialSources);

    useEffect(() => {
        setSources(initialSources);
    }, [initialSources]);

    const updateSourceState = useCallback((id: string, updates: Partial<KnowledgeBaseSource>) => {
        setSources(prevSources => {
            const newSources = prevSources.map(s => s.id === id ? { ...s, ...updates } : s);
            onSourcesChange(newSources); // Notify parent of the change
            return newSources;
        });
    }, [onSourcesChange]);

    const runIndexingProcess = useCallback(async (source: KnowledgeBaseSource) => {
        try {
            for await (const update of knowledgeBaseService.startIndexing(source)) {
                updateSourceState(source.id, update);
            }
        } catch (error) {
             const message = error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد";
             updateSourceState(source.id, { status: 'error', error: message, progress: 100 });
        }
    }, [updateSourceState]);
    
    const runSyncingProcess = useCallback(async (source: KnowledgeBaseSource) => {
        try {
            for await (const update of knowledgeBaseService.startSyncing(source)) {
                updateSourceState(source.id, update);
            }
        } catch (error) {
             const message = error instanceof Error ? error.message : "An unknown error occurred during sync";
             updateSourceState(source.id, { status: 'error', error: message, progress: 100 });
        }
    }, [updateSourceState]);

    const addSource = useCallback((url: string, indexConfig: KnowledgeBaseIndexConfig) => {
        const type = url.includes('github.com') ? SourceType.GITHUB_REPOSITORY : SourceType.WEBSITE;
        const newSource: KnowledgeBaseSource = {
            id: `kb-${Date.now()}`,
            url,
            type,
            name: extractSourceName(url, type),
            status: 'queued',
            indexConfig: type === SourceType.WEBSITE ? { sourceCode: false, issues: false, pullRequests: false, discussions: false, wiki: false } : indexConfig,
            progress: 0,
            log: ['در صف برای ایندکس...'],
            lastIndexed: null,
            lastCommitHash: undefined,
        };
        
        setSources(prevSources => {
            const newSources = [...prevSources, newSource];
            onSourcesChange(newSources);
            // We run the async process after the state update has been queued.
            runIndexingProcess(newSource);
            return newSources;
        });
    }, [onSourcesChange, runIndexingProcess]);

    const removeSource = useCallback((id: string) => {
        setSources(prevSources => {
            const newSources = prevSources.filter(s => s.id !== id);
            onSourcesChange(newSources);
            return newSources;
        });
    }, [onSourcesChange]);
    
    const reindexSource = useCallback((id: string) => {
        setSources(prevSources => {
            const sourceToIndex = prevSources.find(s => s.id === id);
            if (sourceToIndex && !['indexing', 'queued', 'syncing'].includes(sourceToIndex.status)) {
                const resetSource = {
                    ...sourceToIndex,
                    status: 'queued' as const,
                    progress: 0,
                    log: ['در صف برای ایندکس مجدد...'],
                    error: undefined
                };
                const newSources = prevSources.map(s => s.id === id ? resetSource : s);
                onSourcesChange(newSources);
                runIndexingProcess(resetSource);
                return newSources;
            }
            return prevSources;
        });
    }, [onSourcesChange, runIndexingProcess]);

    const syncSource = useCallback((id: string) => {
        setSources(prevSources => {
            const sourceToSync = prevSources.find(s => s.id === id);
            if (sourceToSync && !['indexing', 'queued', 'syncing'].includes(sourceToSync.status)) {
                const resetSource = {
                    ...sourceToSync,
                    status: 'queued' as const,
                    progress: 0,
                    log: ['در صف برای همگام‌سازی...'],
                    error: undefined
                };
                const newSources = prevSources.map(s => s.id === id ? resetSource : s);
                onSourcesChange(newSources);
                runSyncingProcess(resetSource);
                return newSources;
            }
            return prevSources;
        });
    }, [onSourcesChange, runSyncingProcess]);

    return {
        knowledgeBaseSources: sources,
        addSource,
        removeSource,
        reindexSource,
        syncSource,
    };
};