import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'danger',
}: ConfirmModalProps) {
    const variantStyles = {
        danger: {
            icon: 'text-red-400',
            button: 'bg-red-500 hover:bg-red-600',
        },
        warning: {
            icon: 'text-yellow-400',
            button: 'bg-yellow-500 hover:bg-yellow-600',
        },
        info: {
            icon: 'text-indigo-400',
            button: 'bg-indigo-500 hover:bg-indigo-600',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card w-96">
                <div className={`flex items-center gap-3 mb-4 ${styles.icon}`}>
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <div className="text-[var(--text-secondary)] mb-4">
                    {message}
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="btn-secondary">
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`${styles.button} text-white px-4 py-2 rounded-lg`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
