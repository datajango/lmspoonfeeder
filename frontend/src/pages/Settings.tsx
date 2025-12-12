import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { settingsApi } from '../services/api';
import { Key, Globe, TestTube, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import type { ProviderType } from '../types';

const providers: { id: ProviderType; name: string; color: string }[] = [
    { id: 'openai', name: 'OpenAI', color: 'from-green-500 to-emerald-600' },
    { id: 'gemini', name: 'Google Gemini', color: 'from-blue-500 to-cyan-600' },
    { id: 'claude', name: 'Anthropic Claude', color: 'from-orange-500 to-amber-600' },
];

export default function Settings() {
    const queryClient = useQueryClient();

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.list(),
    });

    const settingsList = settings?.data || [];

    return (
        <div className="min-h-screen">
            <Header title="Settings" subtitle="Configure LLM provider API keys and endpoints" />

            <div className="p-8">
                <div className="max-w-3xl space-y-6">
                    {providers.map((provider) => {
                        const providerSettings = settingsList.find((s: any) => s.provider === provider.id);
                        return (
                            <ProviderCard
                                key={provider.id}
                                provider={provider}
                                settings={providerSettings}
                                queryClient={queryClient}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

interface ProviderCardProps {
    provider: { id: ProviderType; name: string; color: string };
    settings: any;
    queryClient: any;
}

function ProviderCard({ provider, settings, queryClient }: ProviderCardProps) {
    const [showKey, setShowKey] = useState(false);
    const [form, setForm] = useState({
        apiKey: '',
        endpointUrl: settings?.endpointUrl || '',
        defaultModel: settings?.defaultModel || '',
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => settingsApi.update(provider.id, data),
        onSuccess: () => {
            toast.success(`${provider.name} settings saved`);
            setForm({ ...form, apiKey: '' });
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const testMutation = useMutation({
        mutationFn: () => settingsApi.test(provider.id),
        onSuccess: (data) => {
            if (data.data?.connected) {
                toast.success(`Connected to ${provider.name}`);
            } else {
                toast.error(data.data?.message || 'Connection failed');
            }
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.apiKey && !settings) {
            toast.error('API key is required');
            return;
        }
        const data: any = {};
        if (form.apiKey) data.apiKey = form.apiKey;
        if (form.endpointUrl) data.endpointUrl = form.endpointUrl;
        if (form.defaultModel) data.defaultModel = form.defaultModel;
        updateMutation.mutate(data);
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${provider.color}`}>
                        <Key className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{provider.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {settings ? `Configured • ${settings.apiKey}` : 'Not configured'}
                        </p>
                    </div>
                </div>
                {settings && (
                    <span className={`status-badge status-${settings.status === 'connected' ? 'connected' : 'disconnected'}`}>
                        {settings.status || 'unknown'}
                    </span>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">API Key</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={form.apiKey}
                            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                            className="input pr-10"
                            placeholder={settings ? '••••••••' : 'Enter API key'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                            {showKey ? (
                                <EyeOff className="w-4 h-4 text-[var(--text-secondary)]" />
                            ) : (
                                <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                        Custom Endpoint URL <span className="opacity-50">(optional)</span>
                    </label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            value={form.endpointUrl}
                            onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
                            className="input pl-10"
                            placeholder="https://api.openai.com/v1"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="btn-primary flex items-center gap-2"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Save
                    </button>
                    {settings && (
                        <button
                            type="button"
                            onClick={() => testMutation.mutate()}
                            disabled={testMutation.isPending}
                            className="btn-secondary flex items-center gap-2"
                        >
                            {testMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <TestTube className="w-4 h-4" />
                            )}
                            Test Connection
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
