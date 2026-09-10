"""Seed lookup data and an initial admin user for a fresh database.

Run once after `alembic upgrade head`:
    venv/Scripts/python.exe seed.py
"""

from decimal import Decimal

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import RateType, UserRole
from app.models.settings import SystemSettings
from app.models.task_stage import TaskStage
from app.models.user import User

STAGES = [
    ("new", "Новая", 0),
    ("approval", "Согласование", 1),
    ("in_progress", "В работе", 2),
    ("done", "Готова", 3),
    ("closed_paid", "Закрыта/Оплачена", 4),
]

ADMIN_LOGIN = "admin"
ADMIN_PASSWORD = "admin123"


def main() -> None:
    db = SessionLocal()
    try:
        if db.query(TaskStage).count() == 0:
            for code, name, order in STAGES:
                db.add(TaskStage(code=code, name=name, order=order))
            print("Этапы задач созданы.")
        else:
            print("Этапы уже есть, пропуск.")

        if db.get(SystemSettings, 1) is None:
            db.add(SystemSettings(id=1))
            print("Настройки системы созданы (валюта по умолчанию — RUB).")
        else:
            print("Настройки системы уже есть, пропуск.")

        if db.query(User).filter(User.login == ADMIN_LOGIN).first() is None:
            db.add(
                User(
                    full_name="Администратор",
                    login=ADMIN_LOGIN,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role=UserRole.admin,
                    rate_type=RateType.fixed,
                    rate_amount=Decimal("0"),
                    is_active=True,
                )
            )
            print(f"Создан администратор: логин '{ADMIN_LOGIN}', пароль '{ADMIN_PASSWORD}'. Смените пароль после входа.")
        else:
            print("Администратор уже существует, пропуск.")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
