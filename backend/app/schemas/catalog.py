from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ServiceCatalogItemCreate(BaseModel):
    parent_id: int | None = None
    name: str
    default_price: Decimal | None = None


class ServiceCatalogItemUpdate(BaseModel):
    parent_id: int | None = None
    name: str | None = None
    default_price: Decimal | None = None


class ServiceCatalogItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int | None
    name: str
    default_price: Decimal | None


class PartCatalogItemCreate(BaseModel):
    parent_id: int | None = None
    name: str
    default_sale_price: Decimal | None = None
    default_purchase_price: Decimal | None = None


class PartCatalogItemUpdate(BaseModel):
    parent_id: int | None = None
    name: str | None = None
    default_sale_price: Decimal | None = None
    default_purchase_price: Decimal | None = None


class PartCatalogItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int | None
    name: str
    default_sale_price: Decimal | None
    default_purchase_price: Decimal | None
