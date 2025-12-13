// ============================================================
// Model Types
// ============================================================

export interface Model {
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
    lastTested?: string;
    status: ProviderStatus;
    errorMessage?: string;
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
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface TaskInput {
    name: string;
    type: TaskType;
    provider: TaskProvider;
    prompt: string;
    options?: Record<string, unknown>;
}

// ============================================================
// Result Types
// ============================================================

export interface Result {
    id: string;
    task_id: string;
    task_name?: string;
    task_provider?: string;
    type: TaskType;
    content: string;
    metadata?: Record<string, unknown>;
    created_at: string;
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
    api_key?: string;
    url?: string;
    options?: Record<string, unknown>;
    prompt_template?: string;
    created_at: string;
    updated_at: string;
}

export interface ProfileInput {
    name: string;
    description?: string;
    type: TaskType;
    provider: TaskProvider;
    apiKey?: string;
    url?: string;
    options?: Record<string, unknown>;
    promptTemplate?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================================
// WebSocket Event Types
// ============================================================

export interface TaskEvent {
    taskId: string;
    status: TaskStatus;
    progress?: number;
    error?: string;
}

export interface NotificationEvent {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    taskId?: string;
    timestamp: string;
}
