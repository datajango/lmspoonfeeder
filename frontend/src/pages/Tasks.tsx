import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { tasksApi } from '../services/api';
import { Plus, Send, RefreshCw, X, Trash2 } from 'lucide-react';
import type { Task, TaskType, TaskProvider } from '../types';

const taskTypes: TaskType[] = ['text', 'image', 'video', 'audio'];
const providers: TaskProvider[] = ['ollama', 'openai', 'gemini', 'claude'];

export default function Tasks() {
    const queryClient = useQueryClient();
    const [showCreator, setShowCreator] = useState(false);
    const [form, setForm] = useState({
        name: '',
        type: 'text' as TaskType,
        provider: 'ollama' as TaskProvider,
        prompt: '',
    });

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => tasksApi.list(),
        refetchInterval: 5000,
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof form) => tasksApi.create(data),
        onSuccess: () => {
            toast.success('Task created');
            setShowCreator(false);
            setForm({ name: '', type: 'text', provider: 'ollama', prompt: '' });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => tasksApi.delete(id),
        onSuccess: () => {
            toast.success('Task deleted');
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const retryMutation = useMutation({
        mutationFn: (id: string) => tasksApi.retry(id),
        onSuccess: () => {
            toast.success('Task queued for retry');
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const taskList: Task[] = tasks?.data || [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.prompt) {
            toast.error('Name and prompt are required');
            return;
        }
        createMutation.mutate(form);
    };

    return (
        <div className="min-h-screen">
            <Header title="Tasks" subtitle="Create and manage generation tasks" />

            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setShowCreator(!showCreator)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                </div>

                {showCreator && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Create New Task</h3>
                            <button onClick={() => setShowCreator(false)}>
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Task Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="input"
                                        placeholder="My task"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Content Type</label>
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

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Prompt</label>
                                <textarea
                                    value={form.prompt}
                                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                                    className="input min-h-32"
                                    placeholder="Enter your prompt..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                {createMutation.isPending ? 'Creating...' : 'Create Task'}
                            </button>
                        </form>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                ) : taskList.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        No tasks yet. Create your first task above!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {taskList.map((task) => (
                            <div key={task.id} className="card flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h4 className="font-medium">{task.name}</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {task.provider} • {task.type} • {new Date(task.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {task.progress !== undefined && task.status === 'running' && (
                                        <div className="w-24 h-2 bg-[var(--bg-darker)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 transition-all"
                                                style={{ width: `${task.progress}%` }}
                                            />
                                        </div>
                                    )}
                                    <span className={`status-badge status-${task.status}`}>{task.status}</span>
                                    {task.status === 'failed' && (
                                        <button
                                            onClick={() => retryMutation.mutate(task.id)}
                                            className="p-2 hover:bg-white/5 rounded-lg"
                                            title="Retry"
                                        >
                                            <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                                        </button>
                                    )}
                                    {task.status !== 'running' && (
                                        <button
                                            onClick={() => deleteMutation.mutate(task.id)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
