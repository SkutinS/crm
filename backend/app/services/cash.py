from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.cash import CashDocument
from app.models.enums import CashDocumentType
from app.models.expense import Expense
from app.models.income import Income
from app.models.part import Part
from app.models.participation import Participation
from app.models.task import Task
from app.schemas.cash import CashJournalEntry, CashJournalTaskRef


def _sort_key(entry: CashJournalEntry) -> tuple[int, int, int]:
    # Most recent document_date first; entries with no date (legacy rows,
    # or a Participation/Part not yet dated) sort last, newest-id first.
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

    def task_ref(task_id: int) -> CashJournalTaskRef | None:
        task = tasks_by_id.get(task_id)
        return CashJournalTaskRef(id=task.id, title=task.title) if task else None

    for income in db.scalars(select(Income).options(selectinload(Income.category))):
        entries.append(
            CashJournalEntry(
                source="task_income",
                source_id=income.id,
                doc_type=CashDocumentType.income,
                amount=income.amount,
                document_date=income.document_date,
                description=income.description,
                category_name=income.category.name if income.category else None,
                cost_category_id=None,
                income_category_id=income.category_id,
                task=task_ref(income.task_id),
            )
        )

    for expense in db.scalars(select(Expense).options(selectinload(Expense.category))):
        entries.append(
            CashJournalEntry(
                source="task_expense",
                source_id=expense.id,
                doc_type=CashDocumentType.expense,
                amount=expense.amount,
                document_date=expense.document_date,
                description=expense.description,
                category_name=expense.category.name if expense.category else None,
                cost_category_id=expense.category_id,
                income_category_id=None,
                task=task_ref(expense.task_id),
            )
        )

    for participation in db.scalars(select(Participation).options(selectinload(Participation.cost_category))):
        entries.append(
            CashJournalEntry(
                source="task_participation",
                source_id=participation.id,
                doc_type=CashDocumentType.expense,
                amount=participation.amount,
                document_date=participation.paid_at,
                description=participation.comment,
                category_name=participation.cost_category.name if participation.cost_category else None,
                cost_category_id=participation.cost_category_id,
                income_category_id=None,
                task=task_ref(participation.task_id),
            )
        )

    for part in db.scalars(select(Part).where(Part.purchase_price > 0)):
        entries.append(
            CashJournalEntry(
                source="task_part_purchase",
                source_id=part.id,
                doc_type=CashDocumentType.expense,
                amount=part.quantity * part.purchase_price,
                document_date=part.document_date,
                description=part.name,
                category_name=None,
                cost_category_id=None,
                income_category_id=None,
                task=task_ref(part.task_id),
            )
        )

    entries.sort(key=_sort_key)
    return entries


def cash_balance_from_entries(entries: list[CashJournalEntry]) -> Decimal:
    """Undated entries (legacy rows, or a Participation/Part not yet dated)
    are shown in the journal but excluded from the balance — there's no
    date to place them on.
    """
    total = Decimal("0")
    for entry in entries:
        if entry.document_date is None:
            continue
        total += entry.amount if entry.doc_type == CashDocumentType.income else -entry.amount
    return total


def cash_balance(db: Session) -> Decimal:
    return cash_balance_from_entries(cash_journal(db))
