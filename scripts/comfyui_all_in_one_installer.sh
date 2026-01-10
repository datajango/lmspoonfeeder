#!/bin/bash

# ==============================================
# ComfyUI Complete Asset Pipeline Setup
# For RTX 3090 24GB
# ==============================================

COMFYUI_PATH="/home/tony/ComfyUI"

echo "=============================================="
echo "ComfyUI Asset Pipeline Setup - RTX 3090"
echo "=============================================="
echo ""
echo "This will:"
echo "  1. Clean up old/unused models (~33GB freed)"
echo "  2. Install SDXL + Lightning (~7GB)"
echo "  3. Install FLUX.1 Dev (~24GB)"
echo "  4. Install Video models (~3GB)"
echo "  5. Install 2D→3D models (~2GB)"
echo "  6. Install Upscalers (~500MB)"
echo "  7. Install Custom Nodes"
echo ""
echo "Total download: ~35GB"
echo ""
read -p "Continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 0
fi

# ==============================================
# PHASE 1: CLEANUP
# ==============================================
echo ""
echo "[PHASE 1] Cleaning up old models..."

rm -f "$COMFYUI_PATH/models/diffusion_models/z_image_turbo_bf16.safetensors"
rm -f "$COMFYUI_PATH/models/unet/z_image_turbo_bf16.safetensors"
rm -f "$COMFYUI_PATH/models/text_encoders/qwen_3_4b.safetensors"
rm -f "$COMFYUI_PATH/models/checkpoints/v1-5-pruned-emaonly-fp16.safetensors"

# Remove placeholder files
find "$COMFYUI_PATH/models" -name "put_*_here" -delete 2>/dev/null

echo "  Cleanup complete!"

# ==============================================
# PHASE 2: SDXL
# ==============================================
echo ""
echo "[PHASE 2] Installing SDXL Base..."

cd "$COMFYUI_PATH/models/checkpoints"

