import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Header from '../components/layout/Header';
import { tasksApi } from '../services/api';
import { Download, RefreshCw } from 'lucide-react';
import type { Task } from '../types';

export default function History() {
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        provider: '',
        page: 1,
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['history', filters],
        queryFn: () => tasksApi.history(Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v)
        ) as Record<string, string>),
    });

    const tasks: Task[] = data?.data || [];
    const pagination = data?.pagination;

    const handleExport = async () => {
        window.open('/api/tasks/history/export?format=csv', '_blank');
    };

    return (
        <div className="min-h-screen">
            <Header title="History" subtitle="View past completed and failed tasks" />

            <div className="p-8">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="input w-40"
                    >
                        <option value="">All Status</option>
                        <option value="complete">Completed</option>
                        <option value="failed">Failed</option>
                    </select>

                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                        className="input w-40"
                    >
                        <option value="">All Types</option>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                    </select>

                    <select
                        value={filters.provider}
                        onChange={(e) => setFilters({ ...filters, provider: e.target.value, page: 1 })}
                        className="input w-40"
                    >
                        <option value="">All Providers</option>
                        <option value="ollama">Ollama</option>
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Gemini</option>
                        <option value="claude">Claude</option>
                    </select>

                    <div className="flex-1" />

                    <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>

                    <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>

                {/* Task List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        No history found.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <div key={task.id} className="card flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">{task.name}</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {task.provider} • {task.type} • {new Date(task.created_at).toLocaleString()}
                                    </p>
                                    {task.error && (
                                        <p className="text-sm text-red-400 mt-1">{task.error}</p>
                                    )}
                                </div>
                                <span className={`status-badge status-${task.status}`}>{task.status}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                            disabled={filters.page <= 1}
                            className="btn-secondary"
                        >
                            Previous
                        </button>
                        <span className="text-[var(--text-secondary)]">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                            disabled={filters.page >= pagination.totalPages}
                            className="btn-secondary"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
