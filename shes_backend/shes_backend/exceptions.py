"""
SHES Backend – Custom Exception Handler
Ensures all API errors return a consistent JSON envelope.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("shes")


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler so every error follows the shape:
        { "success": false, "error": { "code": "...", "detail": "..." } }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "success": False,
            "error": {
                "code": response.status_code,
                "detail": response.data,
            },
        }
        response.data = error_payload

        # Log server-side errors
        if response.status_code >= 500:
            logger.error(
                "Server error in %s: %s", context.get("view"), exc, exc_info=True
            )

    return response
