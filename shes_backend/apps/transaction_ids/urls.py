from django.urls import path
from .views import (
    GenerateIDView,
    DecodeIDView,
    LookupExternalIDView,
    IDServiceHealthView,
    BulkGenerateView,
)

urlpatterns = [
    path("generate/",         GenerateIDView.as_view(),        name="id-generate"),
    path("bulk/",             BulkGenerateView.as_view(),      name="id-bulk"),
    path("decode/<int:internal_id>/", DecodeIDView.as_view(),  name="id-decode"),
    path("lookup/<str:external_id>/", LookupExternalIDView.as_view(), name="id-lookup"),
    path("health/",           IDServiceHealthView.as_view(),   name="id-health"),
]