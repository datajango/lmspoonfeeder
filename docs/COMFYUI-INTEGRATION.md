# ComfyUI Integration Guide

> **Last Updated**: December 2024  
> **ComfyUI Version**: Latest  
> **Default Port**: 8188

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Workflow JSON Structure](#workflow-json-structure)
- [Node Types Reference](#node-types-reference)
- [Parameter System](#parameter-system)
- [API Integration](#api-integration)
- [Image Proxy System](#image-proxy-system)
- [Session Management](#session-management)
- [Workflow Management](#workflow-management)
- [Generation Lifecycle](#generation-lifecycle)
- [Reproducibility System](#reproducibility-system)
- [WebSocket Events](#websocket-events)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

---

## Overview

Spoon Feeder integrates with ComfyUI to provide a streamlined interface for Stable Diffusion image generation. The integration abstracts away ComfyUI's node-based complexity while preserving full control over generation parameters.

### Key Features

| Feature | Description |
|---------|-------------|
| **Dynamic Workflows** | Load and modify any ComfyUI workflow |
| **Parameter Extraction** | Automatically detect editable parameters |
| **Session Management** | Group generations like chat conversations |
| **Full Reproducibility** | Store complete workflow snapshots |
| **Image Proxy** | Serve images through the backend API |
| **Multi-Instance** | Support multiple ComfyUI servers via profiles |

### Integration Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SPOON FEEDER                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Frontend (React)                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ Session List │  │ Parameter    │  │ Generation History   │  │   │
│  │  │              │  │ Panel        │  │                      │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │ HTTP/WebSocket                        │
│  ┌──────────────────────────────┴──────────────────────────────────┐   │
│  │                     Backend (Express)                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ ComfyUI      │  │ Workflow     │  │ Image Proxy          │  │   │
│  │  │ Controller   │  │ Manager      │  │                      │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ HTTP REST + WebSocket
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            COMFYUI                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ REST API        │  │ WebSocket API   │  │ File System             │ │
│  │ /prompt         │  │ Progress Events │  │ /output                 │ │
│  │ /queue          │  │ Status Updates  │  │ /input                  │ │
│  │ /history        │  │                 │  │ /models                 │ │
│  │ /view           │  │                 │  │                         │ │
│  │ /object_info    │  │                 │  │                         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Communication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         GENERATION REQUEST FLOW                             │
└────────────────────────────────────────────────────────────────────────────┘

1. User clicks "Generate"
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/comfyui/sessions/:sessionId/generate                    │
│ {                                                                            │
│   prompt_text: "A dragon flying over mountains",                            │
│   negative_prompt: "blurry, low quality",                                   │
│   workflow_id: "uuid" (optional),                                           │
│   parameters: { width: 1024, height: 1024, steps: 25, seed: -1, ... }      │
│ }                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend: generateWithParameters()                                           │
│                                                                              │
│ 1. Load workflow JSON (from DB or use built-in txt2img)                     │
│ 2. Merge parameters: DEFAULT → session.last_parameters → request.parameters │
│ 3. Apply parameters to workflow nodes                                        │
│ 4. Resolve seed (-1 → random integer)                                       │
│ 5. Trace KSampler connections to find prompt nodes                          │
│ 6. Set prompt text in positive CLIPTextEncode node                          │
│ 7. Set negative prompt in negative CLIPTextEncode node                      │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend: POST to ComfyUI /prompt                                            │
│ {                                                                            │
│   prompt: { ...modified_workflow_json }                                     │
│ }                                                                            │
│                                                                              │
│ Response: { prompt_id: "abc123-def456" }                                    │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend: Save to Database                                                   │
│                                                                              │
│ comfyui_generations: {                                                      │
│   id: "gen-uuid",                                                           │
│   session_id: "session-uuid",                                               │
│   workflow_id: "workflow-uuid",                                             │
│   prompt_id: "abc123-def456",           ← ComfyUI's tracking ID            │
│   workflow_json_snapshot: {...},        ← Complete workflow for repro       │
│   prompt_text, negative_prompt,                                             │
│   parameters: {...},                    ← All params as JSON               │
│   width, height, steps, cfg_scale,      ← Denormalized for queries         │
│   seed: 987654321,                      ← Resolved seed (not -1)           │
│   status: 'running'                                                         │
│ }                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ComfyUI: Process Generation                                                 │
│                                                                              │
│ 1. Queue prompt                                                             │
│ 2. Load checkpoint model (if not cached)                                    │
│ 3. Execute nodes in order                                                   │
│ 4. Generate latent → Decode VAE → Save image                               │
│                                                                              │
│ WebSocket events: progress, executing, executed                             │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Frontend: Poll for completion or receive WebSocket event                    │
│                                                                              │
│ Update generation status: 'running' → 'complete'                            │
│ Store outputs: [{ filename: "ComfyUI_00042_.png", subfolder: "" }]         │
└─────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Frontend: Display Image                                                     │
│                                                                              │
│ GET /api/comfyui/image/ComfyUI_00042_.png                                   │
│     │                                                                        │
│     ▼                                                                        │
│ Backend proxies from ComfyUI:                                               │
│ GET http://localhost:8188/view?filename=ComfyUI_00042_.png&type=output      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow JSON Structure

ComfyUI workflows are JSON objects where each key is a node ID and each value describes the node.

### Basic Structure

```json
{
  "node_id": {
    "class_type": "NodeClassName",
    "inputs": {
      "input_name": "value or connection"
    }
  }
}
```

### Connection Format

Connections between nodes use array syntax: `["source_node_id", output_index]`

```json
{
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "model": ["4", 0],      // Connect to node 4, output 0
      "positive": ["6", 0],   // Connect to node 6, output 0
      "negative": ["7", 0],   // Connect to node 7, output 0
      "latent_image": ["5", 0],
      "seed": 12345,          // Direct value
      "steps": 20,
      "cfg": 7
    }
  }
}
```

### Complete txt2img Workflow Example

```json
{
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "cfg": 7,
      "denoise": 1,
      "latent_image": ["5", 0],
      "model": ["4", 0],
      "negative": ["7", 0],
      "positive": ["6", 0],
      "sampler_name": "euler",
      "scheduler": "normal",
      "seed": 123456789,
      "steps": 20
    }
  },
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "sd_xl_base_1.0.safetensors"
    }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "batch_size": 1,
      "height": 1024,
      "width": 1024
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": ["4", 1],
      "text": "A majestic dragon flying over snow-capped mountains at sunset"
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": ["4", 1],
      "text": "blurry, low quality, distorted, watermark"
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": ["8", 0]
    }
  }
}
```

### Node Execution Order

ComfyUI automatically determines execution order based on connections:

```
CheckpointLoaderSimple (4)
         │
         ├──────────────────────────────┐
         ▼                              ▼
EmptyLatentImage (5)          CLIPTextEncode (6, 7)
         │                              │
         └──────────────┬───────────────┘
                        ▼
                   KSampler (3)
                        │
                        ▼
                   VAEDecode (8)
                        │
                        ▼
                   SaveImage (9)
```

---

## Node Types Reference

### KSampler

The core sampling node that generates latent images.

| Input | Type | Description | Default |
|-------|------|-------------|---------|
| `model` | MODEL | Checkpoint model connection | - |
| `positive` | CONDITIONING | Positive prompt conditioning | - |
| `negative` | CONDITIONING | Negative prompt conditioning | - |
| `latent_image` | LATENT | Input latent (usually empty) | - |
| `seed` | INT | Random seed (0 to 2^31-1) | Random |
| `steps` | INT | Sampling steps (1-150) | 20 |
| `cfg` | FLOAT | CFG scale (1-30) | 7 |
| `sampler_name` | STRING | Sampler algorithm | "euler" |
| `scheduler` | STRING | Noise scheduler | "normal" |
| `denoise` | FLOAT | Denoising strength (0-1) | 1 |

**Supported Samplers**
```typescript
const SAMPLERS = [
  'euler', 'euler_ancestral', 'heun', 'heunpp2',
  'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast',
  'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde',
  'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde',
  'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde', 'dpmpp_3m_sde_gpu',
  'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2'
];
```

**Supported Schedulers**
```typescript
const SCHEDULERS = [
  'normal', 'karras', 'exponential', 'sgm_uniform',
  'simple', 'ddim_uniform', 'beta'
];
```

---

### CLIPTextEncode

Encodes text prompts into conditioning for the sampler.

| Input | Type | Description |
|-------|------|-------------|
| `clip` | CLIP | CLIP model from checkpoint |
| `text` | STRING | Prompt text |

| Output | Type | Description |
|--------|------|-------------|
| 0 | CONDITIONING | Encoded conditioning |

---

### EmptyLatentImage

Creates an empty latent image of specified dimensions.

| Input | Type | Description | Default |
|-------|------|-------------|---------|
| `width` | INT | Image width | 512 |
| `height` | INT | Image height | 512 |
| `batch_size` | INT | Number of images | 1 |

**Optimal Dimensions for SDXL**
```typescript
const SDXL_DIMENSIONS = [
  { width: 1024, height: 1024, label: '1:1 Square' },
  { width: 1152, height: 896, label: '9:7 Landscape' },
  { width: 896, height: 1152, label: '7:9 Portrait' },
  { width: 1216, height: 832, label: '3:2 Landscape' },
  { width: 832, height: 1216, label: '2:3 Portrait' },
  { width: 1344, height: 768, label: '16:9 Wide' },
  { width: 768, height: 1344, label: '9:16 Tall' },
  { width: 1536, height: 640, label: '21:9 Ultrawide' },
];
```

---

### CheckpointLoaderSimple

Loads a Stable Diffusion checkpoint model.

| Input | Type | Description |
|-------|------|-------------|
| `ckpt_name` | STRING | Checkpoint filename |

| Output | Index | Type | Description |
|--------|-------|------|-------------|
| 0 | MODEL | The UNet model |
| 1 | CLIP | The CLIP text encoder |
| 2 | VAE | The VAE decoder |

---

### VAEDecode

Decodes latent images to pixel images.

| Input | Type | Description |
|-------|------|-------------|
| `samples` | LATENT | Latent image from sampler |
| `vae` | VAE | VAE model from checkpoint |

---

### SaveImage

Saves images to the output folder.

| Input | Type | Description |
|-------|------|-------------|
| `images` | IMAGE | Decoded images |
| `filename_prefix` | STRING | Output filename prefix |

---

### LoraLoader

Applies LoRA weights to the model.

| Input | Type | Description |
|-------|------|-------------|
| `model` | MODEL | Base model |
| `clip` | CLIP | CLIP model |
| `lora_name` | STRING | LoRA filename |
| `strength_model` | FLOAT | Model strength (0-2) |
| `strength_clip` | FLOAT | CLIP strength (0-2) |

---

## Parameter System

### Default Parameters

```typescript
const DEFAULT_PARAMETERS: GenerationParameters = {
  width: 1024,
  height: 1024,
  steps: 20,
  cfg_scale: 7,
  seed: -1,           // -1 = random
  sampler_name: 'euler',
  scheduler: 'normal',
  batch_size: 1,
  checkpoint_name: undefined,  // Use workflow default
  loras: [],
};
```

### Parameter Merge Order

Parameters are merged in priority order (later overrides earlier):

```typescript
const mergedParams = {
  ...DEFAULT_PARAMETERS,           // 1. System defaults
  ...session.last_parameters,      // 2. Session's last used
  ...workflow.default_parameters,  // 3. Workflow defaults
  ...request.parameters,           // 4. User request
};
```

### Parameter Application

The `applyParametersToWorkflow` function modifies workflow nodes:

```typescript
function applyParametersToWorkflow(
  workflowJson: object,
  params: GenerationParameters,
  prompt: string,
  negativePrompt: string
): { workflow: object; resolvedSeed: number } {
  
  const workflow = JSON.parse(JSON.stringify(workflowJson)); // Deep clone
  
  // Resolve random seed
  let resolvedSeed = params.seed ?? -1;
  if (resolvedSeed === -1) {
    resolvedSeed = Math.floor(Math.random() * 2147483647);
  }

  // Iterate through nodes and apply parameters
  for (const [nodeId, node] of Object.entries(workflow)) {
    const classType = node.class_type;
    const inputs = node.inputs;

    switch (classType) {
      case 'KSampler':
      case 'KSamplerAdvanced':
        inputs.seed = resolvedSeed;
        if (params.steps !== undefined) inputs.steps = params.steps;
        if (params.cfg_scale !== undefined) inputs.cfg = params.cfg_scale;
        if (params.sampler_name !== undefined) inputs.sampler_name = params.sampler_name;
        if (params.scheduler !== undefined) inputs.scheduler = params.scheduler;
        break;

      case 'EmptyLatentImage':
        if (params.width !== undefined) inputs.width = params.width;
        if (params.height !== undefined) inputs.height = params.height;
        if (params.batch_size !== undefined) inputs.batch_size = params.batch_size;
        break;

      case 'CheckpointLoaderSimple':
        if (params.checkpoint_name) inputs.ckpt_name = params.checkpoint_name;
        break;
    }
  }

  // Handle prompts by tracing KSampler connections
  for (const [nodeId, node] of Object.entries(workflow)) {
    if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
      const positiveRef = node.inputs.positive; // ["6", 0]
      const negativeRef = node.inputs.negative; // ["7", 0]

      if (positiveRef && Array.isArray(positiveRef)) {
        const positiveNode = workflow[positiveRef[0]];
        if (positiveNode?.inputs) {
          positiveNode.inputs.text = prompt;
        }
      }

      if (negativeRef && Array.isArray(negativeRef)) {
        const negativeNode = workflow[negativeRef[0]];
        if (negativeNode?.inputs) {
          negativeNode.inputs.text = negativePrompt || 
            'low quality, blurry, distorted, ugly, bad anatomy, watermark, text';
        }
      }
      break; // Only process first KSampler
    }
  }

  return { workflow, resolvedSeed };
}
```

### Parameter Extraction

Extract editable parameters from a workflow for UI display:

```typescript
function extractParametersFromWorkflow(workflowJson: object): WorkflowParameter[] {
  const parameters: WorkflowParameter[] = [];

  for (const [nodeId, node] of Object.entries(workflowJson)) {
    const classType = node.class_type;
    const inputs = node.inputs;

    switch (classType) {
      case 'KSampler':
      case 'KSamplerAdvanced':
        parameters.push(
          { nodeId, field: 'seed', label: 'Seed', type: 'seed', 
            value: inputs.seed || 0, min: 0, max: 2147483647 },
          { nodeId, field: 'steps', label: 'Steps', type: 'number', 
            value: inputs.steps || 20, min: 1, max: 150 },
          { nodeId, field: 'cfg', label: 'CFG Scale', type: 'number', 
            value: inputs.cfg || 7, min: 1, max: 30 },
          { nodeId, field: 'sampler_name', label: 'Sampler', type: 'select', 
            value: inputs.sampler_name || 'euler', options: SAMPLERS },
          { nodeId, field: 'scheduler', label: 'Scheduler', type: 'select', 
            value: inputs.scheduler || 'normal', options: SCHEDULERS }
        );
        break;

      case 'EmptyLatentImage':
        parameters.push(
          { nodeId, field: 'width', label: 'Width', type: 'select', 
            value: inputs.width || 512, options: DIMENSIONS },
          { nodeId, field: 'height', label: 'Height', type: 'select', 
            value: inputs.height || 512, options: DIMENSIONS },
          { nodeId, field: 'batch_size', label: 'Batch Size', type: 'number', 
            value: inputs.batch_size || 1, min: 1, max: 8 }
        );
        break;
    }
  }

  return parameters;
}
```

---

## API Integration

### ComfyUI REST Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/prompt` | POST | Queue a workflow for execution |
| `/queue` | GET | Get current queue status |
| `/history` | GET | Get execution history |
| `/history/{prompt_id}` | GET | Get specific execution |
| `/view` | GET | Retrieve generated images |
| `/object_info` | GET | Get available nodes and their inputs |
| `/interrupt` | POST | Cancel current generation |

### Queue a Prompt

```typescript
const response = await fetch(`${COMFYUI_URL}/prompt`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: workflowJson }),
});

const result = await response.json();
// { prompt_id: "abc123-def456-..." }
```

### Get Execution History

```typescript
const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);
const history = await response.json();

// history[promptId] = {
//   prompt: [...],
//   outputs: {
//     "9": {  // SaveImage node ID
//       images: [
//         { filename: "ComfyUI_00042_.png", subfolder: "", type: "output" }
//       ]
//     }
//   },
//   status: { completed: true }
// }
```

### Get Available Options

```typescript
const response = await fetch(`${COMFYUI_URL}/object_info`);
const objectInfo = await response.json();

// Get checkpoints
const checkpoints = objectInfo.CheckpointLoaderSimple.input.required.ckpt_name[0];
// ["sd_xl_base_1.0.safetensors", "juggernautXL_v9.safetensors", ...]

// Get LoRAs
const loras = objectInfo.LoraLoader.input.required.lora_name[0];
// ["detail_enhancer.safetensors", ...]
```

### Retrieve Images

```typescript
const imageUrl = `${COMFYUI_URL}/view?filename=${filename}&subfolder=${subfolder}&type=output`;
const response = await fetch(imageUrl);
const imageBuffer = await response.arrayBuffer();
```

---

## Image Proxy System

Spoon Feeder proxies ComfyUI images through the backend to:
- Avoid CORS issues
- Enable future access control
- Provide consistent API surface

### Proxy Endpoint

```
GET /api/comfyui/image/:filename?subfolder=&type=output
```

### Implementation

```typescript
export async function proxyImage(req: Request, res: Response, next: NextFunction) {
  const { filename } = req.params;
  const { subfolder = '', type = 'output' } = req.query;

  const imageUrl = `${COMFYUI_URL}/view?` + 
    `filename=${encodeURIComponent(filename)}&` +
    `subfolder=${encodeURIComponent(subfolder as string)}&` +
    `type=${type}`;

  const imageRes = await fetch(imageUrl);
  
  if (!imageRes.ok) {
    throw new NotFoundError(`Image ${filename} not found`);
  }

  res.set('Content-Type', imageRes.headers.get('Content-Type') || 'image/png');
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  res.send(buffer);
}
```

### Frontend Usage

```tsx
// In GenerationCard.tsx
const imageUrl = `/api/comfyui/image/${output.filename}?` +
  `subfolder=${output.subfolder || ''}&type=${output.type || 'output'}`;

<img src={imageUrl} alt="Generated image" />
```

---

## Session Management

Sessions group related generations, similar to chat conversations.

### Session Structure

```typescript
interface ComfyUISession {
  id: string;
  profile_id: string;           // Which ComfyUI instance
  title: string;
  current_workflow_id?: string; // Selected workflow
  last_parameters: GenerationParameters;  // For continuity
  generation_count: number;
  completed_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}
```

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────┘

1. Create Session
   POST /api/comfyui/sessions
   { profileId: "...", title: "Landscape Concepts" }
         │
         ▼
2. Select Workflow (optional)
   The session can use a stored workflow or the built-in txt2img
         │
         ▼
3. Generate Images
   POST /api/comfyui/sessions/:id/generate
   Parameters are saved to session.last_parameters for continuity
         │
         ▼
4. Browse History
   GET /api/comfyui/sessions/:id
   Returns session details + all generations
         │
         ▼
5. Reproduce Generation
   Click "Reuse Settings" on any generation
   Loads workflow_json_snapshot and parameters
         │
         ▼
6. Delete Session
   DELETE /api/comfyui/sessions/:id
   Cascades to delete all generations
```

### Parameter Continuity

When a user generates an image, their parameters are saved:

```typescript
await db('comfyui_sessions')
  .where('id', sessionId)
  .update({
    updated_at: new Date(),
    last_parameters: JSON.stringify(mergedParams),
    generation_count: db.raw('generation_count + 1'),
  });
```

Next generation inherits these parameters:

```typescript
const mergedParams = {
  ...DEFAULT_PARAMETERS,
  ...session.last_parameters,  // Previous settings carried forward
  ...request.parameters,       // User overrides
};
```

---

## Workflow Management

### Storing Workflows

Workflows are stored in the database with metadata:

```typescript
interface ComfyUIWorkflow {
  id: string;
  profile_id: string;
  name: string;
  description?: string;
  workflow_json: string;           // Complete workflow JSON
  default_parameters: object;      // Default param values
  extracted_parameters: object[];  // Cached parameter definitions
  is_default: boolean;
  generation_count: number;
  created_at: string;
  updated_at: string;
}
```

### Import Workflow from ComfyUI

1. In ComfyUI, click **Save** to download `workflow.json`
2. In Spoon Feeder, go to **ComfyUI Workflows** page
3. Click **Import Workflow**
4. Upload the JSON file
5. Set name, description, and default parameters

### Built-in txt2img Workflow

When no workflow is specified, Spoon Feeder uses a built-in template:

```typescript
function buildTxt2ImgWorkflow(prompt: string, negativePrompt: string): object {
  return {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "cfg": 7,
        "denoise": 1,
        "latent_image": ["5", 0],
        "model": ["4", 0],
        "negative": ["7", 0],
        "positive": ["6", 0],
        "sampler_name": "euler",
        "scheduler": "normal",
        "seed": Math.floor(Math.random() * 1000000000000),
        "steps": 20
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"
      }
    },
    // ... remaining nodes
  };
}
```

---

## Generation Lifecycle

### Status Flow

```
pending → running → complete
                 ↘ failed
```

### Database Record

```typescript
interface ComfyUIGeneration {
  id: string;
  session_id: string;
  workflow_id?: string;
  prompt_id: string;                    // ComfyUI's tracking ID
  
  // Reproducibility
  workflow_json_snapshot: string;       // Complete workflow used
  parameters: object;                   // All parameters
  
  // Content
  prompt_text: string;
  negative_prompt?: string;
  
  // Denormalized for queries
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed: number;                         // Resolved seed
  sampler_name: string;
  scheduler: string;
  batch_size: number;
  checkpoint_name?: string;
  loras_used: object[];
  
  // Results
  outputs: object[];                    // Array of { filename, subfolder, type }
  status: 'pending' | 'running' | 'complete' | 'failed';
  error?: string;
  generation_time_seconds?: number;
  
  // Timestamps
  created_at: string;
  completed_at?: string;
}
```

### Polling for Completion

Currently, the frontend polls for generation status:

```typescript
// In ComfyUI.tsx
useEffect(() => {
  if (pollingIds.size === 0) return;

  const interval = setInterval(async () => {
    for (const genId of pollingIds) {
      const generation = await fetchGeneration(genId);
      
      if (generation.status === 'complete' || generation.status === 'failed') {
        // Remove from polling set
        setPollingIds(prev => {
          const next = new Set(prev);
          next.delete(genId);
          return next;
        });
        
        // Refresh session data
        refetchSession();
      }
    }
  }, 2000); // Poll every 2 seconds

  return () => clearInterval(interval);
}, [pollingIds]);
```

---

## Reproducibility System

Every generation stores complete information for exact reproduction.

### What's Stored

| Field | Purpose |
|-------|---------|
| `workflow_json_snapshot` | Exact workflow JSON sent to ComfyUI |
| `parameters` | All parameters as structured JSON |
| `prompt_text` | Positive prompt |
| `negative_prompt` | Negative prompt |
| `seed` | Resolved seed (actual number, not -1) |

### Reproducing a Generation

```typescript
// Get the workflow data
const response = await fetch(`/api/comfyui/generations/${id}/workflow`);
const data = await response.json();
// {
//   workflow_json: {...},      // Exact workflow used
//   parameters: {...},         // All parameters
//   prompt_text: "...",
//   negative_prompt: "..."
// }

// Option 1: Use in Spoon Feeder
// Click "Reuse Settings" button to load into current session

// Option 2: Export to ComfyUI
// Download workflow_json and load in ComfyUI directly
```

### Why Dual Storage?

| Storage Type | Use Case |
|--------------|----------|
| `workflow_json_snapshot` | Exact reproduction, debugging |
| `parameters` (JSONB) | Flexible querying, future extensions |
| Denormalized columns | Fast filtering: "all 1024x1024 images" |

---

## WebSocket Events

### ComfyUI WebSocket API

ComfyUI provides real-time progress via WebSocket on the same port (8188).

### Event Types

```typescript
// Connection
ws://localhost:8188/ws

// Events sent by ComfyUI:

// Execution started
{ "type": "execution_start", "data": { "prompt_id": "..." } }

// Node executing
{ "type": "executing", "data": { "node": "3", "prompt_id": "..." } }

// Progress update
{ "type": "progress", "data": { "value": 5, "max": 20, "prompt_id": "..." } }

// Execution complete
{ "type": "executed", "data": { "node": "9", "output": {...}, "prompt_id": "..." } }

// Execution cached (skipped)
{ "type": "execution_cached", "data": { "nodes": ["4"], "prompt_id": "..." } }

// Error
{ "type": "execution_error", "data": { "prompt_id": "...", "exception_message": "..." } }
```

### Planned Integration

```typescript
// Future: Backend WebSocket bridge
class ComfyUIWebSocketBridge {
  private comfyWs: WebSocket;
  private io: SocketIOServer;
  
  connect() {
    this.comfyWs = new WebSocket('ws://localhost:8188/ws');
    
    this.comfyWs.on('message', (data) => {
      const event = JSON.parse(data);
      
      switch (event.type) {
        case 'progress':
          // Forward to client
          this.io.emit('generation:progress', {
            promptId: event.data.prompt_id,
            progress: event.data.value / event.data.max,
            step: event.data.value,
            totalSteps: event.data.max,
          });
          break;
          
        case 'executed':
          this.io.emit('generation:completed', {
            promptId: event.data.prompt_id,
            outputs: event.data.output,
          });
          break;
      }
    });
  }
}
```

---

## Troubleshooting

### Connection Issues

**Cannot connect to ComfyUI**

```bash
# 1. Check if ComfyUI is running
curl http://localhost:8188/system_stats

# 2. Verify COMFYUI_URL in .env
COMFYUI_URL=http://localhost:8188

# 3. If using Docker, use host.docker.internal
COMFYUI_URL=http://host.docker.internal:8188

# 4. Check ComfyUI logs for errors
```

**Images not loading**

```bash
# 1. Test direct access
curl "http://localhost:8188/view?filename=ComfyUI_00001_.png&type=output"

# 2. Check proxy endpoint
curl "http://localhost:3001/api/comfyui/image/ComfyUI_00001_.png?type=output"

# 3. Verify file exists in ComfyUI output folder
ls /path/to/ComfyUI/output/
```

### Generation Issues

**Generation stuck in "running"**

```bash
# 1. Check ComfyUI queue
curl http://localhost:8188/queue

# 2. Check prompt history
curl http://localhost:8188/history

# 3. Interrupt current generation
curl -X POST http://localhost:8188/interrupt
```

**Wrong model loading**

```typescript
// Check checkpoint_name in parameters
console.log('Checkpoint:', params.checkpoint_name);

// Verify checkpoint exists in ComfyUI
const objectInfo = await fetch(`${COMFYUI_URL}/object_info`);
const checkpoints = objectInfo.CheckpointLoaderSimple.input.required.ckpt_name[0];
console.log('Available:', checkpoints);
```

**Prompts not applying**

```typescript
// Enable debug logging in comfyui.controller.ts
console.log('=== PROMPT APPLICATION ===');
console.log('Positive node:', positiveRef);
console.log('Negative node:', negativeRef);
console.log('Prompt text:', prompt);
console.log('After apply:', workflow["6"]?.inputs?.text);
```

### Memory Issues

**Out of memory on GPU**

```bash
# 1. Reduce image dimensions
parameters.width = 512;
parameters.height = 512;

# 2. Use fp16 checkpoint
ckpt_name: "model-fp16.safetensors"

# 3. Enable ComfyUI memory optimizations
python main.py --lowvram
python main.py --cpu  # If needed
```

---

## Advanced Topics

### Custom Node Support

To support custom nodes in workflows:

1. **Add to extractParametersFromWorkflow**

```typescript
case 'CustomNodeName':
  parameters.push({
    nodeId,
    field: 'custom_param',
    label: 'Custom Parameter',
    type: 'number',
    value: inputs.custom_param || 1.0,
    min: 0,
    max: 2,
  });
  break;
```

2. **Add to applyParametersToWorkflow**

```typescript
case 'CustomNodeName':
  if (params.custom_param !== undefined) {
    inputs.custom_param = params.custom_param;
  }
  break;
```

### Batch Generation

Generate multiple images with parameter variations:

```typescript
// Future API
POST /api/comfyui/sessions/:id/batch
{
  prompt_text: "A dragon",
  batch_config: {
    type: "seed_variation",
    count: 4,
    base_seed: 12345
  }
  // OR
  batch_config: {
    type: "parameter_sweep",
    parameter: "cfg_scale",
    values: [5, 7, 9, 11]
  }
}
```

### Multiple ComfyUI Instances

Support multiple ComfyUI servers via profiles:

```typescript
// Profile 1: Local machine
{
  name: "Local ComfyUI",
  provider: "comfyui",
  url: "http://localhost:8188"
}

// Profile 2: Remote server
{
  name: "GPU Server",
  provider: "comfyui",
  url: "http://192.168.1.100:8188"
}

// Profile 3: Cloud instance
{
  name: "Cloud ComfyUI",
  provider: "comfyui",
  url: "https://comfyui.example.com"
}
```

### LoRA Support

Apply LoRA models to generations:

```typescript
// In workflow JSON, add LoraLoader between checkpoint and KSampler
{
  "10": {
    "class_type": "LoraLoader",
    "inputs": {
      "model": ["4", 0],
      "clip": ["4", 1],
      "lora_name": "detail_enhancer.safetensors",
      "strength_model": 0.8,
      "strength_clip": 0.8
    }
  },
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "model": ["10", 0],  // Now uses LoRA output
      // ...
    }
  }
}

// Track in generation record
{
  loras_used: [
    { name: "detail_enhancer.safetensors", strength: 0.8 }
  ]
}
```

### ControlNet Support

For ControlNet workflows, the image input needs special handling:

```typescript
// Upload image to ComfyUI
const formData = new FormData();
formData.append('image', imageFile);
const uploadRes = await fetch(`${COMFYUI_URL}/upload/image`, {
  method: 'POST',
  body: formData,
});
const { name, subfolder } = await uploadRes.json();

// Reference in workflow
{
  "11": {
    "class_type": "LoadImage",
    "inputs": {
      "image": `${name}` // Use uploaded filename
    }
  }
}
```

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/comfyui/options` | GET | Samplers, schedulers, checkpoints |
| `/api/comfyui/sessions` | GET/POST | List/create sessions |
| `/api/comfyui/sessions/:id` | GET/PUT/DELETE | Session CRUD |
| `/api/comfyui/sessions/:id/generate` | POST | Generate image |
| `/api/comfyui/workflows` | GET/POST | List/create workflows |
| `/api/comfyui/workflows/:id` | GET/PUT/DELETE | Workflow CRUD |
| `/api/comfyui/generations/:id` | GET/DELETE | Generation details |
| `/api/comfyui/generations/:id/workflow` | GET | Get workflow snapshot |
| `/api/comfyui/image/:filename` | GET | Proxy image |

### Generation Parameters

| Parameter | Type | Range | Default |
|-----------|------|-------|---------|
| `width` | int | 256-2048 | 1024 |
| `height` | int | 256-2048 | 1024 |
| `steps` | int | 1-150 | 20 |
| `cfg_scale` | float | 1-30 | 7 |
| `seed` | int | -1 to 2^31 | -1 (random) |
| `sampler_name` | string | See list | "euler" |
| `scheduler` | string | See list | "normal" |
| `batch_size` | int | 1-8 | 1 |
| `checkpoint_name` | string | - | Workflow default |

### Common Samplers

| Sampler | Speed | Quality | Best For |
|---------|-------|---------|----------|
| `euler` | Fast | Good | General use |
| `euler_ancestral` | Fast | Creative | Varied results |
| `dpmpp_2m` | Medium | High | Detailed images |
| `dpmpp_2m_sde` | Slow | Very High | Best quality |
| `lcm` | Very Fast | Medium | Quick previews |
| `ddim` | Fast | Good | Consistent results |
