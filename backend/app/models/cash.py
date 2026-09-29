from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CashDocumentType


class CashRegister(Base):
    """A physical/logical cash register. Only one row exists today — the
    whole app assumes a single register — but CashDocument already points
    at it by id so adding a second register later is just a new row plus a
    register picker in the UI, not a migration on cash_documents.
    """

    __tablename__ = "cash_registers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class CashDocument(Base):
    """A cash movement not tied to any task (e.g. an owner's capital
    contribution, an office rent payment). Task-scoped Expense/Income rows
    are NOT CashDocuments — they still count toward the register's balance,
    but purely through a read-side query (see app.services.cash), since
    there is only one register and no per-row link is needed for that.

    Exactly one of cost_category_id/income_category_id is set, matching
    doc_type — the category list depends on the document's type
    (income -> income_categories, expense -> cost_categories), so a single
    FK column can't target both tables; two nullable FKs keep real
    referential integrity for whichever one applies.
    """

    __tablename__ = "cash_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    register_id: Mapped[int] = mapped_column(ForeignKey("cash_registers.id", ondelete="RESTRICT"), nullable=False)

    doc_type: Mapped[CashDocumentType] = mapped_column(Enum(CashDocumentType), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    document_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    cost_category_id: Mapped[int | None] = mapped_column(ForeignKey("cost_categories.id", ondelete="RESTRICT"))
    income_category_id: Mapped[int | None] = mapped_column(ForeignKey("income_categories.id", ondelete="RESTRICT"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    register = relationship("CashRegister")
    cost_category = relationship("CostCategory")
    income_category = relationship("IncomeCategory")
