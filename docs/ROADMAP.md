# Spoon Feeder Development Roadmap

> **Document Version**: 1.0  
> **Created**: December 2024  
> **Target**: Single-user, Desktop, ComfyUI-focused

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current State](#current-state)
- [Phase 1: Real-Time Foundation](#phase-1-real-time-foundation)
- [Phase 2: ComfyUI Batch Generation](#phase-2-comfyui-batch-generation)
- [Phase 3: Task Queue & Scheduling](#phase-3-task-queue--scheduling)
- [Phase 4: Future Enhancements](#phase-4-future-enhancements)
- [Technical Debt & Maintenance](#technical-debt--maintenance)
- [Timeline Summary](#timeline-summary)

---

## Executive Summary

### Vision

Transform Spoon Feeder from a functional MVP into a polished, efficient AI content orchestration platform with focus on:

1. **Real-time feedback** - Replace polling with WebSocket for instant status updates
2. **Batch generation** - Generate multiple images with seed/prompt variations
3. **Background processing** - Async task queue with scheduling support
4. **Power-user features** - LoRA, upscaling, and advanced workflows (future)

### Priorities

| Priority | Focus Area | Rationale |
|----------|------------|-----------|
| **P0** | Real-time WebSocket | Foundation for all real-time features |
| **P0** | Batch generation | Highest-impact ComfyUI feature |
| **P1** | Task queue activation | Enable background/scheduled processing |
| **P1** | Scheduled tasks | Nightly batches, model health checks |
| **P2** | LoRA support | Power-user feature after batch |
| **P3** | Upscaling, ControlNet | Nice-to-have enhancements |

### Non-Goals (For Now)

- Multi-user authentication
- Mobile responsiveness
- Comprehensive test coverage
- Chat streaming
- Video/audio generation

---

## Current State

### What's Complete ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Database schema | Complete | 14+ migrations, robust design |
| ComfyUI sessions | Complete | Create, manage, delete |
| ComfyUI workflows | Complete | Import, select, parameter extraction |
| ComfyUI generation | Complete | Single image generation working |
| Image proxy | Complete | Serves ComfyUI images through backend |
| Parameter system | Complete | Dynamic parameters, persistence |
| Reproducibility | Complete | Full workflow snapshots stored |
| Profile system | Complete | Multi-provider configurations |
| Conversations | 80% | Basic chat, no streaming |
| Frontend shell | Complete | Layout, routing, React Query |
| WebSocket backend | 40% | Service exists, not integrated |

### What's Missing ❌

| Component | Impact | Phase |
|-----------|--------|-------|
| WebSocket frontend | High | Phase 1 |
| Real-time progress | High | Phase 1 |
| Batch generation | High | Phase 2 |
| Task worker | High | Phase 3 |
| Scheduled tasks | Medium | Phase 3 |
| LoRA UI | Medium | Phase 4 |
| Upscaling | Low | Phase 4 |

---

## Phase 1: Real-Time Foundation

> **Duration**: 1 week  
> **Goal**: Replace polling with WebSocket for instant feedback

### Overview

Currently, the ComfyUI page polls every 2 seconds to check generation status. This creates unnecessary server load and delayed feedback. Phase 1 establishes WebSocket communication for real-time updates.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAL-TIME ARCHITECTURE                             │
│                                                                              │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │   Frontend  │◄───────►│   Backend   │◄───────►│   ComfyUI   │           │
│  │             │  WS     │             │  WS     │             │           │
│  │  React +    │         │  Express +  │         │  Port 8188  │           │
│  │  Socket.io  │         │  Socket.io  │         │             │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│        │                        │                       │                   │
│        │                        │                       │                   │
│        ▼                        ▼                       ▼                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │ useWebSocket│         │  WebSocket  │         │  Events:    │           │
│  │    hook     │         │   Bridge    │         │  - progress │           │
│  │             │         │   Service   │         │  - executed │           │
│  │ - connect   │         │             │         │  - error    │           │
│  │ - events    │         │ - forward   │         │             │           │
│  │ - reconnect │         │ - transform │         │             │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Frontend WebSocket Hook

**File**: `frontend/src/hooks/useWebSocket.ts`

**Purpose**: Manage Socket.io connection and event handling

```typescript
interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  socket: Socket | null;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
}

function useWebSocket(options?: UseWebSocketOptions): UseWebSocketReturn;
```

**Features**:
- [ ] Auto-connect on mount
- [ ] Auto-reconnect with exponential backoff
- [ ] Connection status tracking
- [ ] Event subscription/unsubscription
- [ ] Cleanup on unmount

**Implementation**:

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(options?: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      options?.onConnect?.();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      options?.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      options?.onError?.(error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { isConnected, socket: socketRef.current, subscribe };
}
```

---

### 1.2 ComfyUI WebSocket Bridge

**File**: `backend/src/services/comfyui-websocket.service.ts`

**Purpose**: Connect to ComfyUI WebSocket, forward events to clients

**ComfyUI WebSocket Events**:

| Event | Payload | Description |
|-------|---------|-------------|
| `execution_start` | `{ prompt_id }` | Generation started |
| `execution_cached` | `{ prompt_id, nodes }` | Using cached nodes |
| `executing` | `{ prompt_id, node }` | Currently executing node |
| `progress` | `{ value, max }` | Step progress (e.g., 5/20) |
| `executed` | `{ prompt_id, node, output }` | Node completed with output |
| `execution_error` | `{ prompt_id, ... }` | Error occurred |

**Implementation**:

```typescript
// backend/src/services/comfyui-websocket.service.ts
import WebSocket from 'ws';
import { getWebSocketService } from './websocket.service';

interface ComfyUIWebSocketBridge {
  connect(comfyUrl: string): void;
  disconnect(): void;
  isConnected(): boolean;
}

class ComfyUIWebSocketBridgeImpl implements ComfyUIWebSocketBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private comfyUrl: string = '';

  connect(comfyUrl: string): void {
    this.comfyUrl = comfyUrl;
    const wsUrl = comfyUrl.replace('http', 'ws') + '/ws';
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.on('open', () => {
      console.log('Connected to ComfyUI WebSocket');
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });
    
    this.ws.on('close', () => {
      this.scheduleReconnect();
    });
    
    this.ws.on('error', (error) => {
      console.error('ComfyUI WebSocket error:', error);
    });
  }

  private handleMessage(message: any): void {
    const wsService = getWebSocketService();
    if (!wsService) return;

    switch (message.type) {
      case 'progress':
        wsService.emit('comfyui:progress', {
          promptId: message.data.prompt_id,
          value: message.data.value,
          max: message.data.max,
          percentage: Math.round((message.data.value / message.data.max) * 100),
        });
        break;
        
      case 'executing':
        wsService.emit('comfyui:executing', {
          promptId: message.data.prompt_id,
          node: message.data.node,
        });
        break;
        
      case 'executed':
        wsService.emit('comfyui:executed', {
          promptId: message.data.prompt_id,
          node: message.data.node,
          output: message.data.output,
        });
        break;
        
      case 'execution_error':
        wsService.emit('comfyui:error', {
          promptId: message.data.prompt_id,
          error: message.data.exception_message,
        });
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.comfyUrl);
    }, 5000);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const comfyUIWebSocketBridge = new ComfyUIWebSocketBridgeImpl();
```

---

### 1.3 Frontend Progress Integration

**File**: `frontend/src/pages/ComfyUI.tsx` (updates)

**Purpose**: Display real-time progress instead of polling

**New State**:
```typescript
interface GenerationProgress {
  generationId: string;
  promptId: string;
  percentage: number;
  currentStep: number;
  totalSteps: number;
  currentNode?: string;
  previewImage?: string;
}

const [progress, setProgress] = useState<Map<string, GenerationProgress>>(new Map());
```

**WebSocket Subscription**:
```typescript
useEffect(() => {
  const unsubProgress = subscribe('comfyui:progress', (data) => {
    setProgress(prev => {
      const next = new Map(prev);
      const existing = next.get(data.promptId) || {};
      next.set(data.promptId, {
        ...existing,
        promptId: data.promptId,
        percentage: data.percentage,
        currentStep: data.value,
        totalSteps: data.max,
      });
      return next;
    });
  });

  const unsubExecuted = subscribe('comfyui:executed', (data) => {
    // Check for preview images
    if (data.output?.images) {
      setProgress(prev => {
        const next = new Map(prev);
        const existing = next.get(data.promptId) || {};
        next.set(data.promptId, {
          ...existing,
          previewImage: `/api/comfyui/image/${data.output.images[0].filename}`,
        });
        return next;
      });
    }
  });

  const unsubComplete = subscribe('comfyui:complete', (data) => {
    // Remove from progress, refresh history
    setProgress(prev => {
      const next = new Map(prev);
      next.delete(data.promptId);
      return next;
    });
    refetchSession();
  });

  return () => {
    unsubProgress();
    unsubExecuted();
    unsubComplete();
  };
}, [subscribe]);
```

---

### 1.4 Progress UI Component

**File**: `frontend/src/components/comfyui/GenerationProgress.tsx`

**Purpose**: Display live progress for active generations

```typescript
interface GenerationProgressProps {
  progress: GenerationProgress;
}

export function GenerationProgress({ progress }: GenerationProgressProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        {/* Preview thumbnail */}
        {progress.previewImage && (
          <img 
            src={progress.previewImage} 
            className="w-16 h-16 rounded object-cover"
            alt="Preview"
          />
        )}
        
        <div className="flex-1">
          {/* Progress bar */}
          <div className="h-2 bg-[var(--bg-darker)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          
          {/* Progress text */}
          <div className="flex justify-between mt-1 text-sm text-[var(--text-secondary)]">
            <span>Step {progress.currentStep} / {progress.totalSteps}</span>
            <span>{progress.percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 1.5 Backend Integration Points

**Update**: `backend/src/index.ts`

```typescript
import { comfyUIWebSocketBridge } from './services/comfyui-websocket.service';

// After Socket.io initialization
comfyUIWebSocketBridge.connect(process.env.COMFYUI_URL || 'http://localhost:8188');
```

**Update**: `backend/src/controllers/comfyui.controller.ts`

```typescript
// After creating generation record, emit event
const wsService = getWebSocketService();
wsService?.emit('comfyui:generation:started', {
  generationId: generation.id,
  promptId: result.prompt_id,
  sessionId,
});
```

---

### 1.6 Remove Polling

**Update**: `frontend/src/pages/ComfyUI.tsx`

Remove the polling `useEffect`:

```typescript
// DELETE THIS:
useEffect(() => {
  if (pollingIds.size === 0) return;
  
  const interval = setInterval(async () => {
    // ... polling logic
  }, 2000);
  
  return () => clearInterval(interval);
}, [pollingIds]);
```

Replace with WebSocket-based completion handling.

---

### Phase 1 Acceptance Criteria

- [ ] WebSocket connects automatically on page load
- [ ] Connection status indicator in UI
- [ ] Real-time progress bar during generation
- [ ] Live step counter (e.g., "Step 12/20")
- [ ] Preview images appear as nodes complete
- [ ] Generation history updates instantly on completion
- [ ] No polling in network tab
- [ ] Automatic reconnection on disconnect

### Phase 1 Deliverables

| Deliverable | Type | Location |
|-------------|------|----------|
| `useWebSocket` hook | New file | `frontend/src/hooks/useWebSocket.ts` |
| ComfyUI WS bridge | New file | `backend/src/services/comfyui-websocket.service.ts` |
| GenerationProgress | New component | `frontend/src/components/comfyui/GenerationProgress.tsx` |
| ComfyUI.tsx updates | Modified | `frontend/src/pages/ComfyUI.tsx` |
| index.ts updates | Modified | `backend/src/index.ts` |

---

## Phase 2: ComfyUI Batch Generation

> **Duration**: 2-3 weeks  
> **Goal**: Generate multiple images with variations

### Overview

Batch generation allows users to queue multiple generations with systematic variations. This is the highest-impact feature for ComfyUI users who want to explore prompt/seed space efficiently.

### Scope (Simple)

**In Scope**:
- Seed variations (N images with different seeds)
- Prompt list (queue multiple prompts)
- Basic batch UI (create, monitor, cancel)

**Out of Scope (Phase 4+)**:
- Parameter sweeps (varying CFG, steps, etc.)
- Complex variation matrices
- Batch templates/presets

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BATCH GENERATION FLOW                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         BATCH REQUEST                                │    │
│  │  {                                                                   │    │
│  │    type: "seed_variation",                                          │    │
│  │    base_prompt: "a cyberpunk city at night",                        │    │
│  │    base_parameters: { width: 1024, height: 1024, steps: 20, ... },  │    │
│  │    count: 4,                                                         │    │
│  │    seed_mode: "random" | "sequential"                               │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      BATCH PROCESSOR                                 │    │
│  │                                                                      │    │
│  │   1. Create batch record                                            │    │
│  │   2. Generate N seed values                                         │    │
│  │   3. Create N generation records                                    │    │
│  │   4. Queue to ComfyUI sequentially                                  │    │
│  │   5. Track progress per generation                                  │    │
│  │   6. Update batch status on completion                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ Gen #1   │ │ Gen #2   │ │ Gen #3   │ │ Gen #4   │                       │
│  │ seed: 42 │ │ seed: 43 │ │ seed: 44 │ │ seed: 45 │                       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1 Database Schema

**New Migration**: `XXX_create_comfyui_batches.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comfyui_batches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable()
      .references('id').inTable('comfyui_sessions')
      .onDelete('CASCADE');
    table.uuid('workflow_id')
      .references('id').inTable('comfyui_workflows')
      .onDelete('SET NULL');
    
    // Batch configuration
    table.string('batch_type', 50).notNullable(); // 'seed_variation', 'prompt_list'
    table.string('name', 255);
    table.text('base_prompt');
    table.text('negative_prompt');
    table.jsonb('base_parameters').notNullable();
    
    // For seed_variation
    table.string('seed_mode', 20); // 'random', 'sequential'
    table.bigInteger('start_seed');
    
    // For prompt_list
    table.jsonb('prompts'); // Array of prompt strings
    
    // Progress tracking
    table.integer('total_count').notNullable();
    table.integer('completed_count').defaultTo(0);
    table.integer('failed_count').defaultTo(0);
    
    // Status
    table.string('status', 20).defaultTo('pending');
    // pending, running, paused, completed, failed, cancelled
    
    table.text('error');
    table.timestamps(true, true);
    table.timestamp('started_at');
    table.timestamp('completed_at');
    
    // Indexes
    table.index('session_id');
    table.index('status');
    table.index('created_at');
  });

  // Add batch_id to generations
  await knex.schema.alterTable('comfyui_generations', (table) => {
    table.uuid('batch_id')
      .references('id').inTable('comfyui_batches')
      .onDelete('SET NULL');
    table.integer('batch_index');
    
    table.index('batch_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('comfyui_generations', (table) => {
    table.dropColumn('batch_id');
    table.dropColumn('batch_index');
  });
  
  await knex.schema.dropTableIfExists('comfyui_batches');
}
```

---

### 2.2 Type Definitions

**File**: `backend/src/types/comfyui.ts` (additions)

```typescript
export type BatchType = 'seed_variation' | 'prompt_list';
export type BatchStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SeedMode = 'random' | 'sequential';

export interface BatchConfig {
  type: BatchType;
  name?: string;
  basePrompt: string;
  negativePrompt?: string;
  baseParameters: GenerationParameters;
  workflowId?: string;
}

export interface SeedVariationConfig extends BatchConfig {
  type: 'seed_variation';
  count: number;
  seedMode: SeedMode;
  startSeed?: number; // For sequential mode
}

export interface PromptListConfig extends BatchConfig {
  type: 'prompt_list';
  prompts: string[];
}

export interface ComfyUIBatch {
  id: string;
  sessionId: string;
  workflowId?: string;
  batchType: BatchType;
  name?: string;
  basePrompt?: string;
  negativePrompt?: string;
  baseParameters: GenerationParameters;
  seedMode?: SeedMode;
  startSeed?: number;
  prompts?: string[];
  totalCount: number;
  completedCount: number;
  failedCount: number;
  status: BatchStatus;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  generations?: ComfyUIGeneration[];
}

export interface CreateBatchRequest {
  sessionId: string;
  config: SeedVariationConfig | PromptListConfig;
}
```

**File**: `frontend/src/types/comfyui.ts` (additions)

```typescript
// Mirror the backend types for frontend use
export type BatchType = 'seed_variation' | 'prompt_list';
export type BatchStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ComfyUIBatch {
  id: string;
  session_id: string;
  batch_type: BatchType;
  name?: string;
  base_prompt?: string;
  negative_prompt?: string;
  base_parameters: GenerationParameters;
  total_count: number;
  completed_count: number;
  failed_count: number;
  status: BatchStatus;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}
```

---

### 2.3 API Endpoints

**New Routes**: `backend/src/routes/comfyui.routes.ts` (additions)

```typescript
// Batch endpoints
router.post('/sessions/:sessionId/batches', createBatch);
router.get('/sessions/:sessionId/batches', listBatches);
router.get('/batches/:batchId', getBatch);
router.post('/batches/:batchId/pause', pauseBatch);
router.post('/batches/:batchId/resume', resumeBatch);
router.post('/batches/:batchId/cancel', cancelBatch);
router.delete('/batches/:batchId', deleteBatch);
```

**Endpoint Details**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions/:sessionId/batches` | Create and start a batch |
| GET | `/sessions/:sessionId/batches` | List batches for session |
| GET | `/batches/:batchId` | Get batch with generations |
| POST | `/batches/:batchId/pause` | Pause batch execution |
| POST | `/batches/:batchId/resume` | Resume paused batch |
| POST | `/batches/:batchId/cancel` | Cancel batch (stop remaining) |
| DELETE | `/batches/:batchId` | Delete batch and generations |

---

### 2.4 Batch Controller

**File**: `backend/src/controllers/comfyui-batch.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';
import { batchService } from '../services/comfyui-batch.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const { config } = req.body;

    // Validate session exists
    const session = await db('comfyui_sessions').where('id', sessionId).first();
    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    // Validate config
    if (!config.type) {
      throw new BadRequestError('Batch type is required');
    }
    
    if (config.type === 'seed_variation') {
      if (!config.count || config.count < 1 || config.count > 100) {
        throw new BadRequestError('Count must be between 1 and 100');
      }
      if (!config.basePrompt) {
        throw new BadRequestError('Base prompt is required');
      }
    }
    
    if (config.type === 'prompt_list') {
      if (!config.prompts || !Array.isArray(config.prompts) || config.prompts.length === 0) {
        throw new BadRequestError('Prompts array is required');
      }
      if (config.prompts.length > 100) {
        throw new BadRequestError('Maximum 100 prompts per batch');
      }
    }

    // Create and start batch
    const batch = await batchService.createBatch(sessionId, config);

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
}

export async function listBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = db('comfyui_batches')
      .where('session_id', sessionId)
      .orderBy('created_at', 'desc');

    if (status) {
      query = query.where('status', status);
    }

    const batches = await query.limit(Number(limit)).offset(Number(offset));

    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
}

export async function getBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params;

    const batch = await db('comfyui_batches').where('id', batchId).first();
    if (!batch) {
      throw new NotFoundError(`Batch ${batchId} not found`);
    }

    // Get generations for this batch
    const generations = await db('comfyui_generations')
      .where('batch_id', batchId)
      .orderBy('batch_index', 'asc');

    res.json({ 
      success: true, 
      data: { ...batch, generations } 
    });
  } catch (error) {
    next(error);
  }
}

export async function pauseBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params;
    await batchService.pauseBatch(batchId);
    res.json({ success: true, message: 'Batch paused' });
  } catch (error) {
    next(error);
  }
}

export async function resumeBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params;
    await batchService.resumeBatch(batchId);
    res.json({ success: true, message: 'Batch resumed' });
  } catch (error) {
    next(error);
  }
}

export async function cancelBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params;
    await batchService.cancelBatch(batchId);
    res.json({ success: true, message: 'Batch cancelled' });
  } catch (error) {
    next(error);
  }
}

