# ComfyUI Asset Pipeline & Spoon Feeder Integration

## Overview

This document details the setup of a comprehensive AI asset generation pipeline using ComfyUI, integrated with the Spoon Feeder content orchestration platform. The pipeline supports image generation, video creation, and 2D-to-3D model conversion for 3D printing workflows.

### Server Environment

| Component | Details |
|-----------|---------|
| **Host** | sonofkong |
| **GPU** | NVIDIA GeForce RTX 3090 (24GB VRAM) |
| **OS** | Ubuntu 24.04 |
| **Python** | 3.10.4 (via pyenv) |

### Services

| Service | URL | Purpose |
|---------|-----|---------|
| ComfyUI | http://sonofkong:8188 | Visual workflow editor & API |
| Ollama | http://sonofkong:11434 | Local LLM inference |
| Spoon Feeder | http://localhost:3001 | Content orchestration backend |

---

## Installation Summary

### 1. Ollama Configuration

Ollama was configured for remote access by binding to all network interfaces.

**Service File:** `/etc/systemd/system/ollama.service`

```ini
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=tony
Group=tony
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="OLLAMA_HOST=0.0.0.0"

[Install]
WantedBy=multi-user.target
```

**Key Change:** Added `Environment="OLLAMA_HOST=0.0.0.0"` to allow remote connections.

```bash
# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Verify listening on all interfaces
ss -tlnp | grep 11434
# Should show: *:11434
```

---

### 2. ComfyUI Configuration

**Installation Path:** `/home/tony/ComfyUI`  
**Service File:** `/etc/systemd/system/comfyui.service`

```ini
[Unit]
Description=ComfyUI Service
After=network-online.target

[Service]
Type=simple
User=tony
Group=tony
WorkingDirectory=/home/tony/ComfyUI
ExecStart=/home/tony/ComfyUI/venv/bin/python main.py --listen 0.0.0.0
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
```

**Key:** The `--listen 0.0.0.0` flag enables remote access.

---

### 3. Models Installed

#### Image Generation Models

| Model | Location | Size | Purpose |
|-------|----------|------|---------|
| SDXL Base 1.0 | `models/checkpoints/sd_xl_base_1.0.safetensors` | 6.9GB | High-quality image generation |
| SDXL Lightning LoRA | `models/loras/sdxl_lightning_4step_lora.safetensors` | 400MB | Fast 4-step generation |
| FLUX.1 Dev | `models/unet/flux1-dev.safetensors` | 12GB | Best quality images |
| FLUX.1 Schnell | `models/unet/flux1-schnell.safetensors` | 12GB | Fast FLUX generation |
| SDXL VAE | `models/vae/sdxl_vae.safetensors` | 320MB | SDXL decoder |
| FLUX VAE | `models/vae/ae.safetensors` | 320MB | FLUX decoder |

#### FLUX Text Encoders

| Model | Location | Size |
|-------|----------|------|
| T5-XXL | `models/text_encoders/t5xxl_fp16.safetensors` | 9.2GB |
| CLIP-L | `models/clip/clip_l.safetensors` | 250MB |

#### Video Generation Models

| Model | Location | Size | Purpose |
|-------|----------|------|---------|
| AnimateDiff v3 (SD1.5) | `models/animatediff_models/v3_sd15_mm.ckpt` | 1.6GB | SD1.5 video |
| AnimateDiff SDXL | `models/animatediff_models/mm_sdxl_v10_beta.ckpt` | 950MB | SDXL video |

#### 2D to 3D Models

| Model | Location | Size | Purpose |
|-------|----------|------|---------|
| TripoSR | `models/checkpoints/model.ckpt` | ~1GB | Image to 3D mesh |

#### Upscale Models

| Model | Location | Size |
|-------|----------|------|
| RealESRGAN 4x | `models/upscale_models/RealESRGAN_x4plus.pth` | 64MB |
| UltraSharp 4x | `models/upscale_models/4x-UltraSharp.pth` | 64MB |

---

### 4. Model Installation Process

#### HuggingFace Authentication

FLUX models require HuggingFace authentication:

```bash
# Create and activate Python venv
cd ~/dev/lmspoonfeeder
python3 -m venv venv
source venv/bin/activate

# Install huggingface_hub
pip install huggingface_hub

# Login (get token from https://huggingface.co/settings/tokens)
python -c "from huggingface_hub import login; login()"

# Accept licenses at:
# - https://huggingface.co/black-forest-labs/FLUX.1-dev
# - https://huggingface.co/black-forest-labs/FLUX.1-schnell

# Download models
python -c "
from huggingface_hub import hf_hub_download
hf_hub_download('black-forest-labs/FLUX.1-dev', 'flux1-dev.safetensors', 
                local_dir='/home/tony/ComfyUI/models/unet/')
hf_hub_download('black-forest-labs/FLUX.1-schnell', 'flux1-schnell.safetensors', 
                local_dir='/home/tony/ComfyUI/models/unet/')
"
```

