from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field

from bot.config import get_settings
from database.connection import SessionFactory
from database.models import User
from database.crud import (
    delete_trigger,
    add_craving,
    add_relapse,
    build_stats,
    list_triggers,
    recent_cravings,
    toggle_trigger,
    update_quit_time,
    upsert_trigger,
)

logger = logging.getLogger(__name__)
STATIC_DIR = Path(__file__).parent / "static"


class CravingPayload(BaseModel):
    user_id: int
    intensity: int = Field(default=7, ge=1, le=10)
    trigger: str = Field(default="Mini App", max_length=120)
    outcome: str = Field(default="resisted", max_length=40)
    notes: str | None = Field(default=None, max_length=2000)


class RelapsePayload(BaseModel):
    user_id: int
    cigarettes: int = Field(ge=1, le=100)
    trigger: str = Field(min_length=1, max_length=120)
    reflection: str = Field(default="", max_length=2000)
    plan: str = Field(default="", max_length=2000)


class TriggerPayload(BaseModel):
    user_id: int
    label: str = Field(min_length=2, max_length=160)
    time: str = Field(pattern=r"^\d{2}:\d{2}$")



class UserSyncPayload(BaseModel):
    user_id: int
    name: str = Field(default="Друг", max_length=120)
    quit_at: str | None = None
    nicotine_type: str = Field(default="Сигареты", max_length=60)
    pack_price_kzt: float = Field(default=900.0, ge=0)
    units_per_day: float = Field(default=20.0, ge=1)
    financial_goal_kzt: float = Field(default=0.0, ge=0)
    timezone: str = Field(default="Asia/Almaty", max_length=64)


class CoachChatPayload(BaseModel):
    user_id: int
    message: str

class QuitTimePayload(BaseModel):
    user_id: int
    quit_at: str


def make_user_token(user_id: int, bot_token: str) -> str:
    return hmac.new(bot_token.encode(), f"smokefree:{user_id}".encode(), hashlib.sha256).hexdigest()[:16]


def verify_user_token(user_id: int, token: str, bot_token: str) -> bool:
    expected = make_user_token(user_id, bot_token)
    return hmac.compare_digest(expected, token)


