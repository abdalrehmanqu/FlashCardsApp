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

fanar_llm = ChatOpenAI(
    model="Fanar",
    openai_api_base="https://api.fanar.qa/v1",
    openai_api_key=os.getenv("FANAR_API_KEY", "-"),
    temperature=0.7,
)

# Backup OpenAI model in case Fanar is unavailable
# openai_llm = ChatOpenAI(
#     model="gpt-4",
#     openai_api_key=os.getenv("OPENAI_API_KEY"),
#     temperature=0.3,
# )

# State schema for the LangGraph workflow
class StudySheetState(TypedDict):
    lecture_content: str
    key_points: list[str]
    definitions: dict[str, str]
    formulas: list[str]
    markdown_output: str
    current_step: str
    error_message: str

# Pydantic models for structured output
class KeyPoints(BaseModel):
    points: list[str] = Field(description="List of key points from the lecture")

class Definitions(BaseModel):
    definitions: dict[str, str] = Field(description="Dictionary of terms and their definitions")

class Formulas(BaseModel):
    formulas: list[str] = Field(description="List of formulas in LaTeX format")

class StudySheet(BaseModel):
    title: str = Field(description="Title for the study sheet")
    key_points: list[str] = Field(description="Key points from the lecture")
    definitions: dict[str, str] = Field(description="Important definitions")
    formulas: list[str] = Field(description="Mathematical formulas")
    summary: str = Field(description="Brief summary of the content")

def extract_key_points(state: StudySheetState) -> StudySheetState:
    """Extract key points from lecture content"""
    try:
        prompt = f"""
        Analyze the following lecture content and extract the most important key points.
        Focus on main concepts, important ideas, and takeaways that students should remember.
        
        Lecture Content:
        {state['lecture_content']}
        
        Extract 5-10 key points in a clear, concise format. Each point should be one sentence.
        Return the key points as a numbered list, one point per line.
        """
        response = fanar_llm.invoke(prompt)
        
        # Parse the response to extract key points
        content = response.content.strip()
        points = []
        for line in content.split('\n'):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Remove numbering/bullets and clean up
                clean_point = re.sub(r'^[\d\.\-\•\s]+', '', line).strip()
                if clean_point:
                    points.append(clean_point)
        
        state['key_points'] = points
        state['current_step'] = "key_points_extracted"
        return state
        
    except Exception as e:
        state['error_message'] = f"Error extracting key points: {str(e)}"
        return state

def extract_definitions(state: StudySheetState) -> StudySheetState:
    """Extract definitions from lecture content"""
    try:
        prompt = f"""
        Analyze the following lecture content and extract important terms and their definitions.
        Focus on technical terms, concepts, and vocabulary that students need to understand.
        
        Lecture Content:
        {state['lecture_content']}
        
        Return a list of important terms with their definitions in this format:
        Term: Definition
        Term: Definition
        
        Only include the most important terms (5-15 terms maximum).
        """
        
        response = fanar_llm.invoke(prompt)
        
        # Parse the response to extract definitions
        content = response.content.strip()
        definitions = {}
        for line in content.split('\n'):
            line = line.strip()
            if ':' in line and line:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    term = parts[0].strip().replace('**', '')  # Remove markdown bold
                    definition = parts[1].strip()
                    if term and definition:
                        definitions[term] = definition
        
        state['definitions'] = definitions
        state['current_step'] = "definitions_extracted"
        return state
        
    except Exception as e:
        state['error_message'] = f"Error extracting definitions: {str(e)}"
        return state

def extract_formulas(state: StudySheetState) -> StudySheetState:
    """Extract mathematical formulas from lecture content"""
    try:
        prompt = f"""
        Analyze the following lecture content and extract any mathematical formulas, equations, or mathematical expressions.
        Format them in LaTeX notation for clear display.
        
        Lecture Content:
        {state['lecture_content']}
        
        Return a list of formulas in LaTeX format. If no formulas are found, return "No formulas found".
        Include variable definitions where relevant.
        Each formula should be on a separate line.
        """
        
        response = fanar_llm.invoke(prompt)
        
        # Parse the response to extract formulas
        content = response.content.strip()
        formulas = []
        
        if "no formulas found" not in content.lower():
            for line in content.split('\n'):
                line = line.strip()
                if line and not line.startswith('#') and not line.startswith('Note:'):
                    # Clean up the formula
                    formula = line.replace('$', '').strip()
                    if formula:
                        formulas.append(formula)
        
        state['formulas'] = formulas
        state['current_step'] = "formulas_extracted"
        return state
        
    except Exception as e:
        state['error_message'] = f"Error extracting formulas: {str(e)}"
        return state

