"""
SHES Mental Health – Serializers
"""
from rest_framework import serializers
from .models import CopingStrategy, MoodEntry


class MoodEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodEntry
        fields = [
            "id", "mood_score", "mood_category", "emotions",
            "journal_note", "triggers", "recorded_at", "created_at",
        ]
        read_only_fields = ["id", "mood_category", "created_at"]

    def validate_emotions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Emotions must be a list of strings.")
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 emotion tags allowed.")
        return [str(e).lower().strip() for e in value]


class CopingStrategySerializer(serializers.ModelSerializer):
    class Meta:
        model = CopingStrategy
        fields = [
            "id", "title", "strategy_type", "description",
            "instructions", "duration_minutes",
        ]
