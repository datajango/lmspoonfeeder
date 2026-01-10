# Spoon Feeder Architecture

> **Version**: 1.0 (MVP)  
> **Last Updated**: December 2024  
> **Status**: Active Development

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Breakdown](#component-breakdown)
- [Data Flow](#data-flow)
- [Database Design](#database-design)
- [API Design](#api-design)
- [Real-Time Communication](#real-time-communication)
- [External Integrations](#external-integrations)
- [Security Considerations](#security-considerations)
- [Deployment Architecture](#deployment-architecture)
- [Design Decisions](#design-decisions)

---

## Overview

Spoon Feeder is an AI content orchestration platform that unifies text, image, video, and audio generation across multiple AI providers. It serves as an intelligent routing layer that dispatches tasks to appropriate services while maintaining a consistent interface and comprehensive audit trail.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Provider Routing** | Dynamically route requests to Ollama, OpenAI, Gemini, Claude, or ComfyUI |
| **Task Orchestration** | Queue-based processing with retry logic and status tracking |
| **Media Generation** | Image/video generation via ComfyUI with full parameter control |
| **Session Management** | Conversation-style interfaces for both LLM chat and image generation |
| **Complete Reproducibility** | Every generation stores full workflow snapshots for exact reproduction |

### Design Principles

1. **Provider Agnostic** — Swap AI providers without changing application logic
2. **Full Auditability** — Every generation is reproducible with stored parameters
3. **Real-Time Feedback** — WebSocket-based progress updates for long-running tasks
4. **Containerized** — All services run in Docker for consistent deployment

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     React SPA (Vite + TypeScript)                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │Dashboard │ │  Models  │ │  Tasks   │ │ ComfyUI  │ │ Settings │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │ HTTP/REST │ WebSocket │                           │
└──────────────────────────┼───────────┼───────────┼──────────────────────────┘
                           │           │           │
┌──────────────────────────┼───────────┼───────────┼──────────────────────────┐
│                          ▼           ▼           ▼                           │
│                         ┌─────────────────────────┐                          │
│                         │   Express API Server    │                          │
│                         │      (Port 3001)        │                          │
│                         └───────────┬─────────────┘                          │
│                                     │                                        │
│  ┌──────────────────────────────────┼──────────────────────────────────┐    │
│  │                         SERVICE LAYER                                │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │    │
│  │  │ Ollama  │ │ OpenAI  │ │ Gemini  │ │ Claude  │ │   ComfyUI   │   │    │
│  │  │ Service │ │ Service │ │ Service │ │ Service │ │   Service   │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐   │    │
│  │  │  Queue Service  │ │ WebSocket Svc   │ │ Notification Svc    │   │    │
│  │  │     (Bull)      │ │   (Socket.io)   │ │                     │   │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                              BACKEND LAYER                                   │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                                  ▼                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │   PostgreSQL    │    │      Redis      │    │   File Storage          │  │
│  │   (Port 5432)   │    │   (Port 6379)   │    │   ./storage/media       │  │
│  │                 │    │                 │    │                         │  │
│  │  • Tasks        │    │  • Bull Queues  │    │  • Generated Images     │  │
│  │  • Generations  │    │  • Job State    │    │  • Workflow Files       │  │
│  │  • Profiles     │    │  • Pub/Sub      │    │  • Temp Files           │  │
│  │  • Workflows    │    │                 │    │                         │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│                              DATA LAYER                                      │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                                  ▼                                           │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────┐ │
│  │     Ollama      │    │                    ComfyUI                       │ │
│  │  (Port 11434)   │    │                  (Port 8188)                     │ │
│  │                 │    │                                                  │ │
│  │  Local LLMs:    │    │  ┌─────────────┐  ┌─────────────┐               │ │
│  │  • llama3       │    │  │  Workflows  │  │ Checkpoints │               │ │
│  │  • mistral      │    │  │   (JSON)    │  │   (SDXL)    │               │ │
│  │  • codellama    │    │  └─────────────┘  └─────────────┘               │ │
│  └─────────────────┘    └─────────────────────────────────────────────────┘ │
│                           EXTERNAL SERVICES                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow Diagram

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ Client │────▶│  Nginx  │────▶│  Express │────▶│  Router │────▶│ Provider │
└────────┘     │ (future)│     │   API    │     │ Service │     │  (LLM/   │
               └─────────┘     └──────────┘     └─────────┘     │ ComfyUI) │
                                    │               │           └──────────┘
                                    │               │                 │
                                    ▼               ▼                 │
                              ┌──────────┐   ┌───────────┐           │
                              │ Postgres │   │   Redis   │           │
                              │   (DB)   │   │  (Queue)  │           │
                              └──────────┘   └───────────┘           │
                                    │               │                 │
                                    ▼               ▼                 ▼
                              ┌─────────────────────────────────────────┐
                              │            WebSocket (Socket.io)        │
                              │         Real-time status updates        │
                              └─────────────────────────────────────────┘
                                                   │
                                                   ▼
                                              ┌────────┐
                                              │ Client │
                                              └────────┘
```

---

## Component Breakdown

### Frontend (`/frontend`)

```
src/
├── components/
│   ├── layout/           # Header, Sidebar, Layout wrappers
│   ├── dashboard/        # Stats cards, activity feeds
│   ├── models/           # Ollama model management
│   ├── tasks/            # Task creation, queue display
│   ├── comfyui/          # Image generation interface
│   └── settings/         # Provider configuration
├── pages/                # Route-level components
├── hooks/                # Custom React hooks (useWebSocket, useTasks, etc.)
├── services/
│   ├── api.ts            # REST API client
│   └── socket.ts         # WebSocket client
├── types/                # TypeScript interfaces
└── context/              # React context providers
```

| Component | Responsibility |
|-----------|----------------|
| **Dashboard** | System health, task statistics, quick actions |
| **Models** | List, load, unload Ollama models |
| **Conversations** | Chat interface for LLM interactions |
| **ComfyUI** | Session-based image generation with parameter controls |
| **Tasks** | Create tasks, view queue, monitor progress |
| **Settings** | API key management, provider configuration |

### Backend (`/backend`)

```
src/
├── config/               # Environment configuration
├── controllers/          # Request handlers
│   ├── chat.controller.ts
│   ├── comfyui.controller.ts
│   ├── models.controller.ts
│   ├── profiles.controller.ts
│   ├── settings.controller.ts
│   └── tasks.controller.ts
├── services/             # Business logic
│   ├── ollama.service.ts
│   ├── openai.service.ts
│   ├── gemini.service.ts
│   ├── claude.service.ts
│   ├── comfyui.service.ts
│   ├── queue.service.ts
│   └── websocket.service.ts
├── routes/               # Express route definitions
├── middleware/           # Error handling, validation
├── db/
│   ├── knex.ts           # Database connection
│   └── migrations/       # Schema migrations
├── types/                # TypeScript definitions
└── server.ts             # Application entry point
```

### Service Responsibilities

| Service | Purpose |
|---------|---------|
| **OllamaService** | Local LLM management and inference |
| **OpenAIService** | GPT models and DALL-E integration |
| **GeminiService** | Google Gemini API integration |
| **ClaudeService** | Anthropic Claude API integration |
| **ComfyUIService** | Workflow execution, generation management |
| **QueueService** | Bull queue management, job processing |
| **WebSocketService** | Real-time client communication |

---

## Data Flow

### Text Generation Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TEXT GENERATION FLOW                              │
└──────────────────────────────────────────────────────────────────────────┘

1. User submits prompt
   │
   ▼
┌─────────────────┐
│  POST /api/chat │
│  {              │
│    provider,    │
│    model,       │
│    messages[]   │
│  }              │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Chat Router    │────▶│  Provider       │
│  (determines    │     │  Service        │
│   provider)     │     │  (ollama/openai/│
└─────────────────┘     │   gemini/claude)│
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  External API   │
                        │  (or local      │
                        │   Ollama)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Response       │──────▶ Client
                        │  streamed or    │
                        │  returned       │
                        └─────────────────┘
```

### Image Generation Flow (ComfyUI)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       IMAGE GENERATION FLOW                               │
└──────────────────────────────────────────────────────────────────────────┘

1. User configures generation
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  POST /api/comfyui/sessions/:sessionId/generate                          │
│  {                                                                        │
│    prompt_text: "a sunset over mountains",                               │
│    negative_prompt: "blurry, low quality",                               │
│    workflow_id: "uuid",                                                  │
│    parameters: { width: 1024, height: 1024, steps: 20, seed: -1, ... }   │
│  }                                                                        │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND PROCESSING                                │
│                                                                          │
│  1. Load workflow JSON from database                                     │
│  2. Merge user parameters with workflow defaults                         │
│  3. Apply parameters to workflow nodes:                                  │
│     - KSampler: seed, steps, cfg, sampler, scheduler                    │
│     - EmptyLatentImage: width, height, batch_size                       │
│     - CLIPTextEncode: prompt text                                        │
│  4. Resolve seed (-1 → random integer)                                   │
│  5. Store complete workflow snapshot                                     │
│                                                                          │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POST to ComfyUI /prompt                                                 │
│  {                                                                       │
│    prompt: { ...modified_workflow_json }                                 │
│  }                                                                       │
│                                                                          │
│  Returns: { prompt_id: "abc123" }                                        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE RECORD CREATED                             │
│                                                                          │
│  comfyui_generations: {                                                  │
│    id, session_id, workflow_id, prompt_id,                              │
│    workflow_json_snapshot,     ◀── Full workflow for reproducibility    │
│    prompt_text, negative_prompt,                                         │
│    parameters,                 ◀── All settings as JSON                 │
│    width, height, steps, cfg_scale, seed,  ◀── Denormalized for queries │
│    sampler_name, scheduler, checkpoint_name,                            │
│    status: 'running'                                                     │
│  }                                                                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMFYUI PROCESSING                                    │
│                                                                          │
│  1. Queue prompt                                                         │
│  2. Load checkpoint model                                                │
│  3. Execute workflow nodes                                               │
│  4. Generate image(s)                                                    │
│  5. Save to output folder                                                │
│                                                                          │
│  WebSocket events: progress, executing, executed                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     IMAGE RETRIEVAL                                      │
│                                                                          │
│  GET /api/comfyui/image/:filename                                        │
│       │                                                                  │
│       ▼                                                                  │
│  Backend proxies from ComfyUI:                                           │
│  GET http://comfyui:8188/view?filename=xxx&type=output                   │
│       │                                                                  │
│       ▼                                                                  │
│  Binary image data returned to client                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│      profiles       │       │  provider_settings  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ name                │       │ provider            │
│ provider            │       │ api_key (encrypted) │
│ api_key (encrypted) │       │ endpoint_url        │
│ url                 │       │ default_model       │
│ options (JSONB)     │       │ status              │
│ created_at          │       │ last_tested         │
│ updated_at          │       └─────────────────────┘
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│  comfyui_sessions   │       │  comfyui_workflows  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ profile_id (FK)     │───┐   │ profile_id (FK)     │
│ title               │   │   │ name                │
│ current_workflow_id │───┼──▶│ workflow_json       │
│ last_parameters     │   │   │ default_parameters  │
│ generation_count    │   │   │ extracted_params    │
│ completed_count     │   │   │ is_default          │
│ failed_count        │   │   │ generation_count    │
│ created_at          │   │   │ created_at          │
│ updated_at          │   │   └─────────────────────┘
└──────────┬──────────┘   │
           │              │
           │ 1:N          │
           ▼              │
┌─────────────────────────┴───────────────────────────────────┐
│                    comfyui_generations                       │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ session_id (FK)  ───────────────────────────────────────────│
│ workflow_id (FK) ───────────────────────────────────────────│
│ prompt_id                    # ComfyUI's tracking ID         │
│ workflow_json_snapshot       # Complete workflow for repro   │
│ prompt_text                                                  │
│ negative_prompt                                              │
│ parameters (JSONB)           # All params as structured JSON │
│ ─────────────────────────────────────────────────────────── │
│ # Denormalized for querying:                                 │
│ width, height, steps, cfg_scale, seed                        │
│ sampler_name, scheduler, batch_size                          │
│ checkpoint_name, loras_used (JSONB)                          │
│ ─────────────────────────────────────────────────────────── │
│ outputs (JSONB)              # Array of generated file paths │
│ status                       # pending/running/complete/fail │
│ generation_time_seconds                                      │
│ batch_index                                                  │
│ created_at                                                   │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────┐       ┌─────────────────────┐
│       tasks         │       │      results        │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │──────▶│ id (PK)             │
│ name                │  1:1  │ task_id (FK, UQ)    │
│ type                │       │ type                │
│ provider            │       │ content             │
│ prompt              │       │ metadata (JSONB)    │
│ options (JSONB)     │       │ created_at          │
│ status              │       └─────────────────────┘
│ error               │
│ created_at          │
│ completed_at        │
└─────────────────────┘
```

### Key Design Decisions

1. **Dual Storage Pattern for Parameters**
   - `parameters` (JSONB): Complete parameter object for flexibility
   - Denormalized columns (`width`, `height`, etc.): Fast filtering and indexing

2. **Workflow Snapshots**
   - Every generation stores `workflow_json_snapshot`
   - Enables exact reproduction even if workflow is later modified

3. **Profile-Based Multi-Tenancy**
   - Each provider connection is a "profile"
   - Multiple ComfyUI instances supported via different profiles

---

## API Design

### RESTful Endpoints

```
/api
├── /health                    GET     System health check
│
├── /models                    
│   ├── /                      GET     List Ollama models
│   ├── /:name/load            POST    Load model into memory
│   └── /:name/unload          POST    Unload model
│
├── /chat                      POST    Send chat message to any provider
│
├── /profiles
│   ├── /                      GET     List all profiles
│   ├── /                      POST    Create profile
│   ├── /:id                   GET     Get profile details
│   ├── /:id                   PUT     Update profile
│   └── /:id                   DELETE  Delete profile
│
├── /tasks
│   ├── /                      GET     List tasks (with filters)
│   ├── /                      POST    Create task
│   ├── /:id                   GET     Get task details
│   ├── /:id                   DELETE  Cancel/delete task
│   └── /:id/retry             POST    Retry failed task
│
├── /comfyui
│   ├── /options               GET     Get samplers, schedulers, checkpoints
│   ├── /sessions
│   │   ├── /                  GET     List sessions
│   │   ├── /                  POST    Create session
│   │   ├── /:id               GET     Get session with generations
│   │   ├── /:id               PUT     Update session
│   │   ├── /:id               DELETE  Delete session
│   │   └── /:sessionId/generate POST  Generate with parameters
│   ├── /workflows
│   │   ├── /                  GET     List workflows
│   │   ├── /                  POST    Create workflow
│   │   ├── /:id               GET     Get workflow
│   │   ├── /:id               PUT     Update workflow
│   │   ├── /:id/parameters    PATCH   Update default parameters
│   │   └── /:id               DELETE  Delete workflow
│   ├── /generations
│   │   ├── /:id               GET     Get generation details
│   │   ├── /:id/workflow      GET     Get generation's workflow snapshot
│   │   └── /:id               DELETE  Delete generation
│   └── /image/:filename       GET     Proxy image from ComfyUI
│
└── /settings
    ├── /                      GET     Get provider settings
    └── /:provider             PUT     Update provider settings
```

### Response Format

All API responses follow a consistent structure:

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}

// Paginated
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Real-Time Communication

### WebSocket Events

```typescript
// Client → Server
socket.emit('subscribe:task', taskId);
socket.emit('subscribe:session', sessionId);

// Server → Client
socket.emit('task:created', { task });
socket.emit('task:started', { taskId, startedAt });
socket.emit('task:progress', { taskId, progress: 0.5, message: 'Processing...' });
socket.emit('task:completed', { taskId, result });
socket.emit('task:failed', { taskId, error });

socket.emit('generation:started', { generationId, promptId });
socket.emit('generation:progress', { generationId, node, progress });
socket.emit('generation:completed', { generationId, outputs });
socket.emit('generation:failed', { generationId, error });

socket.emit('notification', { type: 'info', message: '...' });
```

### ComfyUI WebSocket Integration

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Client    │                  │   Backend   │                  │   ComfyUI   │
│  (Browser)  │                  │  (Express)  │                  │  (Port 8188)│
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │  WebSocket Connect             │                                │
       │───────────────────────────────▶│                                │
       │                                │  WebSocket Connect             │
       │                                │───────────────────────────────▶│
       │                                │                                │
       │  Generate Request              │                                │
       │───────────────────────────────▶│  POST /prompt                  │
       │                                │───────────────────────────────▶│
       │                                │                                │
       │                                │◀─ progress event ──────────────│
       │◀─ generation:progress ─────────│                                │
       │                                │                                │
       │                                │◀─ executing event ─────────────│
       │◀─ generation:progress ─────────│                                │
       │                                │                                │
       │                                │◀─ executed event ──────────────│
       │◀─ generation:completed ────────│                                │
       │                                │                                │
```

---

## External Integrations

### Ollama (Local LLMs)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/tags` | List available models |
| `POST /api/generate` | Text generation |
| `POST /api/chat` | Chat completion |
| `POST /api/pull` | Download model |
| `DELETE /api/delete` | Remove model |

**Connection**: `http://host.docker.internal:11434` (from container)

### OpenAI

| Model Type | Models |
|------------|--------|
| Chat | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| Image | dall-e-3, dall-e-2 |

**SDK**: `openai` npm package

### Google Gemini

| Model | Purpose |
|-------|---------|
| gemini-pro | Text generation |
| gemini-pro-vision | Multimodal |

**SDK**: `@google/generative-ai` package

### Anthropic Claude

| Model | Purpose |
|-------|---------|
| claude-3-opus | Most capable |
| claude-3-sonnet | Balanced |
| claude-3-haiku | Fast |

**SDK**: `@anthropic-ai/sdk` package

### ComfyUI

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/prompt` | POST | Queue workflow execution |
| `/queue` | GET | Get queue status |
| `/history` | GET | Get execution history |
| `/view` | GET | Retrieve generated images |
| `/object_info` | GET | Get node definitions |
| WebSocket | - | Real-time progress events |

**Connection**: `http://host.docker.internal:8188` (from container)

---

## Security Considerations

### API Key Storage

```typescript
// API keys are encrypted at rest using AES-256-GCM
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte hex key

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // ... returns iv:authTag:encrypted
}

function decrypt(encrypted: string): string {
  // Reverse process
}
```

### Current Security Measures

- [x] API keys encrypted in database
- [x] Environment-based configuration
- [x] CORS configuration
- [x] Input validation middleware

### Planned Security Enhancements

- [ ] User authentication (JWT)
- [ ] Role-based access control
- [ ] Rate limiting
- [ ] Request signing
- [ ] Audit logging

---

## Deployment Architecture

### Docker Compose Services

```yaml
services:
  postgres:     # PostgreSQL 16 - Primary database
  redis:        # Redis 7 - Queue backend
  backend:      # Node.js Express API
  # frontend:   # (Served separately in dev, Nginx in prod)
```

### Port Mapping

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Backend API | 3001 | 3001 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| Ollama | 11434 | 11434 |
| ComfyUI | 8188 | 8188 |
| Frontend (dev) | 5173 | 5173 |

### Volume Mounts

```yaml
volumes:
  postgres_data:    # Persistent database storage
  redis_data:       # Queue persistence
  ./storage:        # Generated media files
```

---

## Design Decisions

### Why Bull + Redis for Queues?

**Decision**: Use Bull with Redis instead of in-memory queues

**Rationale**:
- Job persistence across restarts
- Built-in retry mechanisms with exponential backoff
- Delayed job scheduling
- Job prioritization
- Horizontal scaling capability
- Dashboard for monitoring (Bull Board)

### Why Store Complete Workflow Snapshots?

**Decision**: Store full `workflow_json_snapshot` per generation

**Rationale**:
- **Reproducibility**: Exact reproduction of any generation
- **Audit Trail**: Complete history of what was executed
- **Independence**: Generation remains valid even if workflow is modified/deleted
- **Debugging**: Easy to inspect exactly what was sent to ComfyUI

**Trade-off**: Increased storage (~10-50KB per generation)

### Why Denormalize Generation Parameters?

**Decision**: Store parameters both as JSONB and as individual columns

**Rationale**:
- JSONB provides flexibility for varying parameter sets
- Columns enable fast indexed queries ("find all 1024x1024 images")
- Efficient aggregations ("average steps used")
- Supports future analytics features

### Why Proxy ComfyUI Images?

**Decision**: Backend proxies image requests to ComfyUI

**Rationale**:
- ComfyUI returns file paths, not URLs
- Enables access control at backend level
- Consistent API surface for frontend
- Future: Can cache or transform images

---

## Future Considerations

### Scalability Path

1. **Horizontal API Scaling**: Stateless backend behind load balancer
2. **Queue Workers**: Separate worker processes for heavy tasks
3. **Database Replication**: Read replicas for query-heavy operations
4. **CDN for Media**: S3 + CloudFront for generated images

### Potential Enhancements

- **Workflow Visual Editor**: Node-based workflow creation in browser
- **Batch Processing**: Queue multiple generations with parameter sweeps
- **A/B Comparison**: Side-by-side generation comparison
- **Prompt Library**: Saved prompts with categories
- **Cost Tracking**: API usage and cost estimation
- **Multi-User**: Authentication, workspaces, sharing

---

## Appendix

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spoonfeeder
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# External Services
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188

# Security
ENCRYPTION_KEY=your-32-byte-hex-key

# Storage
MEDIA_STORAGE_PATH=./storage/media
```

### Running the System

```bash
# Start infrastructure
docker-compose up -d postgres redis

# Run migrations
cd backend && npm run migrate

# Start backend
npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev
```

### Useful Commands

```bash
# View logs
docker-compose logs -f backend

# Reset database
docker-compose down -v
docker-compose up -d postgres redis
npm run migrate

# Access PostgreSQL
docker exec -it spoonfeeder-db psql -U postgres -d spoonfeeder
```