def generate_study_sheet(state: StudySheetState) -> StudySheetState:
    """Generate the final markdown study sheet"""
    try:
        # Create title from content
        title_prompt = f"""
        Based on this lecture content, generate a concise title for a study sheet:
        {state['lecture_content'][:500]}...
        
        Return just the title, nothing else.
        """
        
        title_response = fanar_llm.invoke(title_prompt)
        title = title_response.content.strip().replace('"', '')
        
        # Generate markdown
        markdown = f"# {title}\n\n"
        
        # Add key points section
        if state.get('key_points'):
            markdown += "## Key Points\n\n"
            for i, point in enumerate(state['key_points'], 1):
                markdown += f"{i}. {point}\n"
            markdown += "\n"
        
        # Add definitions section
        if state.get('definitions'):
            markdown += "## Definitions\n\n"
            for term, definition in state['definitions'].items():
                markdown += f"**{term}**: {definition}\n\n"
        
        # Add formulas section
        if state.get('formulas'):
            markdown += "## Formulas\n\n"
            for formula in state['formulas']:
                markdown += f"$$\n{formula}\n$$\n\n"
        
        # Add summary section
        summary_prompt = f"""
        Create a brief 2-3 sentence summary of this lecture content:
        {state['lecture_content']}
        
        Focus on the main topic and most important concepts covered.
        """
        
        summary_response = fanar_llm.invoke(summary_prompt)
        summary = summary_response.content.strip()
        
        markdown += "## Summary\n\n"
        markdown += summary + "\n"
        
        state['markdown_output'] = markdown
        state['current_step'] = "study_sheet_generated"
        return state
        
    except Exception as e:
        state['error_message'] = f"Error generating study sheet: {str(e)}"
        return state

# Create the LangGraph workflow
def create_study_sheet_workflow():
    """Create and return the study sheet generation workflow"""
    
    workflow = StateGraph(StudySheetState)
    
    # Add nodes
    workflow.add_node("extract_key_points", extract_key_points)
    workflow.add_node("extract_definitions", extract_definitions)
    workflow.add_node("extract_formulas", extract_formulas)
    workflow.add_node("generate_study_sheet", generate_study_sheet)
    
    # Add edges - straight sequential flow
    workflow.add_edge(START, "extract_key_points")
    workflow.add_edge("extract_key_points", "extract_definitions")
    workflow.add_edge("extract_definitions", "extract_formulas")
    workflow.add_edge("extract_formulas", "generate_study_sheet")
    workflow.add_edge("generate_study_sheet", END)
    
    return workflow.compile()

def process_lecture_slides(lecture_content: str) -> str:
    """
    Main function to process lecture slides and generate study sheet
    
    Args:
        lecture_content (str): The text content from lecture slides
        
    Returns:
        str: Markdown formatted study sheet
    """
    
    # Initialize state
    initial_state = StudySheetState(
        lecture_content=lecture_content,
        key_points=[],
        definitions={},
        formulas=[],
        markdown_output="",
        current_step="initialized",
        error_message=""
    )
    
    # Create and run workflow
    workflow = create_study_sheet_workflow()
    
    try:
        final_state = workflow.invoke(initial_state)
        
        if final_state.get('error_message'):
            return f"Error processing lecture slides: {final_state['error_message']}"
        
        return final_state.get('markdown_output', 'No study sheet generated')
        
    except Exception as e:
        return f"Workflow execution error: {str(e)}"

# Example usage function
def generate_notes(sample_lecture):
    study_sheet = process_lecture_slides(sample_lecture)
    return study_sheet