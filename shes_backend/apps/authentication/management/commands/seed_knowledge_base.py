"""
Management command: seed_knowledge_base
Populates the database with:
  - KEML-listed medications
  - Common drug interactions
  - Lab test reference ranges
  - Coping strategies
Run once after initial migration:
    python manage.py seed_knowledge_base
"""
from django.core.management.base import BaseCommand

from apps.lab_results.models import LabTestReference
from apps.medications.models import DrugInteraction, Medication
from apps.mental_health.models import CopingStrategy


MEDICATIONS = [
    {"name": "Metformin", "generic_name": "Metformin Hydrochloride", "drug_class": "Biguanide",
     "common_uses": "Type 2 Diabetes management", "standard_dosage": "500–2000mg daily",
     "is_keml_listed": True},
    {"name": "Atorvastatin", "generic_name": "Atorvastatin Calcium", "drug_class": "Statin",
     "common_uses": "High cholesterol, cardiovascular risk reduction", "standard_dosage": "10–80mg once daily",
     "is_keml_listed": True},
    {"name": "Amlodipine", "generic_name": "Amlodipine Besylate", "drug_class": "Calcium Channel Blocker",
     "common_uses": "Hypertension, angina", "standard_dosage": "5–10mg once daily",
     "is_keml_listed": True},
    {"name": "Lisinopril", "generic_name": "Lisinopril", "drug_class": "ACE Inhibitor",
     "common_uses": "Hypertension, heart failure, diabetic nephropathy", "standard_dosage": "5–40mg once daily",
     "is_keml_listed": True},
    {"name": "Warfarin", "generic_name": "Warfarin Sodium", "drug_class": "Anticoagulant",
     "common_uses": "DVT, atrial fibrillation, mechanical heart valves", "standard_dosage": "Dose-adjusted by INR",
     "is_keml_listed": True},
    {"name": "Aspirin", "generic_name": "Acetylsalicylic Acid", "drug_class": "NSAID / Antiplatelet",
     "common_uses": "Pain, fever, antiplatelet therapy", "standard_dosage": "75–300mg daily",
     "is_keml_listed": True},
    {"name": "Paracetamol", "generic_name": "Acetaminophen", "drug_class": "Analgesic / Antipyretic",
     "common_uses": "Pain, fever", "standard_dosage": "500–1000mg every 4–6 hours (max 4g/day)",
     "is_keml_listed": True},
    {"name": "Ibuprofen", "generic_name": "Ibuprofen", "drug_class": "NSAID",
     "common_uses": "Pain, fever, inflammation", "standard_dosage": "400–800mg every 6–8 hours",
     "is_keml_listed": True},
    {"name": "Amoxicillin", "generic_name": "Amoxicillin Trihydrate", "drug_class": "Penicillin Antibiotic",
     "common_uses": "Bacterial infections – ENT, chest, UTI", "standard_dosage": "500mg three times daily",
     "is_keml_listed": True},
    {"name": "Artemether-Lumefantrine", "generic_name": "Artemether/Lumefantrine",
     "drug_class": "Antimalarial (ACT)", "common_uses": "Uncomplicated Plasmodium falciparum malaria",
     "standard_dosage": "Weight-based 3-day course", "is_keml_listed": True},
    {"name": "Salbutamol", "generic_name": "Albuterol", "drug_class": "Beta-2 Agonist (Bronchodilator)",
     "common_uses": "Asthma, COPD – reliever therapy", "standard_dosage": "100–200mcg as needed (inhaler)",
     "is_keml_listed": True},
    {"name": "Omeprazole", "generic_name": "Omeprazole", "drug_class": "Proton Pump Inhibitor",
     "common_uses": "Acid reflux, peptic ulcers, GERD", "standard_dosage": "20–40mg once daily",
     "is_keml_listed": True},
]

LAB_REFERENCES = [
    {"test_name": "Haemoglobin", "abbreviation": "Hb", "unit": "g/dL",
     "normal_min": 12.0, "normal_max": 17.5,
     "layman_description": "Measures the oxygen-carrying protein in red blood cells.",
     "low_label": "Low haemoglobin – possible anaemia",
     "normal_label": "Haemoglobin is normal",
     "high_label": "Elevated haemoglobin – needs further evaluation",
     "low_advice": "Eat iron-rich foods. See a doctor if you feel breathless or very tired.",
     "high_advice": "Please consult your doctor for further investigation."},
    {"test_name": "Fasting Blood Glucose", "abbreviation": "FBG", "unit": "mmol/L",
     "normal_min": 3.9, "normal_max": 5.5,
     "layman_description": "Measures blood sugar after not eating for 8+ hours.",
     "low_label": "Low blood sugar (hypoglycaemia)", "normal_label": "Normal fasting blood sugar",
     "high_label": "High fasting blood sugar – possible diabetes",
     "low_advice": "Eat or drink something sugary immediately if symptomatic.",
     "high_advice": "Consult your doctor for a diabetes assessment."},
    {"test_name": "HbA1c", "abbreviation": "HbA1c", "unit": "%",
     "normal_min": 0.0, "normal_max": 5.7,
     "layman_description": "Average blood sugar over the last 2–3 months.",
     "low_label": "Very low – monitor for hypoglycaemia",
     "normal_label": "Blood sugar well-controlled",
     "high_label": "Elevated – indicates poor blood sugar control",
     "low_advice": "Discuss with your doctor.", "high_advice": "Strict diet control and medication review needed."},
    {"test_name": "Total Cholesterol", "abbreviation": "TC", "unit": "mmol/L",
     "normal_min": 0.0, "normal_max": 5.2,
     "layman_description": "Total fat-like substance in blood that can clog arteries.",
     "low_label": "Very low cholesterol – rare", "normal_label": "Healthy cholesterol level",
     "high_label": "High cholesterol – heart disease risk",
     "low_advice": "Discuss with your doctor.", "high_advice": "Reduce saturated fats and increase exercise."},
    {"test_name": "Creatinine", "abbreviation": "Cr", "unit": "µmol/L",
     "normal_min": 62, "normal_max": 115,
     "layman_description": "Waste product filtered by kidneys – indicates kidney health.",
     "low_label": "Low creatinine – may indicate reduced muscle mass",
     "normal_label": "Kidney function marker is normal",
     "high_label": "Elevated creatinine – possible kidney stress",
     "low_advice": "Usually not concerning.", "high_advice": "Consult your doctor for kidney function evaluation."},
]

