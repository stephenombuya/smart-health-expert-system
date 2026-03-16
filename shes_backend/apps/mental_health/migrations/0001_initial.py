"""
Initial migration – mental_health app
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
            name="CopingStrategy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("strategy_type", models.CharField(choices=[("breathing", "Breathing Exercise"), ("cognitive", "Cognitive Reframing"), ("physical", "Physical Activity"), ("social", "Social Support"), ("mindfulness", "Mindfulness / Meditation"), ("journaling", "Journaling"), ("professional", "Professional Help")], max_length=20)),
                ("description", models.TextField()),
                ("instructions", models.TextField()),
                ("applicable_moods", models.JSONField(default=list)),
                ("duration_minutes", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["strategy_type", "title"]},
        ),
        migrations.CreateModel(
            name="MoodEntry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("mood_score", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(10)])),
                ("mood_category", models.CharField(choices=[("excellent", "Excellent (9–10)"), ("good", "Good (7–8)"), ("neutral", "Neutral (5–6)"), ("low", "Low (3–4)"), ("distressed", "Distressed (1–2)")], editable=False, max_length=20)),
                ("emotions", models.JSONField(default=list)),
                ("journal_note", models.TextField(blank=True)),
                ("triggers", models.TextField(blank=True)),
                ("recorded_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="mood_entries", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
    ]
