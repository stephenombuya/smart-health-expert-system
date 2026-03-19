"""
SHES Authentication – Email Utilities
Sends transactional emails for email verification and password reset.
Development: Django's console backend prints emails to the terminal.
Production:  configure SMTP via environment variables.
"""
import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger("apps.authentication")


def _build_url(path: str) -> str:
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}{path}"


def send_verification_email(user, token: str) -> bool:
    verify_url = _build_url(f"/verify-email?token={token}")
    subject = "Verify your SHES account"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #111; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
      <h2>Welcome, {user.first_name}!</h2>
      <p>Please verify your email address to activate your SHES account.</p>
      <div style="margin: 32px 0;">
        <a href="{verify_url}"
           style="background: #064e3b; color: white; padding: 14px 32px; border-radius: 10px;
                  text-decoration: none; font-weight: 600; font-size: 15px;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #888; font-size: 13px;">
        This link expires in <strong>24 hours</strong>.
        If you did not create an account, please ignore this email.
      </p>
    </body>
    </html>
    """
    plain_message = (
        f"Welcome to SHES, {user.first_name}!\n\n"
        f"Verify your email address by visiting:\n{verify_url}\n\n"
        f"This link expires in 24 hours."
    )
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Verification email sent to %s", user.email)
        return True
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", user.email, exc)
        return False


def send_password_reset_email(user, token: str) -> bool:
    reset_url = _build_url(f"/reset-password?token={token}")
    subject = "Reset your SHES password"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #111; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
      <h2>Password Reset Request</h2>
      <p>Hi {user.first_name}, we received a request to reset the password for
         <strong>{user.email}</strong>.</p>
      <div style="margin: 32px 0;">
        <a href="{reset_url}"
           style="background: #064e3b; color: white; padding: 14px 32px; border-radius: 10px;
                  text-decoration: none; font-weight: 600; font-size: 15px;">
          Reset My Password
        </a>
      </div>
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px;
                  padding: 16px; margin: 24px 0;">
        <p style="color: #9a3412; font-size: 13px; margin: 0;">
          This link expires in <strong>60 minutes</strong>.
          If you did not request this, ignore this email.
        </p>
      </div>
    </body>
    </html>
    """
    plain_message = (
        f"Hi {user.first_name},\n\n"
        f"Reset your SHES password:\n{reset_url}\n\n"
        f"This link expires in 60 minutes."
    )
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Password reset email sent to %s", user.email)
        return True
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", user.email, exc)
        return False