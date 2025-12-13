import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import Header from '../components/layout/Header';
import toast from 'react-hot-toast';
import { Database, Table, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, Download, Upload, AlertTriangle, X, Info } from 'lucide-react';

interface TableInfo {
    name: string;
    columnCount: number;
    rowCount: number;
}

interface Column {
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
}

const fetchTables = async (): Promise<TableInfo[]> => {
    const res = await fetch('/api/database/tables');
    const data = await res.json();
    return data.data;
};

const fetchTableData = async (
    tableName: string,
    page: number,
    sortBy: string,
    sortOrder: 'asc' | 'desc'
) => {
    const res = await fetch(
        `/api/database/tables/${tableName}/data?page=${page}&limit=20&sortBy=${sortBy}&sortOrder=${sortOrder}`
    );
    return res.json();
};

const fetchTableSchema = async (tableName: string): Promise<Column[]> => {
    const res = await fetch(`/api/database/tables/${tableName}/schema`);
    const data = await res.json();
    return data.data;
};

export default function DatabasePage() {
    const queryClient = useQueryClient();
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [confirmTruncate, setConfirmTruncate] = useState<string | null>(null);
    const [confirmTruncateAll, setConfirmTruncateAll] = useState(false);
    const [importing, setImporting] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [schemaModalTable, setSchemaModalTable] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Query for schema modal
    const { data: schemaModalData, isLoading: schemaModalLoading } = useQuery({
        queryKey: ['table-schema-modal', schemaModalTable],
        queryFn: () => fetchTableSchema(schemaModalTable!),
        enabled: !!schemaModalTable,
    });

    const { data: tables, isLoading: tablesLoading } = useQuery({
        queryKey: ['database-tables'],
        queryFn: fetchTables,
    });

    const { data: schema } = useQuery({
        queryKey: ['table-schema', selectedTable],
        queryFn: () => fetchTableSchema(selectedTable!),
        enabled: !!selectedTable,
    });

    const { data: tableData, isLoading: dataLoading } = useQuery({
        queryKey: ['table-data', selectedTable, page, sortBy, sortOrder],
        queryFn: () => fetchTableData(selectedTable!, page, sortBy, sortOrder),
        enabled: !!selectedTable,
    });

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const handleTableSelect = (tableName: string) => {
        setSelectedTable(tableName);
        setPage(1);
        setSortBy('created_at');
        setSortOrder('desc');
    };

    const handleTruncate = async (tableName: string) => {
        try {
            const res = await fetch(`/api/database/tables/${tableName}/truncate`, { method: 'DELETE' });
            const data = await res.json();
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['database-tables'] });
            queryClient.invalidateQueries({ queryKey: ['table-data'] });
        } catch {
            toast.error('Truncate failed');
        }
        setConfirmTruncate(null);
    };

    const handleTruncateAll = async () => {
        try {
            const res = await fetch('/api/database/truncate-all', { method: 'DELETE' });
            const data = await res.json();
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['database-tables'] });
            queryClient.invalidateQueries({ queryKey: ['table-data'] });
        } catch {
            toast.error('Truncate all failed');
        }
        setConfirmTruncateAll(false);
    };

    const handleExport = async () => {
        try {
            const res = await fetch('/api/database/export');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Database exported');
        } catch {
            toast.error('Export failed');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const res = await fetch('/api/database/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: json.data, truncateFirst: true }),
            });
            const data = await res.json();
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['database-tables'] });
            queryClient.invalidateQueries({ queryKey: ['table-data'] });
        } catch {
            toast.error('Import failed');
        }
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="min-h-screen">
            <Header title="Database" subtitle="Browse database tables and data" />

            <div className="p-8">
                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                    <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export JSON
                    </button>
                    <label className={`btn-secondary flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
                        <Upload className="w-4 h-4" /> Import JSON
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                            disabled={importing}
                        />
                    </label>
                    <button
                        onClick={() => setConfirmTruncateAll(true)}
                        className="btn-secondary flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/30"
                    >
                        <Trash2 className="w-4 h-4" /> Truncate All
                    </button>
                </div>

                <div className="flex gap-6">
                    {/* Table List Sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Database className="w-5 h-5 text-indigo-400" />
                                Tables
                            </h3>

                            {tablesLoading ? (
                                <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
                            ) : (
                                <div className="space-y-1">
                                    {tables?.map((table) => (
                                        <div
                                            key={table.name}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${selectedTable === table.name
                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                : 'hover:bg-white/5 text-[var(--text-secondary)]'
                                                }`}
                                        >
                                            <button
                                                onClick={() => handleTableSelect(table.name)}
                                                className="flex items-center gap-2 flex-1 text-left"
                                            >
                                                <Table className="w-4 h-4" />
                                                {table.name}
                                            </button>
                                            <span className="text-xs opacity-60 mr-2">{table.rowCount}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSchemaModalTable(table.name);
                                                }}
                                                className="p-1 hover:bg-indigo-500/20 rounded opacity-50 hover:opacity-100"
                                                title="View schema"
                                            >
                                                <Info className="w-3 h-3 text-indigo-400" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmTruncate(table.name)}
                                                className="p-1 hover:bg-red-500/20 rounded opacity-50 hover:opacity-100"
                                                title="Truncate table"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schema Panel */}
                    {schemaModalTable && (
                        <div className="w-72 flex-shrink-0">
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Info className="w-5 h-5 text-indigo-400" />
                                        {schemaModalTable}
                                    </h3>
                                    <button onClick={() => setSchemaModalTable(null)}>
                                        <X className="w-4 h-4 text-[var(--text-secondary)] hover:text-white" />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                    {schemaModalLoading ? (
                                        <p className="text-[var(--text-secondary)] text-sm">Loading schema...</p>
                                    ) : (
                                        schemaModalData?.map((col) => (
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
                    )}

                    {/* Data Viewer */}
                    <div className="flex-1 min-w-0">
                        {!selectedTable ? (
                            <div className="card text-center py-12 text-[var(--text-secondary)]">
                                Select a table or Info to browse its data or schema
                            </div>
                        ) : (
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">{selectedTable}</h3>
                                    {tableData?.pagination && (
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {tableData.pagination.total} rows
                                        </span>
                                    )}
                                </div>

                                {dataLoading ? (
                                    <p className="text-[var(--text-secondary)]">Loading data...</p>
                                ) : tableData?.data?.length === 0 ? (
                                    <p className="text-[var(--text-secondary)]">No data in this table</p>
                                ) : (
                                    <>
                                        {/* Data Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        {schema?.map((col) => (
                                                            <th
                                                                key={col.name}
                                                                onClick={() => handleSort(col.name)}
                                                                className="text-left py-3 px-4 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-white transition-colors"
                                                            >
                                                                <span className="flex items-center gap-1">
                                                                    {col.name}
                                                                    {sortBy === col.name && (
                                                                        <ArrowUpDown className="w-3 h-3" />
                                                                    )}
                                                                </span>
                                                                <span className="text-xs opacity-50">{col.type}</span>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tableData?.data?.map((row: any, i: number) => (
                                                        <tr
                                                            key={i}
                                                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                                            onClick={() => setSelectedRow(row)}
                                                        >
                                                            {schema?.map((col) => (
                                                                <td key={col.name} className="py-3 px-4 max-w-xs truncate">
                                                                    {formatCell(row[col.name])}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {tableData?.pagination && tableData.pagination.totalPages > 1 && (
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                                <button
                                                    onClick={() => setPage(Math.max(1, page - 1))}
                                                    disabled={page <= 1}
                                                    className="btn-secondary flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                    Previous
                                                </button>
                                                <span className="text-sm text-[var(--text-secondary)]">
                                                    Page {page} of {tableData.pagination.totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setPage(Math.min(tableData.pagination.totalPages, page + 1))}
                                                    disabled={page >= tableData.pagination.totalPages}
                                                    className="btn-secondary flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    Next
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Truncate Modal */}
            {confirmTruncate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="card w-96">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-semibold">Truncate Table</h3>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-4">
                            Are you sure you want to delete all data from <strong>{confirmTruncate}</strong>? This cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setConfirmTruncate(null)} className="btn-secondary">Cancel</button>
                            <button onClick={() => handleTruncate(confirmTruncate)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                                Truncate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Truncate All Modal */}
            {confirmTruncateAll && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="card w-96">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-semibold">Truncate All Tables</h3>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-4">
                            Are you sure you want to delete <strong>ALL DATA</strong> from all tables? This cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setConfirmTruncateAll(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleTruncateAll} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                                Truncate All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Row Details Modal */}
            {selectedRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
                    <div className="card w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Row Details</h3>
                            <button onClick={() => setSelectedRow(null)}>
                                <X className="w-5 h-5 text-[var(--text-secondary)] hover:text-white" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 space-y-3">
                            {schema?.map((col) => (
                                <div key={col.name} className="border-b border-white/5 pb-3">
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                        {col.name}
                                        <span className="ml-2 text-xs opacity-50">({col.type})</span>
                                    </label>
                                    {isJsonField(selectedRow[col.name]) ? (
                                        <pre className="bg-black/30 rounded-lg p-3 text-xs overflow-x-auto font-mono">
                                            {formatJson(selectedRow[col.name])}
                                        </pre>
                                    ) : (
                                        <div className="bg-black/20 rounded-lg px-3 py-2 text-sm">
                                            {selectedRow[col.name] === null || selectedRow[col.name] === undefined
                                                ? <span className="text-[var(--text-secondary)] italic">null</span>
                                                : String(selectedRow[col.name])}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatCell(value: any): string {
    if (value === null || value === undefined) {
        return '—';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    const str = String(value);
    if (str.length > 50) {
        return str.slice(0, 50) + '...';
    }
    return str;
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
