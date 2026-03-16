from django.urls import path
from .views import (
    MedicationListView,
    PatientMedicationListCreateView,
    PatientMedicationDetailView,
    DrugInteractionCheckView,
)

urlpatterns = [
    path("list/", MedicationListView.as_view(), name="medication-list"),
    path("my/", PatientMedicationListCreateView.as_view(), name="my-medications"),
    path("my/<uuid:pk>/", PatientMedicationDetailView.as_view(), name="my-medication-detail"),
    path("interaction-check/", DrugInteractionCheckView.as_view(), name="interaction-check"),
]
