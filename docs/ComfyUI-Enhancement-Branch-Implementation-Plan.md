# ComfyUI Enhancement Branch Implementation Plan

## Branch Details

| Item | Value |
|------|-------|
| **Branch Name** | `feature/comfyui-dynamic-workflows` |
| **Base Branch** | `main` |
| **Estimated Effort** | 3-5 days |

---

## Feature Overview

This branch implements three major enhancements to the ComfyUI integration:

1. **Dynamic Parameters** — Extract and expose editable parameters from workflows
2. **Real-time WebSocket Status** — Live progress updates during generation
3. **Batch Execution** — Queue multiple variations from a single workflow

---

## 1. Dynamic Parameters

### Goal
Allow users to modify key workflow inputs (prompt text, seed, steps, CFG scale, etc.) through the UI without editing raw JSON.

### Backend Changes

#### New Endpoint: Parse Workflow Parameters
```
GET /api/comfyui/workflows/:id/parameters
```
Returns extracted editable parameters from the workflow JSON.

#### New Endpoint: Execute with Parameters
```
POST /api/comfyui/workflows/:id/execute
Body: { parameters: { seed: 12345, prompt: "...", steps: 25 } }
```

#### New Service Method: `comfyui.service.ts`
```typescript
interface WorkflowParameter {
  nodeId: string;
  field: string;
  label: string;
  type: 'string' | 'number' | 'seed' | 'select';
  value: any;
  options?: string[];  // for select type
  min?: number;
  max?: number;
}

function extractParameters(workflowJson: object): WorkflowParameter[];
function applyParameters(workflowJson: object, params: Record<string, any>): object;
```

#### Parameter Detection Rules
| Node Class | Extractable Fields |
|------------|-------------------|
| `CLIPTextEncode` | `text` (prompt) |
| `KSampler` | `seed`, `steps`, `cfg`, `sampler_name`, `scheduler` |
| `KSamplerAdvanced` | `seed`, `steps`, `cfg`, `sampler_name`, `scheduler`, `start_at_step`, `end_at_step` |
| `EmptyLatentImage` | `width`, `height`, `batch_size` |
| `CheckpointLoaderSimple` | `ckpt_name` |
| `LoraLoader` | `lora_name`, `strength_model`, `strength_clip` |

### Frontend Changes

#### New Component: `ParameterEditor.tsx`
- Renders form inputs based on parameter types
- Text areas for prompts
- Number inputs with min/max for numeric values
- "Randomize" button for seed fields
- Dropdowns for sampler/scheduler selection

#### Update: `ComfyUI.tsx`
- Add "Configure & Run" button that opens parameter modal
- Show parameter editor before execution
- Save last-used parameters per workflow

### Database Changes

#### New Column: `comfyui_workflows`
```sql
ALTER TABLE comfyui_workflows 
ADD COLUMN default_parameters JSONB DEFAULT '{}';
```

#### New Column: `comfyui_generations`
```sql
ALTER TABLE comfyui_generations 
ADD COLUMN parameters_used JSONB DEFAULT '{}';
```

---

## 2. Real-time WebSocket Status

### Goal
Connect to ComfyUI's WebSocket API to receive live progress updates (current node, percentage, preview images).

### Backend Changes

#### New Service: `comfyui-websocket.service.ts`
```typescript
interface ComfyUIWebSocketService {
  connect(): Promise<void>;
  disconnect(): void;
  subscribeToPrompt(promptId: string, callback: ProgressCallback): void;
  unsubscribeFromPrompt(promptId: string): void;
}

interface ProgressUpdate {
  promptId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  currentNode?: string;
  progress?: number;        // 0-100
  previewImage?: string;    // base64
  queuePosition?: number;
}
```

#### WebSocket Message Types from ComfyUI
| Message Type | Data |
|--------------|------|
| `status` | Queue status, running prompt ID |
| `progress` | Node ID, current step, total steps |
| `executing` | Currently executing node ID |
| `executed` | Node outputs when complete |
| `execution_error` | Error details |

#### Integration with Socket.io
Forward ComfyUI progress to connected frontend clients:
```typescript
comfyUIWs.subscribeToPrompt(promptId, (update) => {
  socketService.emitToAll('comfyui:progress', update);
});
```

### Frontend Changes

#### New Hook: `useComfyUIProgress.ts`
```typescript
function useComfyUIProgress(generationId: string): {
  status: string;
  progress: number;
  currentNode: string;
  previewImage: string | null;
}
```

#### Update: Generation Status Display
- Progress bar with percentage
- Current node indicator
- Live preview image (if available)
- Queue position when waiting

#### New Component: `GenerationProgress.tsx`
- Animated progress indicator
- Node execution timeline
- Preview thumbnail that updates during sampling

---

## 3. Batch Execution

### Goal
Allow users to queue multiple generations with variations (different seeds, prompt variations, parameter sweeps).

### Backend Changes

#### New Endpoint: Batch Execute
```
POST /api/comfyui/workflows/:id/batch
Body: {
  count: 4,
  variations: {
    seed: 'random',           // 'random' | 'increment' | 'fixed'
    prompt: ['cat', 'dog'],   // array = cycle through
  }
}
```

