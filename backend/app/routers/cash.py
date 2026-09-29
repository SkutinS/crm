from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CashUser
from app.models.cash import CashDocument, CashRegister
from app.models.enums import CashDocumentType
from app.models.reference_catalog import CostCategory, IncomeCategory
from app.schemas.cash import CashDocumentCreate, CashDocumentOut, CashDocumentUpdate, CashSummary
from app.services.cash import cash_balance_from_entries, cash_journal

router = APIRouter(prefix="/api/cash", tags=["cash"])


def _get_register(db: Session) -> CashRegister:
    register = db.scalar(select(CashRegister).limit(1))
    if register is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Касса не настроена")
    return register


def _validate_category(db: Session, payload_type: CashDocumentType, cost_category_id: int | None, income_category_id: int | None) -> None:
    if payload_type == CashDocumentType.expense:
        if cost_category_id is None or income_category_id is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Для расхода нужно выбрать статью затрат")
        category = db.get(CostCategory, cost_category_id)
        if category is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Статья затрат не найдена")
        if not category.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Статья затрат неактивна")
    else:
        if income_category_id is None or cost_category_id is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Для прихода нужно выбрать статью доходов")
        category = db.get(IncomeCategory, income_category_id)
        if category is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Статья доходов не найдена")
        if not category.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Статья доходов неактивна")


@router.get("", response_model=CashSummary)
def get_cash_summary(_: CashUser, db: Session = Depends(get_db)) -> CashSummary:
    entries = cash_journal(db)
    return CashSummary(balance=cash_balance_from_entries(entries), entries=entries)


@router.post("/documents", response_model=CashDocumentOut, status_code=status.HTTP_201_CREATED)
def create_cash_document(payload: CashDocumentCreate, _: CashUser, db: Session = Depends(get_db)) -> CashDocument:
    _validate_category(db, payload.doc_type, payload.cost_category_id, payload.income_category_id)
    register = _get_register(db)
    doc = CashDocument(register_id=register.id, **payload.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.patch("/documents/{document_id}", response_model=CashDocumentOut)
def update_cash_document(
    document_id: int, payload: CashDocumentUpdate, _: CashUser, db: Session = Depends(get_db)
) -> CashDocument:
    doc = db.get(CashDocument, document_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Кассовый документ не найден")
    data = payload.model_dump(exclude_unset=True)
    if "cost_category_id" in data or "income_category_id" in data:
        cost_category_id = data.get("cost_category_id", doc.cost_category_id)
        income_category_id = data.get("income_category_id", doc.income_category_id)
        _validate_category(db, doc.doc_type, cost_category_id, income_category_id)
    for field, value in data.items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cash_document(document_id: int, _: CashUser, db: Session = Depends(get_db)) -> None:
    doc = db.get(CashDocument, document_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Кассовый документ не найден")
    db.delete(doc)
    db.commit()
