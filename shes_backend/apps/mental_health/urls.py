from django.urls import path
from .views import (
    MoodEntryListCreateView, MoodEntryDetailView,
    CopingStrategyListView, MoodSummaryView,
)

urlpatterns = [
    path("mood/", MoodEntryListCreateView.as_view(), name="mood-list"),
    path("mood/<uuid:pk>/", MoodEntryDetailView.as_view(), name="mood-detail"),
    path("coping-strategies/", CopingStrategyListView.as_view(), name="coping-strategies"),
    path("summary/", MoodSummaryView.as_view(), name="mood-summary"),
]
