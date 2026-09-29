from pydantic import BaseModel


class SystemSettingsOut(BaseModel):
    currency_code: str
    currency_symbol: str
    default_salary_cost_category_id: int | None = None


class SystemSettingsUpdate(BaseModel):
    currency_code: str | None = None
    default_salary_cost_category_id: int | None = None
