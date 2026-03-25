from django.contrib import admin
from .models import TransactionRecord


@admin.register(TransactionRecord)
class TransactionRecordAdmin(admin.ModelAdmin):
    list_display  = ("external_id", "record_type", "issued_to_email", "reference_id", "machine_id", "created_at")
    list_filter   = ("record_type", "machine_id", "created_at")
    search_fields = ("external_id", "issued_to__email", "reference_id")
    readonly_fields = ("internal_id", "external_id", "machine_id", "created_at")
    ordering      = ("-created_at",)

    def issued_to_email(self, obj):
        return obj.issued_to.email if obj.issued_to else "—"
    
    issued_to_email.short_description = "User"
    issued_to_email.admin_order_field = "issued_to__email"