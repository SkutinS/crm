from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import RateType, UserRole


class UserBase(BaseModel):
    full_name: str
    login: str
    role: UserRole
    rate_type: RateType
    rate_amount: Decimal
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    login: str | None = None
    role: UserRole | None = None
    rate_type: RateType | None = None
    rate_amount: Decimal | None = None
    is_active: bool | None = None
    password: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    login: str
    role: UserRole
    rate_type: RateType
    rate_amount: Decimal
    is_active: bool
    created_at: datetime
