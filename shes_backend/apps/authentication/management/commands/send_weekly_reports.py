"""
python manage.py send_weekly_reports
Run every Sunday at 08:00 EAT via cron or Task Scheduler.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import statistics


class Command(BaseCommand):
    help = "Send weekly health report emails to all active patients."

    def handle(self, *args, **options):
        from apps.authentication.models import User
        from apps.authentication.emails import send_weekly_health_report_email
        from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
        from apps.mental_health.models import MoodEntry
        from apps.triage.models import TriageSession
        from apps.authentication.models import HealthAction
        from django.db.models import Avg

        patients = User.objects.filter(role="patient", is_active=True, is_email_verified=True)
        since    = timezone.now() - timedelta(days=7)
        week_label = timezone.now().strftime("Week of %d %B %Y")

        sent  = 0
        errors = 0

        for patient in patients:
            try:
                avg_glucose = GlucoseReading.objects.filter(
                    patient=patient, context="fasting", recorded_at__gte=since
                ).aggregate(avg=Avg("value_mg_dl"))["avg"]

                avg_bp = BloodPressureReading.objects.filter(
                    patient=patient, recorded_at__gte=since
                ).aggregate(sys=Avg("systolic"), dia=Avg("diastolic"))

                avg_mood = MoodEntry.objects.filter(
                    patient=patient, recorded_at__gte=since
                ).aggregate(avg=Avg("mood_score"))["avg"]

                triage_count = TriageSession.objects.filter(
                    patient=patient, created_at__gte=since
                ).count()

                actions_completed = HealthAction.objects.filter(
                    user=patient, completed=True,
                    updated_at__gte=since,
                ).count()

                top_action_obj = HealthAction.objects.filter(
                    user=patient, completed=False, dismissed=False
                ).first()
                top_action = top_action_obj.description[:200] if top_action_obj else ""

                report_data = {
                    "avg_glucose":        round(avg_glucose, 1) if avg_glucose else None,
                    "avg_systolic":       round(avg_bp["sys"], 1) if avg_bp["sys"] else None,
                    "avg_diastolic":      round(avg_bp["dia"], 1) if avg_bp["dia"] else None,
                    "avg_mood":           round(avg_mood, 1) if avg_mood else None,
                    "triage_count":       triage_count,
                    "actions_completed":  actions_completed,
                    "top_action":         top_action,
                    "week_label":         week_label,
                }

                success = send_weekly_health_report_email(patient, report_data)
                if success:
                    sent += 1
                    self.stdout.write(f"  ✓ {patient.email}")
                else:
                    errors += 1
                    self.stdout.write(self.style.WARNING(f"  ✗ {patient.email} — send failed"))

            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f"  ✗ {patient.email}: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(f"\nDone. {sent} reports sent, {errors} errors.")
        )