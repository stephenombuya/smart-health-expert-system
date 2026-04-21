"""
SHES Wearables – API Views
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone

from .models import WearableConnection, WearableReading
from .serializers import (
    WearableReadingSerializer,
    WearableConnectionSerializer,
    BulkWearableReadingSerializer,
)

logger = logging.getLogger("apps.wearables")


class WearableConnectionListView(generics.ListAPIView):
    """GET /api/v1/wearables/connections/ — list connected devices."""
    permission_classes = [IsAuthenticated]
    serializer_class   = WearableConnectionSerializer

    def get_queryset(self):
        return WearableConnection.objects.filter(
            user=self.request.user
        ).order_by('-created_at')



class GoogleFitConnectView(APIView):
    """
    GET  /api/v1/wearables/google-fit/connect/
    Returns the Google OAuth URL to connect Google Fit.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .google_fit import get_google_fit_auth_url
        redirect_uri = request.build_absolute_uri("/api/v1/wearables/google-fit/callback/")
        auth_url     = get_google_fit_auth_url(redirect_uri)
        return Response({"success": True, "auth_url": auth_url})


class GoogleFitCallbackView(APIView):
    """
    GET /api/v1/wearables/google-fit/callback/?code=...
    Handles the OAuth callback from Google.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response(
                {"success": False, "error": "No authorisation code received."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .google_fit import exchange_code_for_tokens
        redirect_uri = request.build_absolute_uri("/api/v1/wearables/google-fit/callback/")

        try:
            tokens = exchange_code_for_tokens(code, redirect_uri)
        except Exception as exc:
            return Response(
                {"success": False, "error": f"Token exchange failed: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection, _ = WearableConnection.objects.update_or_create(
            user     = request.user,
            provider = WearableConnection.Provider.GOOGLE_FIT,
            defaults={
                "access_token":  tokens.get("access_token", ""),
                "refresh_token": tokens.get("refresh_token", ""),
                "is_active":     True,
            },
        )

        # Trigger initial sync
        from .google_fit import sync_all_metrics
        count = sync_all_metrics(connection)

        return Response({
            "success": True,
            "message": f"Google Fit connected. {count} readings synced.",
            "synced":  count,
        })


class WearableSyncView(APIView):
    """POST /api/v1/wearables/sync/ — manually trigger a sync."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        connections = WearableConnection.objects.filter(
            user=request.user, is_active=True
        )

        if not connections.exists():
            return Response(
                {"success": False, "error": "No wearable device connected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_synced = 0
        for conn in connections:
            if conn.provider == WearableConnection.Provider.GOOGLE_FIT:
                from .google_fit import sync_all_metrics
                total_synced += sync_all_metrics(conn)

        # Refresh health actions with new data
        try:
            from apps.authentication.action_engine import refresh_patient_actions
            refresh_patient_actions(request.user)
        except Exception:
            pass

        return Response({
            "success":      True,
            "synced_count": total_synced,
            "message":      f"Synced {total_synced} readings.",
        })


class ManualWearableDataView(APIView):
    """
    POST /api/v1/wearables/manual/
    Accepts manually entered wearable data — for devices without API.
    Also used by mobile apps that read from Apple Health / Samsung Health.

    Body:
    {
      "readings": [
        {"metric": "steps",      "value": 8432, "recorded_at": "2025-01-15T00:00:00Z"},
        {"metric": "heart_rate", "value": 72,   "recorded_at": "2025-01-15T08:00:00Z"},
        {"metric": "sleep_hours","value": 7.5,  "recorded_at": "2025-01-15T06:00:00Z"},
        {"metric": "weight",     "value": 74.2, "recorded_at": "2025-01-15T07:00:00Z"}
      ],
      "source": "manual"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BulkWearableReadingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        readings_data = serializer.validated_data["readings"]
        source        = serializer.validated_data["source"]

        valid_metrics = [m.value for m in WearableReading.Metric]
        created       = 0
        errors        = []

        from django.utils.dateparse import parse_datetime

        for item in readings_data:
            metric      = item.get("metric", "")
            value       = item.get("value")
            recorded_at = item.get("recorded_at")

            if metric not in valid_metrics:
                errors.append(f"Unknown metric: {metric}")
                continue

            if value is None:
                errors.append(f"Missing value for metric: {metric}")
                continue

            try:
                dt = parse_datetime(str(recorded_at)) if recorded_at else timezone.now()
                WearableReading.objects.get_or_create(
                    patient     = request.user,
                    metric      = metric,
                    recorded_at = dt,
                    defaults={
                        "value":  float(value),
                        "unit":   item.get("unit", ""),
                        "source": source,
                    },
                )
                created += 1
            except Exception as exc:
                errors.append(str(exc))

        # Refresh health actions
        if created > 0:
            try:
                from apps.authentication.action_engine import refresh_patient_actions
                refresh_patient_actions(request.user)
            except Exception:
                pass

        return Response({
            "success": True,
            "created": created,
            "errors":  errors,
        }, status=status.HTTP_201_CREATED)


class WearableDashboardView(APIView):
    """
    GET /api/v1/wearables/dashboard/
    Returns a 7-day summary of all wearable metrics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        import statistics as stats

        since    = timezone.now() - timedelta(days=7)
        readings = WearableReading.objects.filter(
            patient=request.user,
            recorded_at__gte=since,
        ).order_by('recorded_at')

        if not readings.exists():
            return Response({
                "success":   True,
                "connected": False,
                "message":   "No wearable data found. Connect a device or log data manually.",
                "data":      {},
            })

        # Group by metric
        metrics = {}
        for reading in readings:
            m = reading.metric
            if m not in metrics:
                metrics[m] = []
            metrics[m].append(reading.value)

        summary = {}
        for metric, values in metrics.items():
            summary[metric] = {
                "average": round(stats.mean(values), 1),
                "min":     round(min(values), 1),
                "max":     round(max(values), 1),
                "latest":  round(values[-1], 1),
                "count":   len(values),
            }

        # Connections
        connections = WearableConnection.objects.filter(
            user=request.user, is_active=True
        ).values("provider", "last_synced")

        return Response({
            "success":     True,
            "connected":   True,
            "period_days": 7,
            "connections": list(connections),
            "summary":     summary,
        })


class WearableReadingListView(generics.ListAPIView):
    """GET /api/v1/wearables/readings/?metric=steps — list readings."""
    permission_classes = [IsAuthenticated]
    serializer_class   = WearableReadingSerializer

    def get_queryset(self):
        qs = WearableReading.objects.filter(
            patient=self.request.user
        ).order_by('-recorded_at')



class DisconnectWearableView(APIView):
    """DELETE /api/v1/wearables/disconnect/<provider>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, provider):
        try:
            conn = WearableConnection.objects.get(
                user=request.user, provider=provider
            )
            conn.is_active = False
            conn.save(update_fields=["is_active"])
            return Response({"success": True, "message": f"{provider} disconnected."})
        except WearableConnection.DoesNotExist:
            return Response(
                {"error": "Connection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )