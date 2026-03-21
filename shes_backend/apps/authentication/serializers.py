"""
SHES Authentication – Serializers
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, PatientProfile

from shes_backend.mixins import SanitisedSerializerMixin


class SHESTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role and full name to the JWT payload for front-end convenience."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.get_full_name()
        return token


class UserRegistrationSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
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
        attrs = super().validate(attrs)
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
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
    


class PatientProfileSerializer(SanitisedSerializerMixin, serializers.ModelSerializer):
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
    
# ─── Password Reset ───────────────────────────────────────────────────────────

class PasswordResetRequestSerializer(serializers.Serializer):
    """Step 1: user supplies their email address."""
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Step 2: user supplies the token + new password."""
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])

    def validate_token(self, value):
        from .models import PasswordResetToken
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=value)
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired reset link.")
        if not reset_token.is_valid:
            raise serializers.ValidationError(
                "This reset link has expired or already been used."
            )
        self._reset_token = reset_token
        return value


class EmailVerificationSerializer(serializers.Serializer):
    """Accepts the token sent in the verification email."""
    token = serializers.CharField()

    def validate_token(self, value):
        from .models import EmailVerificationToken
        try:
            verify_token = EmailVerificationToken.objects.select_related("user").get(
                token=value
            )
        except EmailVerificationToken.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired verification link.")
        if verify_token.is_expired:
            raise serializers.ValidationError(
                "This verification link has expired. Please request a new one."
            )
        self._verify_token = verify_token
        return value
    

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import Notification
        model = Notification
        fields = ["id", "title", "message", "type", "read", "created_at"]
        read_only_fields = ["id", "created_at"]


class DoctorPatientSerializer(serializers.ModelSerializer):
    patient_name  = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_email = serializers.CharField(source="patient.email", read_only=True)
    patient_id    = serializers.UUIDField(source="patient.id", read_only=True)

    class Meta:
        from .models import DoctorPatientRelationship
        model = DoctorPatientRelationship
        fields = ["id", "patient_id", "patient_name", "patient_email", "created_at"]
        read_only_fields = fields
