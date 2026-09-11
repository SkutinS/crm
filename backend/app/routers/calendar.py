from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.time_utils import to_naive_utc
from app.models.enums import UserRole
from app.models.task import Task
from app.models.work import Work
from app.schemas.common import UtcDateTime
from app.services.calendar import find_conflicting_work_ids

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class CalendarTaskRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str


class CalendarWorkItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    planned_start: UtcDateTime
    planned_end: UtcDateTime
    status: str
    assignee_id: int | None
    assignee_name: str | None
    task: CalendarTaskRef
    has_conflict: bool


@router.get("/works", response_model=list[CalendarWorkItem])
def list_calendar_works(
    user: CurrentUser,
    db: Session = Depends(get_db),
    start: datetime | None = None,
    end: datetime | None = None,
    employee_id: int | None = None,
) -> list[CalendarWorkItem]:
    # Conflicts must be detected across each employee's full schedule, not
    # just the visible date window, so fetch broadly first and filter after.
    stmt = select(Work).options(selectinload(Work.task), selectinload(Work.assignee))
    if employee_id is not None:
        stmt = stmt.where(Work.assignee_id == employee_id)

    all_works = list(db.scalars(stmt))

    if user.role != UserRole.admin:
        accessible_task_ids = {
            t.id
            for t in db.scalars(select(Task).options(selectinload(Task.assignments))).unique()
            if any(a.user_id == user.id for a in t.assignments)
        }
        all_works = [w for w in all_works if w.task_id in accessible_task_ids]

    conflicting_ids = find_conflicting_work_ids(all_works)

    visible = all_works
    if start is not None:
        start = to_naive_utc(start)
        visible = [w for w in visible if to_naive_utc(w.planned_end) > start]
    if end is not None:
        end = to_naive_utc(end)
        visible = [w for w in visible if to_naive_utc(w.planned_start) < end]

    return [
        CalendarWorkItem(
            id=w.id,
            description=w.description,
            planned_start=w.planned_start,
            planned_end=w.planned_end,
            status=w.status.value,
            assignee_id=w.assignee_id,
            assignee_name=w.assignee.full_name if w.assignee else None,
            task=CalendarTaskRef(id=w.task.id, title=w.task.title),
            has_conflict=w.id in conflicting_ids,
        )
        for w in visible
    ]
