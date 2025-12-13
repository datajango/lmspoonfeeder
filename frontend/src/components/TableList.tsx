import { Database, Table, Info, Trash2 } from 'lucide-react';

interface TableInfo {
    name: string;
    columnCount: number;
    rowCount: number;
}

interface TableListProps {
    tables: TableInfo[];
    selectedTable: string | null;
    onSelectTable: (tableName: string) => void;
    onViewSchema?: (tableName: string) => void;
    onTruncate?: (tableName: string) => void;
    isLoading?: boolean;
    title?: string;
}

export default function TableList({
    tables,
    selectedTable,
    onSelectTable,
    onViewSchema,
    onTruncate,
    isLoading = false,
    title = 'Tables',
}: TableListProps) {
    return (
        <div className="w-64 flex-shrink-0">
            <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    {title}
                </h3>

                {isLoading ? (
                    <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
                ) : (
                    <div className="space-y-1">
                        {tables.map((table) => (
                            <div
                                key={table.name}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${selectedTable === table.name
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'hover:bg-white/5 text-[var(--text-secondary)]'
                                    }`}
                            >
                                <button
                                    onClick={() => onSelectTable(table.name)}
                                    className="flex items-center gap-2 flex-1 text-left"
                                >
                                    <Table className="w-4 h-4" />
                                    {table.name}
                                </button>
                                <span className="text-xs opacity-60 mr-2">{table.rowCount}</span>
                                {onViewSchema && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewSchema(table.name);
                                        }}
                                        className="p-1 hover:bg-indigo-500/20 rounded opacity-50 hover:opacity-100"
                                        title="View schema"
                                    >
                                        <Info className="w-3 h-3 text-indigo-400" />
                                    </button>
                                )}
                                {onTruncate && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTruncate(table.name);
                                        }}
                                        className="p-1 hover:bg-red-500/20 rounded opacity-50 hover:opacity-100"
                                        title="Truncate table"
                                    >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
