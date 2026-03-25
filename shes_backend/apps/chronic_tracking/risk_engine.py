"""
SHES – Smart Risk Prediction Engine
=====================================
Analyses patient health data using moving averages and trend detection
to compute risk levels without requiring ML libraries.

Risk Levels: LOW | RISING | HIGH
Trend Labels: increasing | decreasing | stable | volatile
"""
import statistics
import logging
from typing import List, Dict, Optional
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger("apps.chronic_tracking")


# ─── Thresholds (Kenya MOH / WHO) ─────────────────────────────────────────────

GLUCOSE_THRESHOLDS = {
    "normal_max":    5.6,    # mmol/L fasting
    "prediabetic":   7.0,
    "diabetic":      7.0,
    "high":          10.0,
    # mg/dL equivalents (÷ 18)
    "normal_max_mg": 100,
    "prediabetic_mg":126,
    "diabetic_mg":   126,
    "high_mg":       200,
}

BP_THRESHOLDS = {
    "normal":    120,
    "elevated":  130,
    "stage1":    140,
    "stage2":    160,
    "crisis":    180,
}

MOOD_THRESHOLDS = {
    "excellent": 9,
    "good":      7,
    "neutral":   5,
    "low":       4,
    "distressed":2,
}


# ─── Moving Average ────────────────────────────────────────────────────────────

def moving_average(values: List[float], window: int = 5) -> List[float]:
    """Calculate simple moving average over a sliding window."""
    if len(values) < window:
        return values
    return [
        sum(values[i:i+window]) / window
        for i in range(len(values) - window + 1)
    ]


def weighted_moving_average(values: List[float], window: int = 5) -> float:
    """
    Recent readings carry more weight.
    Most recent = weight n, oldest = weight 1.
    """
    if not values:
        return 0.0
    data = values[-window:]
    weights = list(range(1, len(data) + 1))
    return sum(v * w for v, w in zip(data, weights)) / sum(weights)


# ─── Trend Detection ───────────────────────────────────────────────────────────

def detect_trend(values: List[float], sensitivity: float = 0.05) -> str:
    """
    Detect the trend direction from a list of values.

    Returns: 'increasing' | 'decreasing' | 'stable' | 'volatile' | 'insufficient_data'
    """
    if len(values) < 3:
        return "insufficient_data"

    # Coefficient of variation — measures volatility
    mean = statistics.mean(values)
    if mean == 0:
        return "stable"

    stdev = statistics.stdev(values) if len(values) > 1 else 0
    cv = stdev / abs(mean)

    if cv > 0.3:
        return "volatile"

    # Linear regression slope via least squares
    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = mean
    numerator   = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return "stable"

    slope = numerator / denominator
    # Normalise slope relative to mean
    normalised_slope = slope / abs(mean) if mean != 0 else slope

    if normalised_slope > sensitivity:
        return "increasing"
    elif normalised_slope < -sensitivity:
        return "decreasing"
    else:
        return "stable"


# ─── Risk Level Computation ────────────────────────────────────────────────────

def compute_glucose_risk(patient) -> Dict:
    """
    Compute diabetes risk from the patient's glucose readings.

    Returns a risk dict with level, trend, insights, and recommendations.
    """
    from .models import GlucoseReading

    since    = timezone.now() - timedelta(days=30)
    readings = list(
        GlucoseReading.objects.filter(
            patient=patient,
            context="fasting",
            recorded_at__gte=since,
        ).order_by("recorded_at").values_list("value_mg_dl", flat=True)
    )

    if not readings:
        return {
            "risk_level":   "UNKNOWN",
            "trend":        "no_data",
            "current":      None,
            "average":      None,
            "wma":          None,
            "insights":     [],
            "actions":      ["Start logging fasting glucose readings to enable risk assessment."],
        }

    avg   = statistics.mean(readings)
    wma   = weighted_moving_average(readings)
    trend = detect_trend(readings)
    ma    = moving_average(readings)

    # Determine risk level
    if wma >= GLUCOSE_THRESHOLDS["diabetic_mg"]:
        risk_level = "HIGH"
    elif wma >= GLUCOSE_THRESHOLDS["prediabetic_mg"] or trend == "increasing":
        risk_level = "RISING"
    else:
        risk_level = "LOW"

    # Generate human-readable insights
    insights = _glucose_insights(readings, avg, wma, trend, ma)
    actions  = _glucose_actions(risk_level, wma, trend)

    return {
        "risk_level":         risk_level,
        "trend":              trend,
        "current":            round(readings[-1], 1),
        "average":            round(avg, 1),
        "weighted_average":   round(wma, 1),
        "moving_averages":    [round(v, 1) for v in ma[-7:]],
        "readings_analysed":  len(readings),
        "period_days":        30,
        "insights":           insights,
        "actions":            actions,
    }


