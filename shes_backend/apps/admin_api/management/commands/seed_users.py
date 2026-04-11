from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from faker import Faker
import random

User = get_user_model()
fake = Faker()


class Command(BaseCommand):
    help = "Seed database with test users for SHES platform"

    def add_arguments(self, parser):
        parser.add_argument(
            "--total",
            type=int,
            default=100,
            help="Number of users to create"
        )

    def handle(self, *args, **options):
        total = options["total"]

        roles = ["Patient", "Doctor", "Nurse", "Admin"]

        self.stdout.write(self.style.WARNING(f"Seeding {total} users..."))

        created = 0

        for i in range(total):
            first = fake.first_name()
            last = fake.last_name()
            email = f"{first.lower()}.{last.lower()}{i}@shesapp.com"

            if User.objects.filter(email=email).exists():
                continue

            user = User.objects.create_user(
                email=email,
                password="Password@1234",
                first_name=first,
                last_name=last,
                role=random.choices(
                    roles,
                    weights=[70, 15, 10, 5],
                    k=1
                )[0],
            )

            # optional extras if your model supports them
            if hasattr(user, "is_active"):
                user.is_active = True
                user.save()

            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Done. Created {created} users.")
        )
