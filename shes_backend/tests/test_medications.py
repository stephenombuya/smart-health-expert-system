"""
SHES Tests – Medications API
Tests for medication listing, patient medication CRUD, and interaction checking.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.medications.models import DrugInteraction, PatientMedication
from tests.factories import (
    DrugInteractionFactory,
    MedicationFactory,
    PatientMedicationFactory,
    UserFactory,
)


class TestMedicationList(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        MedicationFactory.create_batch(5)

    def test_medication_list_returns_200(self):
        response = self.client.get(reverse("medication-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_medication_list_count(self):
        response = self.client.get(reverse("medication-list"))
        self.assertGreaterEqual(response.data["count"], 5)

    def test_unauthenticated_request_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("medication-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestPatientMedications(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.medication = MedicationFactory(name="Metformin")
        self.url = reverse("my-medications")

    def _valid_payload(self):
        return {
            "medication_id": self.medication.pk,
            "dosage": "500mg",
            "frequency": "twice_daily",
            "start_date": "2024-01-01",
        }

    def test_add_medication_returns_201(self):
        response = self.client.post(self.url, self._valid_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_medication_persists_in_db(self):
        self.client.post(self.url, self._valid_payload(), format="json")
        self.assertEqual(PatientMedication.objects.filter(patient=self.user).count(), 1)

    def test_list_shows_only_own_medications(self):
        other_user = UserFactory()
        PatientMedicationFactory(patient=other_user)
        PatientMedicationFactory(patient=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 1)

    def test_end_date_before_start_date_returns_400(self):
        payload = {**self._valid_payload(), "end_date": "2023-01-01"}
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_own_medication(self):
        med = PatientMedicationFactory(patient=self.user)
        url = reverse("my-medication-detail", kwargs={"pk": med.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_other_users_medication(self):
        other = PatientMedicationFactory(patient=UserFactory())
        url = reverse("my-medication-detail", kwargs={"pk": other.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestDrugInteractionCheck(APITestCase):

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("interaction-check")
        self.drug_a = MedicationFactory(name="Warfarin")
        self.drug_b = MedicationFactory(name="Aspirin")
        self.drug_c = MedicationFactory(name="Paracetamol")
        # Create known interaction between A and B
        DrugInteractionFactory(
            drug_a=self.drug_a,
            drug_b=self.drug_b,
            severity=DrugInteraction.Severity.MAJOR,
            description="Increased bleeding risk",
        )

    def test_interaction_found_returns_200_with_data(self):
        response = self.client.post(
            self.url,
            {"medication_ids": [self.drug_a.pk, self.drug_b.pk]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["interactions_found"], 1)
        self.assertEqual(response.data["major_warnings"], 1)

    def test_no_interaction_returns_empty_list(self):
        response = self.client.post(
            self.url,
            {"medication_ids": [self.drug_a.pk, self.drug_c.pk]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["interactions_found"], 0)

    def test_reverse_pair_also_detected(self):
        """Interaction stored as (A, B) must also be found when queried as (B, A)."""
        response = self.client.post(
            self.url,
            {"medication_ids": [self.drug_b.pk, self.drug_a.pk]},
            format="json",
        )
        self.assertEqual(response.data["interactions_found"], 1)

    def test_single_medication_id_returns_400(self):
        response = self.client.post(
            self.url, {"medication_ids": [self.drug_a.pk]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_many_medications_returns_400(self):
        ids = list(range(1, 13))  # 12 > max of 10
        response = self.client.post(self.url, {"medication_ids": ids}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_three_way_check_finds_one_interaction(self):
        """With 3 drugs and 1 known interaction (A-B), should return 1."""
        response = self.client.post(
            self.url,
            {"medication_ids": [self.drug_a.pk, self.drug_b.pk, self.drug_c.pk]},
            format="json",
        )
        self.assertEqual(response.data["interactions_found"], 1)
