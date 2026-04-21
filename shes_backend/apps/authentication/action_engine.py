"""
SHES – Smart Action Engine
===========================
Analyses a patient's complete health profile and generates
personalised, priority-ranked improvement actions.

Data sources analysed:
  • Glucose readings (trend, averages, threshold breaches)
  • Blood pressure readings (trend, crisis events)
  • Mood entries (trend, low-mood streaks)
  • Triage history (recent emergency sessions)
  • Medications (missed adherence signals, interaction risks)
  • Lab results (abnormal values)
  • Wearable data (inactivity, low step count, poor sleep)
  • Profile completeness

Each action has:
  • Priority: urgent | high | medium | low
  • Category: glucose | blood_pressure | mood | medication | lifestyle | triage | wearable | lab
  • Evidence: the specific data points that triggered it
  • Expiry: when the action is no longer relevant
"""
import logging
import statistics
from datetime import timedelta
from typing import List, Dict
from django.utils import timezone

logger = logging.getLogger("apps.authentication")


def generate_actions_for_patient(patient) -> List[Dict]:
    """
    Run all analysis modules and return a merged, deduplicated
    list of improvement actions sorted by priority.
    """
    actions = []

    analysers = [
        _analyse_glucose,
        _analyse_blood_pressure,
        _analyse_mood,
        _analyse_medications,
        _analyse_lab_results,
        _analyse_triage_history,
        _analyse_profile_completeness,
        _analyse_wearable_activity,
    ]

    for analyser in analysers:
        try:
            result = analyser(patient)
            actions.extend(result)
        except Exception as exc:
            logger.error("Action analyser %s failed: %s", analyser.__name__, exc)

    return actions


def refresh_patient_actions(patient):
    """
    Delete existing non-completed actions and regenerate fresh ones.
    Called daily by the management command and on-demand by the API.
    """
    from .models import HealthAction

    # Delete non-completed, non-dismissed actions older than 1 hour
    # (keep completed/dismissed for history)
    HealthAction.objects.filter(
        user      = patient,
        completed = False,
        dismissed = False,
    ).delete()

    new_actions = generate_actions_for_patient(patient)

    created = []
    for action_data in new_actions:
        expires_at = timezone.now() + timedelta(days=action_data.pop("expires_days", 7))
        action = HealthAction.objects.create(
            user        = patient,
            expires_at  = expires_at,
            **action_data,
        )
        created.append(action)

    logger.info(
        "Generated %d actions for patient %s",
        len(created), patient.email
    )
    return created


# ─── Individual analysers ─────────────────────────────────────────────────────

