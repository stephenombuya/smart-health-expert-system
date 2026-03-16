"""
SHES Backend – Field-level Encryption Utility
Wraps Fernet symmetric encryption for storing sensitive health data
(e.g., glucose readings, mood notes) in the database.

Usage:
    from shes_backend.encryption import encrypt, decrypt

    stored = encrypt("128 mg/dL")
    plain  = decrypt(stored)
"""
import base64
import logging
from django.conf import settings

logger = logging.getLogger("shes.encryption")

try:
    from cryptography.fernet import Fernet, InvalidToken

    _key = settings.FIELD_ENCRYPTION_KEY
    if _key:
        # Accept both bytes and str keys
        if isinstance(_key, str):
            _key = _key.encode()
        _fernet = Fernet(_key)
    else:
        _fernet = None
        logger.warning(
            "FIELD_ENCRYPTION_KEY not set – sensitive fields will be stored as plain text."
        )
except ImportError:
    _fernet = None
    logger.warning("cryptography package not installed – encryption unavailable.")


def encrypt(plain_text: str) -> str:
    """Encrypt a string value.  Returns the cipher text as a UTF-8 string."""
    if _fernet is None or not plain_text:
        return plain_text
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt(cipher_text: str) -> str:
    """Decrypt a previously encrypted string. Returns plain text."""
    if _fernet is None or not cipher_text:
        return cipher_text
    try:
        return _fernet.decrypt(cipher_text.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt field – returning empty string.")
        return ""
