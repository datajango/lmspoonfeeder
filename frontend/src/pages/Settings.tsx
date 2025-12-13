import Header from '../components/layout/Header';
import { Settings as SettingsIcon, ArrowRight, Key, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
    return (
        <div className="min-h-screen">
            <Header title="Settings" subtitle="Application configuration" />

            <div className="p-8">
                <div className="max-w-3xl space-y-6">
                    {/* API Configuration Info */}
                    <div className="card">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                <Key className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">API Key Configuration</h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Configure API keys per profile for maximum flexibility
                                </p>
                            </div>
                        </div>

                        <p className="text-[var(--text-secondary)] mb-4">
                            API keys for OpenAI, Google Gemini, Anthropic Claude, and ComfyUI are now configured
                            directly in <strong>Profiles</strong>. This allows you to use different API keys and
                            endpoints for different use cases.
                        </p>

                        <Link
                            to="/profiles"
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <BookmarkCheck className="w-4 h-4" />
                            Go to Profiles
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Ollama Configuration */}
                    <div className="card">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700">
                                <SettingsIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Ollama</h3>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Local model inference
                                </p>
                            </div>
                        </div>

                        <p className="text-[var(--text-secondary)] mb-4">
                            Ollama runs locally and doesn't require an API key. Make sure Ollama is running
                            on your machine to use local models. The default endpoint is <code className="text-sm bg-[var(--card-bg)] px-1 rounded">http://localhost:11434</code>.
                        </p>

                        <p className="text-sm text-[var(--text-secondary)]">
                            You can configure a custom Ollama endpoint URL in individual profiles if needed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

