"""
SHES – Local NLP Symptom Extraction (spaCy + keyword rules)
No API key required. Works offline.
Falls back gracefully if spaCy is not installed.
"""
import re
import spacy
import logging
from typing import List, Dict

logger = logging.getLogger("apps.triage")

# ─── Symptom keyword dictionary ────────────────────────────────────────────────

SYMPTOM_KEYWORDS = {
    "fever":              ["fever", "high temperature", "febrile", "homa"],
    "headache":           ["headache", "head pain", "maumivu ya kichwa", "head ache"],
    "cough":              ["cough", "coughing", "kikohozi"],
    "fatigue":            ["fatigue", "tired", "exhausted", "weakness", "uchovu", "dhaifu"],
    "nausea":             ["nausea", "nauseous", "feel like vomiting", "kichefuchefu"],
    "vomiting":           ["vomit", "vomiting", "throwing up", "kutapika"],
    "diarrhoea":          ["diarrhoea", "diarrhea", "loose stool", "watery stool", "kuhara"],
    "chills":             ["chills", "shivering", "cold", "baridi"],
    "sweating":           ["sweating", "sweat", "night sweat", "jasho"],
    "body aches":         ["body ache", "body pain", "muscle pain", "maumivu ya mwili"],
    "sore throat":        ["sore throat", "throat pain", "maumivu ya koo"],
    "runny nose":         ["runny nose", "nasal discharge", "pua inayotiririka"],
    "chest pain":         ["chest pain", "chest tightness", "chest pressure", "maumivu ya kifua"],
    "shortness of breath":["shortness of breath", "difficulty breathing", "breathless", "tatizo la kupumua"],
    "dizziness":          ["dizzy", "dizziness", "lightheaded", "kizunguzungu"],
    "abdominal pain":     ["abdominal pain", "stomach pain", "stomach ache", "maumivu ya tumbo"],
    "back pain":          ["back pain", "lower back pain", "maumivu ya mgongo"],
    "rash":               ["rash", "skin rash", "upele"],
    "loss of appetite":   ["loss of appetite", "not eating", "no appetite", "kutotaka kula"],
    "frequent urination": ["frequent urination", "urinating often", "mkojo mara kwa mara"],
    "burning urination":  ["burning urination", "pain when urinating", "mkojo wa kuumiza"],
    "excessive thirst":   ["excessive thirst", "very thirsty", "kiu kupita kiasi"],
    "joint pain":         ["joint pain", "arthritis", "maumivu ya viungo"],
    "anxiety":            ["anxious", "anxiety", "worried", "nervous", "wasiwasi"],
    "insomnia":           ["insomnia", "can't sleep", "sleepless", "usingizi mbaya"],
    "blurred vision":     ["blurred vision", "vision problem", "maono mabaya"],
    "weight loss":        ["weight loss", "losing weight", "kupoteza uzito"],
    "swelling":           ["swelling", "swollen", "uvimbe"],
    "pale skin":          ["pale", "pallor", "pale skin", "ngozi ya rangi"],
    "restless":           ["restless", "can't relax", "kutoweza kupumzika"],
}

# ─── Duration extraction ────────────────────────────────────────────────────────

DURATION_PATTERNS = [
    (r"(\d+)\s*day",                          lambda m: int(m.group(1))),
    (r"(\d+)\s*week",                         lambda m: int(m.group(1)) * 7),
    (r"(\d+)\s*hour",                         lambda m: max(1, int(m.group(1)) // 24)),
    (r"siku\s*(\d+)|(\d+)\s*siku",            lambda m: int(m.group(1) or m.group(2))),
    (r"wiki\s*(\d+)|(\d+)\s*wiki",            lambda m: int(m.group(1) or m.group(2)) * 7),
    (r"few days|siku chache",                 lambda m: 3),
    (r"couple of days|siku mbili",            lambda m: 2),
    (r"about a week|karibu wiki",             lambda m: 7),
    (r"since (yesterday|jana)",               lambda m: 1),
    (r"since (last week|wiki iliyopita)",     lambda m: 7),
    (r"since this morning|asubuhi",           lambda m: 1),
]

# ─── Severity extraction ────────────────────────────────────────────────────────

SEVERITY_MODIFIERS = {
    10: ["unbearable", "excruciating", "worst", "extreme", "terrible"],
    8:  ["severe", "very bad", "kali sana", "very severe", "intense", "sharp"],
    7:  ["bad", "bad", "kali", "strong", "significant"],
    5:  ["moderate", "wastani", "medium", "quite"],
    3:  ["mild", "slight", "kidogo", "a little", "minor", "light"],
    2:  ["very mild", "barely", "hardly"],
}


def _extract_severity(text: str, default: int = 5) -> int:
    text_lower = text.lower()
    for score, keywords in sorted(SEVERITY_MODIFIERS.items(), reverse=True):
        if any(kw in text_lower for kw in keywords):
            return score
    return default


def _extract_duration(text: str) -> int:
    text_lower = text.lower()
    for pattern, extractor in DURATION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            return extractor(match)
    return 1


def _extract_body_location(text: str, symptom: str) -> str:
    location_map = {
        "headache":    "head",
        "chest pain":  "chest",
        "abdominal pain": "abdomen",
        "back pain":   "back",
        "joint pain":  "joints",
        "sore throat": "throat",
        "runny nose":  "nose",
    }
    return location_map.get(symptom, "")


def extract_symptoms_local(text: str) -> List[Dict]:
    """
    Extract symptoms using keyword matching and regex.
    No API key required. Works offline.
    """
    text_lower = text.lower()
    duration   = _extract_duration(text)
    severity   = _extract_severity(text)
    found      = []
    seen       = set()

    for canonical_name, keywords in SYMPTOM_KEYWORDS.items():
        if canonical_name in seen:
            continue
        for kw in keywords:
            if kw in text_lower:
                found.append({
                    "name":          canonical_name,
                    "severity":      severity,
                    "duration_days": duration,
                    "body_location": _extract_body_location(text_lower, canonical_name),
                })
                seen.add(canonical_name)
                break

    if not found:
        raise ValueError(
            "No recognisable symptoms were found in your description. "
            "Try describing individual symptoms like 'I have a fever and headache'."
        )

    return found


def extract_symptoms_spacy(text: str) -> List[Dict]:
    """
    Extract symptoms using spaCy NLP pipeline.
    Falls back to keyword matching if spaCy is unavailable.
    """
    try:
        nlp = spacy.load("en_core_web_sm")
    except (ImportError, OSError):
        logger.warning("spaCy model not available, falling back to keyword extraction.")
        return extract_symptoms_local(text)

    doc      = nlp(text)
    duration = _extract_duration(text)
    severity = _extract_severity(text)
    found    = []
    seen     = set()

    # Use spaCy NER + noun chunks to find symptom mentions
    all_phrases = (
        [chunk.text.lower() for chunk in doc.noun_chunks]
        + [token.lemma_.lower() for token in doc if token.pos_ in ("NOUN", "ADJ")]
    )

    for phrase in all_phrases:
        for canonical_name, keywords in SYMPTOM_KEYWORDS.items():
            if canonical_name in seen:
                continue
            if any(kw in phrase or phrase in kw for kw in keywords):
                found.append({
                    "name":          canonical_name,
                    "severity":      severity,
                    "duration_days": duration,
                    "body_location": _extract_body_location(phrase, canonical_name),
                })
                seen.add(canonical_name)
                break

    # If spaCy found nothing, fall back to keyword matching
    if not found:
        return extract_symptoms_local(text)

    return found