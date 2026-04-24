"""
SHES – Fitbit Integration
Supports: Fitbit Charge, Versa, Sense, Inspire series.
Data: steps, heart rate, sleep, calories, weight, SpO2.
"""
import logging
import requests
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("apps.wearables")

FITBIT_AUTH_URL    = "https://www.fitbit.com/oauth2/authorize"
FITBIT_TOKEN_URL   = "https://api.fitbit.com/oauth2/token"
FITBIT_API_BASE    = "https://api.fitbit.com/1"
FITBIT_API_BASE_1_2 = "https://api.fitbit.com/1.2"

FITBIT_SCOPES = [
    "activity",
    "heartrate",
    "sleep",
    "weight",
    "oxygen_saturation",
    "profile",
]


def get_fitbit_auth_url(redirect_uri: str, state: str) -> str:
    import urllib.parse
    params = {
        "client_id":     settings.FITBIT_CLIENT_ID,
        "response_type": "code",
        "scope":         " ".join(FITBIT_SCOPES),
        "redirect_uri":  redirect_uri,
        "state":         state,
        "expires_in":    "2592000",
    }
    return FITBIT_AUTH_URL + "?" + urllib.parse.urlencode(params)


def exchange_code(code: str, redirect_uri: str) -> dict:
    """Exchange OAuth code for access + refresh tokens."""
    import base64
    credentials = base64.b64encode(
        f"{settings.FITBIT_CLIENT_ID}:{settings.FITBIT_CLIENT_SECRET}".encode()
    ).decode()

    response = requests.post(
        FITBIT_TOKEN_URL,
        data={
            "clientId":    settings.FITBIT_CLIENT_ID,
            "grant_type":  "authorization_code",
            "redirect_uri":redirect_uri,
            "code":        code,
        },
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
    )
    response.raise_for_status()
    return response.json()


def refresh_access_token(connection) -> str:
    """Refresh an expired Fitbit access token."""
    import base64
    credentials = base64.b64encode(
        f"{settings.FITBIT_CLIENT_ID}:{settings.FITBIT_CLIENT_SECRET}".encode()
    ).decode()

    response = requests.post(
        FITBIT_TOKEN_URL,
        data={
            "grant_type":    "refresh_token",
            "refresh_token": connection.refresh_token,
        },
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
    )
    response.raise_for_status()
    tokens = response.json()

    connection.access_token  = tokens["access_token"]
    connection.refresh_token = tokens.get("refresh_token", connection.refresh_token)
    connection.save(update_fields=["access_token", "refresh_token"])
    return tokens["access_token"]


def _fitbit_get(connection, url: str) -> dict:
    """Make an authenticated Fitbit API request with auto token refresh."""
    headers = {"Authorization": f"Bearer {connection.access_token}"}
    response = requests.get(url, headers=headers)

    if response.status_code == 401:
        # Token expired — refresh and retry
        new_token = refresh_access_token(connection)
        headers   = {"Authorization": f"Bearer {new_token}"}
        response  = requests.get(url, headers=headers)

    response.raise_for_status()
    return response.json()


def fetch_fitbit_steps(connection, days: int = 7) -> list:
    """Fetch daily step counts."""
    end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    url        = f"{FITBIT_API_BASE}/user/-/activities/steps/date/{start_date}/{end_date}.json"

    data    = _fitbit_get(connection, url)
    results = []
    for entry in data.get("activities-steps", []):
        value = int(entry.get("value", 0))
        if value > 0:
            results.append({
                "metric":      "steps",
                "value":       value,
                "unit":        "steps",
                "recorded_at": f"{entry['dateTime']}T00:00:00Z",
                "source":      "fitbit",
            })
    return results


def fetch_fitbit_heart_rate(connection, days: int = 7) -> list:
    """Fetch resting heart rate per day."""
    end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    url        = f"{FITBIT_API_BASE}/user/-/activities/heart/date/{start_date}/{end_date}.json"

    data    = _fitbit_get(connection, url)
    results = []
    for entry in data.get("activities-heart", []):
        resting_hr = entry.get("value", {}).get("restingHeartRate")
        if resting_hr:
            results.append({
                "metric":      "heart_rate",
                "value":       resting_hr,
                "unit":        "bpm",
                "recorded_at": f"{entry['dateTime']}T00:00:00Z",
                "source":      "fitbit",
            })
    return results


