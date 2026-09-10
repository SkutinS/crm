from pydantic import BaseModel


class SystemSettingsOut(BaseModel):
    currency_code: str
    currency_symbol: str


class SystemSettingsUpdate(BaseModel):
    currency_code: str
