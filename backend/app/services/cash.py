from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.cash import CashDocument
from app.models.enums import CashDocumentType
from app.models.expense import Expense
from app.models.income import Income
from app.models.task import Task
from app.schemas.cash import CashJournalEntry, CashJournalTaskRef


def cash_balance(db: Session) -> Decimal:
    total = Decimal("0")
    for doc in db.scalars(select(CashDocument)):
        total += doc.amount if doc.doc_type == CashDocumentType.income else -doc.amount
    for income in db.scalars(select(Income)):
        total += income.amount
    for expense in db.scalars(select(Expense)):
        total -= expense.amount
    return total


def _sort_key(entry: CashJournalEntry) -> tuple[int, int, int]:
    # Most recent document_date first; entries with no date (legacy
    # Expense/Income predating that field) sort last, newest-id first.
    has_date = entry.document_date is not None
    date_component = -entry.document_date.toordinal() if has_date else 0
    return (0 if has_date else 1, date_component, -entry.source_id)


def cash_journal(db: Session) -> list[CashJournalEntry]:
    entries: list[CashJournalEntry] = []

    cash_docs = db.scalars(
        select(CashDocument).options(
            selectinload(CashDocument.cost_category), selectinload(CashDocument.income_category)
        )
    )
    for doc in cash_docs:
        category_name = (
            doc.cost_category.name if doc.cost_category else (doc.income_category.name if doc.income_category else None)
        )
        entries.append(
            CashJournalEntry(
                source="cash_document",
                source_id=doc.id,
                doc_type=doc.doc_type,
                amount=doc.amount,
                document_date=doc.document_date,
                description=doc.description,
                category_name=category_name,
                cost_category_id=doc.cost_category_id,
                income_category_id=doc.income_category_id,
            )
        )

    tasks_by_id: dict[int, Task] = {t.id: t for t in db.scalars(select(Task))}

    for income in db.scalars(select(Income).options(selectinload(Income.category))):
        task = tasks_by_id.get(income.task_id)
        entries.append(
            CashJournalEntry(
                source="task_income",
                source_id=income.id,
                doc_type=CashDocumentType.income,
                amount=income.amount,
                document_date=income.document_date,
                description=income.description,
                category_name=income.category.name if income.category else None,
                task=CashJournalTaskRef(id=task.id, title=task.title) if task else None,
            )
        )

    for expense in db.scalars(select(Expense).options(selectinload(Expense.category))):
        task = tasks_by_id.get(expense.task_id)
        entries.append(
            CashJournalEntry(
                source="task_expense",
                source_id=expense.id,
                doc_type=CashDocumentType.expense,
                amount=expense.amount,
                document_date=expense.document_date,
                description=expense.description,
                category_name=expense.category.name if expense.category else None,
                task=CashJournalTaskRef(id=task.id, title=task.title) if task else None,
            )
        )

    entries.sort(key=_sort_key)
    return entries
