import os
import json
from typing import Tuple, Dict, Any, List


def _extract_json(text: str) -> Dict[str, Any]:
    """Best-effort extraction of a JSON object from model output."""
    text = text.strip()
    # Strip code fences if present
    if text.startswith("```"):
        # remove first fence line and last fence
        parts = text.split("\n", 1)
        if len(parts) == 2:
            text = parts[1]
        if text.endswith("```"):
            text = text[: -3]
    text = text.strip()
    # Find first '{' and last '}' to extract JSON object
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    try:
        return json.loads(text)
    except Exception:
        return {}


def _fallback_analysis(course_name: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Return a minimal placeholder structure if AI call fails."""
    analysis = {
        "topics": [
            {
                "name": f"Overview of {course_name}",
                "topic_strength": 0.5,
                "subtopics": [
                    {"name": "Key Concepts", "topic_strength": 0.5},
                ],
            }
        ]
    }
    questions = [
        {
            "id": "q_demo_placeholder",
            "type": "mcq",
            "topic": f"Overview of {course_name}",
            "text": "Which option best describes this course?",
            "choices": [
                "Foundational principles",
                "Advanced niche details",
                "Unrelated content",
                "Unknown"
            ],
            "difficulty": "easy",
        }
    ]
    return analysis, questions


def analyze_course_content(course_name: str, slides_content: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Use OpenAI to analyze slides content and return:
      - analysis: { "topics": [ { name, topic_strength, subtopics: [ {name, topic_strength} ] } ] }
      - questions: [ { id, type, topic, text, choices, difficulty }, ... ]
    """
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        # No API key in env — return deterministic placeholder
        return _fallback_analysis(course_name)

    try:
        # Defer import so project runs even if openai isn't installed yet
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        system_msg = (
            "You analyze university lecture slides and produce a compact JSON schema. "
            "Be concise, faithful to the source, and do not invent content."
        )
        user_prompt = f"""
Analyze the following lecture slides for the course: {course_name}.
Return STRICT JSON with two top-level keys: "analysis" and "questions".

JSON schema:
{{
  "analysis": {{
    "topics": [
      {{
        "name": string,
        "topic_strength": number (0..1),
        "subtopics": [
          {{"name": string, "topic_strength": number (0..1)}}
        ]
      }}
    ]
  }},
  "questions": [
    {{
      "id": string,
      "type": "mcq",
      "topic": string,
      "text": string,
      "choices": [string, string, string, string],
      "difficulty": "easy" | "medium" | "hard"
    }}
  ]
}}

Rules:
- Produce 3-5 topics, each with 2-4 subtopics.
- topic_strength reflects importance in the slides.
- Produce 8-12 MCQs targeting key concepts across topics/subtopics.
- NO commentary, NO code fences, only valid JSON.

Slides:
"""
        user_content = user_prompt + slides_content

        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
        )
        raw = resp.choices[0].message.content or ""
        data = _extract_json(raw)

        analysis = data.get("analysis") or {}
        questions = data.get("questions") or []

        # Basic sanity defaults if model returns unexpected structure
        if not isinstance(analysis, dict) or "topics" not in analysis:
            analysis = _fallback_analysis(course_name)[0]
        if not isinstance(questions, list) or len(questions) == 0:
            questions = _fallback_analysis(course_name)[1]

        return analysis, questions

    except Exception:
        # Any failure -> return a safe placeholder so the app keeps working
        return _fallback_analysis(course_name)

