"""add task groups

Revision ID: c45e4c8401ac
Revises: 6467d9194aa9
Create Date: 2026-09-30 19:18:25.869758

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c45e4c8401ac'
down_revision: Union[str, None] = '6467d9194aa9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('task_groups',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('group_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_tasks_group_id', 'task_groups', ['group_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_constraint('fk_tasks_group_id', type_='foreignkey')
        batch_op.drop_column('group_id')

    op.drop_table('task_groups')
