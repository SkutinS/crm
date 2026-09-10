from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class MoneyItemBase(BaseModel):
    description: str
    amount: Decimal = Decimal("0")


class MoneyItemCreate(MoneyItemBase):
    pass


class MoneyItemUpdate(BaseModel):
    description: str | None = None
    amount: Decimal | None = None


class MoneyItemOut(MoneyItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