export async function deleteBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId } = req.params;
    
    // Delete generations first (cascade should handle this, but be explicit)
    await db('comfyui_generations').where('batch_id', batchId).delete();
    await db('comfyui_batches').where('id', batchId).delete();
    
    res.json({ success: true, message: 'Batch deleted' });
  } catch (error) {
    next(error);
  }
}
```

---

### 2.5 Batch Service

**File**: `backend/src/services/comfyui-batch.service.ts`

```typescript
import { db } from '../db/knex';
import { getWebSocketService } from './websocket.service';
import { generateImage } from './comfyui.service';
import { NotFoundError, BadRequestError } from '../utils/errors';

class BatchService {
  private activeBatches: Map<string, { paused: boolean; cancelled: boolean }> = new Map();

  async createBatch(sessionId: string, config: any): Promise<any> {
    const batchId = await db.transaction(async (trx) => {
      // Create batch record
      const [batch] = await trx('comfyui_batches').insert({
        session_id: sessionId,
        workflow_id: config.workflowId,
        batch_type: config.type,
        name: config.name,
        base_prompt: config.basePrompt,
        negative_prompt: config.negativePrompt,
        base_parameters: JSON.stringify(config.baseParameters),
        seed_mode: config.seedMode,
        start_seed: config.startSeed,
        prompts: config.prompts ? JSON.stringify(config.prompts) : null,
        total_count: config.type === 'seed_variation' ? config.count : config.prompts.length,
        status: 'pending',
      }).returning('*');

      return batch.id;
    });

    // Start processing asynchronously
    this.processBatch(batchId).catch(console.error);

    return db('comfyui_batches').where('id', batchId).first();
  }

