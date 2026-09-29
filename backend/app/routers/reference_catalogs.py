from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.models.reference_catalog import CostCategory, IncomeCategory
from app.schemas.reference_catalog import (
    CostCategoryCreate,
    CostCategoryOut,
    CostCategoryUpdate,
    IncomeCategoryCreate,
    IncomeCategoryOut,
    IncomeCategoryUpdate,
)

router = APIRouter(prefix="/api", tags=["reference-catalogs"])


# ---- Cost categories ("статьи затрат") ----


@router.get("/cost-categories", response_model=list[CostCategoryOut])
def list_cost_categories(_: CurrentUser, db: Session = Depends(get_db)) -> list[CostCategory]:
    return list(db.scalars(select(CostCategory).order_by(CostCategory.name)))


@router.post("/cost-categories", response_model=CostCategoryOut, status_code=status.HTTP_201_CREATED)
def create_cost_category(payload: CostCategoryCreate, _: AdminUser, db: Session = Depends(get_db)) -> CostCategory:
    category = CostCategory(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/cost-categories/{category_id}", response_model=CostCategoryOut)
def update_cost_category(
    category_id: int, payload: CostCategoryUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> CostCategory:
    category = db.get(CostCategory, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Статья затрат не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


# ---- Income categories ("статьи доходов") ----


@router.get("/income-categories", response_model=list[IncomeCategoryOut])
def list_income_categories(_: CurrentUser, db: Session = Depends(get_db)) -> list[IncomeCategory]:
    return list(db.scalars(select(IncomeCategory).order_by(IncomeCategory.name)))


@router.post("/income-categories", response_model=IncomeCategoryOut, status_code=status.HTTP_201_CREATED)
def create_income_category(
    payload: IncomeCategoryCreate, _: AdminUser, db: Session = Depends(get_db)
) -> IncomeCategory:
    category = IncomeCategory(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/income-categories/{category_id}", response_model=IncomeCategoryOut)
def update_income_category(
    category_id: int, payload: IncomeCategoryUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> IncomeCategory:
    category = db.get(IncomeCategory, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Статья доходов не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category
