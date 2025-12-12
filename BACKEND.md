# Backend Implementation Plan

## Overview

Node.js/Express backend for the Spoon Feeder MVP - orchestrating LLM requests across multiple providers and ComfyUI media generation.

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Node.js 20+ | Runtime |
| Express | Web framework |
| TypeScript | Type safety |
| PostgreSQL | Database |
| Knex.js | SQL query builder |
| Bull | Task queue management |
| Redis | Queue backend |
| Socket.io | Real-time updates |
| Docker Compose | Container orchestration |

---

## Project Structure

```
├── docker-compose.yml
├── Dockerfile
├── src/
│   ├── config/
│   │   └── index.ts              # Environment config
│   ├── db/
│   │   ├── knex.ts               # Knex instance
│   │   └── migrations/           # Knex migrations
│   ├── controllers/
│   │   ├── models.controller.ts
│   │   ├── settings.controller.ts  # LLM provider settings
│   │   ├── tasks.controller.ts
│   │   ├── profiles.controller.ts
│   │   └── results.controller.ts
│   ├── services/
│   │   ├── ollama.service.ts     # Ollama API integration
│   │   ├── openai.service.ts     # OpenAI API integration
│   │   ├── gemini.service.ts     # Google Gemini integration
│   │   ├── claude.service.ts     # Anthropic Claude integration
│   │   ├── comfyui.service.ts    # ComfyUI integration
│   │   ├── queue.service.ts      # Task queue management
│   │   ├── notification.service.ts # Push notifications
│   │   └── websocket.service.ts  # Socket.io management
│   ├── routes/
│   │   ├── models.routes.ts
│   │   ├── settings.routes.ts    # LLM provider settings
│   │   ├── tasks.routes.ts
│   │   ├── profiles.routes.ts
│   │   └── results.routes.ts
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── router.ts             # LLM routing logic
│   │   └── storage.ts            # File storage utilities
│   ├── app.ts
│   └── server.ts
```

---

## API Endpoints

### Models API (Enhanced)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List all available Ollama models with details |
| GET | `/api/models/:name` | Get detailed model info (size, capabilities, description) |
| POST | `/api/models/:name/load` | Load a model into memory |
| POST | `/api/models/:name/unload` | Unload a model from memory |
| GET | `/api/models/:name/status` | Get model status |

### Settings API (LLM Providers) - UPDATED

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | List all provider settings (keys masked) |
| GET | `/api/settings/:provider` | Get specific provider settings |
| PUT | `/api/settings/:provider` | Update provider settings (key + endpoint) |
| POST | `/api/settings/:provider/test` | Test provider connection |
| DELETE | `/api/settings/:provider` | Remove provider configuration |

**Request Body for PUT `/api/settings/:provider`**:
```json
{
  "apiKey": "sk-...",
  "endpointUrl": "https://api.openai.com/v1",  // optional
  "defaultModel": "gpt-4"  // optional
}
```

**Security Requirements**:
- API keys encrypted at rest (use `crypto` module or similar)
- Keys masked in GET responses (show only last 4 chars)
- HTTPS required for all settings endpoints

### Tasks API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks (with filters) |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/:id` | Get task details |
| DELETE | `/api/tasks/:id` | Cancel/delete task |
| POST | `/api/tasks/:id/retry` | Retry failed task |

### Task History API (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/history` | Get paginated task history with filters |
| GET | `/api/tasks/history/export` | Export history as CSV/JSON |

### Profiles API (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List all saved profiles |
| POST | `/api/profiles` | Create new profile |
| GET | `/api/profiles/:id` | Get profile details |
| PUT | `/api/profiles/:id` | Update profile |
| DELETE | `/api/profiles/:id` | Delete profile |

### Results API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/results` | List completed results |
| GET | `/api/results/:id` | Get specific result |
| GET | `/api/results/:id/download` | Download media file |
| DELETE | `/api/results/:id` | Delete result |

### WebSocket Events (Socket.io)

| Event | Direction | Description |
|-------|-----------|-------------|
| `task:created` | Server → Client | New task added to queue |
| `task:started` | Server → Client | Task processing began |
| `task:progress` | Server → Client | Task progress update (0-100%) |
| `task:completed` | Server → Client | Task finished successfully |
| `task:failed` | Server → Client | Task failed with error |
| `notification` | Server → Client | General notification (info/warning) |

---

## Core Services

### 1. Ollama Service

```typescript
interface OllamaService {
  listModels(): Promise<Model[]>;
  loadModel(name: string): Promise<void>;
  unloadModel(name: string): Promise<void>;
  generate(model: string, prompt: string, options?: GenerateOptions): Promise<string>;
}
```

**Implementation Details**:
- [ ] Connect to Ollama API (default: `http://localhost:11434`)
- [ ] Handle model loading/unloading via `/api/pull` and memory management
- [ ] Stream responses for long generations
- [ ] Handle connection errors gracefully

---

### 2. OpenAI Service

```typescript
interface OpenAIService {
  testConnection(): Promise<boolean>;
  generate(prompt: string, options?: OpenAIOptions): Promise<string>;
  generateImage(prompt: string, options?: ImageOptions): Promise<string>;
}
```

**Implementation Details**:
- [ ] Use official `openai` npm package
- [ ] Support GPT-4, GPT-3.5-turbo models
- [ ] Support DALL-E image generation
- [ ] Handle rate limits and retries

---

### 3. Gemini Service

```typescript
interface GeminiService {
  testConnection(): Promise<boolean>;
  generate(prompt: string, options?: GeminiOptions): Promise<string>;
}
```

**Implementation Details**:
- [ ] Use `@google/generative-ai` package
- [ ] Support Gemini Pro model
- [ ] Handle safety settings

---

### 4. Claude Service

```typescript
interface ClaudeService {
  testConnection(): Promise<boolean>;
  generate(prompt: string, options?: ClaudeOptions): Promise<string>;
}
```

**Implementation Details**:
- [ ] Use `@anthropic-ai/sdk` package
- [ ] Support Claude 3 models
- [ ] Handle conversation context

---

### 5. ComfyUI Service

```typescript
interface ComfyUIService {
  listWorkflows(): Promise<Workflow[]>;
  loadWorkflow(path: string): Promise<WorkflowConfig>;
  executeWorkflow(config: WorkflowConfig, params: Record<string, any>): Promise<MediaResult>;
  getStatus(promptId: string): Promise<GenerationStatus>;
}
```

**Implementation Details**:
- [ ] Connect to ComfyUI WebSocket API
- [ ] Load and parse workflow JSON files
- [ ] Queue prompts and monitor completion
- [ ] Retrieve generated images/videos

---

### 6. Task Queue Service

```typescript
interface QueueService {
  addTask(task: TaskInput): Promise<Task>;
  getTask(id: string): Promise<Task>;
  listTasks(filters?: TaskFilters): Promise<Task[]>;
  cancelTask(id: string): Promise<void>;
  processTask(task: Task): Promise<Result>;
}
```

**Implementation Details**:
- [ ] Use Bull queue for job management
- [ ] Implement task routing logic
- [ ] Handle concurrent task limits
- [ ] Retry failed tasks with exponential backoff
- [ ] Emit status updates via WebSocket

---

### 7. WebSocket Service (NEW)

```typescript
interface WebSocketService {
  initialize(server: HttpServer): void;
  emitToAll(event: string, data: any): void;
  emitToClient(clientId: string, event: string, data: any): void;
  getConnectedClients(): number;
}
```

**Implementation Details**:
- [ ] Initialize Socket.io with Express server
- [ ] Handle client connections/disconnections
- [ ] Broadcast task status updates to all clients
- [ ] Room-based subscriptions (optional: per-task)

---

### 8. Notification Service (NEW)

```typescript
interface NotificationService {
  sendTaskComplete(task: Task): void;
  sendTaskFailed(task: Task, error: string): void;
  sendInfo(message: string): void;
  sendWarning(message: string): void;
}
```

**Implementation Details**:
- [ ] Integrate with WebSocket service
- [ ] Format notification payloads
- [ ] Optional: Store notifications in DB for history

---

## Task Router

The router determines which service handles each task:

```typescript
function routeTask(task: Task): Service {
  // Text generation
  if (task.type === 'text') {
    switch (task.provider) {
      case 'ollama': return ollamaService;
      case 'openai': return openaiService;
      case 'gemini': return geminiService;
      case 'claude': return claudeService;
    }
  }
  
  // Media generation
  if (['image', 'video', 'audio'].includes(task.type)) {
    if (task.provider === 'openai') return openaiService; // DALL-E
    return comfyuiService; // Default for media
  }
}
```

---

## Database Schema (Knex.js Migrations)

### provider_settings table (UPDATED)

