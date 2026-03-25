"""
SHES Transaction ID Service – API Views
"""
import time
import logging
from .models import TransactionRecord
from .service import issue_transaction_id
from .generator import SHESTransactionIDGenerator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status

logger = logging.getLogger("apps.transaction_ids")


class GenerateIDView(APIView):
    """
    POST /api/v1/ids/generate/
    Generate one or more transaction IDs.

    Body (optional):
    {
        "record_type": "lab_result",
        "count": 1,
        "reference_id": "optional-uuid"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):

        record_type  = request.data.get("record_type", TransactionRecord.RecordType.GENERIC)
        count        = min(int(request.data.get("count", 1)), 100)
        reference_id = request.data.get("reference_id", "")

        # Validate record type
        valid_types = [c.value for c in TransactionRecord.RecordType]
        if record_type not in valid_types:
            return Response(
                {"success": False, "error": f"Invalid record_type. Valid values: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = []
        for _ in range(count):
            internal_id, external_id = issue_transaction_id(
                record_type  = record_type,
                user         = request.user,
                reference_id = reference_id,
                persist      = True,
            )
            results.append({
                "internal_id": internal_id,
                "external_id": external_id,
            })

        return Response({
            "success": True,
            "count":   count,
            "ids":     results if count > 1 else results[0],
        }, status=status.HTTP_201_CREATED)


class DecodeIDView(APIView):
    """
    GET /api/v1/ids/decode/<internal_id>/
    Decode an internal ID into its components.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, internal_id: int):
        from .service import decode_transaction_id

        try:
            decoded = decode_transaction_id(internal_id)
            return Response({"success": True, "data": decoded})
        except Exception as exc:
            return Response(
                {"success": False, "error": f"Failed to decode ID: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LookupExternalIDView(APIView):
    """
    GET /api/v1/ids/lookup/<external_id>/
    Look up a transaction record by its SHES-XXXXX external ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, external_id: str):
        from .service import lookup_by_external

        record = lookup_by_external(external_id.upper())
        if not record:
            return Response(
                {"success": False, "error": "Transaction ID not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": record})


class IDServiceHealthView(APIView):
    """
    GET /api/v1/ids/health/
    Health check for the ID generation service.
    """
    permission_classes = []   # Public endpoint

    def get(self, request):
        from .generator import SHESTransactionIDGenerator
        from .models import TransactionRecord
        import time

        generator = SHESTransactionIDGenerator.get_instance()

        # Measure generation speed
        start = time.perf_counter()
        for _ in range(1000):
            generator.generate()
        elapsed    = time.perf_counter() - start
        ids_per_sec = int(1000 / elapsed)

        total_issued = TransactionRecord.objects.count()

        return Response({
            "status":          "healthy",
            "machine_id":      generator.machine_id,
            "ids_per_second":  ids_per_sec,
            "total_issued":    total_issued,
            "epoch_ms":        1704067200000,
            "epoch_date":      "2024-01-01T00:00:00Z",
        })


class BulkGenerateView(APIView):
    """
    POST /api/v1/ids/bulk/
    Generate up to 10,000 IDs in one request for batch operations.
    Admin only.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):

        count     = min(int(request.data.get("count", 100)), 10000)
        generator = SHESTransactionIDGenerator.get_instance()

        start  = time.perf_counter()
        result = [generator.generate() for _ in range(count)]
        elapsed_ms = (time.perf_counter() - start) * 1000

        return Response({
            "success":      True,
            "count":        count,
            "elapsed_ms":   round(elapsed_ms, 2),
            "ids_per_sec":  int(count / (elapsed_ms / 1000)) if elapsed_ms > 0 else 0,
            "ids": [
                {"internal_id": iid, "external_id": eid}
                for iid, eid in result
            ],
        })