#### Standard Model Downloads

```bash
cd /home/tony/ComfyUI/models/checkpoints
wget "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"

cd /home/tony/ComfyUI/models/loras
wget "https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step_lora.safetensors"

cd /home/tony/ComfyUI/models/upscale_models
wget "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
```

---

### 5. Custom Nodes Installed

Custom nodes extend ComfyUI's functionality:

| Node | Purpose | Repository |
|------|---------|------------|
| ComfyUI-Manager | Node management UI | ltdrdata/ComfyUI-Manager |
| Impact-Pack | Essential utilities | ltdrdata/ComfyUI-Impact-Pack |
| Custom-Scripts | Quality of life | pythongosssss/ComfyUI-Custom-Scripts |
| rgthree-comfy | Advanced nodes | rgthree/rgthree-comfy |
| IPAdapter-plus | Style transfer | cubiq/ComfyUI_IPAdapter_plus |
| ControlNet-aux | Pose/depth detection | Fannovel16/comfyui_controlnet_aux |
| UltimateSDUpscale | Tiled upscaling | ssitu/ComfyUI_UltimateSDUpscale |
| AnimateDiff-Evolved | Video generation | Kosinkadink/ComfyUI-AnimateDiff-Evolved |
| VideoHelperSuite | Video export | Kosinkadink/ComfyUI-VideoHelperSuite |
| Flowty-TripoSR | 2D to 3D | flowtyone/ComfyUI-Flowty-TripoSR |
| ComfyUI-GGUF | GGUF model support | city96/ComfyUI-GGUF |

**Installation:**

```bash
cd /home/tony/ComfyUI/custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Impact-Pack
# ... repeat for each node

# Install Python dependencies
/home/tony/ComfyUI/venv/bin/python -m pip install trimesh PyMCubes opencv-python-headless gguf matplotlib omegaconf scikit-image

sudo systemctl restart comfyui
```

---

## How ComfyUI Workflows Work

### Concept

ComfyUI uses a **node-based workflow** system where:
- Each **node** performs a specific operation (load model, encode text, sample, decode, etc.)
- **Connections** between nodes define data flow
- The entire workflow is stored as **JSON**

### Workflow JSON Structure

```json
{
  "node_id": {
    "class_type": "NodeClassName",
    "inputs": {
      "parameter": "value",
      "connection": ["source_node_id", output_index]
    }
  }
}
```

**Example - Simple Image Generation:**

```json
{
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "sd_xl_base_1.0.safetensors"
    }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "clip": ["1", 1],
      "text": "a beautiful sunset"
    }
  },
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "model": ["1", 0],
      "positive": ["2", 0],
      "seed": 42,
      "steps": 20
    }
  }
}
```

### Node Connections

Connections use the format `["node_id", output_index]`:
- `["1", 0]` = First output of node 1 (typically MODEL)
- `["1", 1]` = Second output of node 1 (typically CLIP)
- `["1", 2]` = Third output of node 1 (typically VAE)

### ComfyUI REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/prompt` | POST | Queue a workflow for execution |
| `/queue` | GET | View queue status |
| `/history` | GET | Get generation history |
| `/history/{prompt_id}` | GET | Get specific job result |
| `/view?filename=X` | GET | Download output image/video |
| `/upload/image` | POST | Upload input image |
| `/object_info` | GET | List available nodes |
| `/object_info/{node}` | GET | Get node parameters |

**Example - Queue a Workflow:**

```bash
curl -X POST http://sonofkong:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": <WORKFLOW_JSON>}'
```

**Response:**
```json
{
  "prompt_id": "abc123-def456-...",
  "number": 1,
  "node_errors": {}
}
```

### WebSocket for Real-Time Updates

```javascript
const ws = new WebSocket('ws://sonofkong:8188/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'executing':
      console.log(`Executing node: ${data.data.node}`);
      break;
    case 'progress':
      console.log(`Progress: ${data.data.value}/${data.data.max}`);
      break;
    case 'executed':
      console.log('Complete!', data.data.output);
      break;
  }
};
```

---

## Asset Pipelines

### 1. SDXL Lightning (Fast Image Generation)

**Speed:** ~2-3 seconds  
**Quality:** Great  
**Use Case:** Quick iterations, drafts

**Key Parameters:**
- Steps: 4 (Lightning optimized)
- CFG: 1.5 (low for Lightning)
- Sampler: euler
- Scheduler: sgm_uniform

