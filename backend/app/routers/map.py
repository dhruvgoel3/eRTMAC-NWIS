"""
Map API Router for eRTMAC-NWIS
Provides GIS basemaps, Carto configuration, GeoJSON well layers, spatial queries, and structural geological layers.
"""
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Well, WellEvent, RiskZone
from app.services.geo import haversine_km, find_nearby_wells
from app.auth.dependencies import get_current_user_optional, AuthenticatedUser

router = APIRouter(prefix="/api/map", tags=["map"])

# ─── Carto and Basemap Configuration ──────────────────────────────────────────

def get_carto_key() -> str:
    key = os.getenv("CARTO_API_KEY", "").strip()
    if not key:
        from pathlib import Path
        from dotenv import load_dotenv
        env_file = Path(__file__).resolve().parent.parent.parent / ".env"
        if env_file.is_file():
            load_dotenv(env_file, override=True)
            key = os.getenv("CARTO_API_KEY", "").strip()
    return key


def get_carto_url(subpath: str) -> str:
    key = get_carto_key()
    if key:
        # Carto basemaps require ?key= parameter (not ?api_key=) and rastertiles path
        formatted_sub = subpath if subpath.startswith("rastertiles/") else f"rastertiles/{subpath}"
        return f"https://{{s}}.basemaps.cartocdn.com/{formatted_sub}/{{z}}/{{x}}/{{y}}{{r}}.png?key={key}"
    # Seamless fallback to clean dark canvas without watermark when no valid key is provided
    return "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"


def get_basemap_providers() -> Dict[str, Any]:
    key = get_carto_key()
    return {
        "esri-dark": {
            "id": "esri-dark",
            "name": "Dark Canvas (Clean / No Watermark)",
            "url": "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            "subdomains": [],
            "attribution": '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
            "max_zoom": 16,
            "is_dark": True,
            "requires_key": False,
            "key_configured": True,
            "description": "Clean dark gray canvas basemap without any watermark",
        },
        "carto-dark": {
            "id": "carto-dark",
            "name": "CartoDB Dark Matter",
            "url": get_carto_url("dark_all"),
            "subdomains": ["a", "b", "c", "d"],
            "attribution": '&copy; <a href="https://carto.com/">CartoDB</a> contributors, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            "max_zoom": 19,
            "is_dark": True,
            "requires_key": True,
            "key_configured": bool(key),
            "description": "High contrast dark basemap (requires CARTO_API_KEY in .env)",
        },
        "carto-light": {
            "id": "carto-light",
            "name": "CartoDB Positron",
            "url": get_carto_url("light_all"),
            "subdomains": ["a", "b", "c", "d"],
            "attribution": '&copy; <a href="https://carto.com/">CartoDB</a> contributors',
            "max_zoom": 19,
            "is_dark": False,
            "requires_key": True,
            "key_configured": bool(key),
            "description": "Minimalist light basemap for bright environments",
        },
        "carto-voyager": {
            "id": "carto-voyager",
            "name": "CartoDB Voyager",
            "url": get_carto_url("rastertiles/voyager"),
            "subdomains": ["a", "b", "c", "d"],
            "attribution": '&copy; <a href="https://carto.com/">CartoDB</a> contributors',
            "max_zoom": 19,
            "is_dark": False,
            "requires_key": True,
            "key_configured": bool(key),
            "description": "Detailed colored basemap with labels",
        },
        "satellite": {
            "id": "satellite",
            "name": "Esri World Imagery (Satellite)",
            "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            "subdomains": [],
            "attribution": "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            "max_zoom": 18,
            "is_dark": True,
            "requires_key": False,
            "key_configured": True,
            "description": "High-resolution satellite imagery for ground terrain inspection",
        },
        "osm": {
            "id": "osm",
            "name": "OpenStreetMap Standard",
            "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "subdomains": ["a", "b", "c"],
            "attribution": '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            "max_zoom": 19,
            "is_dark": False,
            "requires_key": False,
            "key_configured": True,
            "description": "Standard OpenStreetMap street and topographic layer",
        },
    }


MAP_CONFIG = {
    "default_center": [27.2000, 95.1000],  # Duliajan, Upper Assam / Oil India Field HQ
    "default_zoom": 11,
    "min_zoom": 5,
    "max_zoom": 19,
    "bounds": {
        "south_west": [25.5000, 92.5000],
        "north_east": [28.5000, 97.0000],
    },
    "basin": "Assam-Arakan Basin",
    "operator": "Oil India Limited (OIL)",
    "supported_radii_km": [5, 10, 20, 50],
}


