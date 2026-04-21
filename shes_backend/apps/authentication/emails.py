"""
SHES – Email Service
======================
Sends all transactional emails via Gmail SMTP.

Email types:
  1. Email verification (on registration)
  2. Password reset
  3. Health alert notification
  4. Medication reminder
  5. Weekly health report summary

All emails are:
  - Responsive HTML with a plain-text fallback
  - Branded with SHES green (#064e3b)
  - Mobile-optimised
  - Compliant with Kenya Data Protection Act 2019
"""
import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger("apps.authentication")


# ─── Shared template helpers ──────────────────────────────────────────────────

def _email_header(title: str) -> str:
    return f"""
    <div style="background:#064e3b; padding:24px 32px; border-radius:12px 12px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="color:#ffffff; font-size:22px; font-weight:700;
                         font-family:Arial,sans-serif; letter-spacing:-0.5px;">
              &#x2665; SHES
            </span>
            <span style="color:#6ee7b7; font-size:11px; margin-left:8px;
                         font-family:Arial,sans-serif;">
              Smart Health Expert System
            </span>
          </td>
        </tr>
      </table>
      <h1 style="color:#ffffff; font-size:20px; font-weight:600; margin:16px 0 0;
                  font-family:Arial,sans-serif;">
        {title}
      </h1>
    </div>
    """


def _email_footer() -> str:
    year = timezone.now().year
    return f"""
    <div style="background:#f9fafb; padding:20px 32px;
                border-top:1px solid #e5e7eb; border-radius:0 0 12px 12px;">
      <p style="color:#9ca3af; font-size:11px; font-family:Arial,sans-serif;
                 margin:0; line-height:1.6; text-align:center;">
        &copy; {year} Smart Health Expert System &middot;
        Co-operative University of Kenya<br/>
        This is an automated message from SHES.
        Please do not reply to this email.<br/>
        <span style="color:#d1fae5;">
          Kenya Data Protection Act 2019 Compliant
        </span>
      </p>
    </div>
    """


