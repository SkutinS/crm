from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.currencies import SUPPORTED_CURRENCIES
from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
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
    )


@router.get("", response_model=SystemSettingsOut)
def get_settings(_: CurrentUser, db: Session = Depends(get_db)) -> SystemSettingsOut:
    return _to_out(_get_or_create(db))


@router.patch("", response_model=SystemSettingsOut)
def update_settings(payload: SystemSettingsUpdate, _: AdminUser, db: Session = Depends(get_db)) -> SystemSettingsOut:
    if payload.currency_code not in SUPPORTED_CURRENCIES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Неподдерживаемая валюта")
    settings = _get_or_create(db)
    settings.currency_code = payload.currency_code
    db.commit()
    db.refresh(settings)
    return _to_out(settings)
