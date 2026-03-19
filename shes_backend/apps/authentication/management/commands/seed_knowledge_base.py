"""
Management command: seed_knowledge_base
Populates: KEML medications, 20 drug interactions, lab references, coping strategies.
Run: python manage.py seed_knowledge_base
"""
from django.core.management.base import BaseCommand
from apps.lab_results.models import LabTestReference
from apps.medications.models import DrugInteraction, Medication
from apps.mental_health.models import CopingStrategy

MEDICATIONS = [
    {"name": "Metformin",               "generic_name": "Metformin Hydrochloride",  "drug_class": "Biguanide",               "common_uses": "Type 2 Diabetes",                           "standard_dosage": "500-2000mg daily",         "is_keml_listed": True},
    {"name": "Atorvastatin",            "generic_name": "Atorvastatin Calcium",     "drug_class": "Statin",                  "common_uses": "High cholesterol",                          "standard_dosage": "10-80mg once daily",       "is_keml_listed": True},
    {"name": "Amlodipine",              "generic_name": "Amlodipine Besylate",      "drug_class": "Calcium Channel Blocker", "common_uses": "Hypertension, angina",                      "standard_dosage": "5-10mg once daily",        "is_keml_listed": True},
    {"name": "Lisinopril",              "generic_name": "Lisinopril",               "drug_class": "ACE Inhibitor",           "common_uses": "Hypertension, heart failure",               "standard_dosage": "5-40mg once daily",        "is_keml_listed": True},
    {"name": "Warfarin",                "generic_name": "Warfarin Sodium",          "drug_class": "Anticoagulant",           "common_uses": "DVT, atrial fibrillation",                  "standard_dosage": "Dose-adjusted by INR",     "is_keml_listed": True},
    {"name": "Aspirin",                 "generic_name": "Acetylsalicylic Acid",     "drug_class": "NSAID / Antiplatelet",    "common_uses": "Pain, fever, antiplatelet therapy",         "standard_dosage": "75-300mg daily",           "is_keml_listed": True},
    {"name": "Paracetamol",             "generic_name": "Acetaminophen",            "drug_class": "Analgesic / Antipyretic", "common_uses": "Pain, fever",                               "standard_dosage": "500-1000mg every 4-6h",    "is_keml_listed": True},
    {"name": "Ibuprofen",               "generic_name": "Ibuprofen",                "drug_class": "NSAID",                   "common_uses": "Pain, fever, inflammation",                 "standard_dosage": "400-800mg every 6-8h",     "is_keml_listed": True},
    {"name": "Amoxicillin",             "generic_name": "Amoxicillin Trihydrate",   "drug_class": "Penicillin Antibiotic",   "common_uses": "Bacterial infections",                      "standard_dosage": "500mg three times daily",  "is_keml_listed": True},
    {"name": "Artemether-Lumefantrine", "generic_name": "Artemether/Lumefantrine",  "drug_class": "Antimalarial (ACT)",      "common_uses": "Uncomplicated falciparum malaria",          "standard_dosage": "Weight-based 3-day course","is_keml_listed": True},
    {"name": "Salbutamol",              "generic_name": "Albuterol",                "drug_class": "Beta-2 Agonist",          "common_uses": "Asthma, COPD",                              "standard_dosage": "100-200mcg as needed",     "is_keml_listed": True},
    {"name": "Omeprazole",              "generic_name": "Omeprazole",               "drug_class": "Proton Pump Inhibitor",   "common_uses": "Acid reflux, peptic ulcers",                "standard_dosage": "20-40mg once daily",       "is_keml_listed": True},
    {"name": "Spironolactone",          "generic_name": "Spironolactone",           "drug_class": "Potassium-sparing Diuretic","common_uses": "Heart failure, hypertension",             "standard_dosage": "25-100mg daily",           "is_keml_listed": True},
    {"name": "Simvastatin",             "generic_name": "Simvastatin",              "drug_class": "Statin",                  "common_uses": "High cholesterol",                          "standard_dosage": "10-40mg once daily",       "is_keml_listed": True},
    {"name": "Propranolol",             "generic_name": "Propranolol",              "drug_class": "Beta-Blocker",            "common_uses": "Hypertension, angina, arrhythmia",          "standard_dosage": "40-160mg daily",           "is_keml_listed": True},
]

