from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.task_stage import TaskStage
from app.schemas.task_stage import TaskStageOut

router = APIRouter(prefix="/api/task-stages", tags=["task-stages"])


@router.get("", response_model=list[TaskStageOut])
def list_task_stages(_: CurrentUser, db: Session = Depends(get_db)) -> list[TaskStage]:
    return list(db.scalars(select(TaskStage).order_by(TaskStage.order)))
