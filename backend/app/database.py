"""
Database connection setup using SQLAlchemy.
EXCLUSIVELY connects to Supabase PostgreSQL.
No local SQLite or external databases used.
"""
import os
import urllib.parse
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Try loading from backend/.env or root .env
env_paths = [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path(".env"),
    Path("backend/.env"),
]
for p in env_paths:
    if p.is_file():
        load_dotenv(p)
        break
else:
    load_dotenv()


def sanitize_db_url(url: str) -> str:
    """Safely URL-encodes passwords with special characters in PostgreSQL URLs."""
    if not url:
        return ""

    try:
        # Check if URL contains unencoded '@' in password
        # Format: postgresql://user:password@host:port/dbname
        if url.count("@") > 1:
            prefix, host_part = url.rsplit("@", 1)
            parts = prefix.split(":", 2)
            if len(parts) == 3:
                scheme_user = f"{parts[0]}:{parts[1]}"
                raw_pass = parts[2]
                encoded_pass = urllib.parse.quote_plus(raw_pass)
                return f"{scheme_user}:{encoded_pass}@{host_part}"
        return url
    except Exception:
        return url


raw_db_url = os.getenv("DATABASE_URL", "")
if not raw_db_url:
    raise RuntimeError("[Supabase DB Error] DATABASE_URL is not set in backend/.env. Supabase is the mandatory database.")

DATABASE_URL = sanitize_db_url(raw_db_url)
Base = declarative_base()

# Exclusively connect to Supabase PostgreSQL
try:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"connect_timeout": 15},
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    with engine.connect() as conn:
        conn.execute(text("SELECT 1;"))
    print("[DB] Connected successfully and exclusively to Supabase PostgreSQL!")
    active_db_type = "supabase_postgresql"
except Exception as e:
    print(f"[Supabase DB Fatal Error] Failed to connect to Supabase PostgreSQL: {e}")
    raise RuntimeError(f"Could not establish connection to Supabase PostgreSQL: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency injection for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_info():
    return {
        "db_type": active_db_type,
        "engine_url": str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url),
        "provider": "Supabase",
    }
