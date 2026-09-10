from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

DEFAULT_CURRENCY_CODE = "RUB"


class SystemSettings(Base):
    """Single-row table (id is always 1) holding CRM-wide settings such as
    the accounting currency — shared by everyone, not a per-user preference.
    """

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default=DEFAULT_CURRENCY_CODE)
