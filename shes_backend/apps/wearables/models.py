"""
SHES Wearables – Models
Stores health readings synced from wearable devices.
Supports: Google Fit, Fitbit, Apple Health, manual entry.
"""
from django.db import models
from django.conf import settings


class WearableConnection(models.Model):
    """Stores OAuth tokens for a user's connected wearable device."""

    class Provider(models.TextChoices):
        GOOGLE_FIT     = "google_fit",     "Google Fit"
        HEALTH_CONNECT = "health_connect", "Android Health Connect"
        FITBIT         = "fitbit",         "Fitbit"
        GARMIN         = "garmin",         "Garmin Connect"
        APPLE_HEALTH   = "apple_health",   "Apple Health (CSV)"
        MANUAL         = "manual",         "Manual Entry"

    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wearable_connections",
    )
    provider      = models.CharField(max_length=20, choices=Provider.choices)
    access_token  = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_expiry  = models.DateTimeField(null=True, blank=True)
    is_active     = models.BooleanField(default=True)
    last_synced   = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "provider")]

    def __str__(self):
        return f"{self.user.email} — {self.provider}"
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class WearableReading(models.Model):
    """
    A single metric reading from a wearable device.
    One row per metric per time period.
    """
    class Metric(models.TextChoices):
        STEPS       = "steps",        "Daily Steps"
        HEART_RATE  = "heart_rate",   "Heart Rate (bpm)"
        SLEEP_HOURS = "sleep_hours",  "Sleep Duration (hrs)"
        CALORIES    = "calories",     "Calories Burned"
        DISTANCE    = "distance",     "Distance (km)"
        GLUCOSE     = "glucose",      "Blood Glucose (mg/dL)"
        OXYGEN      = "oxygen_sat",   "Blood Oxygen (%)"
        TEMPERATURE = "temperature",  "Body Temperature (°C)"
        WEIGHT      = "weight",       "Weight (kg)"

    patient      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wearable_readings",
    )
    connection   = models.ForeignKey(
        WearableConnection,
        null=True, blank=True,
        on_delete=models.SET_NULL,
    )
    metric       = models.CharField(max_length=20, choices=Metric.choices)
    value        = models.FloatField()
    unit         = models.CharField(max_length=20, blank=True)
    source       = models.CharField(
        max_length=20, default="manual",
        help_text="google_fit | fitbit | apple_health | manual"
    )
    recorded_at  = models.DateTimeField()
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering   = ["-recorded_at"]
        indexes    = [
            models.Index(fields=["patient", "metric", "-recorded_at"]),
        ]

    def __str__(self):
        return f"{self.patient.email} — {self.metric}: {self.value}"
    

    recorded_at = models.DateTimeField()

    class Meta:
        ordering = ['-recorded_at']