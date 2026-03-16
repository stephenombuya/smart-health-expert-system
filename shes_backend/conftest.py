"""
SHES Test Configuration (conftest.py)
Sets up Django settings for the test suite and provides shared fixtures.
"""
import os
import django
import pytest

# Point at the development settings before Django is set up
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "shes_backend.settings.development")
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-not-for-production-use")
os.environ.setdefault("FIELD_ENCRYPTION_KEY", "")


@pytest.fixture(scope="session")
def django_db_setup():
    """Use the default test database (SQLite in-memory for development)."""
    pass


@pytest.fixture
def api_client():
    """DRF APIClient for use in pytest-style tests (alternative to APITestCase)."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def patient_user(db):
    from tests.factories import UserFactory
    return UserFactory()


@pytest.fixture
def authenticated_client(api_client, patient_user):
    api_client.force_authenticate(user=patient_user)
    return api_client, patient_user


@pytest.fixture
def doctor_user(db):
    from tests.factories import DoctorFactory
    return DoctorFactory()
