"""
SHES Tests – Authentication API
Integration tests for registration, login, logout, and profile endpoints.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User, PatientProfile
from tests.factories import UserFactory, PatientProfileFactory


class TestUserRegistration(APITestCase):

    def setUp(self):
        self.url = reverse("register")
        self.valid_payload = {
            "email": "newuser@test.ke",
            "first_name": "Jane",
            "last_name": "Otieno",
            "password": "SecurePass@2024!",
            "password_confirm": "SecurePass@2024!",
            "role": "patient",
            "phone_number": "+254712345678",
            "county": "Nairobi",
        }

    def test_successful_registration_returns_201(self):
        response = self.client.post(self.url, self.valid_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

    def test_registration_creates_user_in_db(self):
        self.client.post(self.url, self.valid_payload, format="json")
        self.assertTrue(User.objects.filter(email="newuser@test.ke").exists())

    def test_patient_registration_auto_creates_profile(self):
        self.client.post(self.url, self.valid_payload, format="json")
        user = User.objects.get(email="newuser@test.ke")
        self.assertTrue(PatientProfile.objects.filter(user=user).exists())

    def test_password_mismatch_returns_400(self):
        payload = {**self.valid_payload, "password_confirm": "WrongPass!"}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_returns_400(self):
        UserFactory(email="newuser@test.ke")
        response = self.client.post(self.url, self.valid_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_returns_400(self):
        payload = {**self.valid_payload, "password": "123", "password_confirm": "123"}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_email_returns_400(self):
        payload = {**self.valid_payload}
        del payload["email"]
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TestUserLogin(APITestCase):

    def setUp(self):
        self.url = reverse("token_obtain")
        self.user = UserFactory(email="login@test.ke")
        self.user.set_password("LoginPass@2024!")
        self.user.save()

    def test_valid_credentials_return_tokens(self):
        response = self.client.post(
            self.url,
            {"email": "login@test.ke", "password": "LoginPass@2024!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_jwt_payload_contains_role(self):
        response = self.client.post(
            self.url,
            {"email": "login@test.ke", "password": "LoginPass@2024!"},
            format="json",
        )
        import jwt as pyjwt
        from django.conf import settings
        token = response.data["access"]
        # Decode without verification to inspect payload
        payload = pyjwt.decode(token, options={"verify_signature": False})
        self.assertIn("role", payload)

    def test_wrong_password_returns_401(self):
        response = self.client.post(
            self.url,
            {"email": "login@test.ke", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(
            self.url,
            {"email": "login@test.ke", "password": "LoginPass@2024!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestLogout(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.user.set_password("TestPass@2024!")
        self.user.save()
        # Obtain tokens
        response = self.client.post(
            reverse("token_obtain"),
            {"email": self.user.email, "password": "TestPass@2024!"},
            format="json",
        )
        self.access = response.data["access"]
        self.refresh = response.data["refresh"]

    def _auth(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def test_logout_blacklists_refresh_token(self):
        self._auth()
        response = self.client.post(
            reverse("logout"), {"refresh": self.refresh}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_logout_without_token_returns_400(self):
        self._auth()
        response = self.client.post(reverse("logout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_logout_returns_401(self):
        response = self.client.post(
            reverse("logout"), {"refresh": self.refresh}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestUserProfile(APITestCase):

    def setUp(self):
        self.user = UserFactory(first_name="Alice", last_name="Kamau", county="Kiambu")
        self.client.force_authenticate(user=self.user)

    def test_get_profile_returns_user_data(self):
        response = self.client.get(reverse("user-profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["full_name"], "Alice Kamau")

    def test_patch_profile_updates_county(self):
        response = self.client.patch(
            reverse("user-profile"), {"county": "Mombasa"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.county, "Mombasa")

    def test_unauthenticated_access_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("user-profile"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_change_role_via_profile_patch(self):
        response = self.client.patch(
            reverse("user-profile"), {"role": "admin"}, format="json"
        )
        self.user.refresh_from_db()
        # Role field is read-only; should remain patient
        self.assertEqual(self.user.role, User.Role.PATIENT)


class TestChangePassword(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.user.set_password("OldPass@2024!")
        self.user.save()
        self.client.force_authenticate(user=self.user)

    def test_successful_password_change(self):
        response = self.client.put(
            reverse("change-password"),
            {"old_password": "OldPass@2024!", "new_password": "NewPass@2024!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass@2024!"))

    def test_wrong_old_password_returns_400(self):
        response = self.client.put(
            reverse("change-password"),
            {"old_password": "WrongOld!", "new_password": "NewPass@2024!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
