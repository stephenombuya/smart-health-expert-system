"""
SHES – Input Sanitisation Utility
Strips all HTML from user-supplied free-text fields before storage.
"""
import logging
import re

logger = logging.getLogger("shes.sanitisation")

ALLOWED_TAGS: list = []
ALLOWED_ATTRIBUTES: dict = {}

MAX_LENGTHS = {
    "default":            2000,
    "journal_note":       5000,
    "notes":              1000,
    "known_allergies":    500,
    "chronic_conditions": 500,
    "triggers":           1000,
    "additional_notes":   1000,
    "body_location":      200,
    "prescribing_doctor": 200,
    "lab_name":           200,
    "first_name":         150,
    "last_name":          150,
    "county":             100,
    "phone_number":       20,
}

SKIP_SANITISATION = frozenset({
    "password", "password_confirm", "old_password",
    "new_password", "email", "token", "refresh", "access",
})


def sanitise_string(value: str, field_name: str = "default") -> str:
    """Strip all HTML tags from a string and enforce max length."""
    if not value or not isinstance(value, str):
        return value

    try:
        import bleach
        from bleach.sanitizer import Cleaner

        cleaner = Cleaner(
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            strip=True,
            strip_comments=True,
        )
        cleaned = cleaner.clean(value)

        import html
        cleaned = html.unescape(cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        max_len = MAX_LENGTHS.get(field_name, MAX_LENGTHS["default"])
        if len(cleaned) > max_len:
            logger.warning("Field '%s' truncated from %d to %d chars.", field_name, len(cleaned), max_len)
            cleaned = cleaned[:max_len]

        return cleaned

    except ImportError:
        logger.warning("bleach not installed; using regex fallback.")
        import html
        no_tags = re.sub(r"<[^>]+>", "", value)
        return html.unescape(no_tags).strip()


def sanitise_value(value: object, field_name: str = "default") -> object:
    """Sanitise a string, a list of strings, or pass through other types unchanged."""
    if isinstance(value, str):
        return sanitise_string(value, field_name)
    if isinstance(value, list):
        return [
            sanitise_string(item, field_name) if isinstance(item, str) else item
            for item in value
        ]
    return value