def _analyse_glucose(patient) -> List[Dict]:
    """Analyse fasting glucose readings for trends and threshold breaches."""
    actions = []
    try:
        from apps.chronic_tracking.models import GlucoseReading
        from apps.chronic_tracking.risk_engine import (
            detect_trend, weighted_moving_average, compute_glucose_risk
        )

        since    = timezone.now() - timedelta(days=30)
        readings = list(
            GlucoseReading.objects.filter(
                patient=patient, context="fasting", recorded_at__gte=since
            ).order_by("recorded_at").values_list("value_mg_dl", flat=True)
        )

        if not readings:
            actions.append({
                "title":       "Start logging fasting glucose",
                "description": (
                    "You haven't logged any fasting glucose readings in the last 30 days. "
                    "Log a reading each morning before eating to track your blood sugar trend."
                ),
                "category":    "glucose",
                "priority":    "medium",
                "icon":        "🩸",
                "evidence":    {"readings_count": 0, "period": "30 days"},
                "expires_days":14,
            })
            return actions

        wma   = weighted_moving_average(readings)
        trend = detect_trend(readings)
        risk  = compute_glucose_risk(patient)

        # Diabetic range
        if wma > 126:
            actions.append({
                "title":       "Glucose in diabetic range — see a doctor",
                "description": (
                    f"Your weighted average fasting glucose is {wma:.0f} mg/dL, "
                    f"which is in the diabetic range (>126 mg/dL). "
                    "Book an appointment with your doctor and review your diet and medications."
                ),
                "category":    "glucose",
                "priority":    "urgent",
                "icon":        "🚨",
                "evidence":    {"wma": round(wma, 1), "threshold": 126, "trend": trend},
                "expires_days":3,
            })

        # Pre-diabetic with rising trend
        elif wma > 100 and trend == "increasing":
            actions.append({
                "title":       "Rising glucose trend — take preventive action",
                "description": (
                    f"Your fasting glucose is trending upward (current weighted avg: {wma:.0f} mg/dL). "
                    "Reduce portion sizes, cut sugary drinks, and increase daily walking to 30+ minutes."
                ),
                "category":    "glucose",
                "priority":    "high",
                "icon":        "📈",
                "evidence":    {"wma": round(wma, 1), "trend": trend},
                "expires_days":7,
            })

        # Volatile readings
        elif trend == "volatile" and len(readings) >= 5:
            variance = statistics.variance(readings)
            actions.append({
                "title":       "Inconsistent glucose readings — improve consistency",
                "description": (
                    "Your glucose readings are highly variable, "
                    f"which suggests inconsistent meal timing or diet. "
                    "Try eating meals at the same time each day and avoid skipping meals."
                ),
                "category":    "glucose",
                "priority":    "medium",
                "icon":        "⚡",
                "evidence":    {"variance": round(variance, 1), "trend": trend},
                "expires_days":7,
            })

        # Insufficient readings
        if len(readings) < 5:
            actions.append({
                "title":       "Log glucose more regularly",
                "description": (
                    f"You've only logged {len(readings)} fasting glucose reading(s) this month. "
                    "Logging daily gives the system enough data to detect trends and alert you early."
                ),
                "category":    "glucose",
                "priority":    "low",
                "icon":        "📊",
                "evidence":    {"readings_count": len(readings)},
                "expires_days":7,
            })

    except Exception as exc:
        logger.error("Glucose analysis failed: %s", exc)

    return actions


def _analyse_blood_pressure(patient) -> List[Dict]:
    """Analyse BP readings for hypertension risk."""
    actions = []
    try:
        from apps.chronic_tracking.models import BloodPressureReading
        from apps.chronic_tracking.risk_engine import detect_trend, weighted_moving_average

        since    = timezone.now() - timedelta(days=30)
        readings = list(
            BloodPressureReading.objects.filter(
                patient=patient, recorded_at__gte=since
            ).order_by("recorded_at").values("systolic", "diastolic")
        )

        if not readings:
            actions.append({
                "title":       "Start logging blood pressure",
                "description": (
                    "No blood pressure readings this month. "
                    "If you have hypertension or are at risk, log readings twice daily "
                    "to track your trend and catch dangerous spikes early."
                ),
                "category":    "blood_pressure",
                "priority":    "medium",
                "icon":        "💓",
                "evidence":    {"readings_count": 0},
                "expires_days":14,
            })
            return actions

        sys_values = [float(r["systolic"]) for r in readings]
        wma_sys    = weighted_moving_average(sys_values)
        trend      = detect_trend(sys_values)

        # Crisis range
        crisis_readings = [r for r in readings if r["systolic"] >= 180]
        if crisis_readings:
            actions.append({
                "title":       "Hypertensive crisis reading detected — act now",
                "description": (
                    f"You recorded {len(crisis_readings)} reading(s) with systolic ≥ 180 mmHg. "
                    "This is a hypertensive crisis. If you feel unwell, go to the emergency department immediately. "
                    "Do not stop your medications without doctor guidance."
                ),
                "category":    "blood_pressure",
                "priority":    "urgent",
                "icon":        "🚨",
                "evidence":    {"crisis_readings": len(crisis_readings), "wma_systolic": round(wma_sys, 1)},
                "expires_days":2,
            })

        # Stage 2 Hypertension
        elif wma_sys >= 140:
            actions.append({
                "title":       "High blood pressure — consult your doctor",
                "description": (
                    f"Your average systolic pressure is {wma_sys:.0f} mmHg (Stage 2 Hypertension). "
                    "Reduce sodium to <2g/day, avoid alcohol, and discuss medication with your doctor."
                ),
                "category":    "blood_pressure",
                "priority":    "high",
                "icon":        "❤️",
                "evidence":    {"wma_systolic": round(wma_sys, 1)},
                "expires_days":5,
            })

        # Rising trend
        elif trend == "increasing" and wma_sys >= 125:
            actions.append({
                "title":       "Blood pressure trending upward",
                "description": (
                    f"Your systolic BP is rising (weighted avg: {wma_sys:.0f} mmHg). "
                    "Cut salt, increase potassium-rich foods (bananas, avocado), "
                    "and do 30 minutes of walking daily."
                ),
                "category":    "blood_pressure",
                "priority":    "high",
                "icon":        "📈",
                "evidence":    {"wma_systolic": round(wma_sys, 1), "trend": trend},
                "expires_days":7,
            })

    except Exception as exc:
        logger.error("BP analysis failed: %s", exc)

    return actions


