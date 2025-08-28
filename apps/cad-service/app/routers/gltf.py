from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.StlAPI import StlAPI_Writer
import tempfile
import os
import numpy as np
import trimesh
from pathlib import Path

from ..workers.celery import celery_app

router = APIRouter()

class GltfRequest(BaseModel):
    file_id: str
    file_path: str

class GltfResponse(BaseModel):
    file_id: str
    gltf_url: str
    task_id: str

@celery_app.task
def convert_to_gltf(file_id: str, file_path: str):
    try:
        # Read STEP file
        reader = STEPControl_Reader()
        status = reader.ReadFile(file_path)
        if status != IFSelect_RetDone:
            raise Exception("Failed to read STEP file")
        
        reader.TransferRoots()
        shape = reader.OneShape()
        
        # Create mesh
        mesh = BRepMesh_IncrementalMesh(shape, 0.1)
        mesh.Perform()
        
        # First convert to STL as an intermediate format
        with tempfile.NamedTemporaryFile(suffix='.stl', delete=False) as tmp_stl:
            stl_writer = StlAPI_Writer()
            stl_writer.Write(shape, tmp_stl.name)
            
            # Load STL file
            mesh = trimesh.load(tmp_stl.name)
            
            # Create output directory if it doesn't exist
            output_dir = Path("/tmp/previews")
            output_dir.mkdir(exist_ok=True)
            
            # Generate GLTF file
            gltf_path = output_dir / f"{file_id}.gltf"
            mesh.export(str(gltf_path), file_type='gltf')
            
            return {
                "file_id": file_id,
                "gltf_url": f"/preview/{file_id}.gltf"
            }
    except Exception as e:
        return {"error": str(e)}

@router.post("/{file_id}", response_model=GltfResponse)
async def create_gltf(file_id: str, request: GltfRequest):
    task = convert_to_gltf.delay(file_id, request.file_path)
    
    return {
        "file_id": file_id,
        "gltf_url": "",  # Will be populated when conversion is complete
        "task_id": task.id
    }

@router.get("/{task_id}", response_model=GltfResponse)
async def get_gltf_status(task_id: str):
    task = convert_to_gltf.AsyncResult(task_id)
    
    if task.ready():
        result = task.get()
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    else:
        raise HTTPException(status_code=202, detail="Conversion in progress")
