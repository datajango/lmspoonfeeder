const API_BASE = '/api';

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// Models API
export const modelsApi = {
    list: () => fetchApi<any>('/models'),
    get: (name: string) => fetchApi<any>(`/models/${encodeURIComponent(name)}`),
    load: (name: string) => fetchApi<any>(`/models/${encodeURIComponent(name)}/load`, { method: 'POST' }),
    unload: (name: string) => fetchApi<any>(`/models/${encodeURIComponent(name)}/unload`, { method: 'POST' }),
    status: (name: string) => fetchApi<any>(`/models/${encodeURIComponent(name)}/status`),
};

// Settings API
export const settingsApi = {
    list: () => fetchApi<any>('/settings'),
    get: (provider: string) => fetchApi<any>(`/settings/${provider}`),
    update: (provider: string, data: any) =>
        fetchApi<any>(`/settings/${provider}`, { method: 'PUT', body: JSON.stringify(data) }),
    test: (provider: string) => fetchApi<any>(`/settings/${provider}/test`, { method: 'POST' }),
    delete: (provider: string) => fetchApi<any>(`/settings/${provider}`, { method: 'DELETE' }),
};

// Tasks API
export const tasksApi = {
    list: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return fetchApi<any>(`/tasks${query}`);
    },
    create: (data: any) => fetchApi<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => fetchApi<any>(`/tasks/${id}`),
    delete: (id: string) => fetchApi<any>(`/tasks/${id}`, { method: 'DELETE' }),
    retry: (id: string) => fetchApi<any>(`/tasks/${id}/retry`, { method: 'POST' }),
    history: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return fetchApi<any>(`/tasks/history${query}`);
    },
};

// Results API
export const resultsApi = {
    list: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return fetchApi<any>(`/results${query}`);
    },
    get: (id: string) => fetchApi<any>(`/results/${id}`),
    delete: (id: string) => fetchApi<any>(`/results/${id}`, { method: 'DELETE' }),
    downloadUrl: (id: string) => `${API_BASE}/results/${id}/download`,
};

// Profiles API
export const profilesApi = {
    list: () => fetchApi<any>('/profiles'),
    create: (data: any) => fetchApi<any>('/profiles', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => fetchApi<any>(`/profiles/${id}`),
    update: (id: string, data: any) =>
        fetchApi<any>(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/profiles/${id}`, { method: 'DELETE' }),
    // Model management
    listModels: (id: string) => fetchApi<any>(`/profiles/${id}/models`),
    addModel: (id: string, modelId: string, name?: string) =>
        fetchApi<any>(`/profiles/${id}/models`, { method: 'POST', body: JSON.stringify({ modelId, name }) }),
    deleteModel: (id: string, modelId: string) =>
        fetchApi<any>(`/profiles/${id}/models/${encodeURIComponent(modelId)}`, { method: 'DELETE' }),
    syncModels: (id: string) =>
        fetchApi<any>(`/profiles/${id}/models/sync`, { method: 'POST' }),
    // Test connection
    testConnection: (provider: string, apiKey?: string, url?: string) =>
        fetchApi<any>('/profiles/test-connection', { method: 'POST', body: JSON.stringify({ provider, apiKey, url }) }),
};

// Health check
export const healthApi = {
    check: () => fetchApi<any>('/health'),
};
