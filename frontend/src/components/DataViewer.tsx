import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface Column {
    name: string;
    type: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface DataViewerProps {
    tableName?: string | null;
    data: any[];
    columns: Column[];
    pagination?: Pagination;
    page: number;
    sortBy: string;
    onSort: (column: string) => void;
    onPageChange: (page: number) => void;
    onRowClick?: (row: any) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    placeholderMessage?: string;
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

export default function DataViewer({
    tableName,
    data,
    columns,
    pagination,
    page,
    sortBy,
    onSort,
    onPageChange,
    onRowClick,
    isLoading = false,
    emptyMessage = 'No data available',
    placeholderMessage = 'Select a table to view data',
}: DataViewerProps) {
    if (!tableName) {
        return (
            <div className="flex-1 min-w-0">
                <div className="card text-center py-12 text-[var(--text-secondary)]">
                    {placeholderMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-w-0">
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{tableName}</h3>
                    {pagination && (
                        <span className="text-sm text-[var(--text-secondary)]">
                            {pagination.total} rows
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <p className="text-[var(--text-secondary)]">Loading data...</p>
                ) : data.length === 0 ? (
                    <p className="text-[var(--text-secondary)]">{emptyMessage}</p>
                ) : (
                    <>
                        {/* Data Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        {columns.map((col) => (
                                            <th
                                                key={col.name}
                                                onClick={() => onSort(col.name)}
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
                                    {data.map((row: any, i: number) => (
                                        <tr
                                            key={i}
                                            className={`border-b border-white/5 hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''}`}
                                            onClick={() => onRowClick?.(row)}
                                        >
                                            {columns.map((col) => (
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
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => onPageChange(Math.max(1, page - 1))}
                                    disabled={page <= 1}
                                    className="btn-secondary flex items-center gap-1 disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <span className="text-sm text-[var(--text-secondary)]">
                                    Page {page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
                                    disabled={page >= pagination.totalPages}
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
        </div>
    );
}
