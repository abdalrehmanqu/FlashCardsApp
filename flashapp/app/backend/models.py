from sqlalchemy import (
    DateTime,
    create_engine,
    MetaData,
    Table,
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    func,
    Boolean,
)
from sqlalchemy.orm import (
    declarative_base,
    relationship,
    sessionmaker,
)
import json

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, echo=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id   = Column(Integer, primary_key=True)
    clerk_id = Column(String, unique=True, index=True, nullable=False)
    decks = relationship("Deck", back_populates="owner")
    notes = relationship("Note", back_populates="owner")
    quizzes = relationship("Quiz", back_populates="owner")


class Deck(Base):
    __tablename__ = "decks"
    id          = Column(Integer, primary_key=True)
    name        = Column(String, index=True, nullable=False)
    description = Column(Text)
    user_id     = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())
    owner       = relationship("User", back_populates="decks")
    cards       = relationship("Card", back_populates="deck")

class Card(Base):
    __tablename__ = "cards"
    id       = Column(Integer, primary_key=True)
    question = Column(Text, nullable=False)
    answer   = Column(Text, nullable=False)
    deck_id  = Column(Integer, ForeignKey("decks.id"))
    deck     = relationship("Deck", back_populates="cards")

class Note(Base):
    __tablename__ = "notes"
    id          = Column(Integer, primary_key=True)
    title       = Column(String, index=True, nullable=False)
    content     = Column(Text, nullable=False)  # Markdown content
    source_type = Column(String)  # 'pdf', 'youtube', 'manual', etc.
    source_info = Column(Text)    # JSON with file names, URLs, etc.
    user_id     = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())
    owner       = relationship("User", back_populates="notes")

class Quiz(Base):
    __tablename__ = "quizzes"
    id          = Column(String, primary_key=True)  # UUID string
    title       = Column(String, index=True)
    description = Column(Text)
    time_limit  = Column(Integer, default=300)  # seconds
    questions   = Column(Text)  # JSON array of questions
    user_id     = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime, server_default=func.now())
    owner       = relationship("User", back_populates="quizzes")
    attempts    = relationship("QuizAttempt", back_populates="quiz")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id          = Column(Integer, primary_key=True)
    quiz_id     = Column(String, ForeignKey("quizzes.id"))
    user_id     = Column(Integer, ForeignKey("users.id"))
    answers     = Column(Text)  # JSON array of user answers
    score       = Column(Integer)  # number correct
    total       = Column(Integer)  # total questions
    completed   = Column(Integer, default=0)  # 0 = in progress, 1 = completed
    started_at  = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)
    quiz        = relationship("Quiz", back_populates="attempts")
    user        = relationship("User")

Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)