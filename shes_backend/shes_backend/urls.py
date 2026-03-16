"""
SHES Backend – Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

from apps.authentication.views import SHESTokenObtainPairView, LogoutView

urlpatterns = [
    # ── Admin ──────────────────────────────────────────────────────────────
    path("admin/", admin.site.urls),

    # ── Auth (JWT) ─────────────────────────────────────────────────────────
    path("api/v1/auth/login/", SHESTokenObtainPairView.as_view(), name="token_obtain"),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="logout"),

    # ── Application Modules ────────────────────────────────────────────────
    path("api/v1/auth/", include("apps.authentication.urls")),
    path("api/v1/triage/", include("apps.triage.urls")),
    path("api/v1/medications/", include("apps.medications.urls")),
    path("api/v1/chronic/", include("apps.chronic_tracking.urls")),
    path("api/v1/mental-health/", include("apps.mental_health.urls")),
    path("api/v1/lab/", include("apps.lab_results.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
