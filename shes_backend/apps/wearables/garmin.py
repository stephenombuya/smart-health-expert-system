"""
SHES – Garmin Connect Integration
Supports: Forerunner, Fenix, Vivoactive, Venu series.
Uses Garmin Health API (requires Garmin partner agreement for production).
For development/testing, uses the public Garmin Connect API via garminconnect library.
"""
import logging
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger("apps.wearables")


def sync_garmin_via_library(connection) -> int:
    """
    Sync Garmin data using the garminconnect Python library.
    Install: pip install garminconnect

    Note: This uses the unofficial Garmin Connect API.
    For production deployments, apply for Garmin Health API partner access:
    https://developer.garmin.com/health-api/overview/
    """
    try:
        from garminconnect import Garmin
    except ImportError:
        raise ImportError(
            "garminconnect not installed. Run: pip install garminconnect"
        )

    from .models import WearableReading
    from django.utils.dateparse import parse_date

    # Credentials stored in connection (username/password for Garmin Connect)
    client = Garmin(connection.access_token, connection.refresh_token)
    client.login()

    today    = datetime.utcnow().date()
    total    = 0

    for i in range(7):
        date = today - timedelta(days=i)
        date_str = date.isoformat()

        try:
            # Steps
            steps_data = client.get_steps_data(date_str)
            if steps_data:
                total_steps = sum(s.get("steps", 0) for s in steps_data)
                if total_steps > 0:
                    WearableReading.objects.get_or_create(
                        patient     = connection.user,
                        metric      = "steps",
                        recorded_at = datetime.combine(date, datetime.min.time()),
                        defaults={"value": total_steps, "unit": "steps", "source": "garmin"},
                    )
                    total += 1

            # Heart rate
            hr_data = client.get_heart_rates(date_str)
            resting_hr = hr_data.get("restingHeartRate")
            if resting_hr:
                WearableReading.objects.get_or_create(
                    patient     = connection.user,
                    metric      = "heart_rate",
                    recorded_at = datetime.combine(date, datetime.min.time()),
                    defaults={"value": resting_hr, "unit": "bpm", "source": "garmin"},
                )
                total += 1

            # Sleep
            sleep_data = client.get_sleep_data(date_str)
            sleep_sec  = sleep_data.get("dailySleepDTO", {}).get("sleepTimeSeconds", 0)
            if sleep_sec > 0:
                WearableReading.objects.get_or_create(
                    patient     = connection.user,
                    metric      = "sleep_hours",
                    recorded_at = datetime.combine(date, datetime.min.time()),
                    defaults={"value": round(sleep_sec / 3600, 1), "unit": "hrs", "source": "garmin"},
                )
                total += 1

        except Exception as exc:
            logger.warning("Garmin sync error for %s: %s", date_str, exc)

    connection.last_synced = timezone.now()
    connection.save(update_fields=["last_synced"])
    logger.info("Garmin sync: %d readings for %s", total, connection.user.email)
    return total