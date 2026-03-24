"""
SHES Chatbot – Knowledge Base Content
Clinical knowledge drawn from:
- Kenya National Clinical Guidelines (2022)
- Kenya Essential Medicines List (KEML 2023)
- WHO Primary Care Guidelines
"""

KNOWLEDGE_CHUNKS = [
    {
        "title": "Malaria Diagnosis and Treatment — Kenya MOH",
        "content": """
Malaria is caused by Plasmodium parasites transmitted by female Anopheles mosquitoes.
In Kenya, Plasmodium falciparum causes the most severe disease.

Symptoms: High fever (>38.5°C), chills, sweating, headache, muscle aches, nausea, vomiting.
Severe malaria: Altered consciousness, severe anaemia, respiratory distress, hypoglycaemia.

Diagnosis: Rapid Diagnostic Test (RDT) or microscopy is required before treatment.

First-line treatment for uncomplicated malaria (adults):
- Artemether-Lumefantrine (ALu / Coartem): 4 tablets twice daily for 3 days
- Take with food or milk to improve absorption

Severe malaria: IV Artesunate is first-line. Refer to hospital immediately.

Prevention: Insecticide-treated bed nets (ITNs), indoor residual spraying.
Pregnant women and children under 5 are at highest risk.

When to seek emergency care: High fever with altered consciousness, convulsions, 
inability to drink, jaundice, dark urine (blackwater fever).
        """,
        "source": "Kenya National Clinical Guidelines 2022",
    },
    {
        "title": "Hypertension Management — Kenya MOH",
        "content": """
Hypertension is defined as sustained blood pressure ≥ 140/90 mmHg.
It is a major risk factor for stroke, heart attack, and kidney disease.

Blood pressure classification (JNC-8):
- Normal: < 120/80 mmHg
- Elevated: 120-129 / < 80 mmHg
- Stage 1 Hypertension: 130-139 / 80-89 mmHg
- Stage 2 Hypertension: ≥ 140/90 mmHg
- Hypertensive Crisis: ≥ 180/120 mmHg — requires immediate care

Lifestyle modifications (first-line for Stage 1):
- Reduce sodium intake to < 2g/day
- DASH diet: fruits, vegetables, whole grains, low-fat dairy
- Regular aerobic exercise: 30 minutes, 5 days/week
- Limit alcohol: ≤ 2 units/day (men), ≤ 1 unit/day (women)
- Stop smoking
- Weight reduction if BMI > 25

First-line medications (Kenya KEML):
- Amlodipine 5mg once daily (calcium channel blocker)
- Lisinopril 10mg once daily (ACE inhibitor — avoid in pregnancy)
- Hydrochlorothiazide 25mg once daily (diuretic)

Target blood pressure: < 130/80 mmHg for most patients.
Diabetic patients: < 130/80 mmHg.

Hypertensive Crisis: Go to emergency immediately. Do not drive yourself.
        """,
        "source": "Kenya National Clinical Guidelines 2022",
    },
    {
        "title": "Type 2 Diabetes Management — Kenya MOH",
        "content": """
Type 2 Diabetes Mellitus (T2DM) is characterised by insulin resistance and relative insulin deficiency.

Diagnostic criteria:
- Fasting blood glucose ≥ 7.0 mmol/L (126 mg/dL) on two occasions
- Random blood glucose ≥ 11.1 mmol/L (200 mg/dL) with symptoms
- HbA1c ≥ 6.5% on two occasions
- 2-hour glucose ≥ 11.1 mmol/L during OGTT

Blood glucose targets:
- Fasting: 4.4–7.2 mmol/L (80–130 mg/dL)
- Post-meal (2h): < 10.0 mmol/L (180 mg/dL)
- HbA1c: < 7.0% for most patients; < 8.0% for elderly/frail

First-line medication: Metformin 500mg twice daily with meals.
Increase gradually to 1000mg twice daily.

Lifestyle: Low glycaemic index diet, regular exercise (150 min/week moderate intensity),
weight loss target 5-10% of body weight if overweight.

Monitoring: Fasting glucose daily if on insulin, weekly if on oral agents.
HbA1c every 3 months until stable, then every 6 months.
Annual: kidney function (eGFR, creatinine), eye exam, foot exam, lipids.

Hypoglycaemia (blood sugar < 3.9 mmol/L): Symptoms include sweating, trembling, 
confusion, rapid heartbeat. Treat with 15-20g fast-acting carbohydrates (glucose tablets,
fruit juice, 3-4 teaspoons of sugar in water).

Hyperglycaemic emergency: Blood glucose > 16.7 mmol/L with vomiting — go to hospital.
        """,
        "source": "Kenya National Clinical Guidelines 2022",
    },
    {
        "title": "Tuberculosis (TB) — Kenya MOH Guidelines",
        "content": """
Tuberculosis is caused by Mycobacterium tuberculosis. Kenya is a high-burden TB country.

Symptoms of pulmonary TB:
- Persistent cough for > 2 weeks (key symptom)
- Coughing up blood (haemoptysis)
- Night sweats, weight loss, loss of appetite
- Fever, chest pain, shortness of breath

Diagnosis: Sputum microscopy, GeneXpert MTB/RIF, chest X-ray.
All people with cough > 2 weeks should be screened for TB.

Treatment (standard first-line — 6 months):
- Intensive phase (2 months): HRZE (Isoniazid + Rifampicin + Pyrazinamide + Ethambutol)
- Continuation phase (4 months): HR (Isoniazid + Rifampicin)

DOTS (Directly Observed Therapy Short-course): All TB patients must be registered
and treatment must be directly observed. Available free at all government health facilities.

TB and HIV: All TB patients should be tested for HIV. Co-infected patients start
antiretrovirals (ARVs) within 8 weeks of starting TB treatment.

Drug-Resistant TB (MDR-TB): Suspected when treatment fails. Refer to MDR-TB centre.

Infectiousness: TB is spread by air. Patients are no longer infectious after 2 weeks
of effective treatment. Always cover mouth when coughing. Ventilate rooms.
        """,
        "source": "Kenya National TB, Leprosy and Lung Disease Program",
    },
    {
        "title": "Anaemia — Diagnosis and Management",
        "content": """
Anaemia is defined as haemoglobin < 12.0 g/dL in women and < 13.0 g/dL in men.

Severity:
- Mild: Hb 10-11.9 g/dL (women) / 10-12.9 g/dL (men)
- Moderate: Hb 7-9.9 g/dL
- Severe: Hb < 7.0 g/dL

Causes in Kenya:
1. Iron deficiency (most common): Poor diet, heavy menstrual bleeding, hookworm
2. Malaria (causes haemolysis and bone marrow suppression)
3. Sickle cell disease
4. Vitamin B12 / Folate deficiency
5. Chronic disease (HIV, TB, kidney disease)

Symptoms: Fatigue, weakness, shortness of breath, dizziness, pallor (pale conjunctivae,
nail beds, palms), rapid heartbeat, headache.

Iron deficiency anaemia treatment:
- Ferrous sulphate 200mg three times daily for 3 months
- Take with vitamin C (orange juice) to enhance absorption
- Avoid with tea, coffee, dairy (reduce absorption)
- Dietary sources: Red meat, liver, beans, dark leafy vegetables, fortified foods

Severe anaemia (Hb < 7.0): May require blood transfusion. Refer urgently.
Anaemia in pregnancy: Iron 60mg + Folic acid 400mcg daily throughout pregnancy.
        """,
        "source": "Kenya National Clinical Guidelines 2022",
    },
    {
        "title": "HIV and AIDS — Kenya MOH",
        "content": """
HIV (Human Immunodeficiency Virus) attacks the immune system. AIDS is the advanced stage.

Testing: All Kenyans are encouraged to know their HIV status. Free testing at all 
government facilities. Self-test kits available at pharmacies.

Transmission: Unprotected sex, sharing needles, mother-to-child (pregnancy, birth, breastfeeding),
blood transfusion with infected blood. Not transmitted by casual contact.

Prevention:
- Consistent correct condom use
- PrEP (Pre-Exposure Prophylaxis): Daily Tenofovir/Emtricitabine for high-risk individuals
- VMMC (Voluntary Medical Male Circumcision): Reduces risk by 60%
- PMTCT: All HIV+ pregnant women start lifelong ART
- PEP (Post-Exposure Prophylaxis): Start within 72 hours of exposure

Treatment (ART — Antiretroviral Therapy):
- All HIV+ people should start ART regardless of CD4 count
- First-line in Kenya: TLD (Tenofovir + Lamivudine + Dolutegravir)
- ART suppresses viral load to undetectable levels
- Undetectable = Untransmittable (U=U)
- ART is free at all government facilities

Opportunistic infections: CD4 < 200 cells/mm3 — risk of PCP, cryptococcal meningitis,
CMV retinitis. Cotrimoxazole prophylaxis recommended for CD4 < 350.

Adherence: ART must be taken every day at the same time. Missing doses leads to 
drug resistance. Use pill reminders, family support.
        """,
        "source": "Kenya HIV Prevention and Treatment Guidelines 2022",
    },
    {
        "title": "Mental Health — Depression and Anxiety",
        "content": """
Mental health conditions are common and treatable. Stigma prevents many Kenyans
from seeking help.

Depression symptoms (at least 5 for ≥ 2 weeks):
- Persistent sad, empty, or hopeless mood
- Loss of interest in activities previously enjoyed
- Changes in appetite or weight
- Sleep disturbances (insomnia or sleeping too much)
- Fatigue and loss of energy
- Difficulty concentrating
- Feelings of worthlessness or guilt
- Thoughts of death or suicide

Anxiety symptoms:
- Excessive worry that is difficult to control
- Restlessness, feeling on edge
- Muscle tension, rapid heartbeat, shortness of breath
- Avoidance of situations that trigger anxiety
- Irritability, sleep problems

Treatment:
1. Psychological: Counselling, Cognitive Behavioural Therapy (CBT)
2. Medications: Fluoxetine 20mg daily (first-line antidepressant in Kenya)
3. Social support: Exercise, social connection, reducing alcohol

Crisis resources Kenya:
- Befrienders Kenya: 0800 723 253 (free, 24/7)
- Mathare Hospital: 020 2012936
- Kenya Red Cross: 1199

If you are having thoughts of suicide, please call Befrienders Kenya immediately
or go to your nearest emergency department. You are not alone.
        """,
        "source": "Kenya Mental Health Policy 2015-2030",
    },
    {
        "title": "Child Health — Immunisation Schedule Kenya",
        "content": """
Kenya's immunisation schedule (Kenya Expanded Programme on Immunisation — KEPI):

At birth:
- BCG (tuberculosis)
- OPV 0 (oral polio)
- Hepatitis B birth dose

6 weeks:
- DPT-HepB-Hib (diphtheria, pertussis, tetanus, hepatitis B, Haemophilus influenzae b)
- OPV 1, IPV 1
- PCV 1 (pneumococcal)
- Rotavirus 1

10 weeks: DPT-HepB-Hib, OPV 2, PCV 2, Rotavirus 2

14 weeks: DPT-HepB-Hib, OPV 3, IPV 2, PCV 3

9 months: Measles-Rubella (MR1), Yellow Fever (in endemic areas)
18 months: MR2 booster, DPT booster

All vaccines are FREE at government health facilities.
If a child misses a vaccine, catch-up is possible at any time.

Signs of vaccine-preventable diseases to watch for:
- High fever + rash in unimmunised child → could be measles
- Barking cough → whooping cough
- Weak limbs → polio
        """,
        "source": "Kenya Expanded Programme on Immunisation (KEPI) Schedule",
    },
    {
        "title": "Emergency Signs — When to Seek Immediate Care",
        "content": """
Go to the emergency department or call 999 immediately for:

CHEST:
- Chest pain or pressure, especially with sweating, left arm pain, or jaw pain
- Sudden severe shortness of breath
- Coughing up large amounts of blood

BRAIN/NEUROLOGICAL:
- Sudden severe headache (worst of your life)
- Sudden weakness or numbness on one side of the face, arm, or leg (stroke signs)
- Loss of consciousness or seizure
- Sudden confusion or difficulty speaking

BLEEDING:
- Uncontrolled bleeding that won't stop after 10 minutes of pressure
- Vomiting blood or blood in stool
- Heavy vaginal bleeding in pregnancy

OTHER:
- Severe allergic reaction: throat swelling, difficulty breathing, widespread rash
- Suspected poisoning or drug overdose
- High fever (>40°C) or fever with neck stiffness and sensitivity to light (meningitis)
- Severe abdominal pain (could be appendicitis, ectopic pregnancy)
- Blood sugar below 3.0 mmol/L with unconsciousness
- Suicidal thoughts or intent to harm

Kenya emergency contacts:
- Emergency: 999 or 112
- Ambulance: 0721 225 225 (St John Ambulance)
- Poison Control: 0800 724 744
- Befrienders Kenya (mental health crisis): 0800 723 253
        """,
        "source": "Kenya Emergency Triage Assessment and Treatment Guidelines",
    },
    {
        "title": "Maternal Health — Antenatal Care Kenya",
        "content": """
Every pregnant woman in Kenya is entitled to free antenatal care (ANC) at government
health facilities.

WHO recommends 8 ANC contacts. Minimum visits:
- First visit: As early as possible (before 12 weeks)
- 16 weeks, 24 weeks, 28 weeks, 32 weeks, 36 weeks
- Final visits at 38 and 40 weeks

At each visit:
- Blood pressure measurement (detect pre-eclampsia)
- Weight and fundal height measurement
- Urinalysis (protein, glucose, infection)
- Foetal heart rate and position
- Haemoglobin (screen for anaemia)

Routine interventions:
- Tetanus toxoid immunisation (2 doses)
- Iron 60mg + Folic acid 400mcg daily
- Intermittent Preventive Treatment for malaria (SP/Fansidar)
- HIV testing and counselling
- Deworming with mebendazole after 1st trimester

Danger signs — seek care immediately:
- Severe headache, visual changes, swollen face/hands → pre-eclampsia
- Vaginal bleeding at any stage
- Reduced or absent foetal movements after 28 weeks
- Fever > 38°C
- Severe abdominal pain
- Water breaking before 37 weeks

Delivery: All women should deliver in a health facility. Free maternity services at 
all government hospitals (Linda Mama program).
        """,
        "source": "Kenya Reproductive Health Guidelines",
    },
]