def fetch_fitbit_sleep(connection, days: int = 7) -> list:
    """Fetch sleep duration per night."""
    end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    url        = f"{FITBIT_API_BASE_1_2}/user/-/sleep/date/{start_date}/{end_date}.json"

    data    = _fitbit_get(connection, url)
    results = []
    for entry in data.get("sleep", []):
        if entry.get("isMainSleep") and entry.get("efficiency", 0) > 50:
            duration_ms = entry.get("duration", 0)
            hours       = round(duration_ms / (1000 * 60 * 60), 1)
            if hours > 0:
                results.append({
                    "metric":      "sleep_hours",
                    "value":       hours,
                    "unit":        "hrs",
                    "recorded_at": entry.get("startTime", "") + "Z",
                    "source":      "fitbit",
                })
    return results


def fetch_fitbit_calories(connection, days: int = 7) -> list:
    """Fetch daily calories burned."""
    end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    url        = f"{FITBIT_API_BASE}/user/-/activities/calories/date/{start_date}/{end_date}.json"

    data    = _fitbit_get(connection, url)
    results = []
    for entry in data.get("activities-calories", []):
        value = float(entry.get("value", 0))
        if value > 0:
            results.append({
                "metric":      "calories",
                "value":       round(value),
                "unit":        "kcal",
                "recorded_at": f"{entry['dateTime']}T00:00:00Z",
                "source":      "fitbit",
            })
    return results


def fetch_fitbit_weight(connection, days: int = 30) -> list:
    """Fetch weight log entries."""
    end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    url        = f"{FITBIT_API_BASE}/user/-/body/log/weight/date/{start_date}/{end_date}.json"

    data    = _fitbit_get(connection, url)
    results = []
    for entry in data.get("weight", []):
        results.append({
            "metric":      "weight",
            "value":       entry.get("weight", 0),
            "unit":        "kg",
            "recorded_at": f"{entry['date']}T{entry.get('time', '00:00:00')}Z",
            "source":      "fitbit",
        })
    return results


def fetch_fitbit_spo2(connection, days: int = 7) -> list:
    """Fetch blood oxygen saturation (SpO2) — Fitbit Sense/Versa 3+."""
    end_date   = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    url        = f"{FITBIT_API_BASE_1_2}/user/-/spo2/date/{start_date}/{end_date}.json"

    try:
        data    = _fitbit_get(connection, url)
        results = []
        for entry in data if isinstance(data, list) else []:
            avg_spo2 = entry.get("value", {}).get("avg")
            if avg_spo2:
                results.append({
                    "metric":      "oxygen_sat",
                    "value":       round(avg_spo2, 1),
                    "unit":        "%",
                    "recorded_at": f"{entry.get('dateTime', '')}T00:00:00Z",
                    "source":      "fitbit",
                })
        return results
    except Exception:
        return []   # SpO2 not available on all Fitbit models


def sync_all_fitbit(connection) -> int:
    """Sync all Fitbit metrics. Returns total readings synced."""
    from .models import WearableReading
    from django.utils.dateparse import parse_datetime

    total    = 0
    fetchers = [
        fetch_fitbit_steps,
        fetch_fitbit_heart_rate,
        fetch_fitbit_sleep,
        fetch_fitbit_calories,
        fetch_fitbit_weight,
        fetch_fitbit_spo2,
    ]

    for fetch_fn in fetchers:
        try:
            readings = fetch_fn(connection)
            for r in readings:
                recorded_at = parse_datetime(r["recorded_at"])
                if not recorded_at:
                    continue
                WearableReading.objects.get_or_create(
                    patient     = connection.user,
                    metric      = r["metric"],
                    recorded_at = recorded_at,
                    defaults={
                        "value":      r["value"],
                        "unit":       r.get("unit", ""),
                        "source":     "fitbit",
                        "connection": connection,
                    },
                )
                total += 1
        except Exception as exc:
            logger.error("Fitbit %s sync error: %s", fetch_fn.__name__, exc)

    connection.last_synced = timezone.now()
    connection.save(update_fields=["last_synced"])
    logger.info("Fitbit sync: %d readings for %s", total, connection.user.email)
    return total