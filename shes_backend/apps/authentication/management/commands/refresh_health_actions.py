"""
python manage.py refresh_health_actions
Run daily via cron or Windows Task Scheduler.
"""
from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.authentication.action_engine import refresh_patient_actions


class Command(BaseCommand):
    help = "Regenerate personalised health actions for all active patients."

    def handle(self, *args, **options):
        patients = User.objects.filter(role="patient", is_active=True)
        total    = patients.count()
        self.stdout.write(f"Refreshing actions for {total} patients...")

        for patient in patients:
            try:
                actions = refresh_patient_actions(patient)
                self.stdout.write(f"  ✓ {patient.get_full_name()} — {len(actions)} actions")
            except Exception as exc:
                self.stdout.write(
                    self.style.WARNING(f"  ✗ {patient.email}: {exc}")
                )

        self.stdout.write(self.style.SUCCESS("Done."))