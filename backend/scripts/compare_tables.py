import os
import psycopg
import sqlite3

# Never hardcode the prod connection string here — it's a real credential.
# Set it in the shell before running, e.g.:
#   PROD_DATABASE_URL=postgresql://user:pass@host:port/dbname
pg = psycopg.connect(os.environ["PROD_DATABASE_URL"])

cur = pg.cursor()
cur.execute("""
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
""")

print("PROD TABLES:")
for row in cur.fetchall():
    print(row[0])

pg.close()

print("\nLOCAL TABLES:")

sq = sqlite3.connect("crm.db")

for row in sq.execute("""
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
"""):
    print(row[0])

sq.close()
