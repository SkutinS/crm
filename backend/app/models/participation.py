from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Participation(Base):
    """Salary a user earns for their part in one task.

    For hourly employees `hours` is pre-filled from the sum of their Work
    durations on this task and `amount` = hours * user.rate_amount, but both
    stay editable — once saved, `amount` is authoritative and does not
    silently change if the user's rate changes later.
    For fixed-rate employees `hours` stays empty and `amount` is entered
    directly.

    `cost_category_id` is pre-filled from SystemSettings on creation (see
    app.routers.tasks.add_participation) but, like `amount`, is then its
    own authoritative value — changing the default setting later never
    rewrites rows that already picked up the old default.
    """

    __tablename__ = "participations"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    hours: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    paid_at: Mapped[date | None] = mapped_column(Date)
    comment: Mapped[str | None] = mapped_column(Text)
    cost_category_id: Mapped[int | None] = mapped_column(ForeignKey("cost_categories.id", ondelete="SET NULL"))

    task = relationship("Task", back_populates="participations")
    user = relationship("User")
    cost_category = relationship("CostCategory")
