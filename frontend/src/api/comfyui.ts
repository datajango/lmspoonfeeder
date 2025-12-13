import type {
    ComfyUISession,
    ComfyUIGeneration,
    ComfyUIWorkflow,
    ComfyUIOptions,
    GenerationParameters,
} from '../types/comfyui';

const API_BASE = 'http://localhost:3001/api';

interface Profile {
    id: string;
    name: string;
    url?: string;
}

// Profiles
export const fetchComfyUIProfiles = async (): Promise<Profile[]> => {
    const res = await fetch(`${API_BASE}/profiles?provider=comfyui`);
    const data = await res.json();
    return data.data || [];
};

// Sessions
export const fetchSessions = async (): Promise<ComfyUISession[]> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions`);
    const data = await res.json();
    return data.data || [];
};

export const fetchSession = async (id: string): Promise<ComfyUISession & { generations: ComfyUIGeneration[] }> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions/${id}`);
    const data = await res.json();
    return data.data;
};

export const createSession = async (data: { profileId: string; title?: string }): Promise<ComfyUISession> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export const updateSession = async (id: string, data: { title: string }): Promise<ComfyUISession> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
};

export const deleteSession = async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/comfyui/sessions/${id}`, { method: 'DELETE' });
};

// Workflows
export const fetchWorkflows = async (): Promise<ComfyUIWorkflow[]> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows`);
    const data = await res.json();
    return data.data || [];
};

// Options
export const fetchOptions = async (): Promise<ComfyUIOptions> => {
    const res = await fetch(`${API_BASE}/comfyui/options`);
    const data = await res.json();
    return data.data;
};

// Generations
export const generateWithParams = async (data: {
    sessionId: string;
    prompt_text: string;
    negative_prompt?: string;
    workflow_id?: string;
    parameters: Partial<GenerationParameters>;
}): Promise<ComfyUIGeneration> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions/${data.sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt_text: data.prompt_text,
            negative_prompt: data.negative_prompt,
            workflow_id: data.workflow_id,
            parameters: data.parameters,
        }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export const fetchGeneration = async (id: string): Promise<ComfyUIGeneration> => {
    const res = await fetch(`${API_BASE}/comfyui/generations/${id}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export const deleteGeneration = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/comfyui/generations/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
};
