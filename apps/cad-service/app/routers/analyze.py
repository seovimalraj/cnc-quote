from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
# from OCC.Core.BRepBndLib import brepbndlib_Add
# from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
# from OCC.Core.BRepGProp import brepgprop_VolumeProperties, brepgprop_SurfaceProperties
# from OCC.Core.GProp import GProp_GProps
# from OCC.Core.STEPControl import STEPControl_Reader
# from OCC.Core.IFSelect import IFSelect_RetDone
# from OCC.Core.TopoDS import TopoDS_Shape
# from OCC.Core.Bnd import Bnd_Box
# import numpy as np

from ..workers.celery import celery_app
from ..utils.download import download_to_temp
from ..utils.units import scale_to_mm
from ..loaders.step_loader import occ_available, load_step_shape, shape_mass_props
from ..loaders.stl_loader import load_stl, mesh_mass_props
from ..extractors.holes import extract_holes_from_shape
from ..extractors.pockets import extract_pockets_from_shape
from ..extractors.min_wall import min_wall_mesh
from ..models import FeaturesJson, BBox, MassProps, HoleFeature, PocketFeature, MinWallData

router = APIRouter()

class AnalysisRequest(BaseModel):
    file_id: str
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    units_hint: Optional[str] = None
    org_id: Optional[str] = None
    webhook_url: Optional[str] = None

class AnalysisResponse(BaseModel):
    file_id: str
    metrics: dict
    task_id: Optional[str] = None

def analyze_file_path(file_path: str, units_hint: Optional[str] = None) -> dict:
    """Analyze a CAD file (STEP/STL) and return normalized metrics.
    Returns a dict matching previous mock structure to limit integration changes.
    """
    import os
    ext = os.path.splitext(file_path)[1].lower()
    scale = scale_to_mm(units_hint)
    if ext in (".stl",):
        mesh = load_stl(file_path, scale=scale)
        vol_mm3, area_mm2 = mesh_mass_props(mesh)
        bbox_min = mesh.bounds[0]
        bbox_max = mesh.bounds[1]
        # Approximate min wall via ray casting
        mw = min_wall_mesh(mesh)
        metrics = {
            "volume": vol_mm3 / 1000.0,  # convert to cm^3 to keep parity with previous mock fields
            "surface_area": area_mm2 / 100.0,  # to cm^2
            "bbox": {"min": {"x": float(bbox_min[0]), "y": float(bbox_min[1]), "z": float(bbox_min[2])},
                     "max": {"x": float(bbox_max[0]), "y": float(bbox_max[1]), "z": float(bbox_max[2])}},
            "thickness": mw.global_min_mm if mw.global_min_mm > 0 else None,
            "primitive_features": {"holes": 0, "pockets": 0, "slots": 0, "faces": int(mesh.faces.shape[0])},
            "material_usage": None,
        }
        return metrics
    elif ext in (".step", ".stp"):
        if not occ_available():
            raise HTTPException(status_code=400, detail="STEP analysis requires pythonOCC; not available")
        shape = load_step_shape(file_path)
        vol_mm3, area_mm2 = shape_mass_props(shape)
        # BBox using OCC
        from OCC.Core.Bnd import Bnd_Box
        from OCC.Core.BRepBndLib import brepbndlib_Add
        from OCC.Core.gp import gp_Pnt
        box = Bnd_Box()
        brepbndlib_Add(shape, box)
        xmin, ymin, zmin, xmax, ymax, zmax = box.Get()
        holes = extract_holes_from_shape(shape)
        pockets = extract_pockets_from_shape(shape)
        metrics = {
            "volume": vol_mm3 / 1000.0,
            "surface_area": area_mm2 / 100.0,
            "bbox": {"min": {"x": xmin, "y": ymin, "z": zmin}, "max": {"x": xmax, "y": ymax, "z": zmax}},
            "thickness": None,
            "primitive_features": {"holes": len(holes), "pockets": len(pockets)},
            "material_usage": None,
        }
        return metrics
    else:
        raise HTTPException(status_code=400, detail="Unsupported CAD format. Use STEP or STL.")

def calculate_stock_size(bbox: dict, thickness: float = None) -> dict:
    """Calculate required stock material size."""
    x_size = bbox["max"]["x"] - bbox["min"]["x"]
    y_size = bbox["max"]["y"] - bbox["min"]["y"]
    z_size = bbox["max"]["z"] - bbox["min"]["z"]
    
    if thickness:  # Sheet metal
        return {
            "length": round(x_size + 10, 1),  # Add margin
            "width": round(y_size + 10, 1),
            "thickness": round(thickness, 1)
        }
    else:  # CNC block
        return {
            "length": round(x_size + 20, 1),
            "width": round(y_size + 20, 1),
            "height": round(z_size + 15, 1)
        }

@celery_app.task
def analyze_file(file_id: str, file_path: str, units_hint: Optional[str] = None, file_url: Optional[str] = None, org_id: Optional[str] = None, webhook_url: Optional[str] = None):
    try:
        local_path = file_path
        if not local_path and file_url:
            local_path = download_to_temp(file_url)
        if not local_path:
            raise ValueError("file_path or file_url is required")

        metrics = analyze_file_path(local_path, units_hint)
        # Fire-and-forget webhook if provided
        if webhook_url:
            try:
                import httpx
                headers = {}
                secret = None
                try:
                    import os
                    secret = os.getenv('GEOMETRY_WEBHOOK_SECRET')
                except Exception:
                    secret = None
                if secret:
                    headers['X-CAD-Webhook-Secret'] = secret
                payload = {
                    "part_id": file_id,
                    "org_id": org_id,
                    "metrics": metrics,
                    "file_url": file_url,
                    "units_hint": units_hint,
                    "loader": 'occ' if local_path.lower().endswith(('.step', '.stp')) else 'trimesh'
                }
                if secret:
                    import hmac, hashlib, json
                    body = json.dumps(payload)
                    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
                    headers['X-CAD-Webhook-Signature'] = f'sha256={sig}'
                httpx.post(webhook_url, json=payload, headers=headers, timeout=10.0)
            except Exception:
                pass
        return {"file_id": file_id, "metrics": metrics}
    except Exception as e:
        return {"error": str(e)}

@router.post("/", response_model=AnalysisResponse)
async def analyze_cad_file(request: AnalysisRequest):
    # Queue the analysis task
    task = analyze_file.delay(request.file_id, request.file_path or "", request.units_hint, request.file_url, request.org_id, request.webhook_url)
    
    return {
        "file_id": request.file_id,
        "metrics": {},
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

@router.post("/sync", response_model=AnalysisResponse)
async def analyze_cad_file_sync(request: AnalysisRequest):
    """Synchronous analysis for immediate results (smaller files)."""
    try:
        local_path = request.file_path
        if not local_path and request.file_url:
            local_path = download_to_temp(request.file_url)
        if not local_path:
            raise HTTPException(status_code=400, detail="file_path or file_url is required")
        metrics = analyze_file_path(local_path, request.units_hint)
        return {"file_id": request.file_id, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