DRUG_INTERACTIONS = [
    ("Warfarin","Aspirin","major","Concurrent use significantly increases bleeding risk. Aspirin inhibits platelets and can displace warfarin from plasma proteins, potentiating anticoagulation.","Avoid unless specifically indicated. If used, monitor INR closely and watch for bleeding signs. Use lowest effective aspirin dose (75mg)."),
    ("Warfarin","Ibuprofen","major","NSAIDs inhibit platelet aggregation, damage gastric mucosa, and may displace warfarin from binding sites, increasing free warfarin and bleeding risk substantially.","Avoid this combination. Use paracetamol for pain in patients on warfarin. If NSAID is essential, add gastroprotection and monitor INR frequently."),
    ("Salbutamol","Propranolol","major","Propranolol antagonises the bronchodilatory effect of salbutamol. In asthmatic patients this can precipitate severe bronchospasm resistant to rescue therapy.","Contraindicated in asthma or COPD. If beta-blocker required, use cardioselective agent (atenolol) with extreme caution."),
    ("Artemether-Lumefantrine","Warfarin","major","Artemether-lumefantrine inhibits CYP2C9, the primary enzyme metabolising warfarin, causing significant increases in warfarin levels and bleeding risk.","Monitor INR daily during malaria treatment and for 1-2 weeks afterward. Adjust warfarin dose as needed."),
    ("Lisinopril","Spironolactone","moderate","Both drugs increase serum potassium through different mechanisms, significantly raising hyperkalaemia risk which can cause dangerous cardiac arrhythmias.","Monitor potassium and renal function at 1 week, 1 month, then every 3-6 months. Avoid potassium-rich foods. Stop spironolactone if K+ exceeds 5.5 mmol/L."),
    ("Aspirin","Ibuprofen","moderate","Ibuprofen can block aspirin's irreversible COX-1 inhibition, preventing its cardioprotective antiplatelet effect when taken before aspirin.","Take aspirin 30 minutes before ibuprofen or use paracetamol instead. Avoid regular ibuprofen in patients taking aspirin for cardiovascular protection."),
    ("Lisinopril","Ibuprofen","moderate","NSAIDs reduce renal prostaglandins, causing sodium retention and directly antagonising ACE inhibitor effects. Can also reduce kidney function.","Avoid regular NSAIDs with ACE inhibitors. Use paracetamol. Monitor blood pressure and renal function if occasional NSAID use is unavoidable."),
    ("Warfarin","Paracetamol","moderate","Regular high-dose paracetamol (>2g/day) can enhance warfarin's anticoagulant effect, possibly by inhibiting vitamin K-dependent clotting factor synthesis.","Paracetamol is still preferred over NSAIDs with warfarin. Use the lowest effective dose. Monitor INR when starting or stopping regular paracetamol."),
    ("Warfarin","Amoxicillin","moderate","Broad-spectrum antibiotics reduce gut flora that produce vitamin K2, lowering vitamin K availability and unpredictably altering warfarin anticoagulation.","Monitor INR closely when starting or stopping any antibiotic. Warn patient to watch for unusual bruising or bleeding."),
    ("Amlodipine","Simvastatin","moderate","Amlodipine inhibits CYP3A4, increasing simvastatin plasma concentrations and raising the risk of myopathy and rhabdomyolysis.","Limit simvastatin to 20mg daily with amlodipine. Monitor for muscle pain. Consider pravastatin or rosuvastatin if higher statin dose needed."),
    ("Metformin","Ibuprofen","moderate","NSAIDs reduce renal blood flow, impairing kidney function. Since metformin is renally excreted, accumulation increases lactic acidosis risk.","Avoid regular NSAIDs with metformin. Use paracetamol. Monitor renal function and consider holding metformin if eGFR drops below 30 mL/min."),
    ("Lisinopril","Aspirin","moderate","High-dose aspirin can attenuate the vasodilatory effects of ACE inhibitors by inhibiting prostaglandin synthesis, reducing antihypertensive efficacy.","Low-dose aspirin (75-100mg) is well tolerated with ACE inhibitors and benefit outweighs risk. Avoid high-dose aspirin with ACE inhibitors."),
    ("Omeprazole","Metformin","moderate","Omeprazole inhibits OCT1 transporter, potentially increasing metformin plasma levels. Clinical significance is low in normal renal function but may matter in borderline cases.","No dose adjustment typically needed. Monitor for GI side effects. Check renal function periodically in patients with borderline kidney function."),
    ("Propranolol","Metformin","moderate","Beta-blockers mask tachycardia that signals hypoglycaemia and can impair glucose metabolism, potentially prolonging hypoglycaemic episodes.","Educate patient that sweating remains a reliable hypoglycaemia sign. Monitor blood glucose when initiating propranolol. Consider cardioselective beta-blocker (atenolol) as alternative."),
    ("Amlodipine","Atorvastatin","minor","Amlodipine mildly inhibits CYP3A4, causing approximately 18% increase in atorvastatin levels. Risk of statin-related myopathy marginally increased.","Combination is generally well tolerated at standard atorvastatin doses (10-40mg). Monitor for muscle pain as part of routine statin follow-up."),
    ("Omeprazole","Aspirin","minor","Omeprazole reduces gastric acid, slightly affecting absorption of enteric-coated aspirin. However, co-prescription is intentional for gastroprotection.","No action required. Co-prescribing omeprazole with aspirin is recommended practice to reduce gastric irritation, especially in elderly patients."),
    ("Amoxicillin","Metformin","minor","Amoxicillin competes for OCT2 transporter, slightly reducing metformin renal excretion. Negligible in normal renal function.","No routine adjustment for short antibiotic courses. Monitor for GI side effects in patients with renal impairment."),
    ("Atorvastatin","Amoxicillin","minor","No direct pharmacodynamic interaction. Antibiotic-induced diarrhoea may transiently reduce atorvastatin absorption.","No routine monitoring required for a standard antibiotic course."),
    ("Lisinopril","Metformin","minor","ACE inhibitors have a modest insulin-sensitising effect that can mildly enhance metformin's glucose-lowering action. Generally considered a beneficial synergy.","Commonly used and beneficial combination in diabetic hypertensive patients. Monitor glucose when initiating lisinopril."),
    ("Omeprazole","Atorvastatin","minor","Both metabolised by CYP2C19. Omeprazole can modestly increase atorvastatin levels. Clinical significance is low at standard doses.","No dose adjustment needed. Standard combination is safe for most patients."),
]