COPING_STRATEGIES = [
    {"title": "Box Breathing (4-4-4-4)", "strategy_type": "breathing",
     "description": "A simple and effective breathing technique used by military and emergency responders.",
     "instructions": "1. Breathe in slowly for 4 counts.\n2. Hold your breath for 4 counts.\n3. Exhale slowly for 4 counts.\n4. Hold empty for 4 counts.\n5. Repeat 4–6 times.",
     "applicable_moods": ["distressed", "low", "neutral"], "duration_minutes": 5},
    {"title": "5-4-3-2-1 Grounding Exercise", "strategy_type": "mindfulness",
     "description": "Brings you back to the present moment by engaging your five senses.",
     "instructions": "Notice: 5 things you can SEE, 4 things you can TOUCH, 3 things you can HEAR, 2 things you can SMELL, 1 thing you can TASTE.",
     "applicable_moods": ["distressed", "low"], "duration_minutes": 5},
    {"title": "Journaling – Brain Dump", "strategy_type": "journaling",
     "description": "Write down everything on your mind without filtering or editing.",
     "instructions": "1. Set a timer for 10 minutes.\n2. Write continuously about whatever is bothering you.\n3. Do not re-read until tomorrow.\n4. After writing, identify one small action you can take.",
     "applicable_moods": ["distressed", "low", "neutral"], "duration_minutes": 10},
    {"title": "Gentle Walk", "strategy_type": "physical",
     "description": "Physical movement releases endorphins and provides a mental break.",
     "instructions": "1. Put on comfortable shoes.\n2. Walk at a comfortable pace for 20–30 minutes.\n3. Focus on your surroundings, not your phone.\n4. Breathe in through your nose and out through your mouth.",
     "applicable_moods": ["low", "neutral", "good"], "duration_minutes": 30},
    {"title": "Gratitude Practice", "strategy_type": "cognitive",
     "description": "Shifts focus from problems to positives, proven to improve wellbeing.",
     "instructions": "1. Take a notebook or open your phone notes.\n2. Write 3 specific things you are grateful for today.\n3. For each one, write WHY you are grateful.\n4. Read them aloud if you feel comfortable.",
     "applicable_moods": ["low", "neutral", "good"], "duration_minutes": 5},
    {"title": "Reach Out to Someone You Trust", "strategy_type": "social",
     "description": "Social connection is one of the most effective ways to manage stress and low mood.",
     "instructions": "1. Think of one person who makes you feel safe.\n2. Send them a simple message: 'Hey, I'd love to chat when you have a moment.'\n3. Share as much or as little as you are comfortable with.",
     "applicable_moods": ["distressed", "low"], "duration_minutes": 20},
    {"title": "Progressive Muscle Relaxation", "strategy_type": "breathing",
     "description": "Releases physical tension stored in the body due to stress.",
     "instructions": "1. Lie down or sit comfortably.\n2. Starting with your feet, tense each muscle group for 5 seconds.\n3. Release and relax for 10 seconds.\n4. Move upward: calves, thighs, abdomen, hands, arms, shoulders, face.\n5. Notice the difference between tension and relaxation.",
     "applicable_moods": ["distressed", "low", "neutral"], "duration_minutes": 15},
]


class Command(BaseCommand):
    help = "Seeds the database with knowledge base data (medications, lab refs, coping strategies)"

    def handle(self, *args, **options):
        self._seed_medications()
        self._seed_lab_references()
        self._seed_coping_strategies()
        self.stdout.write(self.style.SUCCESS("✅ Knowledge base seeded successfully."))

    def _seed_medications(self):
        created = 0
        for data in MEDICATIONS:
            _, new = Medication.objects.get_or_create(name=data["name"], defaults=data)
            if new:
                created += 1
        self.stdout.write(f"  Medications: {created} created, {len(MEDICATIONS) - created} already existed.")

    def _seed_lab_references(self):
        created = 0
        for data in LAB_REFERENCES:
            _, new = LabTestReference.objects.get_or_create(test_name=data["test_name"], defaults=data)
            if new:
                created += 1
        self.stdout.write(f"  Lab references: {created} created.")

    def _seed_coping_strategies(self):
        created = 0
        for data in COPING_STRATEGIES:
            _, new = CopingStrategy.objects.get_or_create(title=data["title"], defaults=data)
            if new:
                created += 1
        self.stdout.write(f"  Coping strategies: {created} created.")
