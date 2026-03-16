"""
SHES Triage – Inference Engine
====================================
A rule-based expert system that evaluates a list of patient symptoms
against the SHES Knowledge Base and produces:
  • An urgency level  (emergency / doctor_visit / self_care)
  • A plain-language recommendation
  • Matched possible conditions
  • Detected red-flag symptoms

Design follows the Kenya National Clinical Guidelines and WHO primary
care protocols, adapted for the local healthcare context.
"""
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

logger = logging.getLogger("apps.triage")

# ── Knowledge Base location ────────────────────────────────────────────────────
_KB_PATH = Path(__file__).resolve().parent.parent.parent / "knowledge_base"


def _load_json(filename: str) -> dict:
    path = _KB_PATH / filename
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        logger.error("Knowledge base file not found: %s", path)
        return {}


# Lazily-loaded knowledge bases
_red_flag_kb: dict | None = None
_condition_kb: dict | None = None
_recommendation_kb: dict | None = None


def _get_red_flags() -> dict:
    global _red_flag_kb
    if _red_flag_kb is None:
        _red_flag_kb = _load_json("red_flags.json")
    return _red_flag_kb


def _get_conditions() -> list:
    global _condition_kb
    if _condition_kb is None:
        data = _load_json("conditions.json")
        _condition_kb = data.get("conditions", [])
    return _condition_kb


def _get_recommendations() -> dict:
    global _recommendation_kb
    if _recommendation_kb is None:
        _recommendation_kb = _load_json("recommendations.json")
    return _recommendation_kb


# ── Data Transfer Objects ──────────────────────────────────────────────────────

@dataclass
class SymptomInput:
    """Represents a single symptom as provided to the engine."""
    name: str
    severity: int = 5          # 1–10
    duration_days: int = 1
    body_location: str = ""


@dataclass
class TriageResult:
    urgency_level: str = "undetermined"
    recommendation: str = ""
    layman_explanation: str = ""
    red_flags_detected: List[str] = field(default_factory=list)
    matched_conditions: List[dict] = field(default_factory=list)


# ── Engine ─────────────────────────────────────────────────────────────────────

