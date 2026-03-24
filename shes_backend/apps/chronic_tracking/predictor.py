"""
SHES – Predictive Health Alert Engine
Uses Facebook Prophet to forecast glucose and blood pressure trends.
Generates in-app notifications when values are predicted to exceed
safe thresholds within the next 7 days.
"""
import logging
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger("apps.chronic_tracking")


def forecast_glucose(patient) -> dict:
    """
    Forecast the next 7 days of fasting glucose readings for a patient.
    Returns a dict with forecast data and an alert if threshold exceeded.
    """
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError:
        raise ImportError("prophet and pandas are required. Run: pip install prophet")

    from .models import GlucoseReading

    # Need at least 10 readings for a meaningful forecast
    readings = (
        GlucoseReading.objects
        .filter(patient=patient, context="fasting")
        .order_by("recorded_at")
        .values("recorded_at", "value_mg_dl")
    )

    if len(readings) < 10:
        return {"status": "insufficient_data", "readings_needed": 10 - len(readings)}

    # Build Prophet dataframe
    df = pd.DataFrame([
        {"ds": r["recorded_at"].replace(tzinfo=None), "y": float(r["value_mg_dl"])}
        for r in readings
    ])

    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        changepoint_prior_scale=0.3,
        interval_width=0.8,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=7)
    forecast = model.predict(future)

    # Get next 7 days only
    last_date    = df["ds"].max()
    future_only  = forecast[forecast["ds"] > last_date].tail(7)

    predictions = [
        {
            "date":        row["ds"].strftime("%Y-%m-%d"),
            "predicted":   round(row["yhat"], 1),
            "lower":       round(row["yhat_lower"], 1),
            "upper":       round(row["yhat_upper"], 1),
        }
        for _, row in future_only.iterrows()
    ]

    # Check if any predicted value exceeds diabetic threshold (126 mg/dL)
    max_predicted = max(p["predicted"] for p in predictions) if predictions else 0
    alert = None
    if max_predicted > 126:
        alert = {
            "type":     "glucose_high",
            "message":  (
                f"Your fasting glucose is predicted to reach {max_predicted:.0f} mg/dL "
                f"within the next 7 days, which is in the diabetic range. "
                f"Please contact your doctor and review your diet."
            ),
            "threshold":      126,
            "max_predicted":  max_predicted,
        }
    elif max_predicted > 100:
        alert = {
            "type":     "glucose_elevated",
            "message":  (
                f"Your fasting glucose is trending upward and predicted to reach "
                f"{max_predicted:.0f} mg/dL. Consider reducing sugar and carbohydrate intake."
            ),
            "threshold":      100,
            "max_predicted":  max_predicted,
        }

    return {
        "status":      "success",
        "metric":      "fasting_glucose",
        "unit":        "mg/dL",
        "predictions": predictions,
        "alert":       alert,
    }


def forecast_blood_pressure(patient) -> dict:
    """
    Forecast the next 7 days of systolic blood pressure for a patient.
    """
    try:
        import pandas as pd
        from prophet import Prophet
    except ImportError:
        raise ImportError("prophet and pandas are required. Run: pip install prophet")

    from .models import BloodPressureReading

    readings = (
        BloodPressureReading.objects
        .filter(patient=patient)
        .order_by("recorded_at")
        .values("recorded_at", "systolic")
    )

    if len(readings) < 10:
        return {"status": "insufficient_data", "readings_needed": 10 - len(readings)}

    df = pd.DataFrame([
        {"ds": r["recorded_at"].replace(tzinfo=None), "y": float(r["systolic"])}
        for r in readings
    ])

    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        changepoint_prior_scale=0.3,
        interval_width=0.8,
    )
    model.fit(df)

    future   = model.make_future_dataframe(periods=7)
    forecast = model.predict(future)

    last_date   = df["ds"].max()
    future_only = forecast[forecast["ds"] > last_date].tail(7)

    predictions = [
        {
            "date":      row["ds"].strftime("%Y-%m-%d"),
            "predicted": round(row["yhat"], 1),
            "lower":     round(row["yhat_lower"], 1),
            "upper":     round(row["yhat_upper"], 1),
        }
        for _, row in future_only.iterrows()
    ]

    max_predicted = max(p["predicted"] for p in predictions) if predictions else 0
    alert = None
    if max_predicted >= 180:
        alert = {
            "type":    "bp_crisis",
            "message": (
                f"Your systolic blood pressure is predicted to reach {max_predicted:.0f} mmHg "
                f"within the next 7 days — this is in the Hypertensive Crisis range. "
                f"Please contact your doctor immediately."
            ),
            "threshold":     180,
            "max_predicted": max_predicted,
        }
    elif max_predicted >= 140:
        alert = {
            "type":    "bp_high",
            "message": (
                f"Your systolic blood pressure is predicted to reach {max_predicted:.0f} mmHg, "
                f"indicating Stage 2 Hypertension. Please review your medications with your doctor."
            ),
            "threshold":     140,
            "max_predicted": max_predicted,
        }
    elif max_predicted >= 130:
        alert = {
            "type":    "bp_elevated",
            "message": (
                f"Your blood pressure is trending upward and predicted to reach "
                f"{max_predicted:.0f} mmHg. Consider reducing salt intake and increasing exercise."
            ),
            "threshold":     130,
            "max_predicted": max_predicted,
        }

    return {
        "status":      "success",
        "metric":      "systolic_bp",
        "unit":        "mmHg",
        "predictions": predictions,
        "alert":       alert,
    }


def run_predictions_for_patient(patient) -> dict:
    """
    Run all predictions for a single patient and create notifications
    for any triggered alerts.
    Returns combined results.
    """
    from apps.authentication.notifications import create_notification

    results = {}

    # Glucose forecast
    try:
        glucose_result = forecast_glucose(patient)
        results["glucose"] = glucose_result
        if glucose_result.get("alert"):
            create_notification(
                user    = patient,
                title   = "Glucose Trend Alert",
                message = glucose_result["alert"]["message"],
                type    = "health_alert",
            )
    except Exception as exc:
        logger.error("Glucose forecast failed for user %s: %s", patient.pk, exc)
        results["glucose"] = {"status": "error", "error": str(exc)}

    # BP forecast
    try:
        bp_result = forecast_blood_pressure(patient)
        results["blood_pressure"] = bp_result
        if bp_result.get("alert"):
            create_notification(
                user    = patient,
                title   = "Blood Pressure Trend Alert",
                message = bp_result["alert"]["message"],
                type    = "health_alert",
            )
    except Exception as exc:
        logger.error("BP forecast failed for user %s: %s", patient.pk, exc)
        results["blood_pressure"] = {"status": "error", "error": str(exc)}

    return results
