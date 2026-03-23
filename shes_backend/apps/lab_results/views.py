"""
SHES Lab Results – Views
"""
import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status, parsers
from rest_framework.views import APIView  
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


class LabResultDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/UPDATE/DELETE /api/v1/lab/results/<pk>/"""
    serializer_class = LabResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LabResult.objects.filter(patient=self.request.user)

    def update(self, request, *args, **kwargs):
        """Re-run the interpreter when raw results are updated."""
        from .interpreter import interpret_lab_results
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        raw = serializer.validated_data.get("raw_results", instance.raw_results)
        interpreted, summary = interpret_lab_results(raw)

        serializer.save(interpreted_results=interpreted, overall_summary=summary)
        return Response({"success": True, "data": serializer.data})

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


class LabReportOCRView(APIView):
    """
    POST /api/v1/lab/upload-report/
    Accepts a JPEG, PNG, or PDF lab report.
    Runs OCR, extracts test values, runs the interpreter,
    and returns a ready-to-save LabResult payload.

    The frontend then displays the extracted results for the
    patient to review and confirm before saving.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [parsers.MultiPartParser, parsers.FileUploadParser]

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"success": False, "error": "No file uploaded. Please attach a lab report image or PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 10MB)
        if file_obj.size > 10 * 1024 * 1024:
            return Response(
                {"success": False, "error": "File is too large. Maximum size is 10MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from .ocr import process_lab_report
            from .interpreter import interpret_lab_results

            file_bytes   = file_obj.read()
            content_type = file_obj.content_type or "image/jpeg"

            # Step 1: OCR — extract raw test values from the image/PDF
            raw_results = process_lab_report(file_bytes, content_type)

            # Step 2: Interpret — run through the existing lab interpreter
            interpreted, summary = interpret_lab_results(raw_results)

            return Response({
                "success": True,
                "message": f"{len(raw_results)} test(s) extracted from your report.",
                "data": {
                    "raw_results":         raw_results,
                    "interpreted_results": interpreted,
                    "overall_summary":     summary,
                    "tests_found":         len(raw_results),
                },
            })

        except ValueError as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except ImportError as exc:
            logger.error("OCR dependency missing: %s", exc)
            return Response(
                {"success": False, "error": "OCR service is not available. Please enter values manually."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.error("OCR processing failed: %s", exc)
            return Response(
                {"success": False, "error": "Failed to process the report. Please try a clearer image or enter values manually."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )