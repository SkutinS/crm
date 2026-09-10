from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser, get_accessible_task
from app.core.time_utils import to_naive_utc
from app.models.enums import UserRole
from app.models.expense import Expense
from app.models.income import Income
from app.models.part import Part
from app.models.participation import Participation
from app.models.task import Task, TaskAssignment
from app.models.task_stage import TaskStage
from app.models.user import User
from app.models.work import Work
from app.schemas.money_item import MoneyItemCreate, MoneyItemOut, MoneyItemUpdate
from app.schemas.part import PartCreate, PartOut, PartUpdate
from app.schemas.participation import (
    ParticipationCreate,
    ParticipationOut,
    ParticipationSuggestion,
    ParticipationUpdate,
)
from app.schemas.task import (
    TaskAssignmentCreate,
    TaskAssignmentOut,
    TaskCreate,
    TaskDetail,
    TaskListItem,
    TaskStageChange,
    TaskUpdate,
)
from app.schemas.work import WorkCreate, WorkOut, WorkUpdate
from app.services.finance import suggest_participation, task_debt, task_invoice_total, task_profit

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

TASK_LOAD_OPTIONS = (
    selectinload(Task.client),
    selectinload(Task.stage),
    selectinload(Task.assignments).selectinload(TaskAssignment.user),
    selectinload(Task.works),
    selectinload(Task.parts),
    selectinload(Task.expenses),
    selectinload(Task.incomes),
    selectinload(Task.participations).selectinload(Participation.user),
)


def _task_detail(task: Task) -> TaskDetail:
    detail = TaskDetail.model_validate(task, from_attributes=True)
    detail.invoice_total = task_invoice_total(task)
    detail.debt = task_debt(task)
    detail.profit = task_profit(task)
    return detail


@router.get("", response_model=list[TaskListItem])
def list_tasks(
    user: CurrentUser,
    db: Session = Depends(get_db),
    client_id: int | None = None,
    stage_id: int | None = None,
) -> list[Task]:
    stmt = select(Task).options(*TASK_LOAD_OPTIONS).order_by(Task.created_at.desc())
    if client_id is not None:
        stmt = stmt.where(Task.client_id == client_id)
    if stage_id is not None:
        stmt = stmt.where(Task.stage_id == stage_id)

    tasks = list(db.scalars(stmt).unique())
    if user.role != UserRole.admin:
        tasks = [t for t in tasks if any(a.user_id == user.id for a in t.assignments)]
    return tasks


@router.post("", response_model=TaskDetail, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, admin: AdminUser, db: Session = Depends(get_db)) -> TaskDetail:
    if payload.stage_id is not None:
        stage = db.get(TaskStage, payload.stage_id)
    else:
        stage = db.scalar(select(TaskStage).order_by(TaskStage.order).limit(1))
    if stage is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Этап не найден")

    task = Task(
        client_id=payload.client_id,
        title=payload.title,
        description=payload.description,
        stage_id=stage.id,
        created_by_id=admin.id,
    )
    db.add(task)
    db.flush()

    for a in payload.assignments:
        db.add(TaskAssignment(task_id=task.id, user_id=a.user_id, role_in_task=a.role_in_task))

    db.commit()
    task = db.scalars(select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task.id)).unique().one()
    return _task_detail(task)


@router.get("/{task_id}", response_model=TaskDetail)
def get_task(task_id: int, user: CurrentUser, db: Session = Depends(get_db)) -> TaskDetail:
    task = db.scalars(
        select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task_id)
    ).unique().one_or_none()
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    get_accessible_task(task_id, db, user)  # raises 403 if employee not assigned
    return _task_detail(task)


@router.patch("/{task_id}", response_model=TaskDetail)
def update_task(task_id: int, payload: TaskUpdate, _: AdminUser, db: Session = Depends(get_db)) -> TaskDetail:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    task = db.scalars(select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task_id)).unique().one()
    return _task_detail(task)


