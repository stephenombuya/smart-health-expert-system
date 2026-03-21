"""
SHES Triage – Views
"""
import logging
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .inference_engine import InferenceEngine, SymptomInput
from .models import Symptom, TriageSession
from .serializers import StartTriageSerializer, TriageSessionSerializer

logger = logging.getLogger("apps.triage")


class TriageRateThrottle(UserRateThrottle):
    scope = "triage"


class StartTriageView(APIView):
    """
    POST /api/v1/triage/start/
    Accepts a list of symptoms, runs the inference engine, persists and
    returns a complete TriageSession.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [TriageRateThrottle]

    def post(self, request):
        serializer = StartTriageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        symptoms_data = serializer.validated_data["symptoms"]

        # Map serializer data → engine input objects
        engine_inputs = [
            SymptomInput(
                name=s["name"],
                severity=s.get("severity", 5),
                duration_days=s.get("duration_days", 1),
                body_location=s.get("body_location", ""),
            )
            for s in symptoms_data
        ]

        patient_profile = None
        try:
            profile = request.user.patient_profile
            patient_profile = {
                "chronic_conditions": profile.chronic_conditions,
                "known_allergies":    profile.known_allergies,
            }
        except Exception:
            pass
        
        # Run the inference engine
        engine = InferenceEngine()
        result = engine.evaluate(engine_inputs, patient_profile=patient_profile)

        # Persist the session
        session = TriageSession.objects.create(
            patient=request.user,
            urgency_level=result.urgency_level,
            recommendation=result.recommendation,
            layman_explanation=result.layman_explanation,
            red_flags_detected=result.red_flags_detected,
            matched_conditions=result.matched_conditions,
            completed=True,
        )

        # Persist individual symptoms
        Symptom.objects.bulk_create([
            Symptom(session=session, **s)
            for s in symptoms_data
        ])

        logger.info(
            "Triage session %s completed for user %s – urgency: %s",
            session.pk, request.user.pk, result.urgency_level,
        )

        output = TriageSessionSerializer(session)
        return Response({"success": True, "data": output.data}, status=status.HTTP_201_CREATED)


class TriageHistoryView(generics.ListAPIView):
    """
    GET /api/v1/triage/history/
    Returns the authenticated patient's past triage sessions, newest first.
    """
    serializer_class = TriageSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TriageSession.objects.filter(
            patient=self.request.user
        ).prefetch_related("symptoms")


class TriageSessionDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/triage/<pk>/
    Returns one session – patients can only view their own.
    """
    serializer_class = TriageSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TriageSession.objects.filter(patient=self.request.user).prefetch_related("symptoms")
