#!/bin/bash

COMFYUI_PATH="/home/tony/ComfyUI"
OUTPUT_FILE="comfyui_inventory_$(date +%Y%m%d_%H%M%S).txt"

echo "ComfyUI Inventory Report" > "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "Path: $COMFYUI_PATH" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

# Function to list directory with sizes
list_dir() {
    local dir="$1"
    local label="$2"
    echo "" >> "$OUTPUT_FILE"
    echo "## $label" >> "$OUTPUT_FILE"
    echo "   Path: $dir" >> "$OUTPUT_FILE"
    echo "   ----------------------------------------" >> "$OUTPUT_FILE"
    if [ -d "$dir" ]; then
        ls -lhS "$dir" 2>/dev/null | tail -n +2 >> "$OUTPUT_FILE"
        count=$(ls -1 "$dir" 2>/dev/null | wc -l)
        echo "   Total: $count items" >> "$OUTPUT_FILE"
    else
        echo "   (directory not found)" >> "$OUTPUT_FILE"
    fi
}

# Standard Models
list_dir "$COMFYUI_PATH/models/checkpoints" "Checkpoints (SD Models)"
list_dir "$COMFYUI_PATH/models/loras" "LoRAs"
list_dir "$COMFYUI_PATH/models/vae" "VAE"
list_dir "$COMFYUI_PATH/models/controlnet" "ControlNet"
list_dir "$COMFYUI_PATH/models/upscale_models" "Upscale Models"
list_dir "$COMFYUI_PATH/models/embeddings" "Embeddings/Textual Inversions"
list_dir "$COMFYUI_PATH/models/clip" "CLIP Models"
list_dir "$COMFYUI_PATH/models/clip_vision" "CLIP Vision"
list_dir "$COMFYUI_PATH/models/ipadapter" "IP-Adapter"

# FLUX / Modern Architecture Models
list_dir "$COMFYUI_PATH/models/diffusion_models" "Diffusion Models (FLUX/etc)"
list_dir "$COMFYUI_PATH/models/text_encoders" "Text Encoders (CLIP/T5)"
list_dir "$COMFYUI_PATH/models/unet" "UNet Models"

# Custom nodes
echo "" >> "$OUTPUT_FILE"
echo "## Custom Nodes (Extensions)" >> "$OUTPUT_FILE"
echo "   Path: $COMFYUI_PATH/custom_nodes" >> "$OUTPUT_FILE"
echo "   ----------------------------------------" >> "$OUTPUT_FILE"
if [ -d "$COMFYUI_PATH/custom_nodes" ]; then
    for node in "$COMFYUI_PATH/custom_nodes"/*/; do
        if [ -d "$node" ]; then
            nodename=$(basename "$node")
            if [ "$nodename" != "__pycache__" ]; then
                echo "   - $nodename" >> "$OUTPUT_FILE"
            fi
        fi
    done
    count=$(ls -1d "$COMFYUI_PATH/custom_nodes"/*/ 2>/dev/null | grep -v __pycache__ | wc -l)
    echo "   Total: $count custom nodes" >> "$OUTPUT_FILE"
fi

# Output folder (just count, not full listing)
echo "" >> "$OUTPUT_FILE"
echo "## Output Folder" >> "$OUTPUT_FILE"
echo "   Path: $COMFYUI_PATH/output" >> "$OUTPUT_FILE"
echo "   ----------------------------------------" >> "$OUTPUT_FILE"
if [ -d "$COMFYUI_PATH/output" ]; then
    count=$(find "$COMFYUI_PATH/output" -type f | wc -l)
    size=$(du -sh "$COMFYUI_PATH/output" 2>/dev/null | cut -f1)
    echo "   Total files: $count" >> "$OUTPUT_FILE"
    echo "   Total size: $size" >> "$OUTPUT_FILE"
fi

# Disk space
echo "" >> "$OUTPUT_FILE"
echo "## Disk Space" >> "$OUTPUT_FILE"
echo "   ----------------------------------------" >> "$OUTPUT_FILE"
du -sh "$COMFYUI_PATH/models"/* 2>/dev/null >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "   Total ComfyUI size: $(du -sh $COMFYUI_PATH 2>/dev/null | cut -f1)" >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "End of Report" >> "$OUTPUT_FILE"

# Display and save
cat "$OUTPUT_FILE"
echo ""
echo "Report saved to: $OUTPUT_FILE"