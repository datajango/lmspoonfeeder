import { Loader2 } from 'lucide-react';

interface SessionHeaderProps {
    profileName?: string;
    profileUrl?: string;
    isGenerating: boolean;
}

export default function SessionHeader({ profileName, profileUrl, isGenerating }: SessionHeaderProps) {
    return (
        <div className="flex items-center gap-4 mb-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-sm text-[var(--text-secondary)]">
                <strong className="text-white">{profileName || 'Profile'}</strong>
                {profileUrl && (
                    <span className="ml-2 text-indigo-400">→ {profileUrl}</span>
                )}
            </span>
            {isGenerating && (
                <span className="flex items-center gap-2 text-sm text-yellow-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                </span>
            )}
        </div>
    );
}
