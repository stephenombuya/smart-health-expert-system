"""
SHES Lab Results – Interpreter
==============================================
Translates raw lab result values into plain-language interpretations
suitable for patients with low health literacy, following Kenya MOH
guidelines for lab reference ranges.

The interpreter:
  1. Looks up the LabTestReference for each submitted test
  2. Classifies the value (low / normal / high)
  3. Returns a plain-language explanation and advice
  4. Generates an overall summary with action items
"""
import logging
from typing import Any

logger = logging.getLogger("apps.lab_results")

# Fallback reference ranges when no DB record exists.
# Values sourced from Kenya National Clinical Guidelines (2022 edition).
FALLBACK_REFERENCES: dict[str, dict[str, Any]] = {
    "hba1c": {
        "unit": "%",
        "ranges": [(0, 5.7, "normal", "Normal glycated haemoglobin – blood sugar well-controlled"),
                   (5.7, 6.4, "elevated", "Pre-diabetic range – lifestyle changes recommended"),
                   (6.4, 999, "high", "Diabetic range – medical review required")],
    },
    "fasting glucose": {
        "unit": "mmol/L",
        "ranges": [(0, 3.9, "low", "Low fasting glucose – monitor for hypoglycaemia symptoms"),
                   (3.9, 5.5, "normal", "Normal fasting glucose"),
                   (5.5, 7.0, "elevated", "Pre-diabetic fasting glucose"),
                   (7.0, 999, "high", "Diabetic range – consult your doctor")],
    },
    "haemoglobin": {
        "unit": "g/dL",
        "ranges": [(0, 12.0, "low", "Haemoglobin is low (anaemia) – iron-rich foods and medical review advised"),
                   (12.0, 17.5, "normal", "Haemoglobin within normal range"),
                   (17.5, 999, "high", "Elevated haemoglobin – further investigation needed")],
    },
    "creatinine": {
        "unit": "µmol/L",
        "ranges": [(0, 62, "low", "Low creatinine – may indicate low muscle mass"),
                   (62, 115, "normal", "Kidney function marker within normal range"),
                   (115, 999, "high", "Elevated creatinine – possible kidney stress, consult your doctor")],
    },
    "total cholesterol": {
        "unit": "mmol/L",
        "ranges": [(0, 5.2, "normal", "Total cholesterol is healthy"),
                   (5.2, 6.2, "elevated", "Borderline high cholesterol – dietary review recommended"),
                   (6.2, 999, "high", "High cholesterol – medical treatment and diet modification needed")],
    },
    "ldl": {
        "unit": "mmol/L",
        "ranges": [(0, 3.4, "normal", "'Bad' cholesterol is at a healthy level"),
                   (3.4, 4.1, "elevated", "LDL ('bad') cholesterol is borderline high"),
                   (4.1, 999, "high", "High LDL – increases cardiovascular risk, consult your doctor")],
    },
    "hdl": {
        "unit": "mmol/L",
        "ranges": [(0, 1.0, "low", "HDL ('good') cholesterol is low – exercise and diet can help"),
                   (1.0, 999, "normal", "HDL ('good') cholesterol is at a healthy level")],
    },
    "white blood cells": {
        "unit": "×10⁹/L",
        "ranges": [(0, 4.0, "low", "Low white blood cells – immune system may be suppressed"),
                   (4.0, 11.0, "normal", "White blood cell count is normal"),
                   (11.0, 999, "high", "Elevated white blood cells – possible infection or inflammation")],
    },
    "platelets": {
        "unit": "×10⁹/L",
        "ranges": [(0, 150, "low", "Low platelets (thrombocytopaenia) – bleeding risk, seek medical review"),
                   (150, 400, "normal", "Platelet count within normal range"),
                   (400, 999, "high", "High platelets – further evaluation recommended")],
    },
}


def _classify_fallback(test_name_lower: str, value: float) -> dict[str, str]:
    ref = FALLBACK_REFERENCES.get(test_name_lower)
    if not ref:
        return {
            "status": "unknown",
            "label": "Reference range not available",
            "advice": (
                "We don't have a reference range for this test in our database. "
                "Please share the result with your doctor for interpretation."
            ),
        }
    for low, high, status, label in ref["ranges"]:
        if low <= value < high:
            return {"status": status, "label": label, "advice": label}
    return {"status": "unknown", "label": "Out of range", "advice": "Please consult your doctor."}


def interpret_lab_results(raw_results: list[dict]) -> tuple[list[dict], str]:
    """
    Main entry point called by the view.

    Args:
        raw_results: list of { test_name: str, value: float|str, unit: str }

    Returns:
        (interpreted_results, overall_summary)
    """
    from .models import LabTestReference

    interpreted: list[dict] = []
    action_items: list[str] = []
    abnormal_count = 0

    for item in raw_results:
        test_name: str = item.get("test_name", "").strip()
        raw_value = item.get("value")
        unit: str = item.get("unit", "")

        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            interpreted.append({
                "test_name": test_name,
                "value": raw_value,
                "unit": unit,
                "status": "parse_error",
                "label": "Could not read value",
                "advice": "Ensure the result value is a number.",
            })
            continue

        # Try DB reference first
        try:
            ref = LabTestReference.objects.get(
                test_name__iexact=test_name
            )
            classification = ref.classify(value)
        except LabTestReference.DoesNotExist:
            classification = _classify_fallback(test_name.lower(), value)

        if classification["status"] not in ("normal",):
            abnormal_count += 1
            if classification.get("advice"):
                action_items.append(f"• {test_name}: {classification['advice']}")

        interpreted.append({
            "test_name": test_name,
            "value": value,
            "unit": unit,
            **classification,
        })

        logger.debug("Interpreted %s = %s → %s", test_name, value, classification["status"])

    # Build overall summary
    total = len(interpreted)
    if total == 0:
        summary = "No results were provided for interpretation."
    elif abnormal_count == 0:
        summary = (
            f"All {total} test result(s) are within the expected normal range. "
            "Keep up your healthy lifestyle and continue regular check-ups."
        )
    else:
        items_text = "\n".join(action_items)
        summary = (
            f"Out of {total} result(s), {abnormal_count} require attention:\n"
            f"{items_text}\n\n"
            "Please share this report with your doctor for personalised advice."
        )

    return interpreted, summary
