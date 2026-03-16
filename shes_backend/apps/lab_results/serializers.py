"""
SHES Lab Results – Serializers
"""
from rest_framework import serializers
from .models import LabResult, LabTestReference


class RawResultItemSerializer(serializers.Serializer):
    test_name = serializers.CharField(max_length=200)
    value = serializers.CharField(max_length=50)
    unit = serializers.CharField(max_length=50, required=False, default="")


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = [
            "id", "lab_name", "test_date", "raw_results",
            "interpreted_results", "overall_summary",
            "doctor_notes", "created_at",
        ]
        read_only_fields = ["id", "interpreted_results", "overall_summary", "created_at"]

    def validate_raw_results(self, value):
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("raw_results must be a non-empty list.")
        if len(value) > 50:
            raise serializers.ValidationError("Maximum 50 results per submission.")
        item_ser = RawResultItemSerializer(data=value, many=True)
        item_ser.is_valid(raise_exception=True)
        return value


class LabTestReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestReference
        fields = [
            "id", "test_name", "abbreviation", "unit",
            "normal_min", "normal_max", "layman_description",
        ]
