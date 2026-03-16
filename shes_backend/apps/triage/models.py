"""
SHES Triage – Models
Stores triage sessions, reported symptoms, and the engine's output.
"""
import uuid
from django.db import models
from django.conf import settings


class TriageSession(models.Model):
    """
    Represents one complete triage interaction by a patient.
    The inference engine evaluates the collected symptoms and produces
    a recommendation and urgency level.
    """

    class UrgencyLevel(models.TextChoices):
        EMERGENCY = "emergency", "Emergency – Seek immediate care"
        DOCTOR_VISIT = "doctor_visit", "Doctor Visit – See a doctor within 24 hours"
        SELF_CARE = "self_care", "Self-Care – Manage at home"
        UNDETERMINED = "undetermined", "Undetermined – Insufficient data"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="triage_sessions",
        limit_choices_to={"role": "patient"},
    )
    urgency_level = models.CharField(
        max_length=20,
        choices=UrgencyLevel.choices,
        default=UrgencyLevel.UNDETERMINED,
    )
    recommendation = models.TextField(blank=True, help_text="Plain-language advice for the patient")
    layman_explanation = models.TextField(blank=True, help_text="Simplified explanation of possible causes")
    red_flags_detected = models.JSONField(default=list, help_text="List of detected red-flag symptoms")
    matched_conditions = models.JSONField(default=list, help_text="Possible conditions identified by inference engine")
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Triage/{self.urgency_level} – {self.patient.get_full_name()} – {self.created_at:%Y-%m-%d %H:%M}"


class Symptom(models.Model):
    """
    An individual symptom reported within a triage session.
    Severity is patient-reported (1–10 scale).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(TriageSession, on_delete=models.CASCADE, related_name="symptoms")
    name = models.CharField(max_length=200)
    severity = models.PositiveSmallIntegerField(
        default=5,
        help_text="Patient-reported severity 1 (mild) to 10 (severe)",
    )
    duration_days = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="How many days the symptom has been present",
    )
    body_location = models.CharField(max_length=100, blank=True)
    additional_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (severity {self.severity})"
