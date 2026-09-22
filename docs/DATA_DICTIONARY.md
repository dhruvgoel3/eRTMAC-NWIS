# eRTMAC-NWIS — Data Dictionary

## Database Tables

---

### `wells`

Core well registry. Each row represents one wellbore.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | INTEGER PK | Internal surrogate key | 1 |
| `well_id` | VARCHAR(50) | Business key (unique) | `OIL-X123`, `FORCE-15/9-13` |
| `name` | VARCHAR(100) | Display name | `Oil India Well X123` |
| `latitude` | FLOAT | WGS84 decimal degrees | 27.2 |
| `longitude` | FLOAT | WGS84 decimal degrees | 95.1 |
| `field` | VARCHAR(100) | Field or area name | `Assam Block A` |
| `formation` | VARCHAR(100) | Primary reservoir formation | `Tipam Sandstone` |
| `total_depth` | FLOAT | Total measured depth (meters) | 3850.0 |
| `well_type` | VARCHAR(50) | Exploratory / Development / Injection | `Development` |
| `trajectory_type` | VARCHAR(50) | VERTICAL / DIRECTIONAL / HORIZONTAL | `DIRECTIONAL` |
| `spud_date` | DATETIME | Date drilling started | `2019-03-15` |
| `completion_date` | DATETIME | Date well completed | `2019-08-22` |
| `status` | VARCHAR(50) | ACTIVE / COMPLETED / SUSPENDED / ABANDONED | `COMPLETED` |
| `is_active` | BOOLEAN | True for the current drilling well | `false` |
| `mud_weight` | FLOAT | Mud weight in ppg (pounds per gallon) | 11.5 |
| `casing_program` | TEXT | Pipe sizes and depths | `20in @ 800m \| 13-3/8in @ 2100m` |
| `cementing_notes` | TEXT | Cementing design notes | — |
| `lessons_learned` | TEXT | Post-well lessons | — |
| `operator` | VARCHAR(100) | Operating company | `Oil India Limited` |
| `source_dataset` | VARCHAR(50) | Provenance code (see below) | `FORCE_2020` |
| `license` | VARCHAR(100) | Data license | `NLOD 2.0 / CC-BY-4.0` |
| `country` | VARCHAR(50) | Country of operation | `Norway` |
| `basin` | VARCHAR(100) | Sedimentary basin | `Norwegian North Sea` |
| `x_coord` | FLOAT | UTM Easting (meters) | 435210.0 |
| `y_coord` | FLOAT | UTM Northing (meters) | 6478920.0 |
| `lithology` | VARCHAR(100) | Dominant lithology | `Sandstone` |
| `created_at` | DATETIME | Record creation timestamp | — |

#### `source_dataset` Values

| Code | Description | License |
|------|-------------|---------|
| `OIL_SYNTHETIC` | Synthetic demo data (Assam Basin) | Proprietary / Synthetic |
| `FORCE_2020` | FORCE 2020 ML Benchmark (NPD/Zenodo) | NLOD 2.0 / CC-BY-4.0 |
| `EQUINOR_VOLVE` | Equinor Volve Open Dataset | Equinor Open / CC-BY-4.0 |

---

### `well_events`

Historical drilling incidents and notable events.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | INTEGER PK | Surrogate key | 1 |
| `well_id` | INTEGER FK → wells.id | Parent well | 5 |
| `event_type` | VARCHAR(50) | Event classification (see below) | `STUCK_PIPE` |
| `severity` | VARCHAR(20) | LOW / MEDIUM / HIGH / CRITICAL | `HIGH` |
| `depth_start` | FLOAT | Start depth of event (meters) | 3100.0 |
| `depth_end` | FLOAT | End depth of event (meters) | 3250.0 |
| `formation` | VARCHAR(100) | Formation where event occurred | `Barail Fm.` |
| `description` | TEXT | Detailed event description | — |
| `root_cause` | TEXT | Identified root cause | — |
| `mitigation` | TEXT | Action taken to resolve | — |
| `npt_hours` | FLOAT | Non-productive time in hours | 18.5 |
| `confidence` | FLOAT | Record confidence 0.0–1.0 | 0.95 |
| `event_date` | DATETIME | Date event occurred | `2019-06-12` |
| `source_dataset` | VARCHAR(50) | Provenance code | `OIL_SYNTHETIC` |
| `document_id` | INTEGER FK → documents.id | Source DDR/WCR reference | — |
| `created_at` | DATETIME | Record creation timestamp | — |

#### `event_type` Values

| Code | Description |
|------|-------------|
| `MUD_LOSS` | Lost circulation / mud returns loss |
| `STUCK_PIPE` | Drill string stuck (differential or mechanical) |
| `KICK` | Wellbore influx / kick detected |
| `TORQUE_SPIKE` | Sudden torque increase indicating sticking or BHA issue |
| `OVERPRESSURE` | Abnormally high formation pressure |
| `CEMENTING_ISSUE` | Failed cement job or micro-annulus |
| `FISHING` | Fish retrieval operation (lost BHA/tools) |
| `NPT` | Non-productive time (general) |
| `LITHOLOGY_TRANSITION` | Entry into a new formation/lithology interval |
| `OTHER` | Miscellaneous event |