### 2. FLUX Dev (Best Quality Images)

**Speed:** ~8-15 seconds  
**Quality:** Excellent  
**Use Case:** Final production images

**Key Parameters:**
- Steps: 20-30
- CFG: 3.5
- Sampler: euler
- Scheduler: simple

### 3. AnimateDiff (Video Generation)

**Speed:** ~30-60 seconds for 16 frames  
**Quality:** Good  
**Use Case:** Short video clips, animations

**Key Parameters:**
- Frames: 16 (batch_size)
- Steps: 20
- CFG: 7.0
- FPS: 8

### 4. TripoSR (2D to 3D)

**Speed:** ~10 seconds  
**Quality:** Good for simple objects  
**Use Case:** 3D printing, game assets

**Output:** OBJ mesh file (convertible to STL)

**STL Conversion:**
```bash
/home/tony/ComfyUI/venv/bin/python -c "
import trimesh
mesh = trimesh.load('/home/tony/ComfyUI/output/meshsave_00001_.obj')
mesh.export('/home/tony/ComfyUI/output/model.stl')
"
```

### 5. Upscale (Image Enhancement)

**Speed:** ~2-5 seconds  
**Scale:** 4x resolution  
**Models:** RealESRGAN, UltraSharp

---

## Spoon Feeder Integration

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Spoon Feeder                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   React     │  │   Express   │  │     PostgreSQL      │ │
│  │  Frontend   │◄─┤   Backend   │◄─┤  (Tasks, Workflows) │ │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘ │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │       ComfyUI          │
              │   http://sonofkong:8188│
              │  ┌──────────────────┐  │
              │  │ Workflow Engine  │  │
              │  └────────┬─────────┘  │
              │           │            │
              │  ┌────────▼─────────┐  │
              │  │   GPU (RTX 3090) │  │
              │  └──────────────────┘  │
              └────────────────────────┘
```

### How Spoon Feeder Improves ComfyUI UX

#### Problem: ComfyUI's Complexity

ComfyUI is powerful but presents challenges:

1. **Steep Learning Curve** - Node-based interface requires understanding connections
2. **No Prompt History** - Difficult to track what prompts generated what images
3. **Manual Workflow Management** - JSON files must be managed manually
4. **No Batch Processing UI** - Running variations requires manual seed changes
5. **No Asset Organization** - Generated files have cryptic names
6. **Complex Parameter Tuning** - Requires knowledge of samplers, schedulers, CFG

#### Solution: Spoon Feeder Abstraction Layer

**1. Simplified Prompt Interface**

Instead of building node graphs, users type prompts:

```
User: "Create a cyberpunk cityscape at sunset"

Spoon Feeder:
  → Selects appropriate workflow (FLUX for quality)
  → Injects prompt into workflow JSON
  → Submits to ComfyUI
  → Tracks job status
  → Organizes output with metadata
```

**2. Placeholder-Based Asset Generation**

Technical authors write content with placeholders:

```markdown
# Chapter 5: The Future City

The megalopolis stretched toward the horizon...

{{IMAGE: cyberpunk cityscape, neon lights, flying cars, sunset}}

The streets below were alive with...

{{IMAGE: crowded street market, holographic signs, rain}}
```

Spoon Feeder:
1. Parses placeholders from document
2. Generates images for each via ComfyUI
3. Replaces placeholders with generated assets
4. Exports final document

**3. Project-Based Organization**

```
Project: "Sci-Fi Novel Assets"
├── Chapter 1/
│   ├── hero_portrait.png (FLUX, seed: 12345)
│   ├── spaceship_exterior.png (SDXL, seed: 67890)
│   └── alien_landscape.png (FLUX, seed: 11111)
├── Chapter 2/
│   └── ...
└── 3D Models/
    ├── alien_artifact.stl (TripoSR)
    └── hero_weapon.stl (TripoSR)
```

**4. Smart Workflow Selection**

| User Intent | Selected Pipeline | Reason |
|-------------|------------------|--------|
| "quick draft" | SDXL Lightning | Speed priority |
| "final image" | FLUX Dev | Quality priority |
| "animate this" | AnimateDiff | Motion requested |
| "make 3D printable" | TripoSR | 3D output needed |
| "enhance resolution" | RealESRGAN | Upscale detected |

**5. Batch Generation UI**

```javascript
// Generate 4 variations
POST /api/comfyui/batch
{
  "workflow": "flux_dev",
  "prompt": "a majestic dragon",
  "variations": 4,
  "seed_mode": "random"
}

