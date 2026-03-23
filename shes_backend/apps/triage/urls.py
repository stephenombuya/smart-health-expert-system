from django.urls import path
from .views import StartTriageView, TriageHistoryView, TriageSessionDetailView
from .views import ExtractSymptomsView

urlpatterns = [
    path("start/", StartTriageView.as_view(), name="triage-start"),
    path("history/", TriageHistoryView.as_view(), name="triage-history"),
    path("<uuid:pk>/", TriageSessionDetailView.as_view(), name="triage-detail"),
    path("extract-symptoms/", ExtractSymptomsView.as_view(), name="triage-extract-symptoms"),
]
