"""
SHES Triage – Views
"""
import os
import logging
from .nlp import extract_symptoms_from_text
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
        explain = engine.explain(result, engine_inputs)

        # Persist the session
        session = TriageSession.objects.create(
            patient             = request.user,
            urgency_level       = result.urgency_level,
            recommendation      = result.recommendation,
            layman_explanation  = result.layman_explanation,
            red_flags_detected  = result.red_flags_detected,
            matched_conditions  = result.matched_conditions,
            explanation         = explain,                 
            completed           = True,
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

class ExtractSymptomsView(APIView):
    """
    POST /api/v1/triage/extract-symptoms/
    Tries OpenAI GPT-4o-mini first, falls back to local spaCy/keyword NLP.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes   = [TriageRateThrottle]

    def post(self, request):
        text = request.data.get("text", "").strip()
        if not text:
            return Response(
                {"success": False, "error": "Please provide a symptom description."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method_used = "local_nlp"

        try:

            # ── Attempt OpenAI first ─────────────────────────────
            if os.getenv("OPENAI_API_KEY"):
                try:
                    symptoms    = extract_symptoms_from_text(text)
                    method_used = "openai_gpt4o_mini"

                except ValueError as exc:
                    # OpenAI understood input but rejected it (bad format, etc.)
                    return Response(
                        {"success": False, "error": str(exc)},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    )

                except Exception as openai_exc:
                    logger.warning("OpenAI NLP failed, falling back: %s", openai_exc)
                    raise openai_exc  # trigger fallback

            else:
                raise ValueError("No OpenAI API key configured")

        except Exception as openai_exc:
            # ── Fallback to local NLP ───────────────────────────
            logger.info("Falling back to local NLP: %s", openai_exc)

            try:
                from .nlp_local import extract_symptoms_spacy
                symptoms    = extract_symptoms_spacy(text)
                method_used = "local_spacy"

            except ValueError as exc:
                return Response(
                    {"success": False, "error": str(exc)},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            except ImportError as exc:
                logger.error("spaCy dependency missing: %s", exc)
                return Response(
                    {"success": False, "error": "Local NLP service is not available."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            except Exception as exc:
                logger.error("Local NLP failed: %s", exc)
                return Response(
                    {
                        "success": False,
                        "error": "Symptom extraction failed. Please enter symptoms manually."
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if not symptoms:
            return Response(
                {
                    "success": False,
                    "error": "We couldn't detect any symptoms. Please be more specific."
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        

        # ── Final success response ─────────────────────────────
        return Response({
            "success":     True,
            "message":     f"{len(symptoms)} symptom(s) identified.",
            "symptoms":    symptoms,
            "method_used": method_used,
        })
