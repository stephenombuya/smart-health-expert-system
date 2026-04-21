from rest_framework import serializers
from .models import WearableConnection, WearableReading


class WearableReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WearableReading
        fields = ["id", "metric", "value", "unit", "source", "recorded_at", "created_at"]
        read_only_fields = ["id", "created_at"]


class WearableConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WearableConnection
        fields = ["id", "provider", "is_active", "last_synced", "created_at"]
        read_only_fields = ["id", "created_at", "last_synced"]


class BulkWearableReadingSerializer(serializers.Serializer):
    """Accepts a batch of readings from a wearable sync."""
    readings = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=500,
    )
    source   = serializers.CharField(max_length=20, default="manual")