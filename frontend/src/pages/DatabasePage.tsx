import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import Header from '../components/layout/Header';
import RowDetails from '../components/RowDetails';
import SchemaDetails from '../components/SchemaDetails';
import TableList from '../components/TableList';
import DataViewer from '../components/DataViewer';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { Trash2, Download, Upload } from 'lucide-react';

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
                    <TableList
                        tables={tables || []}
                        selectedTable={selectedTable}
                        onSelectTable={handleTableSelect}
                        onViewSchema={setSchemaModalTable}
                        onTruncate={setConfirmTruncate}
                        isLoading={tablesLoading}
                    />

                    {/* Schema Panel */}
                    {schemaModalTable && (
                        <SchemaDetails
                            tableName={schemaModalTable}
                            columns={schemaModalData || []}
                            onClose={() => setSchemaModalTable(null)}
                            isLoading={schemaModalLoading}
                        />
                    )}

                    {/* Data Viewer */}
                    <DataViewer
                        tableName={selectedTable}
                        data={tableData?.data || []}
                        columns={schema || []}
                        pagination={tableData?.pagination}
                        page={page}
                        sortBy={sortBy}
                        onSort={handleSort}
                        onPageChange={setPage}
                        onRowClick={setSelectedRow}
                        isLoading={dataLoading}
                        emptyMessage="No data in this table"
                        placeholderMessage="Select a table or Info to browse its data or schema"
                    />
                </div>
            </div>

            {/* Confirm Truncate Modal */}
            {confirmTruncate && (
                <ConfirmModal
                    title="Truncate Table"
                    message={<>Are you sure you want to delete all data from <strong>{confirmTruncate}</strong>? This cannot be undone.</>}
                    confirmLabel="Truncate"
                    onConfirm={() => handleTruncate(confirmTruncate)}
                    onCancel={() => setConfirmTruncate(null)}
                    variant="danger"
                />
            )}

            {/* Confirm Truncate All Modal */}
            {confirmTruncateAll && (
                <ConfirmModal
                    title="Truncate All Tables"
                    message={<>Are you sure you want to delete <strong>ALL DATA</strong> from all tables? This cannot be undone.</>}
                    confirmLabel="Truncate All"
                    onConfirm={handleTruncateAll}
                    onCancel={() => setConfirmTruncateAll(false)}
                    variant="danger"
                />
            )}

            {/* Row Details Modal */}
            {selectedRow && schema && (
                <RowDetails
                    row={selectedRow}
                    columns={schema}
                    onClose={() => setSelectedRow(null)}
                />
            )}
        </div>
    );
}
