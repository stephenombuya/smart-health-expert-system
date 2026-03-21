"""
SHES Chronic Tracking – Serializers
"""
from rest_framework import serializers
from .models import GlucoseReading, BloodPressureReading
from shes_backend.mixins import SanitisedSerializerMixin

class GlucoseReadingSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
    interpretation = serializers.CharField(read_only=True)

    class Meta:
        model = GlucoseReading
        fields = ["id", "value_mg_dl", "context", "hba1c", "notes",
                  "recorded_at", "interpretation", "created_at"]
        read_only_fields = ["id", "created_at", "interpretation"]


class BloodPressureReadingSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
    classification = serializers.CharField(read_only=True)

    class Meta:
        model = BloodPressureReading
        fields = ["id", "systolic", "diastolic", "pulse", "notes",
                  "recorded_at", "classification", "created_at"]
        read_only_fields = ["id", "created_at", "classification"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs.get("diastolic", 0) >= attrs.get("systolic", 0):
            raise serializers.ValidationError(
                {"diastolic": "Diastolic must be less than systolic pressure."}
            )
        return attrs
    
class HealthGoalSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        from .models import HealthGoal
        model = HealthGoal
        fields = [
            "id",
            "target_fasting_glucose_min", "target_fasting_glucose_max",
            "target_systolic_max", "target_diastolic_max",
            "target_mood_score_min", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
