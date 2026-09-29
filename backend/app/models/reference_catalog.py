from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CostCategory(Base):
    """Lookup list of expense categories ("статьи затрат"), managed by
    admins. Expense rows created before this catalog existed keep
    category_id = NULL rather than pointing at a placeholder row.
    """

    __tablename__ = "cost_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class IncomeCategory(Base):
    """Lookup list of income categories ("статьи доходов"), same shape and
    rules as CostCategory.
    """

    __tablename__ = "income_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
