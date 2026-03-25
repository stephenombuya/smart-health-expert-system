"""
SHES – Trend Intelligence Layer
Converts raw health data into human-readable insight summaries.
"""
import statistics
from typing import List, Dict
from django.utils import timezone
from datetime import timedelta


def generate_glucose_insight(patient) -> Dict:
    from .models import GlucoseReading
    from .risk_engine import detect_trend, moving_average, weighted_moving_average

    since    = timezone.now() - timedelta(days=30)
    readings = list(
        GlucoseReading.objects.filter(
            patient=patient, context="fasting", recorded_at__gte=since
        ).order_by("recorded_at").values("recorded_at", "value_mg_dl")
    )

    if len(readings) < 3:
        return {
            "has_insight": False,
            "message":     f"Log at least 3 fasting glucose readings to see trend insights. You have {len(readings)} so far.",
        }

    values   = [float(r["value_mg_dl"]) for r in readings]
    trend    = detect_trend(values)
    avg      = statistics.mean(values)
    wma      = weighted_moving_average(values)
    variance = statistics.variance(values) if len(values) > 1 else 0

    trend_emoji   = {"increasing": "📈", "decreasing": "📉", "stable": "➡️", "volatile": "⚡"}.get(trend, "❓")
    trend_message = {
        "increasing": f"Your fasting glucose is rising. Weighted recent average: {wma:.0f} mg/dL. Consider reviewing your diet.",
        "decreasing": f"Your fasting glucose is improving. Weighted recent average: {wma:.0f} mg/dL. Keep up the good work.",
        "stable":     f"Your fasting glucose is stable at {avg:.0f} mg/dL. Consistency is key.",
        "volatile":   f"Your fasting glucose is erratic (variance: {variance:.0f}). Try consistent meal timing and logging.",
    }.get(trend, "Insufficient data for trend analysis.")

    return {
        "has_insight":        True,
        "trend":              trend,
        "trend_emoji":        trend_emoji,
        "message":            trend_message,
        "average":            round(avg, 1),
        "weighted_average":   round(wma, 1),
        "variance":           round(variance, 1),
        "data_points":        len(readings),
        "period_label":       "Last 30 days",
        "summary":            f"{trend_emoji} {trend.title()} — avg {avg:.0f} mg/dL over {len(readings)} readings",
    }


def generate_bp_insight(patient) -> Dict:
    from .models import BloodPressureReading
    from .risk_engine import detect_trend, weighted_moving_average

    since    = timezone.now() - timedelta(days=30)
    readings = list(
        BloodPressureReading.objects.filter(
            patient=patient, recorded_at__gte=since
        ).order_by("recorded_at").values("systolic", "diastolic")
    )

    if len(readings) < 3:
        return {
            "has_insight": False,
            "message":     f"Log at least 3 BP readings to see trend insights. You have {len(readings)} so far.",
        }

    sys_values = [float(r["systolic"]) for r in readings]
    dia_values = [float(r["diastolic"]) for r in readings]

    sys_trend = detect_trend(sys_values)
    sys_avg   = statistics.mean(sys_values)
    dia_avg   = statistics.mean(dia_values)
    sys_wma   = weighted_moving_average(sys_values)

    trend_emoji = {"increasing": "📈", "decreasing": "📉", "stable": "➡️", "volatile": "⚡"}.get(sys_trend, "❓")

    trend_message = {
        "increasing": f"Systolic BP is rising. Weighted recent average: {sys_wma:.0f} mmHg. Reduce salt intake.",
        "decreasing": f"Systolic BP is improving. Weighted average: {sys_wma:.0f} mmHg.",
        "stable":     f"Blood pressure is stable at {sys_avg:.0f}/{dia_avg:.0f} mmHg.",
        "volatile":   "Blood pressure readings are highly variable. Ensure consistent measurement conditions.",
    }.get(sys_trend, "Insufficient data.")

    return {
        "has_insight":      True,
        "trend":            sys_trend,
        "trend_emoji":      trend_emoji,
        "message":          trend_message,
        "avg_systolic":     round(sys_avg, 1),
        "avg_diastolic":    round(dia_avg, 1),
        "weighted_systolic":round(sys_wma, 1),
        "data_points":      len(readings),
        "period_label":     "Last 30 days",
        "summary":          f"{trend_emoji} {sys_trend.title()} — avg {sys_avg:.0f}/{dia_avg:.0f} mmHg",
    }


def generate_mood_insight(patient) -> Dict:
    from apps.mental_health.models import MoodEntry
    from .risk_engine import detect_trend, weighted_moving_average

    since    = timezone.now() - timedelta(days=14)
    readings = list(
        MoodEntry.objects.filter(
            patient=patient, recorded_at__gte=since
        ).order_by("recorded_at").values_list("mood_score", flat=True)
    )

    if len(readings) < 3:
        return {
            "has_insight": False,
            "message":     f"Log at least 3 mood entries to see trend insights.",
        }

    trend = detect_trend(list(map(float, readings)))
    avg   = statistics.mean(readings)
    wma   = weighted_moving_average(list(map(float, readings)))

    trend_emoji = {"increasing": "😊", "decreasing": "😔", "stable": "😐", "volatile": "😵"}.get(trend, "❓")

    trend_message = {
        "increasing": f"Your mood is improving. Recent weighted average: {wma:.1f}/10.",
        "decreasing": f"Your mood has been declining. Weighted average: {wma:.1f}/10. Consider using a coping strategy.",
        "stable":     f"Your mood has been consistent at {avg:.1f}/10.",
        "volatile":   "Your mood varies significantly day to day. Journaling triggers may help identify patterns.",
    }.get(trend, "Insufficient data.")

    return {
        "has_insight":      True,
        "trend":            trend,
        "trend_emoji":      trend_emoji,
        "message":          trend_message,
        "average":          round(avg, 1),
        "weighted_average": round(wma, 1),
        "data_points":      len(readings),
        "period_label":     "Last 14 days",
        "summary":          f"{trend_emoji} {trend.title()} — avg {avg:.1f}/10 over {len(readings)} entries",
    }


def generate_full_health_intelligence(patient) -> Dict:
    """Generate a comprehensive health intelligence report for a patient."""
    glucose_insight = generate_glucose_insight(patient)
    bp_insight      = generate_bp_insight(patient)
    mood_insight    = generate_mood_insight(patient)

    from .risk_engine import compute_glucose_risk, compute_bp_risk, compute_mood_risk
    glucose_risk = compute_glucose_risk(patient)
    bp_risk      = compute_bp_risk(patient)
    mood_risk    = compute_mood_risk(patient)

    # Overall system-level risk
    risk_scores = {"LOW": 1, "RISING": 2, "HIGH": 3, "UNKNOWN": 0}
    risks = [
        risk_scores.get(glucose_risk["risk_level"], 0),
        risk_scores.get(bp_risk["risk_level"], 0),
        risk_scores.get(mood_risk["risk_level"], 0),
    ]
    max_risk = max(risks)
    overall_risk = {3: "HIGH", 2: "RISING", 1: "LOW"}.get(max_risk, "UNKNOWN")

    return {
        "overall_risk":   overall_risk,
        "generated_at":   timezone.now().isoformat(),
        "glucose": {
            "insight": glucose_insight,
            "risk":    glucose_risk,
        },
        "blood_pressure": {
            "insight": bp_insight,
            "risk":    bp_risk,
        },
        "mood": {
            "insight": mood_insight,
            "risk":    mood_risk,
        },
    }