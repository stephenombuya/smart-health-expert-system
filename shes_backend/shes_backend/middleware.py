"""
SHES – Audit Log Middleware
Logs every API request to both the log file and the AuditLog database table.
"""
import time
import logging
from apps.authentication.audit_models import AuditLog
from apps.transaction_ids.service import issue_transaction_id

logger = logging.getLogger("shes.audit")


class AuditLogMiddleware:
    """Records method, path, status, duration, user, and IP for every request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        # Only audit API calls
        if not request.path.startswith("/api/"):
            return response

        user = getattr(request, "user", None)
        user_obj = user if (user and user.is_authenticated) else None
        user_str = str(user_obj.pk) if user_obj else "anonymous"
        ip = self._get_ip(request)

        # Log to file as before
        logger.info(
            '"%s %s" %s user=%s %.2fms',
            request.method,
            request.path,
            response.status_code,
            user_str,
            duration_ms,
        )

        # Persist to database (non-blocking — skip on error)
        try:
            _, ext_id = issue_transaction_id(
                record_type = "audit_log",
                user        = user_obj,
                persist     = False,  
            )
            AuditLog.objects.create(
                user       = user_obj,
                method     = request.method,
                path       = request.path[:500],
                status     = response.status_code,
                duration   = round(duration_ms, 2),
                ip_address = ip,
                user_agent = request.META.get("HTTP_USER_AGENT", "")[:500],
            )
        except Exception:
            pass 

        return response

    @staticmethod
    def _get_ip(request) -> str:
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")