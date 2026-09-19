from collections.abc import Sequence
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Achievement, CravingLog, RelapseIncident, User, UserTrigger


DEFAULT_TRIGGERS = (
    ("Утренний кофе перед работой", 8 * 60 + 30),
    ("После сытного обеда", 13 * 60 + 15),
    ("Вечерние пробки в Астане", 18 * 60 + 45),
    ("Домашний вечерний отдых", 21 * 60),
)


async def get_user(session: AsyncSession, user_id: int) -> User | None:
    return await session.get(User, user_id)


async def get_or_create_user(
    session: AsyncSession, user_id: int, username: str | None, first_name: str
) -> User:
    user = await get_user(session, user_id)
    if user is None:
        user = User(
            id=user_id,
            username=username,
            first_name=first_name or "Друг",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


async def complete_onboarding(
    session: AsyncSession,
    user: User,
    quit_at: datetime | date,
    nicotine_type: str,
    pack_price_kzt: float,
    units_per_day: float,
    financial_goal_kzt: float = 0,
) -> User:
    user_tz = ZoneInfo(user.timezone or "Asia/Almaty")
    if isinstance(quit_at, datetime):
        if quit_at.tzinfo is None:
            quit_at = quit_at.replace(tzinfo=user_tz)
        utc_dt = quit_at.astimezone(timezone.utc)
        user.quit_at = utc_dt
        user.quit_date = quit_at.astimezone(user_tz).date()
    else:
        user.quit_date = quit_at
        local_dt = datetime.combine(quit_at, time(0, 0, 0), tzinfo=user_tz)
        user.quit_at = local_dt.astimezone(timezone.utc)

    user.nicotine_type = nicotine_type
    user.pack_price_kzt = pack_price_kzt
    user.units_per_day = units_per_day
    user.financial_goal_kzt = financial_goal_kzt
    user.onboarding_complete = True
    session.add(user)

    for label, time_minutes in DEFAULT_TRIGGERS:
        exists = await session.scalar(
            select(UserTrigger).where(
                UserTrigger.user_id == user.id, UserTrigger.time_minutes == time_minutes
            )
        )
        if exists is None:
            session.add(UserTrigger(user_id=user.id, label=label, time_minutes=time_minutes))

    await session.commit()
    await session.refresh(user)
    return user


async def update_quit_time(
    session: AsyncSession,
    user_id: int,
    quit_at: datetime,
) -> User:
    user = await get_user(session, user_id)
    if user is None:
        raise LookupError("Пользователь не найден")
    user_tz = ZoneInfo(user.timezone or "Asia/Almaty")
    if quit_at.tzinfo is None:
        quit_at = quit_at.replace(tzinfo=user_tz)
    
    utc_dt = quit_at.astimezone(timezone.utc)
    user.quit_at = utc_dt
    user.quit_date = quit_at.astimezone(user_tz).date()
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def add_craving(
    session: AsyncSession,
    user_id: int,
    intensity: int,
    trigger: str,
    outcome: str = "resisted",
    notes: str | None = None,
) -> CravingLog:
    entry = CravingLog(
        user_id=user_id,
        intensity=max(1, min(10, intensity)),
        trigger=trigger[:120],
        outcome=outcome[:40],
        notes=notes[:2000] if notes else None,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry


async def add_relapse(
    session: AsyncSession,
    user_id: int,
    cigarettes: int,
    trigger: str,
    reflection: str = "",
    plan: str = "",
) -> RelapseIncident:
    incident = RelapseIncident(
        user_id=user_id,
        cigarettes=max(1, cigarettes),
        trigger=trigger[:120],
        reflection=reflection[:2000],
        plan=plan[:2000],
    )
    session.add(incident)

    # Reset active clean timer to the moment of relapse
    user = await get_user(session, user_id)
    if user:
        now_utc = datetime.now(timezone.utc)
        user_tz = ZoneInfo(user.timezone or "Asia/Almaty")
        user.quit_at = now_utc
        user.quit_date = now_utc.astimezone(user_tz).date()
        session.add(user)

    await session.commit()
    await session.refresh(incident)
    return incident


async def upsert_trigger(
    session: AsyncSession, user_id: int, label: str, time_minutes: int
) -> UserTrigger:
    existing = await session.scalar(
        select(UserTrigger).where(
            UserTrigger.user_id == user_id,
            UserTrigger.label == label[:160],
        )
    )
    if existing:
        existing.time_minutes = time_minutes
        existing.enabled = True
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return existing
    created = UserTrigger(user_id=user_id, label=label[:160], time_minutes=time_minutes)
    session.add(created)
    await session.commit()
    await session.refresh(created)
    return created


async def list_triggers(session: AsyncSession, user_id: int) -> Sequence[UserTrigger]:
    return (
        await session.scalars(
            select(UserTrigger)
            .where(UserTrigger.user_id == user_id)
            .order_by(UserTrigger.time_minutes.asc())
        )
    ).all()


async def toggle_trigger(session: AsyncSession, user_id: int, trigger_id: int) -> UserTrigger | None:
    trigger = await session.scalar(
        select(UserTrigger).where(UserTrigger.id == trigger_id, UserTrigger.user_id == user_id)
    )
    if trigger is None:
        return None
    trigger.enabled = not trigger.enabled
    session.add(trigger)
    await session.commit()
    await session.refresh(trigger)
    return trigger



async def delete_trigger(session: AsyncSession, user_id: int, trigger_id: int) -> bool:
    trigger = await session.scalar(
        select(UserTrigger).where(UserTrigger.id == trigger_id, UserTrigger.user_id == user_id)
    )
    if trigger is None:
        return False
    await session.delete(trigger)
    await session.commit()
    return True


async def mark_radar_sent(session: AsyncSession, trigger_id: int) -> None:
    trigger = await session.get(UserTrigger, trigger_id)
    if trigger:
        trigger.last_radar_sent = datetime.utcnow()
        session.add(trigger)
        await session.commit()


async def radar_targets(session: AsyncSession) -> Sequence[tuple[UserTrigger, User]]:
    query = (
        select(UserTrigger, User)
        .join(User, User.id == UserTrigger.user_id)
        .where(UserTrigger.enabled.is_(True), User.onboarding_complete.is_(True))
    )
    result = await session.execute(query)
    return result.all()


async def add_achievement(session: AsyncSession, user_id: int, code: str) -> Achievement:
    existing = await session.scalar(
        select(Achievement).where(Achievement.user_id == user_id, Achievement.code == code)
    )
    if existing:
        return existing
    ach = Achievement(user_id=user_id, code=code)
    session.add(ach)
    await session.commit()
    await session.refresh(ach)
    return ach


async def list_achievements(session: AsyncSession, user_id: int) -> Sequence[Achievement]:
    return (
        await session.scalars(
            select(Achievement).where(Achievement.user_id == user_id).order_by(Achievement.earned_at.asc())
        )
    ).all()


async def build_stats(session: AsyncSession, user_id: int) -> dict:
    user = await get_user(session, user_id)
    if user is None:
        raise LookupError("Пользователь не найден")
    user_tz = ZoneInfo(user.timezone or "Asia/Almaty")
    now_utc = datetime.now(timezone.utc)

    quit_dt = user.quit_at
    if quit_dt is None and user.quit_date:
        local_dt = datetime.combine(user.quit_date, time(0, 0, 0), tzinfo=user_tz)
        quit_dt = local_dt.astimezone(timezone.utc)
    elif quit_dt is not None:
        if quit_dt.tzinfo is None:
            quit_dt = quit_dt.replace(tzinfo=timezone.utc)

    if quit_dt:
        seconds_free = max(0.0, (now_utc - quit_dt).total_seconds())
        iso_str = quit_dt.isoformat()
    else:
        seconds_free = 0.0
        iso_str = None

    clean_days = int(seconds_free // 86400)
    clean_hours = int((seconds_free % 86400) // 3600)
    clean_minutes = int((seconds_free % 3600) // 60)
    clean_seconds = int(seconds_free % 60)

    fractional_days = seconds_free / 86400.0
    daily_cost = (user.units_per_day / max(user.pack_size, 1)) * user.pack_price_kzt
    saved = round(fractional_days * daily_cost, 2)
    minutes_returned = round(fractional_days * user.units_per_day * 11)

    total_days = max(1, clean_days + 1)
    relapse_count = int(
        await session.scalar(
            select(func.count(RelapseIncident.id)).where(RelapseIncident.user_id == user_id)
        )
        or 0
    )
    cravings_resisted = int(
        await session.scalar(
            select(func.count(CravingLog.id)).where(
                CravingLog.user_id == user_id, CravingLog.outcome == "resisted"
            )
        )
        or 0
    )

    clean_pct_val = round(max(0.0, (total_days - relapse_count) / total_days * 100), 1)

    achievements = await list_achievements(session, user_id)
    if clean_days >= 1:
        await add_achievement(session, user_id, "first_day")
    if clean_days >= 7:
        await add_achievement(session, user_id, "week_free")
    if clean_days >= 30:
        await add_achievement(session, user_id, "month_free")
    if cravings_resisted >= 10:
        await add_achievement(session, user_id, "craving_master")
    achievements = await list_achievements(session, user_id)

    cravings_by_day_list = await get_cravings_by_day(session, user_id, days=14)

    return {
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "city": user.city,
            "nicotine_type": user.nicotine_type,
            "quit_date": user.quit_date.isoformat() if user.quit_date else None,
            "quit_at": iso_str,
            "pack_price_kzt": user.pack_price_kzt,
            "units_per_day": user.units_per_day,
            "financial_goal_kzt": user.financial_goal_kzt,
        },
        "days_free": clean_days,
        "hours_free": clean_hours,
        "minutes_free": clean_minutes,
        "seconds_free": clean_seconds,
        "total_seconds_free": int(seconds_free),
        "daily_cost_kzt": round(daily_cost, 2),
        "saved_kzt": saved,
        "minutes_returned": minutes_returned,
        "relapse_count": relapse_count,
        "cravings_resisted": cravings_resisted,
        "clean_percent": clean_pct_val,
        "clean_track_percent": clean_pct_val,
        "cravings_by_day": cravings_by_day_list,
        "achievements": [
            {"code": item.code, "earned_at": item.earned_at.isoformat()} for item in achievements
        ],
    }


async def get_cravings_by_day(session: AsyncSession, user_id: int, days: int = 14) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    threshold_dt = datetime.combine(start_date, time(0, 0, 0), tzinfo=timezone.utc)

    cravings = (
        await session.scalars(
            select(CravingLog)
            .where(CravingLog.user_id == user_id, CravingLog.logged_at >= threshold_dt)
            .order_by(CravingLog.logged_at.asc())
        )
    ).all()

    relapses = (
        await session.scalars(
            select(RelapseIncident)
            .where(RelapseIncident.user_id == user_id, RelapseIncident.happened_at >= threshold_dt)
            .order_by(RelapseIncident.happened_at.asc())
        )
    ).all()

    days_map: dict[str, dict[str, int]] = {}
    for i in range(days):
        d_str = (start_date + timedelta(days=i)).isoformat()
        days_map[d_str] = {"resisted": 0, "relapses": 0}

    for c in cravings:
        d_str = c.logged_at.date().isoformat()
        if d_str in days_map:
            if c.outcome == "resisted":
                days_map[d_str]["resisted"] += 1
            else:
                days_map[d_str]["relapses"] += 1

    for r in relapses:
        d_str = r.happened_at.date().isoformat()
        if d_str in days_map:
            days_map[d_str]["relapses"] += max(1, r.cigarettes or 1)

    return [
        {"date": k, "resisted": v["resisted"], "relapses": v["relapses"]}
        for k, v in sorted(days_map.items())
    ]


async def recent_cravings(session: AsyncSession, user_id: int, days: int = 14) -> list[dict]:
    threshold = datetime.utcnow() - timedelta(days=days)
    records = (
        await session.scalars(
            select(CravingLog)
            .where(CravingLog.user_id == user_id, CravingLog.logged_at >= threshold)
            .order_by(CravingLog.logged_at.asc())
        )
    ).all()
    return [
        {
            "id": r.id,
            "intensity": r.intensity,
            "trigger": r.trigger,
            "outcome": r.outcome,
            "date": r.logged_at.date().isoformat(),
        }
        for r in records
    ]
