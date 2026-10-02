from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.models.task import Task
from app.models.task_group import TaskGroup
from app.schemas.task_group import (
    TaskGroupAddTasks,
    TaskGroupCreate,
    TaskGroupDetail,
    TaskGroupListItem,
    TaskGroupSummary,
    TaskGroupUpdate,
)
from app.services.finance import task_debt, task_invoice_total, task_profit

router = APIRouter(prefix="/api/task-groups", tags=["task-groups"])

GROUP_TASK_LOAD_OPTIONS = (
    selectinload(TaskGroup.tasks).selectinload(Task.client),
    selectinload(TaskGroup.tasks).selectinload(Task.stage),
    selectinload(TaskGroup.tasks).selectinload(Task.works),
    selectinload(TaskGroup.tasks).selectinload(Task.parts),
    selectinload(TaskGroup.tasks).selectinload(Task.expenses),
    selectinload(TaskGroup.tasks).selectinload(Task.incomes),
    selectinload(TaskGroup.tasks).selectinload(Task.participations),
)


def _get_group_or_404(group_id: int, db: Session, *, for_update: bool = False) -> TaskGroup:
    stmt = select(TaskGroup).where(TaskGroup.id == group_id)
    if for_update:
        stmt = stmt.options(*GROUP_TASK_LOAD_OPTIONS)
    group = db.scalars(stmt).unique().one_or_none()
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    return group


def _group_detail(group: TaskGroup) -> TaskGroupDetail:
    detail = TaskGroupDetail.model_validate(group, from_attributes=True)
    for item, task in zip(detail.tasks, group.tasks):
        item.invoice_total = task_invoice_total(task)
    zero = Decimal("0")
    detail.summary = TaskGroupSummary(
        invoice_total=sum((task_invoice_total(t) for t in group.tasks), zero),
        debt_total=sum((task_debt(t) for t in group.tasks), zero),
        expenses_total=sum((e.amount for t in group.tasks for e in t.expenses), zero),
        incomes_total=sum((i.amount for t in group.tasks for i in t.incomes), zero),
        salary_total=sum((p.amount for t in group.tasks for p in t.participations), zero),
        profit_total=sum((task_profit(t) for t in group.tasks), zero),
    )
    return detail


@router.get("", response_model=list[TaskGroupListItem])
def list_task_groups(_: AdminUser, db: Session = Depends(get_db)) -> list[TaskGroup]:
    return list(db.scalars(select(TaskGroup).order_by(TaskGroup.created_at.desc())))


@router.post("", response_model=TaskGroupListItem, status_code=status.HTTP_201_CREATED)
def create_task_group(payload: TaskGroupCreate, _: AdminUser, db: Session = Depends(get_db)) -> TaskGroup:
    group = TaskGroup(name=payload.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=TaskGroupDetail)
def get_task_group(group_id: int, _: CurrentUser, db: Session = Depends(get_db)) -> TaskGroupDetail:
    group = _get_group_or_404(group_id, db, for_update=True)
    return _group_detail(group)


@router.patch("/{group_id}", response_model=TaskGroupListItem)
def update_task_group(
    group_id: int, payload: TaskGroupUpdate, _: AdminUser, db: Session = Depends(get_db)
) -> TaskGroup:
    group = _get_group_or_404(group_id, db)
    group.name = payload.name
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_group(group_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    group = _get_group_or_404(group_id, db)
    db.delete(group)
    db.commit()


@router.post("/{group_id}/tasks", response_model=TaskGroupDetail)
def add_tasks_to_group(
    group_id: int, payload: TaskGroupAddTasks, _: AdminUser, db: Session = Depends(get_db)
) -> TaskGroupDetail:
    group = _get_group_or_404(group_id, db)

    tasks = list(db.scalars(select(Task).where(Task.id.in_(payload.task_ids))))
    found_ids = {t.id for t in tasks}
    missing_ids = set(payload.task_ids) - found_ids
    if missing_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Задачи не найдены: {sorted(missing_ids)}")

    conflicts = [t for t in tasks if t.group_id is not None and t.group_id != group_id]
    if conflicts:
        titles = ", ".join(f'«{t.title}»' for t in conflicts)
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Уже состоят в другой группе: {titles}. Сначала уберите их из текущей группы.",
        )

    for task in tasks:
        task.group_id = group_id
    db.commit()

    group = _get_group_or_404(group_id, db, for_update=True)
    return _group_detail(group)


@router.delete("/{group_id}/tasks/{task_id}", response_model=TaskGroupDetail)
def remove_task_from_group(
    group_id: int, task_id: int, _: AdminUser, db: Session = Depends(get_db)
) -> TaskGroupDetail:
    _get_group_or_404(group_id, db)
    task = db.get(Task, task_id)
    if task is None or task.group_id != group_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена в этой группе")
    task.group_id = None
    db.commit()

    group = _get_group_or_404(group_id, db, for_update=True)
    return _group_detail(group)
