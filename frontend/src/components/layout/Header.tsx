import { Bell, Search } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
            <div>
                <h1 className="text-xl font-semibold text-white">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="input pl-10 w-64 bg-[var(--surface)]"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
                </button>
            </div>
        </header>
    );
}
