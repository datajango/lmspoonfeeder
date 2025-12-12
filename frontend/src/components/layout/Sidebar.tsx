import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Cpu,
    ListTodo,
    History,
    BookmarkCheck,
    Settings,
    FileOutput,
    Sparkles,
    Database,
    MessageCircle
} from 'lucide-react';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/conversations', label: 'Conversations', icon: MessageCircle },
    { path: '/models', label: 'Models', icon: Cpu },
    { path: '/tasks', label: 'Tasks', icon: ListTodo },
    { path: '/history', label: 'History', icon: History },
    { path: '/profiles', label: 'Profiles', icon: BookmarkCheck },
    { path: '/results', label: 'Results', icon: FileOutput },
    { path: '/database', label: 'Database', icon: Database },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-darker)] border-r border-white/5 flex flex-col">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">Spoon Feeder</h1>
                    <p className="text-xs text-[var(--text-secondary)]">LLM Orchestrator</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium
                    transition-all duration-200
                    ${isActive
                                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-400 border-l-2 border-indigo-500'
                                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                                        }
                  `}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
                <div className="text-xs text-[var(--text-secondary)] text-center">
                    v1.0.0 MVP
                </div>
            </div>
        </aside>
    );
}
