from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def _as_utc_iso(dt: datetime) -> str:
    aware = dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    return aware.astimezone(timezone.utc).isoformat()


# All datetimes are stored naive-UTC in the DB (see app.core.time_utils).
# Pydantic serializes a naive datetime without any 'Z'/offset suffix, which
# browsers then parse as *local* time instead of UTC — silently shifting
# every timestamp by the viewer's UTC offset. Every datetime field the API
# returns to the frontend should use this type instead of a bare `datetime`
# so responses are always unambiguous.
UtcDateTime = Annotated[datetime, PlainSerializer(_as_utc_iso, return_type=str)]
