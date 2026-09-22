"""
Database connection setup using SQLAlchemy.
Reads DATABASE_URL from environment variables with graceful fallback and URL encoding.
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
    if not url or url.startswith("sqlite"):
        return url or "sqlite:///./nwis.db"

    try:
        # Check if URL contains unencoded '@' in password
        # Format: postgresql://user:password@host:port/dbname
        if url.count("@") > 1:
            prefix, host_part = url.rsplit("@", 1)
            # prefix is postgresql://user:password
            parts = prefix.split(":", 2)
            if len(parts) == 3:
                scheme_user = f"{parts[0]}:{parts[1]}"
                raw_pass = parts[2]
                encoded_pass = urllib.parse.quote_plus(raw_pass)
                return f"{scheme_user}:{encoded_pass}@{host_part}"
        return url
    except Exception:
        return url


raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./nwis.db")
DATABASE_URL = sanitize_db_url(raw_db_url)

Base = declarative_base()
active_db_type = "sqlite"

try:
    if DATABASE_URL.startswith("postgresql"):
        # Test connection with a short timeout
        test_engine = create_engine(
            DATABASE_URL,
            connect_args={"connect_timeout": 5},
            pool_pre_ping=True,
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        engine = test_engine
        active_db_type = "supabase_postgresql"
        print("[DB] Connected successfully to Supabase PostgreSQL!")
    else:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        active_db_type = "sqlite"
        print("[DB] Connected to SQLite database.")
except Exception as e:
    print(f"[DB] Notice: Could not connect directly to PostgreSQL ({e}). Using local SQLite for zero-downtime development.")
    sqlite_url = "sqlite:///./nwis.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    active_db_type = "sqlite_fallback"

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
    }
