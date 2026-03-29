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