#### New Table: `comfyui_batches`
```sql
CREATE TABLE comfyui_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES comfyui_workflows(id),
  total_count INTEGER NOT NULL,
  completed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Update: `comfyui_generations`
```sql
ALTER TABLE comfyui_generations 
ADD COLUMN batch_id UUID REFERENCES comfyui_batches(id),
ADD COLUMN batch_index INTEGER;
```

#### Batch Processing Logic
```typescript
async function executeBatch(workflowId: string, options: BatchOptions): Promise<Batch> {
  const batch = await createBatch(workflowId, options.count);
  
  for (let i = 0; i < options.count; i++) {
    const params = generateVariationParams(options.variations, i);
    await queueGeneration(workflowId, params, batch.id, i);
  }
  
  return batch;
}
```

### Frontend Changes

#### New Component: `BatchExecuteModal.tsx`
- Number of generations slider (1-20)
- Variation mode selectors per parameter
- Seed strategy: Random / Increment from base / Fixed
- Prompt variations: Single / List to cycle
- Parameter sweep: Range with step

#### New Component: `BatchProgress.tsx`
- Grid view of all generations in batch
- Individual progress indicators
- Completion summary
- "Stop remaining" button

#### Update: Results Gallery
- Filter by batch
- Batch comparison view (side-by-side)

---

## Implementation Phases

### Phase 1: Dynamic Parameters (Day 1-2)

**Tasks:**
- [ ] Create migration for new database columns
- [ ] Implement `extractParameters()` function with node detection
- [ ] Implement `applyParameters()` function
- [ ] Add `/workflows/:id/parameters` endpoint
- [ ] Update execute endpoint to accept parameters
- [ ] Build `ParameterEditor.tsx` component
- [ ] Integrate parameter modal into workflow execution flow
- [ ] Test with common workflow types (txt2img, img2img)

**Definition of Done:**
- User can view extracted parameters from any workflow
- User can modify parameters and execute
- Parameters used are stored with generation record

### Phase 2: WebSocket Status (Day 2-3)

**Tasks:**
- [ ] Create `ComfyUIWebSocketService` class
- [ ] Implement connection management (auto-reconnect)
- [ ] Parse ComfyUI WebSocket messages
- [ ] Forward progress to frontend via Socket.io
- [ ] Create `useComfyUIProgress` hook
- [ ] Build `GenerationProgress.tsx` component
- [ ] Update generation cards with live status
- [ ] Handle preview images (base64 transport)

**Definition of Done:**
- Live progress bar during generation
- Current node displayed
- Preview images shown when available
- Graceful handling of WebSocket disconnects

### Phase 3: Batch Execution (Day 3-4)

**Tasks:**
- [ ] Create `comfyui_batches` table migration
- [ ] Add batch_id column to generations
- [ ] Implement batch creation and tracking
- [ ] Build variation generation logic
- [ ] Add `/workflows/:id/batch` endpoint
- [ ] Build `BatchExecuteModal.tsx` component
- [ ] Build `BatchProgress.tsx` component
- [ ] Add batch filtering to results gallery

**Definition of Done:**
- User can queue batch of 1-20 generations
- Seed variations work (random/increment)
- Prompt cycling works
- Batch progress visible in UI
- Results grouped by batch

### Phase 4: Polish & Testing (Day 4-5)

**Tasks:**
- [ ] Error handling for all new endpoints
- [ ] Loading states and skeletons
- [ ] Mobile responsiveness
- [ ] Unit tests for parameter extraction
- [ ] Integration tests for batch execution
- [ ] Documentation updates
- [ ] Code review and cleanup

---

## File Changes Summary

### New Files
```
backend/
├── src/
│   ├── services/
│   │   └── comfyui-websocket.service.ts
│   └── db/migrations/
│       ├── XXXX_add_workflow_parameters.ts
│       └── XXXX_create_batches_table.ts

frontend/
├── src/
│   ├── components/comfyui/
│   │   ├── ParameterEditor.tsx
│   │   ├── GenerationProgress.tsx
│   │   ├── BatchExecuteModal.tsx
│   │   └── BatchProgress.tsx
│   └── hooks/
│       └── useComfyUIProgress.ts
```

### Modified Files
```
backend/
├── src/
│   ├── controllers/comfyui.controller.ts
│   ├── routes/comfyui.routes.ts
│   └── services/comfyui.service.ts

frontend/
├── src/
│   ├── pages/ComfyUI.tsx
│   └── services/socket.ts
```

---

## Testing Strategy

### Unit Tests
- Parameter extraction from various workflow types
- Parameter application produces valid workflow JSON
- Batch variation generation logic

### Integration Tests
- Full workflow execution with custom parameters
- WebSocket connection and message handling
- Batch creation and tracking

### Manual Testing
- Test with real ComfyUI instance
- Various workflow types (SDXL, SD1.5, Flux)
- Edge cases: missing nodes, invalid parameters

---

## Rollback Plan

If issues arise post-merge:

1. Database migrations are backward compatible (new columns only)
2. New endpoints don't affect existing functionality
3. Feature flags can disable new UI components
4. WebSocket service gracefully degrades if ComfyUI unavailable

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Parameter extraction accuracy | >95% of common node types |
| WebSocket reconnection time | <5 seconds |
| Batch execution throughput | 20 generations in <1 min (queuing) |
| UI responsiveness during batch | No frame drops |