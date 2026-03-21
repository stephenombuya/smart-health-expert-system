"""
SHES – PDF Health Summary Export
Generates a formatted PDF health summary for a patient.
"""
import logging
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from apps.triage.models import TriageSession
from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
from apps.mental_health.models import MoodEntry
from apps.medications.models import PatientMedication
from apps.lab_results.models import LabResult

logger = logging.getLogger("apps.authentication")


def generate_patient_pdf(user) -> HttpResponse:
    """Generate and return a PDF health summary as an HTTP response."""
    try:
        from weasyprint import HTML
    except ImportError:
        logger.error("WeasyPrint not installed.")
        raise

    since = timezone.now() - timedelta(days=30)

    triage_sessions = TriageSession.objects.filter(patient=user).order_by("-created_at")[:5]
    glucose_readings = GlucoseReading.objects.filter(patient=user, recorded_at__gte=since).order_by("-recorded_at")[:10]
    bp_readings = BloodPressureReading.objects.filter(patient=user, recorded_at__gte=since).order_by("-recorded_at")[:10]
    mood_entries = MoodEntry.objects.filter(patient=user, recorded_at__gte=since).order_by("-recorded_at")[:10]
    medications = PatientMedication.objects.filter(patient=user, is_active=True).select_related("medication")
    lab_results = LabResult.objects.filter(patient=user).order_by("-test_date")[:3]

    generated_at = timezone.now().strftime("%d %B %Y, %H:%M")

    def urgency_color(level):
        return {"emergency": "#dc2626", "doctor_visit": "#d97706", "self_care": "#059669"}.get(level, "#6b7280")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: Arial, sans-serif; color: #111; margin: 40px; font-size: 12px; }}
        h1 {{ color: #064e3b; font-size: 22px; margin-bottom: 4px; }}
        h2 {{ color: #064e3b; font-size: 15px; border-bottom: 2px solid #064e3b; padding-bottom: 4px; margin-top: 24px; }}
        h3 {{ font-size: 13px; color: #374151; margin: 8px 0 4px; }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }}
        .badge {{ display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; color: white; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
        th {{ background: #064e3b; color: white; padding: 6px 10px; text-align: left; font-size: 11px; }}
        td {{ padding: 5px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }}
        tr:nth-child(even) td {{ background: #f9fafb; }}
        .footer {{ margin-top: 40px; color: #9ca3af; font-size: 10px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }}
        .disclaimer {{ background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 14px; margin-top: 20px; font-size: 11px; color: #92400e; }}
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>SHES Health Summary</h1>
          <p style="color:#6b7280; margin:0;">Smart Health Expert System</p>
        </div>
        <div style="text-align:right; color:#6b7280;">
          <strong>{user.get_full_name()}</strong><br>
          {user.email}<br>
          {user.county or 'Kenya'}<br>
          Generated: {generated_at}
        </div>
      </div>

      <h2>Recent Triage Sessions</h2>
      {'<p style="color:#9ca3af;">No triage sessions recorded.</p>' if not triage_sessions else f"""
      <table>
        <tr><th>Date</th><th>Urgency</th><th>Symptoms</th><th>Possible Conditions</th></tr>
        {''.join(f"""<tr>
          <td>{s.created_at.strftime('%d %b %Y')}</td>
          <td><span class="badge" style="background:{urgency_color(s.urgency_level)}">{s.urgency_level.replace("_"," ").title()}</span></td>
          <td>{", ".join(sy.name for sy in s.symptoms.all()[:3]) or "—"}</td>
          <td>{", ".join(c["name"] for c in s.matched_conditions[:2]) or "—"}</td>
        </tr>""" for s in triage_sessions)}
      </table>"""}

      <h2>Active Medications</h2>
      {'<p style="color:#9ca3af;">No active medications.</p>' if not medications else f"""
      <table>
        <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Since</th></tr>
        {''.join(f"""<tr>
          <td>{m.medication.name}</td>
          <td>{m.dosage}</td>
          <td>{m.frequency.replace("_"," ").title()}</td>
          <td>{m.start_date.strftime('%d %b %Y')}</td>
        </tr>""" for m in medications)}
      </table>"""}

      <h2>Glucose Readings (Last 30 Days)</h2>
      {'<p style="color:#9ca3af;">No glucose readings recorded.</p>' if not glucose_readings else f"""
      <table>
        <tr><th>Date</th><th>Value (mg/dL)</th><th>Context</th><th>Interpretation</th></tr>
        {''.join(f"""<tr>
          <td>{r.recorded_at.strftime('%d %b %Y %H:%M')}</td>
          <td>{r.value_mg_dl}</td>
          <td>{r.context.replace("_"," ").title()}</td>
          <td>{r.interpretation[:60]}...</td>
        </tr>""" for r in glucose_readings)}
      </table>"""}

      <h2>Blood Pressure Readings (Last 30 Days)</h2>
      {'<p style="color:#9ca3af;">No BP readings recorded.</p>' if not bp_readings else f"""
      <table>
        <tr><th>Date</th><th>Systolic</th><th>Diastolic</th><th>Pulse</th><th>Classification</th></tr>
        {''.join(f"""<tr>
          <td>{r.recorded_at.strftime('%d %b %Y %H:%M')}</td>
          <td>{r.systolic}</td>
          <td>{r.diastolic}</td>
          <td>{r.pulse or "—"}</td>
          <td>{r.classification[:50]}</td>
        </tr>""" for r in bp_readings)}
      </table>"""}

      <h2>Mood Entries (Last 30 Days)</h2>
      {'<p style="color:#9ca3af;">No mood entries recorded.</p>' if not mood_entries else f"""
      <table>
        <tr><th>Date</th><th>Score</th><th>Category</th><th>Emotions</th></tr>
        {''.join(f"""<tr>
          <td>{m.recorded_at.strftime('%d %b %Y')}</td>
          <td>{m.mood_score}/10</td>
          <td>{m.mood_category.title()}</td>
          <td>{", ".join(m.emotions[:3]) or "—"}</td>
        </tr>""" for m in mood_entries)}
      </table>"""}

      <h2>Recent Lab Results</h2>
      {'<p style="color:#9ca3af;">No lab results submitted.</p>' if not lab_results else
        ''.join(f"""
        <h3>{lr.lab_name or "Lab Report"} — {lr.test_date.strftime('%d %b %Y')}</h3>
        <table>
          <tr><th>Test</th><th>Value</th><th>Unit</th><th>Status</th></tr>
          {''.join(f"""<tr>
            <td>{item.get("test_name","")}</td>
            <td>{item.get("value","")}</td>
            <td>{item.get("unit","")}</td>
            <td>{item.get("status","").upper()}</td>
          </tr>""" for item in lr.interpreted_results[:8])}
        </table>""" for lr in lab_results)}

      <div class="disclaimer">
        ⚕ This report is generated by the Smart Health Expert System (SHES) for
        informational purposes only. It does not constitute a medical diagnosis.
        Please share this report with your healthcare provider for professional interpretation.
      </div>

      <div class="footer">
        SHES — Smart Health Expert System ·<br>
        Generated {generated_at} · For personal use only
      </div>
    </body>
    </html>
    """

    pdf_bytes = HTML(string=html_content).write_pdf()
    filename  = f"SHES_Health_Summary_{user.get_full_name().replace(' ', '_')}_{timezone.now().strftime('%Y%m%d')}.pdf"

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response