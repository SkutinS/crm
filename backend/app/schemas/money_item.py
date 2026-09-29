from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.reference_catalog import CostCategoryOut, IncomeCategoryOut


class MoneyItemCreate(BaseModel):
    description: str
    amount: Decimal = Decimal("0")
    category_id: int
    document_date: date = Field(default_factory=date.today)


class MoneyItemUpdate(BaseModel):
    description: str | None = None
    amount: Decimal | None = None
    category_id: int | None = None
    document_date: date | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    description: str
    amount: Decimal
    category_id: int | None
    category: CostCategoryOut | None
    document_date: date | None


class IncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    description: str
    amount: Decimal
    category_id: int | None
    category: IncomeCategoryOut | None
    document_date: date | None
