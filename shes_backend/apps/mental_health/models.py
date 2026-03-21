"""
SHES Mental Health – Models
Daily mood logging and evidence-based coping strategy delivery.
"""
import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class MoodEntry(models.Model):
    """
    A patient's daily mood log.
    Mood is rated 1–10 (1 = very distressed, 10 = excellent).
    """
    class MoodCategory(models.TextChoices):
        EXCELLENT = "excellent", "Excellent (9–10)"
        GOOD = "good", "Good (7–8)"
        NEUTRAL = "neutral", "Neutral (5–6)"
        LOW = "low", "Low (3–4)"
        DISTRESSED = "distressed", "Distressed (1–2)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mood_entries",
    )
    mood_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="1 (very distressed) to 10 (excellent)",
    )
    mood_category = models.CharField(
        max_length=20,
        choices=MoodCategory.choices,
        editable=False,
    )
    emotions = models.JSONField(
        default=list,
        help_text="List of emotion tags e.g. ['anxious', 'tired', 'hopeful']",
    )
    journal_note = models.TextField(
        blank=True,
        help_text="Optional private journal entry (encrypted at rest in production)",
    )
    triggers = models.TextField(blank=True, help_text="What may have caused this mood")
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]

    def save(self, *args, **kwargs):
        self.mood_category = self._compute_category(self.mood_score)
        super().save(*args, **kwargs)

    @staticmethod
    def _compute_category(score: int) -> str:
        if score >= 9:
            return MoodEntry.MoodCategory.EXCELLENT
        if score >= 7:
            return MoodEntry.MoodCategory.GOOD
        if score >= 5:
            return MoodEntry.MoodCategory.NEUTRAL
        if score >= 3:
            return MoodEntry.MoodCategory.LOW
        return MoodEntry.MoodCategory.DISTRESSED

    def __str__(self):
        return f"{self.patient.get_full_name()} – score {self.mood_score} ({self.mood_category})"


class CopingStrategy(models.Model):
    """
    Evidence-based coping strategies linked to mood categories.
    Seeded from the knowledge base.
    """
    class StrategyType(models.TextChoices):
        BREATHING = "breathing", "Breathing Exercise"
        COGNITIVE = "cognitive", "Cognitive Reframing"
        PHYSICAL = "physical", "Physical Activity"
        SOCIAL = "social", "Social Support"
        MINDFULNESS = "mindfulness", "Mindfulness / Meditation"
        JOURNALING = "journaling", "Journaling"
        PROFESSIONAL = "professional", "Professional Help"

    title = models.CharField(max_length=200)
    strategy_type = models.CharField(max_length=20, choices=StrategyType.choices)
    description = models.TextField()
    instructions = models.TextField(help_text="Step-by-step instructions in plain language")
    applicable_moods = models.JSONField(
        default=list,
        help_text="Mood categories this strategy is appropriate for",
    )
    duration_minutes = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Suggested time to spend on this strategy",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["strategy_type", "title"]

    def __str__(self):
        return f"{self.title} ({self.strategy_type})"

class StrategyEngagement(models.Model):
    """Records when a patient completes a coping strategy and rates it."""
    patient    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="strategy_engagements")
    strategy   = models.ForeignKey(CopingStrategy, on_delete=models.CASCADE, related_name="engagements")
    rating     = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Effectiveness 1–5")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at"]

    def __str__(self):
        return f"{self.patient.get_full_name()} — {self.strategy.title}"