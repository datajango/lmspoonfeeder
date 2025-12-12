import { useQuery } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import { tasksApi, modelsApi, healthApi } from '../services/api';
import { Activity, CheckCircle, Clock, Cpu, AlertCircle, Zap } from 'lucide-react';

export default function Dashboard() {
    const { data: health } = useQuery({
        queryKey: ['health'],
        queryFn: () => healthApi.check(),
        refetchInterval: 30000,
    });

    const { data: tasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => tasksApi.list(),
    });

    const { data: models } = useQuery({
        queryKey: ['models'],
        queryFn: () => modelsApi.list(),
    });

    const taskList = tasks?.data || [];
    const modelList = models?.data || [];

    const stats = {
        pending: taskList.filter((t: any) => t.status === 'pending').length,
        running: taskList.filter((t: any) => t.status === 'running').length,
        completed: taskList.filter((t: any) => t.status === 'complete').length,
        failed: taskList.filter((t: any) => t.status === 'failed').length,
        models: modelList.length,
        loaded: modelList.filter((m: any) => m.loaded).length,
    };

    return (
        <div className="min-h-screen">
            <Header title="Dashboard" subtitle="System overview and quick actions" />

            <div className="p-8">
                {/* Status Banner */}
                <div className="glass rounded-2xl p-6 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${health ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Backend Status</p>
                            <p className="font-medium">{health ? 'Connected' : 'Disconnected'}</p>
                        </div>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                        {health?.timestamp && `Last check: ${new Date(health.timestamp).toLocaleTimeString()}`}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Clock}
                        label="Pending"
                        value={stats.pending}
                        color="text-yellow-500"
                        bgColor="bg-yellow-500/10"
                    />
                    <StatCard
                        icon={Activity}
                        label="Running"
                        value={stats.running}
                        color="text-indigo-500"
                        bgColor="bg-indigo-500/10"
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Completed"
                        value={stats.completed}
                        color="text-green-500"
                        bgColor="bg-green-500/10"
                    />
                    <StatCard
                        icon={AlertCircle}
                        label="Failed"
                        value={stats.failed}
                        color="text-red-500"
                        bgColor="bg-red-500/10"
                    />
                </div>

                {/* Models & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Models Overview */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-indigo-400" />
                                Models
                            </h3>
                            <span className="text-sm text-[var(--text-secondary)]">
                                {stats.loaded} / {stats.models} loaded
                            </span>
                        </div>

                        {modelList.length === 0 ? (
                            <p className="text-[var(--text-secondary)] text-sm">No models available. Make sure Ollama is running.</p>
                        ) : (
                            <div className="space-y-2">
                                {modelList.slice(0, 5).map((model: any) => (
                                    <div key={model.name} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-darker)]">
                                        <span className="font-medium">{model.name}</span>
                                        <span className="text-sm text-[var(--text-secondary)]">{model.size}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                Recent Activity
                            </h3>
                        </div>

                        {taskList.length === 0 ? (
                            <p className="text-[var(--text-secondary)] text-sm">No recent tasks. Create a new task to get started.</p>
                        ) : (
                            <div className="space-y-2">
                                {taskList.slice(0, 5).map((task: any) => (
                                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-darker)]">
                                        <div>
                                            <p className="font-medium">{task.name}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{task.provider}</p>
                                        </div>
                                        <span className={`status-badge status-${task.status}`}>{task.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: any;
    label: string;
    value: number;
    color: string;
    bgColor: string;
}

function StatCard({ icon: Icon, label, value, color, bgColor }: StatCardProps) {
    return (
        <div className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgColor}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            </div>
        </div>
    );
}
