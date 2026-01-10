#!/bin/bash

COMFYUI_PATH="/home/tony/ComfyUI"

echo "=== ComfyUI Cleanup ==="
echo ""

# Check for duplicates
echo "Checking for duplicate files..."
if cmp -s "$COMFYUI_PATH/models/diffusion_models/z_image_turbo_bf16.safetensors" \
         "$COMFYUI_PATH/models/unet/z_image_turbo_bf16.safetensors" 2>/dev/null; then
    echo "  - z_image_turbo_bf16.safetensors is duplicated (24GB wasted)"
    echo "    Recommend: Remove from unet/ folder"
fi

echo ""
echo "Files to consider removing:"
echo "  - z_image_turbo_bf16.safetensors (unknown turbo model)"
echo "  - qwen_3_4b.safetensors (only useful for Hunyuan)"
echo "  - v1-5-pruned-emaonly-fp16.safetensors (SD 1.5 is outdated)"
echo ""
echo "This would free up ~33GB"
echo ""

read -p "Remove these files? (y/N): " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    rm -f "$COMFYUI_PATH/models/diffusion_models/z_image_turbo_bf16.safetensors"
    rm -f "$COMFYUI_PATH/models/unet/z_image_turbo_bf16.safetensors"
    rm -f "$COMFYUI_PATH/models/text_encoders/qwen_3_4b.safetensors"
    rm -f "$COMFYUI_PATH/models/checkpoints/v1-5-pruned-emaonly-fp16.safetensors"
    echo "Cleaned up!"
else
    echo "Skipped cleanup"
fi