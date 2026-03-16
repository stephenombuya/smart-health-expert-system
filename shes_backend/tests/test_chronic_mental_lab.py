"""
SHES Tests – Chronic Tracking API
"""
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from tests.factories import (
    BloodPressureReadingFactory,
    CopingStrategyFactory,
    GlucoseReadingFactory,
    LabResultFactory,
    LabTestReferenceFactory,
    UserFactory,
)


# ─────────────────────────────────────────────────────────────────────────────
# Chronic Tracking
# ─────────────────────────────────────────────────────────────────────────────

class TestGlucoseReadings(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("glucose-list")

    def _payload(self, value=95.0):
        return {
            "value_mg_dl": value,
            "context": "fasting",
            "recorded_at": timezone.now().isoformat(),
        }

    def test_create_glucose_reading_returns_201(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_response_contains_interpretation(self):
        response = self.client.post(self.url, self._payload(95.0), format="json")
        self.assertIn("interpretation", response.data)
        self.assertIn("Normal", response.data["interpretation"])

    def test_high_glucose_interpretation(self):
        response = self.client.post(self.url, self._payload(200.0), format="json")
        interp = response.data["interpretation"].lower()
        self.assertIn("high", interp)

    def test_low_glucose_interpretation(self):
        response = self.client.post(self.url, self._payload(60.0), format="json")
        interp = response.data["interpretation"].lower()
        self.assertIn("low", interp)

    def test_invalid_glucose_value_returns_400(self):
        response = self.client.post(self.url, self._payload(value=5.0), format="json")
        # 5 mg/dL is below minimum validator of 20
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_returns_only_own_readings(self):
        GlucoseReadingFactory.create_batch(3, patient=self.user)
        GlucoseReadingFactory(patient=UserFactory())
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 3)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestBloodPressureReadings(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("bp-list")

    def _payload(self, systolic=120, diastolic=80):
        return {
            "systolic": systolic,
            "diastolic": diastolic,
            "pulse": 72,
            "recorded_at": timezone.now().isoformat(),
        }

    def test_create_bp_reading_returns_201(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_normal_bp_classification(self):
        response = self.client.post(self.url, self._payload(115, 75), format="json")
        self.assertIn("Normal", response.data["classification"])

    def test_hypertensive_crisis_classification(self):
        response = self.client.post(self.url, self._payload(185, 125), format="json")
        self.assertIn("Crisis", response.data["classification"])

    def test_diastolic_higher_than_systolic_returns_400(self):
        response = self.client.post(self.url, self._payload(80, 120), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_returns_only_own_readings(self):
        BloodPressureReadingFactory.create_batch(2, patient=self.user)
        BloodPressureReadingFactory(patient=UserFactory())
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 2)


class TestChronicSummary(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        GlucoseReadingFactory.create_batch(3, patient=self.user, value_mg_dl=100.0)
        BloodPressureReadingFactory.create_batch(2, patient=self.user, systolic=130, diastolic=85)

    def test_summary_returns_200(self):
        response = self.client.get(reverse("chronic-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_summary_contains_glucose_avg(self):
        response = self.client.get(reverse("chronic-summary"))
        self.assertIsNotNone(response.data["glucose"]["average_mg_dl"])

    def test_summary_contains_bp_avg(self):
        response = self.client.get(reverse("chronic-summary"))
        self.assertIsNotNone(response.data["blood_pressure"]["average_systolic"])


# ─────────────────────────────────────────────────────────────────────────────
# Mental Health
# ─────────────────────────────────────────────────────────────────────────────

class TestMoodEntry(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("mood-list")
        self.strategy = CopingStrategyFactory(applicable_moods=["distressed", "low"])

    def _payload(self, score=3):
        return {
            "mood_score": score,
            "emotions": ["anxious", "tired"],
            "recorded_at": timezone.now().isoformat(),
        }

    def test_create_mood_entry_returns_201(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

    def test_response_contains_suggested_strategies(self):
        response = self.client.post(self.url, self._payload(score=2), format="json")
        self.assertIn("suggested_strategies", response.data)
        self.assertGreaterEqual(len(response.data["suggested_strategies"]), 1)

    def test_mood_category_auto_computed(self):
        response = self.client.post(self.url, self._payload(score=9), format="json")
        self.assertEqual(response.data["data"]["mood_category"], "excellent")

    def test_score_1_gives_distressed_category(self):
        response = self.client.post(self.url, self._payload(score=1), format="json")
        self.assertEqual(response.data["data"]["mood_category"], "distressed")

    def test_invalid_score_returns_400(self):
        payload = {**self._payload(), "mood_score": 0}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_many_emotions_returns_400(self):
        payload = {**self._payload(), "emotions": [f"emotion_{i}" for i in range(11)]}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_shows_only_own_entries(self):
        from tests.factories import MoodEntryFactory
        MoodEntryFactory.create_batch(4, patient=self.user)
        MoodEntryFactory(patient=UserFactory())
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 4)


class TestMoodSummary(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_summary_empty_data_returns_200(self):
        response = self.client.get(reverse("mood-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["average_mood_score"])

    def test_low_average_triggers_wellbeing_concern(self):
        from tests.factories import MoodEntryFactory
        MoodEntryFactory.create_batch(5, patient=self.user, mood_score=2)
        response = self.client.get(reverse("mood-summary"))
        self.assertTrue(response.data["wellbeing_concern"])

    def test_high_average_no_wellbeing_concern(self):
        from tests.factories import MoodEntryFactory
        MoodEntryFactory.create_batch(5, patient=self.user, mood_score=8)
        response = self.client.get(reverse("mood-summary"))
        self.assertFalse(response.data["wellbeing_concern"])


# ─────────────────────────────────────────────────────────────────────────────
# Lab Results
# ─────────────────────────────────────────────────────────────────────────────

class TestLabResults(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("lab-result-list")

    def _payload(self):
        return {
            "lab_name": "Aga Khan Hospital Nairobi",
            "test_date": "2024-06-15",
            "raw_results": [
                {"test_name": "Haemoglobin", "value": "14.5", "unit": "g/dL"},
                {"test_name": "HbA1c", "value": "5.4", "unit": "%"},
                {"test_name": "Total Cholesterol", "value": "6.5", "unit": "mmol/L"},
            ],
        }

    def test_submit_lab_result_returns_201(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

    def test_interpreted_results_generated(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertIsInstance(response.data["data"]["interpreted_results"], list)
        self.assertEqual(len(response.data["data"]["interpreted_results"]), 3)

    def test_overall_summary_generated(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertTrue(len(response.data["data"]["overall_summary"]) > 0)

    def test_abnormal_result_mentioned_in_summary(self):
        """Total Cholesterol 6.5 mmol/L is above normal – should appear in summary."""
        response = self.client.post(self.url, self._payload(), format="json")
        summary = response.data["data"]["overall_summary"].lower()
        self.assertIn("attention", summary)

    def test_empty_raw_results_returns_400(self):
        payload = {**self._payload(), "raw_results": []}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_shows_only_own_results(self):
        LabResultFactory.create_batch(2, patient=self.user)
        LabResultFactory(patient=UserFactory())
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 2)

    def test_delete_own_result(self):
        result = LabResultFactory(patient=self.user)
        url = reverse("lab-result-detail", kwargs={"pk": result.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_other_users_result(self):
        result = LabResultFactory(patient=UserFactory())
        url = reverse("lab-result-detail", kwargs={"pk": result.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
