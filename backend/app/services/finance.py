from decimal import Decimal

from app.core.time_utils import to_naive_utc
from app.models.enums import RateType
from app.models.participation import Participation
from app.models.task import Task
from app.models.user import User


def hours_between(start, end) -> Decimal:
    seconds = max((to_naive_utc(end) - to_naive_utc(start)).total_seconds(), 0)
    return (Decimal(seconds) / Decimal(3600)).quantize(Decimal("0.01"))


def suggested_hours_for_user(task: Task, user_id: int) -> Decimal:
    total = Decimal("0")
    for work in task.works:
        if work.assignee_id == user_id:
            total += hours_between(work.planned_start, work.planned_end)
    return total


def suggest_participation(task: Task, user: User) -> tuple[Decimal | None, Decimal]:
    """Return (hours, amount) suggested for a user's participation in a task."""
    if user.rate_type == RateType.hourly:
        hours = suggested_hours_for_user(task, user.id)
        amount = (hours * user.rate_amount).quantize(Decimal("0.01"))
        return hours, amount
    return None, Decimal("0")


def task_work_revenue(task: Task) -> Decimal:
    return sum((w.service_price for w in task.works), Decimal("0"))


def task_parts_sale_total(task: Task) -> Decimal:
    return sum((p.amount for p in task.parts), Decimal("0"))


def task_parts_margin(task: Task) -> Decimal:
    return sum((p.margin for p in task.parts), Decimal("0"))


def task_invoice_total(task: Task) -> Decimal:
    """Сумма к оплате клиентом: стоимость работ (услуг) + продажная
    стоимость запчастей — не зависит от того, сколько уже оплачено.
    """
    return task_work_revenue(task) + task_parts_sale_total(task)


def task_payments_total(task: Task) -> Decimal:
    """Записи в разделе «Оплаты» — фактически полученные от клиента деньги."""
    return sum((i.amount for i in task.incomes), Decimal("0"))


def task_debt(task: Task) -> Decimal:
    """К оплате − уже оплачено. Может быть отрицательной при переплате."""
    return task_invoice_total(task) - task_payments_total(task)


def task_profit(task: Task) -> Decimal:
    """Стоимость работ (услуг) + маржа по запчастям (продажа − закупка) −
    расходы − начисленные зарплаты.

    Не включает оплаты клиента напрямую: оплата — это просто погашение
    выставленной суммы (см. task_debt), а не отдельная статья прибыли.
    """
    work_revenue_total = task_work_revenue(task)
    parts_margin_total = task_parts_margin(task)
    expense_total = sum((e.amount for e in task.expenses), Decimal("0"))
    salary_total = sum((p.amount for p in task.participations), Decimal("0"))
    return work_revenue_total + parts_margin_total - expense_total - salary_total