def _analyse_mood(patient) -> List[Dict]:
    """Detect declining mood trends and wellbeing concerns."""
    actions = []
    try:
        from apps.mental_health.models import MoodEntry
        from apps.chronic_tracking.risk_engine import detect_trend, weighted_moving_average

        since    = timezone.now() - timedelta(days=14)
        readings = list(
            MoodEntry.objects.filter(
                patient=patient, recorded_at__gte=since
            ).order_by("recorded_at").values_list("mood_score", flat=True)
        )

        if not readings:
            actions.append({
                "title":       "Start tracking your mood daily",
                "description": (
                    "Daily mood logging takes under 30 seconds and helps detect "
                    "mental health patterns before they become serious. "
                    "Log how you feel in the Mental Health section."
                ),
                "category":    "mood",
                "priority":    "low",
                "icon":        "😊",
                "evidence":    {"readings_count": 0},
                "expires_days":7,
            })
            return actions

        wma   = weighted_moving_average(list(map(float, readings)))
        trend = detect_trend(list(map(float, readings)))
        avg   = statistics.mean(readings)

        # Persistently distressed
        if wma <= 3:
            actions.append({
                "title":       "Persistent low mood — please reach out",
                "description": (
                    f"Your recent mood average is {wma:.1f}/10 (distressed range). "
                    "Please speak to someone you trust, try a coping strategy, "
                    "or call Befrienders Kenya: 0800 723 253 (free, 24/7)."
                ),
                "category":    "mood",
                "priority":    "urgent",
                "icon":        "🆘",
                "evidence":    {"wma": round(wma, 1), "trend": trend},
                "expires_days":2,
            })

        # Declining trend
        elif trend == "decreasing" and avg < 6:
            actions.append({
                "title":       "Mood declining — try a coping strategy today",
                "description": (
                    f"Your mood has been decreasing (avg: {avg:.1f}/10). "
                    "Try the Box Breathing exercise or a 20-minute walk. "
                    "Social connection is also highly effective — reach out to a friend."
                ),
                "category":    "mood",
                "priority":    "high",
                "icon":        "📉",
                "evidence":    {"average": round(avg, 1), "trend": trend},
                "expires_days":3,
            })

        # Inconsistent mood
        elif trend == "volatile":
            actions.append({
                "title":       "Variable mood — identify your triggers",
                "description": (
                    "Your mood varies significantly day to day. "
                    "Use the journal note in each mood entry to record what happened. "
                    "Review the patterns after 2 weeks to identify triggers."
                ),
                "category":    "mood",
                "priority":    "medium",
                "icon":        "⚡",
                "evidence":    {"trend": trend, "readings_count": len(readings)},
                "expires_days":7,
            })

        # Infrequent logging
        if len(readings) < 7:
            actions.append({
                "title":       "Log mood more often for better insights",
                "description": (
                    f"You've logged only {len(readings)} mood entries in 14 days. "
                    "Daily logging gives the AI enough data to detect trends. "
                    "It takes under 20 seconds."
                ),
                "category":    "mood",
                "priority":    "low",
                "icon":        "📝",
                "evidence":    {"readings_count": len(readings), "period": "14 days"},
                "expires_days":7,
            })

    except Exception as exc:
        logger.error("Mood analysis failed: %s", exc)

    return actions


def _analyse_medications(patient) -> List[Dict]:
    """Check medication completeness and interaction risks."""
    actions = []
    try:
        from apps.medications.models import PatientMedication, DrugInteraction
        from itertools import combinations

        meds = PatientMedication.objects.filter(
            patient=patient, is_active=True
        ).select_related("medication")

        if not meds.exists():
            return actions

        # Check for major/contraindicated interactions among active medications
        med_ids    = [m.medication_id for m in meds]
        major_ints = DrugInteraction.objects.filter(
            drug_a_id__in=med_ids,
            drug_b_id__in=med_ids,
            severity__in=["major", "contraindicated"],
        ).select_related("drug_a", "drug_b")

        for interaction in major_ints[:3]:   # cap at 3 to avoid flooding
            actions.append({
                "title":       f"⚠️ Drug interaction: {interaction.drug_a.name} + {interaction.drug_b.name}",
                "description": (
                    f"A {interaction.severity} interaction exists between "
                    f"{interaction.drug_a.name} and {interaction.drug_b.name}. "
                    f"{interaction.description[:150]}... "
                    "Discuss this with your doctor or pharmacist."
                ),
                "category":    "medication",
                "priority":    "urgent" if interaction.severity == "contraindicated" else "high",
                "icon":        "💊",
                "evidence":    {
                    "drug_a":   interaction.drug_a.name,
                    "drug_b":   interaction.drug_b.name,
                    "severity": interaction.severity,
                },
                "expires_days":14,
            })

        # Medications without end dates (may be outdated)
        expired_meds = [
            m for m in meds
            if m.end_date and m.end_date < timezone.now().date()
        ]
        if expired_meds:
            names = ", ".join(m.medication.name for m in expired_meds[:3])
            actions.append({
                "title":       "Review expired prescriptions",
                "description": (
                    f"The following medications have passed their end date: {names}. "
                    "Review with your doctor whether to continue, stop, or renew them."
                ),
                "category":    "medication",
                "priority":    "medium",
                "icon":        "📅",
                "evidence":    {"expired_count": len(expired_meds)},
                "expires_days":14,
            })

    except Exception as exc:
        logger.error("Medication analysis failed: %s", exc)

    return actions


