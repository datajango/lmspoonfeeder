# Frontend Implementation Plan

## Overview

React + TypeScript + Tailwind CSS frontend for the Spoon Feeder MVP - a unified interface for managing LLM tasks, models, and generated content.

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18+ | UI framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Vite | Build tool |
| React Query | API state management |
| React Router | Navigation |
| Socket.io Client | Real-time updates |
| React Hot Toast | Notifications |

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Layout.tsx
│   │   └── NotificationPanel.tsx
│   ├── dashboard/
│   │   ├── TaskStatusCard.tsx
│   │   └── StatsOverview.tsx
│   ├── models/
│   │   ├── ModelList.tsx
│   │   ├── ModelCard.tsx
│   │   └── ModelDetails.tsx
│   ├── settings/
│   │   ├── SettingsLayout.tsx
│   │   ├── LLMProviderForm.tsx
│   │   ├── OpenAISettings.tsx
│   │   ├── GeminiSettings.tsx
│   │   ├── ClaudeSettings.tsx
│   │   └── ConnectionStatus.tsx
│   ├── tasks/
│   │   ├── TaskCreator.tsx
│   │   ├── TaskQueue.tsx
│   │   ├── TaskItem.tsx
│   │   ├── TaskHistory.tsx
│   │   ├── TaskFilters.tsx
│   │   ├── LLMSelector.tsx
│   │   └── ProfileSelector.tsx
│   ├── profiles/
│   │   ├── ProfileList.tsx
│   │   ├── ProfileForm.tsx
│   │   └── ProfileCard.tsx
│   ├── notifications/
│   │   ├── NotificationToast.tsx
│   │   └── NotificationCenter.tsx
│   └── results/
│       ├── ResultViewer.tsx
│       └── MediaPreview.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Models.tsx
│   ├── Tasks.tsx
│   ├── History.tsx
│   ├── Profiles.tsx
│   ├── Settings.tsx
│   └── Results.tsx
├── hooks/
│   ├── useModels.ts
│   ├── useTasks.ts
│   ├── useSettings.ts
│   ├── useProfiles.ts
│   ├── useWebSocket.ts
│   └── useNotifications.ts
├── services/
│   ├── api.ts
│   └── socket.ts
├── types/
│   └── index.ts
├── context/
│   └── NotificationContext.tsx
├── App.tsx
└── main.tsx
```

---

## Core Components

### 1. Dashboard Page

**Purpose**: Unified overview of system status

**Features**:
- [ ] Active task count and status summary
- [ ] Quick stats (models loaded, tasks completed, pending)
- [ ] Recent activity feed
- [ ] Navigation to other sections

---

### 2. Model Management Page

**Purpose**: Manage local Ollama models with enhanced details

**Components**:

#### ModelList
- [ ] Display available Ollama models in card/grid view
- [ ] Show model status (loaded/unloaded) with visual indicators
- [ ] Load/unload model buttons with confirmation
- [ ] Quick model switcher for fast selection
- [ ] Search/filter models by name or capability

#### ModelDetails (Enhanced)
- [ ] Full model description and documentation
- [ ] Model size and memory requirements
- [ ] Supported capabilities (chat, code, vision, etc.)
- [ ] Performance metrics (tokens/sec if available)
- [ ] Last used timestamp
- [ ] Quick action buttons (load, set as default)

---

### 3. Settings Page (NEW)

**Purpose**: Configure remote LLM endpoints and API keys

**Components**:

#### SettingsLayout
- [ ] Tabbed or accordion layout for each provider section
- [ ] Global save/cancel buttons
- [ ] Unsaved changes warning

#### OpenAISettings
- [ ] API Key input (masked, with show/hide toggle)
- [ ] Custom endpoint URL (optional, for Azure OpenAI or proxies)
- [ ] Model selection dropdown (GPT-4, GPT-3.5-turbo, etc.)
- [ ] Connection test button with status indicator
- [ ] Last tested timestamp

#### GeminiSettings
- [ ] API Key input (masked, with show/hide toggle)
- [ ] Custom endpoint URL (optional)
- [ ] Model selection (Gemini Pro, etc.)
- [ ] Connection test button with status indicator
- [ ] Last tested timestamp

#### ClaudeSettings
- [ ] API Key input (masked, with show/hide toggle)
- [ ] Custom endpoint URL (optional)
- [ ] Model selection (Claude 3 Opus, Sonnet, Haiku)
- [ ] Connection test button with status indicator
- [ ] Last tested timestamp

#### ConnectionStatus
- [ ] Visual indicator component (green/red/yellow)
- [ ] Last successful connection time
- [ ] Error message display if connection failed

**Validation**:
- [ ] API key format validation (prefix checks where applicable)
- [ ] URL format validation for custom endpoints
- [ ] Required field indicators
---

### 4. Task Management Page

**Purpose**: Create and manage content generation tasks

**Components**:

#### TaskCreator
- [ ] Task name input
- [ ] Content type selector (text, image, video, audio)
- [ ] LLM/Provider selector dropdown
  - Local: Ollama models
  - Remote: OpenAI, Gemini, Claude
  - Media: ComfyUI configurations
- [ ] Prompt/input textarea
- [ ] Advanced options (temperature, max tokens, etc.)
- [ ] **Profile selector** - Load saved configuration profiles
- [ ] **Save as profile** button - Save current config for reuse
- [ ] Submit to queue button

#### TaskQueue (Real-Time)
- [ ] List of pending/running/completed tasks
- [ ] **Live status updates via WebSocket**
- [ ] Progress indicators for running tasks
- [ ] Task status indicators (pending, running, complete, failed)
- [ ] Cancel/retry actions
- [ ] Priority reordering (drag & drop)
- [ ] Filter by status/type

---

### 5. Task History Page

**Purpose**: View and filter historical tasks

**Components**:

#### TaskHistory
- [ ] Paginated list of all past tasks
- [ ] Sortable columns (date, name, type, provider, status)
- [ ] Click to view full task details and result

#### TaskFilters
- [ ] Date range picker (today, week, month, custom)
- [ ] Filter by LLM/provider used
- [ ] Filter by content type (text, image, video, audio)
- [ ] Filter by status (completed, failed)
- [ ] Search by task name or prompt content
- [ ] Save filter presets

---

### 6. Configuration Profiles Page

**Purpose**: Save and manage reusable task configurations

**Components**:

#### ProfileList
- [ ] Grid/list of saved profiles
- [ ] Quick use button to populate TaskCreator
- [ ] Edit/delete actions
- [ ] Duplicate profile option

#### ProfileForm
- [ ] Profile name and description
- [ ] Content type preset
- [ ] Default LLM/provider selection
- [ ] Saved advanced options (temperature, max tokens, etc.)
- [ ] Default prompt template (optional)

---

### 7. Results Page

**Purpose**: View and download generated content

**Components**:

#### ResultViewer
- [ ] Grid/list view of completed tasks
- [ ] Filter by content type
- [ ] Search functionality

#### MediaPreview
- [ ] Text content display with copy button
- [ ] Image preview with download
- [ ] Video/audio player
- [ ] Metadata display (model used, generation time, etc.)

---

## API Integration

### Endpoints to Consume

```typescript
// Models
GET    /api/models                 // List all available models
GET    /api/models/:name           // Get model details
POST   /api/models/:name/load      // Load Ollama model
POST   /api/models/:name/unload    // Unload Ollama model

