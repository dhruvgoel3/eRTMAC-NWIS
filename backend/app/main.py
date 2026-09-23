"""
eRTMAC-NWIS Backend Main Application
FastAPI application entrypoint for Oil India Limited Nearby Wells Intelligence System.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers.wells import router as wells_router
from app.routers.routers import (
    dashboard_router,
    documents_router,
    alerts_router,
    ai_router,
    simulation_router,
    events_router,
    datasets_router,
    memory_graph_router,
)
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is initialized
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="eRTMAC-NWIS API",
    description="Nearby Wells Intelligence System — An AI-Powered Offset Well Knowledge and Decision Support Platform for Drilling Operations",
    version="1.0.0",
    lifespan=lifespan,
)

from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# Allow CORS for dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request, exc):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "FORBIDDEN" if exc.status_code == 403 else ("UNAUTHORIZED" if exc.status_code == 401 else ("NOT_FOUND" if exc.status_code == 404 else "ERROR")),
                "message": str(exc.detail),
            },
        },
    )


# Register all modular routers
app.include_router(wells_router)
app.include_router(dashboard_router)
app.include_router(documents_router)
app.include_router(alerts_router)
app.include_router(ai_router)
app.include_router(simulation_router)
app.include_router(events_router)
app.include_router(datasets_router)
app.include_router(memory_graph_router)
app.include_router(auth_router)
app.include_router(admin_router)



from app.database import get_db_info
from app.services.supabase_service import get_supabase_status

@app.get("/")
def root():
    return {
        "system": "eRTMAC-NWIS",
        "name": "Nearby Wells Intelligence System",
        "operator": "Oil India Limited (OIL)",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
        "database": get_db_info(),
        "supabase": get_supabase_status(),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "eRTMAC-NWIS Backend",
        "database": get_db_info(),
        "supabase": get_supabase_status(),
    }


@app.get("/api/supabase/status")
def supabase_status():
    return get_supabase_status()
