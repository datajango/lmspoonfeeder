#!/bin/bash

# ==============================================
# ComfyUI Pipeline Status Check
# ==============================================

COMFYUI="/home/tony/ComfyUI"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    [ -f "$1" ] && [ $(stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null) -gt 1000 ]
}

check_dir() {
    [ -d "$1" ]
}

status() {
    if $1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        MISSING+=("$2")
    fi
}

echo ""
echo "ComfyUI Pipeline Status - $(date '+%Y-%m-%d %H:%M')"
echo "================================================"

# --------------------------------------------
# SDXL Pipeline
# --------------------------------------------
MISSING=()
echo ""
echo -e "${YELLOW}SDXL Pipeline${NC}"

printf "  %-35s %s\n" "Checkpoint (sd_xl_base_1.0)" \
    "$(status "$(check_file $COMFYUI/models/checkpoints/sd_xl_base_1.0.safetensors)" "sd_xl_base_1.0.safetensors")"

printf "  %-35s %s\n" "VAE (sdxl_vae)" \
    "$(status "$(check_file $COMFYUI/models/vae/sdxl_vae.safetensors)" "sdxl_vae.safetensors")"

printf "  %-35s %s\n" "Lightning LoRA (4-step)" \
    "$(status "$(check_file $COMFYUI/models/loras/sdxl_lightning_4step_lora.safetensors)" "sdxl_lightning_4step_lora.safetensors")"

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  Status: ${GREEN}READY${NC}"
else
    echo -e "  Status: ${RED}INCOMPLETE${NC} - Missing: ${MISSING[*]}"
fi

# --------------------------------------------
# FLUX Pipeline
# --------------------------------------------
MISSING=()
echo ""
echo -e "${YELLOW}FLUX Pipeline${NC}"

printf "  %-35s %s\n" "UNet (flux1-schnell)" \
    "$(status "$(check_file $COMFYUI/models/unet/flux1-schnell.safetensors)" "flux1-schnell.safetensors")"

printf "  %-35s %s\n" "UNet (flux1-dev) [optional]" \
    "$(status "$(check_file $COMFYUI/models/unet/flux1-dev.safetensors)" "")"

printf "  %-35s %s\n" "CLIP (clip_l)" \
    "$(status "$(check_file $COMFYUI/models/clip/clip_l.safetensors)" "clip_l.safetensors")"

printf "  %-35s %s\n" "T5 Encoder (t5xxl_fp16)" \
    "$(status "$(check_file $COMFYUI/models/text_encoders/t5xxl_fp16.safetensors)" "t5xxl_fp16.safetensors")"

printf "  %-35s %s\n" "VAE (ae)" \
    "$(status "$(check_file $COMFYUI/models/vae/ae.safetensors)" "ae.safetensors")"

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  Status: ${GREEN}READY${NC}"
else
    echo -e "  Status: ${RED}INCOMPLETE${NC} - Missing: ${MISSING[*]}"
fi

# --------------------------------------------
# Video Pipeline (AnimateDiff)
# --------------------------------------------
MISSING=()
echo ""
echo -e "${YELLOW}Video Pipeline (AnimateDiff)${NC}"

printf "  %-35s %s\n" "Motion Module v3 (SD1.5)" \
    "$(status "$(check_file $COMFYUI/models/animatediff_models/v3_sd15_mm.ckpt)" "v3_sd15_mm.ckpt")"

printf "  %-35s %s\n" "Motion Module SDXL" \
    "$(status "$(check_file $COMFYUI/models/animatediff_models/mm_sdxl_v10_beta.ckpt)" "mm_sdxl_v10_beta.ckpt")"

printf "  %-35s %s\n" "AnimateDiff-Evolved Node" \
    "$(status "$(check_dir $COMFYUI/custom_nodes/ComfyUI-AnimateDiff-Evolved)" "ComfyUI-AnimateDiff-Evolved")"

