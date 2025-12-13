import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import Header from '../components/layout/Header';
import { Send, Bot, User, Loader2, Plus, Trash2, MessageCircle, Edit2, X, Check } from 'lucide-react';

interface ChatSource {
    id: string;
    name: string;
    provider: string;
    type: 'local' | 'remote';
}

interface ModelOption {
    id: string;
    name: string;
}

interface Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    provider: string;
    model: string;
    updated_at: string;
    messages?: Message[];
}

// API functions
const fetchChatSources = async (): Promise<ChatSource[]> => {
    const res = await fetch('/api/chat/sources');
    const data = await res.json();
    return data.data || [];
};

const fetchProfileModels = async (profileId: string): Promise<ModelOption[]> => {
    const res = await fetch(`/api/profiles/${profileId}/models`);
    const data = await res.json();
    return data.data || [];
};

const fetchConversations = async (): Promise<Conversation[]> => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    return data.data || [];
};

const fetchConversation = async (id: string): Promise<Conversation> => {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    return data.data;
};

const createConversation = async (data: { title: string; provider: string; model: string }): Promise<Conversation> => {
    const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
};

const updateConversation = async (id: string, data: { title: string }): Promise<Conversation> => {
    const res = await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
};

const deleteConversation = async (id: string): Promise<void> => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
};

const addMessageToConversation = async (conversationId: string, message: { role: string; content: string }) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
    });
    return (await res.json()).data;
};

const sendChatMessage = async (provider: string, model: string, messages: Message[], profileId?: string): Promise<Message> => {
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages, profileId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Chat failed');
    return data.data;
};

