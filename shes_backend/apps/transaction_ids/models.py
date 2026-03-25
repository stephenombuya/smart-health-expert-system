"""
SHES Transaction ID Model
Stores issued transaction IDs for auditability and deduplication.
"""
from django.db import models
from django.conf import settings


class TransactionRecord(models.Model):
    """
    Issued transaction IDs are stored for audit trails and deduplication.
    """
    class RecordType(models.TextChoices):
        LAB_RESULT   = "lab_result",   "Lab Result"
        ALERT        = "alert",        "Alert"
        TRIAGE       = "triage",       "Triage Session"
        RISK_REPORT  = "risk_report",  "Risk Report"
        MEDICATION   = "medication",   "Medication Record"
        AUDIT_LOG    = "audit_log",    "Audit Log"
        GENERIC      = "generic",      "Generic"

    internal_id  = models.BigIntegerField(unique=True, db_index=True)
    external_id  = models.CharField(max_length=30, unique=True, db_index=True)
    record_type  = models.CharField(
        max_length=20,
        choices=RecordType.choices,
        default=RecordType.GENERIC,
    )
    issued_to    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="transaction_records",
    )
    reference_id = models.CharField(
        max_length=100, blank=True,
        help_text="Optional: UUID of the related SHES record (lab result, triage session, etc.)",
    )
    machine_id   = models.SmallIntegerField()
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering   = ["-created_at"]
        indexes    = [
            models.Index(fields=["record_type", "-created_at"]),
            models.Index(fields=["issued_to", "-created_at"]),
        ]
        verbose_name        = "Transaction Record"
        verbose_name_plural = "Transaction Records"

    def __str__(self):
        return f"{self.external_id} [{self.record_type}]"