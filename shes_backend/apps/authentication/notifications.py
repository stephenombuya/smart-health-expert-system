"""
SHES – Notification Generator
Creates in-app notifications for health alerts and medication reminders.
"""
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger("apps.authentication")


def create_notification(user, title: str, message: str, type: str = "system"):
    """Create a single in-app notification for a user."""
    from .models import Notification
    return Notification.objects.create(
        user=user, title=title, message=message, type=type
    )


def generate_health_alerts():
    """
    Run daily to check for concerning health trends and generate notifications.
    Called by: python manage.py generate_health_alerts
    """
    from apps.authentication.models import User
    from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
    from django.db.models import Avg

    since = timezone.now() - timedelta(days=3)
    patients = User.objects.filter(role="patient", is_active=True)

    alerts_created = 0
    for patient in patients:
        # Check glucose trend
        recent_glucose = GlucoseReading.objects.filter(
            patient=patient,
            context="fasting",
            recorded_at__gte=since,
        ).aggregate(avg=Avg("value_mg_dl"))["avg"]

        if recent_glucose and recent_glucose > 126:
            create_notification(
                user=patient,
                title="High Glucose Alert",
                message=f"Your average fasting glucose over the last 3 days is {recent_glucose:.0f} mg/dL, which is in the diabetic range. Please contact your doctor.",
                type="health_alert",
            )
            alerts_created += 1

        # Check BP trend
        recent_bp = BloodPressureReading.objects.filter(
            patient=patient,
            recorded_at__gte=since,
        ).aggregate(avg=Avg("systolic"))["avg"]

        if recent_bp and recent_bp > 140:
            create_notification(
                user=patient,
                title="High Blood Pressure Alert",
                message=f"Your average systolic pressure over the last 3 days is {recent_bp:.0f} mmHg, indicating Stage 2 Hypertension. Please consult your doctor.",
                type="health_alert",
            )
            alerts_created += 1

    logger.info("Health alert check complete. %d alerts created.", alerts_created)
    return alerts_created