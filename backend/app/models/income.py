from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Income(Base):
    __tablename__ = "incomes"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("income_categories.id", ondelete="RESTRICT"))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    document_date: Mapped[date | None] = mapped_column(Date)

    task = relationship("Task", back_populates="incomes")
    category = relationship("IncomeCategory")