---

### `well_logs`

Depth-series well log measurements (one row per depth station per well).

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | INTEGER PK | Surrogate key | 1 |
| `well_id` | INTEGER FK → wells.id | Parent well | 12 |
| `depth_md` | FLOAT | Measured depth (meters) | 2500.0 |
| `depth_tvd` | FLOAT | True vertical depth (meters) | 2450.0 |
| `formation` | VARCHAR(100) | Formation at this depth | `Hugin Fm.` |
| `lithology_code` | INTEGER | FORCE 2020 lithofacies code | 30000 |
| `lithology_name` | VARCHAR(100) | Human-readable lithology | `Sandstone` |
| `gr` | FLOAT | Gamma Ray (API units) | 65.2 |
| `rhob` | FLOAT | Bulk Density (g/cm³) | 2.45 |
| `nphi` | FLOAT | Neutron Porosity (fraction) | 0.22 |
| `rdep` | FLOAT | Deep Resistivity (ohm·m) | 2.15 |
| `pef` | FLOAT | Photoelectric Factor | 3.5 |
| `dtc` | FLOAT | Compressional Sonic (μs/ft) | 88.4 |
| `source_dataset` | VARCHAR(50) | Provenance code | `FORCE_2020` |
| `created_at` | DATETIME | Record creation timestamp | — |

#### FORCE 2020 Lithofacies Codes

| Code | Lithology |
|------|-----------|
| 30000 | Sandstone |
| 65030 | Sandstone/Shale |
| 65000 | Shale |
| 80000 | Marl |
| 74000 | Dolomite |
| 70000 | Limestone |
| 70032 | Chalk |
| 88000 | Halite |
| 86000 | Anhydrite |
| 99000 | Tuff |
| 90000 | Coal |
| 93000 | Basement |

---

### `risk_zones`

Pre-computed depth-interval risk zones for the active well.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Surrogate key |
| `active_well_id` | INTEGER FK → wells.id | The well being drilled |
| `event_type` | VARCHAR(50) | Risk type (from well_events) |
| `depth_start` | FLOAT | Risk zone start depth (m) |
| `depth_end` | FLOAT | Risk zone end depth (m) |
| `formation` | VARCHAR(100) | Formation in this zone |
| `risk_score` | FLOAT | Computed risk 0–100 |
| `severity` | VARCHAR(20) | LOW / MEDIUM / HIGH / CRITICAL |
| `evidence_count` | INTEGER | Number of historical events supporting this |
| `explanation` | TEXT | Human-readable explanation |
| `source_well_ids` | JSON | List of offset well IDs with matching events |

---

### `alerts`

Real-time alerts generated as the simulation depth progresses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Surrogate key |
| `well_id` | INTEGER FK → wells.id | Active well |
| `alert_type` | VARCHAR(50) | RISK_APPROACHING / RISK_ENTERED / SIMILARITY_HIGH |
| `severity` | VARCHAR(20) | LOW / MEDIUM / HIGH / CRITICAL |
| `depth` | FLOAT | Depth when alert triggered |
| `message` | TEXT | Alert summary message |
| `explanation` | TEXT | Full alert context |
| `evidence` | JSON | Historical evidence items |
| `acknowledged` | BOOLEAN | Whether engineer has dismissed it |
| `created_at` | DATETIME | When alert was generated |

---

### `drilling_parameters`

Time-series drilling parameter records (one row per telemetry tick).

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| `depth` | FLOAT | m | Measured depth |
| `rop` | FLOAT | m/hr | Rate of penetration |
| `wob` | FLOAT | tonnes | Weight on bit |
| `rpm` | FLOAT | rev/min | Rotary speed |
| `torque` | FLOAT | kN·m | Surface torque |
| `pressure` | FLOAT | psi | Standpipe pressure |
| `mud_flow` | FLOAT | lpm | Mud flow rate |
| `hook_load` | FLOAT | tonnes | Hook load |
| `inclination` | FLOAT | degrees | Wellbore inclination |
| `azimuth` | FLOAT | degrees | Wellbore azimuth |
| `mud_weight` | FLOAT | ppg | Active mud weight |

---

## Canonical Well IDs

| ID Pattern | Source | Example |
|-----------|--------|---------|
| `OIL-X###` | OIL Synthetic | `OIL-X123` (active), `OIL-X101` |
| `FORCE-##/##-##` | FORCE 2020 NPD | `FORCE-15/9-13` |
| `VOLVE-##/##-F-##` | Equinor Volve | `VOLVE-15/9-F-12` |

---

## UTM to WGS84 Conversion

North Sea wells are stored with UTM Zone 31N (EPSG:32631) coordinates. The pipeline
converts these to WGS84 using `scripts/geo_utils.py`:

```python
from geo_utils import utm_to_latlon
lat, lon = utm_to_latlon(easting=435210.0, northing=6478920.0, zone=31)
# → (58.446168, 1.890022)
```

Accuracy: < 0.5 meters from the true WGS84 position.
