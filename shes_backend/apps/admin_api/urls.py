"""
SHES Admin URL Config
"""

from django.urls import path
from .views import (
    AdminOverviewView,
    AdminUserListView, AdminUserDetailView, AdminUserReactivateView,
    AdminTriageListView,
    AdminMedicationListView, AdminMedicationDetailView,
    AdminStatsView,
    AdminAuditLogView,
)

urlpatterns = [
    path("overview/",                   AdminOverviewView.as_view()),
    path("users/",                      AdminUserListView.as_view()),
    path("users/<uuid:pk>/",            AdminUserDetailView.as_view()),
    path("users/<uuid:pk>/reactivate/", AdminUserReactivateView.as_view()),
    path("triage/",                     AdminTriageListView.as_view()),
    path("medications/",                AdminMedicationListView.as_view()),
    path("medications/<int:pk>/",       AdminMedicationDetailView.as_view()),
    path("stats/",                      AdminStatsView.as_view()),
    path("audit-log/",                  AdminAuditLogView.as_view()),
]