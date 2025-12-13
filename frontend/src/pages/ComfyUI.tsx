import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { GenerationPanel, GenerationHistory, WorkflowJSONViewer } from '../components/comfyui';
import type {
    ComfyUISession,
    ComfyUIGeneration,
    ComfyUIWorkflow,
    ComfyUIOptions,
    GenerationParameters,
} from '../types/comfyui';
import { DEFAULT_GENERATION_PARAMETERS } from '../types/comfyui';
import { Plus, Trash2, Edit2, X, Loader2, Image, Check, Sparkles } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface Profile {
    id: string;
    name: string;
    url?: string;
}

// API functions
const fetchComfyUIProfiles = async (): Promise<Profile[]> => {
    const res = await fetch(`${API_BASE}/profiles?provider=comfyui`);
    const data = await res.json();
    return data.data || [];
};

const fetchSessions = async (): Promise<ComfyUISession[]> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions`);
    const data = await res.json();
    return data.data || [];
};

const fetchSession = async (id: string): Promise<ComfyUISession & { generations: ComfyUIGeneration[] }> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions/${id}`);
    const data = await res.json();
    return data.data;
};

const fetchWorkflows = async (): Promise<ComfyUIWorkflow[]> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows`);
    const data = await res.json();
    return data.data || [];
};

const fetchOptions = async (): Promise<ComfyUIOptions> => {
    const res = await fetch(`${API_BASE}/comfyui/options`);
    const data = await res.json();
    return data.data;
};

const createSession = async (data: { profileId: string; title?: string }): Promise<ComfyUISession> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

const updateSession = async (id: string, data: { title: string }): Promise<ComfyUISession> => {
    const res = await fetch(`${API_BASE}/comfyui/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
};