@router.patch("/{task_id}/stage", response_model=TaskDetail)
def change_task_stage(
    task_id: int, payload: TaskStageChange, user: CurrentUser, db: Session = Depends(get_db)
) -> TaskDetail:
    task = get_accessible_task(task_id, db, user)
    stage = db.get(TaskStage, payload.stage_id)
    if stage is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Этап не найден")
    task.stage_id = stage.id
    db.commit()
    task = db.scalars(select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task_id)).unique().one()
    return _task_detail(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    db.delete(task)
    db.commit()


# ---- Assignments (admin only) ----


@router.post("/{task_id}/assignments", response_model=TaskAssignmentOut, status_code=status.HTTP_201_CREATED)
def add_assignment(
    task_id: int, payload: TaskAssignmentCreate, _: AdminUser, db: Session = Depends(get_db)
) -> TaskAssignment:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    assignment = TaskAssignment(task_id=task_id, user_id=payload.user_id, role_in_task=payload.role_in_task)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/{task_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_assignment(task_id: int, assignment_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    assignment = db.get(TaskAssignment, assignment_id)
    if assignment is None or assignment.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Участник не найден")
    db.delete(assignment)
    db.commit()


# ---- Works ----


@router.post("/{task_id}/works", response_model=WorkOut, status_code=status.HTTP_201_CREATED)
def add_work(task_id: int, payload: WorkCreate, user: CurrentUser, db: Session = Depends(get_db)) -> Work:
    get_accessible_task(task_id, db, user)
    data = payload.model_dump()
    data["planned_start"] = to_naive_utc(data["planned_start"])
    data["planned_end"] = to_naive_utc(data["planned_end"])
    work = Work(task_id=task_id, **data)
    db.add(work)
    db.commit()
    db.refresh(work)
    return work


@router.patch("/{task_id}/works/{work_id}", response_model=WorkOut)
def update_work(
    task_id: int, work_id: int, payload: WorkUpdate, user: CurrentUser, db: Session = Depends(get_db)
) -> Work:
    get_accessible_task(task_id, db, user)
    work = db.get(Work, work_id)
    if work is None or work.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Работа не найдена")
    data = payload.model_dump(exclude_unset=True)
    if "planned_start" in data:
        data["planned_start"] = to_naive_utc(data["planned_start"])
    if "planned_end" in data:
        data["planned_end"] = to_naive_utc(data["planned_end"])
    for field, value in data.items():
        setattr(work, field, value)
    db.commit()
    db.refresh(work)
    return work


@router.delete("/{task_id}/works/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work(task_id: int, work_id: int, user: CurrentUser, db: Session = Depends(get_db)) -> None:
    get_accessible_task(task_id, db, user)
    work = db.get(Work, work_id)
    if work is None or work.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Работа не найдена")
    db.delete(work)
    db.commit()


# ---- Parts ----


@router.post("/{task_id}/parts", response_model=PartOut, status_code=status.HTTP_201_CREATED)
def add_part(task_id: int, payload: PartCreate, user: CurrentUser, db: Session = Depends(get_db)) -> Part:
    get_accessible_task(task_id, db, user)
    part = Part(task_id=task_id, **payload.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


@router.patch("/{task_id}/parts/{part_id}", response_model=PartOut)
def update_part(
    task_id: int, part_id: int, payload: PartUpdate, user: CurrentUser, db: Session = Depends(get_db)
) -> Part:
    get_accessible_task(task_id, db, user)
    part = db.get(Part, part_id)
    if part is None or part.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Запчасть не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(part, field, value)
    db.commit()
    db.refresh(part)
    return part


@router.delete("/{task_id}/parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(task_id: int, part_id: int, user: CurrentUser, db: Session = Depends(get_db)) -> None:
    get_accessible_task(task_id, db, user)
    part = db.get(Part, part_id)
    if part is None or part.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Запчасть не найдена")
    db.delete(part)
    db.commit()


# ---- Expenses ----


@router.post("/{task_id}/expenses", response_model=MoneyItemOut, status_code=status.HTTP_201_CREATED)
def add_expense(task_id: int, payload: MoneyItemCreate, _: AdminUser, db: Session = Depends(get_db)) -> Expense:
    if db.get(Task, task_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    expense = Expense(task_id=task_id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/{task_id}/expenses/{expense_id}", response_model=MoneyItemOut)
def update_expense(
    task_id: int, expense_id: int, payload: MoneyItemUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> Expense:
    expense = db.get(Expense, expense_id)
    if expense is None or expense.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Расход не найден")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{task_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(task_id: int, expense_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    expense = db.get(Expense, expense_id)
    if expense is None or expense.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Расход не найден")
    db.delete(expense)
    db.commit()


# ---- Incomes ----


@router.post("/{task_id}/incomes", response_model=MoneyItemOut, status_code=status.HTTP_201_CREATED)
def add_income(task_id: int, payload: MoneyItemCreate, _: AdminUser, db: Session = Depends(get_db)) -> Income:
    if db.get(Task, task_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    income = Income(task_id=task_id, **payload.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.patch("/{task_id}/incomes/{income_id}", response_model=MoneyItemOut)
def update_income(
    task_id: int, income_id: int, payload: MoneyItemUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> Income:
    income = db.get(Income, income_id)
    if income is None or income.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Доход не найден")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/{task_id}/incomes/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(task_id: int, income_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    income = db.get(Income, income_id)
    if income is None or income.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Доход не найден")
    db.delete(income)
    db.commit()


# ---- Participations (salary per task) ----


@router.get("/{task_id}/participations/suggest", response_model=ParticipationSuggestion)
def suggest_task_participation(
    task_id: int, user_id: int, _: AdminUser, db: Session = Depends(get_db)
) -> ParticipationSuggestion:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    member = db.get(User, user_id)
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден")
    hours, amount = suggest_participation(task, member)
    return ParticipationSuggestion(hours=hours, amount=amount)


@router.post("/{task_id}/participations", response_model=ParticipationOut, status_code=status.HTTP_201_CREATED)
def add_participation(
    task_id: int, payload: ParticipationCreate, _: AdminUser, db: Session = Depends(get_db)
) -> Participation:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    member = db.get(User, payload.user_id)
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден")

    hours = payload.hours
    amount = payload.amount
    if amount is None:
        suggested_hours, suggested_amount = suggest_participation(task, member)
        hours = hours if hours is not None else suggested_hours
        amount = suggested_amount

    participation = Participation(task_id=task_id, user_id=payload.user_id, hours=hours, amount=amount)
    db.add(participation)
    db.commit()
    db.refresh(participation)
    return participation


@router.patch("/{task_id}/participations/{participation_id}", response_model=ParticipationOut)
def update_participation(
    task_id: int,
    participation_id: int,
    payload: ParticipationUpdate,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> Participation:
    participation = db.get(Participation, participation_id)
    if participation is None or participation.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Запись об участии не найдена")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(participation, field, value)
    db.commit()
    db.refresh(participation)
    return participation


@router.delete("/{task_id}/participations/{participation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participation(
    task_id: int, participation_id: int, _: AdminUser, db: Session = Depends(get_db)
) -> None:
    participation = db.get(Participation, participation_id)
    if participation is None or participation.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Запись об участии не найдена")
    db.delete(participation)
    db.commit()
