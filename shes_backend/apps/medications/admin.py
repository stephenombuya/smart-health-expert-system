from django.contrib import admin
from .models import Medication, DrugInteraction, PatientMedication


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "generic_name", "drug_class", "is_keml_listed")
    list_filter = ("drug_class", "is_keml_listed")
    search_fields = ("name", "generic_name")


@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    list_display = ("drug_a", "drug_b", "severity")
    list_filter = ("severity",)


@admin.register(PatientMedication)
class PatientMedicationAdmin(admin.ModelAdmin):
    list_display = ("patient", "medication", "dosage", "frequency", "is_active")
    list_filter = ("is_active", "frequency")
    search_fields = ("patient__email", "medication__name")
