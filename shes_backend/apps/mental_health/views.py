"""
SHES Mental Health – Views
"""
import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CopingStrategy, MoodEntry
from .serializers import CopingStrategySerializer, MoodEntrySerializer

logger = logging.getLogger("apps.mental_health")


class MoodEntryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/mental-health/mood/     – list mood history
    POST /api/v1/mental-health/mood/     – log a new mood entry
    After creation, relevant coping strategies are returned inline.
    """
    serializer_class = MoodEntrySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["mood_category"]
    ordering_fields = ["recorded_at", "mood_score"]

    def get_queryset(self):
        return MoodEntry.objects.filter(patient=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(patient=request.user)

        # Fetch relevant coping strategies for the logged mood category
        strategies = CopingStrategy.objects.filter(
            applicable_moods__contains=entry.mood_category,
            is_active=True,
        )[:3]

        logger.info(
            "Mood entry logged for user %s – score %s (%s)",
            request.user.pk, entry.mood_score, entry.mood_category,
        )

        return Response(
            {
                "success": True,
                "data": serializer.data,
                "suggested_strategies": CopingStrategySerializer(strategies, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MoodEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/mental-health/mood/<pk>/"""
    serializer_class = MoodEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MoodEntry.objects.filter(patient=self.request.user)


class CopingStrategyListView(generics.ListAPIView):
    """
    GET /api/v1/mental-health/coping-strategies/
    Optional filter: ?mood_category=distressed
    """
    serializer_class = CopingStrategySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CopingStrategy.objects.filter(is_active=True)
        mood = self.request.query_params.get("mood_category")
        if mood:
            qs = qs.filter(applicable_moods__contains=mood)
        return qs


class MoodSummaryView(APIView):
    """
    GET /api/v1/mental-health/summary/
    Returns mood trend data for the last 14 days.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Avg, Count

        since = timezone.now() - timedelta(days=14)
        qs = MoodEntry.objects.filter(patient=request.user, recorded_at__gte=since)

        stats = qs.aggregate(avg=Avg("mood_score"), count=Count("id"))
        by_category = (
            qs.values("mood_category")
            .annotate(count=Count("id"))
            .order_by("mood_category")
        )

        avg_score = stats["avg"]
        concern = avg_score is not None and avg_score < 4

        return Response({
            "success": True,
            "period_days": 14,
            "entry_count": stats["count"],
            "average_mood_score": round(avg_score, 1) if avg_score else None,
            "wellbeing_concern": concern,
            "message": (
                "Your average mood has been low recently. We encourage you to speak "
                "with a healthcare professional or trusted person."
                if concern else
                "Keep tracking your mood – you're doing great!"
            ),
            "breakdown_by_category": list(by_category),
        })
