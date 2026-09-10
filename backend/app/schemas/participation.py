from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserOut


class ParticipationCreate(BaseModel):
    user_id: int
    hours: Decimal | None = None
    amount: Decimal | None = None  # if omitted, computed server-side (hourly only)


class ParticipationUpdate(BaseModel):
    hours: Decimal | None = None
    amount: Decimal | None = None


class ParticipationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    user_id: int
    hours: Decimal | None
    amount: Decimal
    user: UserOut


class ParticipationSuggestion(BaseModel):
    hours: Decimal | None
    amount: Decimal
