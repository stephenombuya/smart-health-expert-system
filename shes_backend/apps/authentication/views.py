"""
SHES Authentication – Views
"""
import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_verification_email, send_password_reset_email
from .models import PatientProfile, User, EmailVerificationToken, PasswordResetToken
from .serializers import (
    SHESTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    PatientProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    EmailVerificationSerializer,
)

logger = logging.getLogger("apps.authentication")


class AuthRateThrottle(AnonRateThrottle):
    rate = "10/hour"
    scope = "auth"


class SHESTokenObtainPairView(TokenObtainPairView):
    """Login endpoint – returns access + refresh tokens."""
    serializer_class = SHESTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/
    Open endpoint for new user registration.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def perform_create(self, serializer):
        user = serializer.save()
        if user.is_patient:
            PatientProfile.objects.create(user=user)
        # Send verification email
        token_obj = EmailVerificationToken.create_for_user(user)
        send_verification_email(user, token_obj.token)
        logger.info("New user registered: %s (role=%s)", user.email, user.role)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return Response(
            {
                "success": True,
                "message": (
                    "Account created. "
                    "Please check your email to verify your account."
                ),
                "data": response.data,
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the provided refresh token so it cannot be reused.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info("User %s logged out.", request.user.pk)
            return Response({"success": True, "message": "Logged out successfully."})
        except KeyError:
            return Response(
                {"success": False, "error": "refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/v1/auth/profile/
    Returns and updates the authenticated user's own account information.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PatientProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/v1/auth/patient-profile/
    Medical profile for patient users only.
    """
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = PatientProfile.objects.get_or_create(user=self.request.user)
        return profile


class ChangePasswordView(generics.UpdateAPIView):
    """
    PUT /api/v1/auth/change-password/
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        logger.info("User %s changed their password.", request.user.pk)
        return Response({"success": True, "message": "Password updated successfully."})

# ─── Password Reset ───────────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """
    POST /api/v1/auth/password-reset/
    Always returns 200 to prevent user enumeration.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email, is_active=True)
            token_obj = PasswordResetToken.create_for_user(user)
            send_password_reset_email(user, token_obj.token)
            logger.info("Password reset requested for %s", email)
        except User.DoesNotExist:
            logger.info("Password reset for unknown email: %s", email)

        return Response(
            {
                "success": True,
                "message": (
                    "If an account with that email exists, "
                    "a password reset link has been sent."
                ),
            }
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/v1/auth/password-reset/confirm/
    Body: { "token": "...", "new_password": "..." }
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_token = serializer._reset_token
        user = reset_token.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        reset_token.used = True
        reset_token.save(update_fields=["used"])

        logger.info("Password reset completed for user %s", user.pk)
        return Response(
            {
                "success": True,
                "message": "Password reset successful. You can now log in.",
            }
        )


# ─── Email Verification ───────────────────────────────────────────────────────

class VerifyEmailView(APIView):
    """
    POST /api/v1/auth/verify-email/
    Body: { "token": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        verify_token = serializer._verify_token
        user = verify_token.user

        if user.is_email_verified:
            return Response({"success": True, "message": "Email already verified."})

        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        verify_token.delete()

        logger.info("Email verified for user %s", user.pk)
        return Response(
            {"success": True, "message": "Email verified. Welcome to SHES!"}
        )


class ResendVerificationEmailView(APIView):
    """
    POST /api/v1/auth/resend-verification/
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({"success": True, "message": "Email is already verified."})
        token_obj = EmailVerificationToken.create_for_user(user)
        sent = send_verification_email(user, token_obj.token)
        if sent:
            return Response({"success": True, "message": "Verification email sent."})
        return Response(
            {"success": False, "error": "Failed to send email. Try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )