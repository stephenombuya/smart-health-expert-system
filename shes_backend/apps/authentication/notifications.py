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
    Run daily to check for concerning health trends.
    Creates in-app notifications AND sends Gmail alerts.
    Called by: python manage.py generate_health_alerts
    """
    from apps.authentication.models import User
    from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
    from apps.authentication.emails import send_health_alert_email
    from django.db.models import Avg

    since = timezone.now() - timedelta(days=3)
    patients = User.objects.filter(
        role="patient", is_active=True, is_email_verified=True
    )

    alerts_created = 0

    for patient in patients:
        # Glucose check
        avg_glucose = GlucoseReading.objects.filter(
            patient=patient, context="fasting", recorded_at__gte=since
        ).aggregate(avg=Avg("value_mg_dl"))["avg"]

        if avg_glucose and avg_glucose > 126:
            title = "High Glucose Trend Detected"
            message = (
                f"Your average fasting glucose over the last 3 days is "
                f"{avg_glucose:.0f} mg/dL, which is in the diabetic range (>126 mg/dL). "
                "Please contact your doctor and review your diet and medications."
            )
            create_notification(user=patient, title=title, message=message, type="health_alert")
            send_health_alert_email(patient, title, message, category="glucose", priority="urgent")
            alerts_created += 1

        # BP check
        avg_bp = BloodPressureReading.objects.filter(
            patient=patient, recorded_at__gte=since
        ).aggregate(avg=Avg("systolic"))["avg"]

        if avg_bp and avg_bp > 140:
            title = "High Blood Pressure Trend"
            message = (
                f"Your average systolic pressure over the last 3 days is "
                f"{avg_bp:.0f} mmHg, indicating Stage 2 Hypertension. "
                "Please consult your doctor immediately."
            )
            create_notification(user=patient, title=title, message=message, type="health_alert")
            send_health_alert_email(patient, title, message, category="blood_pressure", priority="high")
            alerts_created += 1

    logger.info("Health alert check complete. %d alerts created.", alerts_created)
    return alerts_created