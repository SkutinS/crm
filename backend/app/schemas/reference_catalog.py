from pydantic import BaseModel, ConfigDict


class CostCategoryCreate(BaseModel):
    name: str
    is_active: bool = True


class CostCategoryUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class CostCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool


class IncomeCategoryCreate(BaseModel):
    name: str
    is_active: bool = True


class IncomeCategoryUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class IncomeCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
