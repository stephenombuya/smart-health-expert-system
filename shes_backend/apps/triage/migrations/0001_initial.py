"""
Initial migration – triage app
"""
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TriageSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("urgency_level", models.CharField(choices=[("emergency", "Emergency – Seek immediate care"), ("doctor_visit", "Doctor Visit – See a doctor within 24 hours"), ("self_care", "Self-Care – Manage at home"), ("undetermined", "Undetermined – Insufficient data")], default="undetermined", max_length=20)),
                ("recommendation", models.TextField(blank=True)),
                ("layman_explanation", models.TextField(blank=True)),
                ("red_flags_detected", models.JSONField(default=list)),
                ("matched_conditions", models.JSONField(default=list)),
                ("completed", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("patient", models.ForeignKey(limit_choices_to={"role": "patient"}, on_delete=django.db.models.deletion.CASCADE, related_name="triage_sessions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Symptom",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=200)),
                ("severity", models.PositiveSmallIntegerField(default=5)),
                ("duration_days", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("body_location", models.CharField(blank=True, max_length=100)),
                ("additional_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="symptoms", to="triage.triagesession")),
            ],
        ),
    ]