def _wrap_email(body: str) -> str:
    """Wrap email body in the full HTML shell."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SHES Health System</title>
    </head>
    <body style="margin:0; padding:20px; background:#f3f4f6;
                 font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="max-width:600px; width:100%; background:#ffffff;
                          border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.07);
                          overflow:hidden;">
              <tr><td>{body}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def _cta_button(text: str, url: str, color: str = "#064e3b") -> str:
    return f"""
    <div style="text-align:center; margin:28px 0;">
      <a href="{url}"
         style="background:{color}; color:#ffffff; padding:14px 36px;
                border-radius:10px; text-decoration:none; font-weight:600;
                font-size:15px; font-family:Arial,sans-serif;
                display:inline-block; letter-spacing:0.3px;">
        {text}
      </a>
    </div>
    """


def _send_email(
    to_email:      str,
    subject:       str,
    html_content:  str,
    text_content:  str,
) -> bool:
    """
    Core send function with error handling and retry-safe design.
    Returns True on success, False on failure.
    """
    try:
        msg = EmailMultiAlternatives(
            subject      = subject,
            body         = text_content,
            from_email   = settings.DEFAULT_FROM_EMAIL,
            to           = [to_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info("Email sent: subject='%s' to='%s'", subject, to_email)
        return True
    except Exception as exc:
        logger.error(
            "Failed to send email: subject='%s' to='%s' error='%s'",
            subject, to_email, exc
        )
        return False


# ─── 1. Email Verification ────────────────────────────────────────────────────

def send_verification_email(user, token: str) -> bool:
    """
    Sent immediately after registration.
    Contains a 24-hour verification link.
    """
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    body = f"""
    {_email_header("Verify Your Email Address")}
    <div style="padding:32px;">
      <p style="color:#374151; font-size:15px; margin:0 0 16px;
                 font-family:Arial,sans-serif;">
        Hi <strong>{user.first_name}</strong>,
      </p>
      <p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 20px;
                 font-family:Arial,sans-serif;">
        Welcome to the <strong>Smart Health Expert System (SHES)</strong> —
        your AI-powered health companion designed for Kenya's healthcare context.
      </p>
      <p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 24px;
                 font-family:Arial,sans-serif;">
        Please verify your email address to activate your account and access
        all features including symptom triage, medication tracking, and
        personalised health insights.
      </p>

      {_cta_button("Verify My Email Address", verify_url)}

      <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:10px;
                   padding:14px 18px; margin:24px 0;">
        <p style="color:#92400e; font-size:12px; margin:0; font-family:Arial,sans-serif;">
          &#9888;&nbsp; This link expires in <strong>24 hours</strong>.
          If you did not create a SHES account, please ignore this email.
          Your email will not be used without verification.
        </p>
      </div>

      <p style="color:#6b7280; font-size:12px; margin:0; font-family:Arial,sans-serif;">
        If the button above doesn't work, copy and paste this link into your browser:<br/>
        <a href="{verify_url}" style="color:#064e3b; word-break:break-all;">
          {verify_url}
        </a>
      </p>
    </div>
    {_email_footer()}
    """

    text = (
        f"Hi {user.first_name},\n\n"
        f"Welcome to SHES — Smart Health Expert System.\n\n"
        f"Verify your email address:\n{verify_url}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"If you didn't create this account, ignore this email."
    )

    return _send_email(
        to_email     = user.email,
        subject      = "Verify your SHES account",
        html_content = _wrap_email(body),
        text_content = text,
    )


# ─── 2. Password Reset ────────────────────────────────────────────────────────

def send_password_reset_email(user, token: str) -> bool:
    """
    Sent when a user requests a password reset.
    Link is valid for 60 minutes.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    body = f"""
    {_email_header("Reset Your Password")}
    <div style="padding:32px;">
      <p style="color:#374151; font-size:15px; margin:0 0 16px;
                 font-family:Arial,sans-serif;">
        Hi <strong>{user.first_name}</strong>,
      </p>
      <p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 20px;
                 font-family:Arial,sans-serif;">
        We received a request to reset the password for your SHES account
        associated with <strong>{user.email}</strong>.
      </p>
      <p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 24px;
                 font-family:Arial,sans-serif;">
        Click the button below to choose a new password:
      </p>

      {_cta_button("Reset My Password", reset_url)}

      <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:10px;
                   padding:14px 18px; margin:24px 0;">
        <p style="color:#92400e; font-size:12px; margin:0 0 6px;
                   font-family:Arial,sans-serif; font-weight:600;">
          &#9888;&nbsp; Security Notice
        </p>
        <p style="color:#92400e; font-size:12px; margin:0;
                   font-family:Arial,sans-serif; line-height:1.6;">
          This link expires in <strong>60 minutes</strong>.
          If you did not request a password reset, your account is safe —
          simply ignore this email. Never share this link with anyone,
          including SHES support staff.
        </p>
      </div>

      <p style="color:#6b7280; font-size:12px; margin:0; font-family:Arial,sans-serif;">
        If the button doesn't work:<br/>
        <a href="{reset_url}" style="color:#064e3b; word-break:break-all;">
          {reset_url}
        </a>
      </p>
    </div>
    {_email_footer()}
    """

    text = (
        f"Hi {user.first_name},\n\n"
        f"Reset your SHES password:\n{reset_url}\n\n"
        f"This link expires in 60 minutes.\n"
        f"If you didn't request this, ignore this email."
    )

    return _send_email(
        to_email     = user.email,
        subject      = "Reset your SHES password",
        html_content = _wrap_email(body),
        text_content = text,
    )


# ─── 3. Health Alert Email ────────────────────────────────────────────────────

