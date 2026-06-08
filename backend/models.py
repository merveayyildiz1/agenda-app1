from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    photo = Column(Text, nullable=True)
    photo_offset_x = Column(Integer, nullable=False, default=0)
    photo_offset_y = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AgendaTask(Base):
    __tablename__ = "agenda_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_date = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    color = Column(String, nullable=False, default="#EF4444")
    task_time = Column(String, nullable=True)
    completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
