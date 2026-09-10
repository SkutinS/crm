from pydantic import BaseModel, ConfigDict

from app.schemas.common import UtcDateTime


class ClientBase(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    comment: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    comment: str | None = None


class ClientOut(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: UtcDateTime
