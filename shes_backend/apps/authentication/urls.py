from django.urls import path
from .views import (
    RegisterView,
    UserProfileView,
    PatientProfileView,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    VerifyEmailView,
    ResendVerificationEmailView,
    NotificationListView,
    MarkNotificationsReadView,
    DoctorPatientListView,
    DoctorPatientSummaryView,
    HealthSummaryPDFView,
    GoogleSignInView,
)

urlpatterns = [
    # Account management
    path("register/",        RegisterView.as_view(),       name="register"),
    path("profile/",         UserProfileView.as_view(),    name="user-profile"),
    path("patient-profile/", PatientProfileView.as_view(), name="patient-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # Password reset
    path("password-reset/",          PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/",  PasswordResetConfirmView.as_view(), name="password-reset-confirm"),

    # Email verification
    path("verify-email/",          VerifyEmailView.as_view(),            name="verify-email"),
    path("resend-verification/",   ResendVerificationEmailView.as_view(), name="resend-verification"),

    # Google Sign-In
    path("google/", GoogleSignInView.as_view(), name="google-signin"),

    path("notifications/",            NotificationListView.as_view(),         name="notifications"),
    path("notifications/mark-read/",  MarkNotificationsReadView.as_view(),    name="notifications-mark-read"),
    path("doctor/patients/",          DoctorPatientListView.as_view(),        name="doctor-patients"),
    path("doctor/patients/<uuid:patient_id>/summary/", DoctorPatientSummaryView.as_view(), name="doctor-patient-summary"),
    path("export/pdf/", HealthSummaryPDFView.as_view(), name="export-pdf"),
]