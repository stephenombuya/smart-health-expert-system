from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PatientProfile, Notification, EmailVerificationToken, PasswordResetToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "first_name", "last_name", "role", "auth_provider", "is_email_verified", "is_active", "created_at")
    list_filter = ("role", "is_active", "is_email_verified", "auth_provider", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "date_of_birth", "phone_number", "county", "auth_provider", "google_id")}),
        ("Permissions", {"fields": ("role", "is_active", "is_email_verified", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "first_name", "last_name", "role", "password1", "password2")}),
    )


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "blood_group", "updated_at")
    search_fields = ("user__email",)

@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "created_at")
    search_fields = ("user__email",)
    readonly_fields = ("token", "created_at")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "used", "expires_at", "created_at")
    list_filter = ("used",)
    search_fields = ("user__email",)
    readonly_fields = ("token", "created_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("user", "title", "type", "read", "created_at")
    list_filter   = ("type", "read")
    search_fields = ("user__email", "title")
    ordering      = ("-created_at",)