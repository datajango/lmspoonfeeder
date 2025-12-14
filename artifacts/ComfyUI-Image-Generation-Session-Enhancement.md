# ComfyUI Image Generation Session Enhancement
## Technical Design Document

**Version:** 1.0  
**Date:** December 12, 2025  
**Status:** Draft  
**Author:** Spoon Feeder Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Requirements](#3-requirements)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Frontend Design](#6-frontend-design)
7. [Workflow Parameter System](#7-workflow-parameter-system)
8. [Implementation Plan](#8-implementation-plan)
9. [Technical Considerations](#9-technical-considerations)

---

## 1. Executive Summary

### 1.1 Purpose

This document outlines the technical design for enhancing the ComfyUI Image Generation Session feature in the Spoon Feeder system. The enhancement transforms the current basic generation interface into a comprehensive, chat-style image generation system with full parameter control, workflow management, and complete generation history tracking.

### 1.2 Goals

| Goal | Description |
|------|-------------|
| **Full Reproducibility** | Every generation can be exactly reproduced using stored workflow and parameters |
| **Unique Parameters Per Generation** | Each generation within a session can have completely different settings |
| **Chat-Style Interface** | Scrolling history of generations with inline results and metadata |
| **Workflow Management** | Select, import, and manage ComfyUI workflows from the interface |
| **Complete Audit Trail** | All prompts, parameters, and outputs stored in database |

### 1.3 Key Features

- Workflow selector with saved workflow library
- Dynamic parameter controls (seed, steps, CFG, dimensions, sampler, etc.)
- Chat-style generation history with scrolling timeline
- Full workflow JSON snapshot per generation
- "Reuse Settings" functionality to iterate on successful generations
- Batch generation support
- Real-time progress via WebSocket

---

## 2. Current State Analysis

### 2.1 Existing Interface Screenshot Analysis

The current ComfyUI interface provides:

| Element | Current State | Limitation |
|---------|---------------|------------|
| Session sidebar | Basic list with dates | No session metadata or generation counts |
| Prompt input | Text area | Works correctly |
| Negative prompt | Optional field | Works correctly |
| Generate button | Functional | No loading state or progress |
| Results gallery | Grid of images | Static, not chat-style, limited metadata |
| Workflow selection | **Missing** | Cannot select different workflows |
| Parameter controls | **Missing** | Cannot adjust width, height, steps, seed, etc. |
| Generation history | **Missing** | No scrolling timeline of generations |

### 2.2 Current Database Schema

```sql
-- comfyui_workflows (existing)
id UUID PRIMARY KEY
profile_id UUID FK
name VARCHAR
description TEXT
workflow_json TEXT
created_at TIMESTAMP
updated_at TIMESTAMP

-- comfyui_generations (existing)
id UUID PRIMARY KEY
workflow_id UUID FK (nullable)
session_id UUID FK
prompt_id VARCHAR
prompt_text TEXT
status VARCHAR
outputs TEXT (JSON array)
error TEXT
created_at TIMESTAMP
completed_at TIMESTAMP
```

### 2.3 Identified Gaps

1. **No workflow snapshot** — Cannot reproduce exact generation if workflow is modified
2. **No parameter storage** — Individual generation settings not recorded
3. **No negative prompt storage** — Lost after generation
4. **No timing metrics** — Cannot track generation performance
5. **No batch tracking** — Cannot identify images within a batch
6. **Limited workflow management** — No UI for selecting/importing workflows

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Workflow Management
- FR-1.1: List all saved workflows from `comfyui_workflows` table
- FR-1.2: Select a workflow for the current session
- FR-1.3: Import new workflows (paste JSON or upload file)
- FR-1.4: Set default parameters per workflow
- FR-1.5: View/edit workflow JSON

#### FR-2: Parameter Control
- FR-2.1: Expose standard parameters (seed, steps, CFG, dimensions, sampler, scheduler)
- FR-2.2: Auto-extract editable parameters from workflow JSON
- FR-2.3: Support workflow-specific custom parameters
- FR-2.4: Randomize seed with single click
- FR-2.5: Persist last-used parameters per session

#### FR-3: Generation History
- FR-3.1: Display generations in chronological chat-style timeline
- FR-3.2: Show full parameter details for each generation
- FR-3.3: Display generation status (pending, running, completed, failed)
- FR-3.4: Show generation time and timestamps
- FR-3.5: Support image preview with zoom/download

#### FR-4: Reproducibility
- FR-4.1: Store complete workflow JSON snapshot per generation
- FR-4.2: Store all parameters used (denormalized for querying)
- FR-4.3: Enable "Reuse Settings" to copy parameters from previous generation
- FR-4.4: Enable "View Workflow JSON" to export exact workflow used

#### FR-5: Session Management
- FR-5.1: Create new sessions with optional title
- FR-5.2: Rename existing sessions
- FR-5.3: Delete sessions (cascade to generations)
- FR-5.4: Show generation count per session in sidebar

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Generation history loads within 500ms | Performance |
| NFR-2 | WebSocket updates within 100ms of ComfyUI events | Real-time |
| NFR-3 | Support 1000+ generations per session | Scalability |
| NFR-4 | Mobile-responsive interface | Accessibility |
| NFR-5 | Keyboard navigation for all controls | Accessibility |

---

## 4. Database Design

### 4.1 Migration: Enhanced Generation Tracking

**File:** `backend/src/db/migrations/014_comfyui_generation_details.ts`

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ============================================
    // ENHANCE comfyui_generations TABLE
    // ============================================
    await knex.schema.alterTable('comfyui_generations', (table) => {
        // Complete workflow snapshot for reproducibility
        table.text('workflow_json_snapshot');
        
        // All parameters as structured JSON
        table.jsonb('parameters').defaultTo('{}');
        
        // Prompt details
        table.text('negative_prompt');
        
        // Denormalized generation settings (for easy querying)
        table.integer('width');
        table.integer('height');
        table.integer('steps');
        table.float('cfg_scale');
        table.bigInteger('seed');
        table.string('sampler_name', 50);
        table.string('scheduler', 50);
        table.integer('batch_size').defaultTo(1);
        
        // Model information
        table.string('checkpoint_name', 255);
        table.jsonb('loras_used').defaultTo('[]');
        
        // Performance metrics
        table.float('generation_time_seconds');
        
        // Batch tracking
        table.integer('batch_index').defaultTo(0);
        
        // Indexes for common queries
        table.index('seed');
        table.index('checkpoint_name');
        table.index(['session_id', 'created_at']);
    });

    // ============================================
    // ENHANCE comfyui_workflows TABLE
    // ============================================
    await knex.schema.alterTable('comfyui_workflows', (table) => {
        // Default parameters for this workflow
        table.jsonb('default_parameters').defaultTo('{}');
        
        // Cached extracted parameter definitions
        table.jsonb('extracted_parameters').defaultTo('[]');
        
        // Workflow metadata
        table.string('thumbnail_url', 500);
        table.boolean('is_default').defaultTo(false);
        table.integer('generation_count').defaultTo(0);
    });

    // ============================================
    // ENHANCE comfyui_sessions TABLE
    // ============================================
    await knex.schema.alterTable('comfyui_sessions', (table) => {
        // Currently selected workflow for this session
        table.uuid('current_workflow_id')
            .references('id')
            .inTable('comfyui_workflows')
            .onDelete('SET NULL');
        
        // Last used parameters (for session continuity)
        table.jsonb('last_parameters').defaultTo('{}');
        
        // Session statistics
        table.integer('generation_count').defaultTo(0);
        table.integer('completed_count').defaultTo(0);
        table.integer('failed_count').defaultTo(0);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('comfyui_generations', (table) => {
        table.dropIndex('seed');
        table.dropIndex('checkpoint_name');
        table.dropIndex(['session_id', 'created_at']);
        table.dropColumns([
            'workflow_json_snapshot',
            'parameters',
            'negative_prompt',
            'width',
            'height',
            'steps',
            'cfg_scale',
            'seed',
            'sampler_name',
            'scheduler',
            'batch_size',
            'checkpoint_name',
            'loras_used',
            'generation_time_seconds',
            'batch_index'
        ]);
    });

    await knex.schema.alterTable('comfyui_workflows', (table) => {
        table.dropColumns([
            'default_parameters',
            'extracted_parameters',
            'thumbnail_url',
            'is_default',
            'generation_count'
        ]);
    });

    await knex.schema.alterTable('comfyui_sessions', (table) => {
        table.dropColumns([
            'current_workflow_id',
            'last_parameters',
            'generation_count',
            'completed_count',
            'failed_count'
        ]);
    });
}
```

### 4.2 Complete Schema Reference

#### comfyui_generations (enhanced)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `session_id` | UUID | YES | FK to comfyui_sessions |
| `workflow_id` | UUID | YES | FK to comfyui_workflows (original) |
| `workflow_json_snapshot` | TEXT | YES | **Complete workflow JSON at generation time** |
| `prompt_id` | VARCHAR | YES | ComfyUI's internal prompt ID |
| `prompt_text` | TEXT | YES | Positive prompt |
| `negative_prompt` | TEXT | YES | Negative prompt |
| `parameters` | JSONB | NO | All parameters as key-value pairs |
| `width` | INT | YES | Image width |
| `height` | INT | YES | Image height |
| `steps` | INT | YES | Sampling steps |
| `cfg_scale` | FLOAT | YES | CFG guidance scale |
| `seed` | BIGINT | YES | Random seed used |
| `sampler_name` | VARCHAR(50) | YES | Sampler algorithm |
| `scheduler` | VARCHAR(50) | YES | Scheduler type |
| `batch_size` | INT | NO | Number of images (default: 1) |
| `checkpoint_name` | VARCHAR(255) | YES | Model checkpoint used |
| `loras_used` | JSONB | NO | Array of LoRA configs |
| `status` | VARCHAR | NO | pending/running/completed/failed |
| `outputs` | TEXT | YES | JSON array of output file paths |
| `error` | TEXT | YES | Error message if failed |
| `generation_time_seconds` | FLOAT | YES | Execution duration |
| `batch_index` | INT | NO | Index within batch (default: 0) |
| `created_at` | TIMESTAMP | NO | Queue timestamp |
| `completed_at` | TIMESTAMP | YES | Completion timestamp |

#### comfyui_workflows (enhanced)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `profile_id` | UUID | YES | FK to profiles |
| `name` | VARCHAR | NO | Workflow display name |
| `description` | TEXT | YES | User description |
| `workflow_json` | TEXT | NO | ComfyUI workflow JSON |
| `default_parameters` | JSONB | NO | Default param values |
| `extracted_parameters` | JSONB | NO | Cached parameter definitions |
| `thumbnail_url` | VARCHAR(500) | YES | Preview image URL |
| `is_default` | BOOLEAN | NO | Default workflow flag |
| `generation_count` | INT | NO | Usage statistics |
| `created_at` | TIMESTAMP | NO | Creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last modified |

#### comfyui_sessions (enhanced)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `profile_id` | UUID | YES | FK to profiles |
| `current_workflow_id` | UUID | YES | FK to comfyui_workflows |
| `title` | VARCHAR | NO | Session display name |
| `last_parameters` | JSONB | NO | Last used parameters |
| `generation_count` | INT | NO | Total generations |
| `completed_count` | INT | NO | Successful generations |
| `failed_count` | INT | NO | Failed generations |
| `created_at` | TIMESTAMP | NO | Creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last activity |

---

## 5. API Design

### 5.1 Workflow Endpoints

#### List Workflows
```
GET /api/comfyui/workflows
Query: ?profile_id=<uuid>

Response: {
    success: true,
    data: [{
        id: "uuid",
        name: "SDXL Standard",
        description: "Basic SDXL workflow",
        thumbnail_url: "/api/comfyui/workflows/uuid/thumbnail",
        is_default: true,
        generation_count: 42,
        default_parameters: { width: 1024, height: 1024, steps: 25 },
        created_at: "2025-12-10T10:00:00Z"
    }]
}
```

#### Get Workflow with Parameters
```
GET /api/comfyui/workflows/:id

Response: {
    success: true,
    data: {
        id: "uuid",
        name: "SDXL Standard",
        workflow_json: "{ ... }",
        default_parameters: { ... },
        extracted_parameters: [
            {
                nodeId: "3",
                field: "seed",
                label: "Seed",
                type: "seed",
                value: 0,
                min: 0,
                max: 2147483647
            },
            {
                nodeId: "3",
                field: "steps",
                label: "Steps",
                type: "number",
                value: 25,
                min: 1,
                max: 150
            },
            {
                nodeId: "5",
                field: "width",
                label: "Width",
                type: "select",
                value: 1024,
                options: [512, 768, 1024, 1280, 1536]
            }
        ]
    }
}
```

#### Import Workflow
```
POST /api/comfyui/workflows
Body: {
    profile_id: "uuid",
    name: "My Custom Workflow",
    description: "Optional description",
    workflow_json: { ... },
    default_parameters: { width: 1024, height: 1024 }
}

Response: {
    success: true,
    data: { id: "new-uuid", ... }
}
```

#### Update Workflow Defaults
```
PATCH /api/comfyui/workflows/:id
Body: {
    name: "Updated Name",
    default_parameters: { steps: 30 },
    is_default: true
}
```

#### Delete Workflow
```
DELETE /api/comfyui/workflows/:id
```

### 5.2 Session Endpoints

#### List Sessions
```
GET /api/comfyui/sessions
Query: ?profile_id=<uuid>

Response: {
    success: true,
    data: [{
        id: "uuid",
        title: "Session 12/12/2025",
        current_workflow_id: "workflow-uuid",
        workflow_name: "SDXL Standard",
        generation_count: 15,
        completed_count: 14,
        failed_count: 1,
        updated_at: "2025-12-12T15:30:00Z"
    }]
}
```

#### Get Session with Generations
```
GET /api/comfyui/sessions/:id
Query: ?limit=50&offset=0

Response: {
    success: true,
    data: {
        id: "uuid",
        title: "Session 12/12/2025",
        current_workflow_id: "workflow-uuid",
        last_parameters: { seed: 12345, steps: 25 },
        generations: [{
            id: "gen-uuid",
            prompt_text: "a beautiful landscape",
            negative_prompt: "blurry, low quality",
            parameters: { seed: 12345, steps: 25, width: 1024, ... },
            width: 1024,
            height: 1024,
            seed: 12345,
            steps: 25,
            cfg_scale: 7.0,
            sampler_name: "euler_ancestral",
            checkpoint_name: "sd_xl_base_1.0.safetensors",
            status: "completed",
            outputs: ["ComfyUI_00001_.png"],
            generation_time_seconds: 12.5,
            created_at: "2025-12-12T15:25:00Z"
        }],
        total_generations: 150
    }
}
```

#### Create Session
```
POST /api/comfyui/sessions
Body: {
    profile_id: "uuid",
    title: "My Generation Session",
    workflow_id: "workflow-uuid"  // optional
}
```

#### Update Session
```
PATCH /api/comfyui/sessions/:id
Body: {
    title: "Renamed Session",
    current_workflow_id: "new-workflow-uuid"
}
```

### 5.3 Generation Endpoints

#### Create Generation
```
POST /api/comfyui/sessions/:sessionId/generate
Body: {
    workflow_id: "uuid",              // Optional: use saved workflow
    workflow_json: { ... },           // Optional: custom workflow
    prompt_text: "a beautiful sunset over mountains",
    negative_prompt: "blurry, artifacts",
    parameters: {
        width: 1024,
        height: 1024,
        steps: 30,
        cfg_scale: 7.5,
        seed: -1,                     // -1 = random
        sampler_name: "euler_ancestral",
        scheduler: "normal",
        batch_size: 1,
        checkpoint_name: "sd_xl_base_1.0.safetensors",
        loras: [
            { name: "detail_tweaker", strength_model: 0.5, strength_clip: 0.5 }
        ]
    }
}

Response: {
    success: true,
    data: {
        id: "generation-uuid",
        prompt_id: "comfyui-prompt-id",
        status: "pending",
        seed: 847293847,              // Resolved seed if -1 was passed
        ...
    }
}
```

#### Get Generation Details
```
GET /api/comfyui/generations/:id

Response: {
    success: true,
    data: {
        id: "uuid",
        session_id: "session-uuid",
        workflow_id: "workflow-uuid",
        workflow_json_snapshot: "{ ... }",  // Complete reproducible workflow
        prompt_text: "...",
        negative_prompt: "...",
        parameters: { ... },
        width: 1024,
        height: 1024,
        steps: 30,
        cfg_scale: 7.5,
        seed: 847293847,
        sampler_name: "euler_ancestral",
        scheduler: "normal",
        batch_size: 1,
        checkpoint_name: "sd_xl_base_1.0.safetensors",
        loras_used: [...],
        status: "completed",
        outputs: ["ComfyUI_00008_.png"],
        generation_time_seconds: 14.2,
        created_at: "2025-12-12T15:30:00Z",
        completed_at: "2025-12-12T15:30:14Z"
    }
}
```

#### Get Generation Workflow (for reproduction)
```
GET /api/comfyui/generations/:id/workflow

Response: {
    success: true,
    data: {
        workflow_json: { ... },       // Exact workflow used
        parameters: { ... }           // Exact parameters used
    }
}
```

### 5.4 WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `generation:queued` | Server → Client | `{ id, session_id, status: "pending" }` |
| `generation:started` | Server → Client | `{ id, session_id, status: "running" }` |
| `generation:progress` | Server → Client | `{ id, progress: 45, current_node: "KSampler" }` |
| `generation:preview` | Server → Client | `{ id, preview_url: "..." }` |
| `generation:completed` | Server → Client | `{ id, status: "completed", outputs: [...], generation_time_seconds }` |
| `generation:failed` | Server → Client | `{ id, status: "failed", error: "..." }` |

---

## 6. Frontend Design

### 6.1 Component Architecture

```
src/
├── pages/
│   └── ComfyUIPage.tsx              # Main page container
├── components/
│   └── comfyui/
│       ├── SessionSidebar.tsx        # Session list with metadata
│       ├── WorkflowSelector.tsx      # Dropdown with workflow list
│       ├── ParameterPanel.tsx        # Collapsible settings panel
│       ├── GenerationChat.tsx        # Main chat-style history
│       ├── GenerationCard.tsx        # Individual generation display
│       ├── GenerationProgress.tsx    # In-progress indicator
│       ├── PromptInput.tsx           # Prompt/negative prompt inputs
│       ├── ImagePreview.tsx          # Lightbox for generated images
│       ├── WorkflowImportModal.tsx   # Import workflow dialog
│       └── WorkflowJSONViewer.tsx    # View/export workflow JSON
├── hooks/
│   ├── useComfyUISession.ts          # Session state management
│   ├── useComfyUIGenerate.ts         # Generation mutation
│   ├── useComfyUIWorkflows.ts        # Workflow list query
│   └── useComfyUIWebSocket.ts        # Real-time updates
└── types/
    └── comfyui.ts                    # TypeScript interfaces
```

### 6.2 Main Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Spoon Feeder  │  Dashboard  │  Models  │  Tasks  │  ComfyUI  │  Settings   │
├─────────────────┬───────────────────────────────────────────────────────────┤
│                 │                                                           │
│  Sessions       │  ComfyUI → http://localhost:8188 [● Connected]            │
│  ───────────    │                                                           │
│  [+ New]        │  ┌─ Workflow ─────────────────────────────────────────┐   │
│                 │  │ [SDXL Standard          ▼]  [Import] [Edit JSON]   │   │
│  ○ Session 1    │  └────────────────────────────────────────────────────┘   │
│    15 images    │                                                           │
│    2 hrs ago    │  ┌─ Generation Settings ──────────────────────────────┐   │
│                 │  │                                                    │   │
│  ● Session 2    │  │  Size: [1024 ▼] × [1024 ▼]    Batch: [1 ▼]         │   │
│    3 images     │  │  Steps: [━━━━━●━━━━] 25      CFG: [━━━●━━━━] 7.0   │   │
│    Active       │  │  Sampler: [euler_ancestral ▼]  Sched: [normal ▼]  │   │
│                 │  │  Seed: [____________] [🎲 Random]                  │   │
│  ○ Session 3    │  │  Checkpoint: [sd_xl_base_1.0 ▼]                    │   │
│    42 images    │  │                                            [▲ Hide] │   │
│    Yesterday    │  └────────────────────────────────────────────────────┘   │
│                 │                                                           │
│                 │  ════════════ Generation History ══════════════════════   │
│                 │                                                           │
│                 │  ┌────────────────────────────────────────────────────┐   │
│                 │  │ 📝 "a majestic mountain landscape at sunset"       │   │
│                 │  │    negative: "blurry, low quality"                 │   │
│                 │  │                                                    │   │
│                 │  │  ┌──────────┐                                      │   │
│                 │  │  │          │  seed: 847293  │  steps: 25          │   │
│                 │  │  │  image   │  cfg: 7.0  │  1024×1024              │   │
│                 │  │  │          │  euler_ancestral  │  12.3s           │   │
│                 │  │  └──────────┘                                      │   │
│                 │  │                                                    │   │
│                 │  │  [🔄 Reuse Settings] [📋 Copy Seed] [📄 View JSON] │   │
│                 │  └────────────────────────────────────────────────────┘   │
│                 │                                                           │
│                 │  ┌────────────────────────────────────────────────────┐   │
│                 │  │ 📝 "dark ambient waves, abstract art"              │   │
│                 │  │                                                    │   │
│                 │  │  ┌──────────┐                                      │   │
│                 │  │  │          │  seed: 192847  │  steps: 30          │   │
│                 │  │  │  image   │  cfg: 7.5  │  1024×1024              │   │
│                 │  │  │          │  euler_ancestral  │  14.1s           │   │
│                 │  │  └──────────┘                                      │   │
│                 │  │                                                    │   │
│                 │  │  [🔄 Reuse Settings] [📋 Copy Seed] [📄 View JSON] │   │
│                 │  └────────────────────────────────────────────────────┘   │
│                 │                                                           │
│                 │  [Currently generating... ████████░░░░░ 65%]              │
│                 │                                                           │
│                 ├───────────────────────────────────────────────────────────┤
│                 │  Prompt:                                                  │
│                 │  ┌────────────────────────────────────────────────────┐   │
│                 │  │ Describe the image you want to generate...         │   │
│                 │  └────────────────────────────────────────────────────┘   │
│                 │  Negative Prompt (optional):                              │
│                 │  ┌────────────────────────────────────────────────────┐   │
│                 │  │ Things to avoid...                                 │   │
│                 │  └────────────────────────────────────────────────────┘   │
│                 │                                        [⬆️ Generate]      │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

### 6.3 Key Components

#### SessionSidebar.tsx

```tsx
interface SessionSidebarProps {
    sessions: ComfyUISession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onCreateSession: () => void;
    onDeleteSession: (id: string) => void;
}

// Features:
// - Session list with title, generation count, last activity
// - Active session highlighted
// - "+ New Session" button
// - Right-click context menu (rename, delete)
// - Loading skeleton state
```

#### WorkflowSelector.tsx

```tsx
interface WorkflowSelectorProps {
    workflows: ComfyUIWorkflow[];
    selectedWorkflowId: string | null;
    onSelectWorkflow: (id: string) => void;
    onImportWorkflow: () => void;
    onEditWorkflow: (id: string) => void;
}

// Features:
// - Dropdown with workflow name, thumbnail, generation count
// - "Import Workflow" button opens modal
// - "Edit JSON" button for advanced users
// - Indicate default workflow with star icon
```

#### ParameterPanel.tsx

```tsx
interface ParameterPanelProps {
    parameters: GenerationParameters;
    extractedParameters: WorkflowParameter[];
    onChange: (params: GenerationParameters) => void;
    onRandomizeSeed: () => void;
}

// Features:
// - Collapsible panel (remember state in localStorage)
// - Standard params: width, height, steps, CFG, seed, sampler, scheduler, batch
// - Dynamic params from workflow extraction
// - Seed field with "🎲 Random" button
// - Sliders for numeric values with min/max
// - Dropdowns for sampler/scheduler selection
// - Checkpoint selector (populated from ComfyUI API)
```

#### GenerationCard.tsx

```tsx
interface GenerationCardProps {
    generation: ComfyUIGeneration;
    onReuseSettings: (params: GenerationParameters) => void;
    onCopySeed: (seed: number) => void;
    onViewWorkflow: (id: string) => void;
    onImageClick: (imageUrl: string) => void;
}

// Features:
// - Prompt text with negative prompt (if present)
// - Image grid (supports batch_size > 1)
// - Parameter summary line (seed, steps, cfg, dimensions, sampler, time)
// - Action buttons: Reuse Settings, Copy Seed, View JSON
// - Status indicator for pending/running/failed
// - Timestamp
```

#### GenerationProgress.tsx

```tsx
interface GenerationProgressProps {
    generationId: string;
    progress: number;
    currentNode: string;
    previewUrl?: string;
}

// Features:
// - Progress bar with percentage
// - Current node being processed
// - Optional live preview image
// - Cancel button
```

### 6.4 TypeScript Interfaces

```typescript
// types/comfyui.ts

export interface GenerationParameters {
    width: number;
    height: number;
    steps: number;
    cfg_scale: number;
    seed: number;                    // -1 for random
    sampler_name: string;
    scheduler: string;
    batch_size: number;
    checkpoint_name?: string;
    loras?: LoraConfig[];
    [key: string]: any;              // Workflow-specific params
}

export interface LoraConfig {
    name: string;
    strength_model: number;
    strength_clip: number;
}

export interface WorkflowParameter {
    nodeId: string;
    field: string;
    label: string;
    type: 'string' | 'number' | 'seed' | 'select';
    value: any;
    options?: (string | number)[];
    min?: number;
    max?: number;
}

export interface ComfyUIWorkflow {
    id: string;
    name: string;
    description?: string;
    workflow_json: string;
    default_parameters: GenerationParameters;
    extracted_parameters: WorkflowParameter[];
    thumbnail_url?: string;
    is_default: boolean;
    generation_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface ComfyUISession {
    id: string;
    profile_id: string;
    title: string;
    current_workflow_id?: string;
    workflow_name?: string;
    last_parameters: GenerationParameters;
    generation_count: number;
    completed_count: number;
    failed_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface ComfyUIGeneration {
    id: string;
    session_id: string;
    workflow_id?: string;
    workflow_json_snapshot?: string;
    prompt_id?: string;
    prompt_text: string;
    negative_prompt?: string;
    parameters: GenerationParameters;
    
    // Denormalized fields
    width: number;
    height: number;
    steps: number;
    cfg_scale: number;
    seed: number;
    sampler_name: string;
    scheduler: string;
    batch_size: number;
    checkpoint_name?: string;
    loras_used: LoraConfig[];
    
    status: 'pending' | 'running' | 'completed' | 'failed';
    outputs: string[];
    error?: string;
    generation_time_seconds?: number;
    batch_index: number;
    created_at: Date;
    completed_at?: Date;
}

export interface CreateGenerationRequest {
    workflow_id?: string;
    workflow_json?: object;
    prompt_text: string;
    negative_prompt?: string;
    parameters: Partial<GenerationParameters>;
}

export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed';
```

---

## 7. Workflow Parameter System

### 7.1 Parameter Extraction Rules

When a workflow is imported or selected, the system extracts editable parameters based on node class:

| Node Class | Extractable Fields | UI Control |
|------------|-------------------|------------|
| `CLIPTextEncode` | `text` | Hidden (use prompt input) |
| `KSampler` | `seed`, `steps`, `cfg`, `sampler_name`, `scheduler` | Various |
| `KSamplerAdvanced` | `seed`, `steps`, `cfg`, `sampler_name`, `scheduler`, `start_at_step`, `end_at_step` | Various |
| `EmptyLatentImage` | `width`, `height`, `batch_size` | Dropdowns, number |
| `CheckpointLoaderSimple` | `ckpt_name` | Dropdown |
| `LoraLoader` | `lora_name`, `strength_model`, `strength_clip` | Dropdown, sliders |
| `VAELoader` | `vae_name` | Dropdown |

### 7.2 Parameter Application Logic

```typescript
// services/comfyui.service.ts

function applyParametersToWorkflow(
    workflow: ComfyUIWorkflow,
    params: GenerationParameters,
    prompt: string,
    negativePrompt?: string
): object {
    const workflowJson = JSON.parse(workflow.workflow_json);
    
    // Find and update nodes by class_type
    for (const [nodeId, node] of Object.entries(workflowJson)) {
        const classType = (node as any).class_type;
        
        switch (classType) {
            case 'CLIPTextEncode':
                // Check if this is positive or negative prompt node
                // (determined by connection analysis or node title)
                if (isPositivePromptNode(workflowJson, nodeId)) {
                    (node as any).inputs.text = prompt;
                } else if (isNegativePromptNode(workflowJson, nodeId)) {
                    (node as any).inputs.text = negativePrompt || '';
                }
                break;
                
            case 'KSampler':
            case 'KSamplerAdvanced':
                if (params.seed !== undefined && params.seed !== -1) {
                    (node as any).inputs.seed = params.seed;
                } else {
                    (node as any).inputs.seed = Math.floor(Math.random() * 2147483647);
                }
                if (params.steps !== undefined) {
                    (node as any).inputs.steps = params.steps;
                }
                if (params.cfg_scale !== undefined) {
                    (node as any).inputs.cfg = params.cfg_scale;
                }
                if (params.sampler_name !== undefined) {
                    (node as any).inputs.sampler_name = params.sampler_name;
                }
                if (params.scheduler !== undefined) {
                    (node as any).inputs.scheduler = params.scheduler;
                }
                break;
                
            case 'EmptyLatentImage':
                if (params.width !== undefined) {
                    (node as any).inputs.width = params.width;
                }
                if (params.height !== undefined) {
                    (node as any).inputs.height = params.height;
                }
                if (params.batch_size !== undefined) {
                    (node as any).inputs.batch_size = params.batch_size;
                }
                break;
                
            case 'CheckpointLoaderSimple':
                if (params.checkpoint_name !== undefined) {
                    (node as any).inputs.ckpt_name = params.checkpoint_name;
                }
                break;
        }
    }
    
    return workflowJson;
}
```

### 7.3 Available Options Fetching

The frontend needs to know available options for dropdowns:

```typescript
// GET /api/comfyui/options

Response: {
    success: true,
    data: {
        samplers: [
            "euler", "euler_ancestral", "heun", "heunpp2",
            "dpm_2", "dpm_2_ancestral", "lms", "dpm_fast",
            "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde",
            "dpmpp_sde_gpu", "dpmpp_2m", "dpmpp_2m_sde",
            "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpmpp_3m_sde_gpu",
            "ddpm", "lcm", "ddim", "uni_pc", "uni_pc_bh2"
        ],
        schedulers: [
            "normal", "karras", "exponential", "sgm_uniform",
            "simple", "ddim_uniform", "beta"
        ],
        checkpoints: [
            "sd_xl_base_1.0.safetensors",
            "sd_xl_refiner_1.0.safetensors",
            "v1-5-pruned-emaonly.safetensors"
        ],
        loras: [
            "detail_tweaker_xl.safetensors",
            "add_brightness.safetensors"
        ],
        dimensions: {
            common: [512, 768, 1024, 1280, 1536, 2048],
            sdxl_optimal: [
                { width: 1024, height: 1024, label: "1:1 Square" },
                { width: 1152, height: 896, label: "9:7 Landscape" },
                { width: 896, height: 1152, label: "7:9 Portrait" },
                { width: 1216, height: 832, label: "3:2 Landscape" },
                { width: 832, height: 1216, label: "2:3 Portrait" }
            ]
        }
    }
}
```

---

## 8. Implementation Plan

### 8.1 Phase 1: Database Enhancement (Day 1)

| Task | Estimated Hours |
|------|-----------------|
| Create migration `014_comfyui_generation_details.ts` | 1 |
| Run migration and verify schema | 0.5 |
| Update TypeScript interfaces in `types/comfyui.ts` | 1 |
| Update Knex types | 0.5 |

**Deliverables:**
- [ ] Migration file created and tested
- [ ] TypeScript interfaces updated
- [ ] Existing data unaffected (all new columns nullable or have defaults)

### 8.2 Phase 2: Backend API Updates (Days 2-3)

| Task | Estimated Hours |
|------|-----------------|
| Update `comfyui.service.ts` with parameter application | 3 |
| Update `comfyui.controller.ts` generation endpoint | 2 |
| Add workflow parameter extraction logic | 2 |
| Add `/api/comfyui/options` endpoint | 1 |
| Update generation creation to store all fields | 2 |
| Add generation workflow export endpoint | 1 |
| Write integration tests | 2 |

**Deliverables:**
- [ ] POST `/api/comfyui/sessions/:id/generate` accepts full parameters
- [ ] Workflow JSON snapshot stored per generation
- [ ] All parameters stored in both JSONB and denormalized columns
- [ ] GET `/api/comfyui/options` returns available samplers, checkpoints, etc.
- [ ] GET `/api/comfyui/generations/:id/workflow` returns reproducible workflow

### 8.3 Phase 3: Frontend - Core Components (Days 4-5)

| Task | Estimated Hours |
|------|-----------------|
| Create `WorkflowSelector.tsx` | 2 |
| Create `ParameterPanel.tsx` | 4 |
| Update `SessionSidebar.tsx` with metadata | 1 |
| Create `GenerationCard.tsx` | 3 |
| Create `GenerationProgress.tsx` | 2 |
| Update hooks for new API shape | 2 |

**Deliverables:**
- [ ] Workflow selector dropdown functional
- [ ] Parameter panel with all controls
- [ ] Generation cards show full details
- [ ] Progress indicator with percentage

### 8.4 Phase 4: Frontend - Chat Interface (Day 6)

| Task | Estimated Hours |
|------|-----------------|
| Create `GenerationChat.tsx` main container | 3 |
| Implement scrolling history | 2 |
| Implement "Reuse Settings" functionality | 1 |
| Implement "Copy Seed" functionality | 0.5 |
| Implement "View Workflow JSON" modal | 1 |
| Connect WebSocket for real-time updates | 2 |

**Deliverables:**
- [ ] Chat-style scrolling history
- [ ] Reuse Settings loads parameters into form
- [ ] View Workflow JSON opens modal with formatted JSON
- [ ] Real-time progress updates via WebSocket

### 8.5 Phase 5: Workflow Management (Day 7)

| Task | Estimated Hours |
|------|-----------------|
| Create `WorkflowImportModal.tsx` | 2 |
| Create `WorkflowJSONViewer.tsx` | 1 |
| Implement workflow import (paste JSON) | 1 |
| Implement workflow import (file upload) | 1 |
| Implement set default workflow | 0.5 |
| Implement delete workflow | 0.5 |

**Deliverables:**
- [ ] Import workflow via paste JSON
- [ ] Import workflow via file upload
- [ ] Set default workflow per profile
- [ ] Delete workflow with confirmation

### 8.6 Phase 6: Polish & Testing (Day 8)

| Task | Estimated Hours |
|------|-----------------|
| Error handling for all edge cases | 2 |
| Loading states and skeletons | 1 |
| Mobile responsive adjustments | 2 |
| Keyboard navigation | 1 |
| End-to-end testing | 2 |
| Documentation updates | 1 |

**Deliverables:**
- [ ] All error states handled gracefully
- [ ] Loading skeletons for async operations
- [ ] Mobile-friendly layout
- [ ] Full keyboard navigation
- [ ] E2E tests passing

---

## 9. Technical Considerations

### 9.1 Performance

| Concern | Mitigation |
|---------|------------|
| Large workflow JSON snapshots | Compress with gzip before storing; lazy-load only when viewing |
| Many generations per session | Paginate with cursor-based pagination; virtual scrolling in UI |
| Image loading | Lazy load images; use thumbnails in list, full size in lightbox |
| WebSocket connections | Single connection per session; reconnect logic with exponential backoff |

### 9.2 Data Integrity

| Concern | Mitigation |
|---------|------------|
| Orphaned generations | Foreign key with CASCADE delete |
| Invalid seed values | Validate seed is within BigInt range |
| Corrupted workflow JSON | Validate JSON before storing; reject invalid workflows |
| Race conditions | Use database transactions for generation creation |

### 9.3 Security

| Concern | Mitigation |
|---------|------------|
| Workflow JSON injection | Sanitize and validate workflow structure |
| Path traversal in outputs | Validate output paths; use allowlist |
| XSS in prompt display | Escape HTML in prompt text display |

### 9.4 Backward Compatibility

- All new columns have defaults or are nullable
- Existing generations without new fields display gracefully
- API versioning not required (additive changes only)

### 9.5 Future Enhancements

| Enhancement | Notes |
|-------------|-------|
| Batch variations | Generate N variations with different seeds |
| Prompt templates | Save and reuse prompt templates |
| Generation comparison | Side-by-side comparison of outputs |
| Favorites | Mark and filter favorite generations |
| Export session | Export all generations as ZIP |
| Scheduled generations | Queue generations for later |

---

## Appendix A: Sample API Payloads

### A.1 Create Generation Request

```json
{
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "prompt_text": "a majestic snow-capped mountain at golden hour, dramatic clouds, photorealistic",
    "negative_prompt": "blurry, low quality, artifacts, oversaturated",
    "parameters": {
        "width": 1024,
        "height": 1024,
        "steps": 30,
        "cfg_scale": 7.5,
        "seed": -1,
        "sampler_name": "euler_ancestral",
        "scheduler": "karras",
        "batch_size": 1,
        "checkpoint_name": "sd_xl_base_1.0.safetensors",
        "loras": [
            {
                "name": "detail_tweaker_xl.safetensors",
                "strength_model": 0.5,
                "strength_clip": 0.5
            }
        ]
    }
}
```

### A.2 Generation Response (Completed)

```json
{
    "success": true,
    "data": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "session_id": "770e8400-e29b-41d4-a716-446655440002",
        "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
        "workflow_json_snapshot": "{\"3\":{\"class_type\":\"KSampler\",\"inputs\":{...}}}",
        "prompt_id": "abc123-comfyui-prompt-id",
        "prompt_text": "a majestic snow-capped mountain at golden hour, dramatic clouds, photorealistic",
        "negative_prompt": "blurry, low quality, artifacts, oversaturated",
        "parameters": {
            "width": 1024,
            "height": 1024,
            "steps": 30,
            "cfg_scale": 7.5,
            "seed": 847293847,
            "sampler_name": "euler_ancestral",
            "scheduler": "karras",
            "batch_size": 1,
            "checkpoint_name": "sd_xl_base_1.0.safetensors",
            "loras": [
                {
                    "name": "detail_tweaker_xl.safetensors",
                    "strength_model": 0.5,
                    "strength_clip": 0.5
                }
            ]
        },
        "width": 1024,
        "height": 1024,
        "steps": 30,
        "cfg_scale": 7.5,
        "seed": 847293847,
        "sampler_name": "euler_ancestral",
        "scheduler": "karras",
        "batch_size": 1,
        "checkpoint_name": "sd_xl_base_1.0.safetensors",
        "loras_used": [
            {
                "name": "detail_tweaker_xl.safetensors",
                "strength_model": 0.5,
                "strength_clip": 0.5
            }
        ],
        "status": "completed",
        "outputs": ["ComfyUI_00042_.png"],
        "error": null,
        "generation_time_seconds": 14.23,
        "batch_index": 0,
        "created_at": "2025-12-12T15:30:00.000Z",
        "completed_at": "2025-12-12T15:30:14.230Z"
    }
}
```

---

## Appendix B: Migration Rollback Procedure

If rollback is needed:

```bash
# Rollback migration
npx knex migrate:rollback --specific 014_comfyui_generation_details.ts

# Verify schema
psql -d spoonfeeder -c "\d comfyui_generations"
```

**Note:** Rollback will delete all data in the new columns. Export critical data before rollback if needed.

---

*End of Document*