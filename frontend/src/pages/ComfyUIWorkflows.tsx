import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import type { ComfyUIWorkflow } from '../types/comfyui';
import { Plus, Trash2, Edit2, Eye, X, Save, Upload, Copy, Star, FileJson } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface Profile {
    id: string;
    name: string;
}

// API functions
const fetchWorkflows = async (): Promise<ComfyUIWorkflow[]> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows`);
    const data = await res.json();
    return data.data || [];
};

const fetchProfiles = async (): Promise<Profile[]> => {
    const res = await fetch(`${API_BASE}/profiles?provider=comfyui`);
    const data = await res.json();
    return data.data || [];
};

const createWorkflow = async (data: { name: string; description?: string; profileId?: string; workflowJson: string }): Promise<ComfyUIWorkflow> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

const updateWorkflow = async (data: { id: string; name: string; description?: string; profileId?: string; workflowJson?: string }): Promise<ComfyUIWorkflow> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: data.name,
            description: data.description,
            profileId: data.profileId,
            workflowJson: data.workflowJson,
        }),
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

const setDefaultWorkflow = async (id: string): Promise<ComfyUIWorkflow> => {
    const res = await fetch(`${API_BASE}/comfyui/workflows/${id}/parameters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
};

export default function ComfyUIWorkflows() {
    const [showModal, setShowModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<ComfyUIWorkflow | null>(null);
    const [viewingWorkflow, setViewingWorkflow] = useState<ComfyUIWorkflow | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [profileId, setProfileId] = useState('');
    const [workflowJson, setWorkflowJson] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Queries
    const { data: workflows, refetch: refetchWorkflows } = useQuery({
        queryKey: ['comfyui-workflows'],
        queryFn: fetchWorkflows,
    });

    const { data: profiles } = useQuery({
        queryKey: ['comfyui-profiles'],
        queryFn: fetchProfiles,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createWorkflow,
        onSuccess: () => {
            toast.success('Workflow created');
            closeModal();
            refetchWorkflows();
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateWorkflow,
        onSuccess: () => {
            toast.success('Workflow updated');
            closeModal();
            refetchWorkflows();
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteWorkflow,
        onSuccess: () => {
            toast.success('Workflow deleted');
            refetchWorkflows();
        },
        onError: (error: any) => toast.error(error.message),
    });

    const setDefaultMutation = useMutation({
        mutationFn: setDefaultWorkflow,
        onSuccess: () => {
            toast.success('Default workflow updated');
            refetchWorkflows();
        },
        onError: (error: any) => toast.error(error.message),
    });


    const openCreateModal = () => {
        setEditingWorkflow(null);
        setName('');
        setDescription('');
        setProfileId('');
        setWorkflowJson('');
        setJsonError(null);
        setShowModal(true);
    };

    const openEditModal = (workflow: ComfyUIWorkflow) => {
        setEditingWorkflow(workflow);
        setName(workflow.name);
        setDescription(workflow.description || '');
        setProfileId(workflow.profile_id || '');
        setWorkflowJson(workflow.workflow_json);
        setJsonError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingWorkflow(null);
    };

    const validateJson = (json: string): boolean => {
        try {
            JSON.parse(json);
            setJsonError(null);
            return true;
        } catch (e: any) {
            setJsonError(e.message);
            return false;
        }
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }
        if (!workflowJson.trim()) {
            toast.error('Workflow JSON is required');
            return;
        }
        if (!validateJson(workflowJson)) {
            toast.error('Invalid JSON');
            return;
        }

        if (editingWorkflow) {
            updateMutation.mutate({
                id: editingWorkflow.id,
                name: name.trim(),
                description: description.trim() || undefined,
                profileId: profileId || undefined,
                workflowJson,
            });
        } else {
            createMutation.mutate({
                name: name.trim(),
                description: description.trim() || undefined,
                profileId: profileId || undefined,
                workflowJson,
            });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setWorkflowJson(content);
            validateJson(content);
            // Auto-fill name from filename if empty
            if (!name) {
                setName(file.name.replace(/\.json$/i, ''));
            }
        };
        reader.readAsText(file);
    };

    const copyJson = (json: string) => {
        navigator.clipboard.writeText(json);
        toast.success('Copied to clipboard');
    };

    const formatJson = () => {
        try {
            const parsed = JSON.parse(workflowJson);
            setWorkflowJson(JSON.stringify(parsed, null, 2));
            setJsonError(null);
        } catch (e: any) {
            setJsonError(e.message);
        }
    };

    return (
        <div className="min-h-screen">
            <Header title="ComfyUI Workflows" subtitle="Manage your ComfyUI workflow templates" />

            <div className="p-8">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-[var(--text-secondary)]">
                        {workflows?.length || 0} workflow{workflows?.length !== 1 ? 's' : ''} saved
                    </p>
                    <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Workflow
                    </button>
                </div>

                {/* Workflows Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workflows?.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="card hover:border-indigo-500/30 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {workflow.is_default && (
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    )}
                                    <h3 className="font-semibold text-white">{workflow.name}</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!workflow.is_default && (
                                        <button
                                            onClick={() => setDefaultMutation.mutate(workflow.id)}
                                            className="p-1.5 hover:bg-yellow-500/20 rounded-lg transition-colors"
                                            title="Set as Default"
                                            disabled={setDefaultMutation.isPending}
                                        >
                                            <Star className="w-4 h-4 text-yellow-400" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setViewingWorkflow(workflow)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        title="View JSON"
                                    >
                                        <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(workflow)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4 text-indigo-400" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete this workflow?')) {
                                                deleteMutation.mutate(workflow.id);
                                            }
                                        }}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>

                            {workflow.description && (
                                <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                                    {workflow.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                                <span>
                                    {workflow.generation_count > 0
                                        ? `${workflow.generation_count} generations`
                                        : 'No generations yet'}
                                </span>
                                <span>{new Date(workflow.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}

                    {(!workflows || workflows.length === 0) && (
                        <div className="col-span-full card text-center py-12">
                            <FileJson className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)] opacity-50" />
                            <p className="text-[var(--text-secondary)] mb-2">No workflows yet</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Add a workflow by exporting from ComfyUI and uploading the JSON
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
                    <div
                        className="bg-[var(--bg-card)] border border-white/10 rounded-xl w-[90vw] max-w-3xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold">
                                {editingWorkflow ? 'Edit Workflow' : 'Add Workflow'}
                            </h3>
                            <button onClick={closeModal} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full"
                                    placeholder="My Workflow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input w-full"
                                    placeholder="Optional description..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Profile</label>
                                <select
                                    value={profileId}
                                    onChange={(e) => setProfileId(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">No profile (use for all)</option>
                                    {profiles?.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm text-[var(--text-secondary)]">Workflow JSON *</label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors">
                                            <Upload className="w-3 h-3" />
                                            Upload
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        <button
                                            onClick={formatJson}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            Format
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={workflowJson}
                                    onChange={(e) => {
                                        setWorkflowJson(e.target.value);
                                        if (e.target.value) validateJson(e.target.value);
                                    }}
                                    className={`input w-full font-mono text-xs resize-none ${jsonError ? 'border-red-500' : ''}`}
                                    rows={12}
                                    placeholder='{"1": {"class_type": "KSampler", ...}}'
                                />
                                {jsonError && (
                                    <p className="text-xs text-red-400 mt-1">JSON Error: {jsonError}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
                            <button onClick={closeModal} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {editingWorkflow ? 'Save Changes' : 'Create Workflow'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View JSON Modal */}
            {viewingWorkflow && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setViewingWorkflow(null)}>
                    <div
                        className="bg-[var(--bg-card)] border border-white/10 rounded-xl w-[90vw] max-w-4xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold">{viewingWorkflow.name}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => copyJson(viewingWorkflow.workflow_json)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </button>
                                <button
                                    onClick={() => setViewingWorkflow(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <pre className="bg-[var(--bg-darker)] rounded-lg p-4 text-xs font-mono overflow-auto max-h-[60vh]">
                                {JSON.stringify(JSON.parse(viewingWorkflow.workflow_json), null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
