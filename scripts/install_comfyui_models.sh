#!/bin/bash

COMFYUI_PATH="/home/tony/ComfyUI"
cd "$COMFYUI_PATH"

echo "=== ComfyUI Asset Pipeline Setup ==="
echo ""

# ============================================
# SDXL (Recommended Base)
# ============================================
echo "[1/6] Installing SDXL..."
cd "$COMFYUI_PATH/models/checkpoints"

# SDXL Base
if [ ! -f "sd_xl_base_1.0.safetensors" ]; then
    wget -c "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
fi

# SDXL Refiner (optional, for extra detail)
# wget -c "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors"

# ============================================
# SDXL Lightning LoRA (Fast Generation)
# ============================================
echo "[2/6] Installing SDXL Lightning LoRA..."
cd "$COMFYUI_PATH/models/loras"

if [ ! -f "sdxl_lightning_4step_lora.safetensors" ]; then
    wget -c "https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step_lora.safetensors"
fi

# ============================================
# FLUX.1 Dev (Best Quality)
# ============================================
echo "[3/6] Installing FLUX.1 Dev..."

# FLUX requires Hugging Face login for gated model
# Run: huggingface-cli login
# Then download from: https://huggingface.co/black-forest-labs/FLUX.1-dev

cd "$COMFYUI_PATH/models/unet"
if [ ! -f "flux1-dev.safetensors" ]; then
    echo "  FLUX requires manual download (gated model)"
    echo "  1. Login: huggingface-cli login"
    echo "  2. Accept license at: https://huggingface.co/black-forest-labs/FLUX.1-dev"
    echo "  3. Download flux1-dev.safetensors to: $COMFYUI_PATH/models/unet/"
fi

# FLUX Text Encoders
cd "$COMFYUI_PATH/models/clip"
if [ ! -f "clip_l.safetensors" ]; then
    wget -c "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors"
fi

cd "$COMFYUI_PATH/models/text_encoders"
if [ ! -f "t5xxl_fp16.safetensors" ]; then
    wget -c "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors"
fi

# FLUX VAE
cd "$COMFYUI_PATH/models/vae"
if [ ! -f "flux_vae.safetensors" ]; then
    wget -c "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors" -O flux_vae.safetensors
fi

# ============================================
# Upscaler (Essential)
# ============================================
echo "[4/6] Installing Upscaler..."
cd "$COMFYUI_PATH/models/upscale_models"

if [ ! -f "RealESRGAN_x4plus.pth" ]; then
    wget -c "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
fi

if [ ! -f "4x-UltraSharp.pth" ]; then
    wget -c "https://huggingface.co/Kim2091/UltraSharp/resolve/main/4x-UltraSharp.pth"
fi

# ============================================
# Video Generation (AnimateDiff for SDXL)
# ============================================
echo "[5/6] Installing Video Models..."
mkdir -p "$COMFYUI_PATH/models/animatediff_models"
cd "$COMFYUI_PATH/models/animatediff_models"

if [ ! -f "v3_sd15_mm.ckpt" ]; then
    wget -c "https://huggingface.co/guoyww/animatediff/resolve/main/v3_sd15_mm.ckpt"
fi

# ============================================
# 2D to 3D (TripoSR)
# ============================================
echo "[6/6] Installing 2D→3D Models..."
mkdir -p "$COMFYUI_PATH/models/triposr"
cd "$COMFYUI_PATH/models/triposr"

if [ ! -f "model.safetensors" ]; then
    echo "  TripoSR model - download from:"
    echo "  https://huggingface.co/stabilityai/TripoSR/tree/main"
fi

echo ""
echo "=== Model Installation Complete ==="