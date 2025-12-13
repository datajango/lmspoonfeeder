import type { ComfyUIGeneration, GenerationParameters } from '../../types/comfyui';
import { RefreshCw, Copy, FileJson, Clock, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:3001/api';

interface GenerationCardProps {
    generation: ComfyUIGeneration;
    onReuseSettings: (params: GenerationParameters) => void;
    onViewWorkflow?: (id: string) => void;
}

export default function GenerationCard({
    generation,
    onReuseSettings,
    onViewWorkflow,
}: GenerationCardProps) {
    const copySeed = () => {
        if (generation.seed) {
            navigator.clipboard.writeText(generation.seed.toString());
            toast.success('Seed copied to clipboard');
        }
    };

    const formatTime = (seconds?: number) => {
        if (!seconds) return null;
        return seconds < 60
            ? `${seconds.toFixed(1)}s`
            : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
    };

    const getImageUrl = (output: { filename: string; subfolder: string; type: string }) => {
        return `${API_BASE}/comfyui/image/${output.filename}?subfolder=${output.subfolder}&type=${output.type}`;
    };

    const isComplete = generation.status === 'completed' && generation.outputs.length > 0;
    const isFailed = generation.status === 'failed';
    const isRunning = generation.status === 'running' || generation.status === 'pending';

    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            {/* Prompt Display */}
            <div>
                <p className="text-sm">
                    <span className="text-indigo-400">📝</span>{' '}
                    <span className="text-white">{generation.prompt_text}</span>
                </p>
                {generation.negative_prompt && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        <span className="text-red-400/70">negative:</span> {generation.negative_prompt}
                    </p>
                )}
            </div>

            {/* Image Display */}
            {isComplete && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {generation.outputs.map((output, i) => (
                        <div key={i} className="relative group">
                            <img
                                src={getImageUrl(output)}
                                alt={output.filename}
                                className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                loading="lazy"
                            />
                            <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {output.filename}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading State */}
            {isRunning && (
                <div className="flex items-center justify-center py-8 bg-[var(--bg-darker)] rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <span className="text-sm text-[var(--text-secondary)]">Generating...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {isFailed && (
                <div className="flex items-center gap-2 py-4 px-3 bg-red-500/10 rounded-lg text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{generation.error || 'Generation failed'}</span>
                </div>
            )}

            {/* Parameter Summary */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                {generation.seed && (
                    <span>seed: <span className="text-white">{generation.seed}</span></span>
                )}
                {generation.steps && (
                    <span>steps: <span className="text-white">{generation.steps}</span></span>
                )}
                {generation.cfg_scale && (
                    <span>cfg: <span className="text-white">{generation.cfg_scale}</span></span>
                )}
                {generation.width && generation.height && (
                    <span><span className="text-white">{generation.width}×{generation.height}</span></span>
                )}
                {generation.sampler_name && (
                    <span><span className="text-white">{generation.sampler_name}</span></span>
                )}
                {generation.generation_time_seconds && (
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-white">{formatTime(generation.generation_time_seconds)}</span>
                    </span>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                    onClick={() => onReuseSettings(generation.parameters)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-3 h-3" />
                    Reuse Settings
                </button>
                <button
                    onClick={copySeed}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    disabled={!generation.seed}
                >
                    <Copy className="w-3 h-3" />
                    Copy Seed
                </button>
                {onViewWorkflow && generation.workflow_json_snapshot && (
                    <button
                        onClick={() => onViewWorkflow(generation.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <FileJson className="w-3 h-3" />
                        View JSON
                    </button>
                )}
                <span className="ml-auto text-xs text-[var(--text-secondary)]">
                    {new Date(generation.created_at).toLocaleTimeString()}
                </span>
            </div>
        </div>
    );
}
