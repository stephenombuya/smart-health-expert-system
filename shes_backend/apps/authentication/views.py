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

from .models import PatientProfile
from .serializers import (
    SHESTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    PatientProfileSerializer,
    ChangePasswordSerializer,
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
        # Auto-create a patient profile for patient-role users
        if user.is_patient:
            PatientProfile.objects.create(user=user)
        logger.info("New user registered: %s (role=%s)", user.email, user.role)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return Response(
            {"success": True, "message": "Account created successfully.", "data": response.data},
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