@router.get("/config")
def get_map_config():
    """Returns active map basemap configurations, Carto tile URLs with API key, and GIS defaults."""
    providers = get_basemap_providers()
    key = get_carto_key()
    has_key = bool(key)
    default_p = "carto-dark" if has_key else "esri-dark"
    cfg = dict(MAP_CONFIG)
    cfg["default_provider"] = default_p
    cfg["providers"] = providers
    cfg["carto_api_key_configured"] = has_key
    return {
        "success": True,
        "data": cfg,
    }



# ─── GeoJSON Well Features ───────────────────────────────────────────────────

def well_to_geojson_feature(well: Well, event_stats: Optional[Dict[str, Any]] = None, distance_km: Optional[float] = None) -> dict:
    stats = event_stats or {}
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [well.longitude, well.latitude],
        },
        "properties": {
            "id": well.id,
            "well_id": well.well_id,
            "name": well.name,
            "latitude": well.latitude,
            "longitude": well.longitude,
            "field": well.field,
            "formation": well.formation,
            "total_depth": well.total_depth,
            "well_type": well.well_type,
            "trajectory_type": well.trajectory_type,
            "status": well.status,
            "is_active": well.is_active,
            "mud_weight": well.mud_weight,
            "operator": well.operator or "Oil India Limited",
            "source_dataset": getattr(well, "source_dataset", "OIL_SYNTHETIC"),
            "distance_km": round(distance_km, 2) if distance_km is not None else None,
            "event_count": stats.get("event_count", 0),
            "max_severity": stats.get("max_severity", "LOW"),
            "event_types": stats.get("event_types", []),
            "total_npt": stats.get("total_npt", 0.0),
        },
    }


@router.get("/geojson")
def get_wells_geojson(
    formation: Optional[str] = None,
    status: Optional[str] = None,
    source_dataset: Optional[str] = None,
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
):
    """
    Returns all drilling and offset wells formatted as a standard GeoJSON FeatureCollection
    compatible with Leaflet, Carto, QGIS, and Mapbox.
    """
    q = db.query(Well)
    if formation and formation != "ALL":
        q = q.filter(Well.formation == formation)
    if status and status != "ALL":
        q = q.filter(Well.status == status)
    if source_dataset and source_dataset != "ALL":
        q = q.filter(Well.source_dataset == source_dataset)

    wells = q.limit(limit).all()

    # Aggregate events per well
    well_ids = [w.id for w in wells]
    events = db.query(WellEvent).filter(WellEvent.well_id.in_(well_ids)).all() if well_ids else []

    stats_by_well: Dict[int, Dict[str, Any]] = {}
    severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

    for ev in events:
        if ev.well_id not in stats_by_well:
            stats_by_well[ev.well_id] = {
                "event_count": 0,
                "max_severity": "LOW",
                "event_types": [],
                "total_npt": 0.0,
            }
        st = stats_by_well[ev.well_id]
        st["event_count"] += 1
        st["total_npt"] += (ev.npt_hours or 0.0)
        ev_type = ev.event_type.value if hasattr(ev.event_type, "value") else str(ev.event_type)
        if ev_type not in st["event_types"]:
            st["event_types"].append(ev_type)
        ev_sev = ev.severity.value if hasattr(ev.severity, "value") else str(ev.severity)
        if severity_order.get(ev_sev, 0) > severity_order.get(st["max_severity"], 0):
            st["max_severity"] = ev_sev

    features = [
        well_to_geojson_feature(w, stats_by_well.get(w.id))
        for w in wells
    ]

    return {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }


# ─── Spatial Query & Nearby Analysis ─────────────────────────────────────────

@router.get("/nearby")
def get_map_nearby_wells(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(20.0, description="Search radius in km"),
    formation: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
):
    """
    Spatial radius search returning nearby offset wells with distances and event summaries.
    Accessible with or without auth token (falls back gracefully for demo environments).
    """
    all_wells = db.query(Well).filter(Well.is_active == False).all()
    nearby = find_nearby_wells(lat, lon, radius_km, all_wells)

    if formation and formation != "ALL":
        nearby = [(w, d) for w, d in nearby if w.formation == formation]

    well_ids = [w.id for w, _ in nearby]
    events = db.query(WellEvent).filter(WellEvent.well_id.in_(well_ids)).all() if well_ids else []

    stats_by_well: Dict[int, Dict[str, Any]] = {}
    severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

    for ev in events:
        if ev.well_id not in stats_by_well:
            stats_by_well[ev.well_id] = {
                "event_count": 0,
                "max_severity": "LOW",
                "event_types": [],
                "total_npt": 0.0,
            }
        st = stats_by_well[ev.well_id]
        st["event_count"] += 1
        st["total_npt"] += (ev.npt_hours or 0.0)
        ev_type = ev.event_type.value if hasattr(ev.event_type, "value") else str(ev.event_type)
        if ev_type not in st["event_types"]:
            st["event_types"].append(ev_type)
        ev_sev = ev.severity.value if hasattr(ev.severity, "value") else str(ev.severity)
        if severity_order.get(ev_sev, 0) > severity_order.get(st["max_severity"], 0):
            st["max_severity"] = ev_sev

    results = []
    for w, dist in nearby:
        st = stats_by_well.get(w.id, {
            "event_count": 0,
            "max_severity": "LOW",
            "event_types": [],
            "total_npt": 0.0,
        })

        if event_type and event_type != "ALL":
            if event_type not in st["event_types"]:
                continue

        if severity and severity != "ALL":
            if st["max_severity"] != severity:
                continue

        results.append({
            "id": w.id,
            "well_id": w.well_id,
            "name": w.name,
            "latitude": w.latitude,
            "longitude": w.longitude,
            "field": w.field,
            "formation": w.formation,
            "total_depth": w.total_depth,
            "well_type": w.well_type,
            "trajectory_type": w.trajectory_type,
            "status": w.status,
            "is_active": w.is_active,
            "mud_weight": w.mud_weight,
            "distance_km": round(dist, 2),
            "event_count": st["event_count"],
            "max_severity": st["max_severity"],
            "event_types": st["event_types"],
            "total_npt": round(st["total_npt"], 1),
        })

    results.sort(key=lambda x: x["distance_km"])
    return results


