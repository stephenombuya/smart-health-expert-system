from django.urls import path
from .views import RegisterView, UserProfileView, PatientProfileView, ChangePasswordView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("patient-profile/", PatientProfileView.as_view(), name="patient-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
