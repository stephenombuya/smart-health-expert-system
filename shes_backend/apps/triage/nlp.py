"""
SHES – NLP Symptom Extraction
Uses OpenAI GPT-4o-mini to extract structured symptoms from
a patient's free-text description in English or Swahili.

This converts:
  "Nimekuwa na homa kali na maumivu ya kichwa kwa siku tatu,
   pia ninajisikia dhaifu sana"
Into:
  [
    {"name": "fever",    "severity": 8, "duration_days": 3},
    {"name": "headache", "severity": 7, "duration_days": 3},
    {"name": "weakness", "severity": 6, "duration_days": 3},
  ]
"""
import json
import logging
import os
from typing import List, Dict

logger = logging.getLogger("apps.triage")

SYSTEM_PROMPT = """You are a clinical NLP assistant for the Smart Health Expert System (SHES),
a medical triage system used in Kenya.

Your task is to extract symptoms from a patient's free-text description,
which may be in English or Swahili.

Return ONLY a valid JSON array of symptom objects. Each object must have:
- "name": symptom name in English (lowercase, 1-4 words)
- "severity": estimated severity on a scale of 1-10 based on descriptors
  (1-3 = mild, 4-6 = moderate, 7-8 = severe, 9-10 = very severe)
- "duration_days": estimated duration in days (default to 1 if not mentioned)
- "body_location": body part if mentioned (empty string if not mentioned)

Severity estimation guide:
- Words like "kidogo", "mild", "slight", "a bit" → severity 2-3
- Words like "moderate", "wastani" → severity 4-6
- Words like "severe", "kali", "very", "sana", "intense", "sharp" → severity 7-8
- Words like "extreme", "unbearable", "worst", "terrible" → severity 9-10

Duration estimation guide:
- "leo", "today", "just now" → 1 day
- "wiki moja", "one week", "a week" → 7 days
- "siku chache", "a few days" → 3 days

Common Swahili symptoms:
- homa = fever
- maumivu ya kichwa = headache
- kikohozi = cough
- kichefuchefu = nausea
- kutapika = vomiting
- maumivu ya tumbo = abdominal pain
- uchovu = fatigue
- baridi = chills
- jasho = sweating
- upele = rash
- maumivu ya mwili = body aches
- kizunguzungu = dizziness
- maumivu ya koo = sore throat
- msongo = stress/distress
- dhaifu = weakness

Return ONLY the JSON array — no explanation, no markdown, no code fences."""


def extract_symptoms_from_text(text: str) -> List[Dict]:
    """
    Call OpenAI GPT-4o-mini to extract structured symptoms from free text.

    Args:
        text: Patient's free-text symptom description in English or Swahili

    Returns:
        List of symptom dicts: [{name, severity, duration_days, body_location}]
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set in the environment.")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
    except ImportError:
        raise ImportError("openai package is not installed. Run: pip install openai")

    if len(text.strip()) < 3:
        raise ValueError("Please describe your symptoms in at least a few words.")

    if len(text) > 2000:
        text = text[:2000]

    logger.info("Extracting symptoms from text (%d chars).", len(text))

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Extract symptoms from: {text}"},
            ],
            temperature=0.1,
            max_tokens=500,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if present
        raw = raw.replace("```json", "").replace("```", "").strip()

        symptoms = json.loads(raw)

        if not isinstance(symptoms, list):
            raise ValueError("Model returned unexpected format.")

        # Validate and clean each symptom
        cleaned = []
        for s in symptoms[:20]:   # cap at 20 symptoms
            if not isinstance(s, dict) or "name" not in s:
                continue
            cleaned.append({
                "name":          str(s.get("name", "")).lower().strip()[:100],
                "severity":      max(1, min(10, int(s.get("severity", 5)))),
                "duration_days": max(1, int(s.get("duration_days", 1))),
                "body_location": str(s.get("body_location", "")).strip()[:200],
            })

        if not cleaned:
            raise ValueError("No symptoms could be identified. Please describe how you are feeling.")

        logger.info("Extracted %d symptoms from free text.", len(cleaned))
        return cleaned

    except json.JSONDecodeError:
        logger.error("OpenAI returned invalid JSON: %s", raw)
        raise ValueError("Could not parse symptom extraction response. Please try again.")
    except Exception as exc:
        logger.error("OpenAI symptom extraction failed: %s", exc)
        raise