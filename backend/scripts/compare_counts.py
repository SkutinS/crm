import os
import psycopg
import sqlite3

# Never hardcode the prod connection string here — it's a real credential.
# Set it in the shell before running, e.g.:
#   PROD_DATABASE_URL=postgresql://user:pass@host:port/dbname
pg = psycopg.connect(os.environ["PROD_DATABASE_URL"])
pg_cur = pg.cursor()

sq = sqlite3.connect("crm.db")

tables = [
    "clients",
    "expenses",
    "incomes",
    "part_catalog_items",
    "participations",
    "parts",
    "service_catalog_items",
    "system_settings",
    "task_assignments",
    "task_stages",
    "tasks",
    "users",
    "works",
]

print("TABLE                     PROD    LOCAL")
print("----------------------------------------")

for table in tables:
    pg_cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    prod_count = pg_cur.fetchone()[0]

    local_count = sq.execute(
        f'SELECT COUNT(*) FROM "{table}"'
    ).fetchone()[0]

    print(f"{table:<25} {prod_count:<7} {local_count}")

print("\nNEW LOCAL TABLES:")
for table in [
    "cash_documents",
    "cash_registers",
    "cost_categories",
    "income_categories",
]:
    count = sq.execute(
        f'SELECT COUNT(*) FROM "{table}"'
    ).fetchone()[0]
    print(f"{table:<25} {count}")

pg.close()
sq.close()
