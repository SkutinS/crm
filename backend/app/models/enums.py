import enum


class UserRole(str, enum.Enum):
    admin = "admin"
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
