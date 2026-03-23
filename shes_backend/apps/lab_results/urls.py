from django.urls import path
from .views import LabResultListCreateView, LabResultDetailView, LabReferenceListView
from .views import LabReportOCRView

urlpatterns = [
    path("results/", LabResultListCreateView.as_view(), name="lab-result-list"),
    path("results/<uuid:pk>/", LabResultDetailView.as_view(), name="lab-result-detail"),
    path("references/", LabReferenceListView.as_view(), name="lab-references"),
    path("upload-report/", LabReportOCRView.as_view(), name="lab-upload-report"),
]
