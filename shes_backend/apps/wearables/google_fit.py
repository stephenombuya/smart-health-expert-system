"""
SHES – Google Fit Integration
Fetches health data from Google Fit API using OAuth2.
"""
import logging
from datetime import timedelta
from django.utils import timezone

from django.conf import settings

logger = logging.getLogger("apps.wearables")

GOOGLE_FIT_SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
    "https://www.googleapis.com/auth/fitness.body.read",
]

# Google Fit data type → SHES metric name mapping
DATATYPE_MAP = {
    "com.google.step_count.delta":        "steps",
    "com.google.heart_rate.bpm":          "heart_rate",
    "com.google.sleep.segment":           "sleep_hours",
    "com.google.calories.expended":       "calories",
    "com.google.distance.delta":          "distance",
    "com.google.blood_glucose.mmol_per_l":"glucose",
    "com.google.oxygen_saturation":       "oxygen_sat",
    "com.google.body.temperature":        "temperature",
    "com.google.weight":                  "weight",
}


def get_google_fit_auth_url(redirect_uri: str, user_id: str):
    import urllib.parse, json, base64

    state = base64.urlsafe_b64encode(
        json.dumps({"user_id": str(user_id)}).encode()
    ).decode()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_FIT_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange an OAuth code for access + refresh tokens."""
    import requests
    from django.conf import settings

    response = requests.post("https://oauth2.googleapis.com/token", data={
        "code":          code,
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri":  redirect_uri,
        "grant_type":    "authorization_code",
    })
    response.raise_for_status()
    return response.json()


def fetch_steps(access_token: str, days: int = 7) -> list:
    """Fetch daily step counts from Google Fit."""
    import requests
    from datetime import datetime

    now      = int(datetime.utcnow().timestamp() * 1000)
    start    = int((datetime.utcnow() - timedelta(days=days)).timestamp() * 1000)

    headers  = {"Authorization": f"Bearer {access_token}"}
    body     = {
        "aggregateBy": [{"dataTypeName": "com.google.step_count.delta"}],
        "bucketByTime": {"durationMillis": 86400000},  # 1 day
        "startTimeMillis": start,
        "endTimeMillis": now,
    }

    response = requests.post(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        json=body, headers=headers,
    )
    response.raise_for_status()
    data     = response.json()

    results  = []
    for bucket in data.get("bucket", []):
        date_ms = int(bucket["startTimeMillis"])
        date    = datetime.utcfromtimestamp(date_ms / 1000)
        for dataset in bucket.get("dataset", []):
            for point in dataset.get("point", []):
                value = point.get("value", [{}])[0].get("intVal", 0)
                if value > 0:
                    results.append({
                        "metric":      "steps",
                        "value":       value,
                        "unit":        "steps",
                        "recorded_at": date.isoformat() + "Z",
                        "source":      "google_fit",
                    })
    return results


def fetch_heart_rate(access_token: str, days: int = 7) -> list:
    """Fetch average daily heart rate from Google Fit."""
    import requests
    from datetime import datetime

    now   = int(datetime.utcnow().timestamp() * 1000)
    start = int((datetime.utcnow() - timedelta(days=days)).timestamp() * 1000)

    headers = {"Authorization": f"Bearer {access_token}"}
    body    = {
        "aggregateBy": [{"dataTypeName": "com.google.heart_rate.bpm"}],
        "bucketByTime": {"durationMillis": 86400000},
        "startTimeMillis": start,
        "endTimeMillis": now,
    }

    response = requests.post(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        json=body, headers=headers,
    )
    response.raise_for_status()
    data = response.json()

    results = []
    for bucket in data.get("bucket", []):
        date_ms = int(bucket["startTimeMillis"])
        date    = datetime.utcfromtimestamp(date_ms / 1000)
        for dataset in bucket.get("dataset", []):
            for point in dataset.get("point", []):
                for val in point.get("value", []):
                    bpm = val.get("fpVal", 0)
                    if bpm > 0:
                        results.append({
                            "metric":      "heart_rate",
                            "value":       round(bpm, 1),
                            "unit":        "bpm",
                            "recorded_at": date.isoformat() + "Z",
                            "source":      "google_fit",
                        })
    return results


def sync_all_metrics(connection) -> int:
    """Sync all available metrics for a Google Fit connection. Returns count synced."""
    total = 0
    try:
        readings = []
        readings.extend(fetch_steps(connection.access_token))
        readings.extend(fetch_heart_rate(connection.access_token))

        from .models import WearableReading
        from django.utils.dateparse import parse_datetime

        for r in readings:
            recorded_at = parse_datetime(r["recorded_at"])
            WearableReading.objects.get_or_create(
                patient     = connection.user,
                metric      = r["metric"],
                recorded_at = recorded_at,
                defaults={
                    "value":      r["value"],
                    "unit":       r.get("unit", ""),
                    "source":     "google_fit",
                    "connection": connection,
                },
            )
            total += 1

        connection.last_synced = timezone.now()
        connection.save(update_fields=["last_synced"])
        logger.info("Google Fit sync: %d readings for %s", total, connection.user.email)

    except Exception as exc:
        logger.error("Google Fit sync failed: %s", exc)

    return total