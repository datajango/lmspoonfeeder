import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { modelsApi } from '../services/api';
import { Cpu, Play, Square, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { Model } from '../types';

export default function Models() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['models'],
        queryFn: () => modelsApi.list(),
    });

    const loadMutation = useMutation({
        mutationFn: (name: string) => modelsApi.load(name),
        onSuccess: () => {
            toast.success('Model loading started');
            queryClient.invalidateQueries({ queryKey: ['models'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const unloadMutation = useMutation({
        mutationFn: (name: string) => modelsApi.unload(name),
        onSuccess: () => {
            toast.success('Model unloaded');
            queryClient.invalidateQueries({ queryKey: ['models'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const models: Model[] = data?.data || [];
    const filtered = models.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen">
            <Header title="Models" subtitle="Manage Ollama models" />

            <div className="p-8">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pl-10 w-80"
                        />
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="card bg-red-500/10 border-red-500/30 mb-6">
                        <p className="text-red-400">Failed to load models. Is Ollama running?</p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                )}

                {/* Models Grid */}
                {!isLoading && filtered.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        No models found. Make sure Ollama is running.
                    </div>
                )}

                <div className="grid gap-4">
                    {filtered.map((model) => (
                        <div key={model.name} className="card">
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setExpanded(expanded === model.name ? null : model.name)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-indigo-500/10">
                                        <Cpu className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{model.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {model.size} • {model.parameters || 'Unknown params'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`status-badge ${model.loaded ? 'status-connected' : 'status-disconnected'}`}>
                                        {model.loaded ? 'Loaded' : 'Unloaded'}
                                    </span>
                                    {expanded === model.name ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>

                            {expanded === model.name && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">Description</p>
                                            <p>{model.description || 'No description available'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">Capabilities</p>
                                            <div className="flex gap-2 mt-1">
                                                {model.capabilities?.map((cap) => (
                                                    <span key={cap} className="px-2 py-1 bg-[var(--bg-darker)] rounded text-xs">
                                                        {cap}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!model.loaded ? (
                                            <button
                                                onClick={() => loadMutation.mutate(model.name)}
                                                disabled={loadMutation.isPending}
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                <Play className="w-4 h-4" />
                                                Load Model
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => unloadMutation.mutate(model.name)}
                                                disabled={unloadMutation.isPending}
                                                className="btn-secondary flex items-center gap-2"
                                            >
                                                <Square className="w-4 h-4" />
                                                Unload Model
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