if [ ! -f "sd_xl_base_1.0.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
else
    echo "  SDXL Base already installed"
fi

# SDXL VAE (better than default)
cd "$COMFYUI_PATH/models/vae"
if [ ! -f "sdxl_vae.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors"
else
    echo "  SDXL VAE already installed"
fi

# ==============================================
# PHASE 3: SDXL Lightning (Fast Mode)
# ==============================================
echo ""
echo "[PHASE 3] Installing SDXL Lightning LoRA..."

cd "$COMFYUI_PATH/models/loras"

if [ ! -f "sdxl_lightning_4step_lora.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step_lora.safetensors"
else
    echo "  SDXL Lightning already installed"
fi

# ==============================================
# PHASE 4: FLUX.1
# ==============================================
echo ""
echo "[PHASE 4] Installing FLUX.1 components..."

# FLUX CLIP
cd "$COMFYUI_PATH/models/clip"
if [ ! -f "clip_l.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors"
else
    echo "  FLUX CLIP already installed"
fi

# FLUX T5 Text Encoder
cd "$COMFYUI_PATH/models/text_encoders"
if [ ! -f "t5xxl_fp16.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors"
else
    echo "  FLUX T5 already installed"
fi

# FLUX VAE (you already have ae.safetensors which is correct)
cd "$COMFYUI_PATH/models/vae"
if [ ! -f "ae.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors"
else
    echo "  FLUX VAE already installed"
fi

# FLUX Model - Schnell (Apache 2.0, no login required)
cd "$COMFYUI_PATH/models/unet"
if [ ! -f "flux1-schnell.safetensors" ]; then
    echo "  Downloading FLUX.1 Schnell (fast, open license)..."
    wget -c --show-progress "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors"
else
    echo "  FLUX Schnell already installed"
fi

# ==============================================
# PHASE 5: Upscalers
# ==============================================
echo ""
echo "[PHASE 5] Installing Upscalers..."

cd "$COMFYUI_PATH/models/upscale_models"

if [ ! -f "RealESRGAN_x4plus.pth" ]; then
    wget -c --show-progress "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
else
    echo "  RealESRGAN already installed"
fi

if [ ! -f "4x-UltraSharp.pth" ]; then
    wget -c --show-progress "https://huggingface.co/Kim2091/UltraSharp/resolve/main/4x-UltraSharp.pth"
else
    echo "  UltraSharp already installed"
fi

# ==============================================
# PHASE 6: Video Generation (AnimateDiff)
# ==============================================
echo ""
echo "[PHASE 6] Installing Video Models..."

mkdir -p "$COMFYUI_PATH/models/animatediff_models"
cd "$COMFYUI_PATH/models/animatediff_models"

if [ ! -f "v3_sd15_mm.ckpt" ]; then
    wget -c --show-progress "https://huggingface.co/guoyww/animatediff/resolve/main/v3_sd15_mm.ckpt"
else
    echo "  AnimateDiff v3 already installed"
fi

# AnimateDiff SDXL
mkdir -p "$COMFYUI_PATH/models/animatediff_motion_lora"
cd "$COMFYUI_PATH/models/animatediff_models"

if [ ! -f "mm_sdxl_v10_beta.ckpt" ]; then
    wget -c --show-progress "https://huggingface.co/guoyww/animatediff/resolve/main/mm_sdxl_v10_beta.ckpt"
else
    echo "  AnimateDiff SDXL already installed"
fi

# ==============================================
# PHASE 7: 2D to 3D (TripoSR)
# ==============================================
echo ""
echo "[PHASE 7] Installing 2D→3D Models..."

mkdir -p "$COMFYUI_PATH/models/triposr"
cd "$COMFYUI_PATH/models/triposr"

if [ ! -f "model.safetensors" ]; then
    wget -c --show-progress "https://huggingface.co/stabilityai/TripoSR/resolve/main/model.safetensors"
else
    echo "  TripoSR already installed"
fi

# ==============================================
# PHASE 8: Custom Nodes
# ==============================================
echo ""
echo "[PHASE 8] Installing Custom Nodes..."

cd "$COMFYUI_PATH/custom_nodes"

install_node() {
    local repo=$1
    local name=$(basename "$repo" .git)
    if [ ! -d "$name" ]; then
        echo "  Installing $name..."
        git clone --depth 1 "$repo" 2>/dev/null
    else
        echo "  $name already installed"
    fi
}

# Essential
install_node "https://github.com/ltdrdata/ComfyUI-Impact-Pack"
install_node "https://github.com/pythongosssss/ComfyUI-Custom-Scripts"
install_node "https://github.com/rgthree/rgthree-comfy"

# Image Enhancement
install_node "https://github.com/cubiq/ComfyUI_IPAdapter_plus"
install_node "https://github.com/Fannovel16/comfyui_controlnet_aux"
install_node "https://github.com/ssitu/ComfyUI_UltimateSDUpscale"

# Video Generation
install_node "https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved"
install_node "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite"

# 2D to 3D
install_node "https://github.com/flowtyone/ComfyUI-Flowty-TripoSR"

# FLUX optimizations
install_node "https://github.com/city96/ComfyUI-GGUF"

# ==============================================
# PHASE 9: Restart ComfyUI
# ==============================================
echo ""
echo "[PHASE 9] Restarting ComfyUI..."

sudo systemctl restart comfyui

# ==============================================
# DONE
# ==============================================
echo ""
echo "=============================================="
echo "INSTALLATION COMPLETE!"
echo "=============================================="
echo ""
echo "Installed Models:"
echo "  ✓ SDXL Base 1.0 (image gen)"
echo "  ✓ SDXL Lightning LoRA (fast image gen)"
echo "  ✓ FLUX.1 Schnell (best quality images)"
echo "  ✓ AnimateDiff v3 + SDXL (video gen)"
echo "  ✓ TripoSR (2D→3D)"
echo "  ✓ RealESRGAN + UltraSharp (upscaling)"
echo ""
echo "Installed Custom Nodes:"
echo "  ✓ Impact-Pack (essential utilities)"
echo "  ✓ Custom-Scripts (quality of life)"
echo "  ✓ AnimateDiff-Evolved (video)"
echo "  ✓ VideoHelperSuite (video export)"
echo "  ✓ Flowty-TripoSR (3D generation)"
echo "  ✓ IPAdapter (style transfer)"
echo "  ✓ ControlNet-aux (pose/depth detection)"
echo "  ✓ UltimateSDUpscale (tiled upscaling)"
echo ""
echo "Access ComfyUI at: http://sonofkong:8188"
echo ""
echo "Optional: For FLUX.1 Dev (better than Schnell):"
echo "  1. Run: pip install huggingface_hub"
echo "  2. Run: huggingface-cli login"
echo "  3. Accept license: https://huggingface.co/black-forest-labs/FLUX.1-dev"
echo "  4. Download flux1-dev.safetensors to $COMFYUI_PATH/models/unet/"
echo ""