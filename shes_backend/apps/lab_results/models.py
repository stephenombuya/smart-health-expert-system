"""
SHES Lab Results – Models
Stores patient-uploaded lab results and their plain-language interpretations.
The NLP layer translates medical jargon into actionable layman's terms.
"""
import uuid
from django.db import models
from django.conf import settings


class LabTestReference(models.Model):
    """
    Reference ranges for common lab tests used in Kenyan healthcare settings.
    Used by the interpreter to classify results as normal / abnormal.
    """
    test_name = models.CharField(max_length=200, unique=True)
    abbreviation = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=50)
    normal_min = models.FloatField(null=True, blank=True)
    normal_max = models.FloatField(null=True, blank=True)
    low_label = models.CharField(max_length=100, default="Below normal range")
    normal_label = models.CharField(max_length=100, default="Within normal range")
    high_label = models.CharField(max_length=100, default="Above normal range")
    layman_description = models.TextField(help_text="What this test measures in plain English")
    low_advice = models.TextField(blank=True)
    high_advice = models.TextField(blank=True)

    class Meta:
        ordering = ["test_name"]

    def __str__(self):
        return f"{self.test_name} ({self.abbreviation})"

    def classify(self, value: float) -> dict:
        """Returns a dict with status and plain-language advice."""
        if self.normal_min is not None and value < self.normal_min:
            return {"status": "low", "label": self.low_label, "advice": self.low_advice}
        if self.normal_max is not None and value > self.normal_max:
            return {"status": "high", "label": self.high_label, "advice": self.high_advice}
        return {"status": "normal", "label": self.normal_label, "advice": "Your result is within the normal range."}


class LabResult(models.Model):
    """
    A single lab result record submitted by a patient.
    Can contain multiple individual test values (stored in `results` JSON).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lab_results",
    )
    lab_name = models.CharField(max_length=200, blank=True, help_text="Name of the laboratory / hospital")
    test_date = models.DateField()
    raw_results = models.JSONField(
        help_text='List of {test_name, value, unit} objects as read from the report'
    )
    interpreted_results = models.JSONField(
        default=list,
        help_text="Engine-generated plain-language interpretation for each result",
    )
    overall_summary = models.TextField(blank=True)
    doctor_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-test_date"]

    def __str__(self):
        return f"{self.patient.get_full_name()} – Lab {self.test_date}"
