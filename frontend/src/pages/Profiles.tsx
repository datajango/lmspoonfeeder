import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { profilesApi } from '../services/api';
import { Plus, Edit, Trash2, X, Check, Loader2, BookmarkCheck } from 'lucide-react';
import type { Profile, TaskType, TaskProvider } from '../types';

const taskTypes: TaskType[] = ['text', 'image', 'video', 'audio'];
const providers: TaskProvider[] = ['ollama', 'openai', 'gemini', 'claude'];

export default function Profiles() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Profile | null>(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        type: 'text' as TaskType,
        provider: 'ollama' as TaskProvider,
        promptTemplate: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: () => profilesApi.list(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => profilesApi.create(data),
        onSuccess: () => {
            toast.success('Profile created');
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

    const profiles: Profile[] = data?.data || [];

    const resetForm = () => {
        setShowForm(false);
        setEditing(null);
        setForm({ name: '', description: '', type: 'text', provider: 'ollama', promptTemplate: '' });
    };

    const handleEdit = (profile: Profile) => {
        setEditing(profile);
        setForm({
            name: profile.name,
            description: profile.description || '',
            type: profile.type,
            provider: profile.provider,
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
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    return (
        <div className="min-h-screen">
            <Header title="Profiles" subtitle="Save and reuse task configurations" />

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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Type</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}
                                        className="input"
                                    >
                                        {taskTypes.map((t) => (
                                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Provider</label>
                                    <select
                                        value={form.provider}
                                        onChange={(e) => setForm({ ...form, provider: e.target.value as TaskProvider })}
                                        className="input"
                                    >
                                        {providers.map((p) => (
                                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
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
                                                {profile.provider} • {profile.type}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {profile.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mb-3">{profile.description}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(profile)}
                                        className="btn-secondary flex items-center gap-1 text-sm py-1.5"
                                    >
                                        <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                        onClick={() => deleteMutation.mutate(profile.id)}
                                        className="btn-secondary flex items-center gap-1 text-sm py-1.5 hover:bg-red-500/10 hover:border-red-500/30"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
