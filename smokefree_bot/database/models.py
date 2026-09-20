from datetime import date, datetime
from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    first_name: Mapped[str] = mapped_column(String(128), default="Друг")
    city: Mapped[str] = mapped_column(String(64), default="Астана")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Almaty")
    currency: Mapped[str] = mapped_column(String(10), default="KZT")
    quit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    nicotine_type: Mapped[str] = mapped_column(String(40), default="Сигареты")
    pack_price_kzt: Mapped[float] = mapped_column(Float, default=1050.0)
    pack_size: Mapped[int] = mapped_column(Integer, default=20)
    units_per_day: Mapped[float] = mapped_column(Float, default=15.0)
    financial_goal_kzt: Mapped[float] = mapped_column(Float, default=0.0)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cravings: Mapped[list["CravingLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    relapses: Mapped[list["RelapseIncident"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    triggers: Mapped[list["UserTrigger"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    achievements: Mapped[list["Achievement"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class CravingLog(Base):
    __tablename__ = "craving_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    intensity: Mapped[int] = mapped_column(Integer, default=5)
    trigger: Mapped[str] = mapped_column(String(120), default="неизвестно")
    outcome: Mapped[str] = mapped_column(String(40), default="resisted")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="cravings")

class UserTrigger(Base):
    __tablename__ = "user_triggers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String(160))
    time_minutes: Mapped[int] = mapped_column(Integer, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_radar_sent: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="triggers")

class RelapseIncident(Base):
    __tablename__ = "relapse_incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    trigger: Mapped[str] = mapped_column(String(120), default="неизвестно")
    cigarettes: Mapped[int] = mapped_column(Integer, default=1)
    reflection: Mapped[str] = mapped_column(Text, default="")
    plan: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="relapses")

class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(64), index=True)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="achievements")
