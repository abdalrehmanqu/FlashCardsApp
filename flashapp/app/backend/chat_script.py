from openai import OpenAI
from dotenv import load_dotenv
import os
load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
)


SYSTEM_PROMPT = (
    "You are Flashcard‑Editor‑GPT. "
    "Reply ONLY with a JSON array of function calls "
    "that match the provided schema. No prose."
    "❗ Even if you emit a single function call, wrap it in a one-element JSON array."
    """
    Some Examples:
    User: Add these two cards  
    Assistant (function call):
    {
  "name": "bulk_update",
  "arguments": {
    "updates": [
      {"id": "1", "front": "Define photosynthesis in detail."},
      {"id": "2", "front": "Explain the role of chlorophyll in energy transfer."}
    ]
  }
}
    {
    "name": "bulk_add",
    "arguments": {
        "cards": [
        {"question": "Define entropy.", "answer": "A measure of system disorder."},
        {"question": "State the 2nd law of thermodynamics.", "answer": "Entropy of an isolated system never decreases."}
        ]
    }
    }

    User: Remove cards 3 and 4  
    Assistant (function call):
    {
    "name": "bulk_delete",
    "arguments": { "ids": ["3", "4"] }
    }
"""
)
GRAMMAR = [
    {   # add_card
        "name": "add_card",
        "parameters": {
            "type": "object",
            "properties": {
                "id":       {"type": "string"},
                "front":    {"type": "string"},
                "back":     {"type": "string"}
            },
            "required": ["front", "back"]
        }
    },
    {   # update_card
        "name": "update_card",
        "parameters": {
            "type": "object",
            "properties": {
                "id":    {"type": "string"},
                "front": {"type": "string"},
                "back":  {"type": "string"}
            },
            "required": ["id"]
        }
    },
    {   # delete_card
        "name": "delete_card",
        "parameters": {
            "type": "object",
            "properties": { "id": {"type": "string"} },
            "required": ["id"]
        }
    },
    {   # bulk_update
        "name": "bulk_update",
        "parameters": {
            "type": "object",
            "properties": {
                "updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id":    {"type": "string"},
                            "front": {"type": "string"},
                            "back":  {"type": "string"}
                        },
                        "required": ["id"]
                    },
                    "minItems": 1
                }
            },
            "required": ["updates"]
        }
    },
    {   # bulk_add
        "name": "bulk_add",
        "parameters": {
            "type": "object",
            "properties": {
                "cards": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "front": {"type": "string"},
                            "back":  {"type": "string"},
                            "id":    {"type": "string"}
                        },
                        "required": ["front", "back"]
                    },
                    "minItems": 1
                }
            },
            "required": ["cards"]
        }
    },
    {   # bulk_delete
        "name": "bulk_delete",
        "parameters": {
            "type": "object",
            "properties": {
                "ids": {
                    "type": "array",
                    "items": { "type": "string" },
                    "minItems": 1
                }
            },
            "required": ["ids"]
        }
    }
]

def getResponse(userMessage, outline: str):
    response = client.chat.completions.create(
    model="gpt-4.1-nano",
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "assistant", "content": outline},
        {"role": "user", "content": userMessage},
    ],
    functions=GRAMMAR,
    function_call="auto",
    temperature=0.5,
    )
    return response.choices[0].message.function_call