LAB_REFERENCES = [
    {"test_name": "Haemoglobin",          "abbreviation": "Hb",    "unit": "g/dL",    "normal_min": 12.0, "normal_max": 17.5, "layman_description": "Oxygen-carrying protein in red blood cells.", "low_label": "Low haemoglobin – possible anaemia", "normal_label": "Haemoglobin is normal", "high_label": "Elevated haemoglobin", "low_advice": "Eat iron-rich foods and see a doctor.", "high_advice": "Consult your doctor."},
    {"test_name": "Fasting Blood Glucose", "abbreviation": "FBG",   "unit": "mmol/L",  "normal_min": 3.9,  "normal_max": 5.5,  "layman_description": "Blood sugar after not eating for 8+ hours.", "low_label": "Low blood sugar (hypoglycaemia)", "normal_label": "Normal fasting blood sugar", "high_label": "High fasting blood sugar", "low_advice": "Consume sugar immediately if symptomatic.", "high_advice": "Consult doctor for diabetes assessment."},
    {"test_name": "HbA1c",                "abbreviation": "HbA1c", "unit": "%",        "normal_min": 0.0,  "normal_max": 5.7,  "layman_description": "Average blood sugar over the last 2-3 months.", "low_label": "Very low", "normal_label": "Blood sugar well-controlled", "high_label": "Elevated – poor blood sugar control", "low_advice": "Discuss with your doctor.", "high_advice": "Strict diet control and medication review needed."},
    {"test_name": "Total Cholesterol",     "abbreviation": "TC",    "unit": "mmol/L",  "normal_min": 0.0,  "normal_max": 5.2,  "layman_description": "Total fat in blood that can clog arteries.", "low_label": "Very low cholesterol", "normal_label": "Healthy cholesterol level", "high_label": "High cholesterol – heart disease risk", "low_advice": "Discuss with your doctor.", "high_advice": "Reduce saturated fats and increase exercise."},
    {"test_name": "Creatinine",            "abbreviation": "Cr",    "unit": "umol/L",  "normal_min": 62,   "normal_max": 115,  "layman_description": "Kidney waste product – indicates kidney health.", "low_label": "Low creatinine", "normal_label": "Kidney function is normal", "high_label": "Elevated – possible kidney stress", "low_advice": "Usually not concerning.", "high_advice": "Consult your doctor for kidney evaluation."},
]

