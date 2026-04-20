"""
SHES Tests – Google OAuth Sign-In
Tests for:
  • Token verification (mocked)
  • User creation on first Google sign-in
  • Existing email account linking
  • JWT token issuance
  • Error handling
"""
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.authentication.models import User, PatientProfile
from tests.factories import UserFactory


MOCK_GOOGLE_DATA = {
    "google_id":      "google-uid-123456",
    "email":          "jane.otieno@gmail.com",
    "first_name":     "Jane",
    "last_name":      "Otieno",
    "email_verified": True,
    "picture":        "https://lh3.googleusercontent.com/photo.jpg",
}


class TestGoogleSignIn(APITestCase):

    def setUp(self):
        self.url = reverse("google-signin")

    def test_missing_token_returns_400(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_token_returns_400(self):
        response = self.client.post(self.url, {"id_token": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.authentication.views.verify_google_token")
    def test_invalid_token_returns_401(self, mock_verify):
        mock_verify.side_effect = ValueError("Token expired")
        response = self.client.post(self.url, {"id_token": "bad-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

    @patch("apps.authentication.views.verify_google_token")
    def test_new_user_created_on_first_signin(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["created"])
        self.assertTrue(response.data["success"])

    @patch("apps.authentication.views.verify_google_token")
    def test_new_user_has_correct_email(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        user = User.objects.get(email="jane.otieno@gmail.com")
        self.assertEqual(user.first_name, "Jane")
        self.assertEqual(user.last_name, "Otieno")

    @patch("apps.authentication.views.verify_google_token")
    def test_new_user_auth_provider_is_google(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        user = User.objects.get(email="jane.otieno@gmail.com")
        self.assertEqual(user.auth_provider, "google")

    @patch("apps.authentication.views.verify_google_token")
    def test_new_user_email_is_auto_verified(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        user = User.objects.get(email="jane.otieno@gmail.com")
        self.assertTrue(user.is_email_verified)

    @patch("apps.authentication.views.verify_google_token")
    def test_new_user_gets_patient_profile(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        user = User.objects.get(email="jane.otieno@gmail.com")
        self.assertTrue(PatientProfile.objects.filter(user=user).exists())

    @patch("apps.authentication.views.verify_google_token")
    def test_response_contains_jwt_tokens(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(len(response.data["access"]) > 50)
        self.assertTrue(len(response.data["refresh"]) > 50)

    @patch("apps.authentication.views.verify_google_token")
    def test_existing_google_user_returns_200_not_201(self, mock_verify):
        """Returning user should get 200, not 201."""
        mock_verify.return_value = MOCK_GOOGLE_DATA
        # First sign-in
        self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        # Second sign-in
        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["created"])

    @patch("apps.authentication.views.verify_google_token")
    def test_existing_email_account_gets_linked(self, mock_verify):
        """
        A user who registered with email should have their Google ID
        linked to their existing account on first Google sign-in.
        """
        # Create user with email/password
        existing_user = UserFactory(
            email         = "jane.otieno@gmail.com",
            auth_provider = "email",
            google_id     = None,
        )
        mock_verify.return_value = MOCK_GOOGLE_DATA

        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Same user — not a new account
        self.assertFalse(response.data["created"])
        self.assertEqual(User.objects.filter(email="jane.otieno@gmail.com").count(), 1)

        # Google ID is now linked
        existing_user.refresh_from_db()
        self.assertEqual(existing_user.google_id, "google-uid-123456")
        self.assertEqual(existing_user.auth_provider, "google")

    @patch("apps.authentication.views.verify_google_token")
    def test_response_user_data_correct(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        response = self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        user_data = response.data["user"]
        self.assertEqual(user_data["email"],         "jane.otieno@gmail.com")
        self.assertEqual(user_data["first_name"],    "Jane")
        self.assertEqual(user_data["auth_provider"], "google")

    @patch("apps.authentication.views.verify_google_token")
    def test_second_signin_same_user_no_duplicate(self, mock_verify):
        """Multiple sign-ins should not create duplicate users."""
        mock_verify.return_value = MOCK_GOOGLE_DATA
        for _ in range(3):
            self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        count = User.objects.filter(email="jane.otieno@gmail.com").count()
        self.assertEqual(count, 1)

    @patch("apps.authentication.views.verify_google_token")
    def test_google_user_role_defaults_to_patient(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_DATA
        self.client.post(self.url, {"id_token": "valid-token"}, format="json")
        user = User.objects.get(email="jane.otieno@gmail.com")
        self.assertEqual(user.role, User.Role.PATIENT)