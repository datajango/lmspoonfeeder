import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import DataViewer from '../components/DataViewer';
import RowDetails from '../components/RowDetails';
import { Play, Loader2, AlertCircle, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:3001/api';

interface SQLResult {
    rows: Record<string, any>[];
    fields: string[];
    rowCount: number;
    command: string;
}

const executeSQL = async (query: string): Promise<SQLResult> => {
    const res = await fetch(`${API_BASE}/database/sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || 'Query failed');
    }
    return data.data;
};

const EXAMPLE_QUERIES = [
    { label: 'List all tables', query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;` },
    { label: 'Count profiles', query: 'SELECT COUNT(*) as count FROM profiles;' },
    { label: 'Recent conversations', query: 'SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;' },
    { label: 'ComfyUI sessions', query: 'SELECT * FROM comfyui_sessions ORDER BY updated_at DESC LIMIT 10;' },
];

export default function SQLPage() {
    const [query, setQuery] = useState('SELECT * FROM profiles LIMIT 10;');
    const [result, setResult] = useState<SQLResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [sortBy, setSortBy] = useState<string>('');

    const mutation = useMutation({
        mutationFn: executeSQL,
        onSuccess: (data) => {
            setResult(data);
            setError(null);
            setSelectedRow(null);
            setSortBy(data.fields[0] || '');
            if (data.command === 'SELECT') {
                toast.success(`Query returned ${data.rows.length} rows`);
            } else {
                toast.success(`${data.command}: ${data.rowCount} rows affected`);
            }
        },
        onError: (err: any) => {
            setError(err.message);
            setResult(null);
            setSelectedRow(null);
            toast.error('Query failed');
        },
    });

    const handleExecute = () => {
        if (!query.trim()) return;
        mutation.mutate(query);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleExecute();
        }
    };

    // Convert fields to column format for DataViewer
    const columns = result?.fields.map(field => ({
        name: field,
        type: 'unknown', // SQL result doesn't include type info
    })) || [];

    return (
        <div className="min-h-screen flex flex-col">
            <Header title="SQL Console" subtitle="Execute SQL queries directly" />

            <div className="flex-1 flex flex-col p-8 gap-6 max-h-[calc(100vh-4rem)]">
                {/* Query Input Section */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-semibold">SQL Query</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Example Queries Dropdown */}
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setQuery(e.target.value);
                                    }
                                }}
                                className="input text-sm"
                                value=""
                            >
                                <option value="">Load example...</option>
                                {EXAMPLE_QUERIES.map((ex, i) => (
                                    <option key={i} value={ex.query}>{ex.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleExecute}
                                disabled={!query.trim() || mutation.isPending}
                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                                {mutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Execute
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter your SQL query here..."
                        className="input w-full font-mono text-sm resize-none"
                        rows={6}
                        spellCheck={false}
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                        Press Ctrl+Enter to execute
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="card bg-red-500/10 border-red-500/30">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-red-400">Query Error</h4>
                                <p className="text-sm text-red-300 mt-1 font-mono">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Section - Using DataViewer */}
                {result && result.rows.length > 0 && (
                    <div className="flex-1 min-h-0">
                        <DataViewer
                            tableName="Query Results"
                            data={result.rows}
                            columns={columns}
                            page={1}
                            sortBy={sortBy}
                            onSort={setSortBy}
                            onPageChange={() => { }} // No pagination for SQL results
                            onRowClick={setSelectedRow}
                            isLoading={mutation.isPending}
                            emptyMessage="No rows returned"
                        />
                    </div>
                )}

                {/* Non-SELECT result (INSERT, UPDATE, DELETE) */}
                {result && result.rows.length === 0 && result.command !== 'SELECT' && (
                    <div className="card flex items-center justify-center py-8">
                        <div className="text-center">
                            <p className="text-lg font-medium text-green-400">
                                {result.command} successful
                            </p>
                            <p className="text-[var(--text-secondary)] mt-1">
                                {result.rowCount} rows affected
                            </p>
                        </div>
                    </div>
                )}

                {/* Empty SELECT result */}
                {result && result.rows.length === 0 && result.command === 'SELECT' && (
                    <div className="card flex items-center justify-center py-8">
                        <p className="text-[var(--text-secondary)]">No rows returned</p>
                    </div>
                )}

                {/* Empty State */}
                {!result && !error && (
                    <div className="card flex-1 flex items-center justify-center">
                        <div className="text-center text-[var(--text-secondary)]">
                            <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Enter a SQL query and click Execute</p>
                            <p className="text-sm mt-2">Results will be displayed here</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Row Details Modal */}
            {selectedRow && columns.length > 0 && (
                <RowDetails
                    row={selectedRow}
                    columns={columns}
                    onClose={() => setSelectedRow(null)}
                    title="Row Details"
                />
            )}
        </div>
    );
}
