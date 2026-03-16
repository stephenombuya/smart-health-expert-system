from django.contrib import admin
from .models import LabResult, LabTestReference


@admin.register(LabTestReference)
class LabTestReferenceAdmin(admin.ModelAdmin):
    list_display = ("test_name", "abbreviation", "unit", "normal_min", "normal_max")
    search_fields = ("test_name", "abbreviation")


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("patient", "lab_name", "test_date", "created_at")
    search_fields = ("patient__email", "lab_name")
    readonly_fields = ("interpreted_results", "overall_summary")
