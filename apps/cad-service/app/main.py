from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .routers import analyze, gltf
from .workers.celery import celery_app

app = FastAPI(
    title="CAD Service",
    description="CAD analysis and conversion service for CNC Quote",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
app.include_router(gltf.router, prefix="/gltf", tags=["gltf"])

@app.get("/health")
async def health_check():
    # Check Celery workers
    i = celery_app.control.inspect()
    workers = i.active()
    
    if not workers:
        raise HTTPException(status_code=503, detail="No Celery workers available")
    
    return {"status": "healthy", "workers": len(workers)}
