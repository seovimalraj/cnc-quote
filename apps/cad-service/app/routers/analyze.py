from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from OCC.Core.BRepBndLib import brepbndlib_Add
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.BRepGProp import brepgprop_VolumeProperties, brepgprop_SurfaceProperties
from OCC.Core.GProp import GProp_GProps
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.TopoDS import TopoDS_Shape
from OCC.Core.Bnd import Bnd_Box
import numpy as np

from ..workers.celery import celery_app

router = APIRouter()

class AnalysisRequest(BaseModel):
    file_id: str
    file_path: str

class AnalysisResponse(BaseModel):
    file_id: str
    volume: float
    surface_area: float
    bbox: dict
    primitive_features: dict
    task_id: Optional[str] = None

def analyze_step_file(file_path: str) -> dict:
    # Initialize STEP reader
    reader = STEPControl_Reader()
    
    # Read STEP file
    status = reader.ReadFile(file_path)
    if status != IFSelect_RetDone:
        raise HTTPException(status_code=400, detail="Failed to read STEP file")
    
    # Transfer shapes
    reader.TransferRoots()
    shape = reader.OneShape()
    
    # Create mesh for surface calculations
    mesh = BRepMesh_IncrementalMesh(shape, 0.1)
    mesh.Perform()
    
    # Calculate volume
    vol_props = GProp_GProps()
    brepgprop_VolumeProperties(shape, vol_props)
    volume = vol_props.Mass()
    
    # Calculate surface area
    surf_props = GProp_GProps()
    brepgprop_SurfaceProperties(shape, surf_props)
    surface_area = surf_props.Mass()
    
    # Calculate bounding box
    bbox = Bnd_Box()
    brepbndlib_Add(shape, bbox)
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()
    
    # Count primitive features (basic implementation)
    # In a real system, this would do more sophisticated feature recognition
    primitive_features = {
        "holes": 0,
        "pockets": 0,
        "slots": 0,
        "faces": 0
    }
    
    return {
        "volume": volume,
        "surface_area": surface_area,
        "bbox": {
            "min": {"x": xmin, "y": ymin, "z": zmin},
            "max": {"x": xmax, "y": ymax, "z": zmax}
        },
        "primitive_features": primitive_features
    }

@celery_app.task
def analyze_file(file_id: str, file_path: str):
    try:
        results = analyze_step_file(file_path)
        return {
            "file_id": file_id,
            **results
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/", response_model=AnalysisResponse)
async def analyze_cad_file(request: AnalysisRequest):
    # Queue the analysis task
    task = analyze_file.delay(request.file_id, request.file_path)
    
    return {
        "file_id": request.file_id,
        "volume": 0,  # Will be updated when task completes
        "surface_area": 0,
        "bbox": {"min": {"x": 0, "y": 0, "z": 0}, "max": {"x": 0, "y": 0, "z": 0}},
        "primitive_features": {"holes": 0, "pockets": 0, "slots": 0, "faces": 0},
        "task_id": task.id
    }

@router.get("/{task_id}", response_model=AnalysisResponse)
async def get_analysis_result(task_id: str):
    task = analyze_file.AsyncResult(task_id)
    
    if task.ready():
        result = task.get()
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    else:
        raise HTTPException(status_code=202, detail="Analysis in progress")