printf "  %-35s %s\n" "VideoHelperSuite Node" \
    "$(status "$(check_dir $COMFYUI/custom_nodes/ComfyUI-VideoHelperSuite)" "ComfyUI-VideoHelperSuite")"

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  Status: ${GREEN}READY${NC}"
else
    echo -e "  Status: ${RED}INCOMPLETE${NC} - Missing: ${MISSING[*]}"
fi

# --------------------------------------------
# 2D→3D Pipeline (TripoSR)
# --------------------------------------------
MISSING=()
echo ""
echo -e "${YELLOW}2D→3D Pipeline (TripoSR)${NC}"

printf "  %-35s %s\n" "TripoSR Model" \
    "$(status "$(check_file $COMFYUI/models/triposr/model.safetensors)" "triposr/model.safetensors")"

printf "  %-35s %s\n" "Flowty-TripoSR Node" \
    "$(status "$(check_dir $COMFYUI/custom_nodes/ComfyUI-Flowty-TripoSR)" "ComfyUI-Flowty-TripoSR")"

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  Status: ${GREEN}READY${NC}"
else
    echo -e "  Status: ${RED}INCOMPLETE${NC} - Missing: ${MISSING[*]}"
fi

# --------------------------------------------
# Upscaling
# --------------------------------------------
MISSING=()
echo ""
echo -e "${YELLOW}Upscaling${NC}"

printf "  %-35s %s\n" "RealESRGAN 4x" \
    "$(status "$(check_file $COMFYUI/models/upscale_models/RealESRGAN_x4plus.pth)" "RealESRGAN_x4plus.pth")"

printf "  %-35s %s\n" "UltraSharp 4x" \
    "$(status "$(check_file $COMFYUI/models/upscale_models/4x-UltraSharp.pth)" "4x-UltraSharp.pth")"

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  Status: ${GREEN}READY${NC}"
else
    echo -e "  Status: ${RED}INCOMPLETE${NC} - Missing: ${MISSING[*]}"
fi

# --------------------------------------------
# Custom Nodes Summary
# --------------------------------------------
echo ""
echo -e "${YELLOW}Custom Nodes${NC}"
NODE_COUNT=$(find "$COMFYUI/custom_nodes" -maxdepth 1 -type d ! -name "__pycache__" ! -name "custom_nodes" | wc -l)
echo "  Installed: $NODE_COUNT"

# --------------------------------------------
# Disk Usage
# --------------------------------------------
echo ""
echo -e "${YELLOW}Disk Usage${NC}"
printf "  %-20s %s\n" "Checkpoints:" "$(du -sh $COMFYUI/models/checkpoints 2>/dev/null | cut -f1)"
printf "  %-20s %s\n" "UNet/Diffusion:" "$(du -sh $COMFYUI/models/unet 2>/dev/null | cut -f1)"
printf "  %-20s %s\n" "Text Encoders:" "$(du -sh $COMFYUI/models/text_encoders 2>/dev/null | cut -f1)"
printf "  %-20s %s\n" "VAE:" "$(du -sh $COMFYUI/models/vae 2>/dev/null | cut -f1)"
printf "  %-20s %s\n" "Video Models:" "$(du -sh $COMFYUI/models/animatediff_models 2>/dev/null | cut -f1)"
printf "  %-20s %s\n" "Output:" "$(du -sh $COMFYUI/output 2>/dev/null | cut -f1)"
echo "  ----------------------------------------"
printf "  %-20s %s\n" "TOTAL:" "$(du -sh $COMFYUI 2>/dev/null | cut -f1)"

# --------------------------------------------
# Service Status
# --------------------------------------------
echo ""
echo -e "${YELLOW}Service${NC}"
if systemctl is-active --quiet comfyui; then
    echo -e "  ComfyUI: ${GREEN}Running${NC}"
    echo "  URL: http://$(hostname):8188"
else
    echo -e "  ComfyUI: ${RED}Stopped${NC}"
fi

echo ""