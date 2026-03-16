"""
SHES Tests – Lab Results Interpreter
Pure unit tests for the NLP interpretation engine (no database required
for fallback tests; DB tests use Django's test runner).
"""
import unittest

from apps.lab_results.interpreter import _classify_fallback, interpret_lab_results


class TestFallbackClassifier(unittest.TestCase):
    """Tests for the built-in fallback reference ranges."""

    def test_normal_haemoglobin(self):
        result = _classify_fallback("haemoglobin", 14.5)
        self.assertEqual(result["status"], "normal")

    def test_low_haemoglobin_triggers_anaemia_message(self):
        result = _classify_fallback("haemoglobin", 10.0)
        self.assertEqual(result["status"], "low")
        self.assertIn("anaemia", result["label"].lower())

    def test_normal_fasting_glucose(self):
        result = _classify_fallback("fasting glucose", 4.5)
        self.assertEqual(result["status"], "normal")

    def test_diabetic_fasting_glucose(self):
        result = _classify_fallback("fasting glucose", 8.0)
        self.assertEqual(result["status"], "high")

    def test_pre_diabetic_hba1c(self):
        result = _classify_fallback("hba1c", 6.0)
        self.assertEqual(result["status"], "elevated")

    def test_high_total_cholesterol(self):
        result = _classify_fallback("total cholesterol", 6.5)
        self.assertEqual(result["status"], "high")

    def test_low_hdl(self):
        result = _classify_fallback("hdl", 0.8)
        self.assertEqual(result["status"], "low")

    def test_unknown_test_returns_unknown_status(self):
        result = _classify_fallback("some_obscure_test_xyz", 100.0)
        self.assertEqual(result["status"], "unknown")
        self.assertIn("Reference range not available", result["label"])

    def test_elevated_white_blood_cells(self):
        result = _classify_fallback("white blood cells", 14.0)
        self.assertEqual(result["status"], "high")
        self.assertIn("infection", result["label"].lower())

    def test_low_platelets_flagged(self):
        result = _classify_fallback("platelets", 100.0)
        self.assertEqual(result["status"], "low")


class TestInterpretLabResults(unittest.TestCase):
    """
    End-to-end tests for interpret_lab_results().
    Uses only fallback references (no DB) – Django's test DB is not
    needed for these pure-function tests.
    """

    def _run(self, items):
        """Helper: call interpreter and unpack results + summary."""
        # Patch DB lookup to always raise DoesNotExist so fallback is used
        from unittest.mock import patch, MagicMock
        does_not_exist = Exception("DoesNotExist")

        with patch(
            "apps.lab_results.interpreter.LabTestReference.objects.get",
            side_effect=Exception("DoesNotExist"),
        ):
            # Re-import to get the patched version
            from apps.lab_results.interpreter import interpret_lab_results as interp
            return interp(items)

    def test_all_normal_generates_positive_summary(self):
        items = [
            {"test_name": "Haemoglobin", "value": "14.5", "unit": "g/dL"},
            {"test_name": "Fasting Glucose", "value": "4.5", "unit": "mmol/L"},
        ]
        interpreted, summary = self._run(items)
        self.assertIn("normal range", summary.lower())
        self.assertEqual(len(interpreted), 2)

    def test_abnormal_result_mentioned_in_summary(self):
        items = [{"test_name": "Total Cholesterol", "value": "6.5", "unit": "mmol/L"}]
        interpreted, summary = self._run(items)
        self.assertIn("attention", summary.lower())

    def test_non_numeric_value_handled_gracefully(self):
        items = [{"test_name": "Haemoglobin", "value": "N/A", "unit": "g/dL"}]
        interpreted, summary = self._run(items)
        self.assertEqual(interpreted[0]["status"], "parse_error")

    def test_empty_input_returns_no_results_summary(self):
        interpreted, summary = self._run([])
        self.assertEqual(len(interpreted), 0)
        self.assertIn("No results", summary)

    def test_multiple_abnormal_count_in_summary(self):
        items = [
            {"test_name": "HbA1c", "value": "8.0", "unit": "%"},
            {"test_name": "Total Cholesterol", "value": "7.0", "unit": "mmol/L"},
        ]
        interpreted, summary = self._run(items)
        # Both are abnormal → summary should mention 2
        self.assertIn("2", summary)

    def test_interpreted_list_length_matches_input(self):
        items = [
            {"test_name": "Haemoglobin", "value": "14.5", "unit": "g/dL"},
            {"test_name": "HbA1c", "value": "5.4", "unit": "%"},
            {"test_name": "White Blood Cells", "value": "7.0", "unit": "×10⁹/L"},
        ]
        interpreted, _ = self._run(items)
        self.assertEqual(len(interpreted), 3)


if __name__ == "__main__":
    unittest.main()
