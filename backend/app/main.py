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
)


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

# Allow CORS for dev frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modular routers
app.include_router(wells_router)
app.include_router(dashboard_router)
app.include_router(documents_router)
app.include_router(alerts_router)
app.include_router(ai_router)
app.include_router(simulation_router)
app.include_router(events_router)


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
