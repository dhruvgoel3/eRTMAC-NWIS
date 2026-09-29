import requests
import json

BASE = "http://127.0.0.1:8000"
headers = {"Authorization": "Bearer demo-engineer"}

try:
    r_reset = requests.post(f"{BASE}/api/simulation/reset", headers=headers)
    print("Reset status:", r_reset.status_code, r_reset.text)

    r_set = requests.post(f"{BASE}/api/simulation/set-depth", json={"depth": 3172.0}, headers=headers)
    print("Set depth status:", r_set.status_code, r_set.text)

    r_alerts = requests.get(f"{BASE}/api/alerts?well_id_str=OIL-X123", headers=headers)
    print("Alerts status:", r_alerts.status_code)
    alerts = r_alerts.json()
    print(f"Total alerts: {len(alerts)}")
    for a in alerts:
        print(f" - [{a.get('alert_type')}] (Depth {a.get('depth')}m, Severity: {a.get('severity')}): {a.get('message')}")
        ev = a.get("evidence")
        if ev:
            print(f"   Evidence: {json.dumps(ev, indent=2)}")
except Exception as e:
    print("Error:", e)
