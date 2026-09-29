from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CashDocumentType


class CashDocumentCreate(BaseModel):
    doc_type: CashDocumentType
    amount: Decimal = Decimal("0")
    document_date: date = Field(default_factory=date.today)
    description: str | None = None
    cost_category_id: int | None = None
    income_category_id: int | None = None


class CashDocumentUpdate(BaseModel):
    amount: Decimal | None = None
    document_date: date | None = None
    description: str | None = None
    cost_category_id: int | None = None
    income_category_id: int | None = None


class CashDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    register_id: int
    doc_type: CashDocumentType
    amount: Decimal
    document_date: date
    description: str | None
    cost_category_id: int | None
    income_category_id: int | None
    created_at: datetime


class CashJournalTaskRef(BaseModel):
    id: int
    title: str


class CashJournalEntry(BaseModel):
    """One row in the cash journal — either a standalone CashDocument or a
    task-scoped Expense/Income, normalized to the same shape for display.
    `source_id` + `source` identify the underlying row for edit/delete
    (only `cash_document` entries support those; task-scoped entries are
    edited from the task itself).
    """

    source: Literal["cash_document", "task_expense", "task_income"]
    source_id: int
    doc_type: CashDocumentType
    amount: Decimal
    document_date: date | None
    description: str | None
    category_name: str | None
    cost_category_id: int | None = None
    income_category_id: int | None = None
    task: CashJournalTaskRef | None = None


class CashSummary(BaseModel):
    balance: Decimal
    entries: list[CashJournalEntry]