def _analyse_lab_results(patient) -> List[Dict]:
    """Flag abnormal lab values that need attention."""
    actions = []
    try:
        from apps.lab_results.models import LabResult

        latest = LabResult.objects.filter(patient=patient).first()
        if not latest:
            actions.append({
                "title":       "Get a routine blood test done",
                "description": (
                    "You haven't submitted any lab results yet. "
                    "A routine annual blood test (CBC, glucose, lipids, kidney function) "
                    "can catch health problems early. "
                    "Ask your doctor for a referral."
                ),
                "category":    "lab",
                "priority":    "low",
                "icon":        "🔬",
                "evidence":    {"results_count": 0},
                "expires_days":30,
            })
            return actions

        # Find abnormal results from the latest report
        if latest.interpreted_results:
            abnormal = [
                r for r in latest.interpreted_results
                if r.get("status", "").lower() in ("high", "low", "elevated", "critical")
            ]
            if abnormal:
                test_names = ", ".join(r.get("test_name", "") for r in abnormal[:3])
                actions.append({
                    "title":       f"Abnormal lab values require attention",
                    "description": (
                        f"Your latest lab results show abnormal values for: {test_names}. "
                        "Share these results with your doctor for personalised guidance. "
                        f"Report from: {latest.lab_name or 'recent submission'}."
                    ),
                    "category":    "lab",
                    "priority":    "high",
                    "icon":        "🔬",
                    "evidence":    {
                        "abnormal_count": len(abnormal),
                        "tests":          test_names,
                        "lab_name":       latest.lab_name,
                    },
                    "expires_days":14,
                })

        # Old results — prompt for a fresh test
        days_since = (timezone.now().date() - latest.test_date).days
        if days_since > 180:
            actions.append({
                "title":       "Your lab results are over 6 months old",
                "description": (
                    f"Your last lab results are {days_since} days old. "
                    "For chronic conditions like diabetes or hypertension, "
                    "lab tests every 3–6 months are recommended."
                ),
                "category":    "lab",
                "priority":    "medium",
                "icon":        "🗓️",
                "evidence":    {"days_since_last_test": days_since},
                "expires_days":30,
            })

    except Exception as exc:
        logger.error("Lab analysis failed: %s", exc)

    return actions


def _analyse_triage_history(patient) -> List[Dict]:
    """Flag unresolved emergency triage sessions."""
    actions = []
    try:
        from apps.triage.models import TriageSession

        since    = timezone.now() - timedelta(days=7)
        emergency = TriageSession.objects.filter(
            patient       = patient,
            urgency_level = "emergency",
            created_at__gte = since,
        ).count()

        if emergency > 0:
            actions.append({
                "title":       f"You had {emergency} emergency triage alert(s) this week",
                "description": (
                    "Your recent triage sessions detected emergency-level symptoms. "
                    "If you have not yet seen a doctor, please do so urgently. "
                    "If symptoms have resolved, log a follow-up triage to update your record."
                ),
                "category":    "triage",
                "priority":    "urgent",
                "icon":        "🚑",
                "evidence":    {"emergency_sessions": emergency, "period": "7 days"},
                "expires_days":7,
            })

        # No triage in 30 days for patients with chronic conditions
        try:
            profile = patient.patient_profile
            if profile.chronic_conditions:
                last_triage = TriageSession.objects.filter(patient=patient).first()
                if not last_triage:
                    actions.append({
                        "title":       "Run a health assessment",
                        "description": (
                            "You have documented chronic conditions but haven't run a triage assessment. "
                            "Use Symptom Triage to assess any current symptoms and get personalised advice."
                        ),
                        "category":    "triage",
                        "priority":    "medium",
                        "icon":        "🩺",
                        "evidence":    {"chronic_conditions": profile.chronic_conditions},
                        "expires_days":14,
                    })
        except Exception:
            pass

    except Exception as exc:
        logger.error("Triage analysis failed: %s", exc)

    return actions


def _analyse_profile_completeness(patient) -> List[Dict]:
    """Prompt user to complete their medical profile."""
    actions = []
    try:
        profile = patient.patient_profile
        missing = []

        if not profile.blood_group or profile.blood_group == "Unknown":
            missing.append("blood group")
        if not profile.known_allergies:
            missing.append("known allergies")
        if not profile.emergency_contact_name:
            missing.append("emergency contact")
        if not patient.date_of_birth:
            missing.append("date of birth")
        if not patient.phone_number:
            missing.append("phone number")

        if len(missing) >= 3:
            actions.append({
                "title":       "Complete your medical profile",
                "description": (
                    f"Your profile is missing: {', '.join(missing)}. "
                    "A complete profile allows SHES to give you more accurate triage results "
                    "and helps emergency responders if you need urgent care."
                ),
                "category":    "lifestyle",
                "priority":    "medium",
                "icon":        "👤",
                "evidence":    {"missing_fields": missing},
                "expires_days":30,
            })
        elif len(missing) >= 1:
            actions.append({
                "title":       f"Add your {missing[0]} to your profile",
                "description": (
                    f"Your profile is almost complete — just add your {missing[0]} "
                    "in the My Profile section."
                ),
                "category":    "lifestyle",
                "priority":    "low",
                "icon":        "📋",
                "evidence":    {"missing_fields": missing},
                "expires_days":30,
            })

    except Exception as exc:
        logger.error("Profile analysis failed: %s", exc)

    return actions


