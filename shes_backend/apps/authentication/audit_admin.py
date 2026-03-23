"""
SHES – Audit Log Admin
Custom Django admin view with colour-coded status, filtering,
search, and CSV export.
"""
from django.contrib import admin
from django.http import HttpResponse
from django.utils.html import format_html
import csv

from .audit_models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = (
        "timestamp_display", "method_badge", "path",
        "status_badge", "duration_display", "user_email", "ip_address",
    )
    list_filter   = ("method", "status", "timestamp")
    search_fields = ("path", "user__email", "ip_address")
    readonly_fields = (
        "user", "method", "path", "status", "duration",
        "ip_address", "user_agent", "timestamp",
    )
    ordering      = ("-timestamp",)
    date_hierarchy = "timestamp"
    actions       = ["export_csv"]

    # Disable add / edit — audit log is read-only
    def has_add_permission(self, request):    return False
    def has_change_permission(self, request, obj=None): return False

    def user_email(self, obj):
        return obj.user.email if obj.user else "—"
    user_email.short_description = "User"
    user_email.admin_order_field = "user__email"

    def timestamp_display(self, obj):
        return obj.timestamp.strftime("%d %b %Y %H:%M:%S")
    timestamp_display.short_description = "Timestamp"
    timestamp_display.admin_order_field = "timestamp"

    def duration_display(self, obj):
        color = "#059669" if obj.duration < 200 else "#d97706" if obj.duration < 1000 else "#dc2626"
        return format_html(
            '<span style="color:{}; font-weight:600;">{} ms</span>',
            color, f"{obj.duration:.0f}",
        )
    duration_display.short_description = "Duration"
    duration_display.admin_order_field = "duration"

    def method_badge(self, obj):
        colors = {
            "GET":    ("#1d4ed8", "#dbeafe"),
            "POST":   ("#065f46", "#d1fae5"),
            "PATCH":  ("#92400e", "#fef3c7"),
            "PUT":    ("#92400e", "#fef3c7"),
            "DELETE": ("#991b1b", "#fee2e2"),
        }
        text_color, bg_color = colors.get(obj.method, ("#374151", "#f3f4f6"))
        return format_html(
            '<span style="background:{}; color:{}; padding:2px 8px; '
            'border-radius:12px; font-size:11px; font-weight:700;">{}</span>',
            bg_color, text_color, obj.method,
        )
    method_badge.short_description = "Method"
    method_badge.admin_order_field = "method"

    def status_badge(self, obj):
        if obj.status < 300:
            color, bg = "#065f46", "#d1fae5"
        elif obj.status < 400:
            color, bg = "#1d4ed8", "#dbeafe"
        elif obj.status < 500:
            color, bg = "#92400e", "#fef3c7"
        else:
            color, bg = "#991b1b", "#fee2e2"
        return format_html(
            '<span style="background:{}; color:{}; padding:2px 8px; '
            'border-radius:12px; font-size:11px; font-weight:700;">{}</span>',
            bg, color, obj.status,
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    @admin.action(description="Export selected logs as CSV")
    def export_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="shes_audit_log.csv"'
        writer = csv.writer(response)
        writer.writerow(["Timestamp", "Method", "Path", "Status", "Duration (ms)", "User", "IP Address"])
        for log in queryset:
            writer.writerow([
                log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                log.method,
                log.path,
                log.status,
                log.duration,
                log.user.email if log.user else "anonymous",
                log.ip_address or "",
            ])
        return response