export default function Conversations() {
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [dialogProfile, setDialogProfile] = useState<string>('');
    const [dialogModel, setDialogModel] = useState<string>('');
    const [dialogModels, setDialogModels] = useState<ModelOption[]>([]);
    const [loadingDialogModels, setLoadingDialogModels] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: sources } = useQuery({
        queryKey: ['chat-sources'],
        queryFn: fetchChatSources,
    });

    const { data: conversations, refetch: refetchConversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: fetchConversations,
    });

    // Load conversation messages when selected
    useEffect(() => {
        if (selectedConversation) {
            fetchConversation(selectedConversation).then((conv) => {
                setMessages(conv.messages || []);
                setSelectedModel(conv.model);
                // Try to find the profile source
                const profileSource = sources?.find(s => s.provider === conv.provider);
                if (profileSource) {
                    setSelectedSource(profileSource.id);
                }
            });
        }
    }, [selectedConversation, sources]);

    const getProviderAndProfileId = (): { provider: string; profileId?: string } => {
        if (selectedSource.startsWith('profile:')) {
            const profileId = selectedSource.replace('profile:', '');
            const source = sources?.find(s => s.id === selectedSource);
            return { provider: source?.provider || 'openai', profileId };
        } else if (selectedSource.startsWith('ollama:')) {
            return { provider: 'ollama' };
        }
        return { provider: 'unknown' };
    };

    const createMutation = useMutation({
        mutationFn: createConversation,
        onSuccess: (conv) => {
            setSelectedConversation(conv.id);
            setMessages([]);
            setShowNewChatModal(false);
            refetchConversations();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, title }: { id: string; title: string }) => updateConversation(id, { title }),
        onSuccess: () => {
            setEditingId(null);
            setEditingName('');
            refetchConversations();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteConversation,
        onSuccess: () => {
            if (selectedConversation) {
                setSelectedConversation(null);
                setMessages([]);
            }
            refetchConversations();
        },
    });

    const chatMutation = useMutation({
        mutationFn: async (userMessage: string) => {
            const { provider, profileId } = getProviderAndProfileId();
            const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];

            if (selectedConversation) {
                await addMessageToConversation(selectedConversation, { role: 'user', content: userMessage });
            }

            const response = await sendChatMessage(provider, selectedModel, newMessages, profileId);

            if (selectedConversation) {
                await addMessageToConversation(selectedConversation, { role: 'assistant', content: response.content });
            }

            return response;
        },
        onSuccess: (response) => {
            setMessages((prev) => [...prev, response]);
        },
    });

    const handleSend = () => {
        if (!input.trim() || !selectedSource || !selectedModel || chatMutation.isPending) return;
        const userMessage = input.trim();
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        chatMutation.mutate(userMessage);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewChatClick = () => {
        setDialogProfile('');
        setDialogModel('');
        setDialogModels([]);
        setShowNewChatModal(true);
    };

    const handleDialogProfileChange = async (profileId: string) => {
        setDialogProfile(profileId);
        setDialogModel('');
        if (profileId) {
            setLoadingDialogModels(true);
            try {
                const models = await fetchProfileModels(profileId.replace('profile:', ''));
                setDialogModels(models);
            } catch {
                setDialogModels([]);
            }
            setLoadingDialogModels(false);
        } else {
            setDialogModels([]);
        }
    };

    const handleCreateChat = () => {
        if (!dialogProfile || !dialogModel) return;

        // Get profile name for auto-naming
        const profile = sources?.find(s => s.id === dialogProfile);
        const profileName = profile?.name || 'Unknown';
        const modelName = dialogModel.split(':')[0]; // Remove :latest etc
        const timestamp = new Date().toISOString().replace('T', '-').replace(/[:.]/g, '-').slice(0, 19);
        const autoName = `${profileName}-${modelName}-${timestamp}`;

        setSelectedSource(dialogProfile);
        setSelectedModel(dialogModel);

        const sourceObj = sources?.find(s => s.id === dialogProfile);
        createMutation.mutate({
            title: autoName,
            provider: sourceObj?.provider || 'unknown',
            model: dialogModel,
        });
    };

    const handleStartRename = (conv: Conversation) => {
        setEditingId(conv.id);
        setEditingName(conv.title);
    };

    const handleSaveRename = () => {
        if (!editingId || !editingName.trim()) return;
        updateMutation.mutate({ id: editingId, title: editingName.trim() });
    };

    const handleCancelRename = () => {
        setEditingId(null);
        setEditingName('');
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-select first source
    useEffect(() => {
        if (sources && sources.length > 0 && !selectedSource) {
            setSelectedSource(sources[0].id);
        }
    }, [sources, selectedSource]);

    const isReadyToChat = selectedSource && selectedModel;
    void isReadyToChat; // May be used later

    return (
        <div className="min-h-screen flex flex-col">
            <Header title="Conversations" subtitle="Chat with AI models" />

            <div className="flex-1 flex p-8 gap-6 max-h-[calc(100vh-4rem)]">
                {/* Conversations Sidebar */}
                <div className="w-64 flex-shrink-0 flex flex-col">
                    <div className="card flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Chats</h3>
                            <button
                                onClick={handleNewChatClick}
                                className="btn-primary p-2"
                                title="New Chat"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1">
                            {conversations?.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group ${selectedConversation === conv.id
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'hover:bg-white/5'
                                        }`}
                                    onClick={() => editingId !== conv.id && setSelectedConversation(conv.id)}
                                >
                                    {editingId === conv.id ? (
                                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveRename();
                                                    if (e.key === 'Escape') handleCancelRename();
                                                }}
                                                className="input text-sm py-1 flex-1"
                                                autoFocus
                                            />
                                            <button onClick={handleSaveRename} className="p-1 hover:bg-green-500/20 rounded">
                                                <Check className="w-3 h-3 text-green-400" />
                                            </button>
                                            <button onClick={handleCancelRename} className="p-1 hover:bg-red-500/20 rounded">
                                                <X className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate text-sm">{conv.title}</span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartRename(conv);
                                                    }}
                                                    className="p-1 hover:bg-indigo-500/20 rounded"
                                                    title="Rename"
                                                >
                                                    <Edit2 className="w-3 h-3 text-indigo-400" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteMutation.mutate(conv.id);
                                                    }}
                                                    className="p-1 hover:bg-red-500/20 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {(!conversations || conversations.length === 0) && (
                                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                                    No conversations yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Conversation Info Bar */}
                    {selectedConversation && (
                        <div className="flex items-center gap-4 mb-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-sm text-[var(--text-secondary)]">
                                <strong className="text-white">
                                    {sources?.find(s => s.id === selectedSource)?.name || 'Profile'}
                                </strong>
                                {' → '}
                                <strong className="text-indigo-400">{selectedModel}</strong>
                            </span>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 card overflow-y-auto mb-4">
                        {!selectedConversation && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                                <div className="text-center">
                                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Click + to start a new conversation</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                                <Bot className="w-5 h-5 text-indigo-400" />
                                            </div>
                                        )}
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-[var(--bg-darker)]'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {chatMutation.isPending && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div className="bg-[var(--bg-darker)] rounded-2xl px-4 py-3">
                                            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedConversation ? "Type your message..." : "Start a new chat first..."}
                            disabled={!selectedConversation || chatMutation.isPending}
                            className="input flex-1 resize-none"
                            rows={2}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || !selectedConversation || chatMutation.isPending}
                            className="btn-primary px-6 disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* New Chat Modal */}
                {showNewChatModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="card w-96">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">New Conversation</h3>
                                <button onClick={() => setShowNewChatModal(false)}>
                                    <X className="w-5 h-5 text-[var(--text-secondary)]" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Profile</label>
                                    <select
                                        value={dialogProfile}
                                        onChange={(e) => handleDialogProfileChange(e.target.value)}
                                        className="input w-full"
                                    >
                                        <option value="">Select profile...</option>
                                        {sources?.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {dialogProfile && (
                                    <div>
                                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Model</label>
                                        <select
                                            value={dialogModel}
                                            onChange={(e) => setDialogModel(e.target.value)}
                                            className="input w-full"
                                            disabled={loadingDialogModels}
                                        >
                                            {loadingDialogModels ? (
                                                <option value="">Loading...</option>
                                            ) : (
                                                <>
                                                    <option value="">Select model...</option>
                                                    {dialogModels.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowNewChatModal(false)} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateChat}
                                        disabled={!dialogProfile || !dialogModel || createMutation.isPending}
                                        className="btn-primary disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? 'Starting...' : 'Start'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
