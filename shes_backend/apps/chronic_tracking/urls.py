from django.urls import path
from .views import HealthGoalView
from .views import (
    GlucoseListCreateView, GlucoseDetailView,
    BPListCreateView, BPDetailView,
    ChronicSummaryView, HealthPredictionsView,
    HealthIntelligenceView, RiskSummaryView,
)

urlpatterns = [
    path("glucose/", GlucoseListCreateView.as_view(), name="glucose-list"),
    path("glucose/<uuid:pk>/", GlucoseDetailView.as_view(), name="glucose-detail"),
    path("blood-pressure/", BPListCreateView.as_view(), name="bp-list"),
    path("blood-pressure/<uuid:pk>/", BPDetailView.as_view(), name="bp-detail"),
    path("summary/", ChronicSummaryView.as_view(), name="chronic-summary"),
    path("goal/", HealthGoalView.as_view(), name="health-goal"),
    path("predictions/", HealthPredictionsView.as_view(), name="health-predictions"),
    path("intelligence/", HealthIntelligenceView.as_view(), name="health-intelligence"),
    path("risk/", RiskSummaryView.as_view(), name="risk-summary"),
]
