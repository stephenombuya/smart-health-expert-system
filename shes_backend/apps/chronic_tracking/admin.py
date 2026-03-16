from django.contrib import admin
from .models import GlucoseReading, BloodPressureReading


@admin.register(GlucoseReading)
class GlucoseReadingAdmin(admin.ModelAdmin):
    list_display = ("patient", "value_mg_dl", "context", "recorded_at")
    list_filter = ("context",)
    search_fields = ("patient__email",)
    ordering = ("-recorded_at",)


@admin.register(BloodPressureReading)
class BloodPressureReadingAdmin(admin.ModelAdmin):
    list_display = ("patient", "systolic", "diastolic", "pulse", "recorded_at")
    search_fields = ("patient__email",)
    ordering = ("-recorded_at",)
