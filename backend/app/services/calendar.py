from collections import defaultdict

from app.core.time_utils import to_naive_utc
from app.models.work import Work


def works_overlap(a: Work, b: Work) -> bool:
    return to_naive_utc(a.planned_start) < to_naive_utc(b.planned_end) and to_naive_utc(a.planned_end) > to_naive_utc(
        b.planned_start
    )


def find_conflicting_work_ids(works: list[Work]) -> set[int]:
    """Given works (possibly for several assignees), return the ids of works
    that overlap in time with another work assigned to the same employee.
    """
    by_assignee: dict[int, list[Work]] = defaultdict(list)
    for work in works:
        if work.assignee_id is not None:
            by_assignee[work.assignee_id].append(work)

    conflicting: set[int] = set()
    for assignee_works in by_assignee.values():
        for i, work_a in enumerate(assignee_works):
            for work_b in assignee_works[i + 1 :]:
                if works_overlap(work_a, work_b):
                    conflicting.add(work_a.id)
                    conflicting.add(work_b.id)
    return conflicting
