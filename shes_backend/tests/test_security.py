"""
SHES Tests – Security
Tests for authentication enforcement, object-level ownership,
IDOR prevention, and other security properties.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from tests.factories import (
    GlucoseReadingFactory,
    MoodEntryFactory,
    TriageSessionFactory,
    UserFactory,
)


class TestAuthenticationRequired(APITestCase):
    """Every protected endpoint must return 401 for unauthenticated requests."""

    PROTECTED_ENDPOINTS = [
        ("get",  "triage-history"),
        ("get",  "my-medications"),
        ("get",  "glucose-list"),
        ("get",  "bp-list"),
        ("get",  "mood-list"),
        ("get",  "lab-result-list"),
        ("get",  "chronic-summary"),
        ("get",  "mood-summary"),
        ("get",  "user-profile"),
    ]

    def test_all_protected_endpoints_require_auth(self):
        for method, url_name in self.PROTECTED_ENDPOINTS:
            url = reverse(url_name)
            response = getattr(self.client, method)(url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                msg=f"Expected 401 for {method.upper()} {url_name}, got {response.status_code}",
            )


class TestObjectOwnership(APITestCase):
    """
    Users must not be able to read or modify other users' health records.
    These tests protect against Insecure Direct Object Reference (IDOR).
    """

    def setUp(self):
        self.user_a = UserFactory()
        self.user_b = UserFactory()

    def test_patient_a_cannot_read_patient_b_triage(self):
        session = TriageSessionFactory(patient=self.user_b)
        self.client.force_authenticate(user=self.user_a)
        url = reverse("triage-detail", kwargs={"pk": session.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_a_cannot_read_patient_b_glucose(self):
        reading = GlucoseReadingFactory(patient=self.user_b)
        self.client.force_authenticate(user=self.user_a)
        url = reverse("glucose-detail", kwargs={"pk": reading.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_a_cannot_delete_patient_b_glucose(self):
        reading = GlucoseReadingFactory(patient=self.user_b)
        self.client.force_authenticate(user=self.user_a)
        url = reverse("glucose-detail", kwargs={"pk": reading.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_a_cannot_read_patient_b_mood(self):
        entry = MoodEntryFactory(patient=self.user_b)
        self.client.force_authenticate(user=self.user_a)
        url = reverse("mood-detail", kwargs={"pk": entry.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestRoleIsolation(APITestCase):
    """
    Doctor and Admin role users should not access patient-only data.
    (Currently doctors have the same REST access; this tests that at minimum
    they cannot read another person's data.)
    """

    def setUp(self):
        from tests.factories import DoctorFactory
        self.patient = UserFactory()
        self.doctor = DoctorFactory()

    def test_doctor_cannot_read_patient_triage_via_api(self):
        session = TriageSessionFactory(patient=self.patient)
        self.client.force_authenticate(user=self.doctor)
        url = reverse("triage-detail", kwargs={"pk": session.pk})
        response = self.client.get(url)
        # Doctor is not the patient owner → 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestResponseEnvelope(APITestCase):
    """
    Error responses must follow the standard SHES envelope:
    { success: false, error: { code: ..., detail: ... } }
    """

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_400_error_has_success_false(self):
        # Trigger a validation error on triage start
        response = self.client.post(
            reverse("triage-start"), {"symptoms": []}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)

    def test_404_error_has_success_false(self):
        import uuid
        url = reverse("triage-detail", kwargs={"pk": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])


class TestEncryptionUtility(APITestCase):
    """Unit tests for the field-level encryption module."""

    def test_encrypt_and_decrypt_roundtrip(self):
        from cryptography.fernet import Fernet
        from unittest.mock import patch

        key = Fernet.generate_key().decode()
        with patch("shes_backend.encryption._fernet", Fernet(key.encode())):
            from shes_backend.encryption import encrypt, decrypt
            original = "128 mg/dL"
            cipher = encrypt(original)
            self.assertNotEqual(cipher, original)
            self.assertEqual(decrypt(cipher), original)

    def test_encrypt_returns_plain_when_no_key(self):
        from unittest.mock import patch
        with patch("shes_backend.encryption._fernet", None):
            from shes_backend.encryption import encrypt
            self.assertEqual(encrypt("test"), "test")

    def test_decrypt_returns_empty_on_invalid_token(self):
        from cryptography.fernet import Fernet
        from unittest.mock import patch

        key = Fernet.generate_key().decode()
        with patch("shes_backend.encryption._fernet", Fernet(key.encode())):
            from shes_backend.encryption import decrypt
            result = decrypt("not-a-valid-ciphertext")
            self.assertEqual(result, "")
