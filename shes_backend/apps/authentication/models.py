"""
SHES Authentication – Models
Custom User model supporting Patient, Doctor, and Admin roles.
"""
import secrets
import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager that uses email as the primary identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Primary user entity for SHES.
    Roles drive permissions throughout the system.
    """

    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        DOCTOR = "doctor", "Doctor"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    date_of_birth = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(
        upload_to="profile_photos/",
        null=True,
        blank=True,
        help_text="Profile photo for the user.",
    )
    county = models.CharField(max_length=100, blank=True, help_text="Kenyan county of residence")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(
    default=False,
    help_text="True once the user has clicked the verification link sent to their email.",
    )
    google_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        unique=True,
        help_text="Google OAuth ID for users who sign up via Google.",
    )
    auth_provider = models.CharField(
        max_length=20,
        default="email",
        help_text="Authentication provider: 'email' for standard sign-up, 'google' for Google OAuth.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR


class PatientProfile(models.Model):
    """Extended medical profile for patient users."""

    class BloodGroup(models.TextChoices):
        A_POS = "A+", "A+"
        A_NEG = "A-", "A-"
        B_POS = "B+", "B+"
        B_NEG = "B-", "B-"
        AB_POS = "AB+", "AB+"
        AB_NEG = "AB-", "AB-"
        O_POS = "O+", "O+"
        O_NEG = "O-", "O-"
        UNKNOWN = "Unknown", "Unknown"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="patient_profile")
    blood_group = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    known_allergies = models.TextField(blank=True, help_text="Comma-separated list of known allergens")
    chronic_conditions = models.TextField(blank=True, help_text="Pre-diagnosed chronic conditions")
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.get_full_name()}"
    
# ─── Token lifetime constants ─────────────────────────────────────────────────
EMAIL_VERIFY_TOKEN_HOURS = 24
PASSWORD_RESET_TOKEN_MINUTES = 60


def _default_verify_expiry():
    return timezone.now() + timedelta(hours=EMAIL_VERIFY_TOKEN_HOURS)


def _default_reset_expiry():
    return timezone.now() + timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES)


class EmailVerificationToken(models.Model):
    """
    One-time token emailed to a new user.
    Clicking the link marks their account as verified.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        default=secrets.token_urlsafe,
    )
    expires_at = models.DateTimeField(default=_default_verify_expiry)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"EmailVerify – {self.user.email}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @classmethod
    def create_for_user(cls, user) -> "EmailVerificationToken":
        """Delete old tokens for this user and create a fresh one."""
        cls.objects.filter(user=user).delete()
        return cls.objects.create(user=user)


class PasswordResetToken(models.Model):
    """
    One-time token emailed when a user requests a password reset.
    Valid for PASSWORD_RESET_TOKEN_MINUTES minutes and consumed on use.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        default=secrets.token_urlsafe,
    )
    expires_at = models.DateTimeField(default=_default_reset_expiry)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PasswordReset – {self.user.email}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.used and not self.is_expired

    @classmethod
    def create_for_user(cls, user) -> "PasswordResetToken":
        """Invalidate all previous reset tokens and issue a new one."""
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(user=user)

class Notification(models.Model):
    """
    In-app notification for a user.
    Generated by health alert triggers and medication reminders.
    """
    class NotificationType(models.TextChoices):
        HEALTH_ALERT  = "health_alert",   "Health Alert"
        MED_REMINDER  = "med_reminder",   "Medication Reminder"
        SYSTEM        = "system",         "System"

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    type       = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    read       = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} — {self.title}"
    

class HealthAction(models.Model):
    """
    A personalised improvement action generated for a patient
    based on analysis of their health data across all modules.
    """
    class Priority(models.TextChoices):
        URGENT   = "urgent",   "Urgent"
        HIGH     = "high",     "High"
        MEDIUM   = "medium",   "Medium"
        LOW      = "low",      "Low"

    class Category(models.TextChoices):
        GLUCOSE     = "glucose",      "Glucose Management"
        BP          = "blood_pressure","Blood Pressure"
        MOOD        = "mood",          "Mental Health"
        MEDICATION  = "medication",    "Medication"
        LIFESTYLE   = "lifestyle",     "Lifestyle"
        TRIAGE      = "triage",        "Medical Review"
        WEARABLE    = "wearable",      "Activity & Fitness"
        LAB         = "lab",           "Lab Results"

    user        = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="health_actions"
    )
    title       = models.CharField(max_length=300)
    description = models.TextField()
    category    = models.CharField(max_length=20, choices=Category.choices)
    priority    = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    icon        = models.CharField(max_length=10, default="💡")
    completed   = models.BooleanField(default=False)
    dismissed   = models.BooleanField(default=False)
    # Evidence that triggered this action
    evidence    = models.JSONField(default=dict, blank=True)
    # When to stop showing this action (auto-expire)
    expires_at  = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            models.Case(
                models.When(priority="urgent", then=0),
                models.When(priority="high",   then=1),
                models.When(priority="medium", then=2),
                models.When(priority="low",    then=3),
                default=4,
                output_field=models.IntegerField(),
            ),
            "-created_at",
        ]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title} — {self.user.email}"


