"""
SHES Test Factories
Provides reusable factory classes for all models used across the test suite.
"""
import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.authentication.models import PatientProfile, User
from apps.chronic_tracking.models import BloodPressureReading, GlucoseReading
from apps.lab_results.models import LabResult, LabTestReference
from apps.medications.models import DrugInteraction, Medication, PatientMedication
from apps.mental_health.models import CopingStrategy, MoodEntry
from apps.triage.models import Symptom, TriageSession


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"patient{n}@test.ke")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    role = User.Role.PATIENT
    password = factory.PostGenerationMethodCall("set_password", "TestPass@2024!")
    is_active = True


class DoctorFactory(UserFactory):
    role = User.Role.DOCTOR
    email = factory.Sequence(lambda n: f"doctor{n}@test.ke")


class AdminFactory(UserFactory):
    role = User.Role.ADMIN
    is_staff = True
    is_superuser = True
    email = factory.Sequence(lambda n: f"admin{n}@test.ke")


class PatientProfileFactory(DjangoModelFactory):
    class Meta:
        model = PatientProfile

    user = factory.SubFactory(UserFactory)
    blood_group = "O+"
    known_allergies = "Penicillin"
    chronic_conditions = "Hypertension"


class TriageSessionFactory(DjangoModelFactory):
    class Meta:
        model = TriageSession

    patient = factory.SubFactory(UserFactory)
    urgency_level = TriageSession.UrgencyLevel.SELF_CARE
    recommendation = "Rest at home and monitor symptoms."
    completed = True


class SymptomFactory(DjangoModelFactory):
    class Meta:
        model = Symptom

    session = factory.SubFactory(TriageSessionFactory)
    name = "headache"
    severity = 5
    duration_days = 2


class MedicationFactory(DjangoModelFactory):
    class Meta:
        model = Medication

    name = factory.Sequence(lambda n: f"Drug {n}")
    generic_name = factory.Sequence(lambda n: f"Generic {n}")
    drug_class = "Analgesic"
    is_keml_listed = True


class DrugInteractionFactory(DjangoModelFactory):
    class Meta:
        model = DrugInteraction

    drug_a = factory.SubFactory(MedicationFactory)
    drug_b = factory.SubFactory(MedicationFactory)
    severity = DrugInteraction.Severity.MODERATE
    description = "May increase risk of bleeding"


class PatientMedicationFactory(DjangoModelFactory):
    class Meta:
        model = PatientMedication

    patient = factory.SubFactory(UserFactory)
    medication = factory.SubFactory(MedicationFactory)
    dosage = "500mg"
    frequency = PatientMedication.FrequencyChoices.TWICE_DAILY
    start_date = factory.LazyFunction(lambda: timezone.now().date())
    is_active = True


class GlucoseReadingFactory(DjangoModelFactory):
    class Meta:
        model = GlucoseReading

    patient = factory.SubFactory(UserFactory)
    value_mg_dl = 95.0
    context = GlucoseReading.ReadingContext.FASTING
    recorded_at = factory.LazyFunction(timezone.now)


class BloodPressureReadingFactory(DjangoModelFactory):
    class Meta:
        model = BloodPressureReading

    patient = factory.SubFactory(UserFactory)
    systolic = 120
    diastolic = 80
    pulse = 72
    recorded_at = factory.LazyFunction(timezone.now)


class MoodEntryFactory(DjangoModelFactory):
    class Meta:
        model = MoodEntry

    patient = factory.SubFactory(UserFactory)
    mood_score = 7
    emotions = ["happy", "calm"]
    recorded_at = factory.LazyFunction(timezone.now)


class CopingStrategyFactory(DjangoModelFactory):
    class Meta:
        model = CopingStrategy

    title = factory.Sequence(lambda n: f"Strategy {n}")
    strategy_type = CopingStrategy.StrategyType.BREATHING
    description = "A helpful breathing technique."
    instructions = "Breathe in for 4 seconds, hold for 4, exhale for 4."
    applicable_moods = ["distressed", "low"]
    is_active = True


class LabTestReferenceFactory(DjangoModelFactory):
    class Meta:
        model = LabTestReference

    test_name = factory.Sequence(lambda n: f"Test {n}")
    abbreviation = factory.Sequence(lambda n: f"T{n}")
    unit = "mmol/L"
    normal_min = 3.5
    normal_max = 5.5
    layman_description = "Measures something important."


class LabResultFactory(DjangoModelFactory):
    class Meta:
        model = LabResult

    patient = factory.SubFactory(UserFactory)
    lab_name = "Nairobi General Hospital"
    test_date = factory.LazyFunction(lambda: timezone.now().date())
    raw_results = [{"test_name": "Fasting Glucose", "value": "5.0", "unit": "mmol/L"}]
    interpreted_results = []
    overall_summary = ""
