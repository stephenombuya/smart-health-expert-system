from django.contrib import admin
from .models import KnowledgeChunk, ChatMessage


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display  = ("title", "source", "has_embedding", "created_at")
    search_fields = ("title", "content")

    def has_embedding(self, obj):
        return bool(obj.embedding)
    has_embedding.boolean = True
    has_embedding.short_description = "Embedded"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display  = ("user", "role", "content_preview", "created_at")
    list_filter   = ("role",)
    search_fields = ("user__email", "content")

    def content_preview(self, obj):
        return obj.content[:80]
    content_preview.short_description = "Content"