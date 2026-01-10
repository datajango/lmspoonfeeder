# ComfyUI Workflow Management & Diagnostics

## Part 1: Workflow Debugging Methodology

### The Challenge

ComfyUI workflows are JSON configurations that wire together nodes. When a workflow fails, the error messages can be cryptic:

```
Prompt outputs failed validation: KSampler: - Required input is missing: model
```

This doesn't tell you *why* the model is missing—just that the connection failed.

### Diagnostic Process

#### Step 1: Identify the Failing Node

The error message names the node type (`KSampler`) and the missing input (`model`). This tells us where to look.

#### Step 2: Query Node Requirements

Use ComfyUI's `/object_info` API to understand what the node expects:

```bash
curl -s http://sonofkong:8188/object_info/KSampler | jq '.KSampler.input'
```

**Response:**
```json
{
  "required": {
    "model": ["MODEL"],
    "positive": ["CONDITIONING"],
    "negative": ["CONDITIONING"],
    "latent_image": ["LATENT"],
    "seed": ["INT", {"default": 0}],
    "steps": ["INT", {"default": 20}],
    "cfg": ["FLOAT", {"default": 8.0}],
    "sampler_name": [["euler", "euler_ancestral", "heun", ...]],
    "scheduler": [["normal", "karras", "exponential", ...]],
    "denoise": ["FLOAT", {"default": 1.0}]
  }
}
```

Key insight: `model` expects type `MODEL`.

#### Step 3: Trace the Connection

In the workflow JSON, find what's connected to the KSampler's model input:

```json
"8": {
  "class_type": "KSampler",
  "inputs": {
    "model": ["3", 0],  // Connected to node 3, output 0
    ...
  }
}
```

Now check node 3's output type:

```bash
curl -s http://sonofkong:8188/object_info/ADE_ApplyAnimateDiffModelSimple | jq '.ADE_ApplyAnimateDiffModelSimple.output'
```

**Response:**
```json
["M_MODELS"]  // NOT "MODEL"!
```

**Root Cause Found:** Node 3 outputs `M_MODELS`, but KSampler expects `MODEL`. They're incompatible.

#### Step 4: Find the Correct Node

Search for a node that converts `M_MODELS` to `MODEL`:

```bash
curl -s http://sonofkong:8188/object_info | grep -o '"ADE_[^"]*"' | sort -u
```

Then check each candidate:

```bash
curl -s http://sonofkong:8188/object_info/ADE_UseEvolvedSampling | jq '.ADE_UseEvolvedSampling'
```

**Found:** `ADE_UseEvolvedSampling` takes `M_MODELS` as optional input and outputs `MODEL`.

#### Step 5: Fix the Workflow

Insert the missing conversion node:

```json
"4": {
  "class_type": "ADE_UseEvolvedSampling",
  "inputs": {
    "model": ["1", 0],        // Base model from checkpoint
    "m_models": ["3", 0],     // Motion models from AnimateDiff
    "beta_schedule": "autoselect"
  }
},
"8": {
  "class_type": "KSampler",
  "inputs": {
    "model": ["4", 0],        // Now connected to converted MODEL
    ...
  }
}
```

---

### Common Workflow Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Value not in list: model_name` | Model file not found | Check file exists in correct folder |
| `Required input is missing` | Wrong connection or type mismatch | Query `/object_info` for correct types |
| `Node not found` | Custom node not loaded | Check `journalctl` for import errors |
| `IMPORT FAILED` | Missing Python dependencies | Install via ComfyUI's pip |

### Diagnostic Commands Cheatsheet

```bash
# List all available nodes
curl -s http://sonofkong:8188/object_info | jq 'keys'

# Get specific node info
curl -s http://sonofkong:8188/object_info/NodeName | jq

# Check node input requirements
curl -s http://sonofkong:8188/object_info/NodeName | jq '.NodeName.input.required'

# Check node output types
curl -s http://sonofkong:8188/object_info/NodeName | jq '.NodeName.output'

# Find nodes matching a pattern
curl -s http://sonofkong:8188/object_info | grep -o '"PatternHere[^"]*"' | sort -u

# Check what models a loader sees
curl -s http://sonofkong:8188/object_info/CheckpointLoaderSimple | jq '.CheckpointLoaderSimple.input.required.ckpt_name'

# View ComfyUI logs for errors
sudo journalctl -u comfyui -n 100 --no-pager | grep -E "(Error|FAILED|Module)"
```

