import { X } from 'lucide-react';

interface Column {
    name: string;
    type: string;
}

interface RowDetailsProps {
    row: Record<string, any>;
    columns: Column[];
    onClose: () => void;
    title?: string;
}

function isJsonField(value: any): boolean {
    if (typeof value === 'object' && value !== null) return true;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'));
    }
    return false;
}

function formatJson(value: any): string {
    try {
        if (typeof value === 'string') {
            return JSON.stringify(JSON.parse(value), null, 2);
        }
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export default function RowDetails({ row, columns, onClose, title = 'Row Details' }: RowDetailsProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
            <div className="card w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose}>
                        <X className="w-5 h-5 text-[var(--text-secondary)] hover:text-white" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-3">
                    {columns.map((col) => (
                        <div key={col.name} className="border-b border-white/5 pb-3">
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                {col.name}
                                <span className="ml-2 text-xs opacity-50">({col.type})</span>
                            </label>
                            {isJsonField(row[col.name]) ? (
                                <pre className="bg-black/30 rounded-lg p-3 text-xs overflow-x-auto font-mono">
                                    {formatJson(row[col.name])}
                                </pre>
                            ) : (
                                <div className="bg-black/20 rounded-lg px-3 py-2 text-sm">
                                    {row[col.name] === null || row[col.name] === undefined
                                        ? <span className="text-[var(--text-secondary)] italic">null</span>
                                        : String(row[col.name])}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
