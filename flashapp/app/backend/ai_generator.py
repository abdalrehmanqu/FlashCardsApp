import re
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing import Annotated, Literal
from typing_extensions import TypedDict
import json
import os
from dotenv import load_dotenv
load_dotenv()
#command line statement to get  lanchain_openai
# pip install langchain-openai

fanar_llm = ChatOpenAI(
    model="Fanar",
    openai_api_base="https://api.fanar.qa/v1",
    openai_api_key=os.getenv("FANAR_API_KEY"),
    temperature=0.7,
)

class State(TypedDict):
    messages: Annotated[list, add_messages]
    message_type: str

def chatbot(state: State):
    reply = fanar_llm.invoke(state["messages"])
    return {"messages": [reply]}


graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)
graph = graph_builder.compile()


def clean_llm_json(raw: str) -> str:
    """
    Strip ```json ... ``` fences and return the inner JSON string.
    """
    raw = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    if raw.startswith("```"):
        raw = re.sub(r"^```(\w+)?\s*([\s\S]+?)\s*```$", r"\2", raw)
    # Grab first `{` … last `}` just in case
    start, end = raw.find("{"), raw.rfind("}")
    return raw[start : end + 1]

def get_cards(user_input: str, front_text_length: str, back_text_length: str, count: str, textfromPDF: str):
    system = (
        "You are a flash-card generator.\n"
        f"Generate exactly {count} cards.  "
        f"Front length: {front_text_length}.  Back length: {back_text_length}.\n"
        "If supplementary text is provided, use it.\n"
        "Return ONLY valid JSON. "
    "Do NOT wrap it in ```json fences. "
    "Use keys: name, description, cards, and inside cards use "
    "question and answer. No front/back keys."
    )
    user = """
You are a strict JSON generator.
Return ONE—and only one—valid JSON object with this exact schema:
{
  "name":        string,
  "description": string,
  "cards": [ { "question": string, "answer": string }, ... ]
}

DO NOT wrap the JSON in markdown fences.
DO NOT add any explanation before or after it.
If you cannot comply, return: {"error":"non-compliant"}.
     """+ user_input
    if textfromPDF:
        user += f"\n\n-----\nSupplementary PDF text:\n{textfromPDF[:4000]}\n-----"
    state = graph.invoke(
        {
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ]
        }
    )
    raw_reply = state["messages"][-1].content
    try:
        data = json.loads(clean_llm_json(raw_reply))
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM did not return parsable JSON:\n{raw_reply}") from exc

    # normalise front/back -> question/answer
    fixed_cards = []
    for c in data.get("cards", []):
        if "front" in c and "back" in c:
            fixed_cards.append({"question": c["front"], "answer": c["back"]})
        elif "question" in c and "answer" in c:
            fixed_cards.append(c)

    # validation
    if len(fixed_cards) != count:
        raise ValueError(f"Expected {count} cards, got {len(fixed_cards)}")

    return data["name"], data.get("description"), fixed_cards