"""
SHES Tests – Triage API
Integration tests for the triage start and history endpoints.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.triage.models import TriageSession
from tests.factories import TriageSessionFactory, UserFactory


VALID_SYMPTOMS = [
    {"name": "runny nose", "severity": 3, "duration_days": 2},
    {"name": "sore throat", "severity": 4, "duration_days": 2},
    {"name": "sneezing", "severity": 3},
]

EMERGENCY_SYMPTOMS = [
    {"name": "chest pain", "severity": 9},
    {"name": "difficulty breathing", "severity": 8},
]


class TestStartTriage(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("triage-start")

    def test_valid_symptoms_return_201(self):
        response = self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

    def test_session_persisted_in_db(self):
        self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertEqual(TriageSession.objects.filter(patient=self.user).count(), 1)

    def test_emergency_symptoms_return_emergency_urgency(self):
        response = self.client.post(self.url, {"symptoms": EMERGENCY_SYMPTOMS}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["urgency_level"], "emergency")

    def test_response_contains_recommendation(self):
        response = self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertIn("recommendation", response.data["data"])
        self.assertTrue(len(response.data["data"]["recommendation"]) > 0)

    def test_response_contains_layman_explanation(self):
        response = self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertIn("layman_explanation", response.data["data"])

    def test_response_contains_symptom_list(self):
        response = self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertIn("symptoms", response.data["data"])
        self.assertEqual(len(response.data["data"]["symptoms"]), 3)

    def test_empty_symptoms_returns_400(self):
        response = self.client.post(self.url, {"symptoms": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_symptoms_key_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_many_symptoms_returns_400(self):
        symptoms = [{"name": f"symptom_{i}", "severity": 3} for i in range(25)]
        response = self.client.post(self.url, {"symptoms": symptoms}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_severity_returns_400(self):
        bad = [{"name": "headache", "severity": 15}]  # > 10 is invalid
        response = self.client.post(self.url, {"symptoms": bad}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_request_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_completed_flag_is_true(self):
        response = self.client.post(self.url, {"symptoms": VALID_SYMPTOMS}, format="json")
        self.assertTrue(response.data["data"]["completed"])


class TestTriageHistory(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.client.force_authenticate(user=self.user)
        # Create sessions for both users
        TriageSessionFactory.create_batch(3, patient=self.user)
        TriageSessionFactory.create_batch(2, patient=self.other_user)

    def test_history_returns_only_own_sessions(self):
        response = self.client.get(reverse("triage-history"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_history_pagination(self):
        response = self.client.get(reverse("triage-history"))
        self.assertIn("results", response.data)

    def test_unauthenticated_history_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("triage-history"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestTriageSessionDetail(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.session = TriageSessionFactory(patient=self.user)
        self.other_session = TriageSessionFactory(patient=self.other_user)

    def test_own_session_returns_200(self):
        url = reverse("triage-detail", kwargs={"pk": self.session.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_users_session_returns_404(self):
        url = reverse("triage-detail", kwargs={"pk": self.other_session.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
