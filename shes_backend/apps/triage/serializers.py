"""
SHES Triage – Serializers
"""
from rest_framework import serializers
from .models import TriageSession, Symptom


class SymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symptom
        fields = ["id", "name", "severity", "duration_days", "body_location", "additional_notes", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_severity(self, value):
        if not 1 <= value <= 10:
            raise serializers.ValidationError("Severity must be between 1 and 10.")
        return value


class TriageSessionSerializer(serializers.ModelSerializer):
    symptoms = SymptomSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = TriageSession
        fields = [
            "id", "patient_name", "urgency_level", "recommendation",
            "layman_explanation", "red_flags_detected", "matched_conditions",
            "completed", "symptoms", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()


class StartTriageSerializer(serializers.Serializer):
    """
    Input: a list of symptom objects.
    The engine runs synchronously and returns a completed session.
    """
    symptoms = SymptomSerializer(many=True)

    def validate_symptoms(self, value):
        if not value:
            raise serializers.ValidationError("At least one symptom is required.")
        if len(value) > 20:
            raise serializers.ValidationError("Maximum 20 symptoms per session.")
        return value
