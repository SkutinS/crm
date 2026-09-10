from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    stage_id: Mapped[int] = mapped_column(ForeignKey("task_stages.id", ondelete="RESTRICT"), nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client")
    stage = relationship("TaskStage")
    assignments = relationship("TaskAssignment", cascade="all, delete-orphan", back_populates="task")
    works = relationship("Work", cascade="all, delete-orphan", back_populates="task")
    parts = relationship("Part", cascade="all, delete-orphan", back_populates="task")
    expenses = relationship("Expense", cascade="all, delete-orphan", back_populates="task")
    incomes = relationship("Income", cascade="all, delete-orphan", back_populates="task")
    participations = relationship("Participation", cascade="all, delete-orphan", back_populates="task")


class TaskAssignment(Base):
    """A user attached to a task as executor and/or controller.
    Determines task visibility for employees.
    """

    __tablename__ = "task_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_in_task: Mapped[str] = mapped_column(String(20), nullable=False)  # executor | controller

    task = relationship("Task", back_populates="assignments")
    user = relationship("User")
