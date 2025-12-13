import { X } from 'lucide-react';

interface Profile {
    id: string;
    name: string;
}

interface NewSessionModalProps {
    profiles: Profile[];
    selectedProfile: string;
    onChangeProfile: (id: string) => void;
    onCreate: () => void;
    onClose: () => void;
    isCreating: boolean;
}

export default function NewSessionModal({
    profiles,
    selectedProfile,
    onChangeProfile,
    onCreate,
    onClose,
    isCreating,
}: NewSessionModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card w-96">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">New Session</h3>
                    <button onClick={onClose}>
                        <X className="w-5 h-5 text-[var(--text-secondary)]" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">
                            ComfyUI Profile
                        </label>
                        <select
                            value={selectedProfile}
                            onChange={(e) => onChangeProfile(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Select profile...</option>
                            {profiles.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        {profiles.length === 0 && (
                            <p className="text-sm text-yellow-400 mt-2">
                                No ComfyUI profiles found. Create one in the Profiles page first.
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            onClick={onCreate}
                            disabled={!selectedProfile || isCreating}
                            className="btn-primary disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
