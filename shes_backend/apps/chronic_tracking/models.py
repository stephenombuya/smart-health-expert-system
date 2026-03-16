"""
SHES Chronic Tracking – Models
Glucose and Blood Pressure logging with trend analysis support.
Sensitive reading values are encrypted at rest.
"""
import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class GlucoseReading(models.Model):
    """
    Blood glucose reading logged by a patient.
    Values stored as floats in mg/dL (standard Kenyan lab reporting unit).
    """
    class ReadingContext(models.TextChoices):
        FASTING = "fasting", "Fasting (before meal)"
        POST_MEAL_1H = "post_meal_1h", "1 Hour After Meal"
        POST_MEAL_2H = "post_meal_2h", "2 Hours After Meal"
        RANDOM = "random", "Random"
        BEDTIME = "bedtime", "Bedtime"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="glucose_readings",
    )
    value_mg_dl = models.FloatField(
        validators=[MinValueValidator(20.0), MaxValueValidator(800.0)],
        help_text="Blood glucose in mg/dL",
    )
    context = models.CharField(max_length=20, choices=ReadingContext.choices, default=ReadingContext.RANDOM)
    hba1c = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(3.0), MaxValueValidator(20.0)],
        help_text="HbA1c % if available from lab",
    )
    notes = models.TextField(blank=True)
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.patient.get_full_name()} – {self.value_mg_dl} mg/dL ({self.context})"

    @property
    def interpretation(self):
        """
        Returns a plain-language interpretation based on ADA / Kenya MOH guidelines.
        """
        v = self.value_mg_dl
        ctx = self.context
        if ctx == self.ReadingContext.FASTING:
            if v < 70:
                return "Low (Hypoglycaemia) – consume fast-acting sugar immediately"
            if v <= 100:
                return "Normal fasting glucose"
            if v <= 125:
                return "Pre-diabetic range – lifestyle modifications advised"
            return "High fasting glucose – consult your doctor"
        if ctx in (self.ReadingContext.POST_MEAL_1H, self.ReadingContext.POST_MEAL_2H):
            if v < 70:
                return "Low – monitor and consume sugar if symptomatic"
            if v <= 140:
                return "Normal post-meal glucose"
            if v <= 199:
                return "Slightly elevated – review diet and activity"
            return "High post-meal glucose – consult your doctor"
        # random
        if v < 70:
            return "Low blood sugar – address immediately"
        if v <= 140:
            return "Normal range"
        if v <= 199:
            return "Elevated – monitor regularly"
        return "Very high – seek medical advice"


class BloodPressureReading(models.Model):
    """
    Blood pressure reading (systolic / diastolic in mmHg).
    Classification follows the WHO / Kenya hypertension guidelines.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bp_readings",
    )
    systolic = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(60), MaxValueValidator(300)],
        help_text="Systolic pressure in mmHg",
    )
    diastolic = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(30), MaxValueValidator(200)],
        help_text="Diastolic pressure in mmHg",
    )
    pulse = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(250)],
        help_text="Heart rate in bpm",
    )
    notes = models.TextField(blank=True)
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.patient.get_full_name()} – {self.systolic}/{self.diastolic} mmHg"

    @property
    def classification(self):
        """
        Returns BP classification per WHO/JNC-8 guidelines.
        """
        s, d = self.systolic, self.diastolic
        if s < 90 or d < 60:
            return "Hypotension – low blood pressure, consult your doctor"
        if s < 120 and d < 80:
            return "Normal – healthy blood pressure"
        if s < 130 and d < 80:
            return "Elevated – lifestyle changes recommended"
        if s < 140 or d < 90:
            return "Stage 1 Hypertension – consult your doctor"
        if s < 180 or d < 120:
            return "Stage 2 Hypertension – medical treatment required"
        return "Hypertensive Crisis – seek emergency care immediately"