  private async processBatch(batchId: string): Promise<void> {
    this.activeBatches.set(batchId, { paused: false, cancelled: false });

    try {
      // Update status to running
      await db('comfyui_batches')
        .where('id', batchId)
        .update({ status: 'running', started_at: new Date() });

      const batch = await db('comfyui_batches').where('id', batchId).first();
      const session = await db('comfyui_sessions')
        .join('profiles', 'comfyui_sessions.profile_id', 'profiles.id')
        .select('comfyui_sessions.*', 'profiles.url as profile_url')
        .where('comfyui_sessions.id', batch.session_id)
        .first();

      const baseParams = typeof batch.base_parameters === 'string' 
        ? JSON.parse(batch.base_parameters) 
        : batch.base_parameters;

      // Generate items based on batch type
      const items = this.generateBatchItems(batch);

      for (let i = 0; i < items.length; i++) {
        const state = this.activeBatches.get(batchId);
        
        // Check for cancellation
        if (state?.cancelled) {
          await db('comfyui_batches')
            .where('id', batchId)
            .update({ status: 'cancelled', completed_at: new Date() });
          break;
        }

        // Check for pause
        while (state?.paused) {
          await this.sleep(1000);
          if (this.activeBatches.get(batchId)?.cancelled) break;
        }

        const item = items[i];
        
        try {
          // Create generation record
          const generation = await this.createGeneration(
            batch, 
            session, 
            item, 
            i,
            baseParams
          );

          // Execute generation
          await this.executeGeneration(generation, session.profile_url);

          // Update batch progress
          await db('comfyui_batches')
            .where('id', batchId)
            .increment('completed_count', 1);

          // Emit progress event
          this.emitProgress(batchId, i + 1, items.length);

        } catch (error: any) {
          console.error(`Batch item ${i} failed:`, error);
          
          await db('comfyui_batches')
            .where('id', batchId)
            .increment('failed_count', 1);
        }
      }

      // Mark batch complete
      const finalBatch = await db('comfyui_batches').where('id', batchId).first();
      if (finalBatch.status === 'running') {
        await db('comfyui_batches')
          .where('id', batchId)
          .update({ 
            status: finalBatch.failed_count === finalBatch.total_count ? 'failed' : 'completed',
            completed_at: new Date(),
          });
      }

    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  private generateBatchItems(batch: any): Array<{ prompt: string; seed: number }> {
    const items: Array<{ prompt: string; seed: number }> = [];

    if (batch.batch_type === 'seed_variation') {
      const startSeed = batch.start_seed || Math.floor(Math.random() * 2147483647);
      
      for (let i = 0; i < batch.total_count; i++) {
        const seed = batch.seed_mode === 'sequential' 
          ? startSeed + i 
          : Math.floor(Math.random() * 2147483647);
          
        items.push({
          prompt: batch.base_prompt,
          seed,
        });
      }
    } else if (batch.batch_type === 'prompt_list') {
      const prompts = typeof batch.prompts === 'string' 
        ? JSON.parse(batch.prompts) 
        : batch.prompts;
        
      for (const prompt of prompts) {
        items.push({
          prompt,
          seed: Math.floor(Math.random() * 2147483647),
        });
      }
    }

    return items;
  }

  private async createGeneration(
    batch: any, 
    session: any, 
    item: { prompt: string; seed: number },
    index: number,
    baseParams: any
  ): Promise<any> {
    const [generation] = await db('comfyui_generations').insert({
      session_id: batch.session_id,
      workflow_id: batch.workflow_id,
      batch_id: batch.id,
      batch_index: index,
      prompt_text: item.prompt,
      negative_prompt: batch.negative_prompt,
      parameters: JSON.stringify({ ...baseParams, seed: item.seed }),
      seed: item.seed,
      width: baseParams.width,
      height: baseParams.height,
      steps: baseParams.steps,
      cfg_scale: baseParams.cfg_scale,
      sampler_name: baseParams.sampler_name,
      scheduler: baseParams.scheduler,
      status: 'pending',
    }).returning('*');

    return generation;
  }

  private async executeGeneration(generation: any, comfyUrl: string): Promise<void> {
    // Implementation similar to existing single generation
    // but with batch-aware status updates
    // ... (integrate with existing comfyui.service.ts)
  }

  private emitProgress(batchId: string, completed: number, total: number): void {
    const wsService = getWebSocketService();
    wsService?.emit('batch:progress', {
      batchId,
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
    });
  }

  async pauseBatch(batchId: string): Promise<void> {
    const state = this.activeBatches.get(batchId);
    if (state) {
      state.paused = true;
      await db('comfyui_batches').where('id', batchId).update({ status: 'paused' });
    }
  }

  async resumeBatch(batchId: string): Promise<void> {
    const state = this.activeBatches.get(batchId);
    if (state) {
      state.paused = false;
      await db('comfyui_batches').where('id', batchId).update({ status: 'running' });
    }
  }

  async cancelBatch(batchId: string): Promise<void> {
    const state = this.activeBatches.get(batchId);
    if (state) {
      state.cancelled = true;
    }
    await db('comfyui_batches').where('id', batchId).update({ status: 'cancelled' });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const batchService = new BatchService();
```

---

### 2.6 Frontend Batch UI

**File**: `frontend/src/components/comfyui/BatchModal.tsx`

```typescript
import { useState } from 'react';
import { X, Sparkles, List } from 'lucide-react';
import type { GenerationParameters } from '../../types/comfyui';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: BatchConfig) => void;
  currentParameters: GenerationParameters;
  currentPrompt: string;
  currentNegativePrompt: string;
}

type BatchType = 'seed_variation' | 'prompt_list';

interface BatchConfig {
  type: BatchType;
  name?: string;
  // Seed variation
  count?: number;
  seedMode?: 'random' | 'sequential';
  startSeed?: number;
  // Prompt list
  prompts?: string[];
}

export default function BatchModal({
  isOpen,
  onClose,
  onSubmit,
  currentParameters,
  currentPrompt,
  currentNegativePrompt,
}: BatchModalProps) {
  const [batchType, setBatchType] = useState<BatchType>('seed_variation');
  const [name, setName] = useState('');
  
  // Seed variation state
  const [count, setCount] = useState(4);
  const [seedMode, setSeedMode] = useState<'random' | 'sequential'>('random');
  const [startSeed, setStartSeed] = useState('');
  
  // Prompt list state
  const [promptsText, setPromptsText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const config: BatchConfig = {
      type: batchType,
      name: name || undefined,
    };

    if (batchType === 'seed_variation') {
      config.count = count;
      config.seedMode = seedMode;
      if (seedMode === 'sequential' && startSeed) {
        config.startSeed = parseInt(startSeed, 10);
      }
    } else {
      config.prompts = promptsText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    }

    onSubmit(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Create Batch</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Type Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setBatchType('seed_variation')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              batchType === 'seed_variation'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Sparkles className="w-6 h-6 mx-auto mb-2" />
            <div className="font-medium">Seed Variations</div>
            <div className="text-xs text-[var(--text-secondary)]">
              Same prompt, different seeds
            </div>
          </button>

          <button
            onClick={() => setBatchType('prompt_list')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              batchType === 'prompt_list'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <List className="w-6 h-6 mx-auto mb-2" />
            <div className="font-medium">Prompt List</div>
            <div className="text-xs text-[var(--text-secondary)]">
              Multiple different prompts
            </div>
          </button>
        </div>

        {/* Batch Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Batch Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My batch..."
            className="input"
          />
        </div>

        {/* Seed Variation Options */}
        {batchType === 'seed_variation' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Number of Images
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                min={1}
                max={100}
                className="input"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Maximum 100 images per batch
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Seed Mode
              </label>
              <select
                value={seedMode}
                onChange={(e) => setSeedMode(e.target.value as 'random' | 'sequential')}
                className="input"
              >
                <option value="random">Random seeds</option>
                <option value="sequential">Sequential seeds</option>
              </select>
            </div>

            {seedMode === 'sequential' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Start Seed (optional)
                </label>
                <input
                  type="number"
                  value={startSeed}
                  onChange={(e) => setStartSeed(e.target.value)}
                  placeholder="Random if empty"
                  className="input"
                />
              </div>
            )}

            <div className="p-3 bg-white/5 rounded-lg mb-4">
              <div className="text-sm font-medium mb-1">Base Prompt:</div>
              <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                {currentPrompt || '(empty)'}
              </div>
            </div>
          </>
        )}

        {/* Prompt List Options */}
        {batchType === 'prompt_list' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Prompts (one per line)
            </label>
            <textarea
              value={promptsText}
              onChange={(e) => setPromptsText(e.target.value)}
              placeholder="a cat sitting on a windowsill&#10;a dog playing in the park&#10;a bird flying over mountains"
              rows={6}
              className="input font-mono text-sm"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {promptsText.split('\n').filter(p => p.trim()).length} prompts
            </p>
          </div>
        )}

        {/* Parameters Summary */}
        <div className="p-3 bg-white/5 rounded-lg mb-6">
          <div className="text-sm font-medium mb-2">Parameters:</div>
          <div className="grid grid-cols-3 gap-2 text-xs text-[var(--text-secondary)]">
            <div>{currentParameters.width}×{currentParameters.height}</div>
            <div>{currentParameters.steps} steps</div>
            <div>CFG {currentParameters.cfg_scale}</div>
            <div>{currentParameters.sampler_name}</div>
            <div>{currentParameters.scheduler}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1"
            disabled={
              (batchType === 'seed_variation' && !currentPrompt) ||
              (batchType === 'prompt_list' && !promptsText.trim())
            }
          >
            Start Batch
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 2.7 Batch Progress Component

**File**: `frontend/src/components/comfyui/BatchProgress.tsx`

```typescript
import { Pause, Play, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ComfyUIBatch } from '../../types/comfyui';

interface BatchProgressProps {
  batch: ComfyUIBatch;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export default function BatchProgress({ batch, onPause, onResume, onCancel }: BatchProgressProps) {
  const progress = Math.round((batch.completed_count / batch.total_count) * 100);
  const isActive = batch.status === 'running' || batch.status === 'paused';

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {batch.status === 'running' && (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          )}
          {batch.status === 'paused' && (
            <Pause className="w-4 h-4 text-yellow-400" />
          )}
          {batch.status === 'completed' && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
          {batch.status === 'failed' && (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          
          <span className="font-medium">
            {batch.name || `Batch ${batch.batch_type}`}
          </span>
        </div>

        {isActive && (
          <div className="flex items-center gap-1">
            {batch.status === 'running' ? (
              <button
                onClick={onPause}
                className="p-1.5 hover:bg-white/10 rounded"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onResume}
                className="p-1.5 hover:bg-white/10 rounded"
                title="Resume"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[var(--bg-darker)] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${
            batch.status === 'failed' ? 'bg-red-500' :
            batch.status === 'completed' ? 'bg-green-500' :
            'bg-indigo-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm text-[var(--text-secondary)]">
        <span>
          {batch.completed_count} / {batch.total_count} completed
          {batch.failed_count > 0 && (
            <span className="text-red-400 ml-2">
              ({batch.failed_count} failed)
            </span>
          )}
        </span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}
```

---

### Phase 2 Acceptance Criteria

- [ ] Can create seed variation batch (1-100 images)
- [ ] Can create prompt list batch
- [ ] Batch shows real-time progress
- [ ] Can pause/resume/cancel active batch
- [ ] Batch generations appear in history
- [ ] Batch record shows completion stats
- [ ] Failed items don't stop entire batch
- [ ] WebSocket events for batch progress

### Phase 2 Deliverables

| Deliverable | Type | Location |
|-------------|------|----------|
| Batches migration | New file | `backend/src/db/migrations/XXX_create_comfyui_batches.ts` |
| Batch controller | New file | `backend/src/controllers/comfyui-batch.controller.ts` |
| Batch service | New file | `backend/src/services/comfyui-batch.service.ts` |
| Batch types | Updates | `backend/src/types/comfyui.ts`, `frontend/src/types/comfyui.ts` |
| Batch routes | Updates | `backend/src/routes/comfyui.routes.ts` |
| BatchModal | New component | `frontend/src/components/comfyui/BatchModal.tsx` |
| BatchProgress | New component | `frontend/src/components/comfyui/BatchProgress.tsx` |
| ComfyUI page updates | Updates | `frontend/src/pages/ComfyUI.tsx` |
| API client updates | Updates | `frontend/src/api/comfyui.ts` |

---

## Phase 3: Task Queue & Scheduling

> **Duration**: 1-2 weeks  
> **Goal**: Background processing with scheduled task support

### Overview

Activate the existing Bull queue infrastructure for true async processing. Add scheduling support for nightly batch generations and regular model health checks.

### 3.1 Task Worker Implementation

**File**: `backend/src/services/task-worker.service.ts`

```typescript
import Bull from 'bull';
import { db } from '../db/knex';
import { getWebSocketService } from './websocket.service';
import { ollamaService } from './ollama.service';
import { openaiService } from './openai.service';
import { geminiService } from './gemini.service';
import { claudeService } from './claude.service';
import { comfyuiService } from './comfyui.service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queue
export const taskQueue = new Bull('tasks', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Process jobs
taskQueue.process(async (job) => {
  const { taskId } = job.data;
  
  try {
    // Update task status
    await db('tasks').where('id', taskId).update({ 
      status: 'running',
      updated_at: new Date(),
    });
    
    // Emit status
    getWebSocketService()?.emit('task:started', { taskId });

    // Get task details
    const task = await db('tasks').where('id', taskId).first();
    
    // Route to appropriate service
    const result = await routeTask(task);
    
    // Store result
    await db('results').insert({
      task_id: taskId,
      type: task.type,
      content: result.content,
      metadata: JSON.stringify(result.metadata || {}),
    });
    
    // Update task
    await db('tasks').where('id', taskId).update({
      status: 'complete',
      completed_at: new Date(),
      updated_at: new Date(),
    });
    
    // Emit completion
    getWebSocketService()?.emit('task:completed', { taskId, result });
    
    return result;
    
  } catch (error: any) {
    // Update task with error
    await db('tasks').where('id', taskId).update({
      status: 'failed',
      error: error.message,
      updated_at: new Date(),
    });
    
    // Emit failure
    getWebSocketService()?.emit('task:failed', { taskId, error: error.message });
    
    throw error;
  }
});

// Progress reporting
taskQueue.on('progress', (job, progress) => {
  getWebSocketService()?.emit('task:progress', {
    taskId: job.data.taskId,
    progress,
  });
});

async function routeTask(task: any): Promise<{ content: string; metadata?: any }> {
  switch (task.provider) {
    case 'ollama':
      return ollamaService.generate(task.prompt, task.options);
    case 'openai':
      return openaiService.generate(task.prompt, task.options);
    case 'gemini':
      return geminiService.generate(task.prompt, task.options);
    case 'claude':
      return claudeService.generate(task.prompt, task.options);
    case 'comfyui':
      return comfyuiService.generate(task.prompt, task.options);
    default:
      throw new Error(`Unknown provider: ${task.provider}`);
  }
}

// Queue management functions
export async function addTask(taskId: string, options?: Bull.JobOptions): Promise<Bull.Job> {
  return taskQueue.add({ taskId }, options);
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    taskQueue.getWaitingCount(),
    taskQueue.getActiveCount(),
    taskQueue.getCompletedCount(),
    taskQueue.getFailedCount(),
    taskQueue.getDelayedCount(),
  ]);
  
  return { waiting, active, completed, failed, delayed };
}
```

---

### 3.2 Scheduled Tasks

**Migration**: `XXX_create_scheduled_tasks.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('scheduled_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('task_type', 50).notNullable(); // 'batch_generation', 'model_health_check', 'custom'
    table.jsonb('task_config').notNullable();
    table.string('cron_expression', 100).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_run_at');
    table.timestamp('next_run_at');
    table.string('last_run_status', 20); // 'success', 'failed'
    table.text('last_run_error');
    table.integer('run_count').defaultTo(0);
    table.integer('success_count').defaultTo(0);
    table.integer('failure_count').defaultTo(0);
    table.timestamps(true, true);
    
    table.index('is_active');
    table.index('next_run_at');
  });
  
  await knex.schema.createTable('scheduled_task_runs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('scheduled_task_id').notNullable()
      .references('id').inTable('scheduled_tasks')
      .onDelete('CASCADE');
    table.string('status', 20).notNullable(); // 'running', 'success', 'failed'
    table.jsonb('result');
    table.text('error');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    
    table.index('scheduled_task_id');
    table.index('started_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scheduled_task_runs');
  await knex.schema.dropTableIfExists('scheduled_tasks');
}
```

---

### 3.3 Scheduler Service

**File**: `backend/src/services/scheduler.service.ts`

```typescript
import Bull from 'bull';
import { db } from '../db/knex';
import { batchService } from './comfyui-batch.service';
import { ollamaService } from './ollama.service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const schedulerQueue = new Bull('scheduler', REDIS_URL);

interface ScheduledTaskConfig {
  type: 'batch_generation' | 'model_health_check' | 'custom';
  // For batch_generation
  sessionId?: string;
  batchConfig?: any;
  // For model_health_check
  profileIds?: string[];
  // For custom
  endpoint?: string;
  method?: string;
  body?: any;
}

class SchedulerService {
  async initialize(): Promise<void> {
    // Load active scheduled tasks and register them
    const tasks = await db('scheduled_tasks').where('is_active', true);
    
    for (const task of tasks) {
      await this.registerTask(task);
    }
    
    console.log(`Scheduler initialized with ${tasks.length} active tasks`);
  }

  async createScheduledTask(data: {
    name: string;
    taskType: string;
    taskConfig: ScheduledTaskConfig;
    cronExpression: string;
  }): Promise<any> {
    const [task] = await db('scheduled_tasks').insert({
      name: data.name,
      task_type: data.taskType,
      task_config: JSON.stringify(data.taskConfig),
      cron_expression: data.cronExpression,
      is_active: true,
    }).returning('*');

    await this.registerTask(task);
    
    return task;
  }

  async registerTask(task: any): Promise<void> {
    const jobId = `scheduled-${task.id}`;
    
    // Remove existing job if any
    const existingJob = await schedulerQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
    }

    // Add repeatable job
    await schedulerQueue.add(
      { scheduledTaskId: task.id },
      {
        jobId,
        repeat: { cron: task.cron_expression },
      }
    );

    // Calculate next run
    const nextRun = this.getNextCronRun(task.cron_expression);
    await db('scheduled_tasks')
      .where('id', task.id)
      .update({ next_run_at: nextRun });
  }

  async unregisterTask(taskId: string): Promise<void> {
    const jobId = `scheduled-${taskId}`;
    await schedulerQueue.removeRepeatable({ jobId });
  }

  async toggleTask(taskId: string, isActive: boolean): Promise<void> {
    await db('scheduled_tasks').where('id', taskId).update({ is_active: isActive });
    
    if (isActive) {
      const task = await db('scheduled_tasks').where('id', taskId).first();
      await this.registerTask(task);
    } else {
      await this.unregisterTask(taskId);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.unregisterTask(taskId);
    await db('scheduled_task_runs').where('scheduled_task_id', taskId).delete();
    await db('scheduled_tasks').where('id', taskId).delete();
  }

  private getNextCronRun(cronExpression: string): Date {
    // Use cron-parser to calculate next run
    const parser = require('cron-parser');
    const interval = parser.parseExpression(cronExpression);
    return interval.next().toDate();
  }
}

// Process scheduled tasks
schedulerQueue.process(async (job) => {
  const { scheduledTaskId } = job.data;
  
  // Create run record
  const [run] = await db('scheduled_task_runs').insert({
    scheduled_task_id: scheduledTaskId,
    status: 'running',
  }).returning('*');

  try {
    const task = await db('scheduled_tasks').where('id', scheduledTaskId).first();
    const config = typeof task.task_config === 'string' 
      ? JSON.parse(task.task_config) 
      : task.task_config;

    let result: any;

    switch (task.task_type) {
      case 'batch_generation':
        result = await batchService.createBatch(config.sessionId, config.batchConfig);
        break;
        
      case 'model_health_check':
        result = await performHealthChecks(config.profileIds);
        break;
        
      case 'custom':
        result = await performCustomTask(config);
        break;
    }

    // Update run record
    await db('scheduled_task_runs').where('id', run.id).update({
      status: 'success',
      result: JSON.stringify(result),
      completed_at: new Date(),
    });

    // Update task stats
    await db('scheduled_tasks').where('id', scheduledTaskId).update({
      last_run_at: new Date(),
      last_run_status: 'success',
      last_run_error: null,
      run_count: db.raw('run_count + 1'),
      success_count: db.raw('success_count + 1'),
      next_run_at: schedulerService.getNextCronRun(task.cron_expression),
    });

  } catch (error: any) {
    // Update run record
    await db('scheduled_task_runs').where('id', run.id).update({
      status: 'failed',
      error: error.message,
      completed_at: new Date(),
    });

    // Update task stats
    const task = await db('scheduled_tasks').where('id', scheduledTaskId).first();
    await db('scheduled_tasks').where('id', scheduledTaskId).update({
      last_run_at: new Date(),
      last_run_status: 'failed',
      last_run_error: error.message,
      run_count: db.raw('run_count + 1'),
      failure_count: db.raw('failure_count + 1'),
      next_run_at: schedulerService.getNextCronRun(task.cron_expression),
    });

    throw error;
  }
});

async function performHealthChecks(profileIds?: string[]): Promise<any> {
  const profiles = profileIds 
    ? await db('profiles').whereIn('id', profileIds)
    : await db('profiles');

  const results = [];
  
  for (const profile of profiles) {
    try {
      let healthy = false;
      
      switch (profile.provider) {
        case 'ollama':
          healthy = await ollamaService.healthCheck(profile.url);
          break;
        // Add other providers...
      }
      
      results.push({ profileId: profile.id, name: profile.name, healthy });
    } catch (error: any) {
      results.push({ profileId: profile.id, name: profile.name, healthy: false, error: error.message });
    }
  }
  
  return results;
}

async function performCustomTask(config: any): Promise<any> {
  const response = await fetch(config.endpoint, {
    method: config.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: config.body ? JSON.stringify(config.body) : undefined,
  });
  
  return response.json();
}

export const schedulerService = new SchedulerService();
```

---

### 3.4 Scheduler UI

**File**: `frontend/src/pages/Scheduler.tsx`

A new page for managing scheduled tasks with:
- List of scheduled tasks
- Create new scheduled task form
- Enable/disable toggle
- View run history
- Cron expression builder/helper

---

### Phase 3 Acceptance Criteria

- [ ] Tasks process through Bull queue
- [ ] Task status updates via WebSocket
- [ ] Retry on failure with backoff
- [ ] Can create scheduled tasks
- [ ] Cron expressions work correctly
- [ ] Scheduled batch generations run
- [ ] Model health checks run on schedule
- [ ] View scheduled task history
- [ ] Enable/disable scheduled tasks

### Phase 3 Deliverables

| Deliverable | Type | Location |
|-------------|------|----------|
| Task worker | New file | `backend/src/services/task-worker.service.ts` |
| Scheduler service | New file | `backend/src/services/scheduler.service.ts` |
| Scheduled tasks migration | New file | `backend/src/db/migrations/XXX_create_scheduled_tasks.ts` |
| Scheduler routes | New file | `backend/src/routes/scheduler.routes.ts` |
| Scheduler controller | New file | `backend/src/controllers/scheduler.controller.ts` |
| Scheduler page | New file | `frontend/src/pages/Scheduler.tsx` |
| Sidebar update | Update | Add Scheduler nav item |

---

## Phase 4: Future Enhancements

> **Duration**: Ongoing  
> **Priority**: P2-P3

### 4.1 LoRA Support (P2)

- Browse available LoRAs from ComfyUI
- Select multiple LoRAs with strength sliders
- Auto-inject LoraLoader nodes into workflow
- Save LoRA presets

### 4.2 Upscaling (P3)

- One-click upscale from generation history
- Upscale model selection (ESRGAN, etc.)
- 2x/4x scale options
- Pre-built upscale workflow

### 4.3 Image-to-Image (P3)

- Upload reference image
- Denoise strength control
- Automatic workflow switching
- Drag-and-drop support

### 4.4 ControlNet (P3)

- Preprocessor selection
- Control image upload
- Multi-ControlNet support
- Strength controls

### 4.5 Chat Streaming (P2)

- Server-Sent Events for streaming
- Token-by-token display
- Stream cancellation

---

## Technical Debt & Maintenance

### Known Issues to Address

| Issue | Priority | Phase |
|-------|----------|-------|
| Hardcoded API URLs in frontend | P2 | Any |
| Missing input validation | P2 | Any |
| No request rate limiting | P3 | Phase 3+ |
| Missing error boundaries | P3 | Any |
| Console.log cleanup | P3 | Any |

### Code Quality Improvements

- Add ESLint strict rules
- Add Prettier formatting
- Create shared utility functions
- Improve TypeScript strictness
- Add JSDoc comments to services

---

## Timeline Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TIMELINE OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1         Week 2         Week 3         Week 4         Week 5+        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────┐   ┌─────────────────────────────┐                              │
│  │ Phase 1 │   │         Phase 2             │                              │
│  │ WebSocket│   │    Batch Generation         │                              │
│  │ 1 week  │   │       2-3 weeks             │                              │
│  └─────────┘   └─────────────────────────────┘                              │
│                                                                              │
│                              ┌───────────────────────┐                      │
│                              │      Phase 3          │                      │
│                              │  Task Queue/Scheduler │                      │
│                              │      1-2 weeks        │                      │
│                              └───────────────────────┘                      │
│                                                                              │
│                                                    ┌──────────────────────┐ │
│                                                    │      Phase 4         │ │
│                                                    │  LoRA, Upscale, etc. │ │
│                                                    │      Ongoing         │ │
│                                                    └──────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Total Estimated Time: 5-7 weeks for Phases 1-3
```

---

## Appendix: Cron Expression Reference

For scheduled tasks:

| Expression | Meaning |
|------------|---------|
| `0 0 * * *` | Daily at midnight |
| `0 2 * * *` | Daily at 2 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly on Sunday |
| `0 0 1 * *` | Monthly on 1st |
| `*/30 * * * *` | Every 30 minutes |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial roadmap |
