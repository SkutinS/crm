from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

DEFAULT_CURRENCY_CODE = "RUB"


class SystemSettings(Base):
    """Single-row table (id is always 1) holding CRM-wide settings such as
    the accounting currency — shared by everyone, not a per-user preference.
    """

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default=DEFAULT_CURRENCY_CODE)
    # Pre-fills new Participation rows' cost_category_id (see
    # app.routers.tasks.add_participation) — purely a default for new rows,
    # never rewrites rows that already picked up an earlier value.
    default_salary_cost_category_id: Mapped[int | None] = mapped_column(
        ForeignKey("cost_categories.id", ondelete="SET NULL")
    )

    default_salary_cost_category = relationship("CostCategory")
