"""
SHES Medications – Models
Tracks patient medication schedules and checks drug interactions.
"""
import uuid
from django.db import models
from django.conf import settings


class Medication(models.Model):
    """
    Master list of medications drawn from the Kenya Essential Medicines List (KEML).
    Seeded via management command / fixture.
    """
    name = models.CharField(max_length=200, unique=True)
    generic_name = models.CharField(max_length=200, blank=True)
    drug_class = models.CharField(max_length=100, blank=True)
    common_uses = models.TextField(blank=True)
    standard_dosage = models.CharField(max_length=200, blank=True)
    contraindications = models.TextField(blank=True)
    side_effects = models.TextField(blank=True)
    is_keml_listed = models.BooleanField(default=True, help_text="On Kenya Essential Medicines List")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DrugInteraction(models.Model):
    """
    Known interaction between two medications.
    Severity levels follow WHO/KEML classification.
    """
    class Severity(models.TextChoices):
        MINOR = "minor", "Minor – Monitor patient"
        MODERATE = "moderate", "Moderate – Use with caution"
        MAJOR = "major", "Major – Avoid combination"
        CONTRAINDICATED = "contraindicated", "Contraindicated – Do not use together"

    drug_a = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name="interactions_as_a")
    drug_b = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name="interactions_as_b")
    severity = models.CharField(max_length=20, choices=Severity.choices)
    description = models.TextField(help_text="Plain-language description of the interaction risk")
    clinical_action = models.TextField(blank=True, help_text="Recommended clinical action")

    class Meta:
        unique_together = [("drug_a", "drug_b")]

    def __str__(self):
        return f"{self.drug_a.name} ↔ {self.drug_b.name} ({self.severity})"


class PatientMedication(models.Model):
    """
    A medication currently being taken by a patient, including schedule.
    """
    class FrequencyChoices(models.TextChoices):
        ONCE_DAILY = "once_daily", "Once Daily"
        TWICE_DAILY = "twice_daily", "Twice Daily"
        THREE_TIMES = "three_times_daily", "Three Times Daily"
        FOUR_TIMES = "four_times_daily", "Four Times Daily"
        AS_NEEDED = "as_needed", "As Needed (PRN)"
        WEEKLY = "weekly", "Once Weekly"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="medications",
    )
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT)
    dosage = models.CharField(max_length=100, help_text="e.g. 500mg, 2 tablets")
    frequency = models.CharField(max_length=30, choices=FrequencyChoices.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Leave blank for indefinite / chronic use")
    prescribing_doctor = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient.get_full_name()} – {self.medication.name} ({self.dosage})"
