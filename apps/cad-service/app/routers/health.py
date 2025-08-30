# routers/health.py
from uuid import uuid4
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
import importlib.metadata

router = APIRouter()

@router.get("/health")
async def health_check(response: Response):
    """
    Health check endpoint
    """
    request_id = str(uuid4())
    response.headers["x-request-id"] = request_id
    
    try:
        # Get version from pyproject.toml
        version = importlib.metadata.version("cad-service")
    except importlib.metadata.PackageNotFoundError:
        version = "0.1.0"  # Fallback version
        
    return JSONResponse({
        "ok": True,
        "service": "cad",
        "version": version,
        "timestamp": datetime.utcnow().isoformat(),
        "details": {
            "workers": celery_app.control.inspect().active() or {}
        }
    })
