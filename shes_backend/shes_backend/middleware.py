"""
SHES Backend – Audit Log Middleware
Logs every authenticated API request for compliance with the
Kenya Data Protection Act (2019).
"""
import logging
import time

logger = logging.getLogger("shes.audit")


class AuditLogMiddleware:
    """
    Records: user, method, path, status code, and response time for
    every request touching the /api/ namespace.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        if request.path.startswith("/api/"):
            user_id = (
                request.user.pk if request.user.is_authenticated else "anonymous"
            )
            logger.info(
                '"%s %s" %s user=%s %.2fms',
                request.method,
                request.path,
                response.status_code,
                user_id,
                duration_ms,
            )

        return response
