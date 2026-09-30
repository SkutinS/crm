import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    # Same permissions as admin everywhere except the cash section — see
    # app.core.deps.require_cash_access, which deliberately does NOT grant
    # this role automatic cash access the way it does for `admin`.
    senior_admin = "senior_admin"
    employee = "employee"


class RateType(str, enum.Enum):
    hourly = "hourly"
    fixed = "fixed"


class TaskParticipantRole(str, enum.Enum):
    executor = "executor"
    controller = "controller"


class WorkStatus(str, enum.Enum):
    planned = "planned"
    done = "done"


class CashDocumentType(str, enum.Enum):
    income = "income"
    expense = "expense"
