import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { resultsApi } from '../services/api';
import { Download, Trash2, FileText, Image, Video, Music, RefreshCw } from 'lucide-react';
import type { Result } from '../types';

const typeIcons = {
    text: FileText,
    image: Image,
    video: Video,
    audio: Music,
};

export default function Results() {
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['results'],
        queryFn: () => resultsApi.list(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => resultsApi.delete(id),
        onSuccess: () => {
            toast.success('Result deleted');
            queryClient.invalidateQueries({ queryKey: ['results'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const results: Result[] = data?.data || [];

    return (
        <div className="min-h-screen">
            <Header title="Results" subtitle="View and download generated content" />

            <div className="p-8">
                {/* Toolbar */}
                <div className="flex items-center justify-end mb-6">
                    <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        No results yet. Complete some tasks to see results here.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.map((result) => {
                            const Icon = typeIcons[result.type] || FileText;

                            return (
                                <div key={result.id} className="card">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-indigo-500/10">
                                            <Icon className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h4 className="font-semibold">{result.task_name || 'Unknown Task'}</h4>
                                                    <p className="text-sm text-[var(--text-secondary)]">
                                                        {result.task_provider} • {result.type} • {new Date(result.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a
                                                        href={resultsApi.downloadUrl(result.id)}
                                                        download
                                                        className="btn-secondary p-2"
                                                        title="Download"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        onClick={() => deleteMutation.mutate(result.id)}
                                                        className="btn-secondary p-2 hover:bg-red-500/10"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Content Preview */}
                                            {result.type === 'text' && (
                                                <div className="bg-[var(--bg-darker)] rounded-lg p-4 mt-3">
                                                    <pre className="text-sm whitespace-pre-wrap font-mono">
                                                        {result.content.slice(0, 500)}
                                                        {result.content.length > 500 && '...'}
                                                    </pre>
                                                </div>
                                            )}

                                            {result.type === 'image' && result.content && (
                                                <div className="mt-3">
                                                    <img
                                                        src={resultsApi.downloadUrl(result.id)}
                                                        alt="Generated"
                                                        className="max-w-md rounded-lg"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