def compute_bp_risk(patient) -> Dict:
    """Compute hypertension risk from blood pressure readings."""
    from .models import BloodPressureReading

    since    = timezone.now() - timedelta(days=30)
    readings = list(
        BloodPressureReading.objects.filter(
            patient=patient,
            recorded_at__gte=since,
        ).order_by("recorded_at").values_list("systolic", flat=True)
    )

    if not readings:
        return {
            "risk_level":   "UNKNOWN",
            "trend":        "no_data",
            "current":      None,
            "average":      None,
            "insights":     [],
            "actions":      ["Start logging blood pressure readings to enable risk assessment."],
        }

    avg     = statistics.mean(readings)
    wma     = weighted_moving_average(readings)
    trend   = detect_trend(readings)
    ma      = moving_average(readings)
    current = readings[-1]

    if wma >= BP_THRESHOLDS["crisis"] or current >= BP_THRESHOLDS["crisis"]:
        risk_level = "HIGH"
    elif wma >= BP_THRESHOLDS["stage1"] or trend == "increasing":
        risk_level = "RISING"
    else:
        risk_level = "LOW"

    insights = _bp_insights(readings, avg, wma, trend)
    actions  = _bp_actions(risk_level, wma, trend)

    return {
        "risk_level":         risk_level,
        "trend":              trend,
        "current":            int(current),
        "average":            round(avg, 1),
        "weighted_average":   round(wma, 1),
        "moving_averages":    [round(v, 1) for v in ma[-7:]],
        "readings_analysed":  len(readings),
        "period_days":        30,
        "insights":           insights,
        "actions":            actions,
    }


def compute_mood_risk(patient) -> Dict:
    """Compute mental health deterioration risk from mood entries."""
    from apps.mental_health.models import MoodEntry

    since    = timezone.now() - timedelta(days=14)
    readings = list(
        MoodEntry.objects.filter(
            patient=patient,
            recorded_at__gte=since,
        ).order_by("recorded_at").values_list("mood_score", flat=True)
    )

    if not readings:
        return {
            "risk_level":   "UNKNOWN",
            "trend":        "no_data",
            "current":      None,
            "average":      None,
            "insights":     [],
            "actions":      ["Start logging daily mood entries to enable mental health risk assessment."],
        }

    avg     = statistics.mean(readings)
    wma     = weighted_moving_average(readings)
    trend   = detect_trend(readings)
    current = readings[-1]

    if wma <= MOOD_THRESHOLDS["distressed"] or (trend == "decreasing" and avg <= MOOD_THRESHOLDS["low"]):
        risk_level = "HIGH"
    elif wma <= MOOD_THRESHOLDS["low"] or trend == "decreasing":
        risk_level = "RISING"
    else:
        risk_level = "LOW"

    insights = _mood_insights(readings, avg, wma, trend)
    actions  = _mood_actions(risk_level, wma, trend)

    return {
        "risk_level":         risk_level,
        "trend":              trend,
        "current":            int(current),
        "average":            round(avg, 1),
        "weighted_average":   round(wma, 1),
        "readings_analysed":  len(readings),
        "period_days":        14,
        "insights":           insights,
        "actions":            actions,
    }


# ─── Insight & Action Generators ──────────────────────────────────────────────

def _glucose_insights(readings, avg, wma, trend, ma) -> List[str]:
    insights = []
    if trend == "increasing":
        insights.append(
            f"Your fasting glucose has been increasing over the past {len(readings)} readings. "
            f"The weighted average ({wma:.0f} mg/dL) is higher than the simple average ({avg:.0f} mg/dL), "
            f"meaning recent readings are worse than older ones."
        )
    elif trend == "decreasing":
        insights.append(
            f"Your fasting glucose is trending downward — good progress! "
            f"The weighted average is {wma:.0f} mg/dL."
        )
    elif trend == "volatile":
        insights.append(
            f"Your glucose readings are highly variable. "
            f"Inconsistent diet, meal timing, or medication adherence may be contributing."
        )
    else:
        insights.append(f"Your fasting glucose is stable at an average of {avg:.0f} mg/dL.")

    if readings[-1] > GLUCOSE_THRESHOLDS["diabetic_mg"]:
        insights.append(
            f"Your most recent reading ({readings[-1]:.0f} mg/dL) is in the diabetic range (≥ 126 mg/dL). "
            f"This warrants immediate medical attention."
        )
    if len(readings) >= 5 and all(r > GLUCOSE_THRESHOLDS["prediabetic_mg"] for r in readings[-5:]):
        insights.append(
            "Your last 5 consecutive readings have been above the pre-diabetic threshold. "
            "This is a consistent pattern requiring medical review."
        )
    return insights


