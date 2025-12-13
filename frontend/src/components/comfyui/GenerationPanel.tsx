import type { ComfyUIWorkflow, GenerationParameters } from '../../types/comfyui';
import { WorkflowSelector } from './';
import ParameterPanel from './ParameterPanel';
import { Loader2, Send } from 'lucide-react';

interface GenerationPanelProps {
    workflows: ComfyUIWorkflow[];
    selectedWorkflowId: string | null;
    onSelectWorkflow: (id: string | null) => void;
    parameters: Partial<GenerationParameters>;
    onChangeParameters: (params: Partial<GenerationParameters>) => void;
    checkpoints?: string[];
    prompt: string;
    negativePrompt: string;
    onChangePrompt: (value: string) => void;
    onChangeNegativePrompt: (value: string) => void;
    onSubmit: () => void;
    isGenerating: boolean;
    settingsCollapsed: boolean;
    onToggleSettingsCollapse: () => void;
}

export default function GenerationPanel({
    workflows,
    selectedWorkflowId,
    onSelectWorkflow,
    parameters,
    onChangeParameters,
    checkpoints,
    prompt,
    negativePrompt,
    onChangePrompt,
    onChangeNegativePrompt,
    onSubmit,
    isGenerating,
    settingsCollapsed,
    onToggleSettingsCollapse,
}: GenerationPanelProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Workflow Selector */}
            <div className="card">
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Workflow</label>
                <WorkflowSelector
                    workflows={workflows}
                    selectedWorkflowId={selectedWorkflowId}
                    onSelectWorkflow={onSelectWorkflow}
                />
            </div>

            {/* Generation Settings */}
            <div>
                <ParameterPanel
                    parameters={parameters}
                    onChange={onChangeParameters}
                    checkpoints={checkpoints}
                    collapsed={settingsCollapsed}
                    onToggleCollapse={onToggleSettingsCollapse}
                />
            </div>

            {/* Prompt Form */}
            <div className="card flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => onChangePrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe the image you want to generate..."
                            className="input w-full resize-none"
                            rows={4}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">
                            Negative Prompt <span className="opacity-50">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={negativePrompt}
                            onChange={(e) => onChangeNegativePrompt(e.target.value)}
                            placeholder="Things to avoid..."
                            className="input w-full"
                        />
                    </div>
                </div>
                <button
                    onClick={onSubmit}
                    disabled={!prompt.trim() || isGenerating}
                    className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 mt-4 w-full"
                >
                    {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    Generate
                </button>
            </div>
        </div>
    );
}
