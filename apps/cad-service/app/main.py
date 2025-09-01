from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .routers import analyze, gltf, health
from .workers.celery import celery_app

app = FastAPI(
    title="CAD Service",
    description="CAD analysis and conversion service for CNC Quote",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
ALLOWED_ORIGINS = [
    "https://cnc-quote-web.onrender.com",
    "https://cnc-quote-api.onrender.com",
]
if os.getenv("NODE_ENV") == "development":
    ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600,
)

# Include routers
app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
app.include_router(gltf.router, prefix="/gltf", tags=["gltf"])
app.include_router(health.router, tags=["health"])

@app.get("/")
async def root():
    return {"message": "CAD Service API", "version": "1.0.0"}
