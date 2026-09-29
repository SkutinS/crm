import os
import sqlite3
import psycopg
import json

from decimal import Decimal
from datetime import date, datetime, time
from uuid import UUID


# Never hardcode the prod connection string here — it's a real credential.
# Set it in the shell before running, e.g.:
#   PROD_DATABASE_URL=postgresql://user:pass@host:port/dbname
POSTGRES_URL = os.environ["PROD_DATABASE_URL"]
SQLITE_PATH = "crm.db"

TABLES = [
    "clients",
    "part_catalog_items",
    "service_catalog_items",
    "task_stages",
    "users",
    "tasks",
    "expenses",
    "incomes",
    "participations",
    "parts",
    "works",
    "task_assignments",
    "system_settings",
]


def convert_value(value):
    if value is None:
        return None

    if isinstance(value, bool):
        return int(value)

    if isinstance(value, Decimal):
        return str(value)

    if isinstance(value, (datetime, date, time)):
        return value.isoformat()

    if isinstance(value, UUID):
        return str(value)

    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)

    return value


pg = psycopg.connect(POSTGRES_URL)
pg_cursor = pg.cursor()

sq = sqlite3.connect(SQLITE_PATH)

try:
    # На время полной замены данных отключаем проверки внешних ключей.
    sq.execute("PRAGMA foreign_keys = OFF")
    sq.execute("BEGIN")

    print("Очистка локальных данных...")

    # Удаляем только таблицы, существующие на проде.
    # Новые таблицы cash_registers, cash_documents,
    # cost_categories, income_categories не трогаем.
    for table in reversed(TABLES):
        sq.execute(f'DELETE FROM "{table}"')
        print(f"  очищена {table}")

    print("\nПеренос данных с PROD...")

    for table in TABLES:
        # Колонки на PROD.
        pg_cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
            ORDER BY ordinal_position
        """, (table,))

        prod_columns = [row[0] for row in pg_cursor.fetchall()]

        # Колонки в актуальной локальной БД.
        local_columns = [
            row[1]
            for row in sq.execute(
                f'PRAGMA table_info("{table}")'
            ).fetchall()
        ]

        # Берём только колонки, существующие и там, и там.
        # Новые локальные колонки получат NULL/default.
        columns = [
            column
            for column in prod_columns
            if column in local_columns
        ]

        column_sql = ", ".join(f'"{column}"' for column in columns)
        placeholders = ", ".join("?" for _ in columns)

        pg_cursor.execute(
            f'SELECT {column_sql} FROM "{table}"'
        )

        rows = pg_cursor.fetchall()

        if rows:
            converted_rows = [
                tuple(convert_value(value) for value in row)
                for row in rows
            ]

            sq.executemany(
                f'''
                INSERT INTO "{table}" ({column_sql})
                VALUES ({placeholders})
                ''',
                converted_rows,
            )

        print(f"  {table}: {len(rows)} строк")

    print("\nПроверка количества строк...")

    errors = []

    for table in TABLES:
        pg_cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
        prod_count = pg_cursor.fetchone()[0]

        local_count = sq.execute(
            f'SELECT COUNT(*) FROM "{table}"'
        ).fetchone()[0]

        status = "OK" if prod_count == local_count else "ОШИБКА"

        print(
            f"  {table:<25} "
            f"PROD={prod_count:<5} "
            f"LOCAL={local_count:<5} "
            f"{status}"
        )

        if prod_count != local_count:
            errors.append(table)

    print("\nПроверка внешних ключей...")

    foreign_key_errors = sq.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    if foreign_key_errors:
        print("Найдены ошибки внешних ключей:")
        for error in foreign_key_errors:
            print(error)

        raise RuntimeError(
            "Перенос отменён: обнаружены нарушения внешних ключей."
        )

    if errors:
        raise RuntimeError(
            "Перенос отменён: количество строк не совпадает."
        )

    sq.commit()

    print("\n======================================")
    print("ГОТОВО")
    print("Данные PROD успешно перенесены в crm.db")
    print("Новая структура локальной БД сохранена.")
    print("Новые таблицы кассы и категорий сохранены.")
    print("======================================")

except Exception as error:
    sq.rollback()
    print("\nОШИБКА. Изменения отменены.")
    print(error)
    raise

finally:
    pg_cursor.close()
    pg.close()
    sq.close()
