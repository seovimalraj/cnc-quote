# routers/health.py
from uuid import uuid4
from datetime import datetime
from fastapi import APIRouter, Response, Depends
from fastapi.responses import JSONResponse
import importlib.metadata
import psutil
import os
from ..workers.celery import celery_app

router = APIRouter()

async def check_celery() -> dict:
    """Check Celery worker health"""
    try:
        response = celery_app.control.ping(timeout=1.0)
        return {"status": "healthy" if response else "unhealthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

async def check_system_health() -> dict:
    """Check system resources"""
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return {
        "memory": {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent
        },
        "disk": {
            "total": disk.total,
            "free": disk.free,
            "percent": disk.percent
        },
        "cpu_percent": psutil.cpu_percent(interval=1)
    }

@router.get("/health")
async def health_check(response: Response):
    """
    Enhanced health check endpoint with comprehensive system metrics
    """
    request_id = str(uuid4())
    response.headers["x-request-id"] = request_id
    
    try:
        version = importlib.metadata.version("cad-service")
    except importlib.metadata.PackageNotFoundError:
        version = "0.1.0"
        
    celery_status = await check_celery()
    system_health = await check_system_health()
    
    is_healthy = (
        celery_status["status"] == "healthy" and
        system_health["memory"]["percent"] < 90 and
        system_health["disk"]["percent"] < 90
    )
    
    health_data = {
        "ok": is_healthy,
        "service": "cad",
        "version": version,
        "timestamp": datetime.utcnow().isoformat(),
        "details": {
            "status": "healthy" if is_healthy else "degraded",
            "celery": celery_status,
            "system": system_health
        }
    })
