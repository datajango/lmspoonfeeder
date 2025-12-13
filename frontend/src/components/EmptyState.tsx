import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[var(--text-secondary)]">
                <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{title}</p>
                {subtitle && <p className="text-sm mt-2">{subtitle}</p>}
                {action && <div className="mt-4">{action}</div>}
            </div>
        </div>
    );
}
