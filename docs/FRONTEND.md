# Spoon Feeder Frontend Architecture

> **Last Updated**: December 2024  
> **React**: 19.x  
> **Build Tool**: Vite 7.x

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Application Architecture](#application-architecture)
- [Routing](#routing)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Type System](#type-system)
- [Design System](#design-system)
- [Component Library](#component-library)
- [Page Documentation](#page-documentation)
- [Common Patterns](#common-patterns)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)

---

## Overview

The Spoon Feeder frontend is a React single-page application that provides a unified interface for AI content orchestration. It manages LLM conversations, ComfyUI image generation, task queuing, and provider configuration.

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Provider Chat** | Conversations with Ollama, OpenAI, Gemini, Claude |
| **ComfyUI Integration** | Session-based image generation with parameter control |
| **Task Management** | Queue, monitor, and retry AI generation tasks |
| **Profile System** | Configure and manage multiple AI provider instances |
| **Real-Time Updates** | WebSocket integration for live status updates |
| **Database Tools** | Development utilities for database inspection |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         App.tsx (Root)                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              QueryClientProvider (React Query)                   │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │                  BrowserRouter                             │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │                    Layout                            │  │  │  │  │
│  │  │  │  │  ┌──────────┐  ┌────────────────────────────────┐   │  │  │  │  │
│  │  │  │  │  │ Sidebar  │  │         <Outlet />             │   │  │  │  │  │
│  │  │  │  │  │          │  │   (Page Components)            │   │  │  │  │  │
│  │  │  │  │  │  - Nav   │  │                                │   │  │  │  │  │
│  │  │  │  │  │  - Links │  │   Dashboard | Conversations    │   │  │  │  │  │
│  │  │  │  │  │          │  │   ComfyUI | Models | Tasks     │   │  │  │  │  │
│  │  │  │  │  │          │  │   Profiles | Settings | ...    │   │  │  │  │  │
│  │  │  │  │  └──────────┘  └────────────────────────────────┘   │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         services/api.ts                                │  │
│  │                              │                                         │  │
│  │    modelsApi | tasksApi | profilesApi | settingsApi | resultsApi      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP / WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express)                                  │
│                              Port 3001                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI framework |
| `react-dom` | ^19.2.0 | DOM rendering |
| `react-router-dom` | ^7.10.1 | Client-side routing |
| `@tanstack/react-query` | ^5.90.12 | Server state management |
| `socket.io-client` | ^4.8.1 | WebSocket communication |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `lucide-react` | ^0.561.0 | Icon library |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^7.2.4 | Build tool & dev server |
| `typescript` | ~5.9.3 | Type checking |
| `tailwindcss` | ^4.1.18 | Utility-first CSS |
| `@tailwindcss/vite` | ^4.1.18 | Vite Tailwind plugin |
| `eslint` | ^9.39.1 | Linting |
| `@vitejs/plugin-react` | ^5.1.1 | React Fast Refresh |

---

## Project Structure

```
frontend/
├── public/                     # Static assets
│   └── vite.svg
├── src/
│   ├── api/                    # API client functions (per-feature)
│   │   └── comfyui.ts          # ComfyUI-specific API calls
│   ├── components/
│   │   ├── layout/             # App shell components
│   │   │   ├── Layout.tsx      # Root layout with sidebar
│   │   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   │   └── Header.tsx      # Page header component
│   │   ├── comfyui/            # ComfyUI feature components
│   │   │   ├── index.ts        # Barrel export
│   │   │   ├── GenerationPanel.tsx
│   │   │   ├── GenerationHistory.tsx
│   │   │   ├── GenerationCard.tsx
│   │   │   ├── ParameterPanel.tsx
│   │   │   ├── WorkflowSelector.tsx
│   │   │   ├── WorkflowJSONViewer.tsx
│   │   │   ├── SessionsSidebar.tsx
│   │   │   ├── SessionHeader.tsx
│   │   │   └── NewSessionModal.tsx
│   │   ├── ConfirmModal.tsx    # Reusable confirmation dialog
│   │   ├── EmptyState.tsx      # Empty state placeholder
│   │   ├── DataViewer.tsx      # Table data display
│   │   ├── RowDetails.tsx      # Row detail modal
│   │   ├── SchemaDetails.tsx   # Schema viewer
│   │   └── TableList.tsx       # Table list sidebar
│   ├── hooks/                  # Custom React hooks (planned)
│   │   ├── useModels.ts
│   │   ├── useTasks.ts
│   │   └── useWebSocket.ts
│   ├── pages/                  # Route page components
│   │   ├── Dashboard.tsx       # System overview
│   │   ├── Conversations.tsx   # LLM chat interface
│   │   ├── ComfyUI.tsx         # Image generation
│   │   ├── ComfyUIWorkflows.tsx # Workflow management
│   │   ├── Models.tsx          # Ollama model management
│   │   ├── Tasks.tsx           # Task queue
│   │   ├── History.tsx         # Task history
│   │   ├── Profiles.tsx        # Provider profiles
│   │   ├── Results.tsx         # Generated content
│   │   ├── Settings.tsx        # Provider settings
│   │   ├── DatabasePage.tsx    # DB table browser
│   │   └── SQLPage.tsx         # SQL console
│   ├── services/
│   │   ├── api.ts              # Central API client
│   │   └── socket.ts           # WebSocket service (planned)
│   ├── types/
│   │   ├── index.ts            # Core type definitions
│   │   └── comfyui.ts          # ComfyUI-specific types
│   ├── App.tsx                 # Root component
│   ├── App.css                 # Legacy styles (unused)
│   ├── index.css               # Global styles & CSS variables
│   ├── main.tsx                # Entry point
│   └── vite-env.d.ts           # Vite type declarations
├── index.html                  # HTML template
├── package.json
├── tsconfig.json               # Base TypeScript config
├── tsconfig.app.json           # App TypeScript config
├── tsconfig.node.json          # Node TypeScript config
├── vite.config.ts              # Vite configuration
└── eslint.config.js            # ESLint configuration
```

---

## Application Architecture

### Entry Point

**`main.tsx`** - Bootstraps the React application:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Root Component

**`App.tsx`** - Configures providers and routing:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
// ... page imports

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // Don't refetch when window gains focus
      retry: 1,                      // Only retry failed requests once
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="comfyui" element={<ComfyUI />} />
            {/* ... more routes */}
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
```

### Layout Structure

**`Layout.tsx`** - App shell with sidebar:

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Outlet />  {/* Page content renders here */}
      </main>
    </div>
  );
}
```

---

## Routing

### Route Configuration

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | System overview, stats |
| `/conversations` | Conversations | LLM chat interface |
| `/comfyui` | ComfyUI | Image generation sessions |
| `/comfyui-workflows` | ComfyUIWorkflows | Workflow CRUD |
| `/models` | Models | Ollama model management |
| `/tasks` | Tasks | Task queue management |
| `/history` | History | Completed task history |
| `/profiles` | Profiles | Provider configuration |
| `/results` | Results | Generated content browser |
| `/settings` | Settings | Legacy provider settings |
| `/database` | DatabasePage | Database table browser |
| `/sql` | SQLPage | Raw SQL console |

### Navigation

The sidebar provides navigation using `react-router-dom`'s `Link` component with active state styling:

```tsx
const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/conversations', label: 'Conversations', icon: MessageCircle },
  { path: '/comfyui', label: 'ComfyUI', icon: Image },
  // ...
];

// In Sidebar.tsx
{navItems.map((item) => {
  const isActive = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium
        ${isActive
          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-400'
          : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      {item.label}
    </Link>
  );
})}
```

---

## State Management

### React Query (TanStack Query)

React Query handles all server state with automatic caching, refetching, and synchronization.

#### Query Pattern

```tsx
import { useQuery } from '@tanstack/react-query';

// In a component
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['models'],           // Unique cache key
  queryFn: () => modelsApi.list(), // Fetch function
  refetchInterval: 5000,          // Optional: auto-refetch
});
```

#### Mutation Pattern

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const createMutation = useMutation({
  mutationFn: (data) => tasksApi.create(data),
  onSuccess: () => {
    toast.success('Task created');
    queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Refetch tasks
  },
  onError: (error) => toast.error(error.message),
});

// Usage
createMutation.mutate({ name: 'My Task', prompt: '...' });
```

#### Query Key Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| `['resource']` | `['models']` | List all |
| `['resource', id]` | `['tasks', '123']` | Single item |
| `['resource', filters]` | `['history', { status: 'complete' }]` | Filtered list |
| `['resource', 'sub']` | `['comfyui-sessions']` | Namespaced |

### Local Component State

Use `useState` for UI-only state that doesn't need to be shared or persisted:

```tsx
const [search, setSearch] = useState('');
const [expanded, setExpanded] = useState<string | null>(null);
const [showModal, setShowModal] = useState(false);
```

### Derived State

Compute derived values inline rather than storing in state:

```tsx
// ✅ Good: Derived from source data
const filtered = models.filter((m) =>
  m.name.toLowerCase().includes(search.toLowerCase())
);

// ❌ Bad: Duplicated state
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(models.filter(...));
}, [models, search]);
```

---

## API Integration

### Central API Client

**`services/api.ts`** provides typed API functions:

```tsx
const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}
```

### API Modules

```tsx
// Models API
export const modelsApi = {
  list: () => fetchApi<any>('/models'),
  get: (name: string) => fetchApi<any>(`/models/${encodeURIComponent(name)}`),
  load: (name: string) => fetchApi<any>(`/models/${name}/load`, { method: 'POST' }),
  unload: (name: string) => fetchApi<any>(`/models/${name}/unload`, { method: 'POST' }),
};

// Tasks API
export const tasksApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<any>(`/tasks${query}`);
  },
  create: (data: any) => fetchApi<any>('/tasks', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  delete: (id: string) => fetchApi<any>(`/tasks/${id}`, { method: 'DELETE' }),
  retry: (id: string) => fetchApi<any>(`/tasks/${id}/retry`, { method: 'POST' }),
};

// Profiles API
export const profilesApi = {
  list: () => fetchApi<any>('/profiles'),
  create: (data: any) => fetchApi<any>('/profiles', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  update: (id: string, data: any) => fetchApi<any>(`/profiles/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (id: string) => fetchApi<any>(`/profiles/${id}`, { method: 'DELETE' }),
  testConnection: (provider: string, apiKey?: string, url?: string) =>
    fetchApi<any>('/profiles/test-connection', { 
      method: 'POST', 
      body: JSON.stringify({ provider, apiKey, url }) 
    }),
};
```

### Feature-Specific API

**`api/comfyui.ts`** for ComfyUI endpoints:

```tsx
const API_BASE = 'http://localhost:3001/api';

export const fetchSessions = async (): Promise<ComfyUISession[]> => {
  const res = await fetch(`${API_BASE}/comfyui/sessions`);
  const data = await res.json();
  return data.data || [];
};

export const createSession = async (data: {
  profileId: string;
  title?: string;
}): Promise<ComfyUISession> => {
  const res = await fetch(`${API_BASE}/comfyui/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
};

export const generateWithParams = async (
  sessionId: string,
  data: {
    prompt_text: string;
    negative_prompt?: string;
    workflow_id?: string;
    parameters?: Partial<GenerationParameters>;
  }
) => {
  const res = await fetch(`${API_BASE}/comfyui/sessions/${sessionId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
};
```

### Vite Proxy Configuration

**`vite.config.ts`** proxies API requests to the backend:

```tsx
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
```

---

## Type System

### Core Types

**`types/index.ts`**:

```tsx
// ============================================================
// Model Types
// ============================================================
export interface Model {
  name: string;
  size: string;
  loaded: boolean;
  capabilities: string[];
  description?: string;
  parameters?: string;
  lastUsed?: Date;
}

// ============================================================
// Task Types
// ============================================================
export type TaskType = 'text' | 'image' | 'video' | 'audio';
export type TaskProvider = 'ollama' | 'openai' | 'gemini' | 'claude' | 'comfyui';
export type TaskStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  provider: TaskProvider;
  prompt: string;
  options?: Record<string, unknown>;
  status: TaskStatus;
  progress?: number;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// ============================================================
// Profile Types
// ============================================================
export interface Profile {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  provider: TaskProvider;
  api_key?: string;
  url?: string;
  options?: Record<string, unknown>;
  prompt_template?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// WebSocket Event Types
// ============================================================
export interface TaskEvent {
  taskId: string;
  status: TaskStatus;
  progress?: number;
  error?: string;
}
```

### ComfyUI Types

**`types/comfyui.ts`**:

```tsx
export interface ComfyUISession {
  id: string;
  profile_id: string;
  profile_name?: string;
  profile_url?: string;
  title: string;
  current_workflow_id?: string;
  last_parameters?: GenerationParameters;
  generation_count: number;
  completed_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface ComfyUIGeneration {
  id: string;
  session_id: string;
  workflow_id?: string;
  prompt_id: string;
  prompt_text: string;
  negative_prompt?: string;
  parameters: GenerationParameters;
  outputs: GenerationOutput[];
  status: 'pending' | 'running' | 'complete' | 'failed';
  error?: string;
  seed: number;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  sampler_name: string;
  scheduler: string;
  created_at: string;
  completed_at?: string;
}

export interface GenerationParameters {
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;
  sampler_name: string;
  scheduler: string;
  batch_size: number;
  checkpoint_name?: string;
  loras?: LoraConfig[];
}

export interface GenerationOutput {
  filename: string;
  subfolder: string;
  type: string;
}

export const DEFAULT_GENERATION_PARAMETERS: GenerationParameters = {
  width: 1024,
  height: 1024,
  steps: 20,
  cfg_scale: 7,
  seed: -1,
  sampler_name: 'euler',
  scheduler: 'normal',
  batch_size: 1,
};
```

---

## Design System

### CSS Variables

**`index.css`** defines the design tokens:

```css
:root {
  /* Colors */
  --primary: #6366f1;           /* Indigo */
  --primary-dark: #4f46e5;
  --bg-dark: #0f172a;           /* Slate 900 */
  --bg-darker: #020617;         /* Slate 950 */
  --surface: #1e293b;           /* Slate 800 */
  --surface-light: #334155;     /* Slate 700 */
  --text-primary: #f1f5f9;      /* Slate 100 */
  --text-secondary: #94a3b8;    /* Slate 400 */
  
  /* Semantic Colors */
  --success: #22c55e;           /* Green 500 */
  --warning: #f59e0b;           /* Amber 500 */
  --error: #ef4444;             /* Red 500 */
}
```

### Utility Classes

```css
/* Glass morphism effect */
.glass {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Primary button */
.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* Secondary button */
.btn-secondary {
  background: var(--surface);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--surface-light);
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: var(--surface-light);
}

/* Card container */
.card {
  background: var(--surface);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Form input */
.input {
  background: var(--bg-darker);
  border: 1px solid var(--surface-light);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  width: 100%;
  font-size: 0.875rem;
}
.input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}
.status-pending { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.status-running { background: rgba(99, 102, 241, 0.2); color: var(--primary); }
.status-complete { background: rgba(34, 197, 94, 0.2); color: var(--success); }
.status-failed { background: rgba(239, 68, 68, 0.2); color: var(--error); }
```

### Tailwind Usage

Combine CSS variables with Tailwind utilities:

```tsx
// Using CSS variables in Tailwind
<div className="bg-[var(--surface)] text-[var(--text-primary)]">

// Standard Tailwind utilities
<div className="flex items-center gap-4 p-6 rounded-xl">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Hover states
<button className="hover:bg-white/5 transition-colors">

// Conditional classes
<span className={`status-badge status-${task.status}`}>
```

---

## Component Library

### Layout Components

#### Header

```tsx
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
      {/* Search and notifications */}
    </header>
  );
}
```

#### Sidebar

Fixed navigation with active state:

```tsx
export default function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-darker)] border-r border-white/5">
      {/* Logo */}
      {/* Navigation items */}
      {/* Footer */}
    </aside>
  );
}
```

### Reusable Components

#### EmptyState

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 text-[var(--text-secondary)] mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {subtitle && <p className="text-[var(--text-secondary)] mb-4">{subtitle}</p>}
      {action}
    </div>
  );
}
```

#### ConfirmModal

```tsx
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen, title, message, confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card max-w-md">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button onClick={onConfirm} className="btn-primary">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

### ComfyUI Components

#### GenerationCard

Displays a single image generation with controls:

```tsx
interface GenerationCardProps {
  generation: ComfyUIGeneration;
  onViewWorkflow: (id: string) => void;
  onReuseSettings: (gen: ComfyUIGeneration) => void;
  onDelete: (id: string) => void;
}

export default function GenerationCard({
  generation, onViewWorkflow, onReuseSettings, onDelete
}: GenerationCardProps) {
  const imageUrl = generation.outputs?.[0]
    ? `/api/comfyui/image/${generation.outputs[0].filename}?type=output`
    : null;
    
  return (
    <div className="group bg-white/5 rounded-lg overflow-hidden">
      {/* Image or loading state */}
      {/* Generation info overlay */}
      {/* Action buttons */}
    </div>
  );
}
```

#### ParameterPanel

Collapsible panel for generation parameters:

```tsx
interface ParameterPanelProps {
  parameters: Partial<GenerationParameters>;
  onChange: (params: Partial<GenerationParameters>) => void;
  checkpoints?: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ParameterPanel({
  parameters, onChange, checkpoints, collapsed, onToggleCollapse
}: ParameterPanelProps) {
  return (
    <div className="card">
      <button onClick={onToggleCollapse} className="flex items-center justify-between w-full">
        <span>Generation Settings</span>
        {collapsed ? <ChevronDown /> : <ChevronUp />}
      </button>
      {!collapsed && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Width, Height, Steps, CFG, Seed, Sampler, Scheduler, Checkpoint */}
        </div>
      )}
    </div>
  );
}
```

---

## Page Documentation

### Dashboard

**Purpose**: System overview and quick stats

**Data Sources**:
- Health check (`/api/health`)
- Task list (`/api/tasks`)
- Model list (`/api/models`)

**Components**:
- StatCard (pending, running, completed, failed counts)
- Recent tasks list
- Backend status indicator

```tsx
const stats = {
  pending: taskList.filter((t) => t.status === 'pending').length,
  running: taskList.filter((t) => t.status === 'running').length,
  completed: taskList.filter((t) => t.status === 'complete').length,
  failed: taskList.filter((t) => t.status === 'failed').length,
};
```

### Conversations

**Purpose**: LLM chat interface

**Features**:
- Multi-provider support (Ollama, OpenAI, Gemini, Claude)
- Conversation persistence
- Message history
- Model selection per conversation

**State**:
```tsx
const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isStreaming, setIsStreaming] = useState(false);
```

### ComfyUI

**Purpose**: Image generation with Stable Diffusion

**Layout**:
```
┌──────────────────────────────────────────────────────────────────┐
│                          Header                                   │
├──────────┬──────────────────────────────────────────────────────┤
│ Sessions │  Session Header (profile info, status)                │
│ Sidebar  │  ┌────────────────────┬─────────────────────────────┐ │
│          │  │ Generation Panel   │ Generation History          │ │
│ - List   │  │ - Workflow Select  │ - Grid of images           │ │
│ - Create │  │ - Parameters       │ - Status, prompts          │ │
│ - Delete │  │ - Prompt input     │ - Actions (reuse, delete)  │ │
│          │  │ - Generate button  │                            │ │
│          │  └────────────────────┴─────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

**State Management**:
```tsx
const [selectedSession, setSelectedSession] = useState<string | null>(null);
const [prompt, setPrompt] = useState('');
const [negativePrompt, setNegativePrompt] = useState('');
const [parameters, setParameters] = useState<Partial<GenerationParameters>>(DEFAULT_GENERATION_PARAMETERS);
const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
```

**Polling for Completion**:
```tsx
useEffect(() => {
  if (pollingIds.size === 0) return;
  
  const interval = setInterval(async () => {
    for (const genId of pollingIds) {
      const generation = await fetchGeneration(genId);
      if (generation.status === 'complete' || generation.status === 'failed') {
        setPollingIds(prev => {
          const next = new Set(prev);
          next.delete(genId);
          return next;
        });
        refetchSession();
      }
    }
  }, 2000);
  
  return () => clearInterval(interval);
}, [pollingIds]);
```

### Models

**Purpose**: Manage Ollama models

**Features**:
- List available models
- Search/filter
- Load/unload models
- View model details

**Mutations**:
```tsx
const loadMutation = useMutation({
  mutationFn: (name: string) => modelsApi.load(name),
  onSuccess: () => {
    toast.success('Model loading started');
    queryClient.invalidateQueries({ queryKey: ['models'] });
  },
});
```

### Profiles

**Purpose**: Configure AI provider instances

**Features**:
- CRUD for profiles
- API key management (masked display)
- Connection testing
- Model management per profile

**Form State**:
```tsx
const [form, setForm] = useState({
  name: '',
  description: '',
  type: 'text' as TaskType,
  provider: 'ollama' as TaskProvider,
  apiKey: '',
  url: '',
});
```

---

## Common Patterns

### Loading States

```tsx
{isLoading ? (
  <div className="flex items-center justify-center py-12">
    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
  </div>
) : data.length === 0 ? (
  <EmptyState icon={FileText} title="No items found" />
) : (
  <div className="grid gap-4">
    {data.map(item => <Card key={item.id} {...item} />)}
  </div>
)}
```

### Error Handling

```tsx
{error && (
  <div className="card bg-red-500/10 border-red-500/30 mb-6">
    <p className="text-red-400">Failed to load data. {error.message}</p>
  </div>
)}
```

### Form Submission

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!form.name.trim()) {
    toast.error('Name is required');
    return;
  }
  
  createMutation.mutate(form);
};
```

### Optimistic Updates

```tsx
const deleteMutation = useMutation({
  mutationFn: (id: string) => api.delete(id),
  onMutate: async (id) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['items'] });
    
    // Snapshot current data
    const previous = queryClient.getQueryData(['items']);
    
    // Optimistically remove item
    queryClient.setQueryData(['items'], (old: any[]) =>
      old.filter(item => item.id !== id)
    );
    
    return { previous };
  },
  onError: (err, id, context) => {
    // Rollback on error
    queryClient.setQueryData(['items'], context?.previous);
    toast.error('Failed to delete');
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});
```

### Modal Pattern

```tsx
const [showModal, setShowModal] = useState(false);
const [editingItem, setEditingItem] = useState<Item | null>(null);

const openCreate = () => {
  setEditingItem(null);
  setShowModal(true);
};

const openEdit = (item: Item) => {
  setEditingItem(item);
  setShowModal(true);
};

const closeModal = () => {
  setShowModal(false);
  setEditingItem(null);
  resetForm();
};
```

### Keyboard Shortcuts

```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
  if (e.key === 'Escape') {
    closeModal();
  }
};
```

---

## Performance Optimization

### Query Caching

React Query caches data by default. Configure stale time for less frequent refetching:

```tsx
const { data } = useQuery({
  queryKey: ['static-data'],
  queryFn: fetchStaticData,
  staleTime: 1000 * 60 * 5, // 5 minutes
  cacheTime: 1000 * 60 * 30, // 30 minutes
});
```

### Lazy Loading (Planned)

```tsx
const ComfyUI = lazy(() => import('./pages/ComfyUI'));

<Suspense fallback={<LoadingSpinner />}>
  <ComfyUI />
</Suspense>
```

### Memoization

```tsx
// Memoize expensive computations
const filteredItems = useMemo(
  () => items.filter(item => item.name.includes(search)),
  [items, search]
);

// Memoize callbacks passed to children
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

### Image Optimization

```tsx
// Lazy load images
<img
  src={imageUrl}
  loading="lazy"
  alt={generation.prompt_text}
  className="w-full h-full object-cover"
/>
```

---

## Testing

### Testing Strategy (Planned)

| Test Type | Tool | Coverage |
|-----------|------|----------|
| Unit Tests | Vitest | Utilities, hooks |
| Component Tests | Testing Library | Components |
| Integration Tests | Playwright | User flows |

### Example Test Structure

```tsx
// components/__tests__/Header.test.tsx
import { render, screen } from '@testing-library/react';
import Header from '../layout/Header';

describe('Header', () => {
  it('renders title', () => {
    render(<Header title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
  
  it('renders subtitle when provided', () => {
    render(<Header title="Title" subtitle="Subtitle" />);
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });
});
```

### Mock API Responses

```tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/models', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [{ name: 'llama3', size: '4.7GB', loaded: true }]
    }));
  })
);
```

---

## Build & Deployment

### Development

```bash
cd frontend
npm run dev

