"""
SHES – Sanitised Serializer Mixin
Apply to any serializer that accepts user-supplied free-text input.
"""
import logging
from shes_backend.sanitisation import sanitise_value, SKIP_SANITISATION

logger = logging.getLogger("shes.sanitisation")


class SanitisedSerializerMixin:
    """
    Strips HTML from all string fields during DRF validation.
    Place BEFORE the serializer base class:

        class MySerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
    """

    def validate(self, attrs: dict) -> dict:
        sanitised = {}
        for field_name, value in attrs.items():
            if field_name in SKIP_SANITISATION:
                sanitised[field_name] = value
                continue
            sanitised[field_name] = sanitise_value(value, field_name)
        return super().validate(sanitised)