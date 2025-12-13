import type { GenerationParameters } from '../../types/comfyui';
import {
    DEFAULT_GENERATION_PARAMETERS,
    SAMPLER_OPTIONS,
    SCHEDULER_OPTIONS,
    DIMENSION_OPTIONS,
} from '../../types/comfyui';
import { ChevronDown, ChevronUp, Shuffle, Settings2 } from 'lucide-react';

interface ParameterPanelProps {
    parameters: Partial<GenerationParameters>;
    onChange: (params: Partial<GenerationParameters>) => void;
    checkpoints?: string[];
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function ParameterPanel({
    parameters,
    onChange,
    checkpoints = [],
    collapsed = false,
    onToggleCollapse,
}: ParameterPanelProps) {
    // Merge with defaults
    const params = { ...DEFAULT_GENERATION_PARAMETERS, ...parameters };

    const handleChange = (field: keyof GenerationParameters, value: any) => {
        onChange({ ...parameters, [field]: value });
    };

    const randomizeSeed = () => {
        handleChange('seed', Math.floor(Math.random() * 2147483647));
    };


    if (collapsed) {
        return (
            <div
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                onClick={onToggleCollapse}
            >
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium">Generation Settings</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                        {params.width}×{params.height} • {params.steps} steps • CFG {params.cfg_scale}
                    </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={onToggleCollapse}
            >
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium">Generation Settings</span>
                </div>
                {onToggleCollapse && (
                    <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Width */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Width</label>
                    <select
                        value={params.width}
                        onChange={(e) => handleChange('width', parseInt(e.target.value))}
                        className="input w-full text-sm"
                    >
                        {DIMENSION_OPTIONS.map((dim) => (
                            <option key={dim} value={dim}>{dim}</option>
                        ))}
                    </select>
                </div>

                {/* Height */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Height</label>
                    <select
                        value={params.height}
                        onChange={(e) => handleChange('height', parseInt(e.target.value))}
                        className="input w-full text-sm"
                    >
                        {DIMENSION_OPTIONS.map((dim) => (
                            <option key={dim} value={dim}>{dim}</option>
                        ))}
                    </select>
                </div>

                {/* Steps */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        Steps: {params.steps}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="150"
                        value={params.steps}
                        onChange={(e) => handleChange('steps', parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                    />
                </div>

                {/* CFG Scale */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        CFG: {params.cfg_scale}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={params.cfg_scale}
                        onChange={(e) => handleChange('cfg_scale', parseFloat(e.target.value))}
                        className="w-full accent-indigo-500"
                    />
                </div>

                {/* Sampler */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Sampler</label>
                    <select
                        value={params.sampler_name}
                        onChange={(e) => handleChange('sampler_name', e.target.value)}
                        className="input w-full text-sm"
                    >
                        {SAMPLER_OPTIONS.map((sampler) => (
                            <option key={sampler} value={sampler}>{sampler}</option>
                        ))}
                    </select>
                </div>

                {/* Scheduler */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Scheduler</label>
                    <select
                        value={params.scheduler}
                        onChange={(e) => handleChange('scheduler', e.target.value)}
                        className="input w-full text-sm"
                    >
                        {SCHEDULER_OPTIONS.map((sched) => (
                            <option key={sched} value={sched}>{sched}</option>
                        ))}
                    </select>
                </div>

                {/* Batch Size */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Batch</label>
                    <select
                        value={params.batch_size}
                        onChange={(e) => handleChange('batch_size', parseInt(e.target.value))}
                        className="input w-full text-sm"
                    >
                        {[1, 2, 3, 4].map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* Seed */}
                <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Seed</label>
                    <div className="flex gap-1">
                        <input
                            type="number"
                            value={params.seed === -1 ? '' : params.seed}
                            placeholder="Random"
                            onChange={(e) => handleChange('seed', e.target.value ? parseInt(e.target.value) : -1)}
                            className="input flex-1 text-sm"
                        />
                        <button
                            onClick={randomizeSeed}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            title="Generate random seed"
                        >
                            <Shuffle className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Checkpoint selector (if checkpoints available) */}
            {checkpoints.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Checkpoint</label>
                    <select
                        value={params.checkpoint_name || ''}
                        onChange={(e) => handleChange('checkpoint_name', e.target.value)}
                        className="input w-full text-sm"
                    >
                        <option value="">Use workflow default</option>
                        {checkpoints.map((ckpt) => (
                            <option key={ckpt} value={ckpt}>{ckpt}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
