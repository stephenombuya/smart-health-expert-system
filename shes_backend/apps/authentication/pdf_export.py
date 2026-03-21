"""
SHES – PDF Health Summary Export
Uses ReportLab (no system dependencies required).
"""
import logging
from io import BytesIO
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger("apps.authentication")


def generate_patient_pdf(user) -> HttpResponse:
    """Generate and return a PDF health summary as an HTTP response."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        raise ImportError("reportlab is not installed. Run: pip install reportlab")

    from apps.triage.models import TriageSession
    from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
    from apps.mental_health.models import MoodEntry
    from apps.medications.models import PatientMedication
    from apps.lab_results.models import LabResult

    since = timezone.now() - timedelta(days=30)

    triage_sessions  = TriageSession.objects.filter(patient=user).order_by("-created_at")[:5]
    glucose_readings = GlucoseReading.objects.filter(patient=user, recorded_at__gte=since).order_by("-recorded_at")[:10]
    bp_readings      = BloodPressureReading.objects.filter(patient=user, recorded_at__gte=since).order_by("-recorded_at")[:10]
    mood_entries     = MoodEntry.objects.filter(patient=user, recorded_at__gte=since).order_by("-recorded_at")[:10]
    medications      = PatientMedication.objects.filter(patient=user, is_active=True).select_related("medication")
    lab_results      = LabResult.objects.filter(patient=user).order_by("-test_date")[:3]

    # ── Colours ───────────────────────────────────────────────────────────────
    PRIMARY      = colors.HexColor("#064e3b")
    LIGHT_GREEN  = colors.HexColor("#ecfdf5")
    LIGHT_GRAY   = colors.HexColor("#f9fafb")
    MED_GRAY     = colors.HexColor("#6b7280")
    RED          = colors.HexColor("#dc2626")
    AMBER        = colors.HexColor("#d97706")
    GREEN        = colors.HexColor("#059669")

    URGENCY_COLORS = {
        "emergency":    RED,
        "doctor_visit": AMBER,
        "self_care":    GREEN,
        "undetermined": MED_GRAY,
    }

    # ── Styles ────────────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title", parent=styles["Normal"],
        fontSize=20, textColor=PRIMARY, fontName="Helvetica-Bold",
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=10, textColor=MED_GRAY,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Normal"],
        fontSize=13, textColor=PRIMARY, fontName="Helvetica-Bold",
        spaceBefore=16, spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#374151"),
    )
    small_style = ParagraphStyle(
        "Small", parent=styles["Normal"],
        fontSize=8, textColor=MED_GRAY,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#92400e"),
        backColor=colors.HexColor("#fff7ed"),
        borderPad=8,
    )

    def section_table_style(header_color=PRIMARY):
        return TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), header_color),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, 0), 8),
            ("FONTSIZE",    (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("GRID",        (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
            ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ])

    # ── Build document ────────────────────────────────────────────────────────
    buffer   = BytesIO()
    doc      = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    story    = []
    width    = A4[0] - 4*cm
    gen_date = timezone.now().strftime("%d %B %Y, %H:%M")

    # ── Header ────────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("SHES Health Summary", title_style),
        Paragraph(
            f"<b>{user.get_full_name()}</b><br/>"
            f"{user.email}<br/>"
            f"{user.county or 'Kenya'}<br/>"
            f"Generated: {gen_date}",
            body_style,
        ),
    ]]
    header_table = Table(header_data, colWidths=[width * 0.6, width * 0.4])
    header_table.setStyle(TableStyle([
        ("VALIGN",  (0, 0), (-1, -1), "TOP"),
        ("ALIGN",   (1, 0), (1, 0),   "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width=width, color=PRIMARY, thickness=1.5))
    story.append(Spacer(1, 4))

    # ── Triage Sessions ───────────────────────────────────────────────────────
    story.append(Paragraph("Recent Triage Sessions", section_style))
    if not triage_sessions:
        story.append(Paragraph("No triage sessions recorded.", small_style))
    else:
        rows = [["Date", "Urgency", "Symptoms", "Possible Conditions"]]
        for s in triage_sessions:
            symptoms   = ", ".join(sy.name for sy in s.symptoms.all()[:3]) or "-"
            conditions = ", ".join(c["name"] for c in s.matched_conditions[:2]) or "-"
            urgency    = s.urgency_level.replace("_", " ").title()
            rows.append([
                s.created_at.strftime("%d %b %Y"),
                urgency,
                symptoms[:40],
                conditions[:40],
            ])
        t = Table(rows, colWidths=[width*0.15, width*0.2, width*0.32, width*0.33])
        t.setStyle(section_table_style())
        story.append(t)

    # ── Active Medications ────────────────────────────────────────────────────
    story.append(Paragraph("Active Medications", section_style))
    if not medications:
        story.append(Paragraph("No active medications.", small_style))
    else:
        rows = [["Medication", "Dosage", "Frequency", "Since"]]
        for m in medications:
            rows.append([
                m.medication.name,
                m.dosage,
                m.frequency.replace("_", " ").title(),
                m.start_date.strftime("%d %b %Y"),
            ])
        t = Table(rows, colWidths=[width*0.35, width*0.2, width*0.25, width*0.2])
        t.setStyle(section_table_style())
        story.append(t)

    # ── Glucose Readings ──────────────────────────────────────────────────────
    story.append(Paragraph("Glucose Readings (Last 30 Days)", section_style))
    if not glucose_readings:
        story.append(Paragraph("No glucose readings recorded.", small_style))
    else:
        rows = [["Date", "Value (mg/dL)", "Context", "Interpretation"]]
        for r in glucose_readings:
            rows.append([
                r.recorded_at.strftime("%d %b %Y %H:%M"),
                str(r.value_mg_dl),
                r.context.replace("_", " ").title(),
                r.interpretation[:55],
            ])
        t = Table(rows, colWidths=[width*0.2, width*0.15, width*0.2, width*0.45])
        t.setStyle(section_table_style())
        story.append(t)

    # ── Blood Pressure ────────────────────────────────────────────────────────
    story.append(Paragraph("Blood Pressure Readings (Last 30 Days)", section_style))
    if not bp_readings:
        story.append(Paragraph("No blood pressure readings recorded.", small_style))
    else:
        rows = [["Date", "Systolic", "Diastolic", "Pulse", "Classification"]]
        for r in bp_readings:
            rows.append([
                r.recorded_at.strftime("%d %b %Y %H:%M"),
                str(r.systolic),
                str(r.diastolic),
                str(r.pulse) if r.pulse else "-",
                r.classification[:45],
            ])
        t = Table(rows, colWidths=[width*0.22, width*0.12, width*0.12, width*0.1, width*0.44])
        t.setStyle(section_table_style())
        story.append(t)

    # ── Mood Entries ──────────────────────────────────────────────────────────
    story.append(Paragraph("Mood Entries (Last 30 Days)", section_style))
    if not mood_entries:
        story.append(Paragraph("No mood entries recorded.", small_style))
    else:
        rows = [["Date", "Score", "Category", "Emotions"]]
        for m in mood_entries:
            rows.append([
                m.recorded_at.strftime("%d %b %Y"),
                f"{m.mood_score}/10",
                m.mood_category.title(),
                ", ".join(m.emotions[:3]) or "-",
            ])
        t = Table(rows, colWidths=[width*0.2, width*0.1, width*0.15, width*0.55])
        t.setStyle(section_table_style())
        story.append(t)

    # ── Lab Results ───────────────────────────────────────────────────────────
    story.append(Paragraph("Recent Lab Results", section_style))
    if not lab_results:
        story.append(Paragraph("No lab results submitted.", small_style))
    else:
        for lr in lab_results:
            lab_name = lr.lab_name or "Lab Report"
            story.append(Paragraph(
                f"{lab_name} - {lr.test_date.strftime('%d %b %Y')}",
                body_style,
            ))
            story.append(Spacer(1, 4))
            rows = [["Test", "Value", "Unit", "Status"]]
            for item in lr.interpreted_results[:8]:
                rows.append([
                    item.get("test_name", ""),
                    str(item.get("value", "")),
                    item.get("unit", ""),
                    item.get("status", "").upper(),
                ])
            t = Table(rows, colWidths=[width*0.4, width*0.2, width*0.15, width*0.25])
            t.setStyle(section_table_style())
            story.append(t)
            story.append(Spacer(1, 8))

    # ── Disclaimer ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width=width, color=colors.HexColor("#e5e7eb"), thickness=0.5))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "This report is generated by the Smart Health Expert System (SHES) for informational "
        "purposes only. It does not constitute a medical diagnosis. Please share this report "
        "with your healthcare provider for professional interpretation.",
        disclaimer_style,
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"SHES - Smart Health Expert System |  {gen_date}",
        small_style,
    ))

    # ── Build PDF ─────────────────────────────────────────────────────────────
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = (
        f"SHES_Health_Summary_"
        f"{user.get_full_name().replace(' ', '_')}_"
        f"{timezone.now().strftime('%Y%m%d')}.pdf"
    )

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    logger.info("PDF generated for user %s", user.pk)
    return response