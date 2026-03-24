"""
SHES Chatbot – Models
Stores knowledge base chunks with vector embeddings
and conversation history.
"""
from django.db import models
from django.conf import settings


class KnowledgeChunk(models.Model):
    """
    A chunk of clinical knowledge from Kenya MOH guidelines.
    Stores the text and its OpenAI embedding vector.
    """
    title      = models.CharField(max_length=300)
    content    = models.TextField()
    source     = models.CharField(max_length=300, default="Kenya MOH Guidelines")
    embedding  = models.JSONField(
        null=True, blank=True,
        help_text="OpenAI text-embedding-3-small vector (1536 dimensions)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Knowledge Chunk"
        verbose_name_plural = "Knowledge Chunks"
        ordering = ["title"]

    def __str__(self):
        return self.title[:80]


class ChatMessage(models.Model):
    """Stores a single message in a patient's chat session."""

    class Role(models.TextChoices):
        USER      = "user",      "User"
        ASSISTANT = "assistant", "Assistant"

    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    role       = models.CharField(max_length=10, choices=Role.choices)
    content    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:60]}"