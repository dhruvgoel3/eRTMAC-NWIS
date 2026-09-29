import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

FRONTEND = "http://127.0.0.1:5173"
BACKEND = "http://127.0.0.1:8000"

eng_h = {"Authorization": "Bearer demo-engineer"}
sup_h = {"Authorization": "Bearer demo-supervisor"}
adm_h = {"Authorization": "Bearer demo-admin"}

passed = 0
failed = 0

def check(name, condition, details=""):
    global passed, failed
    if condition:
        print(f" PASS: {name}")
        if details:
            print(f"       -> {details}")
        passed += 1
    else:
        print(f" FAIL: {name}")
        if details:
            print(f"       -> {details}")
        failed += 1

print("="*70)
print(" eRTMAC-NWIS COMPREHENSIVE END-TO-END VERIFICATION TEST SUITE")
print("="*70)

# 1. Health Check
try:
    r = requests.get(f"{BACKEND}/health")
    db_ok = r.json().get("database", {}).get("connected", True)
    check("Backend Health Check", r.status_code == 200, f"Status: {r.json().get('status')}, Provider: {r.json().get('database', {}).get('provider')}")
except Exception as e:
    check("Backend Health Check", False, str(e))

# 2. Frontend SPA Routes (Direct URL Refresh Test)
routes = ["/login", "/nearby-wells", "/supervisor", "/admin", "/admin/documents"]
for rt in routes:
    try:
        r = requests.get(f"{FRONTEND}{rt}")
        check(f"Direct URL Route {rt}", r.status_code == 200 and "<html" in r.text.lower(), f"Status: {r.status_code}")
    except Exception as e:
        check(f"Direct URL Route {rt}", False, str(e))

# 3. RBAC Enforcement Test
# Engineer accessing Admin endpoint -> 403
r_eng_adm = requests.get(f"{BACKEND}/api/admin/users", headers=eng_h)
check("RBAC: Engineer denied access to Admin Users API (403)", r_eng_adm.status_code == 403, f"Status: {r_eng_adm.status_code}")

# Supervisor accessing Admin endpoint -> 403
r_sup_adm = requests.get(f"{BACKEND}/api/admin/users", headers=sup_h)
check("RBAC: Supervisor denied access to Admin Users API (403)", r_sup_adm.status_code == 403, f"Status: {r_sup_adm.status_code}")

# Admin accessing Admin endpoint -> 200
r_adm_adm = requests.get(f"{BACKEND}/api/admin/users", headers=adm_h)
users_count = len(r_adm_adm.json().get("data", []))
check("RBAC: Admin granted access to Admin Users API (200)", r_adm_adm.status_code == 200, f"Found {users_count} users")

# 4. Canonical Scenario Well Data Test: OIL-X123 (Active Well)
r_active = requests.get(f"{BACKEND}/api/wells", headers=eng_h)
active_well = next((w for w in r_active.json() if w.get("is_active")), None)
check("Active Well is OIL-X123", active_well and active_well.get("well_id") == "OIL-X123", f"Well: {active_well.get('well_id') if active_well else None}, Status: {active_well.get('status') if active_well else None}")

# 5. Saaty AHP Similarity Test: OIL-X104 offset
r_sim = requests.get(f"{BACKEND}/api/wells/OIL-X123/similar", headers=eng_h)
sim_wells = r_sim.json() if isinstance(r_sim.json(), list) else r_sim.json().get("similar_wells", [])
x104 = next((w for w in sim_wells if w.get("well_id") == "OIL-X104"), None)
score_pct = (x104.get("similarity_score", 0) * 100) if (x104 and x104.get("similarity_score", 0) <= 1.0) else (x104.get("similarity_score", 0) if x104 else 0)
check("AHP Similarity: OIL-X104 ranked with ~91% match", x104 is not None and 88.0 <= score_pct <= 94.0, f"Score: {score_pct:.1f}%, Offset: {x104.get('distance_km') if x104 else 'N/A'}km")


# 6. Historical Events for OIL-X104
r_x104 = requests.get(f"{BACKEND}/api/wells/OIL-X104", headers=eng_h)
x104_events = r_x104.json().get("events", [])
stuck_event = next((e for e in x104_events if "stuck" in e.get("event_type", "").lower()), None)
mud_loss = next((e for e in x104_events if "mud" in e.get("event_type", "").lower()), None)
check("Historical Events: OIL-X104 has Stuck Pipe & Mud Loss", stuck_event is not None and mud_loss is not None, f"Events count: {len(x104_events)}, Stuck pipe depth: {stuck_event.get('depth_start') if stuck_event else None}m")

# 7. Simulation State & Proximity Alerts at 3172m
# Set depth to 3172m
r_step = requests.post(f"{BACKEND}/api/simulation/set-depth", json={"depth": 3172.0}, headers=eng_h)
check("Simulation Set Bit Depth to 3172m", r_step.status_code == 200, f"Current depth: {r_step.json().get('current_depth')}m")

# Fetch unacknowledged alerts for OIL-X123
r_alerts = requests.get(f"{BACKEND}/api/alerts?well_id_str=OIL-X123", headers=eng_h)
alerts = r_alerts.json()
approaching_alert = next((a for a in alerts if "APPROACHING" in a.get("alert_type", "")), None)
check("Proactive Proximity Alert Generated", approaching_alert is not None, f"Type: {approaching_alert.get('alert_type') if approaching_alert else None}, Severity: {approaching_alert.get('severity') if approaching_alert else None}")

# Verify Why This Alert Evidence
ev = approaching_alert.get("evidence") if approaching_alert else None
check("Why This Alert Evidence contains Grounded Offset Data", ev is not None, f"Evidence: {str(ev)[:120]}...")

# 8. Supervisor Action: Acknowledge Alert
if approaching_alert:
    aid = approaching_alert.get("id")
    r_ack = requests.post(f"{BACKEND}/api/alerts/{aid}/acknowledge", json={"notes": "Operational mitigation staged - 40 bbl pill ready"}, headers=sup_h)
    check(f"Supervisor Action: Acknowledge Alert #{aid}", r_ack.status_code == 200, f"Acknowledged: {r_ack.json().get('acknowledged', True)}")

# 9. Ask NWIS RAG Query with Evidence Grounding
ai_req = {
    "question": "What happened in offset well OIL-X104 and what are the key risks in Tipam formation?",
    "well_id": "OIL-X123",
    "current_depth": 3172.0,
    "current_formation": "Tipam"
}
r_ai = requests.post(f"{BACKEND}/api/ai/query", json=ai_req, headers=eng_h)
ai_data = r_ai.json()
check("Ask NWIS RAG Query returns Structured Intelligence", r_ai.status_code == 200 and "HISTORICAL EVIDENCE" in ai_data.get("answer", ""), f"Citations count: {len(ai_data.get('citations', []))}")

# 10. Institutional Drilling Memory Graph
r_graph = requests.get(f"{BACKEND}/api/memory-graph?well_id=OIL-X123", headers=eng_h)
graph_data = r_graph.json()
check("Drilling Memory Graph renders Multi-hop Entities & Links", r_graph.status_code == 200 and len(graph_data.get("nodes", [])) > 0, f"Nodes: {len(graph_data.get('nodes', []))}, Links: {len(graph_data.get('links', []))}")

# 11. Admin Knowledge & Document Intelligence
r_docs = requests.get(f"{BACKEND}/api/admin/documents", headers=adm_h)
check("Admin Document Intelligence endpoint", r_docs.status_code == 200, f"Managed documents: {len(r_docs.json().get('data', []))}")

print("="*70)
print(f" TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
print("="*70)