---

## Part 2: Workflow Validation System

### Proposed Architecture

Before submitting a workflow to ComfyUI, Spoon Feeder should validate it:

```
┌─────────────────────────────────────────────────────────┐
│                  Workflow Submission                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              1. Schema Validation                        │
│  - All required nodes present?                          │
│  - All required inputs provided?                        │
│  - Connection indices valid?                            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              2. Type Validation                          │
│  - Output types match input requirements?               │
│  - Query /object_info for each node                     │
│  - Build type dependency graph                          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              3. Resource Validation                      │
│  - Model files exist?                                   │
│  - LoRAs exist?                                         │
│  - Input images exist?                                  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              4. Submit to ComfyUI                        │
└─────────────────────────────────────────────────────────┘
```

### Validation Implementation

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  node_id: string;
  field: string;
  message: string;
  suggestion?: string;
}

async function validateWorkflow(workflow: object): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Fetch node definitions from ComfyUI
  const objectInfo = await fetch(`${COMFYUI_URL}/object_info`).then(r => r.json());
  
  for (const [nodeId, node] of Object.entries(workflow)) {
    const nodeDef = objectInfo[node.class_type];
    
    // Check node exists
    if (!nodeDef) {
      errors.push({
        node_id: nodeId,
        field: 'class_type',
        message: `Unknown node type: ${node.class_type}`,
        suggestion: 'Check if custom node is installed'
      });
      continue;
    }
    
    // Check required inputs
    for (const [inputName, inputDef] of Object.entries(nodeDef.input.required || {})) {
      if (!(inputName in node.inputs)) {
        errors.push({
          node_id: nodeId,
          field: inputName,
          message: `Missing required input: ${inputName}`
        });
      }
    }
    
    // Validate connections
    for (const [inputName, inputValue] of Object.entries(node.inputs)) {
      if (Array.isArray(inputValue)) {
        const [sourceNode, outputIndex] = inputValue;
        
        // Check source node exists
        if (!(sourceNode in workflow)) {
          errors.push({
            node_id: nodeId,
            field: inputName,
            message: `Connection references non-existent node: ${sourceNode}`
          });
          continue;
        }
        
        // Check type compatibility
        const sourceNodeDef = objectInfo[workflow[sourceNode].class_type];
        if (sourceNodeDef) {
          const outputType = sourceNodeDef.output[outputIndex];
          const expectedType = nodeDef.input.required[inputName]?.[0];
          
          if (expectedType && outputType !== expectedType && !isCompatibleType(outputType, expectedType)) {
            errors.push({
              node_id: nodeId,
              field: inputName,
              message: `Type mismatch: expected ${expectedType}, got ${outputType}`,
              suggestion: `Find a converter node or use correct output index`
            });
          }
        }
      }
    }
    
    // Validate model references
    if (node.inputs.ckpt_name || node.inputs.model_name || node.inputs.unet_name) {
      const modelName = node.inputs.ckpt_name || node.inputs.model_name || node.inputs.unet_name;
      const availableModels = nodeDef.input.required.ckpt_name?.[0] || 
                              nodeDef.input.required.model_name?.[0] ||
                              nodeDef.input.required.unet_name?.[0] || [];
      
      if (!availableModels.includes(modelName)) {
        errors.push({
          node_id: nodeId,
          field: 'model',
          message: `Model not found: ${modelName}`,
          suggestion: `Available: ${availableModels.slice(0, 5).join(', ')}...`
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## Part 3: Spoon Feeder ComfyUI Management API

### Proposed Endpoints

#### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comfyui/health` | ComfyUI connection status |
| GET | `/api/comfyui/status` | Detailed system status |
| GET | `/api/comfyui/queue` | Current queue status |

#### Model Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comfyui/models` | List all models by category |
| GET | `/api/comfyui/models/:category` | List models in category |
| GET | `/api/comfyui/models/:category/:name` | Get model details |
| POST | `/api/comfyui/models/refresh` | Rescan model folders |

#### Node Information

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comfyui/nodes` | List all available nodes |
| GET | `/api/comfyui/nodes/:name` | Get node definition |
| GET | `/api/comfyui/nodes/search?q=` | Search nodes |

#### Workflow Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comfyui/workflows` | List stored workflows |
| POST | `/api/comfyui/workflows` | Create/store workflow |
| GET | `/api/comfyui/workflows/:id` | Get workflow |
| PUT | `/api/comfyui/workflows/:id` | Update workflow |
| DELETE | `/api/comfyui/workflows/:id` | Delete workflow |
| POST | `/api/comfyui/workflows/:id/validate` | Validate workflow |
| POST | `/api/comfyui/workflows/:id/execute` | Execute workflow |

#### Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comfyui/generate` | Queue generation job |
| POST | `/api/comfyui/generate/batch` | Queue batch generation |
| GET | `/api/comfyui/generate/:promptId` | Get generation status |
| GET | `/api/comfyui/generate/:promptId/result` | Get generation result |
| DELETE | `/api/comfyui/generate/:promptId` | Cancel generation |

#### Output Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comfyui/outputs` | List output files |
| GET | `/api/comfyui/outputs/:filename` | Download output file |
| DELETE | `/api/comfyui/outputs/:filename` | Delete output file |
| POST | `/api/comfyui/outputs/:filename/convert` | Convert format (OBJ→STL) |

---

### API Implementation

#### `/api/comfyui/health`

```typescript
// GET /api/comfyui/health
export async function getHealth(req: Request, res: Response) {
  try {
    const start = Date.now();
    const response = await fetch(`${COMFYUI_URL}/system_stats`, { 
      timeout: 5000 
    });
    const latency = Date.now() - start;
    
    if (!response.ok) {
      return res.json({
        status: 'unhealthy',
        connected: false,
        error: `HTTP ${response.status}`
      });
    }
    
    const stats = await response.json();
    
    res.json({
      status: 'healthy',
      connected: true,
      latency_ms: latency,
      comfyui_version: stats.system?.comfyui_version,
      python_version: stats.system?.python_version,
      gpu: {
        name: stats.devices?.[0]?.name,
        vram_total: stats.devices?.[0]?.vram_total,
        vram_free: stats.devices?.[0]?.vram_free
      }
    });
  } catch (error) {
    res.json({
      status: 'unhealthy',
      connected: false,
      error: error.message
    });
  }
}
```

#### `/api/comfyui/status`

```typescript
// GET /api/comfyui/status
export async function getStatus(req: Request, res: Response) {
  try {
    // Parallel fetch all status info
    const [health, queue, history, objectInfo] = await Promise.all([
      fetch(`${COMFYUI_URL}/system_stats`).then(r => r.json()).catch(() => null),
      fetch(`${COMFYUI_URL}/queue`).then(r => r.json()).catch(() => null),
      fetch(`${COMFYUI_URL}/history?max_items=10`).then(r => r.json()).catch(() => null),
      fetch(`${COMFYUI_URL}/object_info`).then(r => r.json()).catch(() => null)
    ]);
    
    res.json({
      success: true,
      data: {
        connected: !!health,
        system: health?.system || null,
        gpu: health?.devices?.[0] || null,
        queue: {
          pending: queue?.queue_pending?.length || 0,
          running: queue?.queue_running?.length || 0
        },
        recent_jobs: Object.keys(history || {}).length,
        available_nodes: Object.keys(objectInfo || {}).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### `/api/comfyui/models`

```typescript
// GET /api/comfyui/models
export async function listModels(req: Request, res: Response) {
  try {
    const objectInfo = await fetch(`${COMFYUI_URL}/object_info`).then(r => r.json());
    
    // Extract model lists from various loaders
    const models = {
      checkpoints: extractModelList(objectInfo, 'CheckpointLoaderSimple', 'ckpt_name'),
      unet: extractModelList(objectInfo, 'UNETLoader', 'unet_name'),
      vae: extractModelList(objectInfo, 'VAELoader', 'vae_name'),
      loras: extractModelList(objectInfo, 'LoraLoader', 'lora_name'),
      clip: extractModelList(objectInfo, 'CLIPLoader', 'clip_name'),
      text_encoders: extractModelList(objectInfo, 'DualCLIPLoader', 'clip_name1'),
      controlnet: extractModelList(objectInfo, 'ControlNetLoader', 'control_net_name'),
      upscale: extractModelList(objectInfo, 'UpscaleModelLoader', 'model_name'),
      animatediff: extractModelList(objectInfo, 'ADE_LoadAnimateDiffModel', 'model_name')
    };
    
    res.json({
      success: true,
      data: models,
      summary: {
        total: Object.values(models).flat().length,
        by_category: Object.fromEntries(
          Object.entries(models).map(([k, v]) => [k, v.length])
        )
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

function extractModelList(objectInfo: any, loaderNode: string, inputName: string): string[] {
  try {
    return objectInfo[loaderNode]?.input?.required?.[inputName]?.[0] || [];
  } catch {
    return [];
  }
}
```

#### `/api/comfyui/models/:category`

```typescript
// GET /api/comfyui/models/:category
export async function listModelsByCategory(req: Request, res: Response) {
  const { category } = req.params;
  
  const categoryMap: Record<string, { loader: string; input: string; path: string }> = {
    checkpoints: { loader: 'CheckpointLoaderSimple', input: 'ckpt_name', path: 'models/checkpoints' },
    unet: { loader: 'UNETLoader', input: 'unet_name', path: 'models/unet' },
    vae: { loader: 'VAELoader', input: 'vae_name', path: 'models/vae' },
    loras: { loader: 'LoraLoader', input: 'lora_name', path: 'models/loras' },
    clip: { loader: 'CLIPLoader', input: 'clip_name', path: 'models/clip' },
    upscale: { loader: 'UpscaleModelLoader', input: 'model_name', path: 'models/upscale_models' },
    animatediff: { loader: 'ADE_LoadAnimateDiffModel', input: 'model_name', path: 'models/animatediff_models' }
  };
  
  const config = categoryMap[category];
  if (!config) {
    return res.status(400).json({ 
      success: false, 
      error: `Unknown category: ${category}`,
      valid_categories: Object.keys(categoryMap)
    });
  }
  
  try {
    const objectInfo = await fetch(`${COMFYUI_URL}/object_info/${config.loader}`).then(r => r.json());
    const models = objectInfo[config.loader]?.input?.required?.[config.input]?.[0] || [];
    
    res.json({
      success: true,
      data: {
        category,
        path: config.path,
        count: models.length,
        models: models.map((name: string) => ({
          name,
          filename: name
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### `/api/comfyui/nodes`

```typescript
// GET /api/comfyui/nodes
export async function listNodes(req: Request, res: Response) {
  try {
    const objectInfo = await fetch(`${COMFYUI_URL}/object_info`).then(r => r.json());
    
    const nodes = Object.entries(objectInfo).map(([name, def]: [string, any]) => ({
      name,
      display_name: def.display_name || name,
      category: def.category || 'uncategorized',
      description: def.description || '',
      input_count: Object.keys(def.input?.required || {}).length + 
                   Object.keys(def.input?.optional || {}).length,
      output_count: def.output?.length || 0
    }));
    
    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const node of nodes) {
      if (!byCategory[node.category]) {
        byCategory[node.category] = [];
      }
      byCategory[node.category].push(node);
    }
    
    res.json({
      success: true,
      data: {
        total: nodes.length,
        categories: Object.keys(byCategory).sort(),
        by_category: byCategory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/comfyui/nodes/search?q=sampler
export async function searchNodes(req: Request, res: Response) {
  const query = (req.query.q as string || '').toLowerCase();
  
  if (!query || query.length < 2) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query must be at least 2 characters' 
    });
  }
  
  try {
    const objectInfo = await fetch(`${COMFYUI_URL}/object_info`).then(r => r.json());
    
    const matches = Object.entries(objectInfo)
      .filter(([name, def]: [string, any]) => 
        name.toLowerCase().includes(query) ||
        (def.display_name || '').toLowerCase().includes(query) ||
        (def.category || '').toLowerCase().includes(query)
      )
      .map(([name, def]: [string, any]) => ({
        name,
        display_name: def.display_name || name,
        category: def.category || 'uncategorized'
      }));
    
    res.json({
      success: true,
      data: {
        query,
        count: matches.length,
        results: matches
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### `/api/comfyui/nodes/:name`

```typescript
// GET /api/comfyui/nodes/:name
export async function getNode(req: Request, res: Response) {
  const { name } = req.params;
  
  try {
    const response = await fetch(`${COMFYUI_URL}/object_info/${name}`);
    const data = await response.json();
    
    if (!data[name]) {
      return res.status(404).json({ 
        success: false, 
        error: `Node not found: ${name}` 
      });
    }
    
    const nodeDef = data[name];
    
    res.json({
      success: true,
      data: {
        name,
        display_name: nodeDef.display_name || name,
        category: nodeDef.category,
        description: nodeDef.description,
        python_module: nodeDef.python_module,
        is_output_node: nodeDef.output_node || false,
        inputs: {
          required: Object.entries(nodeDef.input?.required || {}).map(([k, v]: [string, any]) => ({
            name: k,
            type: Array.isArray(v[0]) ? 'enum' : v[0],
            options: Array.isArray(v[0]) ? v[0] : null,
            default: v[1]?.default,
            min: v[1]?.min,
            max: v[1]?.max
          })),
          optional: Object.entries(nodeDef.input?.optional || {}).map(([k, v]: [string, any]) => ({
            name: k,
            type: Array.isArray(v[0]) ? 'enum' : v[0],
            options: Array.isArray(v[0]) ? v[0] : null,
            default: v[1]?.default
          }))
        },
        outputs: nodeDef.output?.map((type: string, idx: number) => ({
          index: idx,
          type,
          name: nodeDef.output_name?.[idx] || type
        })) || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### `/api/comfyui/workflows/:id/validate`

```typescript
// POST /api/comfyui/workflows/:id/validate
export async function validateWorkflow(req: Request, res: Response) {
  const { id } = req.params;
  
  try {
    const db = getDb();
    const workflow = await db('comfyui_workflows').where('id', id).first();
    
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    const workflowJson = JSON.parse(workflow.workflow_json);
    const objectInfo = await fetch(`${COMFYUI_URL}/object_info`).then(r => r.json());
    
    const errors: any[] = [];
    const warnings: any[] = [];
    
    for (const [nodeId, node] of Object.entries(workflowJson) as [string, any][]) {
      const nodeDef = objectInfo[node.class_type];
      
      // Check node exists
      if (!nodeDef) {
        errors.push({
          node_id: nodeId,
          type: 'missing_node',
          message: `Unknown node type: ${node.class_type}`,
          suggestion: 'Install the required custom node'
        });
        continue;
      }
      
      // Check required inputs
      for (const inputName of Object.keys(nodeDef.input?.required || {})) {
        if (!(inputName in (node.inputs || {}))) {
          errors.push({
            node_id: nodeId,
            type: 'missing_input',
            message: `Missing required input: ${inputName}`
          });
        }
      }
      
      // Validate connections
      for (const [inputName, inputValue] of Object.entries(node.inputs || {})) {
        if (Array.isArray(inputValue)) {
          const [sourceNode, outputIndex] = inputValue;
          
          if (!(sourceNode in workflowJson)) {
            errors.push({
              node_id: nodeId,
              type: 'invalid_connection',
              message: `References non-existent node: ${sourceNode}`
            });
            continue;
          }
          
          // Type check
          const sourceNodeDef = objectInfo[workflowJson[sourceNode].class_type];
          if (sourceNodeDef) {
            const outputType = sourceNodeDef.output?.[outputIndex];
            const expectedTypes = nodeDef.input?.required?.[inputName]?.[0] || 
                                  nodeDef.input?.optional?.[inputName]?.[0];
            
            if (expectedTypes && outputType && 
                !Array.isArray(expectedTypes) && 
                outputType !== expectedTypes) {
              errors.push({
                node_id: nodeId,
                type: 'type_mismatch',
                message: `Type mismatch on ${inputName}: expected ${expectedTypes}, got ${outputType}`,
                suggestion: 'Check connection or use converter node'
              });
            }
          }
        }
      }
      
      // Validate model references
      const modelInputs = ['ckpt_name', 'model_name', 'unet_name', 'vae_name', 'lora_name'];
      for (const modelInput of modelInputs) {
        if (node.inputs?.[modelInput]) {
          const available = nodeDef.input?.required?.[modelInput]?.[0] || [];
          if (Array.isArray(available) && !available.includes(node.inputs[modelInput])) {
            errors.push({
              node_id: nodeId,
              type: 'missing_model',
              message: `Model not found: ${node.inputs[modelInput]}`,
              suggestion: `Available: ${available.slice(0, 3).join(', ')}${available.length > 3 ? '...' : ''}`
            });
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        valid: errors.length === 0,
        node_count: Object.keys(workflowJson).length,
        errors,
        warnings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### `/api/comfyui/generate`

```typescript
// POST /api/comfyui/generate
export async function generate(req: Request, res: Response) {
  const { workflow_id, prompt, negative_prompt, parameters } = req.body;
  
  try {
    const db = getDb();
    
    // Get workflow
    const workflow = await db('comfyui_workflows').where('id', workflow_id).first();
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    // Parse and modify workflow
    let workflowJson = JSON.parse(workflow.workflow_json);
    
    // Inject prompt into appropriate nodes
    workflowJson = injectPrompt(workflowJson, prompt, negative_prompt);
    
    // Apply parameters (seed, steps, cfg, etc.)
    workflowJson = applyParameters(workflowJson, parameters);
    
    // Submit to ComfyUI
    const response = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflowJson })
    });
    
    const result = await response.json();
    
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    // Store generation record
    const [generation] = await db('comfyui_generations').insert({
      workflow_id,
      prompt_id: result.prompt_id,
      prompt_text: prompt,
      negative_prompt,
      parameters: JSON.stringify(parameters),
      status: 'queued'
    }).returning('*');
    
    res.json({
      success: true,
      data: {
        generation_id: generation.id,
        prompt_id: result.prompt_id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

#### `/api/comfyui/outputs`

```typescript
// GET /api/comfyui/outputs
export async function listOutputs(req: Request, res: Response) {
  const { type, limit = 50, offset = 0 } = req.query;
  
  try {
    // List files from ComfyUI output directory
    const outputDir = '/home/tony/ComfyUI/output';
    const files = await fs.readdir(outputDir);
    
    let filteredFiles = files.filter(f => !f.startsWith('.'));
    
    // Filter by type
    if (type === 'image') {
      filteredFiles = filteredFiles.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
    } else if (type === 'video') {
      filteredFiles = filteredFiles.filter(f => /\.(mp4|webm|gif)$/i.test(f));
    } else if (type === 'mesh') {
      filteredFiles = filteredFiles.filter(f => /\.(obj|stl|glb|gltf)$/i.test(f));
    }
    
    // Get file stats
    const fileDetails = await Promise.all(
      filteredFiles.slice(Number(offset), Number(offset) + Number(limit)).map(async (filename) => {
        const filepath = path.join(outputDir, filename);
        const stats = await fs.stat(filepath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          type: getFileType(filename),
          url: `/api/comfyui/outputs/${filename}`
        };
      })
    );
    
    // Sort by modified date (newest first)
    fileDetails.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    
    res.json({
      success: true,
      data: {
        total: filteredFiles.length,
        offset: Number(offset),
        limit: Number(limit),
        files: fileDetails
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/comfyui/outputs/:filename/convert
export async function convertOutput(req: Request, res: Response) {
  const { filename } = req.params;
  const { target_format } = req.body;
  
  const outputDir = '/home/tony/ComfyUI/output';
  const inputPath = path.join(outputDir, filename);
  
  // Validate file exists
  if (!await fs.access(inputPath).then(() => true).catch(() => false)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }
  
  try {
    // OBJ to STL conversion
    if (filename.endsWith('.obj') && target_format === 'stl') {
      const outputFilename = filename.replace('.obj', '.stl');
      const outputPath = path.join(outputDir, outputFilename);
      
      // Use Python trimesh for conversion
      await execPromise(`
        /home/tony/ComfyUI/venv/bin/python -c "
import trimesh
mesh = trimesh.load('${inputPath}')
mesh.export('${outputPath}')
"
      `);
      
      return res.json({
        success: true,
        data: {
          original: filename,
          converted: outputFilename,
          url: `/api/comfyui/outputs/${outputFilename}`
        }
      });
    }
    
    res.status(400).json({ 
      success: false, 
      error: `Unsupported conversion: ${path.extname(filename)} to ${target_format}` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

### Routes Setup

```typescript
// routes/comfyui.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/comfyui-management.controller';

const router = Router();

// Health & Status
router.get('/health', ctrl.getHealth);
router.get('/status', ctrl.getStatus);
router.get('/queue', ctrl.getQueue);

// Models
router.get('/models', ctrl.listModels);
router.get('/models/:category', ctrl.listModelsByCategory);
router.post('/models/refresh', ctrl.refreshModels);

// Nodes
router.get('/nodes', ctrl.listNodes);
router.get('/nodes/search', ctrl.searchNodes);
router.get('/nodes/:name', ctrl.getNode);

// Workflows
router.get('/workflows', ctrl.listWorkflows);
router.post('/workflows', ctrl.createWorkflow);
router.get('/workflows/:id', ctrl.getWorkflow);
router.put('/workflows/:id', ctrl.updateWorkflow);
router.delete('/workflows/:id', ctrl.deleteWorkflow);
router.post('/workflows/:id/validate', ctrl.validateWorkflow);
router.post('/workflows/:id/execute', ctrl.executeWorkflow);

// Generation
router.post('/generate', ctrl.generate);
router.post('/generate/batch', ctrl.generateBatch);
router.get('/generate/:promptId', ctrl.getGenerationStatus);
router.get('/generate/:promptId/result', ctrl.getGenerationResult);
router.delete('/generate/:promptId', ctrl.cancelGeneration);

// Outputs
router.get('/outputs', ctrl.listOutputs);
router.get('/outputs/:filename', ctrl.downloadOutput);
router.delete('/outputs/:filename', ctrl.deleteOutput);
router.post('/outputs/:filename/convert', ctrl.convertOutput);

export default router;
```

---

## Part 4: Pipeline Status Script

### Enhanced Status Check Script

```bash
#!/bin/bash

# ==============================================
# ComfyUI Pipeline Status Check
# Enhanced with API verification
# ==============================================

COMFYUI_URL="${COMFYUI_URL:-http://localhost:8188}"
COMFYUI_PATH="${COMFYUI_PATH:-/home/tony/ComfyUI}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}ComfyUI Pipeline Status${NC} - $(date '+%Y-%m-%d %H:%M')"
echo "================================================"

# --------------------------------------------
# Connection Check
# --------------------------------------------
echo ""
echo -e "${YELLOW}Connection${NC}"

if curl -s --max-time 5 "$COMFYUI_URL" > /dev/null 2>&1; then
    echo -e "  ComfyUI API: ${GREEN}Connected${NC}"
    
    # Get system stats
    stats=$(curl -s "$COMFYUI_URL/system_stats" 2>/dev/null)
    if [ -n "$stats" ]; then
        gpu_name=$(echo "$stats" | jq -r '.devices[0].name // "Unknown"')
        vram_total=$(echo "$stats" | jq -r '.devices[0].vram_total // 0')
        vram_free=$(echo "$stats" | jq -r '.devices[0].vram_free // 0')
        vram_total_gb=$(echo "scale=1; $vram_total / 1073741824" | bc 2>/dev/null || echo "?")
        vram_free_gb=$(echo "scale=1; $vram_free / 1073741824" | bc 2>/dev/null || echo "?")
        echo "  GPU: $gpu_name"
        echo "  VRAM: ${vram_free_gb}GB free / ${vram_total_gb}GB total"
    fi
    
    # Queue status
    queue=$(curl -s "$COMFYUI_URL/queue" 2>/dev/null)
    if [ -n "$queue" ]; then
        pending=$(echo "$queue" | jq '.queue_pending | length')
        running=$(echo "$queue" | jq '.queue_running | length')
        echo "  Queue: $running running, $pending pending"
    fi
else
    echo -e "  ComfyUI API: ${RED}Not Connected${NC}"
    echo "  Check: sudo systemctl status comfyui"
fi

# --------------------------------------------
# Available Nodes Count
# --------------------------------------------
echo ""
echo -e "${YELLOW}Nodes${NC}"
node_count=$(curl -s "$COMFYUI_URL/object_info" 2>/dev/null | jq 'keys | length' 2>/dev/null || echo "0")
echo "  Available: $node_count nodes"

# Check critical nodes
check_node() {
    local node=$1
    local label=$2
    if curl -s "$COMFYUI_URL/object_info/$node" 2>/dev/null | jq -e ".$node" > /dev/null 2>&1; then
        echo -e "  $label: ${GREEN}✓${NC}"
    else
        echo -e "  $label: ${RED}✗${NC}"
    fi
}

check_node "CheckpointLoaderSimple" "SDXL Loader"
check_node "UNETLoader" "FLUX Loader"
check_node "ADE_LoadAnimateDiffModel" "AnimateDiff"
check_node "TripoSRModelLoader" "TripoSR"
check_node "UpscaleModelLoader" "Upscaler"

# --------------------------------------------
# Models Check via API
# --------------------------------------------
echo ""
echo -e "${YELLOW}Models (via API)${NC}"

check_models() {
    local loader=$1
    local input=$2
    local label=$3
    local models=$(curl -s "$COMFYUI_URL/object_info/$loader" 2>/dev/null | \
                   jq -r ".$loader.input.required.$input[0] // [] | length" 2>/dev/null || echo "0")
    echo "  $label: $models available"
}

check_models "CheckpointLoaderSimple" "ckpt_name" "Checkpoints"
check_models "UNETLoader" "unet_name" "UNet/FLUX"
check_models "VAELoader" "vae_name" "VAE"
check_models "LoraLoader" "lora_name" "LoRAs"
check_models "UpscaleModelLoader" "model_name" "Upscalers"
check_models "ADE_LoadAnimateDiffModel" "model_name" "AnimateDiff"

# --------------------------------------------
# Disk Usage
# --------------------------------------------
echo ""
echo -e "${YELLOW}Disk Usage${NC}"
echo "  Models: $(du -sh $COMFYUI_PATH/models 2>/dev/null | cut -f1)"
echo "  Output: $(du -sh $COMFYUI_PATH/output 2>/dev/null | cut -f1)"
echo "  Total: $(du -sh $COMFYUI_PATH 2>/dev/null | cut -f1)"

# --------------------------------------------
# Service Status
# --------------------------------------------
echo ""
echo -e "${YELLOW}Service${NC}"
if systemctl is-active --quiet comfyui 2>/dev/null; then
    echo -e "  Status: ${GREEN}Running${NC}"
    uptime=$(systemctl show comfyui --property=ActiveEnterTimestamp --value 2>/dev/null)
    echo "  Since: $uptime"
else
    echo -e "  Status: ${RED}Stopped${NC}"
fi

echo ""
echo "URL: $COMFYUI_URL"
echo ""
```

---

## Summary

This document provides:

1. **Workflow Debugging Methodology** - Step-by-step process for diagnosing ComfyUI workflow failures using the `/object_info` API

2. **Workflow Validation System** - Architecture for pre-validating workflows before submission

3. **Complete REST API Specification** - Endpoints for health, models, nodes, workflows, generation, and outputs

4. **Implementation Code** - TypeScript controllers ready to integrate into Spoon Feeder

5. **Enhanced Status Script** - Shell script that queries ComfyUI API for real-time status

The goal is to make ComfyUI manageable through Spoon Feeder's interface, abstracting away the complexity while maintaining full control over the generation pipeline.
