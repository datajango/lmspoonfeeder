import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import EmptyState from '../components/EmptyState';
import {
    GenerationPanel,
    GenerationHistory,
    WorkflowJSONViewer,
    SessionsSidebar,
    NewSessionModal,
    SessionHeader,
} from '../components/comfyui';
import {
    fetchComfyUIProfiles,
    fetchSessions,
    fetchSession,
    fetchWorkflows,
    fetchOptions,
    createSession,
    updateSession,
    deleteSession,
    generateWithParams,
    fetchGeneration,
    deleteGeneration,
} from '../api/comfyui';
import type {
    ComfyUISession,
    ComfyUIGeneration,
    GenerationParameters,
} from '../types/comfyui';
import { DEFAULT_GENERATION_PARAMETERS } from '../types/comfyui';
import { Sparkles } from 'lucide-react';

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
                if (data.last_parameters && Object.keys(data.last_parameters).length > 0) {
                    setParameters(prev => ({ ...prev, ...data.last_parameters }));
                }
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
            pollGeneration(generation.id);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const pollGeneration = useCallback(async (id: string) => {
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
    }, [selectedSession]);

    // Handlers
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

    const handleStartRename = (id: string, title: string) => {
        setEditingId(id);
        setEditingName(title);
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

    const handleDeleteGeneration = async (id: string) => {
        try {
            await deleteGeneration(id);
            toast.success('Generation deleted');
            // Refresh session data to update the list
            if (selectedSession) {
                fetchSession(selectedSession).then(setSessionData);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete generation');
        }
    };

    const isPolling = pollingIds.size > 0;

    return (
        <div className="min-h-screen flex flex-col">
            <Header title="ComfyUI" subtitle="Generate images with Stable Diffusion" />

            <div className="flex-1 flex p-8 gap-6 max-h-[calc(100vh-4rem)]">
                {/* Sessions Sidebar */}
                <SessionsSidebar
                    sessions={sessions || []}
                    selectedSession={selectedSession}
                    editingId={editingId}
                    editingName={editingName}
                    onSelectSession={setSelectedSession}
                    onStartEdit={handleStartRename}
                    onSaveEdit={handleSaveRename}
                    onCancelEdit={handleCancelRename}
                    onChangeName={setEditingName}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onCreateNew={() => setShowNewModal(true)}
                />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {!selectedSession ? (
                        <div className="flex-1 card">
                            <EmptyState
                                icon={Sparkles}
                                title="Click + to create a new session"
                                subtitle="Select a ComfyUI profile to start generating images"
                            />
                        </div>
                    ) : (
                        <>
                            {/* Session Info Header */}
                            <SessionHeader
                                profileName={sessionData?.profile_name}
                                profileUrl={sessionData?.profile_url}
                                isGenerating={isPolling}
                            />

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
                                        onDelete={handleDeleteGeneration}
                                        isPolling={isPolling}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* New Session Modal */}
                {showNewModal && (
                    <NewSessionModal
                        profiles={profiles || []}
                        selectedProfile={dialogProfile}
                        onChangeProfile={setDialogProfile}
                        onCreate={handleCreateSession}
                        onClose={() => setShowNewModal(false)}
                        isCreating={createMutation.isPending}
                    />
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
