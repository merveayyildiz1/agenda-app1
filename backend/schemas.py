from pydantic import BaseModel
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str


class JournalEntryCreate(BaseModel):
    content: str


class JournalEntryOut(BaseModel):
    id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AgendaTaskCreate(BaseModel):
    task_date: str
    content: str
    color: str


class AgendaTaskStatusUpdate(BaseModel):
    completed: bool


class AgendaTaskOut(BaseModel):
    id: int
    task_date: str
    content: str
    color: str
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True
