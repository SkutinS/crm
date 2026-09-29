import os
import psycopg
import sqlite3

# Never hardcode the prod connection string here — it's a real credential.
# Set it in the shell before running, e.g.:
#   PROD_DATABASE_URL=postgresql://user:pass@host:port/dbname
pg = psycopg.connect(os.environ["PROD_DATABASE_URL"])
pg_cur = pg.cursor()

sq = sqlite3.connect("crm.db")

prod_tables = {
    r[0]
    for r in pg_cur.execute("""
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    """).fetchall()
}

local_tables = {
    r[0]
    for r in sq.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
    """).fetchall()
}

common_tables = sorted(prod_tables & local_tables)

for table in common_tables:
    if table == "alembic_version":
        continue

    pg_cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
    """, (table,))
    prod_columns = [r[0] for r in pg_cur.fetchall()]

    local_columns = [
        r[1]
        for r in sq.execute(f'PRAGMA table_info("{table}")').fetchall()
    ]

    only_prod = [c for c in prod_columns if c not in local_columns]
    only_local = [c for c in local_columns if c not in prod_columns]

    print(f"\n{table}")
    print("  PROD ONLY :", only_prod)
    print("  LOCAL ONLY:", only_local)

pg.close()
sq.close()
