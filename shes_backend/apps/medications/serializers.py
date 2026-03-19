"""
SHES Medications – Serializers
"""
from rest_framework import serializers
from .models import Medication, PatientMedication, DrugInteraction
from shes_backend.mixins import SanitisedSerializerMixin

class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ["id", "name", "generic_name", "drug_class", "common_uses",
                  "standard_dosage", "contraindications", "side_effects", "is_keml_listed"]


class PatientMedicationSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
    medication_name = serializers.CharField(source="medication.name", read_only=True)
    medication_id = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.all(), source="medication", write_only=True
    )

    class Meta:
        model = PatientMedication
        fields = [
            "id", "medication_id", "medication_name", "dosage", "frequency",
            "start_date", "end_date", "prescribing_doctor", "notes",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs


class DrugInteractionSerializer(serializers.ModelSerializer):
    drug_a_name = serializers.CharField(source="drug_a.name", read_only=True)
    drug_b_name = serializers.CharField(source="drug_b.name", read_only=True)

    class Meta:
        model = DrugInteraction
        fields = ["id", "drug_a_name", "drug_b_name", "severity", "description", "clinical_action"]


class InteractionCheckSerializer(serializers.Serializer):
    """Input: list of medication IDs to check for pairwise interactions."""
    medication_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=2,
        max_length=10,
    )
