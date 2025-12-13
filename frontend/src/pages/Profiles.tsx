import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { profilesApi } from '../services/api';
import { Plus, Edit, Trash2, X, Check, Loader2, BookmarkCheck, Eye, EyeOff, Key, Globe, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { Profile, TaskType, TaskProvider } from '../types';

const taskTypes: TaskType[] = ['text', 'image', 'video', 'audio'];
const inputModalities = ['text', 'image', 'audio', 'video'];
const outputModalities = ['text', 'image', 'audio', 'video'];
const localProviders: TaskProvider[] = ['ollama', 'comfyui'];
const remoteProviders: TaskProvider[] = ['openai', 'gemini', 'claude'];
const allProviders: TaskProvider[] = ['ollama', 'openai', 'gemini', 'claude', 'comfyui'];

const DEFAULT_URLS: Record<string, string> = {
    ollama: 'http://localhost:11434',
    openai: 'https://api.openai.com/v1',
    gemini: 'https://generativelanguage.googleapis.com',
    claude: 'https://api.anthropic.com',
    comfyui: 'http://localhost:8188',
};

export default function Profiles() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Profile | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
    const [profileModels, setProfileModels] = useState<Record<string, Array<{ id: string; name: string; inputModalities?: string[]; outputModalities?: string[] }>>>({});
    const [newModelId, setNewModelId] = useState('');
    const [isLocal, setIsLocal] = useState(true);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [formModels, setFormModels] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingFormModels, setLoadingFormModels] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        type: 'text' as TaskType,
        inputModalities: ['text'] as string[],
        outputModalities: ['text'] as string[],
        provider: 'ollama' as TaskProvider,
        apiKey: '',
        url: 'http://localhost:11434',
        promptTemplate: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: () => profilesApi.list(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => profilesApi.create(data),
        onSuccess: async (result) => {
            toast.success('Profile created');
            // Auto-sync models if formModels were loaded (for Ollama)
            if (formModels.length > 0 && result.data?.id) {
                try {
                    await profilesApi.syncModels(result.data.id);
                    toast.success(`Synced ${formModels.length} models`);
                } catch {
                    // Ignore sync errors
                }
            }
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => profilesApi.update(id, data),
        onSuccess: () => {
            toast.success('Profile updated');
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => profilesApi.delete(id),
        onSuccess: () => {
            toast.success('Profile deleted');
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const syncModelsMutation = useMutation({
        mutationFn: (profileId: string) => profilesApi.syncModels(profileId),
        onSuccess: (result, profileId) => {
            toast.success(result.message || 'Models synced');
            setProfileModels(prev => ({ ...prev, [profileId]: result.data }));
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteModelMutation = useMutation({
        mutationFn: ({ profileId, modelId }: { profileId: string; modelId: string }) =>
            profilesApi.deleteModel(profileId, modelId),
        onSuccess: (_, { profileId, modelId }) => {
            toast.success('Model removed');
            setProfileModels(prev => ({
                ...prev,
                [profileId]: (prev[profileId] || []).filter(m => m.id !== modelId),
            }));
        },
        onError: (error: any) => toast.error(error.message),
    });

    const addModelMutation = useMutation({
        mutationFn: ({ profileId, modelId }: { profileId: string; modelId: string }) =>
            profilesApi.addModel(profileId, modelId),
        onSuccess: (result, { profileId }) => {
            toast.success('Model added');
            setProfileModels(prev => ({
                ...prev,
                [profileId]: [...(prev[profileId] || []), result.data],
            }));
            setNewModelId('');
        },
        onError: (error: any) => toast.error(error.message),
    });

    const loadProfileModels = async (profileId: string) => {
        try {
            const result = await profilesApi.listModels(profileId);
            setProfileModels(prev => ({ ...prev, [profileId]: result.data }));
        } catch {
            // ignore
        }
    };

    const handleModelModalityToggle = async (
        profileId: string,
        modelId: string,
        type: 'input' | 'output',
        modality: string,
        currentModalities: string[]
    ) => {
        const newModalities = currentModalities.includes(modality)
            ? currentModalities.filter(m => m !== modality)
            : [...currentModalities, modality];

        try {
            await fetch(`/api/profiles/${profileId}/models/${encodeURIComponent(modelId)}/modalities`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputModalities: type === 'input' ? newModalities : undefined,
                    outputModalities: type === 'output' ? newModalities : undefined,
                }),
            });

            // Update local state
            setProfileModels(prev => ({
                ...prev,
                [profileId]: (prev[profileId] || []).map(m =>
                    m.id === modelId
                        ? {
                            ...m,
                            inputModalities: type === 'input' ? newModalities : m.inputModalities,
                            outputModalities: type === 'output' ? newModalities : m.outputModalities,
                        }
                        : m
                ),
            }));
        } catch {
            toast.error('Failed to update modalities');
        }
    };

    const handleExpandProfile = (profileId: string) => {
        if (expandedProfile === profileId) {
            setExpandedProfile(null);
        } else {
            setExpandedProfile(profileId);
            if (!profileModels[profileId]) {
                loadProfileModels(profileId);
            }
        }
    };

    const profiles: Profile[] = data?.data || [];

    const resetForm = () => {
        setShowForm(false);
        setEditing(null);
        setShowApiKey(false);
        setIsLocal(true);
        setTestResult(null);
        setFormModels([]);
        setForm({ name: '', description: '', type: 'text', inputModalities: ['text'], outputModalities: ['text'], provider: 'ollama', apiKey: '', url: 'http://localhost:11434', promptTemplate: '' });
    };

    const handleLocalToggle = (local: boolean) => {
        setIsLocal(local);
        const newProvider = local ? 'ollama' : 'openai';
        setForm(prev => ({
            ...prev,
            provider: newProvider,
            url: DEFAULT_URLS[newProvider],
            apiKey: '',
        }));
        setTestResult(null);
        setFormModels([]);
    };

    const handleProviderChange = (provider: TaskProvider) => {
        setForm(prev => ({
            ...prev,
            provider,
            url: DEFAULT_URLS[provider] || '',
        }));
        setTestResult(null);
        setFormModels([]);
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await profilesApi.testConnection(form.provider, form.apiKey || undefined, form.url || undefined);
            setTestResult(result);
        } catch (e: any) {
            setTestResult({ success: false, message: e.message });
        }
        setTesting(false);
    };

    const handleLoadFormModels = async () => {
        setLoadingFormModels(true);
        try {
            // For new profiles, we need to test first then fetch models directly
            if (form.provider === 'ollama') {
                const baseUrl = form.url || 'http://localhost:11434';
                const res = await fetch(`${baseUrl}/api/tags`);
                if (res.ok) {
                    const data = await res.json();
                    setFormModels(data.models?.map((m: any) => ({ id: m.name, name: m.name })) || []);
                    toast.success(`Loaded ${data.models?.length || 0} models`);
                }
            } else {
                toast('Save the profile first, then sync models');
            }
        } catch {
            toast.error('Failed to load models');
        }
        setLoadingFormModels(false);
    };

    const handleEdit = (profile: Profile) => {
        setEditing(profile);
        setForm({
            name: profile.name,
            description: profile.description || '',
            type: profile.type,
            inputModalities: ['text'], // Default for existing profiles
            outputModalities: ['text'],
            provider: profile.provider,
            apiKey: '', // Don't populate - user can enter new key if they want to change it
            url: profile.url || '',
            promptTemplate: profile.prompt_template || '',
        });
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) {
            toast.error('Name is required');
            return;
        }
        const submitData: any = {
            name: form.name,
            description: form.description,
            type: form.type,
            inputModalities: form.inputModalities,
            outputModalities: form.outputModalities,
            provider: form.provider,
            url: form.url,
            promptTemplate: form.promptTemplate,
        };
        // Only include apiKey if user entered one
        if (form.apiKey) {
            submitData.apiKey = form.apiKey;
        }
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    return (
        <div className="min-h-screen">
            <Header title="Profiles" subtitle="Save and reuse task configurations with optional API credentials" />

            <div className="p-8">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Profile
                    </button>
                </div>

                {/* Form */}
                {showForm && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                {editing ? 'Edit Profile' : 'Create Profile'}
                            </h3>
                            <button onClick={resetForm}>
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Local/Remote Toggle */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => handleLocalToggle(true)}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${isLocal
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                        : 'border-white/10 text-[var(--text-secondary)] hover:bg-white/5'
                                        }`}
                                >
                                    🖥️ Local
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleLocalToggle(false)}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${!isLocal
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                        : 'border-white/10 text-[var(--text-secondary)] hover:bg-white/5'
                                        }`}
                                >
                                    ☁️ Remote
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="input"
                                        placeholder="My Profile"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Provider</label>
                                    <select
                                        value={form.provider}
                                        onChange={(e) => handleProviderChange(e.target.value as TaskProvider)}
                                        className="input"
                                    >
                                        {(isLocal ? localProviders : remoteProviders).map((p) => (
                                            <option key={p} value={p}>
                                                {p === 'comfyui' ? 'ComfyUI' : p.charAt(0).toUpperCase() + p.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                        URL
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                        <input
                                            type="text"
                                            value={form.url}
                                            onChange={(e) => setForm({ ...form, url: e.target.value })}
                                            className="input pl-10"
                                            placeholder={DEFAULT_URLS[form.provider]}
                                        />
                                    </div>
                                </div>
                                {!isLocal && (
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                            API Key
                                        </label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                                            <input
                                                type={showApiKey ? 'text' : 'password'}
                                                value={form.apiKey}
                                                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                                className="input pl-10 pr-10"
                                                placeholder={editing?.api_key ? '••••••••' : 'Enter API key'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                {showApiKey ? (
                                                    <EyeOff className="w-4 h-4 text-[var(--text-secondary)]" />
                                                ) : (
                                                    <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Test & Load Buttons */}
                            <div className="flex gap-3 items-center">
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Test Connection
                                </button>
                                {isLocal && (
                                    <button
                                        type="button"
                                        onClick={handleLoadFormModels}
                                        disabled={loadingFormModels}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        {loadingFormModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Load Models
                                    </button>
                                )}
                                {testResult && (
                                    <span className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {testResult.message}
                                    </span>
                                )}
                            </div>

                            {/* Loaded Models Preview */}
                            {formModels.length > 0 && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                    <p className="text-sm text-[var(--text-secondary)] mb-2">Found {formModels.length} models:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formModels.slice(0, 10).map(m => (
                                            <span key={m.id} className="px-2 py-1 text-xs rounded bg-indigo-500/20 text-indigo-400">
                                                {m.name}
                                            </span>
                                        ))}
                                        {formModels.length > 10 && (
                                            <span className="px-2 py-1 text-xs rounded bg-white/10 text-[var(--text-secondary)]">
                                                +{formModels.length - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

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

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Prompt Template</label>
                                <textarea
                                    value={form.promptTemplate}
                                    onChange={(e) => setForm({ ...form, promptTemplate: e.target.value })}
                                    className="input min-h-24"
                                    placeholder="Optional default prompt..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="btn-primary flex items-center gap-2"
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {editing ? 'Update' : 'Create'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Profiles List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        No profiles yet. Create your first profile!
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {profiles.map((profile) => (
                            <div key={profile.id} className="card">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10">
                                            <BookmarkCheck className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{profile.name}</h4>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {profile.provider === 'comfyui' ? 'ComfyUI' : profile.provider} • {profile.type}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {profile.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mb-2">{profile.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                                    {profile.api_key && (
                                        <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 flex items-center gap-1">
                                            <Key className="w-3 h-3" /> API Key: {profile.api_key}
                                        </span>
                                    )}
                                    {profile.url && (
                                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> URL configured
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(profile)}
                                        className="btn-secondary flex items-center gap-1 text-sm py-1.5"
                                    >
                                        <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleExpandProfile(profile.id)}
                                        className="btn-secondary flex items-center gap-1 text-sm py-1.5"
                                    >
                                        {expandedProfile === profile.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        Models
                                    </button>
                                    <button
                                        onClick={() => deleteMutation.mutate(profile.id)}
                                        className="btn-secondary flex items-center gap-1 text-sm py-1.5 hover:bg-red-500/10 hover:border-red-500/30"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>

                                {/* Models Section */}
                                {expandedProfile === profile.id && (
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-sm font-medium">Models</h5>
                                            <button
                                                onClick={() => syncModelsMutation.mutate(profile.id)}
                                                disabled={syncModelsMutation.isPending}
                                                className="btn-secondary flex items-center gap-1 text-xs py-1"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${syncModelsMutation.isPending ? 'animate-spin' : ''}`} />
                                                Sync from API
                                            </button>
                                        </div>

                                        {/* Models List */}
                                        <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                                            {(profileModels[profile.id] || []).length === 0 ? (
                                                <p className="text-xs text-[var(--text-secondary)]">No models. Click "Sync from API" to fetch available models.</p>
                                            ) : (
                                                (profileModels[profile.id] || []).map(model => (
                                                    <div key={model.id} className="py-2 px-3 rounded bg-white/5">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium truncate">{model.name}</span>
                                                            <button
                                                                onClick={() => deleteModelMutation.mutate({ profileId: profile.id, modelId: model.id })}
                                                                className="p-1 hover:bg-red-500/20 rounded"
                                                                title="Remove model"
                                                            >
                                                                <X className="w-3 h-3 text-red-400" />
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-[var(--text-secondary)]">In: </span>
                                                                {inputModalities.map(m => (
                                                                    <span
                                                                        key={m}
                                                                        onClick={() => handleModelModalityToggle(profile.id, model.id, 'input', m, model.inputModalities || ['text'])}
                                                                        className={`inline-block px-1.5 py-0.5 rounded cursor-pointer mr-1 ${(model.inputModalities || ['text']).includes(m)
                                                                            ? 'bg-indigo-500/30 text-indigo-400'
                                                                            : 'bg-white/10 text-[var(--text-secondary)] hover:bg-white/20'}`}
                                                                    >
                                                                        {m.charAt(0).toUpperCase()}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <span className="text-[var(--text-secondary)]">Out: </span>
                                                                {outputModalities.map(m => (
                                                                    <span
                                                                        key={m}
                                                                        onClick={() => handleModelModalityToggle(profile.id, model.id, 'output', m, model.outputModalities || ['text'])}
                                                                        className={`inline-block px-1.5 py-0.5 rounded cursor-pointer mr-1 ${(model.outputModalities || ['text']).includes(m)
                                                                            ? 'bg-green-500/30 text-green-400'
                                                                            : 'bg-white/10 text-[var(--text-secondary)] hover:bg-white/20'}`}
                                                                    >
                                                                        {m.charAt(0).toUpperCase()}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Add Model Form */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newModelId}
                                                onChange={(e) => setNewModelId(e.target.value)}
                                                className="input text-sm py-1.5 flex-1"
                                                placeholder="Add model ID manually..."
                                            />
                                            <button
                                                onClick={() => newModelId && addModelMutation.mutate({ profileId: profile.id, modelId: newModelId })}
                                                disabled={!newModelId || addModelMutation.isPending}
                                                className="btn-primary text-sm py-1.5 px-3"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