def send_health_alert_email(user, alert_title: str, alert_message: str,
                             category: str = "health", priority: str = "high") -> bool:
    """
    Sent when the system detects a concerning health trend.
    Examples: glucose trending high, BP crisis reading, low mood streak.
    """
    priority_colors = {
        "urgent": ("#dc2626", "#fee2e2", "#991b1b"),
        "high":   ("#d97706", "#fef3c7", "#92400e"),
        "medium": ("#2563eb", "#dbeafe", "#1e40af"),
        "low":    ("#059669", "#d1fae5", "#065f46"),
    }
    border_color, bg_color, text_color = priority_colors.get(
        priority, priority_colors["high"]
    )

    category_icons = {
        "glucose":       "🩸",
        "blood_pressure":"❤️",
        "mood":          "🧠",
        "medication":    "💊",
        "lab":           "🔬",
        "wearable":      "⌚",
        "triage":        "🩺",
    }
    icon = category_icons.get(category, "⚕️")

    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

    body = f"""
    {_email_header(f"{icon} Health Alert — Action Required")}
    <div style="padding:32px;">
      <p style="color:#374151; font-size:15px; margin:0 0 20px;
                 font-family:Arial,sans-serif;">
        Hi <strong>{user.first_name}</strong>,
      </p>

      <div style="background:{bg_color}; border-left:4px solid {border_color};
                   border-radius:8px; padding:18px 20px; margin:0 0 24px;">
        <p style="color:{text_color}; font-size:14px; font-weight:600;
                   margin:0 0 8px; font-family:Arial,sans-serif;">
          {alert_title}
        </p>
        <p style="color:{text_color}; font-size:13px; line-height:1.7;
                   margin:0; font-family:Arial,sans-serif;">
          {alert_message}
        </p>
      </div>

      <p style="color:#4b5563; font-size:13px; line-height:1.7;
                 margin:0 0 20px; font-family:Arial,sans-serif;">
        Your SHES health monitoring system has detected this trend based on
        your logged health data. Early awareness allows you to take action
        before the situation becomes serious.
      </p>

      {_cta_button("View My Health Dashboard", dashboard_url)}

      <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px;
                   padding:14px 18px; margin:24px 0;">
        <p style="color:#166534; font-size:12px; margin:0 0 4px;
                   font-weight:600; font-family:Arial,sans-serif;">
          ⚕️ Medical Disclaimer
        </p>
        <p style="color:#166534; font-size:12px; margin:0;
                   font-family:Arial,sans-serif; line-height:1.6;">
          This alert is generated by an AI monitoring system for informational
          purposes only. It does not constitute medical advice. Please consult
          a qualified healthcare provider for diagnosis and treatment.
        </p>
      </div>

      <p style="color:#6b7280; font-size:12px; margin:0;
                 font-family:Arial,sans-serif; line-height:1.6;">
        Kenya emergency: <strong>999 or 112</strong> &nbsp;|&nbsp;
        Befrienders Kenya: <strong>0800 723 253</strong> (free, 24/7)
      </p>
    </div>
    {_email_footer()}
    """

    text = (
        f"Hi {user.first_name},\n\n"
        f"HEALTH ALERT: {alert_title}\n\n"
        f"{alert_message}\n\n"
        f"View your dashboard: {dashboard_url}\n\n"
        f"This is an AI-generated alert. Please consult a healthcare provider.\n"
        f"Kenya emergency: 999 | Befrienders Kenya: 0800 723 253"
    )

    return _send_email(
        to_email     = user.email,
        subject      = f"SHES Health Alert: {alert_title}",
        html_content = _wrap_email(body),
        text_content = text,
    )


# ─── 4. Medication Reminder ───────────────────────────────────────────────────

