"""
eRTMAC-NWIS Backend Main Application
FastAPI application entrypoint for Oil India Limited Nearby Wells Intelligence System.
"""
import os
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Ensure backend/.env is strictly loaded on backend startup
_backend_env_path = Path(__file__).resolve().parent.parent / ".env"
if _backend_env_path.is_file():
    load_dotenv(_backend_env_path)
else:
    load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.database import engine, Base, get_db_info
from app.services.supabase_service import get_supabase_status
from app.routers import all_routers


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


# Register all modular domain routers
for r in all_routers:
    app.include_router(r)


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
