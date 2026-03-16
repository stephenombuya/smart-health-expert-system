"""
SHES Tests – Model Unit Tests
Tests for model properties, computed fields, and business logic.
"""
import unittest
from unittest.mock import MagicMock


class TestGlucoseInterpretation(unittest.TestCase):

    def _make(self, value, context):
        from apps.chronic_tracking.models import GlucoseReading
        reading = GlucoseReading.__new__(GlucoseReading)
        reading.value_mg_dl = value
        reading.context = context
        return reading

    def test_fasting_normal(self):
        r = self._make(90, "fasting")
        self.assertIn("Normal", r.interpretation)

    def test_fasting_low(self):
        r = self._make(65, "fasting")
        self.assertIn("Low", r.interpretation)

    def test_fasting_pre_diabetic(self):
        r = self._make(110, "fasting")
        self.assertIn("Pre-diabetic", r.interpretation)

    def test_fasting_high(self):
        r = self._make(130, "fasting")
        self.assertIn("High", r.interpretation)

    def test_post_meal_normal(self):
        r = self._make(120, "post_meal_2h")
        self.assertIn("Normal", r.interpretation)

    def test_post_meal_high(self):
        r = self._make(210, "post_meal_2h")
        self.assertIn("High", r.interpretation)

    def test_random_low(self):
        r = self._make(60, "random")
        self.assertIn("Low", r.interpretation)


class TestBPClassification(unittest.TestCase):

    def _make(self, systolic, diastolic):
        from apps.chronic_tracking.models import BloodPressureReading
        reading = BloodPressureReading.__new__(BloodPressureReading)
        reading.systolic = systolic
        reading.diastolic = diastolic
        return reading

    def test_normal_bp(self):
        r = self._make(115, 75)
        self.assertIn("Normal", r.classification)

    def test_elevated_bp(self):
        r = self._make(125, 78)
        self.assertIn("Elevated", r.classification)

    def test_stage1_hypertension(self):
        r = self._make(135, 85)
        self.assertIn("Stage 1", r.classification)

    def test_stage2_hypertension(self):
        r = self._make(155, 100)
        self.assertIn("Stage 2", r.classification)

    def test_hypertensive_crisis(self):
        r = self._make(185, 125)
        self.assertIn("Crisis", r.classification)

    def test_hypotension(self):
        r = self._make(85, 55)
        self.assertIn("Hypotension", r.classification)


class TestMoodCategoryComputation(unittest.TestCase):

    def _category(self, score):
        from apps.mental_health.models import MoodEntry
        return MoodEntry._compute_category(score)

    def test_score_10_excellent(self):
        self.assertEqual(self._category(10), "excellent")

    def test_score_9_excellent(self):
        self.assertEqual(self._category(9), "excellent")

    def test_score_8_good(self):
        self.assertEqual(self._category(8), "good")

    def test_score_7_good(self):
        self.assertEqual(self._category(7), "good")

    def test_score_6_neutral(self):
        self.assertEqual(self._category(6), "neutral")

    def test_score_5_neutral(self):
        self.assertEqual(self._category(5), "neutral")

    def test_score_4_low(self):
        self.assertEqual(self._category(4), "low")

    def test_score_3_low(self):
        self.assertEqual(self._category(3), "low")

    def test_score_2_distressed(self):
        self.assertEqual(self._category(2), "distressed")

    def test_score_1_distressed(self):
        self.assertEqual(self._category(1), "distressed")


class TestLabTestReferenceClassify(unittest.TestCase):

    def _make_ref(self, normal_min, normal_max, low_label="Low", high_label="High", normal_label="Normal"):
        from apps.lab_results.models import LabTestReference
        ref = LabTestReference.__new__(LabTestReference)
        ref.normal_min = normal_min
        ref.normal_max = normal_max
        ref.low_label = low_label
        ref.normal_label = normal_label
        ref.high_label = high_label
        ref.low_advice = "See a doctor"
        ref.high_advice = "See a doctor"
        return ref

    def test_value_below_min_is_low(self):
        ref = self._make_ref(3.5, 5.5)
        result = ref.classify(2.0)
        self.assertEqual(result["status"], "low")

    def test_value_in_range_is_normal(self):
        ref = self._make_ref(3.5, 5.5)
        result = ref.classify(4.5)
        self.assertEqual(result["status"], "normal")

    def test_value_above_max_is_high(self):
        ref = self._make_ref(3.5, 5.5)
        result = ref.classify(7.0)
        self.assertEqual(result["status"], "high")

    def test_boundary_at_normal_min_is_normal(self):
        ref = self._make_ref(3.5, 5.5)
        result = ref.classify(3.5)
        self.assertEqual(result["status"], "normal")

    def test_boundary_at_normal_max_is_high(self):
        """Value equal to normal_max is > normal_max, hence high."""
        ref = self._make_ref(3.5, 5.5)
        result = ref.classify(5.5)
        self.assertEqual(result["status"], "high")


if __name__ == "__main__":
    unittest.main()