class InferenceEngine:
    """
    Forward-chaining rule engine.

    Resolution order (highest priority first):
      1. Red-flag detection   → EMERGENCY
      2. High-severity cluster → DOCTOR_VISIT
      3. Condition matching    → severity-based routing
      4. Default              → SELF_CARE
    """

    EMERGENCY = "emergency"
    DOCTOR_VISIT = "doctor_visit"
    SELF_CARE = "self_care"
    UNDETERMINED = "undetermined"

    # Threshold: average symptom severity that escalates to doctor visit
    SEVERITY_DOCTOR_THRESHOLD = 6
    # Minimum symptom-set overlap to match a condition (0–1)
    CONDITION_MATCH_RATIO = 0.5

    def evaluate(self, symptoms: List[SymptomInput]) -> TriageResult:
        if not symptoms:
            return TriageResult(
                urgency_level=self.UNDETERMINED,
                recommendation="No symptoms were provided. Please describe what you are experiencing.",
            )

        result = TriageResult()
        symptom_names_lower = {s.name.lower() for s in symptoms}

        # ── Step 1: Check for red flags ────────────────────────────────────────
        red_flags_detected = self._detect_red_flags(symptom_names_lower)
        result.red_flags_detected = red_flags_detected

        if red_flags_detected:
            result.urgency_level = self.EMERGENCY
            result.recommendation = self._get_recommendation(self.EMERGENCY)
            result.layman_explanation = (
                f"You have reported one or more warning signs that may indicate a "
                f"life-threatening emergency: {', '.join(red_flags_detected)}. "
                "Please seek immediate medical attention or call an ambulance."
            )
            logger.info("EMERGENCY triage – red flags: %s", red_flags_detected)
            return result

        # ── Step 2: Condition matching ──────────────────────────────────────────
        matched = self._match_conditions(symptom_names_lower)
        result.matched_conditions = matched

        # ── Step 3: Determine urgency from matched conditions + severity ────────
        avg_severity = sum(s.severity for s in symptoms) / len(symptoms)
        max_severity = max(s.severity for s in symptoms)
        max_duration = max((s.duration_days or 1) for s in symptoms)

        if matched:
            highest_urgency = self._highest_urgency_from_conditions(matched)
        else:
            highest_urgency = None

        urgency = self._resolve_urgency(
            condition_urgency=highest_urgency,
            avg_severity=avg_severity,
            max_severity=max_severity,
            duration_days=max_duration,
        )

        result.urgency_level = urgency
        result.recommendation = self._get_recommendation(urgency)
        result.layman_explanation = self._build_explanation(symptoms, matched, urgency)

        logger.info(
            "Triage result: %s | conditions: %s | avg_severity: %.1f",
            urgency, [c["name"] for c in matched], avg_severity,
        )
        return result

    # ── Private helpers ────────────────────────────────────────────────────────

    def _detect_red_flags(self, symptom_names: set) -> List[str]:
        """
        Returns the list of red-flag symptom names present in the input.
        Red flags are hard-coded in red_flags.json and trigger EMERGENCY.
        """
        kb = _get_red_flags()
        flags: List[str] = []
        for flag_entry in kb.get("red_flags", []):
            for keyword in flag_entry.get("keywords", []):
                if any(keyword in name for name in symptom_names):
                    flags.append(flag_entry["label"])
                    break
        return flags

    def _match_conditions(self, symptom_names: set) -> List[dict]:
        """
        Returns conditions whose required symptom set overlaps with the
        reported symptoms by at least CONDITION_MATCH_RATIO.
        """
        conditions = _get_conditions()
        matched = []
        for cond in conditions:
            required = {s.lower() for s in cond.get("symptoms", [])}
            if not required:
                continue
            overlap = symptom_names & required
            ratio = len(overlap) / len(required)
            if ratio >= self.CONDITION_MATCH_RATIO:
                matched.append({
                    "name": cond["name"],
                    "description": cond.get("description", ""),
                    "urgency": cond.get("urgency", self.SELF_CARE),
                    "match_ratio": round(ratio, 2),
                    "home_care_tips": cond.get("home_care_tips", []),
                })
        # Sort by match ratio descending
        return sorted(matched, key=lambda x: x["match_ratio"], reverse=True)

    def _highest_urgency_from_conditions(self, conditions: List[dict]) -> str:
        order = {self.EMERGENCY: 3, self.DOCTOR_VISIT: 2, self.SELF_CARE: 1, self.UNDETERMINED: 0}
        return max(conditions, key=lambda c: order.get(c["urgency"], 0))["urgency"]

    def _resolve_urgency(
        self,
        condition_urgency: str | None,
        avg_severity: float,
        max_severity: int,
        duration_days: int,
    ) -> str:
        """
        Merges condition-based urgency with severity signals.
        Higher severity or longer duration can escalate from self_care
        to doctor_visit.
        """
        base = condition_urgency or self.SELF_CARE

        # Escalation rules
        if max_severity >= 9 and base != self.EMERGENCY:
            return self.DOCTOR_VISIT
        if avg_severity >= self.SEVERITY_DOCTOR_THRESHOLD and base == self.SELF_CARE:
            return self.DOCTOR_VISIT
        if duration_days >= 7 and base == self.SELF_CARE:
            return self.DOCTOR_VISIT

        return base

    def _get_recommendation(self, urgency: str) -> str:
        kb = _get_recommendations()
        return kb.get(urgency, "Please consult a healthcare professional.")

    def _build_explanation(
        self,
        symptoms: List[SymptomInput],
        matched: List[dict],
        urgency: str,
    ) -> str:
        symptom_list = ", ".join(s.name for s in symptoms)
        if not matched:
            return (
                f"Based on your reported symptoms ({symptom_list}), we could not "
                "find a specific pattern in our knowledge base. "
                "If symptoms persist, please consult a healthcare provider."
            )
        top = matched[0]
        tips = "; ".join(top.get("home_care_tips", [])) or "rest and stay hydrated"
        return (
            f"Your symptoms ({symptom_list}) most closely match '{top['name']}'. "
            f"{top['description']} "
            f"Suggested care: {tips}."
        )
