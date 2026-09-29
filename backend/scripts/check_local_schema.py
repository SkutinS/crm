import sqlite3

tables = [
    "expenses",
    "incomes",
    "participations",
    "parts",
    "users",
]

sq = sqlite3.connect("crm.db")

for table in tables:
    print(f"\n=== {table} ===")
    for row in sq.execute(f'PRAGMA table_info("{table}")'):
        print(row)

sq.close()
