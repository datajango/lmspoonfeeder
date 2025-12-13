import type { ComfyUIWorkflow } from '../../types/comfyui';
import { ChevronDown, Upload } from 'lucide-react';

interface WorkflowSelectorProps {
    workflows: ComfyUIWorkflow[];
    selectedWorkflowId: string | null;
    onSelectWorkflow: (id: string | null) => void;
    onImportWorkflow?: () => void;
    loading?: boolean;
}

export default function WorkflowSelector({
    workflows,
    selectedWorkflowId,
    onSelectWorkflow,
    onImportWorkflow,
    loading = false,
}: WorkflowSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 relative">
                <select
                    value={selectedWorkflowId || ''}
                    onChange={(e) => onSelectWorkflow(e.target.value || null)}
                    className="input w-full pr-8 appearance-none cursor-pointer"
                    disabled={loading}
                >
                    <option value="">Default txt2img Workflow</option>
                    {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                            {workflow.is_default && '★ '}
                            {workflow.name}
                            {workflow.generation_count > 0 && ` (${workflow.generation_count} gens)`}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-secondary)]" />
            </div>

            {onImportWorkflow && (
                <button
                    onClick={onImportWorkflow}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    title="Import Workflow"
                >
                    <Upload className="w-4 h-4" />
                    Import
                </button>
            )}
        </div>
    );
}
