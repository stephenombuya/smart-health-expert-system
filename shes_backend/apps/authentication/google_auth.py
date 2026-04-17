"""
SHES – Google OAuth Token Verification
Verifies a Google ID token and returns the user's profile data.
"""
import logging
from django.conf import settings

logger = logging.getLogger("apps.authentication")


def verify_google_token(id_token: str) -> dict:
    """
    Verify a Google ID token and extract user information.

    Args:
        id_token: The ID token string from the frontend Google Sign-In

    Returns:
        dict with keys: google_id, email, first_name, last_name,
                        email_verified, picture

    Raises:
        ValueError: If the token is invalid or verification fails
    """
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        raise ImportError(
            "google-auth is not installed. Run: pip install google-auth"
        )

    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured in settings.")

    try:
        # Verify the token against Google's servers
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            client_id,
        )
    except ValueError as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise ValueError(f"Invalid Google token: {exc}")

    # Confirm the token was issued for our app
    if idinfo.get("aud") != client_id:
        raise ValueError("Token audience mismatch — token not issued for this app.")

    # Confirm the email is verified by Google
    if not idinfo.get("email_verified"):
        raise ValueError("Google account email is not verified.")

    name_parts = idinfo.get("name", "").split(" ", 1)

    return {
        "google_id":      idinfo["sub"],
        "email":          idinfo["email"].lower(),
        "first_name":     name_parts[0] if name_parts else "",
        "last_name":      name_parts[1] if len(name_parts) > 1 else "",
        "email_verified": idinfo.get("email_verified", False),
        "picture":        idinfo.get("picture", ""),
    }