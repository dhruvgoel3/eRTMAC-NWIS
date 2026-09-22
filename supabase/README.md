# Supabase Setup Guide — eRTMAC-NWIS

> **All data in this system is Synthetic Demo Data — Not Real OIL Data.**

---

## Prerequisites

- [Supabase account](https://supabase.com) (free tier works for this prototype)
- Project created in Supabase dashboard
- Python 3.11+ with `backend/venv` set up

---

## Step 1 — Get Your Supabase Credentials

From the Supabase dashboard for your project:

| Setting | Where to find it |
|---|---|
| `DATABASE_URL` | Settings → Database → Connection string → URI (use **Transaction** mode for pooler) |
| `SUPABASE_URL` | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Settings → API → Project API Keys → anon/public |
| `SUPABASE_SERVICE_KEY` | Settings → API → Project API Keys → service_role (keep secret!) |

---

## Step 2 — Configure Environment Variables

Copy the template and fill in your values:

```bash
# Root .env.example → .env
cp .env.example .env

# Backend .env.example → backend/.env
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# ── Supabase PostgreSQL (REQUIRED) ────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.YOURREF:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# ── Supabase REST API (for Storage and Auth features) ─────────────────────────
SUPABASE_URL=https://YOURREF.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── OpenAI API ─────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# ── App ───────────────────────────────────────────────────────────────────────
APP_ENV=development
SECRET_KEY=your-secret-key-here
```

> ⚠️ **NEVER commit `backend/.env`** — it is already in `.gitignore`.

---

## Step 3 — Run SQL Migrations

Open the **Supabase Studio SQL Editor** (`Dashboard → SQL Editor`).

Run migrations **in order**:

### 3a. Schema (required)
Copy and paste the contents of [`supabase/migrations/001_schema.sql`](./migrations/001_schema.sql) → Run.

### 3b. Row Level Security (required)
Copy and paste [`supabase/migrations/002_rls.sql`](./migrations/002_rls.sql) → Run.

### 3c. pgvector (optional — only if extension is available)

Check if pgvector is available:
```
Dashboard → Database → Extensions → search "vector"
```

If listed and enabled, run [`supabase/migrations/003_pgvector.sql`](./migrations/003_pgvector.sql).

This enables semantic vector search for AI responses with OpenAI embeddings.

### 3d. Performance Indexes (recommended)
Run [`supabase/migrations/004_indexes.sql`](./migrations/004_indexes.sql).

---

## Step 4 — Verify Tables Were Created

In Supabase Studio → Table Editor, confirm you see:

| Table | Purpose |
|---|---|
| `formations` | 10 canonical geological formations |
| `wells` | 50 synthetic wells + public dataset wells |
| `well_events` | 200+ drilling event records |
| `drilling_parameters` | 1000+ depth-series parameter records |
| `documents` | 30+ DDR, WCR, Mud Log, Cementing reports |
| `document_chunks` | RAG text chunks (with optional vector embeddings) |
| `risk_zones` | 20+ pre-computed risk zones for OIL-X123 |
| `alerts` | Real-time simulation alerts |
| `similarity_scores` | Precomputed well-to-well similarity (0–100) |
| `simulation_state` | eRTMAC simulation control state |
| `well_logs` | FORCE 2020 depth-series petrophysical logs |

---

## Step 5 — Seed the Database

After migrations are applied, seed all synthetic data:

```bash
# From project root
cd /path/to/eRTMAC-NWIS

# First, generate the canonical synthetic dataset JSON
PYTHONPATH=backend backend/venv/bin/python scripts/generate_synthetic_dataset.py

# Then seed the database from the canonical JSON
PYTHONPATH=backend backend/venv/bin/python backend/seed/seed_data.py
```

Expected output:
```
==============================================================
eRTMAC-NWIS Seed Data Generator
ALL DATA IS SYNTHETIC DEMO DATA — Not Real OIL Data
==============================================================
Creating database tables...
Seeding formations...    10 formations
Seeding wells...         50 wells
Seeding documents...     30+ documents
Seeding events...        200+ events
Seeding drilling params... 1000+ records
Seeding risk zones...    20+ risk zones
Seeding alerts...        5 alerts
Seeding simulation...    state initialized
Seeding similarity...    50 scores
Seeding chunks...        RAG chunks created
==============================================================
```

---

## Step 6 — Start the Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Verify at http://localhost:8000 — you should see the NWIS system status JSON.

API docs at http://localhost:8000/docs

---

## pgvector: Real Embedding Mode

If pgvector is enabled and `OPENAI_API_KEY` is set, run:

```bash
PYTHONPATH=backend backend/venv/bin/python scripts/embed_documents.py
```

This replaces the demo JSONB embeddings with real OpenAI text-embedding-3-small vectors (1536 dimensions), enabling true semantic RAG search.

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous API key |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key (backend only) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI assistant |
| `OPENAI_MODEL` | ❌ | Model name (default: `gpt-4o-mini`) |
| `APP_ENV` | ❌ | `development` or `production` |
| `SECRET_KEY` | ❌ | JWT signing key for auth sessions |

---

## Troubleshooting

**`DATABASE_URL not set` error:**
→ Ensure `backend/.env` exists and has the correct `DATABASE_URL`.

**`Connection refused` or timeout:**
→ Check Supabase project region. Use the **Transaction mode** pooler URL (port 6543).

**`relation "wells" does not exist`:**
→ Run `001_schema.sql` first in Supabase SQL Editor.

**RLS blocking writes:**
→ The backend uses the direct PostgreSQL connection (`DATABASE_URL`) which bypasses RLS. If using the Supabase JS client, use the service role key for writes.

**pgvector not found:**
→ Skip `003_pgvector.sql`. The system falls back to JSONB embeddings automatically.
