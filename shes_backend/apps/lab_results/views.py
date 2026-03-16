"""
SHES Lab Results – Views
"""
import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .interpreter import interpret_lab_results
from .models import LabResult, LabTestReference
from .serializers import LabResultSerializer, LabTestReferenceSerializer

logger = logging.getLogger("apps.lab_results")


class LabResultListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/lab/results/   – list all patient's past results
    POST /api/v1/lab/results/   – submit new result for interpretation
    """
    serializer_class = LabResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LabResult.objects.filter(patient=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw = serializer.validated_data["raw_results"]
        interpreted, summary = interpret_lab_results(raw)

        lab_result = serializer.save(
            patient=request.user,
            interpreted_results=interpreted,
            overall_summary=summary,
        )

        logger.info(
            "Lab result %s submitted for user %s – %d tests",
            lab_result.pk, request.user.pk, len(raw),
        )
        return Response(
            {"success": True, "data": LabResultSerializer(lab_result).data},
            status=status.HTTP_201_CREATED,
        )


class LabResultDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/v1/lab/results/<pk>/"""
    serializer_class = LabResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LabResult.objects.filter(patient=self.request.user)


class LabReferenceListView(generics.ListAPIView):
    """
    GET /api/v1/lab/references/
    Public catalogue of supported lab tests and their reference ranges.
    """
    serializer_class = LabTestReferenceSerializer
    permission_classes = [IsAuthenticated]
    queryset = LabTestReference.objects.all()
    filterset_fields = ["abbreviation"]
    search_fields = ["test_name", "abbreviation"]
