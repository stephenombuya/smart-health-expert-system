"""
SHES Authentication – Views
"""
import logging
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, status, parsers
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

from apps.triage.models import TriageSession
from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
from apps.mental_health.models import MoodEntry
from django.db.models import Avg

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
    parser_classes     = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

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
    

# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """GET /api/v1/auth/notifications/ — list unread notifications."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import NotificationSerializer
        return NotificationSerializer

    def get_queryset(self):
        from .models import Notification
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        from .models import Notification
        qs = self.get_queryset()
        unread_count = qs.filter(read=False).count()
        serializer = self.get_serializer(qs, many=True)
        return Response({
            "unread_count": unread_count,
            "results": serializer.data,
        })


class MarkNotificationsReadView(APIView):
    """POST /api/v1/auth/notifications/mark-read/ — mark all as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import Notification
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"success": True, "message": "All notifications marked as read."})


# ─── Doctor Portal ─────────────────────────────────────────────────────────────


class DoctorPatientListView(generics.ListAPIView):
    """
    GET /api/v1/auth/doctor/patients/
    Returns all patients in the system.
    Accessible to doctors and admins only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("doctor", "admin"):
            return Response(
                {"error": "Only doctors can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )
        patients = User.objects.filter(
            role="patient", is_active=True
        ).order_by("first_name", "last_name")

        data = [
            {
                "patient_id":    str(p.pk),
                "patient_name":  p.get_full_name(),
                "patient_email": p.email,
                "county":        p.county,
                "created_at":    p.created_at.isoformat(),
            }
            for p in patients
        ]
        return Response({"results": data})


class DoctorPatientSummaryView(APIView):
    """
    GET /api/v1/auth/doctor/patients/<patient_id>/summary/
    Returns a 30-day health summary for any patient.
    Accessible to doctors and admins only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        if request.user.role not in ("doctor", "admin"):
            return Response(
                {"error": "Only doctors can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            patient = User.objects.get(pk=patient_id, role="patient", is_active=True)
        except User.DoesNotExist:
            return Response(
                {"error": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        since         = timezone.now() - timedelta(days=30)
        latest_triage = TriageSession.objects.filter(patient=patient).first()
        glucose_avg   = GlucoseReading.objects.filter(patient=patient, recorded_at__gte=since).aggregate(avg=Avg("value_mg_dl"))["avg"]
        bp_avg        = BloodPressureReading.objects.filter(patient=patient, recorded_at__gte=since).aggregate(sys=Avg("systolic"), dia=Avg("diastolic"))
        mood_avg      = MoodEntry.objects.filter(patient=patient, recorded_at__gte=since).aggregate(avg=Avg("mood_score"))["avg"]

        return Response({
            "patient": {
                "id":     str(patient.pk),
                "name":   patient.get_full_name(),
                "email":  patient.email,
                "county": patient.county,
            },
            "period_days":      30,
            "latest_triage": {
                "urgency_level": latest_triage.urgency_level if latest_triage else None,
                "date":          latest_triage.created_at.isoformat() if latest_triage else None,
            },
            "avg_glucose_mg_dl": round(glucose_avg, 1) if glucose_avg else None,
            "avg_systolic":      round(bp_avg["sys"], 1) if bp_avg["sys"] else None,
            "avg_diastolic":     round(bp_avg["dia"], 1) if bp_avg["dia"] else None,
            "avg_mood_score":    round(mood_avg, 1) if mood_avg else None,
        })



class HealthSummaryPDFView(APIView):
    """GET /api/v1/auth/export/pdf/ — download a PDF health summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .pdf_export import generate_patient_pdf
            return generate_patient_pdf(request.user)
        except Exception as exc:
            logger.error("PDF generation failed for user %s: %s", request.user.pk, exc)
            return Response(
                {"error": "PDF generation failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    