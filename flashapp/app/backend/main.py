from fastapi import FastAPI, File, Form, UploadFile, Depends, HTTPException, Request, Response
from fastapi import FastAPI, File, Form, UploadFile, Depends, HTTPException, Request, Response
from clerk_backend_api import Clerk, AuthenticateRequestOptions
from fastapi.middleware.cors import CORSMiddleware
import tempfile
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker, joinedload
from typing import List, Optional
from models import Base, User, Deck, Card, Note, Quiz, QuizAttempt
from fastapi.responses import JSONResponse
from pdfminer.high_level import extract_text
import os
from ai_generator import get_cards
from note_summarize import generate_notes
from typing import Dict
from get_transcript import transcript
import requests
from dotenv import load_dotenv
from typing_extensions import Literal
import uuid, json, time
from datetime import datetime

load_dotenv()



SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class CardSchema(BaseModel):
    id: int
    question: str
    answer: str

    class Config:
        from_attributes = True

class DeckSchema(BaseModel):
    id: int
    name: str
    description: Optional[str]
    cards: List[CardSchema] = []

    class Config:
        from_attributes = True

class UserSchema(BaseModel):
    id: int
    clerk_id: str
    decks: List[DeckSchema] = []

    class Config:
        from_attributes = True

class NoteSchema(BaseModel):
    id: int
    title: str
    content: str
    source_type: Optional[str] = None
    source_info: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class QuizSchema(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    time_limit: int = 300
    questions: str  # JSON string
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class QuizAttemptSchema(BaseModel):
    id: int
    quiz_id: str
    answers: str  # JSON string
    score: int
    total: int
    completed: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    class Config:
        from_attributes = True

class FlashCard(BaseModel):
    id: str
    front: str
    back: str

class DeckSnapshot(BaseModel):
    cards: List[FlashCard]

class ChatRequest(BaseModel):
    message: str
    deckSnapshot: DeckSnapshot
    history: list[dict] = Field(default_factory=list)

class LLMCommand(BaseModel):
    name: Literal[
        "add_card",
        "update_card",
        "delete_card",
        "change_difficulty",
        "bulk_add",
        "bulk_delete",
        "bulk_update"
    ]
    arguments: dict

class ProposalPacket(BaseModel):
    proposalId: str
    commands: List[LLMCommand]
    humanSummary: List[str]

class ApplyRequest(BaseModel):
    proposalId: str
    acceptedIndexes: List[int]
    deckSnapshot: DeckSnapshot

class ApplyResponse(BaseModel):
    newDeck: DeckSnapshot

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

clerk_sdk  = Clerk(
    bearer_auth = os.getenv("CLERK_SECRET_AUTH")
)

def authenticate_user(request: Request):
    print(f"Authenticating request headers: {dict(request.headers)}")
    try:
        # Check if Authorization header exists
        auth_header = request.headers.get("authorization")
        if not auth_header:
            print("No authorization header found")
            raise HTTPException(status_code=401, detail="No authorization header")
        
        print(f"Auth header: {auth_header[:50]}...")  # Don't log full token
        
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:3000"],
                jwt_key=os.getenv("JWT_KEY"),
            )
        )
        
        print(f"Request state: is_signed_in={request_state.is_signed_in}")
        
        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Not signed in")
            
        print(f"Authentication successful for user: {request_state.payload.get('sub', 'unknown')}")
        return request_state.payload
        
    except Exception as e:
        print(f"Authentication error details: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    
def get_current_user(
    payload = Depends(authenticate_user),
    db      = Depends(get_db),
):
    clerk_id = payload["sub"]
    user = db.query(User).filter_by(clerk_id=clerk_id).first()
    if not user:
        user = User(
            clerk_id=clerk_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/users", response_model=List[UserSchema])
def read_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.get("/me", response_model=UserSchema)
def get_my_profile(
    user: User      = Depends(get_current_user)
):
    return {
        "id":        user.id,
        "decks":     user.decks,
        "clerk_id":  user.clerk_id,
    }

@app.get("/decks/me", response_model=List[DeckSchema])
def read_my_decks(
    user: User      = Depends(get_current_user),
    db:   Session   = Depends(get_db),
):
    print(f"User ID: {user.id}")
    decks = (
        db.query(Deck)
            .options(joinedload(Deck.cards))
            .filter(Deck.user_id == user.id)
            .all()
    )
    print(f"Decks found: {len(decks)}")
    return decks

#command to run the server
# uvicorn main:app --reload

@app.get("/decks/{deck_id}", response_model=DeckSchema)
def read_deck(
    deck_id: int, 
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific deck by ID (user must own the deck)"""
    try:
        deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user.id).first()
        if not deck:
            raise HTTPException(404, f"Deck {deck_id} not found")
        return deck
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving deck: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve deck: {str(e)}")

@app.get("/cards/{card_id}", response_model=CardSchema)
def read_card(
    card_id: int, 
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific card by ID (user must own the deck containing the card)"""
    try:
        card = db.query(Card).join(Deck).filter(
            Card.id == card_id,
            Deck.user_id == user.id
        ).first()
        if not card:
            raise HTTPException(404, f"Card {card_id} not found")
        return card
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving card: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve card: {str(e)}")

@app.post("/decks", response_model=DeckSchema)
def create_deck(deck: DeckSchema, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db_deck = Deck(**deck.model_dump(), user_id=user.id)
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)
    return db_deck



@app.post("/generate", response_model=DeckSchema, status_code=201)
async def generate_flashcards(
    prompt: str              = Form(...),
    count: int               = Form(...),
    front_text_length: str   = Form(...),
    back_text_length: str    = Form(...),
    files: List[UploadFile]  = File([]),
    links: List[str]         = Form([]),
    db: Session              = Depends(get_db),
    user: User               = Depends(get_current_user),
):
    """Generate flashcards using AI from provided content"""
    try:
        # Validate inputs
        if count <= 0 or count > 100:
            raise HTTPException(400, "Count must be between 1 and 100")
        
        textfromPDF = ""
        for up in files:
            if not up.filename.lower().endswith(".pdf"):
                raise HTTPException(400, "Only PDF files are allowed.")
            try:
                textfromPDF += extract_text(up.file)
            except Exception as e:
                print(f"Error extracting text from {up.filename}: {e}")
                raise HTTPException(400, f"Failed to extract text from {up.filename}")

        # Extract text from YouTube links
        textFromYoutube = ""
        for link in links:
            try:
                textFromYoutube += transcript(link)
            except Exception as e:
                print(f"Error extracting transcript from {link}: {e}")
                # Continue with other links instead of failing completely

        combined_content = textfromPDF + textFromYoutube + prompt
        if not combined_content.strip():
            raise HTTPException(400, "No content provided. Please provide a prompt, upload files, or add video links.")

        # Generate cards using AI
        name, description, cards_json = get_cards(
            user_input        = prompt,
            front_text_length = front_text_length,
            back_text_length  = back_text_length,
            count             = count,
            textfromPDF       = textfromPDF + textFromYoutube,
        )

        if not cards_json or len(cards_json) == 0:
            raise HTTPException(500, "Failed to generate any cards. Please try with different content or parameters.")

        # Create deck in database
        deck = Deck(name=name, description=description, user_id=user.id)
        db.add(deck)
        db.commit()
        db.refresh(deck)

        # Add cards to deck
        for c in cards_json:
            db.add(Card(question=c["question"], answer=c["answer"], deck_id=deck.id))
        
        db.commit()
        db.refresh(deck)

        return deck
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error generating flashcards: {str(e)}")
        raise HTTPException(500, f"Failed to generate flashcards: {str(e)}")

@app.post("/generateNotes", response_model=NoteSchema, status_code=201)
async def generateNotes(
    prompt: str              = Form(...),
    files: List[UploadFile]  = File([]),
    links: List[str]         = Form([]),
    db: Session              = Depends(get_db),
    user: User               = Depends(get_current_user),
):
    try:
        textfromPDF = ""
        source_files = []
        
        for up in files:
            if not up.filename.lower().endswith(".pdf"):
                raise HTTPException(400, "Only PDF files are allowed.")
            textfromPDF += extract_text(up.file)
            source_files.append(up.filename)
        
        textFromYoutube = ""
        for link in links:
            textFromYoutube += transcript(link)
        
        # Combine all text sources
        lec = textfromPDF + textFromYoutube + prompt
        
        if not lec.strip():
            raise HTTPException(400, "No content provided. Please upload files, provide links, or enter text.")
        
        # Generate notes using AI
        markdown_content = generate_notes(sample_lecture=lec)
        
        # Create source info
        source_info = {
            "files": source_files,
            "links": links,
            "prompt": prompt[:200] + "..." if len(prompt) > 200 else prompt
        }
        
        # Generate title from content
        title = f"Study Notes - {prompt[:50]}" if prompt else "Generated Study Notes"
        if len(title) > 50:
            title = title[:47] + "..."
        
        # Save to database
        note = Note(
            title=title,
            content=markdown_content,
            source_type="mixed" if (source_files and links) else ("pdf" if source_files else ("youtube" if links else "manual")),
            source_info=json.dumps(source_info),
            user_id=user.id
        )
        
        db.add(note)
        db.commit()
        db.refresh(note)
        
        # Convert datetime fields to strings for response
        return NoteSchema(
            id=note.id,
            title=note.title,
            content=note.content,
            source_type=note.source_type,
            source_info=note.source_info,
            created_at=note.created_at.isoformat() if note.created_at else None,
            updated_at=note.updated_at.isoformat() if note.updated_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating notes: {str(e)}")
        raise HTTPException(500, f"Failed to generate notes: {str(e)}")

_proposal_store: dict[str, dict] = {}

from chat_script import getResponse

@app.post("/flashcards/chat", response_model=ProposalPacket, status_code=201)
def chat(req: ChatRequest):
    print(f"=== BACKEND DEBUG ===")
    print(f"Received message: {req.message}")
    print(f"Number of cards received: {len(req.deckSnapshot.cards)}")
    for i, card in enumerate(req.deckSnapshot.cards):
        print(f"Card {i + 1}: id='{card.id}', front='{card.front}', back='{card.back}'")
    print(f"=== END BACKEND DEBUG ===")
    
    outline = "\n".join(
        f"{i+1}: {c.front} → {c.back}" for i, c in enumerate(req.deckSnapshot.cards)
    )
    print(f"Outline for LLM:\n{outline}\n")

    fn_call = getResponse(req.message, outline)
    print(f"Model function call: {fn_call}")
    
    try:
        # Check if fn_call is None or invalid
        if fn_call is None:
            print("ERROR: LLM returned None - no function call generated")
            raise HTTPException(400, "AI couldn't understand your request. Try being more specific like 'make card 1 harder' or 'update all questions to be more challenging'")
        
        # Check if fn_call has the expected attributes
        if not hasattr(fn_call, 'name') or not hasattr(fn_call, 'arguments'):
            print(f"ERROR: Invalid function call structure: {fn_call}")
            raise HTTPException(400, "AI response was malformed. Please try rephrasing your request.")
        
        # If the model produced *one* function call
        if fn_call.name:
            commands_raw = [{
                "name": fn_call.name,
                "arguments": json.loads(fn_call.arguments)
            }]
        else:
            commands_raw = json.loads(fn_call.arguments)
            
        if isinstance(commands_raw, dict):
            commands_raw = [commands_raw]
            
        cmd_objs = [LLMCommand(**c) for c in commands_raw]
        print(f"Model produced {len(cmd_objs)} commands: {cmd_objs}")

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        raise HTTPException(400, f"AI response had invalid JSON: {e}")
    except Exception as exc:
        print(f"Error processing AI response: {exc}")
        raise HTTPException(400, f"Could not process AI response: {exc}")

    # Validate command arguments
    snapshot_ids = {c.id for c in req.deckSnapshot.cards}
    for c in cmd_objs:
        if c.name != "add_card" and c.name != "bulk_add":
            if "id" in c.arguments and c.arguments["id"] not in snapshot_ids:
                raise HTTPException(400, f"ID {c.arguments['id']} not in deck")

    proposal_id = str(uuid.uuid4())
    human: list[str] = []
    for c in cmd_objs:
        if c.name == "update_card":
            human.append(f"✏️ Update card {c.arguments['id']}")
        elif c.name == "delete_card":
            human.append(f"🗑️ Delete card {c.arguments['id']}")
        elif c.name == "add_card":
            human.append("➕ Add new card")
        elif c.name == "bulk_add":
            human.append(f"➕ Add {len(c.arguments.get('cards', []))} cards")
        elif c.name == "bulk_delete":
            human.append(f"🗑️ Delete {len(c.arguments.get('ids', []))} cards")
        elif c.name == "bulk_update":
            human.append(f"✏️ Update {len(c.arguments.get('updates', []))} cards")
            
    _proposal_store[proposal_id] = {
        "commands": [c.model_dump() for c in cmd_objs],
    }
    
    return ProposalPacket(
        proposalId=proposal_id,
        commands=cmd_objs,
        humanSummary=human,
    )
#chat takes in a human request, gives it to the LLM, maps the LLM response to commands then turns them into a proposal packet for the user to accept or reject

def _apply_commands(snapshot: DeckSnapshot, commands: list[LLMCommand]) -> DeckSnapshot:
    cards = {c.id: c for c in snapshot.cards}
    for cmd in commands:
        if cmd.name == "update_card":
            c = cards[cmd.arguments["id"]]
            c.front = cmd.arguments.get("front", c.front)
            c.back  = cmd.arguments.get("back",  c.back)
        elif cmd.name == "delete_card":
            cards.pop(cmd.arguments["id"], None)
        elif cmd.name == "add_card":
            new_id = cmd.arguments.get("id") or str(uuid.uuid4())
            cards[new_id] = FlashCard(id=new_id,
                                        front=cmd.arguments["front"],
                                        back=cmd.arguments["back"])
        elif cmd.name == "bulk_update":
            for item in cmd.arguments["updates"]:
                card = cards[item["id"]]
                if "front" in item:
                    card.front = item["front"]
                if "back" in item:
                    card.back = item["back"]
        elif cmd.name == "bulk_add":
            for item in cmd.arguments.get("cards", []):
                new_id = item.get("id") or str(uuid.uuid4())
                cards[new_id] = FlashCard(id=new_id, question=item["question"], answer=item["answer"])
        elif cmd.name == "bulk_delete":
            for cid in cmd.arguments.get("ids", []):
                cards.pop(cid, None)

    return DeckSnapshot(cards=list(cards.values()))

@app.post("/flashcards/apply", response_model=ApplyResponse)
def apply(req: ApplyRequest):
    p = _proposal_store.get(req.proposalId)
    if not p:
        raise HTTPException(404, "Proposal not found")

    chosen_cmds = [p["commands"][i] for i in req.acceptedIndexes]
    cmd_objs = [LLMCommand(**c) for c in chosen_cmds]

    patched = _apply_commands(req.deckSnapshot, cmd_objs)
    return ApplyResponse(newDeck=patched)

#apply takes in a proposal packet, applies the commands to the deck snapshot and returns a new deck snapshot


@app.put("/decks/{deck_id}", response_model=DeckSchema)
def update_deck(
    deck_id: int, 
    deck: DeckSchema, 
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a deck (user must own the deck)"""
    try:
        db_deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user.id).first()
        if not db_deck:
            raise HTTPException(404, f"Deck {deck_id} not found")

        # Update basic deck fields (name, description)
        for key, value in deck.model_dump().items():
            if key not in ["cards", "id"]:
                setattr(db_deck, key, value)
        
        # Handle cards update if cards are provided
        if deck.cards:
            # Remove existing cards
            db.query(Card).filter(Card.deck_id == deck_id).delete()
            
            # Add new cards
            for card_data in deck.cards:
                new_card = Card(
                    question=card_data.question,
                    answer=card_data.answer,
                    deck_id=deck_id
                )
                db.add(new_card)
        
        db.commit()
        db.refresh(db_deck)
        return db_deck
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating deck: {str(e)}")
        raise HTTPException(500, f"Failed to update deck: {str(e)}")


from typing import List, Literal, Dict, Any, Optional

class QuizItem(BaseModel):
    id: str
    type: Literal["mcq", "tf", "short", "long"]
    prompt: str
    options: List[str] | None = None   # for MCQ only
    answer: str                       # canonical answer / letter / True/False

class GenerateQuizResponse(BaseModel):
    quiz_id: str
    questions: List[QuizItem]  # without answers on front‑end if desired
    time_limit: int

class UserAnswer(BaseModel):
    id: str
    answer: str

class QuizVerifyRequest(BaseModel):
    quiz_id: str
    answers: List[UserAnswer]

class ScoredItem(BaseModel):
    id: str
    score: int                     # 0/1
    correct: str | None = None     # present if user wrong or skipped
    feedback: str | None = None    # from LLM (for free‑forms)

class QuizVerifyResponse(BaseModel):
    total: int
    correct: int
    items: List[ScoredItem]

from try1 import generate_quiz_batch, grade_freeform_batch


QUIZZES: Dict[str, Dict[str, Any]] = {}

@app.post("/quiz/generate", response_model=GenerateQuizResponse, status_code=201)
async def generate_quiz(
    prompt: str            = Form(""),
    count: int             = Form(10),
    mix_config: str        = Form("{}"),
    time_limit: int        = Form(300),
    files: List[UploadFile]= File([]),
    links: List[str]       = Form([]),
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        pdf_text = ""
        for f in files:
            if f.filename.lower().endswith(".pdf"):
                pdf_text += extract_text(f.file)
        
        youtube_text = ""
        for link in links:
            try:
                youtube_text += transcript(link)
            except Exception as e:
                print(f"Error extracting transcript from {link}: {e}")
        
        context = "\n".join([prompt, pdf_text, youtube_text]).strip()
        
        if not context:
            raise HTTPException(400, "No content provided. Please provide a prompt, upload files, or add links.")
        
        mix = json.loads(mix_config or "{}")
        print(f"Generating quiz with context length: {len(context)}")
        
        questions = generate_quiz_batch(context, mix, count)
        print(f"Generated {len(questions)} questions")
        
        quiz_id = str(uuid.uuid4())
        
        # Save quiz to database
        quiz = Quiz(
            id=quiz_id,
            title=f"Quiz - {prompt[:50]}" if prompt else "Generated Quiz",
            description=f"Generated from context with {len(questions)} questions",
            time_limit=time_limit,
            questions=json.dumps([
                q if isinstance(q, dict) else q.dict() for q in questions
            ]),
            user_id=user.id
        )
        
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        
        # Also store in memory for active quizzes
        QUIZZES[quiz_id] = {
            "user_id": user.id,
            "questions": [
                q if isinstance(q, dict) else q.dict() for q in questions
            ],
            "time_limit": time_limit,
            "started_at": None,
        }

        return GenerateQuizResponse(quiz_id=quiz_id, questions=questions, time_limit=time_limit)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating quiz: {str(e)}")
        raise HTTPException(500, f"Failed to generate quiz: {str(e)}")


@app.post("/quiz/verify", response_model=QuizVerifyResponse)
def verify_quiz(
    req: QuizVerifyRequest, 
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        record = QUIZZES.get(req.quiz_id)
        if not record:
            raise HTTPException(404, "Quiz not found")
        if record["user_id"] != user.id:
            raise HTTPException(403, "Not your quiz")

        now = time.time()
        if record["started_at"] is None:
            record["started_at"] = now
        elapsed = now - record["started_at"]

        is_overtime = elapsed > record["time_limit"]

        ans_map = {a.id: a.answer for a in req.answers}

        results: List[ScoredItem] = []
        freeform_batch = []

        for q in record["questions"]:
            qobj = QuizItem(**q)
            user_ans = ans_map.get(qobj.id)
            if user_ans is None or (is_overtime and qobj.id not in ans_map):
                results.append(ScoredItem(id=qobj.id, score=0, correct=qobj.answer))
                continue

            if qobj.type in ("mcq", "tf"):
                ok = str(user_ans).strip().lower() == str(qobj.answer).strip().lower()
                results.append(ScoredItem(id=qobj.id, score=int(ok), correct=None if ok else qobj.answer))
            else:
                freeform_batch.append({"id": qobj.id, "user": user_ans, "gold": qobj.answer})

        if freeform_batch:
            try:
                graded = grade_freeform_batch(freeform_batch)
                for item in results:
                    if item.id in graded:
                        g = graded[item.id]
                        item.score = g["score"]
                        if g["score"] == 0:
                            item.correct = next(q["answer"] for q in record["questions"] if q["id"] == item.id)
                        item.feedback = g["feedback"]
            except Exception as e:
                print(f"Error grading freeform questions: {e}")
                # Continue with partial results

        total = len(record["questions"])
        correct = sum(r.score for r in results)
        
        # Save quiz attempt to database
        try:
            quiz_attempt = QuizAttempt(
                quiz_id=req.quiz_id,
                user_id=user.id,
                answers=json.dumps([{"id": a.id, "answer": a.answer} for a in req.answers]),
                score=correct,
                total=total,
                completed=1,  # 1 for completed, 0 for incomplete
                started_at=int(record["started_at"]),
                completed_at=int(now)
            )
            
            db.add(quiz_attempt)
            db.commit()
            db.refresh(quiz_attempt)
        except Exception as e:
            print(f"Error saving quiz attempt: {e}")
            # Continue without saving attempt
        
        return QuizVerifyResponse(total=total, correct=correct, items=results)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verifying quiz: {str(e)}")
        raise HTTPException(500, f"Failed to verify quiz: {str(e)}")

@app.get("/quiz/{quiz_id}", response_model=GenerateQuizResponse)
def get_quiz(
    quiz_id: str, 
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get quiz questions for taking the quiz (without answers)"""
    try:
        # First try to get from memory (active quizzes)
        record = QUIZZES.get(quiz_id)
        
        # If not in memory, try to load from database
        if not record:
            quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == user.id).first()
            if not quiz:
                raise HTTPException(404, "Quiz not found")
            
            # Load questions from database
            questions = json.loads(quiz.questions)
            record = {
                "user_id": user.id,
                "questions": questions,
                "time_limit": quiz.time_limit,
                "started_at": None,
            }
            # Add to memory for this session
            QUIZZES[quiz_id] = record
        
        if record["user_id"] != user.id:
            raise HTTPException(403, "Not your quiz")
        
        questions_without_answers = []
        for q in record["questions"]:
            q_copy = q.copy()
            if 'answer' in q_copy:
                del q_copy['answer']
            questions_without_answers.append(QuizItem(**q_copy, answer=""))
        
        return GenerateQuizResponse(
            quiz_id=quiz_id,
            questions=questions_without_answers,
            time_limit=record["time_limit"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving quiz: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve quiz: {str(e)}")

# Notes endpoints
@app.get("/notes/me", response_model=List[NoteSchema])
def read_my_notes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notes for the current user"""
    try:
        notes = db.query(Note).filter(Note.user_id == user.id).order_by(Note.created_at.desc()).all()
        
        # Convert to schema with proper datetime handling
        result = []
        for note in notes:
            result.append(NoteSchema(
                id=note.id,
                title=note.title,
                content=note.content,
                source_type=note.source_type,
                source_info=note.source_info,
                created_at=note.created_at.isoformat() if note.created_at else None,
                updated_at=note.updated_at.isoformat() if note.updated_at else None
            ))
        
        return result
    except Exception as e:
        print(f"Error retrieving notes: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve notes: {str(e)}")

@app.get("/notes/{note_id}", response_model=NoteSchema)
def read_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific note by ID"""
    try:
        note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
        if not note:
            raise HTTPException(404, f"Note {note_id} not found")
        
        return NoteSchema(
            id=note.id,
            title=note.title,
            content=note.content,
            source_type=note.source_type,
            source_info=note.source_info,
            created_at=note.created_at.isoformat() if note.created_at else None,
            updated_at=note.updated_at.isoformat() if note.updated_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving note: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve note: {str(e)}")

@app.put("/notes/{note_id}", response_model=NoteSchema)
def update_note(
    note_id: int,
    note_update: NoteSchema,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a specific note"""
    try:
        note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
        if not note:
            raise HTTPException(404, f"Note {note_id} not found")
        
        # Update note fields
        for key, value in note_update.model_dump(exclude_unset=True).items():
            if key not in ["id", "created_at", "updated_at"]:
                setattr(note, key, value)
        
        # Update timestamp
        note.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(note)
        
        return NoteSchema(
            id=note.id,
            title=note.title,
            content=note.content,
            source_type=note.source_type,
            source_info=note.source_info,
            created_at=note.created_at.isoformat() if note.created_at else None,
            updated_at=note.updated_at.isoformat() if note.updated_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating note: {str(e)}")
        raise HTTPException(500, f"Failed to update note: {str(e)}")

@app.delete("/notes/{note_id}")
def delete_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a specific note"""
    try:
        note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
        if not note:
            raise HTTPException(404, f"Note {note_id} not found")
        
        db.delete(note)
        db.commit()
        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting note: {str(e)}")
        raise HTTPException(500, f"Failed to delete note: {str(e)}")

# Quiz management endpoints
@app.get("/quizzes/me", response_model=List[QuizSchema])
def read_my_quizzes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all quizzes for the current user"""
    try:
        quizzes = db.query(Quiz).filter(Quiz.user_id == user.id).order_by(Quiz.created_at.desc()).all()
        # Convert datetime fields to strings for response
        result = []
        for quiz in quizzes:
            quiz_dict = {
                "id": quiz.id,
                "title": quiz.title,
                "description": quiz.description,
                "time_limit": quiz.time_limit,
                "questions": quiz.questions,
                "created_at": quiz.created_at.isoformat() if quiz.created_at else None
            }
            result.append(QuizSchema(**quiz_dict))
        return result
    except Exception as e:
        print(f"Error retrieving quizzes: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve quizzes: {str(e)}")

@app.get("/quiz/{quiz_id}/attempts", response_model=List[QuizAttemptSchema])
def get_quiz_attempts(
    quiz_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all attempts for a specific quiz"""
    try:
        # Verify quiz belongs to user
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == user.id).first()
        if not quiz:
            raise HTTPException(404, "Quiz not found")
        
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.user_id == user.id
        ).order_by(QuizAttempt.started_at.desc()).all()
        
        return attempts
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving quiz attempts: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve quiz attempts: {str(e)}")

@app.delete("/quiz/{quiz_id}")
def delete_quiz(
    quiz_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a quiz and all its attempts"""
    try:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == user.id).first()
        if not quiz:
            raise HTTPException(404, "Quiz not found")
        
        # Delete all attempts for this quiz
        db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).delete()
        
        # Delete the quiz
        db.delete(quiz)
        db.commit()
        
        # Remove from memory if present
        QUIZZES.pop(quiz_id, None)
        
        return {"message": "Quiz deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting quiz: {str(e)}")
        raise HTTPException(500, f"Failed to delete quiz: {str(e)}")

@app.delete("/decks/{deck_id}")
def delete_deck(
    deck_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a deck and all its cards"""
    try:
        deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == user.id).first()
        if not deck:
            raise HTTPException(404, f"Deck {deck_id} not found")
        
        # Delete all cards in the deck (should cascade automatically, but being explicit)
        db.query(Card).filter(Card.deck_id == deck_id).delete()
        
        # Delete the deck
        db.delete(deck)
        db.commit()
        
        return {"message": "Deck deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting deck: {str(e)}")
        raise HTTPException(500, f"Failed to delete deck: {str(e)}")