"""add senior_admin user role

Revision ID: 6467d9194aa9
Revises: 57d0a18b1abb
Create Date: 2026-09-29 19:50:11.383708

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '6467d9194aa9'
down_revision: Union[str, None] = '57d0a18b1abb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite has no real enum type — `users.role` is stored as plain text
    # there (see app.core.time_utils-style dialect notes elsewhere in this
    # project), so the new Python-level enum member `senior_admin` is
    # already accepted with no DDL needed.
    #
    # Postgres, however, backs sa.Enum(UserRole) with a real native ENUM
    # type ('userrole') that strictly enforces its label set — writing
    # 'senior_admin' into the column would fail with an invalid-input-value
    # error until the type itself is taught the new label.
    #
    # IF NOT EXISTS makes this safe to re-run; ADD VALUE cannot run inside
    # the same transaction that later *uses* the new label (fine here,
    # since this migration only adds the label, it never inserts rows).
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'senior_admin'")


def downgrade() -> None:
    # Postgres has no DDL to drop a single enum label (would require
    # rebuilding the type and every column/index that uses it), so this
    # migration is intentionally not reversible. Rows already using
    # 'senior_admin' would need to be reassigned to another role by hand
    # before attempting anything like that.
    pass