def _glucose_actions(risk_level, wma, trend) -> List[str]:
    if risk_level == "HIGH":
        return [
            "Book an appointment with your doctor as soon as possible.",
            "Review your diet — reduce refined carbohydrates, sugary drinks, and white rice.",
            "Ensure you are taking diabetes medications as prescribed.",
            "Log meals alongside readings to identify triggers.",
        ]
    elif risk_level == "RISING":
        return [
            "Your glucose is trending upward — take preventive action now.",
            "Increase physical activity to at least 30 minutes daily.",
            "Reduce portion sizes and increase dietary fibre (vegetables, legumes).",
            "Share this trend with your doctor at your next visit.",
        ]
    return [
        "Maintain current diet and exercise routine.",
        "Continue logging readings regularly to monitor trends.",
    ]


def _bp_insights(readings, avg, wma, trend) -> List[str]:
    insights = []
    if trend == "increasing":
        insights.append(
            f"Your systolic blood pressure has been increasing. "
            f"The weighted recent average is {wma:.0f} mmHg, "
            f"which gives more weight to your most recent readings."
        )
    elif trend == "decreasing":
        insights.append(f"Your blood pressure is trending downward. Weighted average: {wma:.0f} mmHg.")
    elif trend == "volatile":
        insights.append(
            "Your blood pressure shows high variability — "
            "try to measure at the same time each day and avoid caffeine/exercise beforehand."
        )
    else:
        insights.append(f"Your blood pressure is stable. Average systolic: {avg:.0f} mmHg.")

    crisis = sum(1 for r in readings[-7:] if r >= BP_THRESHOLDS["crisis"])
    if crisis > 0:
        insights.append(
            f"{crisis} of your last 7 readings were in the Hypertensive Crisis range (≥ 180 mmHg). "
            f"This requires immediate medical attention."
        )
    return insights


def _bp_actions(risk_level, wma, trend) -> List[str]:
    if risk_level == "HIGH":
        return [
            "Seek medical attention immediately if systolic is above 180 mmHg.",
            "Do not stop blood pressure medications without doctor guidance.",
            "Reduce sodium intake — target < 2g per day.",
            "Measure blood pressure twice daily and bring records to your doctor.",
        ]
    elif risk_level == "RISING":
        return [
            "Increase potassium-rich foods: bananas, potatoes, leafy greens.",
            "Limit alcohol to ≤ 1 unit/day.",
            "Practice stress management: deep breathing, regular sleep.",
            "Discuss medication adjustment with your doctor if trend continues.",
        ]
    return [
        "Maintain healthy diet (DASH diet) and regular exercise.",
        "Continue monitoring blood pressure regularly.",
    ]


def _mood_insights(readings, avg, wma, trend) -> List[str]:
    insights = []
    if trend == "decreasing":
        insights.append(
            f"Your mood has been declining over the past {len(readings)} entries. "
            f"The weighted recent average ({wma:.1f}/10) is lower than your overall average ({avg:.1f}/10)."
        )
    elif trend == "increasing":
        insights.append(f"Your mood has been improving. Weighted average: {wma:.1f}/10.")
    elif trend == "volatile":
        insights.append(
            "Your mood scores are highly variable, which can indicate emotional instability "
            "or significant life stressors. Regular journaling may help identify triggers."
        )
    else:
        insights.append(f"Your mood has been stable at an average of {avg:.1f}/10.")

    low_days = sum(1 for r in readings[-7:] if r <= MOOD_THRESHOLDS["low"])
    if low_days >= 3:
        insights.append(
            f"{low_days} of your last 7 mood entries were in the low range (≤ 4/10). "
            f"This may indicate depression or burnout. Please consider speaking to a counsellor."
        )
    return insights


def _mood_actions(risk_level, wma, trend) -> List[str]:
    if risk_level == "HIGH":
        return [
            "Please reach out to a trusted person or counsellor today.",
            "Contact Befrienders Kenya (0800 723 253) if you are in crisis.",
            "Try the 5-4-3-2-1 grounding exercise in the coping strategies section.",
            "Avoid isolation — social connection significantly improves mood.",
        ]
    elif risk_level == "RISING":
        return [
            "Try a 20-minute walk daily — exercise is proven to improve mood.",
            "Journal your thoughts and try to identify recurring triggers.",
            "Practice box breathing before sleep.",
            "Reach out to a trusted friend or family member.",
        ]
    return [
        "Continue daily mood logging to maintain awareness.",
        "Keep up with activities that bring you joy.",
    ]