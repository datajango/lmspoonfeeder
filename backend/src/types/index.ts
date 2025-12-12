// ============================================================
// Model Types (Ollama)
// ============================================================

export interface Model {
    name: string;
    size: string;
    digest: string;
    modifiedAt: string;
    details?: {
        format: string;
        family: string;
        parameterSize: string;
        quantizationLevel: string;
    };
}

export interface ModelInfo {
    name: string;
    size: string;
    loaded: boolean;
    capabilities: string[];
    description?: string;
    parameters?: string;
    lastUsed?: Date;
}

// ============================================================
// Provider Settings Types
// ============================================================

export type ProviderType = 'openai' | 'gemini' | 'claude';
export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'unknown';

export interface ProviderSettings {
    id: string;
    provider: ProviderType;
    apiKey: string;
    endpointUrl?: string;
    defaultModel?: string;
    lastTested?: Date;
    status: ProviderStatus;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProviderSettingsInput {
    apiKey: string;
    endpointUrl?: string;
    defaultModel?: string;
}

// ============================================================
// Task Types
// ============================================================

export type TaskType = 'text' | 'image' | 'video' | 'audio';
export type TaskProvider = 'ollama' | 'openai' | 'gemini' | 'claude' | 'comfyui';
export type TaskStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface Task {
    id: string;
    name: string;
    type: TaskType;
    provider: TaskProvider;
    prompt: string;
    options?: Record<string, unknown>;
    status: TaskStatus;
    progress?: number;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

export interface TaskInput {
    name: string;
    type: TaskType;
    provider: TaskProvider;
    prompt: string;
    options?: Record<string, unknown>;
    profileId?: string;
}

export interface TaskFilters {
    status?: TaskStatus;
    type?: TaskType;
    provider?: TaskProvider;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    page?: number;
    limit?: number;
}

// ============================================================
// Result Types
// ============================================================

export interface Result {
    id: string;
    taskId: string;
    type: TaskType;
    content: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

// ============================================================
// Profile Types
// ============================================================

export interface Profile {
    id: string;
    name: string;
    description?: string;
    type: TaskType;
    provider: TaskProvider;
    options?: Record<string, unknown>;
    promptTemplate?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProfileInput {
    name: string;
    description?: string;
    type: TaskType;
    provider: TaskProvider;
    options?: Record<string, unknown>;
    promptTemplate?: string;
}

// ============================================================
// WebSocket Event Types
// ============================================================

export interface TaskEvent {
    taskId: string;
    status: TaskStatus;
    progress?: number;
    error?: string;
    result?: Result;
}

export interface NotificationEvent {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    taskId?: string;
    timestamp: Date;
}

// ============================================================
// LLM Generation Types
// ============================================================

export interface GenerateOptions {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    stop?: string[];
}

export interface GenerateResult {
    content: string;
    model: string;
    tokensUsed?: number;
    finishReason?: string;
}
