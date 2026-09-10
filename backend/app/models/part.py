from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    catalog_item_id: Mapped[int | None] = mapped_column(ForeignKey("part_catalog_items.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=1)
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)

    task = relationship("Task", back_populates="parts")
    catalog_item = relationship("PartCatalogItem")

    @property
    def amount(self) -> Decimal:
        return self.quantity * self.price_per_unit

    @property
    def margin(self) -> Decimal:
        return self.quantity * (self.price_per_unit - self.purchase_price)