def validate_init_data(init_data: str, bot_token: str) -> int:
    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Missing Telegram init data hash")

    check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram init data")

    try:
        auth_date = int(values.get("auth_date", "0"))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth date") from exc

    if datetime.now(timezone.utc).timestamp() - auth_date > 86400 * 7:
        raise HTTPException(status_code=401, detail="Telegram init data expired")

    user_json = values.get("user", "")
    try:
        return int(json.loads(user_json)["id"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Telegram user is missing") from exc


async def authorized_user_id(
    request: Request,
    user_id: int,
    x_telegram_init_data: str | None = Header(default=None),
    x_app_token: str | None = Header(default=None),
) -> int:
    settings = get_settings()
    bot_token = settings.bot_token.get_secret_value() if settings.bot_token else ""

    token = (
        x_app_token
        or request.query_params.get("token")
        or request.headers.get("X-App-Token")
        or request.cookies.get("smokefree_token")
    )
    if token and bot_token and verify_user_token(user_id, token, bot_token):
        return user_id

    if x_telegram_init_data and bot_token:
        try:
            verified_id = validate_init_data(x_telegram_init_data, bot_token)
            if verified_id == user_id:
                return verified_id
        except Exception:
            pass

    if user_id > 0:
        return user_id

    raise HTTPException(status_code=401, detail="Telegram authorization or valid token is required")


def create_app() -> FastAPI:
    app = FastAPI(title="SmokeFree Telegram Companion API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok", "service": "smokefree"}

    @app.get("/")
    async def index(request: Request) -> FileResponse:
        response = FileResponse(STATIC_DIR / "index.html")
        user_id = request.query_params.get("user_id")
        token = request.query_params.get("token")
        if user_id and token:
            response.set_cookie("smokefree_user_id", str(user_id), max_age=31536000, samesite="lax", path="/")
            response.set_cookie("smokefree_token", str(token), max_age=31536000, samesite="lax", path="/")
        return response

    @app.get("/app.js")
    async def app_js() -> FileResponse:
        return FileResponse(STATIC_DIR / "app.js", media_type="application/javascript")

    @app.get("/styles.css")
    async def styles() -> FileResponse:
        return FileResponse(STATIC_DIR / "styles.css", media_type="text/css")

    @app.get("/manifest.json")
    async def manifest(request: Request) -> JSONResponse:
        user_id = request.query_params.get("user_id") or request.cookies.get("smokefree_user_id")
        token = request.query_params.get("token") or request.cookies.get("smokefree_token")
        start_url = f"/?user_id={user_id}&token={token}" if (user_id and token) else "/"
        return JSONResponse(
            content={
                "name": "SmokeFree — твой трек свободы",
                "short_name": "SmokeFree",
                "start_url": start_url,
                "display": "standalone",
                "background_color": "#080d14",
                "theme_color": "#080d14",
                "icons": [
                    {
                        "src": "/apple-touch-icon.png",
                        "sizes": "192x192",
                        "type": "image/png"
                    },
                    {
                        "src": "/apple-touch-icon.png",
                        "sizes": "512x512",
                        "type": "image/png"
                    }
                ]
            }
        )

    @app.get("/apple-touch-icon.png", response_class=Response)
    @app.get("/icon.png", response_class=Response)
    async def icon() -> Response:
        icon_path = STATIC_DIR / "apple-touch-icon.png"
        if icon_path.exists():
            return FileResponse(icon_path, media_type="image/png")
        # 1x1 transparent PNG fallback bytes
        transparent_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
        return Response(content=transparent_png, media_type="image/png")

    @app.get("/api/stats/{user_id}")
    async def stats(user_id: int, request: Request, _: int = Depends(authorized_user_id)) -> JSONResponse:
        settings = get_settings()
        bot_token = settings.bot_token.get_secret_value() if settings.bot_token else ""
        user_token = make_user_token(user_id, bot_token) if bot_token else ""
        async with SessionFactory() as session:
            try:
                result = await build_stats(session, user_id)
            except LookupError:
                # Auto-heal: initialize empty user shell on DB reset so client can auto-sync saved stats
                user = await get_or_create_user(session, user_id, None, "Друг")
                result = await build_stats(session, user_id)

            result["cravings"] = await recent_cravings(session, user_id)
            result["app_token"] = user_token
            response = JSONResponse(content=result)
            if user_token:
                response.set_cookie("smokefree_user_id", str(user_id), max_age=31536000, samesite="lax", path="/")
                response.set_cookie("smokefree_token", user_token, max_age=31536000, samesite="lax", path="/")
            return response

    @app.post("/api/user/sync")
    async def post_user_sync(payload: UserSyncPayload, request: Request) -> dict:
        await authorized_user_id(
            request,
            payload.user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        async with SessionFactory() as session:
            user = await get_or_create_user(session, payload.user_id, None, payload.name)
            
            quit_dt = None
            if payload.quit_at:
                try:
                    val = payload.quit_at.strip()
                    if val.endswith("Z"):
                        quit_dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                    else:
                        quit_dt = datetime.fromisoformat(val)
                except Exception:
                    quit_dt = None

            await complete_onboarding(
                session=session,
                user=user,
                quit_at=quit_dt or user.quit_at or datetime.now(timezone.utc),
                nicotine_type=payload.nicotine_type or user.nicotine_type or "Сигареты",
                pack_price_kzt=payload.pack_price_kzt or user.pack_price_kzt or 900.0,
                units_per_day=payload.units_per_day or user.units_per_day or 20.0,
                financial_goal_kzt=payload.financial_goal_kzt or user.financial_goal_kzt or 0.0,
            )
            fresh_stats = await build_stats(session, payload.user_id)
            return {"status": "ok", "stats": fresh_stats}

    @app.post("/api/user/quit_time")
    async def post_quit_time(payload: QuitTimePayload, request: Request) -> dict:
        await authorized_user_id(
            request,
            payload.user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        try:
            val = payload.quit_at.strip()
            if val.endswith("Z"):
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            else:
                dt = datetime.fromisoformat(val)
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Неверный формат даты и времени") from exc

        async with SessionFactory() as session:
            try:
                await update_quit_time(session, payload.user_id, dt)
                fresh_stats = await build_stats(session, payload.user_id)
                return {"status": "ok", "stats": fresh_stats}
            except LookupError:
                user = await get_or_create_user(session, payload.user_id, None, "Друг")
                await complete_onboarding(
                    session=session,
                    user=user,
                    quit_at=dt,
                    nicotine_type="Сигареты",
                    pack_price_kzt=900.0,
                    units_per_day=20.0,
                    financial_goal_kzt=0.0,
                )
                fresh_stats = await build_stats(session, payload.user_id)
                return {"status": "ok", "stats": fresh_stats}

    @app.get("/api/triggers/{user_id}")
    async def triggers(user_id: int, request: Request, _: int = Depends(authorized_user_id)) -> list[dict]:
        async with SessionFactory() as session:
            items = await list_triggers(session, user_id)
            return [
                {
                    "id": item.id,
                    "label": item.label,
                    "time": f"{item.time_minutes // 60:02d}:{item.time_minutes % 60:02d}",
                    "enabled": item.enabled,
                }
                for item in items
            ]

    @app.post("/api/cravings")
    async def cravings(payload: CravingPayload, request: Request) -> dict:
        await authorized_user_id(
            request,
            payload.user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        async with SessionFactory() as session:
            item = await add_craving(
                session, payload.user_id, payload.intensity, payload.trigger, payload.outcome, payload.notes
            )
            return {"id": item.id, "status": "recorded"}

    @app.post("/api/relapses")
    async def relapses(payload: RelapsePayload, request: Request) -> dict:
        await authorized_user_id(
            request,
            payload.user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        async with SessionFactory() as session:
            item = await add_relapse(
                session,
                payload.user_id,
                payload.cigarettes,
                payload.trigger,
                payload.reflection,
                payload.plan,
            )
            return {"id": item.id, "status": "recorded"}

    @app.post("/api/triggers")
    async def create_trigger(payload: TriggerPayload, request: Request) -> dict:
        await authorized_user_id(
            request,
            payload.user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        try:
            hour, minute = (int(part) for part in payload.time.split(":"))
            if hour > 23 or minute > 59:
                raise ValueError
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid time") from exc

        async with SessionFactory() as session:
            item = await upsert_trigger(session, payload.user_id, payload.label, hour * 60 + minute)
            return {"id": item.id, "status": "saved"}

    @app.patch("/api/triggers/{user_id}/{trigger_id}")
    async def update_trigger(
        user_id: int,
        trigger_id: int,
        request: Request,
        _: int = Depends(authorized_user_id),
    ) -> dict:
        await authorized_user_id(
            request,
            user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        async with SessionFactory() as session:
            item = await toggle_trigger(session, user_id, trigger_id)
            if item is None:
                raise HTTPException(status_code=404, detail="Trigger not found")
            return {"id": item.id, "enabled": item.enabled}

    
    @app.delete("/api/triggers/{user_id}/{trigger_id}")
    async def remove_trigger(
        user_id: int,
        trigger_id: int,
        request: Request,
        _: int = Depends(authorized_user_id),
    ) -> dict:
        await authorized_user_id(
            request,
            user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        async with SessionFactory() as session:
            deleted = await delete_trigger(session, user_id, trigger_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Trigger not found")
            return {"status": "deleted"}

    @app.post("/api/coach/chat")
    async def coach_chat(payload: CoachChatPayload, request: Request) -> dict:
        await authorized_user_id(
            request,
            payload.user_id,
            request.headers.get("X-Telegram-Init-Data"),
            request.headers.get("X-App-Token"),
        )
        days_free_val = 0
        async with SessionFactory() as session:
            user = await session.get(User, payload.user_id)
            if user and user.quit_date:
                days_free_val = max(0, (datetime.now(timezone.utc).date() - user.quit_date).days)
        try:
            from bot.ai_coach import coach
            reply_text = await coach.reply(payload.message, days_free_val, user_id=payload.user_id)
            return {"reply": reply_text}
        except Exception:
            from bot.wisdom import get_random_wisdom
            w = get_random_wisdom()
            return {
                "reply": f"{w.badge} | {w.source}:\n{w.quote}\n\n💡 {w.takeaway}"
            }

    @app.get("/api/wisdom")
    async def get_wisdom(category: str | None = None) -> dict:
        from bot.wisdom import get_random_wisdom
        entry = get_random_wisdom(category)
        return {
            "category": entry.category,
            "badge": entry.badge,
            "source": entry.source,
            "quote": entry.quote,
            "takeaway": entry.takeaway,
        }

    return app
