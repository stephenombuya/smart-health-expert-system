"""
SHES Backend – Development Settings
"""
from .base import *  # noqa: F401, F403

DEBUG = True

INSTALLED_APPS += ["sslserver"]

# Allow SQLite for local dev without PostgreSQL
DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "dev_db.sqlite3",  # noqa: F405
        "TEST": {
            "NAME": BASE_DIR / "test_db.sqlite3",  # noqa: F405
        },
    }
}

# Disable rate limiting in development so tests run freely
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405

# Relax CORS for local front-end dev
CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Django Debug Toolbar (optional, install separately)
INTERNAL_IPS = ["127.0.0.1"]

# Silence password validators during testing for speed
AUTH_PASSWORD_VALIDATORS = []  # noqa: F405
