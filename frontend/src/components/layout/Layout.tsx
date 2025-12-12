import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <div className="min-h-screen bg-[var(--bg-dark)]">
            <Sidebar />
            <main className="ml-64 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
