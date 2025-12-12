import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Header from '../components/layout/Header';
import { Database, Table, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface TableInfo {
    name: string;
    columnCount: number;
    rowCount: number;
}

interface Column {
    name: string;
    type: string;
    nullable: boolean;
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
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

    return (
        <div className="min-h-screen">
            <Header title="Database" subtitle="Browse database tables and data" />

            <div className="p-8">
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
                                        <button
                                            key={table.name}
                                            onClick={() => handleTableSelect(table.name)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedTable === table.name
                                                    ? 'bg-indigo-500/20 text-indigo-400'
                                                    : 'hover:bg-white/5 text-[var(--text-secondary)]'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Table className="w-4 h-4" />
                                                {table.name}
                                            </span>
                                            <span className="text-xs opacity-60">{table.rowCount}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Viewer */}
                    <div className="flex-1 min-w-0">
                        {!selectedTable ? (
                            <div className="card text-center py-12 text-[var(--text-secondary)]">
                                Select a table to browse its data
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
                                                            className="border-b border-white/5 hover:bg-white/5"
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
