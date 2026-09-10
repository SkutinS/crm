from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(_: CurrentUser, db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)))


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, _: AdminUser, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.login == payload.login))
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Логин уже занят")

    user = User(
        full_name=payload.full_name,
        login=payload.login,
        password_hash=hash_password(payload.password),
        role=payload.role,
        rate_type=payload.rate_type,
        rate_amount=payload.rate_amount,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, _: AdminUser, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")

    data = payload.model_dump(exclude_unset=True)
    if "login" in data and data["login"] != user.login:
        existing = db.scalar(select(User).where(User.login == data["login"]))
        if existing is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Логин уже занят")

    password = data.pop("password", None)
    for field, value in data.items():
        setattr(user, field, value)
    if password:
        user.password_hash = hash_password(password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, admin: AdminUser, db: Session = Depends(get_db)) -> None:
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Нельзя удалить свою учётную запись")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    # Deactivate instead of hard-delete: user history (works, participations,
    # created tasks) must stay intact for past task records.
    user.is_active = False
    db.commit()