const deleteSession = async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/comfyui/sessions/${id}`, { method: 'DELETE' });
};

const generateWithParams = async (data: {
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

const fetchGeneration = async (id: string): Promise<ComfyUIGeneration> => {
    const res = await fetch(`${API_BASE}/comfyui/generations/${id}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export default function ComfyUI() {
    // State
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<(ComfyUISession & { generations: ComfyUIGeneration[] }) | null>(null);
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [parameters, setParameters] = useState<Partial<GenerationParameters>>(DEFAULT_GENERATION_PARAMETERS);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [dialogProfile, setDialogProfile] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
    const [settingsCollapsed, setSettingsCollapsed] = useState(false);
    const [viewingWorkflowId, setViewingWorkflowId] = useState<string | null>(null);

    // Queries
    const { data: profiles } = useQuery({
        queryKey: ['comfyui-profiles'],
        queryFn: fetchComfyUIProfiles,
    });

    const { data: sessions, refetch: refetchSessions } = useQuery({
        queryKey: ['comfyui-sessions'],
        queryFn: fetchSessions,
    });

    const { data: workflows } = useQuery({
        queryKey: ['comfyui-workflows'],
        queryFn: fetchWorkflows,
    });

    const { data: options } = useQuery({
        queryKey: ['comfyui-options'],
        queryFn: fetchOptions,
    });

    // Load session data when selected
    useEffect(() => {
        if (selectedSession) {
            fetchSession(selectedSession).then((data) => {
                setSessionData(data);
                // Restore last parameters if available
                if (data.last_parameters && Object.keys(data.last_parameters).length > 0) {
                    setParameters(prev => ({ ...prev, ...data.last_parameters }));
                }
                // Restore workflow selection
                if (data.current_workflow_id) {
                    setSelectedWorkflowId(data.current_workflow_id);
                }
            });
        } else {
            setSessionData(null);
        }
    }, [selectedSession]);



    // Mutations
    const createMutation = useMutation({
        mutationFn: createSession,
        onSuccess: (session) => {
            toast.success('Session created');
            setSelectedSession(session.id);
            setShowNewModal(false);
            setDialogProfile('');
            refetchSessions();
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, title }: { id: string; title: string }) => updateSession(id, { title }),
        onSuccess: () => {
            setEditingId(null);
            setEditingName('');
            refetchSessions();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSession,
        onSuccess: () => {
            if (selectedSession) {
                setSelectedSession(null);
                setSessionData(null);
            }
            refetchSessions();
        },
    });

    const generateMutation = useMutation({
        mutationFn: generateWithParams,
        onSuccess: (generation) => {
            toast.success('Generation started!');
            setPrompt('');
            // Start polling for this generation
            pollGeneration(generation.id);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const pollGeneration = async (id: string) => {
        setPollingIds(prev => new Set(prev).add(id));
        let attempts = 0;
        const maxAttempts = 120;

        const poll = async () => {
            try {
                const gen = await fetchGeneration(id);

                if (gen.status === 'completed') {
                    setPollingIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    toast.success('Image generated!');
                    if (selectedSession) {
                        fetchSession(selectedSession).then(setSessionData);
                    }
                } else if (gen.status === 'failed') {
                    setPollingIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    toast.error(`Generation failed: ${gen.error}`);
                    if (selectedSession) {
                        fetchSession(selectedSession).then(setSessionData);
                    }
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 1000);
                } else {
                    setPollingIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    toast.error('Generation timed out');
                }
            } catch {
                setPollingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        };

        poll();
    };

    const handleSubmit = () => {
        if (!prompt.trim() || !selectedSession || generateMutation.isPending) return;
        generateMutation.mutate({
            sessionId: selectedSession,
            prompt_text: prompt.trim(),
            negative_prompt: negativePrompt.trim() || undefined,
            workflow_id: selectedWorkflowId || undefined,
            parameters,
        });
    };



    const handleCreateSession = () => {
        if (!dialogProfile) return;
        const profile = profiles?.find(p => p.id === dialogProfile);
        const autoTitle = `${profile?.name || 'ComfyUI'} - ${new Date().toLocaleString()}`;
        createMutation.mutate({ profileId: dialogProfile, title: autoTitle });
    };

    const handleStartRename = (session: ComfyUISession) => {
        setEditingId(session.id);
        setEditingName(session.title);
    };

    const handleSaveRename = () => {
        if (!editingId || !editingName.trim()) return;
        updateMutation.mutate({ id: editingId, title: editingName.trim() });
    };

    const handleCancelRename = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleReuseSettings = (params: GenerationParameters) => {
        setParameters(params);
        toast.success('Settings loaded');
    };

    const isPolling = pollingIds.size > 0;

    return (
        <div className="min-h-screen flex flex-col">
            <Header title="ComfyUI" subtitle="Generate images with Stable Diffusion" />

            <div className="flex-1 flex p-8 gap-6 max-h-[calc(100vh-4rem)]">
                {/* Sessions Sidebar */}
                <div className="w-64 flex-shrink-0 flex flex-col">
                    <div className="card flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Sessions</h3>
                            <button
                                onClick={() => setShowNewModal(true)}
                                className="btn-primary p-2"
                                title="New Session"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1">
                            {sessions?.map((session) => (
                                <div
                                    key={session.id}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group ${selectedSession === session.id
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'hover:bg-white/5'
                                        }`}
                                    onClick={() => editingId !== session.id && setSelectedSession(session.id)}
                                >
                                    {editingId === session.id ? (
                                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveRename();
                                                    if (e.key === 'Escape') handleCancelRename();
                                                }}
                                                className="input text-sm py-1 flex-1"
                                                autoFocus
                                            />
                                            <button onClick={handleSaveRename} className="p-1 hover:bg-green-500/20 rounded">
                                                <Check className="w-3 h-3 text-green-400" />
                                            </button>
                                            <button onClick={handleCancelRename} className="p-1 hover:bg-red-500/20 rounded">
                                                <X className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Image className="w-4 h-4 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="truncate text-sm block">{session.title}</span>
                                                    {(session.generation_count > 0 || session.completed_count > 0) && (
                                                        <span className="text-xs text-[var(--text-secondary)]">
                                                            {session.completed_count || 0} images
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartRename(session);
                                                    }}
                                                    className="p-1 hover:bg-indigo-500/20 rounded"
                                                    title="Rename"
                                                >
                                                    <Edit2 className="w-3 h-3 text-indigo-400" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteMutation.mutate(session.id);
                                                    }}
                                                    className="p-1 hover:bg-red-500/20 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {(!sessions || sessions.length === 0) && (
                                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                                    No sessions yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {!selectedSession ? (
                        <div className="flex-1 card flex items-center justify-center">
                            <div className="text-center text-[var(--text-secondary)]">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Click + to create a new session</p>
                                <p className="text-sm mt-2">Select a ComfyUI profile to start generating images</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Session Info Header */}
                            <div className="flex items-center gap-4 mb-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-sm text-[var(--text-secondary)]">
                                    <strong className="text-white">{sessionData?.profile_name || 'Profile'}</strong>
                                    {sessionData?.profile_url && (
                                        <span className="ml-2 text-indigo-400">→ {sessionData.profile_url}</span>
                                    )}
                                </span>
                                {isPolling && (
                                    <span className="flex items-center gap-2 text-sm text-yellow-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </span>
                                )}
                            </div>

                            {/* Two-Column Layout: Generation Panel + History */}
                            <div className="flex-1 flex gap-6 min-h-0">
                                {/* Left Column: Generation Panel */}
                                <div className="w-[450px] flex-shrink-0">
                                    <GenerationPanel
                                        workflows={workflows || []}
                                        selectedWorkflowId={selectedWorkflowId}
                                        onSelectWorkflow={setSelectedWorkflowId}
                                        parameters={parameters}
                                        onChangeParameters={setParameters}
                                        checkpoints={options?.checkpoints}
                                        prompt={prompt}
                                        negativePrompt={negativePrompt}
                                        onChangePrompt={setPrompt}
                                        onChangeNegativePrompt={setNegativePrompt}
                                        onSubmit={handleSubmit}
                                        isGenerating={generateMutation.isPending}
                                        settingsCollapsed={settingsCollapsed}
                                        onToggleSettingsCollapse={() => setSettingsCollapsed(!settingsCollapsed)}
                                    />
                                </div>

                                {/* Right Column: Generation History */}
                                <div className="flex-1 min-w-0">
                                    <GenerationHistory
                                        generations={sessionData?.generations || []}
                                        onReuseSettings={handleReuseSettings}
                                        onViewWorkflow={setViewingWorkflowId}
                                        isPolling={isPolling}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* New Session Modal */}
                {showNewModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="card w-96">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">New Session</h3>
                                <button onClick={() => setShowNewModal(false)}>
                                    <X className="w-5 h-5 text-[var(--text-secondary)]" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                        ComfyUI Profile
                                    </label>
                                    <select
                                        value={dialogProfile}
                                        onChange={(e) => setDialogProfile(e.target.value)}
                                        className="input w-full"
                                    >
                                        <option value="">Select profile...</option>
                                        {profiles?.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    {(!profiles || profiles.length === 0) && (
                                        <p className="text-sm text-yellow-400 mt-2">
                                            No ComfyUI profiles found. Create one in the Profiles page first.
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowNewModal(false)} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateSession}
                                        disabled={!dialogProfile || createMutation.isPending}
                                        className="btn-primary disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Workflow JSON Viewer Modal */}
                {viewingWorkflowId && (
                    <WorkflowJSONViewer
                        generationId={viewingWorkflowId}
                        onClose={() => setViewingWorkflowId(null)}
                    />
                )}
            </div>
        </div>
    );
}
