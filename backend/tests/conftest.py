import os
import urllib.parse

# --- TEST ISOLATION SAFEGUARD ---
# Must occur before importing ANY application modules to prevent accidental
# engine initialization against development/production databases.

test_db_url = os.environ.get("TEST_DATABASE_URL")
if not test_db_url:
    raise RuntimeError("ABORT: TEST_DATABASE_URL environment variable is required for tests.")

# Parse URL to inspect the database name and host safely
parsed_url = urllib.parse.urlparse(test_db_url)

valid_schemes = {"postgresql", "postgresql+psycopg", "postgresql+psycopg2", "postgresql+asyncpg"}
if parsed_url.scheme not in valid_schemes:
    raise RuntimeError("ABORT: TEST_DATABASE_URL must be a PostgreSQL connection string.")

valid_hosts = {"localhost", "127.0.0.1", "::1"}
if parsed_url.hostname not in valid_hosts:
    raise RuntimeError("ABORT: TEST_DATABASE_URL must point to a local database host for safety.")

db_name = parsed_url.path.lstrip('/') if parsed_url.path else ""

forbidden_dbs = {"legal_compliance_db", "legal_compliance_test_db", "sqlite.db", "postgres"}
if db_name in forbidden_dbs:
    raise RuntimeError(f"ABORT: TEST_DATABASE_URL points to a protected database name: {db_name}")

if "isolated_test_db" not in db_name:
    raise RuntimeError(f"ABORT: Database name must contain 'isolated_test_db'. Current: {db_name}")

# Override DATABASE_URL so that when app.database is imported, it uses the isolated DB.
os.environ["DATABASE_URL"] = test_db_url

# Now it is safe to import app modules
import pytest
from app.database import engine
from app.models.base import Base

# No automated drop_all / create_all is performed here to prevent destructive actions
# and to respect Alembic's role in schema creation.
