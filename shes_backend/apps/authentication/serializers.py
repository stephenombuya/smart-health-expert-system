"""
SHES Authentication – Serializers
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, PatientProfile


class SHESTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role and full name to the JWT payload for front-end convenience."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.get_full_name()
        return token


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Handles new user sign-up with password confirmation."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email", "first_name", "last_name", "role",
            "date_of_birth", "phone_number", "county",
            "password", "password_confirm",
        ]
        extra_kwargs = {"role": {"default": User.Role.PATIENT}}

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/update the authenticated user's own profile."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "date_of_birth", "phone_number", "county",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "email", "role", "is_active", "created_at"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = [
            "id", "blood_group", "known_allergies",
            "chronic_conditions", "emergency_contact_name",
            "emergency_contact_phone", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