def send_medication_reminder_email(user, medications: list) -> bool:
    """
    Daily medication reminder.
    medications: list of dicts with keys: name, dosage, frequency, time
    """
    if not medications:
        return False

    med_rows = ""
    for med in medications:
        med_rows += f"""
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #f3f4f6;
                     font-family:Arial,sans-serif;">
            <strong style="color:#111827; font-size:13px;">{med.get('name', '')}</strong>
          </td>
          <td style="padding:10px 14px; border-bottom:1px solid #f3f4f6;
                     color:#4b5563; font-size:13px; font-family:Arial,sans-serif;">
            {med.get('dosage', '')}
          </td>
          <td style="padding:10px 14px; border-bottom:1px solid #f3f4f6;
                     color:#4b5563; font-size:13px; font-family:Arial,sans-serif;">
            {med.get('frequency', '').replace('_', ' ').title()}
          </td>
        </tr>
        """

    today       = timezone.now().strftime("%A, %d %B %Y")
    med_url     = f"{settings.FRONTEND_URL}/medications"

    body = f"""
    {_email_header("💊 Daily Medication Reminder")}
    <div style="padding:32px;">
      <p style="color:#374151; font-size:15px; margin:0 0 8px;
                 font-family:Arial,sans-serif;">
        Good morning, <strong>{user.first_name}</strong>!
      </p>
      <p style="color:#6b7280; font-size:13px; margin:0 0 24px;
                 font-family:Arial,sans-serif;">
        {today}
      </p>
      <p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 20px;
                 font-family:Arial,sans-serif;">
        Here are your medications for today. Consistent adherence is essential
        for managing your health effectively.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
        <thead>
          <tr style="background:#064e3b;">
            <th style="padding:10px 14px; text-align:left; color:#ffffff;
                       font-size:12px; font-family:Arial,sans-serif;">
              Medication
            </th>
            <th style="padding:10px 14px; text-align:left; color:#ffffff;
                       font-size:12px; font-family:Arial,sans-serif;">
              Dosage
            </th>
            <th style="padding:10px 14px; text-align:left; color:#ffffff;
                       font-size:12px; font-family:Arial,sans-serif;">
              Frequency
            </th>
          </tr>
        </thead>
        <tbody>
          {med_rows}
        </tbody>
      </table>

      {_cta_button("View Medications", med_url)}

      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px;
                   padding:14px 18px; margin:24px 0;">
        <p style="color:#1e40af; font-size:12px; margin:0;
                   font-family:Arial,sans-serif; line-height:1.6;">
          💡 <strong>Tip:</strong> Take medications at the same time each day to
          build a consistent routine. Log any side effects in the SHES app so
          your doctor can monitor them.
        </p>
      </div>
    </div>
    {_email_footer()}
    """

    med_list = "\n".join(
        f"  • {m.get('name','')} — {m.get('dosage','')} {m.get('frequency','').replace('_',' ').title()}"
        for m in medications
    )
    text = (
        f"Good morning, {user.first_name}!\n\n"
        f"Your medications for today ({today}):\n\n{med_list}\n\n"
        f"View your medications: {med_url}\n\n"
        f"Remember: consistent adherence is key to managing your health."
    )

    return _send_email(
        to_email     = user.email,
        subject      = f"SHES Medication Reminder — {today}",
        html_content = _wrap_email(body),
        text_content = text,
    )


# ─── 5. Weekly Health Report ──────────────────────────────────────────────────

def send_weekly_health_report_email(user, report_data: dict) -> bool:
    """
    Sent every Sunday with a weekly health summary.
    report_data keys: avg_glucose, avg_systolic, avg_diastolic,
                      avg_mood, triage_count, actions_completed,
                      top_action, week_label
    """
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    week_label    = report_data.get("week_label", "This Week")

    def _metric_cell(label, value, unit, status_color="#059669"):
        return f"""
        <td style="padding:16px; text-align:center; border-right:1px solid #f3f4f6;">
          <p style="color:{status_color}; font-size:24px; font-weight:700;
                     margin:0; font-family:Arial,sans-serif;">
            {value if value is not None else "—"}
            <span style="font-size:12px; font-weight:400; color:#6b7280;">
              {unit if value is not None else ""}
            </span>
          </p>
          <p style="color:#9ca3af; font-size:11px; margin:4px 0 0;
                     font-family:Arial,sans-serif;">
            {label}
          </p>
        </td>
        """

    avg_glucose  = report_data.get("avg_glucose")
    avg_systolic = report_data.get("avg_systolic")
    avg_mood     = report_data.get("avg_mood")

    # Determine status colours
    glucose_color  = "#dc2626" if avg_glucose and avg_glucose > 126 else \
                     "#d97706" if avg_glucose and avg_glucose > 100 else "#059669"
    bp_color       = "#dc2626" if avg_systolic and avg_systolic >= 140 else \
                     "#d97706" if avg_systolic and avg_systolic >= 130 else "#059669"
    mood_color     = "#dc2626" if avg_mood and avg_mood < 4 else \
                     "#d97706" if avg_mood and avg_mood < 6 else "#059669"

    top_action = report_data.get("top_action", "")
    action_html = f"""
    <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px;
                 padding:16px 20px; margin:24px 0;">
      <p style="color:#166534; font-size:12px; font-weight:600; margin:0 0 6px;
                 font-family:Arial,sans-serif;">
        🎯 Top Recommended Action This Week
      </p>
      <p style="color:#166534; font-size:13px; margin:0;
                 font-family:Arial,sans-serif; line-height:1.6;">
        {top_action}
      </p>
    </div>
    """ if top_action else ""

    body = f"""
    {_email_header(f"📊 Weekly Health Report — {week_label}")}
    <div style="padding:32px;">
      <p style="color:#374151; font-size:15px; margin:0 0 20px;
                 font-family:Arial,sans-serif;">
        Hi <strong>{user.first_name}</strong>, here's your SHES health
        summary for the week.
      </p>

      <!-- Metric summary row -->
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;
                    margin:0 0 24px;">
        <thead>
          <tr style="background:#064e3b;">
            <th colspan="3" style="padding:10px 14px; text-align:left;
                                   color:#ffffff; font-size:12px;
                                   font-family:Arial,sans-serif;">
              7-Day Averages
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {_metric_cell("Fasting Glucose",
              f"{avg_glucose:.0f}" if avg_glucose else None,
              "mg/dL", glucose_color)}
            {_metric_cell("Systolic BP",
              f"{avg_systolic:.0f}" if avg_systolic else None,
              "mmHg", bp_color)}
            {_metric_cell("Mood Score",
              f"{avg_mood:.1f}" if avg_mood else None,
              "/10", mood_color)}
          </tr>
        </tbody>
      </table>

      <!-- Activity summary -->
      <table width="100%" cellpadding="0" cellspacing="0"
             style="margin:0 0 24px;">
        <tr>
          <td width="50%" style="padding-right:8px;">
            <div style="background:#f3f4f6; border-radius:10px; padding:14px;
                         text-align:center;">
              <p style="color:#111827; font-size:22px; font-weight:700;
                         margin:0; font-family:Arial,sans-serif;">
                {report_data.get('triage_count', 0)}
              </p>
              <p style="color:#6b7280; font-size:11px; margin:4px 0 0;
                         font-family:Arial,sans-serif;">
                Triage Sessions
              </p>
            </div>
          </td>
          <td width="50%" style="padding-left:8px;">
            <div style="background:#f3f4f6; border-radius:10px; padding:14px;
                         text-align:center;">
              <p style="color:#111827; font-size:22px; font-weight:700;
                         margin:0; font-family:Arial,sans-serif;">
                {report_data.get('actions_completed', 0)}
              </p>
              <p style="color:#6b7280; font-size:11px; margin:4px 0 0;
                         font-family:Arial,sans-serif;">
                Actions Completed
              </p>
            </div>
          </td>
        </tr>
      </table>

      {action_html}

      {_cta_button("Open My Health Dashboard", dashboard_url)}

      <p style="color:#9ca3af; font-size:11px; text-align:center; margin:0;
                 font-family:Arial,sans-serif;">
        You're receiving this weekly report because you're a SHES patient.
        Log into your account to manage notification preferences.
      </p>
    </div>
    {_email_footer()}
    """

    text = (
        f"Hi {user.first_name},\n\n"
        f"Your SHES Weekly Health Report — {week_label}\n"
        f"{'=' * 50}\n\n"
        f"7-Day Averages:\n"
        f"  Fasting Glucose: {f'{avg_glucose:.0f} mg/dL' if avg_glucose else 'No data'}\n"
        f"  Systolic BP:     {f'{avg_systolic:.0f} mmHg' if avg_systolic else 'No data'}\n"
        f"  Mood Score:      {f'{avg_mood:.1f}/10' if avg_mood else 'No data'}\n\n"
        f"Activity:\n"
        f"  Triage sessions: {report_data.get('triage_count', 0)}\n"
        f"  Actions completed: {report_data.get('actions_completed', 0)}\n\n"
        f"{f'Top action: {top_action}' if top_action else ''}\n\n"
        f"View your dashboard: {dashboard_url}"
    )

    return _send_email(
        to_email     = user.email,
        subject      = f"SHES Weekly Health Report — {week_label}",
        html_content = _wrap_email(body),
        text_content = text,
    )