// Returns
{
  "batch_id": "batch_123",
  "jobs": [
    { "id": "job_1", "seed": 98765 },
    { "id": "job_2", "seed": 43210 },
    { "id": "job_3", "seed": 11111 },
    { "id": "job_4", "seed": 22222 }
  ]
}
```

**6. Real-Time Progress Dashboard**

```
┌─────────────────────────────────────────────────┐
│  Generation Queue                               │
├─────────────────────────────────────────────────┤
│  ✅ cyberpunk city     FLUX    12s    Complete  │
│  🔄 dragon portrait    FLUX    ████░░  67%      │
│  ⏳ forest scene       SDXL    Queued           │
│  ⏳ character design   SDXL    Queued           │
└─────────────────────────────────────────────────┘
```

**7. Unified History & Search**

```sql
-- Find all dragon images from last week
SELECT * FROM generations
WHERE prompt LIKE '%dragon%'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**8. One-Click 3D Print Pipeline**

```
1. Upload reference image
2. Click "Generate 3D Model"
3. Preview mesh in browser
4. Click "Download STL"
5. Send to slicer software
```

### API Integration Points

Spoon Feeder's backend (`comfyui.controller.ts`) already implements:

| Feature | Status |
|---------|--------|
| Session management | ✅ Implemented |
| Workflow storage (DB) | ✅ Implemented |
| Parameter injection | ✅ Implemented |
| Generation tracking | ✅ Implemented |
| Image proxy endpoint | ✅ Implemented |
| WebSocket status | 🚧 Partial |
| Batch execution | ❌ Not yet |
| Placeholder parsing | ❌ Not yet |

### Recommended Next Steps

1. **Placeholder Parser** - Extract `{{TYPE: description}}` from text
2. **Batch API** - Queue multiple jobs with variations
3. **Project Containers** - Link related assets together
4. **STL Auto-Export** - Convert OBJ to STL automatically
5. **Document Assembly** - Combine text + images into exports

---

## Utility Scripts

### Pipeline Status Check

**Location:** `~/comfyui_status.sh`

```bash
#!/bin/bash
# Checks all pipeline components and reports status
./comfyui_status.sh
```

### OBJ to STL Conversion

**Location:** `~/convert_obj_to_stl.sh`

```bash
#!/bin/bash
LATEST_OBJ=$(ls -t /home/tony/ComfyUI/output/*.obj | head -1)
STL_FILE="${LATEST_OBJ%.obj}.stl"
/home/tony/ComfyUI/venv/bin/python -c "
import trimesh
mesh = trimesh.load('$LATEST_OBJ')
mesh.export('$STL_FILE')
"
```

---

## Quick Reference Commands

```bash
# Check pipeline status
~/comfyui_status.sh

# Restart ComfyUI
sudo systemctl restart comfyui

# View ComfyUI logs
sudo journalctl -u comfyui -n 50 --no-pager

# Check for import failures
sudo journalctl -u comfyui -n 100 --no-pager | grep "IMPORT FAILED"

# Restart Ollama
sudo systemctl restart ollama

# Convert latest OBJ to STL
~/convert_obj_to_stl.sh

# Activate Spoon Feeder venv
source ~/dev/lmspoonfeeder/venv/bin/activate

# Test ComfyUI API
curl http://sonofkong:8188/object_info | jq 'keys | length'

# Test Ollama API
curl http://sonofkong:11434/api/tags
```

---

## Troubleshooting

### ComfyUI Won't Start

```bash
sudo journalctl -u comfyui -n 100 --no-pager
```

### Missing Python Modules

```bash
/home/tony/ComfyUI/venv/bin/python -m pip install <module_name>
sudo systemctl restart comfyui
```

### Model Not Found

Check the model is in the correct folder:
```bash
curl -s http://sonofkong:8188/object_info/<NodeName> | jq
```

### Out of VRAM

- Reduce image resolution (768x768 instead of 1024x1024)
- Reduce batch_size for video
- Use SDXL instead of FLUX

---

## File Locations

| Item | Path |
|------|------|
| ComfyUI | `/home/tony/ComfyUI/` |
| Models | `/home/tony/ComfyUI/models/` |
| Custom Nodes | `/home/tony/ComfyUI/custom_nodes/` |
| Output | `/home/tony/ComfyUI/output/` |
| Workflows | `/home/tony/ComfyUI/user/default/workflows/` |
| Spoon Feeder | `~/dev/lmspoonfeeder/` |
| Status Script | `~/comfyui_status.sh` |

---

## Version Information

| Component | Version |
|-----------|---------|
| ComfyUI | v0.4.0 |
| Python | 3.10.4 |
| CUDA | (RTX 3090 compatible) |
| Node.js | 20+ |

---

*Last Updated: January 10, 2026*
