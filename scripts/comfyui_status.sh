#!/bin/bash

# ComfyUI Status Script - Modularized
# Location: ~/scripts/comfyui_status.sh

COMFY_DIR="$HOME/ComfyUI"
MODELS_DIR="$COMFY_DIR/models"
CUSTOM_NODES_DIR="$COMFY_DIR/custom_nodes"
OUTPUT_DIR="$COMFY_DIR/output"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# UTILITY FUNCTIONS
# ============================================

check_file() {
    [[ -f "$1" ]] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
}

check_dir() {
    [[ -d "$1" ]] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"
}

print_header() {
    echo "ComfyUI Pipeline Status - $(date '+%Y-%m-%d %H:%M')"
    echo "================================================"
}

# ============================================
# GPU SECTION
# ============================================

show_gpu() {
    echo "GPU"
    if command -v nvidia-smi &> /dev/null; then
        nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu \
            --format=csv,noheader,nounits 2>/dev/null | while IFS=',' read -r name total used free temp util; do
            name=$(echo "$name" | xargs)
            total=$(echo "$total" | xargs)
            used=$(echo "$used" | xargs)
            free=$(echo "$free" | xargs)
            temp=$(echo "$temp" | xargs)
            util=$(echo "$util" | xargs)
            printf "  %-30s %s\n" "Model:" "$name"
            printf "  %-30s %sMB / %sMB (%sMB free)\n" "VRAM:" "$used" "$total" "$free"
            printf "  %-30s %s°C\n" "Temperature:" "$temp"
            printf "  %-30s %s%%\n" "Utilization:" "$util"
        done
    else
        echo "  nvidia-smi not found"
    fi
}

# ============================================
# PIPELINE SECTIONS
# ============================================

show_sdxl_pipeline() {
    echo "SDXL Pipeline"
    printf "  %-35s %s\n" "Checkpoint (sd_xl_base_1.0)" "$(check_file "$MODELS_DIR/checkpoints/sd_xl_base_1.0.safetensors")"
    printf "  %-35s %s\n" "VAE (sdxl_vae)" "$(check_file "$MODELS_DIR/vae/sdxl_vae.safetensors")"
    printf "  %-35s %s\n" "Lightning LoRA (4-step)" "$(check_file "$MODELS_DIR/loras/sdxl_lightning_4step_lora.safetensors")"
    
    if [[ -f "$MODELS_DIR/checkpoints/sd_xl_base_1.0.safetensors" ]]; then
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        echo -e "  Status: ${RED}MISSING FILES${NC}"
    fi
}

show_flux_pipeline() {
    echo "FLUX Pipeline"
    printf "  %-35s %s\n" "UNet (flux1-schnell)" "$(check_file "$MODELS_DIR/unet/flux1-schnell.safetensors")"
    printf "  %-35s %s\n" "UNet (flux1-dev) [optional]" "$(check_file "$MODELS_DIR/unet/flux1-dev.safetensors")"
    printf "  %-35s %s\n" "CLIP (clip_l)" "$(check_file "$MODELS_DIR/clip/clip_l.safetensors")"
    printf "  %-35s %s\n" "T5 Encoder (t5xxl_fp16)" "$(check_file "$MODELS_DIR/text_encoders/t5xxl_fp16.safetensors")"
    printf "  %-35s %s\n" "VAE (ae)" "$(check_file "$MODELS_DIR/vae/ae.safetensors")"
    
    if [[ -f "$MODELS_DIR/unet/flux1-schnell.safetensors" ]] && [[ -f "$MODELS_DIR/clip/clip_l.safetensors" ]]; then
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        echo -e "  Status: ${RED}MISSING FILES${NC}"
    fi
}

show_video_pipeline() {
    echo "Video Pipeline (AnimateDiff)"
    printf "  %-35s %s\n" "Motion Module v3 (SD1.5)" "$(check_file "$MODELS_DIR/animatediff_models/v3_sd15_mm.ckpt")"
    printf "  %-35s %s\n" "Motion Module SDXL" "$(check_file "$MODELS_DIR/animatediff_models/mm_sdxl_v10_beta.ckpt")"
    printf "  %-35s %s\n" "AnimateDiff-Evolved Node" "$(check_dir "$CUSTOM_NODES_DIR/ComfyUI-AnimateDiff-Evolved")"
    printf "  %-35s %s\n" "VideoHelperSuite Node" "$(check_dir "$CUSTOM_NODES_DIR/ComfyUI-VideoHelperSuite")"
    
    if [[ -d "$CUSTOM_NODES_DIR/ComfyUI-AnimateDiff-Evolved" ]]; then
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        echo -e "  Status: ${RED}MISSING FILES${NC}"
    fi
}