COPING_STRATEGIES = [
    {"title": "Box Breathing (4-4-4-4)",       "strategy_type": "breathing",    "description": "A simple breathing technique used by emergency responders.", "instructions": "1. Breathe in for 4 counts.\n2. Hold for 4 counts.\n3. Exhale for 4 counts.\n4. Hold for 4 counts.\n5. Repeat 4-6 times.", "applicable_moods": ["distressed", "low", "neutral"], "duration_minutes": 5},
    {"title": "5-4-3-2-1 Grounding Exercise",  "strategy_type": "mindfulness",  "description": "Brings you back to the present by engaging your senses.", "instructions": "Notice: 5 things you SEE, 4 you TOUCH, 3 you HEAR, 2 you SMELL, 1 you TASTE.", "applicable_moods": ["distressed", "low"], "duration_minutes": 5},
    {"title": "Journaling – Brain Dump",       "strategy_type": "journaling",   "description": "Write everything on your mind without filtering.", "instructions": "1. Set a timer for 10 minutes.\n2. Write continuously.\n3. Don't re-read until tomorrow.\n4. Identify one small action you can take.", "applicable_moods": ["distressed", "low", "neutral"], "duration_minutes": 10},
    {"title": "Gentle Walk",                   "strategy_type": "physical",     "description": "Physical movement releases endorphins and provides a mental break.", "instructions": "1. Put on comfortable shoes.\n2. Walk for 20-30 minutes.\n3. Focus on surroundings, not your phone.", "applicable_moods": ["low", "neutral", "good"], "duration_minutes": 30},
    {"title": "Gratitude Practice",            "strategy_type": "cognitive",    "description": "Shifts focus from problems to positives.", "instructions": "1. Write 3 things you are grateful for.\n2. Write WHY for each one.\n3. Read them aloud.", "applicable_moods": ["low", "neutral", "good"], "duration_minutes": 5},
    {"title": "Reach Out to Someone You Trust","strategy_type": "social",       "description": "Social connection is one of the most effective ways to manage low mood.", "instructions": "1. Think of one person who makes you feel safe.\n2. Send them a message.\n3. Share as much or as little as you're comfortable with.", "applicable_moods": ["distressed", "low"], "duration_minutes": 20},
    {"title": "Progressive Muscle Relaxation", "strategy_type": "breathing",    "description": "Releases physical tension stored due to stress.", "instructions": "1. Sit or lie comfortably.\n2. Tense each muscle group for 5 seconds.\n3. Release for 10 seconds.\n4. Move from feet upward to face.", "applicable_moods": ["distressed", "low", "neutral"], "duration_minutes": 15},
]


class Command(BaseCommand):
    help = "Seeds the database with KEML medications, drug interactions, lab references, and coping strategies."

    def handle(self, *args, **options):
        self._seed_medications()
        self._seed_drug_interactions()
        self._seed_lab_references()
        self._seed_coping_strategies()
        self.stdout.write(self.style.SUCCESS("Knowledge base seeded successfully."))

    def _seed_medications(self):
        created = sum(1 for d in MEDICATIONS if Medication.objects.get_or_create(name=d["name"], defaults=d)[1])
        self.stdout.write(f"  Medications: {created} created, {len(MEDICATIONS) - created} already existed.")

    def _seed_drug_interactions(self):
        created = skipped = errors = 0
        for a_name, b_name, severity, description, clinical_action in DRUG_INTERACTIONS:
            try:
                drug_a = Medication.objects.get(name=a_name)
                drug_b = Medication.objects.get(name=b_name)
            except Medication.DoesNotExist:
                errors += 1
                continue
            exists = (DrugInteraction.objects.filter(drug_a=drug_a, drug_b=drug_b).exists()
                      or DrugInteraction.objects.filter(drug_a=drug_b, drug_b=drug_a).exists())
            if exists:
                skipped += 1
                continue
            DrugInteraction.objects.create(drug_a=drug_a, drug_b=drug_b, severity=severity,
                                           description=description, clinical_action=clinical_action)
            created += 1
        self.stdout.write(f"  Drug interactions: {created} created, {skipped} already existed, {errors} errors.")

    def _seed_lab_references(self):
        created = sum(1 for d in LAB_REFERENCES if LabTestReference.objects.get_or_create(test_name=d["test_name"], defaults=d)[1])
        self.stdout.write(f"  Lab references: {created} created.")

    def _seed_coping_strategies(self):
        created = sum(1 for d in COPING_STRATEGIES if CopingStrategy.objects.get_or_create(title=d["title"], defaults=d)[1])
        self.stdout.write(f"  Coping strategies: {created} created.")
