from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import WorkStatus
from app.schemas.common import UtcDateTime


class WorkBase(BaseModel):
    catalog_item_id: int | None = None
    description: str
    service_price: Decimal = Decimal("0")
    planned_start: datetime
    planned_end: datetime
    status: WorkStatus = WorkStatus.planned
    assignee_id: int | None = None


class WorkCreate(WorkBase):
    pass


class WorkUpdate(BaseModel):
    catalog_item_id: int | None = None
    description: str | None = None
    service_price: Decimal | None = None
    planned_start: datetime | None = None
    planned_end: datetime | None = None
    status: WorkStatus | None = None
    assignee_id: int | None = None


class WorkOut(WorkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    planned_start: UtcDateTime
    planned_end: UtcDateTime
