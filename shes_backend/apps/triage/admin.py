from django.contrib import admin
from .models import TriageSession, Symptom


class SymptomInline(admin.TabularInline):
    model = Symptom
    extra = 0
    readonly_fields = ("name", "severity", "duration_days", "body_location")


@admin.register(TriageSession)
class TriageSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "urgency_level", "completed", "created_at")
    list_filter = ("urgency_level", "completed")
    search_fields = ("patient__email",)
    readonly_fields = ("id", "patient", "urgency_level", "recommendation",
                       "layman_explanation", "red_flags_detected",
                       "matched_conditions", "created_at")
    inlines = [SymptomInline]
