import { X, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:3001/api';

interface WorkflowJSONViewerProps {
    generationId: string;
    onClose: () => void;
}

interface WorkflowData {
    workflow_json: object | null;
    parameters: Record<string, any>;
    prompt_text: string;
    negative_prompt?: string;
}

export default function WorkflowJSONViewer({
    generationId,
    onClose,
}: WorkflowJSONViewerProps) {
    const [data, setData] = useState<WorkflowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch workflow data on mount
    useState(() => {
        const fetchWorkflow = async () => {
            try {
                const res = await fetch(`${API_BASE}/comfyui/generations/${generationId}/workflow`);
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.error || 'Failed to load workflow');
                }
            } catch (err) {
                setError('Failed to fetch workflow');
            } finally {
                setLoading(false);
            }
        };
        fetchWorkflow();
    });

    const copyToClipboard = () => {
        if (data?.workflow_json) {
            navigator.clipboard.writeText(JSON.stringify(data.workflow_json, null, 2));
            toast.success('Workflow JSON copied to clipboard');
        }
    };

    const downloadAsFile = () => {
        if (data?.workflow_json) {
            const blob = new Blob([JSON.stringify(data.workflow_json, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow_${generationId.slice(0, 8)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-[var(--bg-card)] border border-white/10 rounded-xl w-[90vw] max-w-4xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold">Workflow JSON</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            disabled={!data?.workflow_json}
                        >
                            <Copy className="w-4 h-4" />
                            Copy
                        </button>
                        <button
                            onClick={downloadAsFile}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            disabled={!data?.workflow_json}
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {loading && (
                        <div className="text-center py-8 text-[var(--text-secondary)]">
                            Loading workflow...
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8 text-red-400">
                            {error}
                        </div>
                    )}

                    {data && !loading && (
                        <div className="space-y-4">
                            {/* Parameters Summary */}
                            <div className="bg-white/5 rounded-lg p-3">
                                <h4 className="text-sm font-medium mb-2">Parameters Used</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    {Object.entries(data.parameters).map(([key, value]) => (
                                        <div key={key}>
                                            <span className="text-[var(--text-secondary)]">{key}:</span>{' '}
                                            <span className="text-white">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow JSON */}
                            <div>
                                <h4 className="text-sm font-medium mb-2">Workflow JSON</h4>
                                <pre className="bg-[var(--bg-darker)] rounded-lg p-4 overflow-auto text-xs font-mono max-h-[50vh]">
                                    {data.workflow_json
                                        ? JSON.stringify(data.workflow_json, null, 2)
                                        : 'No workflow snapshot available'}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
