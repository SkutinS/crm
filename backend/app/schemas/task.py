from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.client import ClientOut
from app.schemas.money_item import MoneyItemOut
from app.schemas.part import PartOut
from app.schemas.participation import ParticipationOut
from app.schemas.task_stage import TaskStageOut
from app.schemas.user import UserOut
from app.schemas.work import WorkOut


class TaskAssignmentCreate(BaseModel):
    user_id: int
    role_in_task: str  # executor | controller


class TaskAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role_in_task: str
    user: UserOut


class TaskCreate(BaseModel):
    client_id: int
    title: str
    description: str | None = None
    stage_id: int | None = None
    assignments: list[TaskAssignmentCreate] = []


class TaskUpdate(BaseModel):
    client_id: int | None = None
    title: str | None = None
    description: str | None = None


class TaskStageChange(BaseModel):
    stage_id: int


class TaskListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    client: ClientOut
    stage: TaskStageOut
    assignments: list[TaskAssignmentOut]


class TaskDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    created_at: datetime
    client: ClientOut
    stage: TaskStageOut
    assignments: list[TaskAssignmentOut]
    works: list[WorkOut]
    parts: list[PartOut]
    expenses: list[MoneyItemOut]
    incomes: list[MoneyItemOut]
    participations: list[ParticipationOut]
    # filled in by _task_detail() after validation
    invoice_total: Decimal = Decimal("0")
    debt: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")
