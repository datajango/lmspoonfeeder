import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { Plus, Play, Trash2, Edit2, X, Loader2, Image, Clock } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    profile_id?: string;
    workflow_json: string;
    created_at: string;
}

interface Generation {
    id: string;
    workflow_id: string;
    prompt_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    outputs: Array<{ filename: string; subfolder: string; type: string }>;
    error?: string;
    created_at: string;
}

// API functions
const fetchWorkflows = async (): Promise<Workflow[]> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows`);
    const data = await res.json();
    return data.data;
};

const createWorkflow = async (data: { name: string; description?: string; workflowJson: string }): Promise<Workflow> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

const deleteWorkflow = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
};

const executeWorkflow = async (id: string): Promise<Generation> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows/${id}/execute`, { method: 'POST' });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

const fetchGeneration = async (id: string): Promise<Generation> => {
    const res = await fetch(`${API_BASE}/comfyui/generations/${id}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export default function ComfyUI() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', workflowJson: '' });
    const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
    const [polling, setPolling] = useState(false);

    const { data: workflows, isLoading } = useQuery({
        queryKey: ['comfyui-workflows'],
        queryFn: fetchWorkflows,
    });

    const createMutation = useMutation({
        mutationFn: createWorkflow,
        onSuccess: () => {
            toast.success('Workflow created');
            setShowForm(false);
            setForm({ name: '', description: '', workflowJson: '' });
            queryClient.invalidateQueries({ queryKey: ['comfyui-workflows'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteWorkflow,
        onSuccess: () => {
            toast.success('Workflow deleted');
            queryClient.invalidateQueries({ queryKey: ['comfyui-workflows'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const executeMutation = useMutation({
        mutationFn: executeWorkflow,
        onSuccess: (generation) => {
            toast.success('Execution started');
            setCurrentGeneration(generation);
            pollGeneration(generation.id);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const pollGeneration = async (id: string) => {
        setPolling(true);
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds max

        const poll = async () => {
            try {
                const gen = await fetchGeneration(id);
                setCurrentGeneration(gen);

                if (gen.status === 'completed') {
                    setPolling(false);
                    toast.success('Generation complete!');
                } else if (gen.status === 'failed') {
                    setPolling(false);
                    toast.error(`Generation failed: ${gen.error}`);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 1000);
                } else {
                    setPolling(false);
                    toast.error('Generation timed out');
                }
            } catch {
                setPolling(false);
            }
        };

        poll();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.workflowJson) {
            toast.error('Name and workflow JSON are required');
            return;
        }
        createMutation.mutate(form);
    };

    return (
        <div className="min-h-screen">
            <Header title="ComfyUI" subtitle="Manage and execute image generation workflows" />

            <div className="p-8">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Workflow
                    </button>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">New Workflow</h3>
                            <button onClick={() => setShowForm(false)}>
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="input"
                                        placeholder="My Workflow"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="input"
                                        placeholder="Optional description"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                    Workflow JSON (export from ComfyUI)
                                </label>
                                <textarea
                                    value={form.workflowJson}
                                    onChange={(e) => setForm({ ...form, workflowJson: e.target.value })}
                                    className="input min-h-48 font-mono text-xs"
                                    placeholder='{"1": {"class_type": "KSampler", ...}}'
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="btn-primary flex items-center gap-2"
                            >
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create Workflow
                            </button>
                        </form>
                    </div>
                )}

                {/* Workflows Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        </div>
                    ) : workflows?.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No workflows yet. Create one to get started!</p>
                        </div>
                    ) : (
                        workflows?.map((wf) => (
                            <div key={wf.id} className="card">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold">{wf.name}</h4>
                                        {wf.description && (
                                            <p className="text-sm text-[var(--text-secondary)]">{wf.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => executeMutation.mutate(wf.id)}
                                            disabled={executeMutation.isPending || polling}
                                            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                                            title="Execute"
                                        >
                                            {(executeMutation.isPending || polling) ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                                            ) : (
                                                <Play className="w-4 h-4 text-green-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteMutation.mutate(wf.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                    Created: {new Date(wf.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Current Generation Results */}
                {currentGeneration && (
                    <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            {polling && <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />}
                            Generation Results
                            <span className={`text-sm px-2 py-1 rounded ${currentGeneration.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                    currentGeneration.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {currentGeneration.status}
                            </span>
                        </h3>
                        {currentGeneration.status === 'completed' && currentGeneration.outputs.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {currentGeneration.outputs.map((output, i) => (
                                    <div key={i} className="card p-2">
                                        <img
                                            src={`${API_BASE}/comfyui/image/${output.filename}?subfolder=${output.subfolder}&type=${output.type}`}
                                            alt={output.filename}
                                            className="w-full rounded-lg"
                                        />
                                        <p className="text-xs text-center mt-2 text-[var(--text-secondary)] truncate">
                                            {output.filename}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {currentGeneration.status === 'failed' && (
                            <div className="card bg-red-500/10 text-red-400">
                                {currentGeneration.error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
