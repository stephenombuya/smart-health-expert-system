from django.core.management.base import BaseCommand
from apps.authentication.notifications import generate_health_alerts


class Command(BaseCommand):
    help = "Generate health alert notifications for patients with concerning trends."

    def handle(self, *args, **options):
        count = generate_health_alerts()
        self.stdout.write(self.style.SUCCESS(f"Generated {count} health alert(s)."))