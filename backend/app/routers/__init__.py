"""
Routers registry package for eRTMAC-NWIS backend.
Exports all modular domain routers.
"""
from app.routers.wells import router as wells_router
from app.routers.dashboard import router as dashboard_router
from app.routers.documents import router as documents_router
from app.routers.alerts import router as alerts_router
from app.routers.ai import router as ai_router
from app.routers.simulation import router as simulation_router
from app.routers.events import router as events_router
from app.routers.datasets import router as datasets_router
from app.routers.memory_graph import router as memory_graph_router
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.map import router as map_router

all_routers = [
    wells_router,
    dashboard_router,
    documents_router,
    alerts_router,
    ai_router,
    simulation_router,
    events_router,
    datasets_router,
    memory_graph_router,
    auth_router,
    admin_router,
    map_router,
]

__all__ = [
    "wells_router",
    "dashboard_router",
    "documents_router",
    "alerts_router",
    "ai_router",
    "simulation_router",
    "events_router",
    "datasets_router",
    "memory_graph_router",
    "auth_router",
    "admin_router",
    "map_router",
    "all_routers",
]

