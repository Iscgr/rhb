import { Chat } from "@google/genai";

export enum SearchLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
  LEVEL_3 = 'LEVEL_3',
}

export enum ProtocolPhase {
  IDLE = 'IDLE',
  QUERY_DECONSTRUCTION = 'QUERY_DECONSTRUCTION',
  KNOWLEDGE_BASE_QUERYING = 'KNOWLEDGE_BASE_QUERYING',
  SEARCH_VECTOR_GENERATION = 'SEARCH_VECTOR_GENERATION',
  PARALLELIZED_DATA_MINING = 'PARALLELIZED_DATA_MINING',
  INFORMATION_SYNTHESIS = 'INFORMATION_SYNTHESIS',
  ITERATIVE_REASONING = 'ITERATIVE_REASONING',
  SOLUTION_ENGINEERING = 'SOLUTION_ENGINEERING',
  FINAL_REPORT_GENERATION = 'FINAL_REPORT_GENERATION',
  RETRYING = 'RETRYING',
  COMPLETE = 'COMPLETE',
}

export interface SearchVector {
    query: string;
    status: 'pending' | 'active' | 'complete';
}

export interface OperationStatus {
  phase: ProtocolPhase;
  message: string;
  progress: number;
  operationsLog: string[];
  searchVectors?: SearchVector[];
  reasoningCycle?: {
      current: number;
      total: number;
  };
  liveSearchResults?: Source[];
}

export interface GraphNode {
    id: string;
    label: string;
    type: 'protocol' | 'tool' | 'vulnerability' | 'concept' | 'solution';
    details: string;
    centrality: number; // 0.0 to 1.0, indicating importance
}

export interface GraphEdge {
    from: string;
    to: string;
    label: string;
}

export interface VisualData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface Source {
  url: string;
  title: string;
  summary: string;
  relevanceScore: number; // 1-10 scale
  isVerified?: boolean; // To distinguish Google Search results
  feedback?: 'useful' | 'not_useful';
}

export interface RedTeamAnalysis {
  title: string;
  potentialFailures: string[];
  mitigationStrategies: string[];
}

export interface StrategicBriefing {
  id:string;
  timestamp: string;
  query: string;
  searchLevel: SearchLevel;
  executiveSummary: string;
  engineeredSolution: {
    title: string;
    steps: string[];
  };
  evidenceDossier: {
    title: string;
    sources: Source[];
  };
  redTeamAnalysis: RedTeamAnalysis;
  visualData?: VisualData;
}

export interface KnowledgeBaseIndexConfig {
  sourceCode: boolean;
  issues: boolean;
  pullRequests: boolean;
  discussions: boolean;
  wiki: boolean;
}

export enum SourceType {
  GITHUB_REPOSITORY = 'GITHUB_REPOSITORY',
  WEBSITE = 'WEBSITE',
}

export interface KnowledgeBaseSource {
  id: string;
  url: string;
  name: string;
  type: SourceType;
  status: 'indexed' | 'indexing' | 'error' | 'queued' | 'syncing';
  indexConfig: KnowledgeBaseIndexConfig;
  progress: number; // Percentage (0-100)
  log: string[]; // Log messages for indexing process
  lastIndexed: string | null; // ISO string of the last successful index time
  lastCommitHash?: string;
  error?: string;
}

export interface RahYabSettings {
  // FIX: Updated model to 'gemini-2.5-flash' as per coding guidelines.
  readonly model: 'gemini-2.5-flash';
  temperature?: number;
  topP?: number;
  systemInstruction?: string;
  liveSearchEnabled?: boolean;
  defaultSearchLevel?: SearchLevel;
  knowledgeBaseEnabled?: boolean;
  knowledgeBaseSources?: KnowledgeBaseSource[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ChatSession {
    chat: Chat;
    history: ChatMessage[];
}

export type InputMode = 'TEXT' | 'JSON';
