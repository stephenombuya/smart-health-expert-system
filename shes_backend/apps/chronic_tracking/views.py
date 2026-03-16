"""
SHES Chronic Tracking – Views
"""
import logging
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BloodPressureReading, GlucoseReading
from .serializers import BloodPressureReadingSerializer, GlucoseReadingSerializer

logger = logging.getLogger("apps.chronic_tracking")


class GlucoseListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/chronic/glucose/"""
    serializer_class = GlucoseReadingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["context"]
    ordering_fields = ["recorded_at", "value_mg_dl"]

    def get_queryset(self):
        return GlucoseReading.objects.filter(patient=self.request.user)

    def perform_create(self, serializer):
        reading = serializer.save(patient=self.request.user)
        logger.info("Glucose reading %s logged for user %s", reading.pk, self.request.user.pk)


class GlucoseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/chronic/glucose/<pk>/"""
    serializer_class = GlucoseReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GlucoseReading.objects.filter(patient=self.request.user)


class BPListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/chronic/blood-pressure/"""
    serializer_class = BloodPressureReadingSerializer
    permission_classes = [IsAuthenticated]
    ordering_fields = ["recorded_at", "systolic"]

    def get_queryset(self):
        return BloodPressureReading.objects.filter(patient=self.request.user)

    def perform_create(self, serializer):
        reading = serializer.save(patient=self.request.user)
        logger.info("BP reading %s logged for user %s", reading.pk, self.request.user.pk)


class BPDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/chronic/blood-pressure/<pk>/"""
    serializer_class = BloodPressureReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BloodPressureReading.objects.filter(patient=self.request.user)


class ChronicSummaryView(APIView):
    """
    GET /api/v1/chronic/summary/
    Returns the last 7 days' average glucose and BP values for quick trend display.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Avg

        since = timezone.now() - timedelta(days=7)
        user = request.user

        glucose_qs = GlucoseReading.objects.filter(patient=user, recorded_at__gte=since)
        bp_qs = BloodPressureReading.objects.filter(patient=user, recorded_at__gte=since)

        glucose_avg = glucose_qs.aggregate(avg=Avg("value_mg_dl"))["avg"]
        bp_avg = bp_qs.aggregate(sys=Avg("systolic"), dia=Avg("diastolic"))

        latest_glucose = GlucoseReadingSerializer(glucose_qs.first()).data if glucose_qs.exists() else None
        latest_bp = BloodPressureReadingSerializer(bp_qs.first()).data if bp_qs.exists() else None

        return Response({
            "success": True,
            "period_days": 7,
            "glucose": {
                "count": glucose_qs.count(),
                "average_mg_dl": round(glucose_avg, 1) if glucose_avg else None,
                "latest": latest_glucose,
            },
            "blood_pressure": {
                "count": bp_qs.count(),
                "average_systolic": round(bp_avg["sys"], 1) if bp_avg["sys"] else None,
                "average_diastolic": round(bp_avg["dia"], 1) if bp_avg["dia"] else None,
                "latest": latest_bp,
            },
        })
