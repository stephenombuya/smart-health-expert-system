"""
SHES – Audit Log Database Model
Stores every API request for security review in the Django admin.
"""
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """Persists every audited API request to the database."""

    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    method     = models.CharField(max_length=10)
    path       = models.CharField(max_length=500)
    status     = models.PositiveSmallIntegerField()
    duration   = models.FloatField(help_text="Response time in milliseconds")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp  = models.DateTimeField(auto_now_add=True)
    transaction_external = models.CharField(
        max_length=30, blank=True,
        help_text="SHES transaction ID for this audit entry.",
    )

    class Meta:
        ordering = ["-timestamp"]
        verbose_name     = "Audit Log"
        verbose_name_plural = "Audit Logs"
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["path"]),
            models.Index(fields=["status"]),
            models.Index(fields=["-timestamp"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "anonymous"
        return f"{self.method} {self.path} {self.status} — {user_str}"

    @property
    def status_class(self):
        if self.status < 300:   return "success"
        if self.status < 400:   return "redirect"
        if self.status < 500:   return "client_error"
        return "server_error"

    @property
    def is_suspicious(self):
        """Flag potentially suspicious requests."""
        return (
            self.status == 401
            or self.status == 403
            or self.status == 429
            or (self.status >= 500 and self.status < 600)
        )