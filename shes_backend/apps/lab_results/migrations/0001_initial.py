"""
Initial migration – lab_results app
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
            name="LabTestReference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("test_name", models.CharField(max_length=200, unique=True)),
                ("abbreviation", models.CharField(blank=True, max_length=50)),
                ("unit", models.CharField(max_length=50)),
                ("normal_min", models.FloatField(blank=True, null=True)),
                ("normal_max", models.FloatField(blank=True, null=True)),
                ("low_label", models.CharField(default="Below normal range", max_length=100)),
                ("normal_label", models.CharField(default="Within normal range", max_length=100)),
                ("high_label", models.CharField(default="Above normal range", max_length=100)),
                ("layman_description", models.TextField()),
                ("low_advice", models.TextField(blank=True)),
                ("high_advice", models.TextField(blank=True)),
            ],
            options={"ordering": ["test_name"]},
        ),
        migrations.CreateModel(
            name="LabResult",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("lab_name", models.CharField(blank=True, max_length=200)),
                ("test_date", models.DateField()),
                ("raw_results", models.JSONField()),
                ("interpreted_results", models.JSONField(default=list)),
                ("overall_summary", models.TextField(blank=True)),
                ("doctor_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lab_results", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-test_date"]},
        ),
    ]
