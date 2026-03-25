from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from factories import (
    UserFactory,
    GlucoseReadingFactory,
    BloodPressureReadingFactory,
)

from apps.chronic_tracking.risk_engine import (
    compute_bp_risk,
    detect_trend,
    compute_glucose_risk,
    moving_average,
)


class TestRiskEngine(APITestCase):

    def setUp(self):
        self.patient = UserFactory()

    # ── Glucose Risk ─────────────────────────────────────────

    def test_glucose_risk_no_data_returns_unknown(self):
        result = compute_glucose_risk(self.patient)
        self.assertEqual(result["risk_level"], "UNKNOWN")

    def test_glucose_risk_normal_readings_returns_low(self):
        for val in [85, 88, 90, 87, 86, 91, 89, 84, 88, 87]:
            GlucoseReadingFactory(
                patient=self.patient,
                value_mg_dl=val,
                context="fasting"
            )

        result = compute_glucose_risk(self.patient)
        self.assertEqual(result["risk_level"], "LOW")

    def test_glucose_risk_high_readings_returns_high(self):
        for val in [140, 145, 150, 155, 160, 148, 152, 158, 162, 155]:
            GlucoseReadingFactory(
                patient=self.patient,
                value_mg_dl=val,
                context="fasting"
            )

        result = compute_glucose_risk(self.patient)
        self.assertEqual(result["risk_level"], "HIGH")

    # ── Blood Pressure Risk ─────────────────────────────────

    def test_bp_risk_normal_returns_low(self):
        for val in [115, 118, 112, 120, 116, 119, 114, 117, 121, 113]:
            BloodPressureReadingFactory(
                patient=self.patient,
                systolic=val,
                diastolic=75
            )

        result = compute_bp_risk(self.patient)
        self.assertEqual(result["risk_level"], "LOW")

    # ── Trend Detection ─────────────────────────────────────

    def test_trend_detection_increasing(self):
        values = [80, 85, 90, 95, 100, 105, 110, 115]
        self.assertEqual(detect_trend(values), "increasing")

    def test_trend_detection_decreasing(self):
        values = [120, 115, 110, 105, 100, 95, 90, 85]
        self.assertEqual(detect_trend(values), "decreasing")

    def test_trend_detection_stable(self):
        values = [100, 101, 99, 100, 102, 99, 101, 100]
        self.assertEqual(detect_trend(values), "stable")

    def test_trend_detection_insufficient_data(self):
        self.assertEqual(detect_trend([100]), "stable")

    # ── Moving Average ──────────────────────────────────────

    def test_moving_average_correct(self):
        values = [1, 2, 3, 4, 5]
        result = moving_average(values, window=3)
        self.assertEqual(result, [2.0, 3.0, 4.0])

    def test_moving_average_window_too_large(self):
        values = [1, 2]
        result = moving_average(values, window=5)
        self.assertEqual(result, [])

    # ── Endpoint Test ───────────────────────────────────────

    def test_health_intelligence_endpoint_returns_200(self):
        self.client.force_authenticate(user=self.patient)

        # Seed minimal data
        GlucoseReadingFactory(
            patient=self.patient,
            value_mg_dl=90,
            context="fasting"
        )
        BloodPressureReadingFactory(
            patient=self.patient,
            systolic=120,
            diastolic=80
        )

        response = self.client.get(reverse("health-intelligence"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data.get("data", {})

        self.assertIn("glucose", data)
        self.assertIn("blood_pressure", data)
        self.assertIn("mood", data)

        # Stronger validation
        self.assertIn("risk_level", data["glucose"])
        self.assertIn("risk_level", data["blood_pressure"])
