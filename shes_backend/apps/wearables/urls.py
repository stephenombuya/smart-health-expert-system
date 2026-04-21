from django.urls import path
from .views import (
    WearableConnectionListView,
    GoogleFitConnectView,
    GoogleFitCallbackView,
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
    path("sync/",                     WearableSyncView.as_view(),           name="wearable-sync"),
    path("manual/",                   ManualWearableDataView.as_view(),     name="wearable-manual"),
    path("dashboard/",                WearableDashboardView.as_view(),      name="wearable-dashboard"),
    path("readings/",                 WearableReadingListView.as_view(),    name="wearable-readings"),
    path("disconnect/<str:provider>/",DisconnectWearableView.as_view(),     name="wearable-disconnect"),
]