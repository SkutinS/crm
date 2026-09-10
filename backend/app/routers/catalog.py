from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.models.catalog import PartCatalogItem, ServiceCatalogItem
from app.schemas.catalog import (
    PartCatalogItemCreate,
    PartCatalogItemOut,
    PartCatalogItemUpdate,
    ServiceCatalogItemCreate,
    ServiceCatalogItemOut,
    ServiceCatalogItemUpdate,
)

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


def _creates_cycle(db: Session, model: type, item_id: int, new_parent_id: int) -> bool:
    """True if setting item_id's parent to new_parent_id would put item_id
    in its own ancestor chain (walks up from new_parent_id to the root).
    """
    current_id: int | None = new_parent_id
    while current_id is not None:
        if current_id == item_id:
            return True
        current_id = db.scalar(select(model.parent_id).where(model.id == current_id))
    return False


# ---- Services ----


@router.get("/services", response_model=list[ServiceCatalogItemOut])
def list_service_catalog(_: CurrentUser, db: Session = Depends(get_db)) -> list[ServiceCatalogItem]:
    return list(db.scalars(select(ServiceCatalogItem).order_by(ServiceCatalogItem.name)))


@router.post("/services", response_model=ServiceCatalogItemOut, status_code=status.HTTP_201_CREATED)
def create_service_catalog_item(
    payload: ServiceCatalogItemCreate, _: AdminUser, db: Session = Depends(get_db)
) -> ServiceCatalogItem:
    if payload.parent_id is not None and db.get(ServiceCatalogItem, payload.parent_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Родительская категория не найдена")
    item = ServiceCatalogItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/services/{item_id}", response_model=ServiceCatalogItemOut)
def update_service_catalog_item(
    item_id: int, payload: ServiceCatalogItemUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> ServiceCatalogItem:
    item = db.get(ServiceCatalogItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Позиция справочника не найдена")
    data = payload.model_dump(exclude_unset=True)
    if "parent_id" in data and data["parent_id"] is not None:
        if db.get(ServiceCatalogItem, data["parent_id"]) is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Родительская категория не найдена")
        if _creates_cycle(db, ServiceCatalogItem, item_id, data["parent_id"]):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Нельзя переместить категорию в саму себя или в её потомка")
    for field, value in data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/services/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_catalog_item(item_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    item = db.get(ServiceCatalogItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Позиция справочника не найдена")
    has_children = db.scalar(select(ServiceCatalogItem.id).where(ServiceCatalogItem.parent_id == item_id).limit(1))
    if has_children is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Сначала удалите вложенные позиции")
    db.delete(item)
    db.commit()


# ---- Parts ----


@router.get("/parts", response_model=list[PartCatalogItemOut])
def list_part_catalog(_: CurrentUser, db: Session = Depends(get_db)) -> list[PartCatalogItem]:
    return list(db.scalars(select(PartCatalogItem).order_by(PartCatalogItem.name)))


@router.post("/parts", response_model=PartCatalogItemOut, status_code=status.HTTP_201_CREATED)
def create_part_catalog_item(
    payload: PartCatalogItemCreate, _: AdminUser, db: Session = Depends(get_db)
) -> PartCatalogItem:
    if payload.parent_id is not None and db.get(PartCatalogItem, payload.parent_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Родительская категория не найдена")
    item = PartCatalogItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/parts/{item_id}", response_model=PartCatalogItemOut)
def update_part_catalog_item(
    item_id: int, payload: PartCatalogItemUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> PartCatalogItem:
    item = db.get(PartCatalogItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Позиция справочника не найдена")
    data = payload.model_dump(exclude_unset=True)
    if "parent_id" in data and data["parent_id"] is not None:
        if db.get(PartCatalogItem, data["parent_id"]) is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Родительская категория не найдена")
        if _creates_cycle(db, PartCatalogItem, item_id, data["parent_id"]):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Нельзя переместить категорию в саму себя или в её потомка")
    for field, value in data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/parts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part_catalog_item(item_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    item = db.get(PartCatalogItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Позиция справочника не найдена")
    has_children = db.scalar(select(PartCatalogItem.id).where(PartCatalogItem.parent_id == item_id).limit(1))
    if has_children is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Сначала удалите вложенные позиции")
    db.delete(item)
    db.commit()
