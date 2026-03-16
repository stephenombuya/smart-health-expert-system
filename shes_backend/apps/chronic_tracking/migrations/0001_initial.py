"""
Initial migration – chronic_tracking app
"""
import django.core.validators
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
            name="GlucoseReading",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("value_mg_dl", models.FloatField(validators=[django.core.validators.MinValueValidator(20.0), django.core.validators.MaxValueValidator(800.0)])),
                ("context", models.CharField(choices=[("fasting", "Fasting (before meal)"), ("post_meal_1h", "1 Hour After Meal"), ("post_meal_2h", "2 Hours After Meal"), ("random", "Random"), ("bedtime", "Bedtime")], default="random", max_length=20)),
                ("hba1c", models.FloatField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(3.0), django.core.validators.MaxValueValidator(20.0)])),
                ("notes", models.TextField(blank=True)),
                ("recorded_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="glucose_readings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
        migrations.CreateModel(
            name="BloodPressureReading",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("systolic", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(60), django.core.validators.MaxValueValidator(300)])),
                ("diastolic", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(30), django.core.validators.MaxValueValidator(200)])),
                ("pulse", models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(30), django.core.validators.MaxValueValidator(250)])),
                ("notes", models.TextField(blank=True)),
                ("recorded_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bp_readings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
    ]
