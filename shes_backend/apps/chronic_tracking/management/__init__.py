"""
Run with: python manage.py run_predictions
Designed to run daily via cron or Windows Task Scheduler.
"""
from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.chronic_tracking.predictor import run_predictions_for_patient


class Command(BaseCommand):
    help = "Run predictive health forecasts for all patients and generate alerts."

    def handle(self, *args, **options):
        patients = User.objects.filter(role="patient", is_active=True)
        total    = patients.count()
        alerts   = 0

        self.stdout.write(f"Running predictions for {total} patients...")

        for patient in patients:
            result = run_predictions_for_patient(patient)

            glucose_alert = result.get("glucose", {}).get("alert")
            bp_alert      = result.get("blood_pressure", {}).get("alert")

            if glucose_alert or bp_alert:
                alerts += 1
                self.stdout.write(
                    f"  ⚠ {patient.get_full_name()} — "
                    f"{'glucose alert ' if glucose_alert else ''}"
                    f"{'bp alert' if bp_alert else ''}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {alerts} patient(s) have trending alerts."
            )
        )