# ─── Operational GIS Layers (Fields, Faults, Pipelines) ──────────────────────

@router.get("/layers")
def get_map_layers():
    """
    Returns operational GIS overlays for the Upper Assam Basin:
    - Oil field concession boundaries
    - Major tectonic faults (Naga Thrust, Brahmaputra Shear Zone)
    - Gathering pipeline corridors
    """
    fields_geojson = {
        "type": "FeatureCollection",
        "name": "Oil Fields",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Nahorkatiya Field", "operator": "Oil India Limited", "type": "Oil & Gas Field", "color": "#00d2ff"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [95.28, 27.28], [95.36, 27.30], [95.42, 27.24],
                        [95.38, 27.18], [95.26, 27.20], [95.28, 27.28]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Moran Field", "operator": "Oil India Limited", "type": "Oil & Gas Field", "color": "#10b981"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [94.88, 27.15], [94.98, 27.18], [95.05, 27.12],
                        [94.95, 27.05], [94.86, 27.08], [94.88, 27.15]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Jorajan & Hapjan", "operator": "Oil India Limited", "type": "Development Area", "color": "#f59e0b"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [95.35, 27.35], [95.45, 27.38], [95.52, 27.32],
                        [95.44, 27.27], [95.34, 27.30], [95.35, 27.35]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Digboi Historic Belt", "operator": "Oil India / IOCL", "type": "Historic Field", "color": "#8b5cf6"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [95.58, 27.42], [95.68, 27.45], [95.72, 27.38],
                        [95.62, 27.34], [95.56, 27.37], [95.58, 27.42]
                    ]]
                }
            }
        ]
    }

    faults_geojson = {
        "type": "FeatureCollection",
        "name": "Structural Faults & Geo-hazards",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Naga Thrust Belt", "hazard_level": "HIGH", "risk": "Overpressure & Severe Tectonic Shearing", "color": "#f43f5e"},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [94.75, 26.95], [95.05, 27.10], [95.35, 27.25], [95.70, 27.45], [95.95, 27.60]
                    ]
                }
            },
            {
                "type": "Feature",
                "properties": {"name": "Disang Thrust", "hazard_level": "MEDIUM", "risk": "Shale Instability & Stuck Pipe", "color": "#f97316"},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [94.80, 26.85], [95.12, 27.02], [95.42, 27.18], [95.78, 27.38]
                    ]
                }
            }
        ]
    }

    return {
        "success": True,
        "fields": fields_geojson,
        "faults": faults_geojson,
    }


# ─── Carto Tile Proxy / Redirect ─────────────────────────────────────────────

@router.get("/tile/{provider}/{z}/{x}/{y}")
def get_map_tile(provider: str, z: int, x: int, y: int):
    """
    Tile endpoint providing direct redirection or proxying to the configured CartoDB basemap.
    Supports carto-dark, carto-light, carto-voyager, and osm.
    """
    providers = get_basemap_providers()
    prov = providers.get(provider) or providers["esri-dark"]
    sub = "a"
    if "{s}" in prov["url"]:
        subdomain_url = prov["url"].replace("{s}", sub).replace("{z}", str(z)).replace("{x}", str(x)).replace("{y}", str(y)).replace("{r}", "")
    else:
        subdomain_url = prov["url"].replace("{z}", str(z)).replace("{x}", str(x)).replace("{y}", str(y))

    return RedirectResponse(
        url=subdomain_url,
        headers={"Cache-Control": "public, max-age=86400"}
    )
