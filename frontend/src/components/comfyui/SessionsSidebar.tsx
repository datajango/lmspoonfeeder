import { Image, Edit2, Trash2, Check, X, Plus } from 'lucide-react';

interface Session {
    id: string;
    title: string;
    generation_count?: number;
    completed_count?: number;
}

interface SessionItemProps {
    session: Session;
    isSelected: boolean;
    isEditing: boolean;
    editingName: string;
    onSelect: () => void;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onChangeName: (name: string) => void;
    onDelete: () => void;
}

function SessionItem({
    session,
    isSelected,
    isEditing,
    editingName,
    onSelect,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onChangeName,
    onDelete,
}: SessionItemProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSaveEdit();
        if (e.key === 'Escape') onCancelEdit();
    };

    return (
        <div
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/5'
                }`}
            onClick={() => !isEditing && onSelect()}
        >
            {isEditing ? (
                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => onChangeName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="input text-sm py-1 flex-1"
                        autoFocus
                    />
                    <button onClick={onSaveEdit} className="p-1 hover:bg-green-500/20 rounded">
                        <Check className="w-3 h-3 text-green-400" />
                    </button>
                    <button onClick={onCancelEdit} className="p-1 hover:bg-red-500/20 rounded">
                        <X className="w-3 h-3 text-red-400" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 min-w-0">
                        <Image className="w-4 h-4 flex-shrink-0" />
                        <div className="min-w-0">
                            <span className="truncate text-sm block">{session.title}</span>
                            {(session.generation_count! > 0 || session.completed_count! > 0) && (
                                <span className="text-xs text-[var(--text-secondary)]">
                                    {session.completed_count || 0} images
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                            className="p-1 hover:bg-indigo-500/20 rounded"
                            title="Rename"
                        >
                            <Edit2 className="w-3 h-3 text-indigo-400" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1 hover:bg-red-500/20 rounded"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

interface SessionsSidebarProps {
    sessions: Session[];
    selectedSession: string | null;
    editingId: string | null;
    editingName: string;
    onSelectSession: (id: string) => void;
    onStartEdit: (id: string, title: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onChangeName: (name: string) => void;
    onDelete: (id: string) => void;
    onCreateNew: () => void;
}

export default function SessionsSidebar({
    sessions,
    selectedSession,
    editingId,
    editingName,
    onSelectSession,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onChangeName,
    onDelete,
    onCreateNew,
}: SessionsSidebarProps) {
    return (
        <div className="w-64 flex-shrink-0 flex flex-col">
            <div className="card flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Sessions</h3>
                    <button
                        onClick={onCreateNew}
                        className="btn-primary p-2"
                        title="New Session"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1">
                    {sessions.map((session) => (
                        <SessionItem
                            key={session.id}
                            session={session}
                            isSelected={selectedSession === session.id}
                            isEditing={editingId === session.id}
                            editingName={editingName}
                            onSelect={() => onSelectSession(session.id)}
                            onStartEdit={() => onStartEdit(session.id, session.title)}
                            onSaveEdit={onSaveEdit}
                            onCancelEdit={onCancelEdit}
                            onChangeName={onChangeName}
                            onDelete={() => onDelete(session.id)}
                        />
                    ))}
                    {sessions.length === 0 && (
                        <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                            No sessions yet
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
