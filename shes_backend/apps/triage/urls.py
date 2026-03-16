from django.urls import path
from .views import StartTriageView, TriageHistoryView, TriageSessionDetailView

urlpatterns = [
    path("start/", StartTriageView.as_view(), name="triage-start"),
    path("history/", TriageHistoryView.as_view(), name="triage-history"),
    path("<uuid:pk>/", TriageSessionDetailView.as_view(), name="triage-detail"),
]
