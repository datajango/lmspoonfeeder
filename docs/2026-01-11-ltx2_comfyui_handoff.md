# LTX-2 ComfyUI Session Handoff

## Server Details
- **Host**: sonofkong
- **GPU**: NVIDIA RTX 3090 (24GB VRAM)
- **ComfyUI URL**: http://sonofkong:8188
- **ComfyUI Path**: ~/ComfyUI
- **Python venv**: ~/ComfyUI/venv/

---

## 1. Editing ComfyUI Server Options

### View current configuration
```bash
sudo systemctl cat comfyui | grep ExecStart
```

### Edit service file
```bash
sudo systemctl edit comfyui --full
```

Find the `ExecStart` line and modify:
```ini
# Default
ExecStart=/home/tony/ComfyUI/venv/bin/python main.py --listen 0.0.0.0

# With lowvram (aggressive CPU offloading - helps with OOM)
ExecStart=/home/tony/ComfyUI/venv/bin/python main.py --listen 0.0.0.0 --lowvram

# Other useful flags:
#   --lowvram       Aggressive offloading to CPU RAM
#   --novram        Maximum offloading (very slow)
#   --cpu           Run entirely on CPU
#   --disable-cuda-malloc  Use default PyTorch allocator
```

### Apply changes
```bash
sudo systemctl daemon-reload
sudo systemctl restart comfyui
```

### Check service status
```bash
sudo systemctl status comfyui
```

---

## 2. Monitoring ComfyUI

### GPU Monitoring
```bash
# Real-time GPU stats (VRAM, utilization, temp)
watch -n 1 nvidia-smi

# Compact CSV format
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv -l 1
```

### ComfyUI Logs
```bash
# Live log stream (follow mode)
sudo journalctl -u comfyui -f

# Last 100 lines
sudo journalctl -u comfyui -n 100 --no-pager

# Search for errors
sudo journalctl -u comfyui -n 500 | grep -i error
```

### What to watch for in logs
| Log Message | Meaning |
|-------------|---------|
| `loaded completely` | Model fully in VRAM |
| `loaded partially; X MB loaded, Y MB offloaded` | Model split between GPU/CPU (lowvram working) |
| `load device: cpu` | Text encoder on CPU (saves VRAM) |
| `got prompt` | Workflow execution started |
| `50%\|█████     \| 10/20` | Sampling progress |
| `Prompt executed in X seconds` | Generation complete |
| `OOM, unloading all loaded models` | Out of memory - will retry |

### Dual monitoring (two terminals)
```bash
# Terminal 1: GPU
watch -n 1 nvidia-smi

# Terminal 2: Logs
sudo journalctl -u comfyui -f
```

---

## 3. How ComfyUI Works

### Core Concept: Node-Based Workflows
ComfyUI is a visual node editor where each node performs one operation. Data flows through links connecting outputs to inputs.

### Common Node Types
| Node Type | Purpose | Example |
|-----------|---------|---------|
| **Loaders** | Load models into memory | CheckpointLoader, LTXVGemmaCLIPModelLoader |
| **Encoders** | Convert text to embeddings | CLIPTextEncode |
| **Latent Generators** | Create empty latent space | EmptyLTXVLatentVideo |
| **Samplers** | Run diffusion process | KSampler |
| **Decoders** | Convert latent to pixels | VAEDecode |
| **Output** | Save results | VHS_VideoCombine |

### Basic Pipeline Flow
```
[Load Checkpoint] ──→ [KSampler] ──→ [VAEDecode] ──→ [Save Video]
                          ↑
[Load Text Encoder] → [CLIPTextEncode (positive)]
                    → [CLIPTextEncode (negative)]
                          ↑
              [EmptyLTXVLatentVideo]
```

### Execution Process
1. Click "Queue Prompt" in UI
2. ComfyUI analyzes graph for dependency order
3. Nodes execute left-to-right, loaders first
4. Outputs are cached - unchanged nodes skip re-execution
5. Models load/unload from VRAM as needed

### Workflow JSON Structure
```json
{
  "nodes": [...],           // Node definitions with positions, types, settings
  "links": [...],           // Connections: [link_id, from_node, from_slot, to_node, to_slot, type]
  "widgets_values": [...]   // User-configurable settings per node
}
```