show_ltx2_pipeline() {
    echo "LTX-2 Video Pipeline"
    printf "  %-35s %s\n" "LTX-2 19B Dev" "$(check_file "$MODELS_DIR/checkpoints/ltx-2-19b-dev.safetensors")"
    printf "  %-35s %s\n" "LTX-2 19B FP8" "$(check_file "$MODELS_DIR/checkpoints/ltx-2-19b-dev-fp8.safetensors")"
    printf "  %-35s %s\n" "LTX-2 19B FP4" "$(check_file "$MODELS_DIR/checkpoints/ltx-2-19b-dev-fp4.safetensors")"
    printf "  %-35s %s\n" "LTX-2 Distilled FP8" "$(check_file "$MODELS_DIR/checkpoints/ltx-2-19b-distilled-fp8.safetensors")"
    printf "  %-35s %s\n" "Spatial Upscaler 2x" "$(check_file "$MODELS_DIR/checkpoints/ltx-2-spatial-upscaler-x2-1.0.safetensors")"
    printf "  %-35s %s\n" "Temporal Upscaler 2x" "$(check_file "$MODELS_DIR/checkpoints/ltx-2-temporal-upscaler-x2-1.0.safetensors")"
    printf "  %-35s %s\n" "ComfyUI-LTXVideo Node" "$(check_dir "$CUSTOM_NODES_DIR/ComfyUI-LTXVideo")"
    
    # Check if any LTX-2 model is present
    if ls "$MODELS_DIR/checkpoints"/ltx-2-*.safetensors 1>/dev/null 2>&1; then
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        echo -e "  Status: ${YELLOW}NOT INSTALLED${NC}"
    fi
}

show_triposr_pipeline() {
    echo "2D→3D Pipeline (TripoSR)"
    printf "  %-35s %s\n" "TripoSR Model" "$(check_file "$MODELS_DIR/checkpoints/model.ckpt")"
    printf "  %-35s %s\n" "Flowty-TripoSR Node" "$(check_dir "$CUSTOM_NODES_DIR/ComfyUI-Flowty-TripoSR")"
    
    if [[ -d "$CUSTOM_NODES_DIR/ComfyUI-Flowty-TripoSR" ]]; then
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        echo -e "  Status: ${RED}MISSING FILES${NC}"
    fi
}

show_upscaling() {
    echo "Upscaling"
    printf "  %-35s %s\n" "RealESRGAN 4x" "$(check_file "$MODELS_DIR/upscale_models/RealESRGAN_x4plus.pth")"
    printf "  %-35s %s\n" "UltraSharp 4x" "$(check_file "$MODELS_DIR/upscale_models/4x-UltraSharp.pth")"
    
    if [[ -f "$MODELS_DIR/upscale_models/RealESRGAN_x4plus.pth" ]]; then
        echo -e "  Status: ${GREEN}READY${NC}"
    else
        echo -e "  Status: ${RED}MISSING FILES${NC}"
    fi
}

# ============================================
# SUMMARY SECTIONS
# ============================================

show_custom_nodes() {
    echo "Custom Nodes"
    local count=$(find "$CUSTOM_NODES_DIR" -maxdepth 1 -type d | wc -l)
    count=$((count - 1))  # Subtract 1 for the directory itself
    echo "  Installed: $count"
}

show_disk_usage() {
    echo "Disk Usage"
    printf "  %-25s %s\n" "Checkpoints:" "$(du -sh "$MODELS_DIR/checkpoints" 2>/dev/null | cut -f1)"
    printf "  %-25s %s\n" "UNet/Diffusion:" "$(du -sh "$MODELS_DIR/unet" 2>/dev/null | cut -f1)"
    printf "  %-25s %s\n" "Text Encoders:" "$(du -sh "$MODELS_DIR/text_encoders" 2>/dev/null | cut -f1)"
    printf "  %-25s %s\n" "VAE:" "$(du -sh "$MODELS_DIR/vae" 2>/dev/null | cut -f1)"
    printf "  %-25s %s\n" "Video Models:" "$(du -sh "$MODELS_DIR/animatediff_models" 2>/dev/null | cut -f1)"
    printf "  %-25s %s\n" "Output:" "$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)"
    echo "  ----------------------------------------"
    printf "  %-25s %s\n" "TOTAL:" "$(du -sh "$MODELS_DIR" 2>/dev/null | cut -f1)"
}

show_service_status() {
    echo "Service"
    if systemctl is-active --quiet comfyui 2>/dev/null; then
        echo -e "  ComfyUI: ${GREEN}Running${NC}"
    elif pgrep -f "python.*main.py" > /dev/null; then
        echo -e "  ComfyUI: ${GREEN}Running (manual)${NC}"
    else
        echo -e "  ComfyUI: ${RED}Stopped${NC}"
    fi
    echo "  URL: http://$(hostname):8188"
}

# ============================================
# MAIN
# ============================================

main() {
    print_header
    
    show_gpu
    echo ""
    
    show_sdxl_pipeline
    echo ""
    
    show_flux_pipeline
    echo ""
    
    show_video_pipeline
    echo ""
    
    show_ltx2_pipeline
    echo ""
    
    show_triposr_pipeline
    echo ""
    
    show_upscaling
    echo ""
    
    show_custom_nodes
    echo ""
    
    show_disk_usage
    echo ""
    
    show_service_status
}

# Run main
main "$@"