# Output:
# VITE v7.2.4  ready in 500 ms
# ➜  Local:   http://localhost:5173/
```

### Production Build

```bash
npm run build

# Output:
# dist/
#   index.html
#   assets/
#     index-[hash].js
#     index-[hash].css
```

### Preview Production Build

```bash
npm run preview

# Serves dist/ on port 4173
```

### Environment Variables

Create `.env` files for different environments:

```env
# .env.development
VITE_API_URL=http://localhost:3001

# .env.production
VITE_API_URL=https://api.example.com
```

Access in code:

```tsx
const API_URL = import.meta.env.VITE_API_URL;
```

### Docker Deployment

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:3001;
    }
}
```

---

## Quick Reference

### NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server |
| `build` | `tsc -b && vite build` | Production build |
| `preview` | `vite preview` | Preview build |
| `lint` | `eslint .` | Run linter |

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `GenerationCard.tsx` |
| Pages | PascalCase | `ComfyUI.tsx` |
| Hooks | camelCase with `use` prefix | `useModels.ts` |
| Types | PascalCase interfaces | `ComfyUISession` |
| API functions | camelCase | `fetchSessions` |
| CSS classes | kebab-case | `.btn-primary` |

### Import Order Convention

```tsx
// 1. React/framework imports
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// 2. Third-party libraries
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

// 3. Internal components
import Header from '../components/layout/Header';
import EmptyState from '../components/EmptyState';

// 4. API/services
import { profilesApi } from '../services/api';

// 5. Types
import type { Profile, TaskType } from '../types';

// 6. Styles (if any)
import './styles.css';
```

### Useful Patterns Cheatsheet

```tsx
// Conditional rendering
{condition && <Component />}
{condition ? <A /> : <B />}

// Array rendering
{items.map(item => <Item key={item.id} {...item} />)}

// Event handling
onClick={() => handleClick(id)}
onChange={(e) => setValue(e.target.value)}

// Class composition
className={`base-class ${condition ? 'active' : ''}`}
className={[baseClass, condition && 'active'].filter(Boolean).join(' ')}

// Spread props
<Button {...props} />
<Input {...register('field')} />
```