```typescript
exports.up = function(knex) {
  return knex.schema.createTable('provider_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('provider').unique().notNullable(); // openai, gemini, claude
    table.text('api_key').notNullable(); // encrypted at rest
    table.string('endpoint_url'); // custom endpoint (optional)
    table.string('default_model'); // preferred model (optional)
    table.timestamp('last_tested');
    table.string('status').defaultTo('unknown'); // connected, disconnected, error, unknown
    table.text('error_message');
    table.timestamps(true, true);
  });
};
```

### tasks table

```typescript
exports.up = function(knex) {
  return knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('type').notNullable(); // text, image, video, audio
    table.string('provider').notNullable(); // ollama, openai, gemini, claude, comfyui
    table.text('prompt').notNullable();
    table.jsonb('options');
    table.string('status').defaultTo('pending');
    table.text('error');
    table.timestamps(true, true);
    table.timestamp('completed_at');
  });
};
```

### results table

```typescript
exports.up = function(knex) {
  return knex.schema.createTable('results', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').unique().references('id').inTable('tasks').onDelete('CASCADE');
    table.string('type').notNullable(); // text, image, video, audio
    table.text('content').notNullable(); // text content or file path
    table.jsonb('metadata');
    table.timestamps(true, true);
  });
};
```

### comfy_workflows table

```typescript
exports.up = function(knex) {
  return knex.schema.createTable('comfy_workflows', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('path').notNullable();
    table.text('description');
  });
};
```

### profiles table (NEW)

```typescript
exports.up = function(knex) {
  return knex.schema.createTable('profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.string('type').notNullable(); // text, image, video, audio
    table.string('provider').notNullable(); // ollama, openai, gemini, claude, comfyui
    table.jsonb('options'); // temperature, max_tokens, etc.
    table.text('prompt_template'); // optional default prompt
    table.timestamps(true, true);
  });
};
```

---

## Environment Configuration

```env
# Server
PORT=3001
NODE_ENV=development

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spoonfeeder
DB_USER=postgres
DB_PASSWORD=postgres

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# External Services
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188

# API Keys (stored in DB, loaded at runtime)
# OPENAI_API_KEY=
# GEMINI_API_KEY=
# CLAUDE_API_KEY=

# Storage
MEDIA_STORAGE_PATH=./storage/media
```

---

## Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: spoonfeeder-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: spoonfeeder
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: spoonfeeder-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: spoonfeeder-backend
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: spoonfeeder
      DB_USER: postgres
      DB_PASSWORD: postgres
      REDIS_HOST: redis
      REDIS_PORT: 6379
      OLLAMA_URL: http://host.docker.internal:11434
      COMFYUI_URL: http://host.docker.internal:8188
    volumes:
      - ./storage:/app/storage
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

---

## Error Handling

```typescript
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Specific errors
class ModelNotFoundError extends AppError { }
class ProviderConnectionError extends AppError { }
class TaskProcessingError extends AppError { }
class InvalidApiKeyError extends AppError { }
```

---

## MVP Checklist

### Phase 1: Setup
- [ ] Initialize Node.js + TypeScript project
- [ ] Configure Express with middleware
- [ ] Set up Docker Compose (PostgreSQL + Redis)
- [ ] Configure Knex.js and create migrations
- [ ] Create base project structure

### Phase 2: Core Services
- [ ] Implement Ollama service (with enhanced model info)
- [ ] Implement OpenAI service
- [ ] Implement Gemini service
- [ ] Implement Claude service
- [ ] Create task router

### Phase 3: API Layer
- [ ] Build Models API endpoints (with details endpoint)
- [ ] Build API Keys endpoints (with encryption)
- [ ] Build Tasks API endpoints
- [ ] Build Results API endpoints

### Phase 4: Queue System
- [ ] Set up Bull queue
- [ ] Implement task processing
- [ ] Handle retries and failures

### Phase 5: Real-Time & Notifications (NEW)
- [ ] Set up Socket.io with Express
- [ ] Implement WebSocket service
- [ ] Implement Notification service
- [ ] Emit task status updates (created/started/progress/completed/failed)

### Phase 6: Profiles & History (NEW)
- [ ] Build Profiles API endpoints (CRUD)
- [ ] Build Task History API endpoints
- [ ] Implement history filtering (date, provider, type, status)
- [ ] Add export functionality (CSV/JSON)

### Phase 7: ComfyUI Integration
- [ ] Connect to ComfyUI WebSocket
- [ ] Implement workflow loading
- [ ] Execute and monitor generation
- [ ] Store generated media

### Phase 8: Polish
- [ ] Add request validation
- [ ] Implement logging
- [ ] Add health check endpoint
- [ ] Error handling & recovery
