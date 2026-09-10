from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ServiceCatalogItem(Base):
    """Hierarchical catalog of services (arbitrary nesting). Any node,
    category or leaf, can carry a default price and be picked on a Work —
    a node with children is free to also be directly selectable.
    """

    __tablename__ = "service_catalog_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("service_catalog_items.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    parent = relationship("ServiceCatalogItem", remote_side=[id], back_populates="children")
    children = relationship("ServiceCatalogItem", back_populates="parent", order_by="ServiceCatalogItem.name")


class PartCatalogItem(Base):
    """Hierarchical catalog of parts (arbitrary nesting), same shape as
    ServiceCatalogItem but with both a default sale and purchase price so
    picking an item on a Part can pre-fill the margin inputs.
    """

    __tablename__ = "part_catalog_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("part_catalog_items.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_sale_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    default_purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    parent = relationship("PartCatalogItem", remote_side=[id], back_populates="children")
    children = relationship("PartCatalogItem", back_populates="parent", order_by="PartCatalogItem.name")
