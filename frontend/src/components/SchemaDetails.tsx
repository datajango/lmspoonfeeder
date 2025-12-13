import { Info, X } from 'lucide-react';

interface Column {
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
}

interface SchemaDetailsProps {
    tableName: string;
    columns: Column[];
    onClose: () => void;
    isLoading?: boolean;
}

export default function SchemaDetails({ tableName, columns, onClose, isLoading = false }: SchemaDetailsProps) {
    return (
        <div className="w-72 flex-shrink-0">
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-400" />
                        {tableName}
                    </h3>
                    <button onClick={onClose}>
                        <X className="w-4 h-4 text-[var(--text-secondary)] hover:text-white" />
                    </button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <p className="text-[var(--text-secondary)] text-sm">Loading schema...</p>
                    ) : (
                        columns.map((col) => (
                            <div key={col.name} className="bg-black/20 rounded-lg p-3">
                                <div className="font-medium text-white text-sm mb-1">{col.name}</div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                    <span className="text-indigo-400 font-mono">{col.type}</span>
                                    <span className={`ml-2 ${col.nullable ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {col.nullable ? 'nullable' : 'not null'}
                                    </span>
                                </div>
                                {col.default && (
                                    <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono truncate" title={col.default}>
                                        default: {col.default}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
