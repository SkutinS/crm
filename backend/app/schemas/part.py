from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PartBase(BaseModel):
    catalog_item_id: int | None = None
    name: str
    quantity: Decimal = Decimal("1")
    price_per_unit: Decimal = Decimal("0")
    purchase_price: Decimal = Decimal("0")


class PartCreate(PartBase):
    pass


class PartUpdate(BaseModel):
    catalog_item_id: int | None = None
    name: str | None = None
    quantity: Decimal | None = None
    price_per_unit: Decimal | None = None
    purchase_price: Decimal | None = None


class PartOut(PartBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    amount: Decimal
    margin: Decimal
