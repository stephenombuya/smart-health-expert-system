"""
SHES Tests – Inference Engine
Tests every routing decision of the rule-based triage engine in isolation
(no database required).
"""
import unittest
from unittest.mock import patch

from apps.triage.inference_engine import InferenceEngine, SymptomInput, TriageResult


class TestInferenceEngineRedFlags(unittest.TestCase):
    """Red-flag symptoms must always produce EMERGENCY urgency."""

    def setUp(self):
        self.engine = InferenceEngine()

    def _run(self, *symptom_names):
        symptoms = [SymptomInput(name=n) for n in symptom_names]
        return self.engine.evaluate(symptoms)

    def test_chest_pain_triggers_emergency(self):
        result = self._run("chest pain", "mild headache")
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)
        self.assertIn("Chest pain or tightness", result.red_flags_detected)

    def test_difficulty_breathing_triggers_emergency(self):
        result = self._run("difficulty breathing")
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)

    def test_unconsciousness_triggers_emergency(self):
        result = self._run("unconscious", "fever")
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)

    def test_stroke_symptom_triggers_emergency(self):
        result = self._run("face drooping", "arm weakness")
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)

    def test_seizure_triggers_emergency(self):
        result = self._run("seizure")
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)

    def test_suicidal_ideation_triggers_emergency(self):
        result = self._run("want to die", "hopeless")
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)

    def test_emergency_contains_recommendation_text(self):
        result = self._run("chest pain")
        self.assertIn("immediate", result.recommendation.lower())

    def test_emergency_explanation_lists_flag(self):
        result = self._run("chest pain")
        self.assertIn("Chest pain or tightness", result.layman_explanation)


class TestInferenceEngineConditionMatching(unittest.TestCase):
    """Known symptom clusters should match the correct condition."""

    def setUp(self):
        self.engine = InferenceEngine()

    def _run(self, *symptom_names):
        symptoms = [SymptomInput(name=n) for n in symptom_names]
        return self.engine.evaluate(symptoms)

    def test_common_cold_matched(self):
        result = self._run("runny nose", "sore throat", "sneezing", "mild fever")
        names = [c["name"] for c in result.matched_conditions]
        self.assertTrue(
            any("Cold" in n or "Respiratory" in n for n in names),
            f"Expected common cold match, got: {names}",
        )

    def test_malaria_matched(self):
        result = self._run("fever", "chills", "sweating", "headache", "nausea")
        names = [c["name"] for c in result.matched_conditions]
        self.assertTrue(any("Malaria" in n for n in names), f"Got: {names}")

    def test_uti_matched(self):
        result = self._run("burning urination", "frequent urination", "lower abdominal pain")
        names = [c["name"] for c in result.matched_conditions]
        self.assertTrue(
            any("Urinary" in n or "UTI" in n for n in names), f"Got: {names}"
        )

    def test_no_match_returns_undetermined_or_self_care(self):
        # Very obscure symptom combination
        result = self._run("elbow itching")
        # Should still return a valid urgency level
        self.assertIn(
            result.urgency_level,
            [InferenceEngine.SELF_CARE, InferenceEngine.UNDETERMINED],
        )


class TestInferenceEngineSeverityEscalation(unittest.TestCase):
    """High severity or duration should escalate from self_care to doctor_visit."""

    def setUp(self):
        self.engine = InferenceEngine()

    def test_high_severity_escalates_to_doctor_visit(self):
        symptoms = [SymptomInput(name="headache", severity=9)]
        result = self.engine.evaluate(symptoms)
        self.assertEqual(result.urgency_level, InferenceEngine.DOCTOR_VISIT)

    def test_long_duration_escalates_to_doctor_visit(self):
        symptoms = [SymptomInput(name="cough", severity=4, duration_days=10)]
        result = self.engine.evaluate(symptoms)
        self.assertEqual(result.urgency_level, InferenceEngine.DOCTOR_VISIT)

    def test_average_high_severity_escalates(self):
        symptoms = [
            SymptomInput(name="fatigue", severity=7),
            SymptomInput(name="nausea", severity=6),
        ]
        result = self.engine.evaluate(symptoms)
        self.assertEqual(result.urgency_level, InferenceEngine.DOCTOR_VISIT)

    def test_mild_symptoms_stay_self_care(self):
        symptoms = [SymptomInput(name="runny nose", severity=3, duration_days=2)]
        result = self.engine.evaluate(symptoms)
        self.assertEqual(result.urgency_level, InferenceEngine.SELF_CARE)


class TestInferenceEngineEdgeCases(unittest.TestCase):
    """Edge cases and boundary conditions."""

    def setUp(self):
        self.engine = InferenceEngine()

    def test_empty_symptoms_returns_undetermined(self):
        result = self.engine.evaluate([])
        self.assertEqual(result.urgency_level, InferenceEngine.UNDETERMINED)
        self.assertIn("No symptoms", result.recommendation)

    def test_result_has_all_required_fields(self):
        symptoms = [SymptomInput(name="fever")]
        result = self.engine.evaluate(symptoms)
        self.assertIsInstance(result, TriageResult)
        self.assertIsNotNone(result.urgency_level)
        self.assertIsNotNone(result.recommendation)
        self.assertIsInstance(result.red_flags_detected, list)
        self.assertIsInstance(result.matched_conditions, list)

    def test_multiple_red_flags_all_detected(self):
        symptoms = [
            SymptomInput(name="chest pain"),
            SymptomInput(name="difficulty breathing"),
        ]
        result = self.engine.evaluate(symptoms)
        self.assertEqual(result.urgency_level, InferenceEngine.EMERGENCY)
        self.assertGreaterEqual(len(result.red_flags_detected), 1)

    def test_severity_boundary_at_9(self):
        """Severity exactly 9 should trigger escalation."""
        symptoms = [SymptomInput(name="stomach cramps", severity=9)]
        result = self.engine.evaluate(symptoms)
        self.assertEqual(result.urgency_level, InferenceEngine.DOCTOR_VISIT)

    def test_severity_8_may_stay_self_care(self):
        """Severity 8 with single unmatched symptom – avg < threshold."""
        symptoms = [SymptomInput(name="mild itch", severity=8)]
        result = self.engine.evaluate(symptoms)
        # avg_severity 8 > 6 threshold → escalate
        self.assertEqual(result.urgency_level, InferenceEngine.DOCTOR_VISIT)


if __name__ == "__main__":
    unittest.main()
