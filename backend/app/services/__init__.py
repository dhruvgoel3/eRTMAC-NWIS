# Services package
from app.services.geo import haversine_km, find_nearby_wells
from app.services.similarity import calculate_similarity, rank_similar_wells
from app.services.risk_engine import get_risk_zones_for_depth, calculate_overall_risk
from app.services.ai_service import get_ai_provider
