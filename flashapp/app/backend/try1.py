"""LLM helpers for quiz generation & grading.

Keep this file separate so you can swap models, tweak prompts, or add caching
without touching the FastAPI routes.
"""
from __future__ import annotations

import os, json, uuid
from typing import List, Dict, Literal
from openai import OpenAI, BadRequestError

class QuizItem(dict):
    """Typed dict-like for convenience; keys: id, type, prompt, options?, answer."""
    id: str
    type: Literal["mcq", "tf", "short", "long"]
    prompt: str
    options: List[str] | None
    answer: str

    def as_dict(self):
        return dict(self)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

COMPLETION_MODEL = os.getenv("OPENAI_QUIZ_MODEL", "gpt-4.1-nano")
TEMPERATURE = 0.3

QUIZ_BATCH_FN = {
    "name": "quiz_batch",
    "description": "Generate a batch of quiz questions covering the provided material.",
    "parameters": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "type": {"type": "string", "enum": ["mcq", "tf", "short", "long"]},
                        "prompt": {"type": "string"},
                        "options": {"type": "array", "items": {"type": "string"}},
                        "answer": {"type": "string"}
                    },
                    "required": ["id", "type", "prompt", "answer"]
                },
                "minItems": 1
            }
        },
        "required": ["questions"]
    }
}

GRADE_BATCH_FN = {
    "name": "grade_freeform_batch",
    "description": "Grade many free‑form answers (short/long). Return 1 if the user's answer is essentially correct, else 0, plus helpful feedback.",
    "parameters": {
        "type": "object",
        "properties": {
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "score": {"type": "integer", "enum": [0,1]},
                        "feedback": {"type": "string"},
                    },
                    "required": ["id", "score"]
                },
                "minItems": 1
            }
        },
        "required": ["results"]
    }
}


SYSTEM_QUIZ = (
    "You are a quiz-authoring AI. Create clear, unambiguous test questions. "
    "Respect the requested mix percentages. Vary difficulty from basic recall to higher-order thinking."
)

SYSTEM_GRADE = (
    "You are a strict grader. Score 1 if the learner's answer expresses the same key facts as the correct answer. "
    "Otherwise score 0 and give concise feedback."
)


def generate_quiz_batch(context: str, mix: Dict[str, int], count: int) -> List[QuizItem]:
    """Calls OpenAI to produce a quiz batch and returns QuizItem list."""
    user_msg = (
        f"Create {count} questions. Mix config (percentages): {mix}. "
        "Allowed types: mcq, tf, short, long. Include the correct answer for each."
    )

    messages = [
        {"role": "system", "content": SYSTEM_QUIZ},
        {"role": "assistant", "content": context[:8000]},
        {"role": "user", "content": user_msg},
    ]

    completion = client.chat.completions.create(
        model=COMPLETION_MODEL,
        messages=messages,
        functions=[QUIZ_BATCH_FN],
        function_call="auto",
        temperature=TEMPERATURE,
    )

    fn = completion.choices[0].message.function_call
    if not fn or fn.name != "quiz_batch":
        raise ValueError("Model failed to return quiz_batch function call")

    payload = json.loads(fn.arguments)
    return [QuizItem(**q) for q in payload["questions"]]


def grade_freeform_batch(batch: List[Dict[str, str]]) -> Dict[str, Dict[str, str]]:
    """Grade short/long answers. batch = [{id,user,gold}, …]. Return id -> {score,feedback}"""
    user_msg = "".join(
        f"\nQID:{b['id']}\nCorrect:{b['gold']}\nUser:{b['user']}\n---" for b in batch)

    messages = [
        {"role": "system", "content": SYSTEM_GRADE},
        {"role": "user", "content": user_msg},
    ]

    completion = client.chat.completions.create(
        model=COMPLETION_MODEL,
        messages=messages,
        functions=[GRADE_BATCH_FN],
        function_call="auto",
        temperature=0,
    )

    fn = completion.choices[0].message.function_call
    if not fn or fn.name != "grade_freeform_batch":
        raise ValueError("Model failed to return grade_freeform_batch call")

    payload = json.loads(fn.arguments)
    return {r["id"]: {"score": r["score"], "feedback": r.get("feedback", "")}
            for r in payload["results"]}