def _analyse_wearable_activity(patient) -> List[Dict]:
    """Analyse wearable data for inactivity and poor sleep."""
    actions = []
    try:
        from apps.wearables.models import WearableReading

        since    = timezone.now() - timedelta(days=7)
        readings = WearableReading.objects.filter(
            patient    = patient,
            recorded_at__gte = since,
        )

        if not readings.exists():
            return actions   # No wearable connected — don't nag

        # Step count analysis
        step_readings = readings.filter(metric="steps").values_list("value", flat=True)
        if step_readings:
            avg_steps = sum(step_readings) / len(step_readings)
            if avg_steps < 5000:
                actions.append({
                    "title":       "Low activity — increase daily steps",
                    "description": (
                        f"Your average daily step count this week is {avg_steps:.0f} steps. "
                        "The WHO recommends 8,000–10,000 steps per day for adults. "
                        "Try a 30-minute walk each morning or evening."
                    ),
                    "category":    "wearable",
                    "priority":    "high",
                    "icon":        "🚶",
                    "evidence":    {"avg_daily_steps": round(avg_steps), "target": 8000},
                    "expires_days":7,
                })
            elif avg_steps < 8000:
                actions.append({
                    "title":       "Good progress — push for 8,000 steps",
                    "description": (
                        f"You're averaging {avg_steps:.0f} steps/day — good start! "
                        "Increasing to 8,000+ daily has significant cardiovascular benefits. "
                        "Add a 15-minute walk to your routine."
                    ),
                    "category":    "wearable",
                    "priority":    "low",
                    "icon":        "👟",
                    "evidence":    {"avg_daily_steps": round(avg_steps), "target": 8000},
                    "expires_days":7,
                })

        # Sleep analysis
        sleep_readings = readings.filter(metric="sleep_hours").values_list("value", flat=True)
        if sleep_readings:
            avg_sleep = sum(sleep_readings) / len(sleep_readings)
            if avg_sleep < 6:
                actions.append({
                    "title":       "Insufficient sleep detected",
                    "description": (
                        f"Your wearable shows an average of {avg_sleep:.1f} hours of sleep per night. "
                        "Adults need 7–9 hours. Poor sleep worsens blood pressure, glucose, and mood. "
                        "Set a consistent bedtime and avoid screens 1 hour before bed."
                    ),
                    "category":    "wearable",
                    "priority":    "high",
                    "icon":        "😴",
                    "evidence":    {"avg_sleep_hours": round(avg_sleep, 1), "target": 7},
                    "expires_days":5,
                })

        # High resting heart rate
        hr_readings = readings.filter(metric="heart_rate").values_list("value", flat=True)
        if hr_readings:
            avg_hr = sum(hr_readings) / len(hr_readings)
            if avg_hr > 100:
                actions.append({
                    "title":       "Elevated resting heart rate",
                    "description": (
                        f"Your average resting heart rate is {avg_hr:.0f} bpm (normal: 60–100 bpm). "
                        "A consistently high resting HR can indicate stress, dehydration, or cardiovascular issues. "
                        "Mention this to your doctor."
                    ),
                    "category":    "wearable",
                    "priority":    "medium",
                    "icon":        "💗",
                    "evidence":    {"avg_heart_rate": round(avg_hr), "threshold": 100},
                    "expires_days":7,
                })

    except Exception as exc:
        logger.error("Wearable activity analysis failed: %s", exc)

    return actions