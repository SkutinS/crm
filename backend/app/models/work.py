from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import WorkStatus


class Work(Base):
    __tablename__ = "works"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    catalog_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("service_catalog_items.id", ondelete="SET NULL")
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    service_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    planned_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    planned_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[WorkStatus] = mapped_column(Enum(WorkStatus), nullable=False, default=WorkStatus.planned)

    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    task = relationship("Task", back_populates="works")
    assignee = relationship("User")
    catalog_item = relationship("ServiceCatalogItem")
