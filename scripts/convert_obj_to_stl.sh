#!/bin/bash
# Convert latest OBJ to STL
LATEST_OBJ=$(ls -t /home/tony/ComfyUI/output/*.obj 2>/dev/null | head -1)
if [ -z "$LATEST_OBJ" ]; then
    echo "No OBJ files found"
    exit 1
fi
STL_FILE="${LATEST_OBJ%.obj}.stl"
/home/tony/ComfyUI/venv/bin/python -c "
import trimesh
mesh = trimesh.load('$LATEST_OBJ')
mesh.export('$STL_FILE')
print('Converted: $STL_FILE')
