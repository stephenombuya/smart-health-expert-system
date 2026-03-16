from django.contrib import admin
from .models import MoodEntry, CopingStrategy


@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ("patient", "mood_score", "mood_category", "recorded_at")
    list_filter = ("mood_category",)
    search_fields = ("patient__email",)
    # journal_note deliberately excluded from list_display to protect privacy


@admin.register(CopingStrategy)
class CopingStrategyAdmin(admin.ModelAdmin):
    list_display = ("title", "strategy_type", "duration_minutes", "is_active")
    list_filter = ("strategy_type", "is_active")
    search_fields = ("title",)
