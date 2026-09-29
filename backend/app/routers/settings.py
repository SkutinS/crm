from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.currencies import SUPPORTED_CURRENCIES
from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.models.reference_catalog import CostCategory
from app.models.settings import SystemSettings
from app.schemas.settings import SystemSettingsOut, SystemSettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_or_create(db: Session) -> SystemSettings:
    settings = db.get(SystemSettings, 1)
    if settings is None:
        settings = SystemSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _to_out(settings: SystemSettings) -> SystemSettingsOut:
    return SystemSettingsOut(
        currency_code=settings.currency_code,
        currency_symbol=SUPPORTED_CURRENCIES.get(settings.currency_code, settings.currency_code),
        default_salary_cost_category_id=settings.default_salary_cost_category_id,
    )


@router.get("", response_model=SystemSettingsOut)
def get_settings(_: CurrentUser, db: Session = Depends(get_db)) -> SystemSettingsOut:
    return _to_out(_get_or_create(db))


@router.patch("", response_model=SystemSettingsOut)
def update_settings(payload: SystemSettingsUpdate, _: AdminUser, db: Session = Depends(get_db)) -> SystemSettingsOut:
    settings = _get_or_create(db)
    data = payload.model_dump(exclude_unset=True)

    if "currency_code" in data:
        if data["currency_code"] not in SUPPORTED_CURRENCIES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Неподдерживаемая валюта")
        settings.currency_code = data["currency_code"]

    if "default_salary_cost_category_id" in data:
        category_id = data["default_salary_cost_category_id"]
        if category_id is not None:
            category = db.get(CostCategory, category_id)
            if category is None:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Статья затрат не найдена")
            if not category.is_active:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Статья затрат неактивна")
        settings.default_salary_cost_category_id = category_id

    db.commit()
    db.refresh(settings)
    return _to_out(settings)
