from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.client import ClientOut
from app.schemas.common import UtcDateTime
from app.schemas.task_stage import TaskStageOut


class TaskGroupCreate(BaseModel):
    name: str


class TaskGroupUpdate(BaseModel):
    name: str


class TaskGroupAddTasks(BaseModel):
    task_ids: list[int]


class TaskGroupRef(BaseModel):
    """Minimal group reference embedded in a task (list/detail views)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class TaskGroupListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: UtcDateTime


class TaskGroupTaskItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: UtcDateTime
    client: ClientOut
    stage: TaskStageOut
    invoice_total: Decimal = Decimal("0")


class TaskGroupSummary(BaseModel):
    invoice_total: Decimal = Decimal("0")
    debt_total: Decimal = Decimal("0")
    expenses_total: Decimal = Decimal("0")
    incomes_total: Decimal = Decimal("0")
    salary_total: Decimal = Decimal("0")
    profit_total: Decimal = Decimal("0")


class TaskGroupDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: UtcDateTime
    tasks: list[TaskGroupTaskItem]
    # filled in after validation, same pattern as TaskDetail.invoice_total
    summary: TaskGroupSummary = TaskGroupSummary()
