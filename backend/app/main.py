from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, calendar, catalog, clients, settings as settings_router, task_stages, tasks, users

settings = get_settings()

app = FastAPI(title="CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(clients.router)
app.include_router(task_stages.router)
app.include_router(tasks.router)
app.include_router(calendar.router)
app.include_router(catalog.router)
app.include_router(settings_router.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
