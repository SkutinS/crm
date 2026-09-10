from datetime import datetime, timezone


def to_naive_utc(dt: datetime) -> datetime:
    """Normalize to a naive UTC datetime.

    SQLite has no real timezone-aware datetime type: SQLAlchemy stores and
    returns naive values for it regardless of column config, while
    Postgres (and datetimes parsed from JSON with a 'Z'/offset, e.g. from
    the browser) are timezone-aware. Comparing the two raises TypeError,
    so every datetime that might be compared against another is passed
    through here first, making storage and comparisons consistent across
    both databases.
    """
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
