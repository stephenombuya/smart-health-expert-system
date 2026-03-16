"""
Initial migration – medications app
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
            name="Medication",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200, unique=True)),
                ("generic_name", models.CharField(blank=True, max_length=200)),
                ("drug_class", models.CharField(blank=True, max_length=100)),
                ("common_uses", models.TextField(blank=True)),
                ("standard_dosage", models.CharField(blank=True, max_length=200)),
                ("contraindications", models.TextField(blank=True)),
                ("side_effects", models.TextField(blank=True)),
                ("is_keml_listed", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="DrugInteraction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("severity", models.CharField(choices=[("minor", "Minor – Monitor patient"), ("moderate", "Moderate – Use with caution"), ("major", "Major – Avoid combination"), ("contraindicated", "Contraindicated – Do not use together")], max_length=20)),
                ("description", models.TextField()),
                ("clinical_action", models.TextField(blank=True)),
                ("drug_a", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="interactions_as_a", to="medications.medication")),
                ("drug_b", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="interactions_as_b", to="medications.medication")),
            ],
            options={"unique_together": {("drug_a", "drug_b")}},
        ),
        migrations.CreateModel(
            name="PatientMedication",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("dosage", models.CharField(max_length=100)),
                ("frequency", models.CharField(choices=[("once_daily", "Once Daily"), ("twice_daily", "Twice Daily"), ("three_times_daily", "Three Times Daily"), ("four_times_daily", "Four Times Daily"), ("as_needed", "As Needed (PRN)"), ("weekly", "Once Weekly")], max_length=30)),
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                ("prescribing_doctor", models.CharField(blank=True, max_length=200)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("medication", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="medications.medication")),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="medications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