### VRAM Management
LTX-2 workflow requires:
- LTX-2 FP4 model: ~10GB
- Gemma 12B text encoder: ~12GB
- VAE: ~2GB
- Working memory: ~2GB

Total: ~26GB on a 24GB card → requires offloading with `--lowvram`

---

## 4. Workflows Created

### Location
Workflows saved in: `~/ComfyUI/user/default/workflows/`
Also available at: `/mnt/user-data/outputs/` (download copies)

### ltx2_lowvram.json
**Purpose**: Basic LTX-2 text-to-video generation optimized for 24GB VRAM

**Nodes**:
1. `LowVRAMCheckpointLoader` → Loads ltx-2-19b-dev-fp4.safetensors
2. `LTXVGemmaCLIPModelLoader` → Loads Gemma 3 12B text encoder
3. `CLIPTextEncode` (positive) → Your video prompt
4. `CLIPTextEncode` (negative) → What to avoid
5. `EmptyLTXVLatentVideo` → Sets resolution and frame count
6. `KSampler` → Diffusion sampling
7. `VAEDecode` → Decode to images
8. `VHS_VideoCombine` → Encode to MP4

**Key Settings in EmptyLTXVLatentVideo**:
| Setting | Current | Notes |
|---------|---------|-------|
| width | 384 | Increase for higher res |
| height | 256 | Keep 16:9 or 3:2 ratio |
| length | 25 | Frame count (÷24 = seconds) |
| batch_size | 1 | Keep at 1 |

**Frame count reference**:
| Frames | Duration @ 24fps |
|--------|------------------|
| 25 | 1.0 sec |
| 41 | 1.7 sec |
| 65 | 2.7 sec |
| 97 | 4.0 sec |

**How to use**:
1. Load workflow in ComfyUI (drag JSON or File → Load)
2. Edit positive prompt in CLIPTextEncode node
3. Adjust frame count in EmptyLTXVLatentVideo if desired
4. Click "Queue Prompt"
5. Output saved to: `~/ComfyUI/output/LTX2_*.mp4`

---

## 5. Models Installed

### Checkpoints (~/ComfyUI/models/checkpoints/)
- `ltx-2-19b-dev-fp4.safetensors` (20GB) - FP4 quantized LTX-2

### Text Encoders (~/ComfyUI/models/text_encoders/)
- `gemma-3-12b-it-qat-q4_0-unquantized/` (~12GB) - Required for LTX-2
- `t5xxl_fp16.safetensors` - NOT compatible with LTX-2

### Upscalers (~/ComfyUI/models/checkpoints/ - should move to upscale_models/)
- `ltx-2-spatial-upscaler-x2-1.0.safetensors`
- `ltx-2-temporal-upscaler-x2-1.0.safetensors`

---

## 6. Quick Reference Commands

```bash
# Restart ComfyUI
sudo systemctl restart comfyui

# Check status
sudo systemctl status comfyui

# View logs
sudo journalctl -u comfyui -f

# Monitor GPU
watch -n 1 nvidia-smi

# List output videos
ls -la ~/ComfyUI/output/LTX2*.mp4

# Play video (if ffplay installed)
ffplay ~/ComfyUI/output/LTX2_00001.mp4

# Copy video to local machine (run from local)
scp tony@sonofkong:~/ComfyUI/output/LTX2_00001.mp4 ~/Downloads/
```

---

## 7. Troubleshooting

### OOM Errors
1. Restart ComfyUI to clear memory: `sudo systemctl restart comfyui`
2. Add `--lowvram` flag to service
3. Reduce frame count or resolution
4. Check nothing else is using GPU: `nvidia-smi`

### Missing Nodes Error
Check custom nodes loaded properly:
```bash
sudo journalctl -u comfyui -n 100 | grep "IMPORT FAILED"
```

### Workflow Validation Errors
Check available models via API:
```bash
curl -s http://localhost:8188/object_info | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('NODE_NAME', {}), indent=2))"
```

---

## 8. Next Steps / Future Improvements

- [ ] Test higher resolutions (512×320, 768×480)
- [ ] Test longer videos (65+ frames)
- [ ] Move upscalers to correct directory
- [ ] Create image-to-video workflow with `LTXVImgToVideoAdvanced`
- [ ] Fix Impact-Pack dependency (needs `segment_anything`)
- [ ] Fix RES4LYF dependency (needs `pywt`)
