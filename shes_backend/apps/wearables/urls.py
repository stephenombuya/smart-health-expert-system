from django.urls import path
from .views import (
    WearableConnectionListView,
    GoogleFitConnectView,
    GoogleFitCallbackView,
    FitbitConnectView,
    FitbitCallbackView,
    AppleHealthImportView,
    WearableSyncView,
    ManualWearableDataView,
    WearableDashboardView,
    WearableReadingListView,
    DisconnectWearableView,
)

urlpatterns = [
    path("connections/",              WearableConnectionListView.as_view(), name="wearable-connections"),
    path("google-fit/connect/",       GoogleFitConnectView.as_view(),       name="google-fit-connect"),
    path("google-fit/callback/",      GoogleFitCallbackView.as_view(),      name="google-fit-callback"),
    path("fitbit/connect/",           FitbitConnectView.as_view(),          name="fitbit-connect"),
    path("fitbit/callback/",          FitbitCallbackView.as_view(),         name="fitbit-callback"),
    path("apple-health/import/",      AppleHealthImportView.as_view(),      name="apple-health-import"),
    path("sync/",                     WearableSyncView.as_view(),           name="wearable-sync"),
    path("manual/",                   ManualWearableDataView.as_view(),     name="wearable-manual"),
    path("dashboard/",                WearableDashboardView.as_view(),      name="wearable-dashboard"),
    path("readings/",                 WearableReadingListView.as_view(),    name="wearable-readings"),
    path("disconnect/<str:provider>/",DisconnectWearableView.as_view(),     name="wearable-disconnect"),
]