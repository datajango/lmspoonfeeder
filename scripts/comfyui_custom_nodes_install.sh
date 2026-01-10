#!/bin/bash

cd /home/tony/ComfyUI/custom_nodes

echo "=== Installing Custom Nodes ==="

# Essential
git clone https://github.com/ltdrdata/ComfyUI-Impact-Pack
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts
git clone https://github.com/rgthree/rgthree-comfy

# Video Generation
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite

# Image Enhancement
git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus
git clone https://github.com/Fannovel16/comfyui_controlnet_aux
git clone https://github.com/ssitu/ComfyUI_UltimateSDUpscale

# 2D to 3D
git clone https://github.com/flowtyone/ComfyUI-Flowty-TripoSR

# FLUX support (if needed)
git clone https://github.com/city96/ComfyUI-GGUF

# Restart ComfyUI
sudo systemctl restart comfyui

echo "=== Done! ==="