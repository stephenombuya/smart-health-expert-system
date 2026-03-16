"""
SHES Medications – Views
"""
import logging
from itertools import combinations

from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DrugInteraction, Medication, PatientMedication
from .serializers import (
    DrugInteractionSerializer,
    InteractionCheckSerializer,
    MedicationSerializer,
    PatientMedicationSerializer,
)

logger = logging.getLogger("apps.medications")


class MedicationListView(generics.ListAPIView):
    """
    GET /api/v1/medications/list/?search=metformin
    Searchable master list of KEML medications.
    """
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Medication.objects.all()
    filterset_fields = ["drug_class", "is_keml_listed"]
    search_fields = ["name", "generic_name"]


class PatientMedicationListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/medications/my/     – list current patient's medications
    POST /api/v1/medications/my/     – add a new medication
    """
    serializer_class = PatientMedicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PatientMedication.objects.filter(
            patient=self.request.user
        ).select_related("medication")

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)
        logger.info("Medication added for user %s", self.request.user.pk)


class PatientMedicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/v1/medications/my/<pk>/
    """
    serializer_class = PatientMedicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PatientMedication.objects.filter(patient=self.request.user)


class DrugInteractionCheckView(APIView):
    """
    POST /api/v1/medications/interaction-check/
    Body: { "medication_ids": [1, 2, 3] }
    Returns all known interactions between the supplied medications.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InteractionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        med_ids = serializer.validated_data["medication_ids"]
        interactions = []

        # Check every pair
        for id_a, id_b in combinations(med_ids, 2):
            found = DrugInteraction.objects.filter(
                Q(drug_a_id=id_a, drug_b_id=id_b) | Q(drug_a_id=id_b, drug_b_id=id_a)
            ).select_related("drug_a", "drug_b")
            interactions.extend(found)

        if not interactions:
            return Response({
                "success": True,
                "interactions_found": 0,
                "message": "No known interactions found between the supplied medications.",
                "data": [],
            })

        data = DrugInteractionSerializer(interactions, many=True).data
        major_count = sum(1 for i in interactions if i.severity in ("major", "contraindicated"))

        return Response({
            "success": True,
            "interactions_found": len(interactions),
            "major_warnings": major_count,
            "message": (
                f"⚠ {major_count} serious interaction(s) detected. Please consult your doctor."
                if major_count
                else "Interactions found – review carefully."
            ),
            "data": data,
        })