// Settings (LLM Providers)
GET    /api/settings               // Get all provider settings (keys masked)
GET    /api/settings/:provider     // Get specific provider settings
PUT    /api/settings/:provider     // Update provider settings (key + endpoint)
POST   /api/settings/:provider/test // Test provider connection
DELETE /api/settings/:provider     // Remove provider configuration

// Tasks
GET    /api/tasks                  // List all tasks (with filters)
POST   /api/tasks                  // Create new task
GET    /api/tasks/:id              // Get task details
DELETE /api/tasks/:id              // Cancel task

// Task History
GET    /api/tasks/history          // Get paginated task history
GET    /api/tasks/history/export   // Export history as CSV/JSON

// Profiles
GET    /api/profiles               // List all profiles
POST   /api/profiles               // Create new profile
GET    /api/profiles/:id           // Get profile details
PUT    /api/profiles/:id           // Update profile
DELETE /api/profiles/:id           // Delete profile

// Results
GET    /api/results                // List completed results
GET    /api/results/:id            // Get specific result
GET    /api/results/:id/download   // Download media file

// WebSocket Events (Socket.io)
WS     task:created                // New task added
WS     task:started                // Task processing began
WS     task:progress               // Task progress update
WS     task:completed              // Task finished successfully
WS     task:failed                 // Task failed with error
```

---

## TypeScript Types

```typescript
interface Model {
  name: string;
  size: string;
  loaded: boolean;
  capabilities: string[];
  description?: string;
  parameters?: string;
  lastUsed?: Date;
}

interface ProviderSettings {
  provider: 'openai' | 'gemini' | 'claude';
  apiKey: string; // masked in responses
  endpointUrl?: string; // custom endpoint (optional)
  defaultModel?: string; // preferred model for this provider
  configured: boolean;
  lastTested?: Date;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  errorMessage?: string;
}

interface Task {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'audio';
  provider: string;
  prompt: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  progress?: number; // 0-100 for running tasks
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface Result {
  id: string;
  taskId: string;
  type: 'text' | 'image' | 'video' | 'audio';
  content: string; // text or file path
  metadata: Record<string, any>;
  createdAt: Date;
}

interface Profile {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'image' | 'video' | 'audio';
  provider: string;
  options: {
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  promptTemplate?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: Date;
}

interface TaskHistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  provider?: string;
  type?: 'text' | 'image' | 'video' | 'audio';
  status?: 'complete' | 'failed';
  search?: string;
}
```

---

## UI/UX Requirements

### Design System
- [ ] Dark mode by default with light mode toggle
- [ ] Consistent spacing and typography via Tailwind
- [ ] Loading states and skeletons
- [ ] Toast notifications for actions
- [ ] Responsive design (mobile-friendly)

### Accessibility
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Focus management

---

## MVP Checklist

### Phase 1: Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up React Router
- [ ] Set up Socket.io client
- [ ] Create base layout components

### Phase 2: Core Pages
- [ ] Build Dashboard page
- [ ] Build Models page with enhanced model details
- [ ] Build API key management form
- [ ] Build Task Creator form with profile support
- [ ] Build Task Queue display

### Phase 3: Real-Time & Notifications
- [ ] Implement WebSocket connection (`useWebSocket` hook)
- [ ] Add real-time task status updates
- [ ] Build notification system (toast + panel)
- [ ] Create NotificationContext for global state

### Phase 4: History & Profiles
- [ ] Build Task History page with filters
- [ ] Implement date range picker
- [ ] Build Configuration Profiles page
- [ ] Add profile selector to Task Creator
- [ ] Save/load profile functionality

### Phase 5: Integration
- [ ] Connect to backend API
- [ ] Implement React Query hooks
- [ ] Build Results viewer
- [ ] Export history feature

### Phase 6: Polish
- [ ] Add loading states and skeletons
- [ ] Implement error handling
- [ ] Responsive design adjustments
- [ ] Accessibility improvements (ARIA, keyboard nav)
