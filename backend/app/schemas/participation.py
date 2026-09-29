from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.reference_catalog import CostCategoryOut
from app.schemas.user import UserOut


class ParticipationCreate(BaseModel):
    user_id: int
    hours: Decimal | None = None
    amount: Decimal | None = None  # if omitted, computed server-side (hourly only)
    paid_at: date | None = None
    comment: str | None = None
    cost_category_id: int | None = None  # if omitted, pre-filled from SystemSettings


class ParticipationUpdate(BaseModel):
    hours: Decimal | None = None
    amount: Decimal | None = None
    paid_at: date | None = None
    comment: str | None = None
    cost_category_id: int | None = None


class ParticipationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    user_id: int
    hours: Decimal | None
    amount: Decimal
    paid_at: date | None
    comment: str | None
    cost_category_id: int | None
    cost_category: CostCategoryOut | None
    user: UserOut


class ParticipationSuggestion(BaseModel):
    hours: Decimal | None
    amount: Decimal
