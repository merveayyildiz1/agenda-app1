import sqlite3
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import uvicorn

import models, schemas, database


models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()


def ensure_journal_user_column():
    conn = sqlite3.connect("agenda.db")
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(journal_entries)")
        columns = [row[1] for row in cursor.fetchall()]
        if "user_id" not in columns:
            cursor.execute("ALTER TABLE journal_entries ADD COLUMN user_id INTEGER")
            conn.commit()
    finally:
        conn.close()


ensure_journal_user_column()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

SECRET_KEY = "super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik dogrulanamadi.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str | None = payload.get("sub")
        if user_email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == user_email).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Bu email ile kayıtlı bir kullanıcı zaten var.")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(full_name=user.full_name, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı e-posta veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "full_name": db_user.full_name}

@app.put("/me/password")
def change_password(
    payload: schemas.PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mevcut sifre hatali.")

    new_password = payload.new_password.strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Yeni sifre en az 6 karakter olmali.")

    if verify_password(new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Yeni sifre eski sifre ile ayni olamaz.")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": "Sifre basariyla degistirildi."}


@app.get("/journal", response_model=list[schemas.JournalEntryOut])
def list_journal_entries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.JournalEntry)
        .filter(models.JournalEntry.user_id == current_user.id)
        .order_by(models.JournalEntry.created_at.desc())
        .all()
    )


@app.post("/journal", response_model=schemas.JournalEntryOut)
def create_journal_entry(
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    content = entry.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Gunluk icerigi bos olamaz.")

    new_entry = models.JournalEntry(content=content, user_id=current_user.id)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@app.put("/journal/{entry_id}", response_model=schemas.JournalEntryOut)
def update_journal_entry(
    entry_id: int,
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    content = entry.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Gunluk icerigi bos olamaz.")

    journal_entry = (
        db.query(models.JournalEntry)
        .filter(models.JournalEntry.id == entry_id, models.JournalEntry.user_id == current_user.id)
        .first()
    )
    if not journal_entry:
        raise HTTPException(status_code=404, detail="Gunluk kaydi bulunamadi.")

    journal_entry.content = content
    db.commit()
    db.refresh(journal_entry)
    return journal_entry


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
